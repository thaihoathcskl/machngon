import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeVietnamese } from '../lib/vietnamese';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionLike, ev: Event) => unknown) | null;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => unknown) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => unknown) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => unknown) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type VoiceDebatePhase =
  | 'idle'
  | 'user_listening'
  | 'ai_thinking'
  | 'ai_speaking'
  | 'cooldown';

const POST_TTS_COOLDOWN_MS = 750;
const SILENCE_AUTO_SUBMIT_MS = 1800;

/**
 * Strips Markdown formatting tokens (*, **, #, backticks, bullets, links)
 * so Vietnamese Text-to-Speech reads naturally without pronouncing punctuation artifacts.
 */
export function stripMarkdownForSpeech(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[~>|]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Acoustic echo guard: determines if a newly recognized STT transcript is likely
 * feedback/echo picked up from the AI's own TTS speaker output.
 */
export function isLikelyAiEcho(transcript: string, lastSpokenText: string): boolean {
  const normTranscript = normalizeVietnamese(transcript)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normSpoken = normalizeVietnamese(lastSpokenText)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normTranscript || !normSpoken || normTranscript.length < 8) {
    return false;
  }

  // Exact substring match of a meaningful phrase (>= 12 chars) inside AI's last speech
  if (normTranscript.length >= 12 && normSpoken.includes(normTranscript)) {
    return true;
  }

  const transcriptWords = normTranscript.split(' ').filter((w) => w.length >= 2);
  const spokenWordSet = new Set(normSpoken.split(' ').filter((w) => w.length >= 2));

  if (transcriptWords.length < 3 || spokenWordSet.size === 0) {
    return false;
  }

  let matched = 0;
  for (const word of transcriptWords) {
    if (spokenWordSet.has(word)) matched += 1;
  }

  const containmentRatio = matched / transcriptWords.length;
  return containmentRatio >= 0.72;
}

function selectBestVietnameseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const viVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('vi'));
  if (viVoices.length === 0) return null;

  const preferredPatterns = [/google/i, /natural/i, /neural/i, /hoaimy|namminh|linh|an/i];
  for (const pattern of preferredPatterns) {
    const match = viVoices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  const exactLocale = viVoices.find((v) => v.lang.toLowerCase() === 'vi-vn');
  return exactLocale || viVoices[0];
}

export interface UseVoiceDebateOptions {
  /** Base text currently in composer before recording starts */
  baseText: string;
  /** Whether AI is currently processing a turn (locks mic in hands-free mode) */
  isAiBusy?: boolean;
  /** Called continuously as interim and final speech recognition results arrive */
  onTranscriptChange: (nextText: string) => void;
  /** Called when speech finishes and hands-free auto-submit should trigger */
  onAutoSubmit?: (finalText: string) => void;
  /** Safe user notification callback when Web Speech API is unavailable or errors */
  onNotify?: (message: string, variant?: 'info' | 'warning' | 'error') => void;
}

export interface UseVoiceDebateReturn {
  sttSupported: boolean;
  ttsSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  isSpeaking: boolean;
  speakingMessageId: string | null;
  handsFreeMode: boolean;
  voicePhase: VoiceDebatePhase;
  setHandsFreeMode: (enabled: boolean) => void;
  toggleHandsFreeMode: () => void;
  startListening: (options?: { clearBeforeStart?: boolean; forceInterruptTts?: boolean }) => void;
  stopListening: () => void;
  toggleListening: () => void;
  /** Interrupt AI speech immediately and open microphone for user barge-in */
  bargeInAndListen: () => void;
  speakText: (text: string, messageId?: string, onComplete?: () => void) => void;
  stopSpeaking: () => void;
}

