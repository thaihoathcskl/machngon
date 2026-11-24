import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  BrainCircuit,
  Clock,
  FileText,
  Headphones,
  Image as ImageIcon,
  Map as MapIcon,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArgumentLedger } from '../components/lab/ArgumentLedger';
import { DebateStepperBar, DebateStepperLive } from '../components/lab/DebateStepper5';
import { RateLimitBanner } from '../components/lab/RateLimitBanner';
import { SessionReportModal } from '../components/lab/SessionReportModal';
import { ThreeLayerResponseCard } from '../components/lab/ThreeLayerResponseCard';
import { WorkspaceShell } from '../components/layout/AppShell';
import { buildLabIntentPrompt } from '../components/library/LibraryToLabActions';
import { useToast } from '../components/ui/ToastProvider';
import { AiAssistantRobotSvg } from '../components/visuals/EditorialSvgIllustrations';
import { useApp } from '../lib/AppContext';
import {
  formatFileSize,
  MAX_LAB_ATTACHMENTS,
  readAttachmentFile,
} from '../lib/ai/attachments';
import { useHandsFreeDebate } from '../lib/ai/useHandsFreeDebate';
import {
  getLabDifficultyDescription,
  getLabDifficultyLabel,
} from '../lib/library/validation';
import { useRouter, useSearchParams } from '../lib/router';
import {
  addAiFeedbackFlag,
  consumeLabHandoff,
  loadLabDifficulty,
  loadLabDraft,
  loadPreferredAiModel,
  saveLabDifficulty,
  saveLabDraft,
} from '../lib/storage';
import {
  LabApiRequestPayload,
  LabApiResponsePayload,
  LabAttachment,
  LabDifficultyLevel,
  LabMessage,
  LabSession,
  LabType,
  LedgerEntry,
} from '../lib/types';
import {
  AIRateLimitError,
  AIServiceError,
  requestLabAnalysis,
  runLocalLabFallback,
} from '../services/aiService';

type LabStatus = 'ready' | 'analyzing' | 'responding' | 'rate_limited' | 'api_error';

const DIFFICULTY_OPTIONS: Array<{ key: LabDifficultyLevel; label: string; shortLabel: string }> = [
  { key: 'basic', label: 'Người mới bắt đầu', shortLabel: 'Mới bắt đầu' },
  { key: 'intermediate', label: 'Tầm trung', shortLabel: 'Tầm trung' },
  { key: 'advanced', label: 'Chuyên gia', shortLabel: 'Chuyên gia' },
];

const CONCEPT_STARTERS = [
  {
    label: 'Tự do vs Tùy tiện',
    prompt:
      'Mình nghĩ tự do là được làm bất cứ điều gì mình thích mà không bị ai cấm đoán.',
  },
  {
    label: 'Ngôn ngữ & Tư duy',
    prompt:
      'Theo bạn, ngôn ngữ chỉ là công cụ diễn đạt suy nghĩ có sẵn, hay chính ngôn ngữ định hình cách ta nghĩ?',
  },
  {
    label: 'Đồng cảm vs Thương hại',
    prompt:
      'Mình hay nhầm giữa "đồng cảm" và "thương hại". Làm sao phân biệt rõ ranh giới hai khái niệm này?',
  },
];

const DEBATE_STARTERS = [
  {
    label: 'Tự do cá nhân & Cộng đồng',
    prompt:
      'Em đồng ý là nên giới hạn tự do cá nhân vì lợi ích cộng đồng, vì nếu ai cũng chỉ nghĩ cho mình thì xã hội sẽ loạn hết.',
  },
  {
    label: 'AI trong học tập THPT',
    prompt:
      'Học sinh dùng AI để hỗ trợ viết bài luận luôn luôn làm giảm khả năng tư duy độc lập.',
  },
  {
    label: 'Lối sống thực dụng',
    prompt:
      'Trong thời đại cạnh tranh, học sinh chỉ nên tập trung vào các môn học mang lại hiệu quả thực dụng ngay lập tức.',
  },
];

function getContextualQuickReplies(labType: LabType, stage: number, hasMessages: boolean): string[] {
  if (!hasMessages) {
    if (labType === 'concept') {
      return [
        'Giúp tôi làm rõ khái niệm này',
        'Cho tôi một phản ví dụ thực tế',
        'So sánh với khái niệm gần nghĩa dễ nhầm',
      ];
    }
    return [
      'Cho tôi một phản ví dụ thực tế',
      'Giúp tôi làm rõ khái niệm này',
      'Tôi muốn bảo vệ quan điểm bằng dẫn chứng',
    ];
  }

  if (labType === 'concept') {
    if (stage <= 2) {
      return [
        'Giúp tôi làm rõ khái niệm này',
        'Cho tôi một phản ví dụ thực tế',
        'Chỉ rõ giả định ngầm trong cách hiểu của tôi',
      ];
    }
    if (stage === 3) {
      return [
        'So sánh với một khái niệm dễ nhầm lẫn',
        'Tôi muốn điều chỉnh lại định nghĩa cho chặt hơn',
        'Cho tôi thêm một tình huống đời thường',
      ];
    }
    return [
      'Tổng kết Bản đồ truy vết tư duy cho phiên này',
      'Kiểm tra xem định nghĩa mới của tôi còn lỗ hổng nào không',
      'Cho tôi một phản ví dụ thực tế',
    ];
  }

  if (stage <= 1) {
    return [
      'Giúp tôi làm rõ khái niệm này',
      'Tôi muốn bảo vệ quan điểm bằng dẫn chứng',
      'Cho tôi một phản ví dụ thực tế',
    ];
  }
  if (stage === 2) {
    return [
      'Tôi muốn bảo vệ quan điểm bằng dẫn chứng',
      'Chỉ rõ giả định ngầm trong lập luận của tôi',
      'Cho tôi một phản ví dụ thực tế',
    ];
  }
  if (stage === 3) {
    return [
      'Tôi muốn bảo vệ quan điểm bằng dẫn chứng',
      'Tôi muốn điều chỉnh lại giới hạn lập luận',
      'Giúp tôi làm rõ khái niệm này',
    ];
  }
  return [
    'Tổng kết so sánh sự tiến bộ lập luận của tôi',
    'Thử thách lại lập trường đã điều chỉnh của tôi',
    'Cho tôi một phản ví dụ thực tế',
  ];
}

