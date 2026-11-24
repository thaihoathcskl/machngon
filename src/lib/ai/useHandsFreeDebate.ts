/**
 * Dedicated Hands-Free Voice Debate hook (`useHandsFreeDebate`) for Thinking Lab.
 * Wraps Web Speech API (vi-VN) recognition + Vietnamese SpeechSynthesis with
 * 1.8s silence auto-submit, acoustic anti-echo locking, and instant barge-in support.
 */
export {
  isLikelyAiEcho,
  stripMarkdownForSpeech,
  useVoiceDebate as useHandsFreeDebate,
  type UseVoiceDebateOptions as UseHandsFreeDebateOptions,
  type UseVoiceDebateReturn as UseHandsFreeDebateReturn,
  type VoiceDebatePhase,
} from '../../hooks/useVoiceDebate';