export function useVoiceDebate({
  baseText,
  isAiBusy = false,
  onTranscriptChange,
  onAutoSubmit,
  onNotify,
}: UseVoiceDebateOptions): UseVoiceDebateReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [handsFreeMode, setHandsFreeModeState] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef(baseText);
  const prefixBeforeRecordRef = useRef('');
  const accumulatedFinalRef = useRef('');
  const latestComposedRef = useRef('');
  const handsFreeRef = useRef(handsFreeMode);
  const isSpeakingRef = useRef(false);
  const isCoolingDownRef = useRef(false);
  const lastSpokenTextRef = useRef('');
  const lastSpokenEndedAtRef = useRef(0);
  const cooldownTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onNotifyRef = useRef(onNotify);
  const manualStopRef = useRef(false);

  useEffect(() => {
    baseTextRef.current = baseText;
  }, [baseText]);

  useEffect(() => {
    handsFreeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  const sttSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const ttsSupported =
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!ttsSupported) return;
    const synth = window.speechSynthesis;
    const syncVoices = () => {
      const list = synth.getVoices();
      if (list.length > 0) setVoices(list);
    };
    syncVoices();
    synth.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      synth.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, [ttsSupported]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearCooldown = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    isCoolingDownRef.current = false;
    setIsCoolingDown(false);
  }, []);

  useEffect(() => {
    return () => {
      clearCooldown();
      clearSilenceTimer();
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup error
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, [clearCooldown]);

  const abortMicHard = useCallback(() => {
    clearSilenceTimer();
    manualStopRef.current = true;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore abort errors
    }
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript('');
  }, [clearSilenceTimer]);

  const stopSpeaking = useCallback(() => {
    clearCooldown();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, [clearCooldown]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    manualStopRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
    setInterimTranscript('');
  }, [clearSilenceTimer]);

  const startListening = useCallback(
    (options?: { clearBeforeStart?: boolean; forceInterruptTts?: boolean }) => {
      if (!sttSupported) {
        onNotifyRef.current?.(
          'Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói (Web Speech API). Bạn có thể dùng Chrome hoặc Edge mới nhất, hoặc tiếp tục gõ văn bản.',
          'warning'
        );
        return;
      }

      // Strict anti-echo lock: never open microphone while AI is speaking or cooling down
      // unless user explicitly clicks the mic button to interrupt AI speech.
      if ((isSpeakingRef.current || isCoolingDownRef.current) && !options?.forceInterruptTts) {
        return;
      }

      if (options?.forceInterruptTts) {
        stopSpeaking();
      }

      const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechCtor) return;

      abortMicHard();

      const recognition = new SpeechCtor();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      manualStopRef.current = false;
      prefixBeforeRecordRef.current = options?.clearBeforeStart
        ? ''
        : baseTextRef.current.trim();
      accumulatedFinalRef.current = '';
      latestComposedRef.current = prefixBeforeRecordRef.current;

      recognition.onstart = () => {
        if (isSpeakingRef.current) {
          abortMicHard();
          return;
        }
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        // Hard guard: discard anything captured while TTS is active
        if (isSpeakingRef.current || isCoolingDownRef.current) {
          return;
        }

        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        const withinEchoWindow = Date.now() - lastSpokenEndedAtRef.current < 4500;
        const rawCandidate = `${accumulatedFinalRef.current} ${finalChunk} ${interimChunk}`.trim();
        if (
          withinEchoWindow &&
          lastSpokenTextRef.current &&
          isLikelyAiEcho(rawCandidate, lastSpokenTextRef.current)
        ) {
          // Ignore acoustic echo from speaker
          return;
        }

        if (finalChunk.trim()) {
          accumulatedFinalRef.current = `${accumulatedFinalRef.current} ${finalChunk.trim()}`.trim();
        }

        const spoken = `${accumulatedFinalRef.current} ${interimChunk.trim()}`.trim();
        const combined = prefixBeforeRecordRef.current
          ? `${prefixBeforeRecordRef.current} ${spoken}`.trim()
          : spoken;

        setInterimTranscript(interimChunk.trim());
        latestComposedRef.current = combined;
        onTranscriptChangeRef.current(combined);

        // In hands-free mode, auto-finalize after 1.8s of silence once speech is captured
        clearSilenceTimer();
        if (handsFreeRef.current && spoken.trim().length > 0) {
          silenceTimerRef.current = window.setTimeout(() => {
            silenceTimerRef.current = null;
            try {
              recognition.stop();
            } catch {
              // Ignore stop errors
            }
          }, SILENCE_AUTO_SUBMIT_MS);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setInterimTranscript('');
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onNotifyRef.current?.(
            'Trình duyệt chưa được cấp quyền Micro. Hãy bật quyền Micro để dùng chế độ nói tiếng Việt.',
            'warning'
          );
          setHandsFreeModeState(false);
        } else if (event.error === 'no-speech') {
          onNotifyRef.current?.(
            'Chưa nghe rõ giọng nói. Bấm lại biểu tượng Micro khi bạn sẵn sàng nói.',
            'info'
          );
        } else if (event.error !== 'aborted') {
          onNotifyRef.current?.(
            'Nhận diện giọng nói tạm gián đoạn. Bạn có thể thử nói lại hoặc gõ trực tiếp.',
            'warning'
          );
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();
        setIsListening(false);
        setInterimTranscript('');

        if (isSpeakingRef.current || manualStopRef.current) {
          return;
        }

        const spokenText = latestComposedRef.current.trim();
        const hasNewSpeech = accumulatedFinalRef.current.trim().length > 0 || spokenText.length > 0;

        if (
          hasNewSpeech &&
          lastSpokenTextRef.current &&
          Date.now() - lastSpokenEndedAtRef.current < 5000 &&
          isLikelyAiEcho(spokenText, lastSpokenTextRef.current)
        ) {
          onTranscriptChangeRef.current(prefixBeforeRecordRef.current);
          onNotifyRef.current?.(
            'Đã lọc âm vọng từ loa AI để tránh ghi nhầm. Mời bạn nói lại quan điểm của mình.',
            'info'
          );
          return;
        }

        if (handsFreeRef.current && hasNewSpeech && spokenText) {
          onAutoSubmitRef.current?.(spokenText);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
        onNotifyRef.current?.(
          'Không thể khởi động Micro ngay lúc này. Hãy thử bấm lại.',
          'warning'
        );
      }
    },
    [abortMicHard, clearSilenceTimer, stopSpeaking, sttSupported]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening({ forceInterruptTts: true });
    }
  }, [isListening, startListening, stopListening]);

  const bargeInAndListen = useCallback(() => {
    startListening({ forceInterruptTts: true, clearBeforeStart: true });
  }, [startListening]);

  const speakText = useCallback(
    (text: string, messageId?: string, onComplete?: () => void) => {
      if (!ttsSupported) {
        onNotifyRef.current?.(
          'Trình duyệt hiện tại chưa hỗ trợ đọc giọng nói (Speech Synthesis).',
          'warning'
        );
        return;
      }

      const cleanText = stripMarkdownForSpeech(text);
      if (!cleanText) return;

      // Toggle off if clicking the same message currently speaking
      if (isSpeakingRef.current && messageId && speakingMessageId === messageId && !onComplete) {
        stopSpeaking();
        return;
      }

      // CRITICAL ANTI-ECHO: Abort microphone BEFORE starting TTS playback
      abortMicHard();
      stopSpeaking();

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const availableVoices = voices.length > 0 ? voices : synth.getVoices();
      const viVoice = selectBestVietnameseVoice(availableVoices);
      if (viVoice) {
        utterance.voice = viVoice;
        utterance.lang = viVoice.lang;
      }

      lastSpokenTextRef.current = cleanText;
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setSpeakingMessageId(messageId ?? '__speech__');

      utterance.onstart = () => {
        abortMicHard();
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        setSpeakingMessageId(messageId ?? '__speech__');
      };

      const finishSpeech = (shouldTriggerCallback: boolean) => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        lastSpokenEndedAtRef.current = Date.now();

        if (!shouldTriggerCallback) {
          clearCooldown();
          return;
        }

        // Acoustic echo-guard cooldown before reopening microphone
        isCoolingDownRef.current = true;
        setIsCoolingDown(true);
        cooldownTimerRef.current = window.setTimeout(() => {
          cooldownTimerRef.current = null;
          isCoolingDownRef.current = false;
          setIsCoolingDown(false);
          onComplete?.();
        }, POST_TTS_COOLDOWN_MS);
      };

      utterance.onend = () => finishSpeech(true);
      utterance.onerror = () => finishSpeech(false);

      try {
        synth.speak(utterance);
      } catch {
        finishSpeech(false);
      }
    },
    [abortMicHard, clearCooldown, speakingMessageId, stopSpeaking, ttsSupported, voices]
  );

  const setHandsFreeMode = useCallback(
    (enabled: boolean) => {
      if (enabled && (!sttSupported || !ttsSupported)) {
        onNotifyRef.current?.(
          'Chế độ Tranh biện rảnh tay cần trình duyệt hỗ trợ đầy đủ Micro và Loa (Chrome/Edge mới nhất).',
          'warning'
        );
        setHandsFreeModeState(false);
        return;
      }
      if (!enabled) {
        abortMicHard();
        stopSpeaking();
      }
      setHandsFreeModeState(enabled);
    },
    [abortMicHard, sttSupported, ttsSupported, stopSpeaking]
  );

  const toggleHandsFreeMode = useCallback(() => {
    setHandsFreeMode(!handsFreeRef.current);
  }, [setHandsFreeMode]);

  const voicePhase: VoiceDebatePhase = isSpeaking
    ? 'ai_speaking'
    : isCoolingDown
      ? 'cooldown'
      : isAiBusy
        ? 'ai_thinking'
        : isListening
          ? 'user_listening'
          : 'idle';

  return {
    sttSupported,
    ttsSupported,
    isListening,
    interimTranscript,
    isSpeaking,
    speakingMessageId,
    handsFreeMode,
    voicePhase,
    setHandsFreeMode,
    toggleHandsFreeMode,
    startListening,
    stopListening,
    toggleListening,
    bargeInAndListen,
    speakText,
    stopSpeaking,
  };
}