function createEmptySession(
  labType: LabType,
  resourceContextId?: string,
  title?: string,
  difficulty: LabDifficultyLevel = 'intermediate'
): LabSession {
  const now = new Date().toISOString();
  return {
    id: `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title:
      title ||
      (labType === 'concept' ? 'Phiên phân tích khái niệm mới' : 'Phiên tranh biện mới'),
    labType,
    difficulty,
    resourceContextId,
    messages: [],
    ledger: [],
    coreAssumptions: [],
    contradictions: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function LabPage() {
  const { documents, sessions, upsertSession } = useApp();
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const searchParams = useSearchParams();

  const queryMode = searchParams.get('mode') === 'concept' ? 'concept' : 'debate';
  const querySessionId = searchParams.get('session');
  const queryResourceId = searchParams.get('resource') || undefined;
  const showDebugControls = import.meta.env.DEV || searchParams.get('debug') === '1';

  const [activeSession, setActiveSession] = useState<LabSession>(() => {
    const savedDiff = loadLabDifficulty();
    if (querySessionId) {
      const existing = sessions.find((s) => s.id === querySessionId);
      if (existing) {
        return {
          ...existing,
          difficulty: existing.difficulty ?? savedDiff,
        };
      }
    }
    const matchingResource = queryResourceId
      ? documents.find((d) => d.id === queryResourceId)
      : undefined;
    return createEmptySession(
      queryMode,
      queryResourceId,
      matchingResource ? `Tranh biện · ${matchingResource.title}` : undefined,
      savedDiff
    );
  });

  const [composerText, setComposerText] = useState<string>(() => loadLabDraft(activeSession.id));
  const [attachments, setAttachments] = useState<LabAttachment[]>([]);
  const [status, setStatus] = useState<LabStatus>('ready');
  const [analyzingStep, setAnalyzingStep] = useState<number>(0);
  const [rateLimitState, setRateLimitState] = useState<{
    message: string;
    secondsLeft: number;
  } | null>(null);
  const [apiErrorState, setApiErrorState] = useState<{
    title: string;
    message: string;
    isQuotaOrKey: boolean;
  } | null>(null);
  const [pendingRetryPayload, setPendingRetryPayload] = useState<{
    messageText: string;
    attachmentsSnapshot: LabAttachment[];
  } | null>(null);
  const [autosaveNotice, setAutosaveNotice] = useState<string | null>(null);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [latestAnimatedMsgId, setLatestAnimatedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitMessageRef = useRef<
    ((options?: { simulate429?: boolean; overrideText?: string; useLocalFallback?: boolean }) => Promise<void>) | null
  >(null);

  const isBusy = status === 'analyzing' || status === 'responding';

  // Hands-free Voice Debate Mode hook with 1.8s silence auto-submit, anti-echo lock, and barge-in
  const voice = useHandsFreeDebate({
    baseText: composerText,
    isAiBusy: isBusy,
    onTranscriptChange: (nextText) => {
      setComposerText(nextText);
    },
    onAutoSubmit: (spokenText) => {
      if (spokenText.trim()) {
        void submitMessageRef.current?.({ overrideText: spokenText });
      }
    },
    onNotify: (msg, variant = 'info') => {
      showToast(msg, { variant });
    },
  });

  // Load handoff payload from DocumentDetailPage if present
  useEffect(() => {
    const handoff = consumeLabHandoff();
    if (handoff) {
      const fresh = createEmptySession(
        handoff.labType,
        handoff.resourceContextId,
        `${handoff.labType === 'concept' ? 'Phân tích' : 'Tranh biện'} · ${handoff.resourceTitle}`,
        activeSession.difficulty ?? loadLabDifficulty()
      );
      setActiveSession(fresh);
      setLatestAnimatedMsgId(null);
      setAttachments([]);

      const promptSeed = buildLabIntentPrompt(handoff);
      setComposerText(promptSeed);
      saveLabDraft(fresh.id, promptSeed);
      showToast('Đã mang trích đoạn từ AI Library vào AI Labs.', { variant: 'info' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load session when ?session= changes
  useEffect(() => {
    if (!querySessionId) return;
    const found = sessions.find((s) => s.id === querySessionId);
    if (found && found.id !== activeSession.id) {
      setActiveSession({ ...found, difficulty: found.difficulty ?? 'intermediate' });
      setLatestAnimatedMsgId(null);
      setComposerText(loadLabDraft(found.id));
      setAttachments([]);
      setRateLimitState(null);
      setApiErrorState(null);
      setPendingRetryPayload(null);
    }
  }, [querySessionId, sessions, activeSession.id]);

  // Autosave composer draft per session
  useEffect(() => {
    saveLabDraft(activeSession.id, composerText);
  }, [activeSession.id, composerText]);

  // HTTP 429 calm countdown timer
  useEffect(() => {
    if (!rateLimitState || rateLimitState.secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setRateLimitState((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          setStatus('ready');
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitState]);

  const attachedResource = useMemo(
    () =>
      activeSession.resourceContextId
        ? documents.find((d) => d.id === activeSession.resourceContextId) ?? null
        : null,
    [activeSession.resourceContextId, documents]
  );

  const currentDifficulty: LabDifficultyLevel = activeSession.difficulty ?? 'intermediate';

  const currentStage = useMemo(() => {
    const userTurns = activeSession.messages.filter((m) => m.role === 'user').length;
    const lastMsg = activeSession.messages[activeSession.messages.length - 1];
    const hasSummary = Boolean(
      lastMsg?.threeLayer?.interpretation &&
        (lastMsg.threeLayer.interpretation.includes('Bản đồ truy vết tư duy') ||
          lastMsg.threeLayer.interpretation.includes('Lập trường & Luận điểm chính') ||
          lastMsg.threeLayer.interpretation.includes('Khái niệm ban đầu của bạn'))
    );
    if (hasSummary) return 5;
    if (userTurns === 0) return 1;
    return Math.min(userTurns + 1, 5);
  }, [activeSession.messages]);

  const quickReplies = useMemo(
    () =>
      getContextualQuickReplies(
        activeSession.labType,
        currentStage,
        activeSession.messages.length > 0
      ),
    [activeSession.labType, currentStage, activeSession.messages.length]
  );

  const handleDifficultyChange = (nextDifficulty: LabDifficultyLevel) => {
    if (nextDifficulty === currentDifficulty) return;
    saveLabDifficulty(nextDifficulty);
    const updated: LabSession = {
      ...activeSession,
      difficulty: nextDifficulty,
      updatedAt: new Date().toISOString(),
    };
    setActiveSession(updated);
    if (updated.messages.length > 0) {
      upsertSession(updated);
    }
    showToast(`Đã chuyển trình độ tranh biện sang ${getLabDifficultyLabel(nextDifficulty)}.`, {
      variant: 'info',
    });
  };

  const handleFlagAiMessage = (msg: LabMessage, note: string) => {
    addAiFeedbackFlag({
      id: `flag_${Date.now().toString(36)}`,
      sessionId: activeSession.id,
      messageId: msg.id,
      turnRef: msg.turnRef,
      note,
      createdAt: new Date().toISOString(),
    });
    showToast('Đã ghi nhận góp ý về câu trả lời AI. Cảm ơn bạn!', { variant: 'success' });
  };

  const handleModeSwitch = (nextMode: LabType) => {
    if (nextMode === activeSession.labType) return;
    voice.stopSpeaking();
    voice.stopListening();
    if (activeSession.messages.length === 0) {
      setActiveSession((prev) => ({
        ...prev,
        labType: nextMode,
        title:
          nextMode === 'concept' ? 'Phiên phân tích khái niệm mới' : 'Phiên tranh biện mới',
      }));
      return;
    }
    const fresh = createEmptySession(
      nextMode,
      activeSession.resourceContextId,
      undefined,
      currentDifficulty
    );
    setActiveSession(fresh);
    setLatestAnimatedMsgId(null);
    setComposerText(loadLabDraft(fresh.id));
    setAttachments([]);
    setRateLimitState(null);
    setApiErrorState(null);
    setPendingRetryPayload(null);
    showToast(
      `Đã chuyển sang ${nextMode === 'concept' ? 'Concept Lab' : 'Debate Lab'} (phiên mới).`,
      { variant: 'info' }
    );
  };

  const handleStartNewSession = () => {
    voice.stopSpeaking();
    voice.stopListening();
    const fresh = createEmptySession(activeSession.labType, undefined, undefined, currentDifficulty);
    setActiveSession(fresh);
    setLatestAnimatedMsgId(null);
    setComposerText('');
    setAttachments([]);
    setRateLimitState(null);
    setApiErrorState(null);
    setPendingRetryPayload(null);
    setAutosaveNotice(null);
    showToast('Đã khởi tạo phiên đối thoại mới.', { variant: 'info' });
  };

  const handleQuoteToComposer = (prefixText: string) => {
    setComposerText((prev) => (prev.trim() ? `${prev.trim()}\n${prefixText}` : prefixText));
    composerRef.current?.focus();
  };

  const handleQuoteLedgerEntry = (entry: LedgerEntry) => {
    setLedgerOpen(false);
    handleQuoteToComposer(
      `Đối chiếu mốc ${entry.id} ("${entry.claim}"): theo mình có điểm cần làm rõ là `
    );
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    let currentCount = attachments.length;
    const added: LabAttachment[] = [];

    for (const file of incoming) {
      if (currentCount >= MAX_LAB_ATTACHMENTS) {
        showToast(`Chỉ đính kèm tối đa ${MAX_LAB_ATTACHMENTS} tệp trong một lượt.`, {
          variant: 'warning',
        });
        break;
      }
      try {
        const parsed = await readAttachmentFile(file, currentCount);
        added.push(parsed);
        currentCount += 1;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Không thể đính kèm tệp này.', {
          variant: 'warning',
        });
      }
    }

    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added]);
      showToast(`Đã đính kèm ${added.length} tệp vào ngữ cảnh phân tích.`, { variant: 'info' });
    }

    // Reset input so user can re-select the same file later if removed
    event.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const commitTurnResult = useCallback(
    (
      data: LabApiResponsePayload,
      messageToSend: string,
      sentAttachments: LabAttachment[],
      clearComposer: boolean
    ) => {
      const userCount = activeSession.ledger.filter((e) => e.speaker === 'user').length + 1;
      const aiCount = activeSession.ledger.filter((e) => e.speaker === 'ai').length + 1;
      const userRef = `U#${userCount}`;
      const aiRef = `A#${aiCount}`;
      const nowIso = new Date().toISOString();
      const aiMsgId = `msg_a_${Date.now().toString(36)}`;

      const userMsg: LabMessage = {
        id: `msg_u_${Date.now().toString(36)}`,
        role: 'user',
        turnRef: userRef,
        content: messageToSend,
        timestamp: nowIso,
        attachments:
          sentAttachments.length > 0
            ? sentAttachments.map((a) => ({
                id: a.id,
                name: a.name,
                mimeType: a.mimeType,
                size: a.size,
                kind: a.kind,
              }))
            : undefined,
      };

      const aiMsg: LabMessage = {
        id: aiMsgId,
        role: 'assistant',
        turnRef: aiRef,
        content: data.ai_claim_summary,
        timestamp: nowIso,
        threeLayer: data.three_layer,
        debateSteps: data.debate_steps,
        sourceEngine: data.source_engine,
        responseId: data.response_id,
        sources: data.sources,
        searchQueries: data.searchQueries,
      };

      const newLedgerEntries: LedgerEntry[] = [
        {
          id: userRef,
          speaker: 'user',
          turnIndex: userCount,
          claim: data.user_claim_summary,
          assumptions: data.new_assumptions,
          contradictionFlag: data.contradiction_note ?? undefined,
          timestamp: nowIso,
        },
        {
          id: aiRef,
          speaker: 'ai',
          turnIndex: aiCount,
          claim: data.ai_claim_summary,
          assumptions: [],
          timestamp: nowIso,
        },
      ];

      const mergedAssumptions = Array.from(
        new Set([...activeSession.coreAssumptions, ...data.new_assumptions])
      ).slice(0, 8);

      const nextContradictions = data.contradiction_note
        ? [
            ...activeSession.contradictions,
            {
              id: `c_${Date.now().toString(36)}`,
              refA: userRef,
              refB: data.contradiction_ref || 'U#1',
              note: data.contradiction_note,
            },
          ]
        : activeSession.contradictions;

      const updatedSession: LabSession = {
        ...activeSession,
        title:
          activeSession.messages.length === 0 && !attachedResource
            ? messageToSend.slice(0, 62) + (messageToSend.length > 62 ? '…' : '')
            : activeSession.title,
        previousResponseId: data.response_id,
        messages: [...activeSession.messages, userMsg, aiMsg],
        ledger: [...activeSession.ledger, ...newLedgerEntries],
        coreAssumptions: mergedAssumptions,
        contradictions: nextContradictions,
        updatedAt: nowIso,
      };

      setActiveSession(updatedSession);
      setLatestAnimatedMsgId(aiMsgId);
      upsertSession(updatedSession);
      if (clearComposer) {
        setComposerText('');
        saveLabDraft(updatedSession.id, '');
      }
      setAttachments([]);
      setRateLimitState(null);
      setApiErrorState(null);
      setPendingRetryPayload(null);
      setAutosaveNotice(null);
      setStatus('ready');

      window.setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 120);

      // Hands-free Voice Debate Mode: speak AI reply with strict mic lock, then auto-open mic after cooldown
      if (
        voice.handsFreeMode &&
        (data.three_layer.guidingQuestion || data.three_layer.interpretation || data.three_layer.tldr)
      ) {
        const spokenReply = [
          data.three_layer.tldr,
          data.three_layer.interpretation,
          data.three_layer.guidingQuestion,
        ]
          .filter(Boolean)
          .join('. ');

        window.setTimeout(() => {
          voice.speakText(spokenReply, aiMsgId, () => {
            voice.startListening({ clearBeforeStart: true });
          });
        }, 260);
      }
    },
    [activeSession, attachedResource, upsertSession, voice]
  );

  const submitMessage = useCallback(
    async (options?: {
      simulate429?: boolean;
      overrideText?: string;
      useLocalFallback?: boolean;
    }) => {
      const activeAttachments =
        options?.useLocalFallback && pendingRetryPayload
          ? pendingRetryPayload.attachmentsSnapshot
          : attachments;

      const trimmed = (
        options?.overrideText ??
        (options?.useLocalFallback && pendingRetryPayload
          ? pendingRetryPayload.messageText
          : composerText)
      ).trim();

      if (!trimmed && activeAttachments.length === 0) {
        if (options?.simulate429) {
          const demoDraft =
            'Mọi người đều luôn luôn tự do lựa chọn, nhưng lập luận này cần kiểm tra lại dưới góc nhìn xã hội.';
          setComposerText(demoDraft);
          saveLabDraft(activeSession.id, demoDraft);
        } else {
          return;
        }
      }

      const messageToSend =
        trimmed ||
        (activeAttachments.length > 0
          ? `Hãy phân tích nội dung và đối chiếu dẫn chứng trong tệp đính kèm: ${activeAttachments
              .map((a) => a.name)
              .join(', ')}.`
          : 'Mọi người đều luôn luôn tự do lựa chọn, nhưng lập luận này cần kiểm tra lại dưới góc nhìn xã hội.');

      if (!options?.useLocalFallback && rateLimitState && rateLimitState.secondsLeft > 0) {
        return;
      }

      voice.stopListening();
      voice.stopSpeaking();

      const payload: LabApiRequestPayload = {
        session_id: activeSession.id,
        lab_type: activeSession.labType,
        difficulty: currentDifficulty,
        model: loadPreferredAiModel(),
        message: messageToSend,
        resource_context_id: activeSession.resourceContextId ?? null,
        attachments: activeAttachments.length > 0 ? activeAttachments : undefined,
        history: activeSession.messages.map((m) => ({
          role: m.role,
          content: m.threeLayer
            ? `${m.threeLayer.tldr ? `${m.threeLayer.tldr} ` : ''}${m.threeLayer.interpretation}`
            : m.content,
          turnRef: m.turnRef,
        })),
        ledger_snapshot: activeSession.ledger,
        core_assumptions: activeSession.coreAssumptions,
        previous_response_id: activeSession.previousResponseId ?? null,
        simulate_429: options?.simulate429 ?? false,
      };

      // Explicit user-approved Local Fallback path
      if (options?.useLocalFallback) {
        const localData = runLocalLabFallback(payload, attachedResource);
        commitTurnResult(localData, messageToSend, activeAttachments, true);
        showToast('Đã phân tích bằng chế độ cục bộ (không dùng API AI).', { variant: 'info' });
        return;
      }

      setApiErrorState(null);
      setAutosaveNotice(null);
      setStatus('analyzing');
      setAnalyzingStep(0);

      const stepInterval = window.setInterval(() => {
        setAnalyzingStep((prev) => (prev < 4 ? prev + 1 : 4));
      }, 240);

      try {
        const data = await requestLabAnalysis(payload, attachedResource);

        window.clearInterval(stepInterval);
        setStatus('responding');
        setAnalyzingStep(4);

        commitTurnResult(data, messageToSend, activeAttachments, !options?.overrideText);
      } catch (err) {
        window.clearInterval(stepInterval);
        saveLabDraft(activeSession.id, messageToSend);
        setPendingRetryPayload({
          messageText: messageToSend,
          attachmentsSnapshot: activeAttachments,
        });

        if (err instanceof AIRateLimitError) {
          setStatus('rate_limited');
          setRateLimitState({
            message: err.message,
            secondsLeft: err.retryAfter,
          });
          setAutosaveNotice(
            'Nội dung và tệp đính kèm của bạn vẫn được giữ nguyên. Bạn có thể chờ hết đếm ngược để thử lại API hoặc chủ động chuyển sang Chế độ phân tích cục bộ.'
          );
          showToast(
            `Đã hết bản thông minh (API AI) hiện tại (HTTP 429). Văn bản của bạn được bảo toàn.`,
            { variant: 'warning' }
          );
          return;
        }

        const isQuotaOrKey =
          err instanceof AIServiceError &&
          (err.code === 'MISSING_API_KEY' ||
            err.code === 'INVALID_API_KEY' ||
            err.code === 'QUOTA_EXHAUSTED');

        setStatus('api_error');
        setApiErrorState({
          title: isQuotaOrKey
            ? 'Đã hết bản thông minh (API AI) hoặc chưa kích hoạt khóa API'
            : 'Kết nối tới bản thông minh (API AI) tạm gián đoạn',
          message:
            err instanceof Error
              ? err.message
              : 'Không thể kết nối tới máy chủ AI. Vui lòng thử lại.',
          isQuotaOrKey,
        });
        setAutosaveNotice(
          'Toàn bộ nội dung và tệp đính kèm của bạn vẫn được giữ nguyên (tự động lưu cục bộ).'
        );
        showToast(
          isQuotaOrKey
            ? 'Bản thông minh (API AI) hiện không khả dụng — bạn có thể chọn Chế độ phân tích cục bộ.'
            : 'Kết nối máy chủ AI tạm gián đoạn. Bản thảo đã được giữ nguyên.',
          { variant: 'warning' }
        );
      }
    },
    [
      activeSession,
      attachedResource,
      attachments,
      commitTurnResult,
      composerText,
      currentDifficulty,
      pendingRetryPayload,
      rateLimitState,
      showToast,
      voice,
    ]
  );

  useEffect(() => {
    submitMessageRef.current = submitMessage;
  }, [submitMessage]);

  const isRateCountdownActive = Boolean(rateLimitState && rateLimitState.secondsLeft > 0);
  const starters = activeSession.labType === 'concept' ? CONCEPT_STARTERS : DEBATE_STARTERS;

  return (
    <WorkspaceShell noMainBottomPadding>
      <div className="flex flex-col h-[calc(100dvh-56px-68px)] lg:h-dvh overflow-hidden">
        {/* Top AI Labs Header: Mode Switcher + Difficulty Hierarchy + Voice + Report + New + Sổ tay */}
        <header className="shrink-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: Mode Switcher + Difficulty Selector */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div
                role="tablist"
                aria-label="Chuyển đổi giữa Concept Lab và Debate Lab"
                className="inline-flex rounded-xl p-1 border border-[var(--color-border)] bg-[var(--color-bg)] shrink-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSession.labType === 'concept'}
                  onClick={() => handleModeSwitch('concept')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeSession.labType === 'concept'
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Concept Lab
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSession.labType === 'debate'}
                  onClick={() => handleModeSwitch('debate')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activeSession.labType === 'debate'
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <Scale className="h-3.5 w-3.5" />
                  Debate Lab
                </button>
              </div>

              {/* Difficulty Hierarchy Selector (3 Proficiency Levels) */}
              <div
                role="radiogroup"
                aria-label="Chọn trình độ tranh biện AI Labs"
                data-testid="lab-difficulty-selector"
                title={getLabDifficultyDescription(currentDifficulty)}
                className="inline-flex items-center rounded-xl p-1 border border-[var(--color-border)] bg-[var(--color-bg)] max-w-full overflow-x-auto no-scrollbar"
              >
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const active = currentDifficulty === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleDifficultyChange(opt.key)}
                      className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent'
                      }`}
                    >
                      <span className="hidden md:inline">{opt.label}</span>
                      <span className="md:hidden">{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Controls: Hands-free Voice + Report + Phiên mới + Sổ tay */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={voice.toggleHandsFreeMode}
                aria-pressed={voice.handsFreeMode}
                data-testid="hands-free-toggle-btn"
                title="Chế độ rảnh tay: AI đọc phản hồi (tự khóa mic chống vọng) rồi mở Micro nghe bạn nói"
                className={`inline-flex items-center gap-1.5 rounded-xl min-h-9 px-2.5 sm:px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  voice.handsFreeMode
                    ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_13%,var(--color-surface)_87%)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                }`}
              >
                <Headphones className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">
                  {voice.handsFreeMode ? 'Rảnh tay: Bật' : 'Rảnh tay'}
                </span>
              </button>

              <button
                type="button"
                data-testid="open-report-btn"
                onClick={() => setReportOpen(true)}
                title="Xem & xuất báo cáo tổng hợp phiên (luận điểm, điểm mạnh/yếu, câu hỏi, dẫn chứng)"
                className="btn-secondary !min-h-9 !px-2.5 sm:!px-3 !py-1.5 !text-xs whitespace-nowrap"
              >
                <FileText className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                <span className="hidden sm:inline">Báo cáo</span>
              </button>

              <button
                type="button"
                onClick={handleStartNewSession}
                className="btn-secondary !min-h-9 !px-2.5 sm:!px-3 !py-1.5 !text-xs whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Phiên mới</span>
              </button>

              <button
                type="button"
                data-testid="toggle-ledger-btn"
                onClick={() => setLedgerOpen((prev) => !prev)}
                aria-pressed={ledgerOpen}
                aria-expanded={ledgerOpen}
                aria-label="Đóng hoặc mở Sổ tay mạch lập luận"
                className={`inline-flex items-center gap-1.5 rounded-xl min-h-9 px-2.5 sm:px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  ledgerOpen
                    ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_13%,var(--color-surface)_87%)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                }`}
              >
                <BookMarked className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                <span>Sổ tay ({activeSession.ledger.length})</span>
              </button>
            </div>
          </div>

          {/* Attached Library Resource Context Chip */}
          {attachedResource && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg)]/70 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                <span className="text-[var(--color-text-muted)] shrink-0">Học liệu AI Library:</span>
                <span className="font-medium text-[var(--color-text)] truncate">
                  {attachedResource.title}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/library/${attachedResource.id}`, { preserveScroll: true })
                  }
                  className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline whitespace-nowrap cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Quay lại tài liệu
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSession((prev) => ({ ...prev, resourceContextId: undefined }))
                  }
                  aria-label="Gỡ ngữ cảnh tài liệu"
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Slim Horizontal 5-Step Progress Strip */}
        <DebateStepperBar
          currentStage={currentStage}
          labType={activeSession.labType}
          isAnalyzing={isBusy}
          analyzingStepIndex={analyzingStep}
        />

        {/* Body Area */}
        <div className="relative flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Scrollable Messages Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
              <div className="mx-auto max-w-[820px] space-y-6">
                {activeSession.messages.length === 0 ? (
                  <div className="py-4 sm:py-8 space-y-6">
                    <div className="rounded-2xl p-6 sm:p-8 surface-card text-center space-y-5">
                      <div className="flex justify-center">
                        <AiAssistantRobotSvg className="h-20 w-20 sm:h-24 sm:w-24" />
                      </div>
                      <div className="space-y-2 max-w-xl mx-auto">
                        <p className="editorial-kicker">
                          AI Labs · {activeSession.labType === 'concept' ? 'Concept Lab' : 'Debate Lab'} · Cấp độ {getLabDifficultyLabel(currentDifficulty)}
                        </p>
                        <h1 className="font-display text-2xl sm:text-[2rem] font-semibold text-[var(--color-text)]">
                          {activeSession.labType === 'concept'
                            ? 'Bạn muốn phân tích khái niệm nào hôm nay?'
                            : 'Bạn muốn kiểm chứng lập luận nào hôm nay?'}
                        </h1>
                        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                          Gõ quan điểm, nói tiếng Việt hoặc đính kèm tệp (.txt, .md, .docx, .pdf, ảnh — tối đa 5 MB). Mỗi lượt AI góp ý hai chiều (điểm mạnh + điểm hở), kiểm chứng dẫn chứng và đặt 1 câu hỏi Socrates tự nhiên bám sát lập luận của bạn.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-left">
                        {starters.map((starter) => (
                          <button
                            key={starter.label}
                            type="button"
                            onClick={() => {
                              setComposerText(starter.prompt);
                              composerRef.current?.focus();
                            }}
                            className="group rounded-xl p-3.5 border border-[var(--color-border)] bg-[var(--color-bg)]/60 hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/45 transition-all cursor-pointer flex flex-col justify-between gap-2"
                          >
                            <span className="text-xs font-semibold text-[var(--color-primary)]">
                              {starter.label}
                            </span>
                            <span className="text-xs leading-relaxed text-[var(--color-text-muted)] line-clamp-3 group-hover:text-[var(--color-text)] transition-colors">
                              “{starter.prompt}”
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  activeSession.messages.map((msg) =>
                    msg.role === 'user' ? (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[74%] rounded-2xl rounded-br-md px-4 sm:px-5 py-3.5 border border-[color-mix(in_srgb,var(--color-primary)_22%,var(--color-border)_78%)] bg-[color-mix(in_srgb,var(--color-primary)_9%,var(--color-surface)_91%)] space-y-2">
                          <div className="flex items-center justify-end gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                            <span className="font-mono-num font-semibold text-[var(--color-primary)]">
                              {msg.turnRef || 'Bạn'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Quan điểm của bạn</span>
                          </div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {msg.attachments.map((att) => (
                                <span
                                  key={att.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] text-[var(--color-text)]"
                                >
                                  {att.kind === 'image' ? (
                                    <ImageIcon className="h-3 w-3 text-[var(--color-primary)]" />
                                  ) : (
                                    <FileText className="h-3 w-3 text-[var(--color-primary)]" />
                                  )}
                                  <span className="max-w-[160px] truncate">{att.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="font-reading text-[0.98rem] sm:text-[1.02rem] leading-[1.72] text-[var(--color-text)] whitespace-pre-line">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ThreeLayerResponseCard
                        key={msg.id}
                        message={msg}
                        animateTyping={msg.id === latestAnimatedMsgId}
                        onQuoteToComposer={handleQuoteToComposer}
                        onSpeakMessage={(text, id) => voice.speakText(text, id)}
                        onFlagMessage={handleFlagAiMessage}
                        isSpeaking={
                          voice.isSpeaking &&
                          (voice.speakingMessageId === msg.id ||
                            voice.speakingMessageId === `${msg.id}_q`)
                        }
                      />
                    )
                  )
                )}

                {isBusy && <DebateStepperLive activeIndex={analyzingStep} />}

                {/* Transparent HTTP 429 Quota Banner */}
                {rateLimitState && rateLimitState.secondsLeft > 0 && (
                  <RateLimitBanner
                    variant="rate_limited"
                    message={rateLimitState.message}
                    secondsLeft={rateLimitState.secondsLeft}
                    autosaveNotice={autosaveNotice}
                    onUseLocalFallback={() => submitMessage({ useLocalFallback: true })}
                  />
                )}

                {/* Transparent API Error / Missing Key Recovery Banner */}
                {apiErrorState && (
                  <RateLimitBanner
                    variant="api_error"
                    title={apiErrorState.title}
                    message={apiErrorState.message}
                    autosaveNotice={autosaveNotice}
                    onRetry={() => submitMessage()}
                    onUseLocalFallback={() => submitMessage({ useLocalFallback: true })}
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Composer Dock */}
            <div className="shrink-0 border-t border-[var(--color-border)]/80 bg-[var(--color-bg)]/95 backdrop-blur-sm px-3 sm:px-6 lg:px-10 py-3">
              <div className="mx-auto max-w-[820px] space-y-2.5">
                {/* 3 Context-Aware Quick Reply Chips */}
                <div
                  aria-label="Gợi ý phản hồi nhanh"
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
                >
                  <Sparkles
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden="true"
                  />
                  {quickReplies.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={isBusy || isRateCountdownActive}
                      onClick={() => submitMessage({ overrideText: chip })}
                      className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface)_94%)] disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Live Voice Debate & Anti-Echo Status Strip (Req 4) */}
                <AnimatePresence>
                  {(voice.isListening ||
                    voice.isSpeaking ||
                    voice.voicePhase === 'cooldown' ||
                    voice.handsFreeMode) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        data-testid="voice-status-strip"
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs border border-[color-mix(in_srgb,var(--color-primary)_28%,var(--color-border)_72%)] bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface)_93%)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {voice.voicePhase === 'user_listening' ? (
                            <>
                              <span className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
                                <span className="w-0.5 h-2 rounded-full bg-red-500 animate-bounce" />
                                <span className="w-0.5 h-3.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="w-0.5 h-2.5 rounded-full bg-red-500 animate-bounce" />
                              </span>
                              <span className="font-semibold text-red-600 dark:text-red-400">
                                Lượt của bạn · Đang lắng nghe tiếng Việt…
                              </span>
                              {voice.interimTranscript && (
                                <span className="text-[var(--color-text-muted)] truncate">
                                  “{voice.interimTranscript}”
                                </span>
                              )}
                            </>
                          ) : voice.voicePhase === 'ai_speaking' ? (
                            <>
                              <Volume2 className="h-3.5 w-3.5 text-[var(--color-primary)] animate-pulse shrink-0" />
                              <span className="font-medium text-[var(--color-text)]">
                                AI đang đọc phản hồi · Micro đã khóa tự động để chống vọng
                              </span>
                            </>
                          ) : voice.voicePhase === 'cooldown' ? (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                              <span className="text-[var(--color-text-muted)]">
                                Đang chờ loa lắng âm (chống thu nhầm tiếng AI) trước khi mở Micro…
                              </span>
                            </>
                          ) : voice.voicePhase === 'ai_thinking' ? (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)] animate-pulse shrink-0" />
                              <span className="text-[var(--color-text-muted)]">
                                AI đang phân tích lập luận của bạn (Micro tạm nghỉ)…
                              </span>
                            </>
                          ) : (
                            <>
                              <Headphones className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                              <span className="text-[var(--color-text-muted)]">
                                Tranh biện rảnh tay đang bật: Luân phiên lượt nói — khóa Micro khi AI đọc để không thu nhầm giọng AI.
                              </span>
                            </>
                          )}
                        </div>
                        {voice.isSpeaking && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              data-testid="voice-barge-in-btn"
                              onClick={voice.bargeInAndListen}
                              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Mic className="h-3 w-3" />
                              Ngắt lời / Nói tiếp ngay
                            </button>
                            <button
                              type="button"
                              onClick={voice.stopSpeaking}
                              className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer whitespace-nowrap"
                            >
                              Dừng đọc
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Composer Form with File Attachment Support (Req 5) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitMessage();
                  }}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 transition-colors focus-within:border-[var(--color-primary)]/60 shadow-2xs"
                >
                  {/* Attachment Preview Chips */}
                  {attachments.length > 0 && (
                    <div
                      data-testid="composer-attachments"
                      className="mb-2 flex flex-wrap items-center gap-2 pb-2 border-b border-[var(--color-border)]/70"
                    >
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs"
                        >
                          {att.kind === 'image' && att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt={att.name}
                              className="h-6 w-6 rounded object-cover border border-[var(--color-border)] shrink-0"
                            />
                          ) : (
                            <FileText className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="block max-w-[160px] truncate font-medium text-[var(--color-text)]">
                              {att.name}
                            </span>
                            <span className="block text-[10px] text-[var(--color-text-muted)] font-mono-num">
                              {formatFileSize(att.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            aria-label={`Gỡ tệp ${att.name}`}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label htmlFor="lab-composer-textarea" className="sr-only">
                    Nhập hoặc nói quan điểm tranh biện của bạn
                  </label>
                  <textarea
                    ref={composerRef}
                    id="lab-composer-textarea"
                    rows={2}
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submitMessage();
                      }
                    }}
                    placeholder={
                      voice.isListening
                        ? 'Hãy nói suy nghĩ của bạn bằng tiếng Việt…'
                        : activeSession.labType === 'concept'
                          ? 'Nhập khái niệm, đính kèm tài liệu hoặc bấm Micro để nói… (Enter để gửi)'
                          : 'Nhập quan điểm tranh biện, đính kèm dẫn chứng hoặc bấm Micro để nói…'
                    }
                    className="w-full bg-transparent px-2 py-1 text-sm leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/75 focus:outline-none resize-none"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json,.docx,.png,.jpg,.jpeg,.webp,.pdf"
                    onChange={handleFileSelect}
                    data-testid="lab-file-input"
                    className="hidden"
                  />

                  <div className="mt-2 pt-2 border-t border-[var(--color-border)]/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--color-text-muted)]">
                      <button
                        type="button"
                        disabled={isBusy || attachments.length >= MAX_LAB_ATTACHMENTS}
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="attach-file-btn"
                        title="Đính kèm văn bản (.txt, .md, .docx, .csv, .json), ảnh (.png, .jpg, .webp) hoặc PDF tối đa 5 MB"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text)] border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Đính kèm ({attachments.length}/{MAX_LAB_ATTACHMENTS})
                      </button>

                      {activeSession.messages.length >= 2 && (
                        <button
                          type="button"
                          disabled={isBusy || isRateCountdownActive}
                          onClick={() =>
                            submitMessage({
                              overrideText:
                                'Hãy tổng kết phiên học này thành Bản đồ truy vết tư duy giúp mình.',
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <MapIcon className="h-3 w-3" />
                          Bản đồ tư duy
                        </button>
                      )}

                      {showDebugControls && (
                        <button
                          type="button"
                          disabled={isBusy || isRateCountdownActive}
                          onClick={() => submitMessage({ simulate429: true })}
                          data-testid="simulate-429-btn"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-45 transition-colors cursor-pointer"
                        >
                          <Clock className="h-3 w-3" />
                          Mô phỏng 429
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Microphone Button (STT vi-VN) */}
                      <button
                        type="button"
                        onClick={voice.toggleListening}
                        disabled={isBusy || isRateCountdownActive || voice.voicePhase === 'cooldown'}
                        aria-pressed={voice.isListening}
                        aria-label={
                          voice.isListening
                            ? 'Dừng ghi âm giọng nói'
                            : 'Nói bằng giọng tiếng Việt (Micro)'
                        }
                        title={
                          voice.isListening
                            ? 'Bấm để dừng thu âm'
                            : voice.isSpeaking
                              ? 'Bấm để ngắt giọng AI và nói ngay'
                              : 'Nói bằng giọng tiếng Việt'
                        }
                        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer disabled:opacity-45 ${
                          voice.isListening
                            ? 'border-red-500 bg-red-500 text-white shadow-sm'
                            : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
                        }`}
                      >
                        {voice.isListening && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-60"
                          />
                        )}
                        {voice.isListening ? (
                          <MicOff className="h-4 w-4 relative z-10" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>

                      {/* Primary Send Button */}
                      <button
                        type="submit"
                        disabled={
                          isBusy ||
                          isRateCountdownActive ||
                          (!composerText.trim() && attachments.length === 0)
                        }
                        data-testid="lab-send-btn"
                        className="btn-primary !min-h-9 !px-4 !py-1.5 !text-xs whitespace-nowrap"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isBusy
                          ? 'Đang suy luận…'
                          : isRateCountdownActive
                            ? `Chờ ${rateLimitState?.secondsLeft}s`
                            : 'Gửi'}
                      </button>
                    </div>
                  </div>
                </form>

                <p className="text-center text-[11px] text-[var(--color-text-muted)]">
                  Phản hồi AI mang tính gợi mở tư duy học thuật và có thể có sai sót — hãy luôn đối chiếu tài liệu gốc.
                </p>
              </div>
            </div>
          </div>

          {/* Unified Right Collapsible Drawer for ArgumentLedger */}
          <AnimatePresence>
            {ledgerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setLedgerOpen(false)}
                  aria-hidden="true"
                  className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] xl:hidden"
                />

                <motion.aside
                  data-testid="argument-ledger-drawer"
                  aria-label="Sổ tay mạch lập luận"
                  initial={{ x: '100%', opacity: 0.6 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0.6 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-y-0 right-0 z-40 xl:static xl:z-10 w-[330px] max-w-[88vw] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden shadow-lg xl:shadow-none"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                      <BookMarked className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      Sổ tay mạch lập luận ({activeSession.ledger.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setLedgerOpen(false)}
                      aria-label="Đóng sổ tay mạch lập luận"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <ArgumentLedger
                      session={activeSession}
                      onQuoteEntry={handleQuoteLedgerEntry}
                    />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session Report Modal (Req 2) */}
      <SessionReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        session={activeSession}
        attachedResource={attachedResource}
        onNotify={(msg, variant = 'info') => showToast(msg, { variant })}
      />
    </WorkspaceShell>
  );
}
