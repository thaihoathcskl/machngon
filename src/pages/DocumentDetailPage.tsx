import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bookmark,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileWarning,
  Flag,
  HelpCircle,
  Highlighter,
  Lightbulb,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { dispatchQuickExplain } from '../components/dictionary/QuickDictionarySuite';
import { PublicHeader, WorkspaceShell } from '../components/layout/AppShell';
import {
  ConceptPopoverDialog,
  renderTextWithConceptHighlights,
} from '../components/library/ConceptTooltip';
import {
  DocumentFeedbackSection,
  DocumentReportModal,
} from '../components/library/DocumentFeedbackSection';
import {
  LibraryLabActionOption,
  LibraryToLabActionsMenu,
} from '../components/library/LibraryToLabActions';
import { LibraryFontSizeControl } from '../components/library/LibraryFontSizeControl';
import { useToast } from '../components/ui/ToastProvider';
import { ChapterDividerSvg } from '../components/visuals/EditorialSvgIllustrations';
import { HybridMediaCard } from '../components/visuals/ThemeSyncedHero';
import { LIBRARY_CONCEPTS } from '../content/library/concepts';
import { LEGACY_DOCUMENT_ID_ALIAS } from '../content/library/v2Adapter';
import {
  buildGlossaryQuickQuiz,
  countWords,
  RUBRIC_CRITERIA,
  splitVietnameseSentences,
  TOULMIN_ROLES,
} from '../lib/ai/v2Pedagogy';
import { useApp } from '../lib/AppContext';
import { buildAuthRedirectUrl } from '../lib/authGuard';
import { getRelatedDocuments } from '../lib/library/recommendations';
import {
  deriveDocumentToc,
  estimateReadingMinutes,
  getDifficultyLabel,
  isDocumentVerified,
  isSafeHttpUrl,
} from '../lib/library/validation';
import { Link, useRouter } from '../lib/router';
import {
  loadDocStances,
  loadReadingScrollPosition,
  READING_FONT_SIZE_OPTIONS,
  ReadingFontSize,
  saveDocStance,
  saveReadingScrollPosition,
  setLabHandoff,
} from '../lib/storage';
import {
  DocumentBlock,
  LabActionIntent,
  LabType,
  LibraryConcept,
  RubricEvaluationResult,
  ToulminRole,
} from '../lib/types';
import { annotateToulminWithV2, evaluateRubricWithV2 } from '../services/aiService';

interface SelectionPopoverState {
  text: string;
  contextSnippet: string;
  x: number;
  y: number;
}

function formatNoteTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function DocumentDetailPage({ documentId }: { documentId: string }) {
  const {
    user,
    documents,
    publishedDocuments,
    publishedCollections,
    savedDocIds,
    toggleSavedDoc,
    completedDocIds,
    toggleCompletedDoc,
    markDocOpened,
    activeJourneyId,
    addRubricScore,
    notes,
    addReadingNote,
    updateReadingNote,
    deleteReadingNote,
    layoutPrefs,
    updateLayoutPrefs,
  } = useApp();
  const { showToast } = useToast();
  const { navigate, search: urlSearch } = useRouter();

  const isAdminPreview = useMemo(
    () => new URLSearchParams(urlSearch).get('preview') === 'admin',
    [urlSearch]
  );

  const resolvedDocumentId = LEGACY_DOCUMENT_ID_ALIAS[documentId] ?? documentId;

  // Strict lookup — NEVER fall back silently to documents[0]
  const doc = useMemo(
    () => documents.find((d) => d.id === resolvedDocumentId) ?? null,
    [documents, resolvedDocumentId]
  );

  // Automatically derived TOC — 100% synced with actual heading blocks in the document
  const tocItems = useMemo(() => (doc ? deriveDocumentToc(doc) : []), [doc]);
  const blockToAnchorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of tocItems) {
      map.set(item.blockId, item.id);
    }
    return map;
  }, [tocItems]);

  const relatedDocs = useMemo(
    () => (doc ? getRelatedDocuments(doc, publishedDocuments, 3) : []),
    [doc, publishedDocuments]
  );

  const docConcepts = useMemo(() => {
    if (!doc) return [];
    const idSet = new Set(doc.relatedConceptIds ?? []);
    return LIBRARY_CONCEPTS.filter(
      (c) => idSet.has(c.id) || c.documentIds.includes(doc.id)
    );
  }, [doc]);

  const docNotes = useMemo(
    () => (doc ? notes.filter((n) => n.documentId === doc.id) : []),
    [notes, doc]
  );

  const quickQuiz = useMemo(
    () => (doc ? buildGlossaryQuickQuiz(doc, LIBRARY_CONCEPTS) : []),
    [doc]
  );

  const [focusMode, setFocusMode] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>(tocItems[0]?.id ?? '');
  const [noteInput, setNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [openBlockMenuId, setOpenBlockMenuId] = useState<string | null>(null);
  const [selectionPopover, setSelectionPopover] = useState<SelectionPopoverState | null>(null);
  const [activeConcept, setActiveConcept] = useState<LibraryConcept | null>(null);
  const [stanceInput, setStanceInput] = useState('');
  const [rubricResult, setRubricResult] = useState<RubricEvaluationResult | null>(null);
  const [rubricLoading, setRubricLoading] = useState(false);
  const [toulminMode, setToulminMode] = useState(false);
  const [activeToulminRole, setActiveToulminRole] = useState<ToulminRole>('claim');
  const [toulminAssignments, setToulminAssignments] = useState<Record<string, ToulminRole>>({});
  const [toulminCompare, setToulminCompare] = useState<{
    blockId: string;
    roles: ToulminRole[];
    why: string[];
    source: 'ai' | 'local';
    fallbackReason?: string;
  } | null>(null);
  const [toulminComparingId, setToulminComparingId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const [slideOverToolsOpen, setSlideOverToolsOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<'none' | 'toc' | 'tools'>('none');
  const [restoredBanner, setRestoredBanner] = useState<string | null>(null);

  const articleRef = useRef<HTMLElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fontSize: ReadingFontSize = layoutPrefs.readingFontSize ?? 'md';

  const requireAuthForAction = useCallback(
    (redirectPath?: string): boolean => {
      if (user.isAuthenticated) return true;
      const target = redirectPath ?? `/library/${encodeURIComponent(documentId)}`;
      navigate(buildAuthRedirectUrl(target));
      return false;
    },
    [user.isAuthenticated, documentId, navigate]
  );

  // Track opened document and reset per-article practice states when switching documents
  useEffect(() => {
    if (doc && doc.status === 'published') {
      markDocOpened(doc.id);
      const savedStances = loadDocStances();
      setStanceInput(savedStances[doc.id] ?? '');
    } else {
      setStanceInput('');
    }
    if (tocItems[0]?.id) {
      setActiveSectionId(tocItems[0].id);
    }
    setOpenBlockMenuId(null);
    setSelectionPopover(null);
    setEditingNoteId(null);
    setMobileMoreOpen(false);
    setRubricResult(null);
    setRubricLoading(false);
    setToulminMode(false);
    setToulminAssignments({});
    setToulminCompare(null);
    setQuizAnswers({});
  }, [doc?.id, doc?.status, markDocOpened, tocItems]);

  // Restore saved reading position from sessionStorage (`machngon_read_pos_{resource_id}`)
  useEffect(() => {
    if (!doc || doc.status !== 'published') return;
    const saved = loadReadingScrollPosition(doc.id);
    if (saved && saved.scrollY > 120) {
      const timer = window.setTimeout(() => {
        window.scrollTo({ top: saved.scrollY, behavior: 'smooth' });
        setRestoredBanner(`Đã quay lại vị trí đọc gần nhất (${Math.round(saved.scrollPercent)}%).`);
        window.setTimeout(() => setRestoredBanner(null), 3500);
      }, 160);
      return () => window.clearTimeout(timer);
    }
  }, [doc?.id, doc?.status]);

  // Track reading progress + debounce 400ms scroll persistence
  useEffect(() => {
    if (!doc || doc.status !== 'published') return;
    let debounceTimer: number | undefined;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollY / docHeight) * 100)) : 0;
      setReadProgress(pct);

      let nearest = tocItems[0]?.id;
      for (const sec of tocItems) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            nearest = sec.id;
          }
        }
      }
      if (nearest) setActiveSectionId(nearest);

      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        saveReadingScrollPosition(doc.id, {
          scrollPercent: pct,
          scrollY,
          nearestHeadingId: nearest,
          updatedAt: new Date().toISOString(),
        });
      }, 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(debounceTimer);
    };
  }, [doc, tocItems]);

  // Keyboard shortcut 'F' to toggle Focus Mode, 'Esc' to close popovers/Focus Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditable) return;
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (openBlockMenuId) setOpenBlockMenuId(null);
        else if (selectionPopover) setSelectionPopover(null);
        else if (mobileMoreOpen) setMobileMoreOpen(false);
        else if (focusMode) setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, openBlockMenuId, selectionPopover, mobileMoreOpen]);

  // Desktop text selection (15–600 characters) floating 5-action Popover
  const handleArticleMouseUp = useCallback(() => {
    if (window.innerWidth < 1024) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionPopover(null);
      return;
    }
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 15 || text.length > 600) {
      setSelectionPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const anchorEl =
      sel.anchorNode instanceof HTMLElement
        ? sel.anchorNode
        : sel.anchorNode?.parentElement ?? null;
    const blockHost = anchorEl?.closest('p, li, blockquote, section') ?? anchorEl;
    const contextSnippet =
      blockHost?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 340) ?? text;
    setSelectionPopover({
      text,
      contextSnippet,
      x: Math.max(190, Math.min(window.innerWidth - 190, rect.left + rect.width / 2)),
      y: Math.max(88, rect.top - 12),
    });
  }, []);

  // Handoff to Thinking Lab (requires login for guests; prefills Composer without auto-sending)
  const handoffToLab = (
    labType: LabType,
    quoteText: string,
    options?: {
      blockLabel?: string;
      sectionId?: string;
      sectionTitle?: string;
      actionIntent?: LabActionIntent;
      question?: string;
    }
  ) => {
    if (!doc) return;
    const labUrl = `/lab?mode=${labType}&resource=${encodeURIComponent(doc.id)}`;
    const matchedSection = tocItems.find(
      (s) => s.id === (options?.sectionId ?? activeSectionId)
    );
    setLabHandoff({
      labType,
      resourceContextId: doc.id,
      resourceTitle: doc.title,
      quoteText,
      blockLabel: options?.blockLabel,
      sectionId: options?.sectionId ?? activeSectionId,
      sectionTitle: options?.sectionTitle ?? matchedSection?.title,
      actionIntent: options?.actionIntent,
      question: options?.question,
    });
    if (!requireAuthForAction(labUrl)) return;

    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollY / docHeight) * 100)) : 0;
    saveReadingScrollPosition(doc.id, {
      scrollPercent: pct,
      scrollY,
      nearestHeadingId: options?.sectionId ?? activeSectionId,
      updatedAt: new Date().toISOString(),
    });
    setOpenBlockMenuId(null);
    setSelectionPopover(null);
    navigate(labUrl);
  };

  const handleLabActionSelect = (
    option: LibraryLabActionOption,
    quoteText: string,
    blockMeta?: { blockLabel?: string; sectionId?: string; sectionTitle?: string }
  ) => {
    handoffToLab(option.labType, quoteText, {
      ...blockMeta,
      actionIntent: option.intent,
    });
  };

  // Trigger "Ghi chú" action smoothly across all breakpoints
  const handleOpenNotes = () => {
    if (!requireAuthForAction()) return;
    if (window.innerWidth < 1024) {
      setMobileSheet('tools');
      return;
    }
    if (window.innerWidth < 1280) {
      setSlideOverToolsOpen(true);
      return;
    }
    if (!layoutPrefs.rightPanelOpenDesktop) {
      updateLayoutPrefs({ rightPanelOpenDesktop: true });
    }
    window.setTimeout(() => {
      noteTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      noteTextareaRef.current?.focus();
    }, 80);
  };

  const handleShareLink = async () => {
    if (!doc) return;
    const shareUrl = `${window.location.origin}/library/${encodeURIComponent(doc.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Đã sao chép liên kết bài đọc để chia sẻ.', { variant: 'success' });
    } catch {
      showToast('Không thể sao chép liên kết tự động trên trình duyệt này.', {
        variant: 'warning',
      });
    }
  };

  const wrapWithShell = (content: React.ReactNode) => {
    if (focusMode) {
      return <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] overflow-x-clip">{content}</div>;
    }
    if (user.isAuthenticated) {
      return <WorkspaceShell>{content}</WorkspaceShell>;
    }
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col overflow-x-clip">
        <PublicHeader />
        <main className="flex-1 min-w-0">{content}</main>
      </div>
    );
  };

  // 1. NOT FOUND state
  if (!doc) {
    return wrapWithShell(
      <div className="mx-auto max-w-2xl px-6 py-20 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] text-[var(--color-primary)]">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-text)]">
          Không tìm thấy tài liệu
        </h1>
        <p className="font-reading text-sm sm:text-base text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
          Liên kết tài liệu bạn truy cập không tồn tại hoặc đã được di chuyển khỏi Thư viện Tri thức.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/library" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Quay lại Thư viện Tri thức
          </Link>
          <Link to="/lab" className="btn-secondary">
            Mở Thinking Lab
          </Link>
        </div>
      </div>
    );
  }

  // 2. DRAFT guard
  if (doc.status !== 'published' && !isAdminPreview) {
    return wrapWithShell(
      <div className="mx-auto max-w-2xl px-6 py-20 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] text-[var(--color-gold)]">
          <FileWarning className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-text)]">
          Tài liệu đang ở trạng thái bản nháp
        </h1>
        <p className="font-reading text-sm sm:text-base text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
          Bài đọc “{doc.title}” hiện đang trong quá trình biên tập và kiểm chứng nguồn nên chưa được công bố trong Thư viện.
        </p>
        <div className="pt-2">
          <Link to="/library" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Khám phá tài liệu đã xuất bản
          </Link>
        </div>
      </div>
    );
  }

  const isSaved = user.isAuthenticated && savedDocIds.includes(doc.id);
  const isCompleted = completedDocIds.includes(doc.id);
  const verified = isDocumentVerified(doc);
  const readingMinutes = estimateReadingMinutes(doc.blocks, doc.excerpt);
  const activeSectionTitle =
    tocItems.find((s) => s.id === activeSectionId)?.title ?? tocItems[0]?.title;

  const activeJourney = useMemo(() => {
    if (activeJourneyId) {
      const chosen = publishedCollections.find(
        (col) => col.id === activeJourneyId && col.documentIds.includes(doc.id)
      );
      if (chosen) return chosen;
    }
    return publishedCollections.find((col) => col.documentIds.includes(doc.id)) ?? null;
  }, [activeJourneyId, publishedCollections, doc.id]);

  const journeyPosition = useMemo(() => {
    if (!activeJourney) return null;
    const idx = activeJourney.documentIds.indexOf(doc.id);
    if (idx < 0) return null;
    const prevId = idx > 0 ? activeJourney.documentIds[idx - 1] : null;
    const nextId =
      idx < activeJourney.documentIds.length - 1 ? activeJourney.documentIds[idx + 1] : null;
    return {
      index: idx,
      total: activeJourney.documentIds.length,
      prevDoc: prevId ? publishedDocuments.find((d) => d.id === prevId) ?? null : null,
      nextDoc: nextId ? publishedDocuments.find((d) => d.id === nextId) ?? null : null,
    };
  }, [activeJourney, doc.id, publishedDocuments]);

  const handleToggleSave = () => {
    if (!requireAuthForAction()) return;
    toggleSavedDoc(doc.id);
    showToast(
      isSaved
        ? 'Đã bỏ lưu tài liệu khỏi tủ sách.'
        : 'Đã lưu tài liệu vào tủ sách cá nhân.',
      { variant: isSaved ? 'info' : 'success' }
    );
  };

  const handleToggleCompleted = () => {
    toggleCompletedDoc(doc.id);
    showToast(
      isCompleted ? 'Đã bỏ đánh dấu hoàn thành bài đọc.' : 'Đã đánh dấu hoàn thành bài đọc.',
      { variant: isCompleted ? 'info' : 'success' }
    );
  };

  const handleStanceChange = (value: string) => {
    setStanceInput(value);
    saveDocStance(doc.id, value);
  };

  const handleSaveStanceToNotes = () => {
    if (!requireAuthForAction()) return;
    const trimmed = stanceInput.trim();
    if (trimmed.length < 10) {
      showToast('Hãy viết lập trường của bạn (khoảng 3–5 câu) trước khi lưu.', { variant: 'warning' });
      return;
    }
    addReadingNote(doc.id, `Lập trường cá nhân: ${trimmed}`, undefined, activeSectionId, 'Thực hành cuối bài');
    showToast('Đã lưu lập trường của bạn vào Ghi chú đọc sâu.', { variant: 'success' });
  };

  const handleEvaluateStance = async () => {
    const trimmed = stanceInput.trim();
    const sentences = splitVietnameseSentences(trimmed);
    if (sentences.length < 3) {
      showToast(
        'Vui lòng viết ít nhất 3 câu hoàn chỉnh (lập trường, lí do và dẫn chứng/phản đề) để AI chấm theo 5 tiêu chí.',
        { variant: 'warning' }
      );
      return;
    }
    setRubricLoading(true);
    try {
      const res = await evaluateRubricWithV2(trimmed, doc.title);
      setRubricResult(res);
      addRubricScore({
        docId: doc.id,
        title: doc.title,
        mode: 'library_stance',
        scores: res.scores,
        words: countWords(trimmed),
      });
      showToast(
        res.source === 'ai'
          ? 'Đã chấm lập trường theo 5 tiêu chí và lưu vào Bản đồ kỹ năng.'
          : 'Đã phân tích lập trường bằng bộ chấm cục bộ và lưu vào Bản đồ kỹ năng.',
        { variant: res.source === 'ai' ? 'success' : 'info' }
      );
    } finally {
      setRubricLoading(false);
    }
  };

  const handleCompareToulminBlock = async (blockId: string, sentences: string[]) => {
    if (sentences.length === 0) return;
    setToulminComparingId(blockId);
    try {
      const res = await annotateToulminWithV2(sentences);
      setToulminCompare({
        blockId,
        roles: res.roles,
        why: res.why,
        source: res.source,
        fallbackReason: res.fallbackReason,
      });
    } finally {
      setToulminComparingId(null);
    }
  };

  const handleSendStanceToLab = () => {
    const trimmed = stanceInput.trim();
    const promptText =
      trimmed.length >= 10
        ? `Lập trường của tôi về bài "${doc.title}": ${trimmed}`
        : `Tôi muốn tranh biện về câu hỏi trọng tâm của bài "${doc.title}": ${
            doc.blocks.find((b) => b.type === 'question')?.content ?? doc.excerpt
          }`;
    handoffToLab('debate', promptText, {
      blockLabel: 'Lập trường của bạn',
      sectionId: activeSectionId,
      sectionTitle: activeSectionTitle,
      actionIntent: 'debate_claim',
    });
  };

  const renderToulminText = (blockId: string, text: string) => {
    const sentences = splitVietnameseSentences(text);
    const compareHit = toulminCompare?.blockId === blockId ? toulminCompare : null;

    return (
      <div className="space-y-3 mt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[var(--color-text-muted)]">
            Bấm từng câu để gắn vai trò đang chọn (<span className="font-mono-num">{sentences.length}</span> câu)
          </span>
          <button
            type="button"
            disabled={toulminComparingId === blockId || sentences.length === 0}
            onClick={() => void handleCompareToulminBlock(blockId, sentences)}
            className="btn-secondary !min-h-8 !px-3 !py-1 !text-xs whitespace-nowrap"
          >
            {toulminComparingId === blockId ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang đối chiếu…
              </>
            ) : (
              <>
                <ListChecks className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                So với gợi ý
              </>
            )}
          </button>
        </div>

        <p className="editorial-prose leading-[1.95]">
          {sentences.map((sent, sIdx) => {
            const key = `${blockId}:${sIdx}`;
            const userRole = toulminAssignments[key] ?? 'none';
            const suggestedRole = compareHit?.roles[sIdx];
            const isMismatch =
              Boolean(compareHit) &&
              userRole !== 'none' &&
              suggestedRole !== undefined &&
              userRole !== suggestedRole;
            const roleMeta = TOULMIN_ROLES.find((r) => r.key === userRole);

            return (
              <button
                key={key}
                type="button"
                data-role={userRole}
                data-mismatch={isMismatch ? 'true' : undefined}
                title={
                  roleMeta
                    ? `${roleMeta.label}${compareHit && suggestedRole ? ` · Gợi ý: ${TOULMIN_ROLES.find((r) => r.key === suggestedRole)?.label ?? 'Dẫn dắt'}` : ''}`
                    : 'Bấm để gắn nhãn Toulmin cho câu này'
                }
                onClick={() => {
                  setToulminAssignments((prev) => ({
                    ...prev,
                    [key]: prev[key] === activeToulminRole ? 'none' : activeToulminRole,
                  }));
                }}
                className="toulmin-sent inline text-left font-reading"
              >
                {sent}
              </button>
            );
          })}
        </p>

        {compareHit && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-3.5 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[var(--color-text)]">
                Đối chiếu gợi ý Toulmin ({compareHit.source === 'ai' ? 'AI' : 'Phân tích từ khóa cục bộ'})
              </span>
              {compareHit.fallbackReason && (
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {compareHit.fallbackReason}
                </span>
              )}
            </div>
            <ul className="space-y-1 text-[var(--color-text-muted)]">
              {sentences.map((sent, sIdx) => {
                const sug = compareHit.roles[sIdx] ?? 'none';
                const label = TOULMIN_ROLES.find((r) => r.key === sug)?.label ?? 'Dẫn dắt / nền';
                const why = compareHit.why[sIdx];
                return (
                  <li key={`${blockId}-sug-${sIdx}`} className="flex items-start gap-2">
                    <span className="font-mono-num font-semibold text-[var(--color-primary)] shrink-0">
                      Câu {sIdx + 1}:
                    </span>
                    <span>
                      <strong className="text-[var(--color-text)]">{label}</strong>
                      {why ? ` — ${why}` : ` (“${sent.slice(0, 48)}${sent.length > 48 ? '…' : ''}”)`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderStancePracticeBox = (boxId: string) => {
    const words = countWords(stanceInput);
    const sentencesCount = splitVietnameseSentences(stanceInput).length;
    return (
      <div className="mt-5 pt-4 border-t border-[var(--color-border)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label
              htmlFor={`stance-box-${boxId}`}
              className="block text-xs font-semibold text-[var(--color-text)]"
            >
              Viết lập trường của bạn (từ 3 câu trở lên)
            </label>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Nêu rõ quan điểm, dẫn chứng kiểm chứng được, giả định ngầm và xét ý kiến trái chiều.
            </p>
          </div>
          <span className="font-mono-num text-[11px] text-[var(--color-text-muted)]">
            {words} chữ · {sentencesCount} câu
          </span>
        </div>

        <textarea
          id={`stance-box-${boxId}`}
          rows={4}
          value={stanceInput}
          onChange={(e) => handleStanceChange(e.target.value)}
          placeholder="Theo tôi, ranh giới cốt lõi nằm ở… Lý do là… Ví dụ cụ thể… Tuy nhiên có ý kiến cho rằng…"
          className="textarea-editorial !text-sm resize-y"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={rubricLoading}
            onClick={() => void handleEvaluateStance()}
            className="btn-primary !min-h-9 !px-3.5 !text-xs"
          >
            {rubricLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Đang chấm theo 5 tiêu chí…
              </>
            ) : (
              <>
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                Chấm theo 5 tiêu chí
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSendStanceToLab}
            className="btn-secondary !min-h-9 !px-3.5 !text-xs"
          >
            <Send className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            Mở trong Thinking Lab
          </button>
          <button
            type="button"
            onClick={handleSaveStanceToNotes}
            className="btn-secondary !min-h-9 !px-3.5 !text-xs"
          >
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
            Lưu vào Ghi chú
          </button>
        </div>

        {rubricResult && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
              <strong className="font-display text-sm text-[var(--color-text)]">
                Phản hồi theo 5 tiêu chí (thang 1–3)
              </strong>
              <span className="text-[11px] font-medium text-[var(--color-primary)]">
                {rubricResult.source === 'ai' ? 'Đánh giá bởi AI' : 'Phân tích cục bộ (tham khảo)'}
              </span>
            </div>

            {rubricResult.fallbackReason && (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {rubricResult.fallbackReason}
              </p>
            )}

            <div className="divide-y divide-[var(--color-border)]/70">
              {RUBRIC_CRITERIA.map((criterion) => {
                const score = rubricResult.scores[criterion.key];
                const comment = rubricResult.comments[criterion.key] ?? criterion.levels[score - 1];
                return (
                  <div
                    key={criterion.key}
                    className="py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4"
                  >
                    <div className="flex items-center justify-between sm:w-52 shrink-0 gap-2">
                      <span className="font-semibold text-[var(--color-text)]">
                        {criterion.label}
                      </span>
                      <span className="font-mono-num font-bold text-[var(--color-primary)]">
                        {score}/3
                      </span>
                    </div>
                    <span className="text-[var(--color-text-muted)] leading-relaxed flex-1">
                      {comment}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] space-y-1.5">
              <p className="text-[var(--color-text)]">
                <strong>Việc nên sửa tiếp theo:</strong> {rubricResult.next}
              </p>
              <p className="text-[var(--color-primary)] font-medium">
                <strong>Câu hỏi Socrates:</strong> {rubricResult.question}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBlock = (block: DocumentBlock, idx: number) => {
    const menuOpen = openBlockMenuId === block.id;
    const isConceptBlock = block.type === 'concept';
    const isQuoteBlock = block.type === 'quote';
    const isCounterBlock = block.type === 'counterargument';
    const isQuestionBlock = block.type === 'question';
    const isOpeningProse = idx === 0 && block.type === 'prose';
    const anchorId = blockToAnchorMap.get(block.id);
    const sectionObj = tocItems.find((s) => s.id === anchorId);

    const containerClass = isConceptBlock
      ? 'my-8 rounded-2xl p-5 sm:p-7 border'
      : isQuoteBlock
        ? 'my-8 py-6 px-5 sm:px-7 border-y border-[var(--color-border)] bg-[var(--color-bg)]/45'
        : isCounterBlock
          ? 'my-8 rounded-2xl p-5 sm:p-6 border border-[var(--color-border)] bg-[var(--color-surface)]'
          : isQuestionBlock
            ? 'my-8 rounded-2xl p-5 sm:p-6 border border-[var(--color-border-strong)]/60 surface-subtle'
            : 'my-6';

    const renderedContent =
      isQuoteBlock || isQuestionBlock
        ? block.content
        : renderTextWithConceptHighlights(block.content, docConcepts, (concept) =>
            setActiveConcept(concept)
          );

    const matchedCorpus =
      block.label === 'Ngữ liệu đối chiếu' && doc.practiceCorpora?.length
        ? doc.practiceCorpora.find((item) => item.title === block.heading)
        : undefined;
    const isHsgPromptBlock = block.heading === 'Đề bài & bối cảnh tham khảo';
    const isKeyPointsBlock =
      block.heading === 'Luận điểm cốt lõi' && (doc.keyPoints?.length ?? 0) > 0;
    const isExamplesBlock =
      block.heading === 'Ví dụ minh họa' && (doc.examples?.length ?? 0) > 0;
    const isThinkingQuestionsBlock =
      block.heading === 'Câu hỏi gợi mở & phản biện' &&
      (doc.thinkingQuestions?.length ?? 0) > 0;

    return (
      <div
        key={block.id}
        id={anchorId}
        className={`relative scroll-mt-24 ${containerClass}`}
        style={
          isConceptBlock
            ? {
                backgroundColor:
                  'color-mix(in srgb, var(--color-gold) 11%, var(--color-surface) 89%)',
                borderColor:
                  'color-mix(in srgb, var(--color-gold) 40%, var(--color-border) 60%)',
              }
            : undefined
        }
      >
        {/* Top Row: Block label/heading + 5-Action "Khám phá với AI" trigger */}
        <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isConceptBlock ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)] mb-1.5">
                {block.label || 'Khái niệm trọng tâm'}
              </div>
            ) : (
              block.label && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold)] mb-1.5">
                  {block.label}
                </div>
              )
            )}
            {block.heading && (
              <h2 className="font-display lib-scale-h2 font-semibold text-[var(--color-text)] break-words">
                {block.heading}
              </h2>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenBlockMenuId(menuOpen ? null : block.id)}
              aria-expanded={menuOpen}
              aria-label={`Khám phá với AI về khối ${block.heading || block.label || idx + 1}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 min-h-9 sm:min-h-8 text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)]/95 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/45 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Khám phá với AI</span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-1.5 z-30 w-72 max-w-[calc(100vw-2rem)] sm:w-80 rounded-2xl p-2.5 border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="flex items-center justify-between px-2 pb-2 mb-1.5 border-b border-[var(--color-border)]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                      Chọn cách khám phá trong Lab
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenBlockMenuId(null)}
                      aria-label="Đóng menu"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <LibraryToLabActionsMenu
                    compact
                    onSelectAction={(option) =>
                      handleLabActionSelect(option, block.content, {
                        blockLabel: isConceptBlock
                          ? 'Khái niệm trọng tâm'
                          : block.label || block.heading,
                        sectionId: anchorId,
                        sectionTitle: sectionObj?.title,
                      })
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* HSG Quốc gia open-prompt notice */}
        {isHsgPromptBlock && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3.5 py-2.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
            <strong>Lưu ý đề thi HSG Quốc gia:</strong> Hướng phân tích dưới đây là gợi ý mở theo phương pháp đọc – lập luận, không phải đáp án duy nhất.
          </div>
        )}

        {/* Body rendering: Toulmin interactive vs structured V2 lists vs standard prose */}
        {toulminMode && !isThinkingQuestionsBlock && !matchedCorpus ? (
          renderToulminText(block.id, block.content)
        ) : isKeyPointsBlock && doc.keyPoints ? (
          <ol className="mt-4 space-y-2.5">
            {doc.keyPoints.map((point, ptIdx) => (
              <li
                key={`${block.id}-kp-${ptIdx}`}
                className="flex items-baseline gap-3 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 px-4 py-3 font-reading text-[0.96rem] leading-relaxed text-[var(--color-text)]"
              >
                <span className="font-mono-num text-xs font-semibold text-[var(--color-primary)] shrink-0">
                  {String(ptIdx + 1).padStart(2, '0')}.
                </span>
                <span>
                  {renderTextWithConceptHighlights(point, docConcepts, (concept) =>
                    setActiveConcept(concept)
                  )}
                </span>
              </li>
            ))}
          </ol>
        ) : isExamplesBlock && doc.examples ? (
          <ul className="mt-4 space-y-2.5">
            {doc.examples.map((ex, exIdx) => (
              <li
                key={`${block.id}-ex-${exIdx}`}
                className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/85 px-4 py-3 font-reading text-[0.95rem] leading-relaxed text-[var(--color-text)]"
              >
                <span className="font-ui text-xs font-semibold text-[var(--color-primary)] mr-1.5">
                  Ví dụ {exIdx + 1}:
                </span>
                {renderTextWithConceptHighlights(ex, docConcepts, (concept) =>
                  setActiveConcept(concept)
                )}
              </li>
            ))}
          </ul>
        ) : matchedCorpus ? (
          <div className="mt-3.5 space-y-3">
            <blockquote className="font-reading lib-scale-quote italic text-[var(--color-text)] whitespace-pre-line leading-relaxed">
              {matchedCorpus.text}
            </blockquote>
            {matchedCorpus.task && (
              <p className="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed">
                <strong className="text-[var(--color-primary)]">Gợi ý đọc hiểu:</strong>{' '}
                {matchedCorpus.task}
              </p>
            )}
            {doc.fieldCode === 'vh' && (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Lưu ý bản in: Có thể có khác biệt nhỏ về dấu câu giữa các bộ SGK (Kết nối tri thức, Chân trời sáng tạo, Cánh diều).
              </p>
            )}
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  handoffToLab(
                    matchedCorpus.mode || (doc.fieldCode === 'vh' ? 'read' : 'debate'),
                    matchedCorpus.text,
                    {
                      blockLabel: matchedCorpus.title,
                      sectionId: anchorId,
                      sectionTitle: sectionObj?.title,
                      actionIntent: doc.fieldCode === 'vh' ? 'explain' : 'debate_claim',
                    }
                  )
                }
                className="btn-secondary !min-h-9 !px-3.5 !text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                Phân tích ngữ liệu này trong AI Labs
              </button>
            </div>
          </div>
        ) : isThinkingQuestionsBlock && doc.thinkingQuestions ? (
          <div className="mt-4 space-y-2.5">
            {doc.thinkingQuestions.map((qText, qIdx) => (
              <div
                key={`${block.id}-q-${qIdx}`}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <p className="font-reading text-sm sm:text-[0.96rem] leading-relaxed text-[var(--color-text)]">
                  <span className="font-mono-num text-xs font-semibold text-[var(--color-primary)] mr-2">
                    {qIdx + 1}.
                  </span>
                  {qText}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handoffToLab(doc.fieldCode === 'vh' ? 'read' : 'debate', qText, {
                      blockLabel: 'Câu hỏi gợi mở',
                      sectionId: anchorId,
                      sectionTitle: sectionObj?.title,
                      actionIntent: 'guiding_questions',
                      question: qText,
                    })
                  }
                  className="btn-secondary !min-h-8 !px-3 !py-1 !text-xs shrink-0 self-start sm:self-center whitespace-nowrap"
                >
                  Trả lời trong Lab
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            className={`mt-3.5 whitespace-pre-line ${
              isQuoteBlock
                ? 'lib-scale-quote italic text-[var(--color-text)]'
                : 'editorial-prose'
            } ${isOpeningProse ? 'editorial-dropcap' : ''}`}
          >
            {renderedContent}
          </p>
        )}

        {block.citation && (
          <footer className="mt-4 pt-3 border-t border-[var(--color-border)]/80 font-reading lib-scale-small italic text-[var(--color-text-muted)]">
            Nguồn tham chiếu: {block.citation}
          </footer>
        )}

        {/* Interactive Stance Practice Box embedded right inside the Discussion Question block */}
        {isQuestionBlock && renderStancePracticeBox(block.id)}
      </div>
    );
  };

  const renderRightSidebarContent = () => (
    <div className="space-y-6">
      {/* Interactive Key Concepts in this Document */}
      {docConcepts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-[var(--color-text)]">
              Thuật ngữ trọng tâm
            </h3>
          </div>
          <div className="space-y-2">
            {docConcepts.map((concept) => (
              <button
                key={concept.id}
                type="button"
                onClick={() => setActiveConcept(concept)}
                className="w-full text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-elevated)]/60 transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-[var(--color-primary)]">
                  {concept.term}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                  {concept.shortDefinition}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Related Documents (via unified recommendations engine) */}
      <div className={docConcepts.length > 0 ? 'pt-5 border-t border-[var(--color-border)]' : ''}>
        <h3 className="font-display text-base font-semibold text-[var(--color-text)] mb-3">
          Tài liệu liên quan
        </h3>
        <div className="space-y-2.5">
          {relatedDocs.map((rel) => (
            <Link
              key={rel.id}
              to={`/library/${rel.id}`}
              className="group flex items-center gap-3 rounded-xl p-2.5 border border-[var(--color-border)] bg-[var(--color-bg)]/55 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-muted)]/60 transition-colors"
            >
              <div className="w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
                <HybridMediaCard src={rel.coverImage} alt={rel.coverAlt} aspect="4/3" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-snug line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                  {rel.title}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)] truncate">
                  {rel.category} · {estimateReadingMinutes(rel.blocks, rel.excerpt)} phút
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Margin Notes with Create + Edit + Delete + Section Link */}
      <div className="pt-5 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
            <NotebookPen className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Ghi chú bên lề</span>
          </div>
          <span className="font-mono-num text-[11px] text-[var(--color-text-muted)]">
            {docNotes.length}
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!requireAuthForAction()) return;
            if (!noteInput.trim()) return;
            addReadingNote(doc.id, noteInput, undefined, activeSectionId, activeSectionTitle);
            setNoteInput('');
            showToast('Đã lưu ghi chú bên lề gắn với mục đang đọc.', { variant: 'success' });
          }}
          className="space-y-2.5"
        >
          {activeSectionTitle && (
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              Gắn với: <span className="font-medium text-[var(--color-text)]">{activeSectionTitle}</span>
            </p>
          )}
          <textarea
            ref={noteTextareaRef}
            rows={3}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder={
              user.isAuthenticated
                ? 'Ghi lại ý tưởng, thắc mắc hoặc phản đề vừa nảy ra...'
                : 'Đăng nhập để lưu ghi chú bên lề cá nhân…'
            }
            className="textarea-editorial !text-xs resize-none"
          />
          <button type="submit" className="btn-secondary w-full !min-h-9 !text-xs">
            {user.isAuthenticated ? 'Lưu ghi chú đọc sâu' : 'Đăng nhập để ghi chú'}
          </button>
        </form>

        {user.isAuthenticated && docNotes.length > 0 && (
          <ul className="mt-3.5 space-y-2.5">
            {docNotes.map((n) => {
              const isEditing = editingNoteId === n.id;
              return (
                <li
                  key={n.id}
                  className="rounded-xl p-3 border border-[var(--color-border)] bg-[var(--color-bg)]/50 text-xs space-y-2"
                >
                  {(n.sectionTitle || n.createdAt) && (
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
                      <span className="truncate font-medium text-[var(--color-primary)]">
                        {n.sectionTitle ?? 'Ghi chú chung'}
                      </span>
                      <span className="shrink-0 font-mono-num">
                        {formatNoteTimestamp(n.updatedAt ?? n.createdAt)}
                      </span>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editingNoteValue}
                        onChange={(e) => setEditingNoteValue(e.target.value)}
                        className="textarea-editorial !text-xs resize-none"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingNoteValue.trim()) {
                              updateReadingNote(n.id, editingNoteValue);
                              showToast('Đã cập nhật ghi chú.', { variant: 'success' });
                            }
                            setEditingNoteId(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-primary)] cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2.5">
                      <span className="font-reading text-[0.82rem] leading-relaxed text-[var(--color-text)]">
                        {n.content}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditingNoteValue(n.content);
                          }}
                          aria-label="Sửa ghi chú"
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReadingNote(n.id)}
                          aria-label="Xóa ghi chú"
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick Lab Launch */}
      <div className="rounded-xl p-4 surface-subtle">
        <div className="text-xs font-semibold text-[var(--color-text)]">
          Chuyển mạch sang Thinking Lab
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
          Đính kèm tài liệu này làm ngữ cảnh nền để đào sâu khái niệm hoặc tranh biện.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              handoffToLab('concept', doc.excerpt, {
                blockLabel: 'Tóm lược bài đọc',
                actionIntent: 'analyze_concept',
              })
            }
            className="btn-primary !min-h-9 !px-3 !text-xs"
          >
            Concept Lab
          </button>
          <button
            type="button"
            onClick={() =>
              handoffToLab('debate', doc.excerpt, {
                blockLabel: 'Tóm lược bài đọc',
                actionIntent: 'debate_claim',
              })
            }
            className="btn-secondary !min-h-9 !px-3 !text-xs"
          >
            Debate Lab
          </button>
        </div>
      </div>
    </div>
  );

  return wrapWithShell(
    <>
      {/* Hairline Reading Progress Bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-40 h-[2.5px] bg-transparent pointer-events-none"
      >
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${readProgress}%`, backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      {/* Admin Draft Preview Banner */}
      {isAdminPreview && doc.status !== 'published' && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 py-2 text-center text-xs font-medium text-[var(--color-primary)]">
          Chế độ xem trước quản trị — Tài liệu này hiện ở trạng thái bản nháp và chưa hiển thị công khai trong Thư viện.
        </div>
      )}

      {/* Focus Mode Floating Controls (Font size + Exit) */}
      {focusMode && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          <LibraryFontSizeControl compact className="shadow-md" />
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="btn-secondary !min-h-9 !px-3.5 !text-xs shadow-md"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Thoát Tập trung (Esc / F)
          </button>
        </div>
      )}

      {/* Desktop Text Selection 5-Action Popover (15–600 chars) */}
      <AnimatePresence>
        {selectionPopover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              left: `${selectionPopover.x}px`,
              top: `${selectionPopover.y}px`,
              transform: 'translate(-50%, -100%)',
              boxShadow: 'var(--shadow-float)',
            }}
            className="fixed z-50 w-80 rounded-2xl p-2.5 border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
          >
            <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-[var(--color-border)]">
              <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                Khám phá đoạn bôi đen cùng AI
              </span>
              <button
                type="button"
                onClick={() => setSelectionPopover(null)}
                aria-label="Đóng thanh tác vụ"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const selected = selectionPopover.text;
                const snippet = selectionPopover.contextSnippet;
                setSelectionPopover(null);
                window.getSelection()?.removeAllRanges();
                dispatchQuickExplain(selected, snippet, doc.title);
              }}
              className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-primary)]/40 bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)_92%)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Giải thích nghĩa cụm từ này
            </button>
            <LibraryToLabActionsMenu
              compact
              onSelectAction={(option) =>
                handleLabActionSelect(option, selectionPopover.text, {
                  blockLabel: 'Đoạn trích bôi đen',
                  sectionId: activeSectionId,
                  sectionTitle: activeSectionTitle,
                })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Reading Toolbar — Zero horizontal overflow at 390px */}
      {!focusMode && (
        <div
          className={`sticky z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/94 backdrop-blur-md ${
            user.isAuthenticated ? 'top-14 lg:top-0' : 'top-16'
          }`}
        >
          <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-2 px-3 sm:px-6 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/library"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] whitespace-nowrap transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Library
              </Link>

              <nav
                aria-label="Đường dẫn bài đọc"
                className="hidden md:flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] min-w-0"
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="shrink-0">{doc.category}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate font-medium text-[var(--color-text)] max-w-[200px] xl:max-w-[280px]">
                  {doc.title}
                </span>
              </nav>
            </div>

            {/* Right Controls: Desktop full toolbar · Mobile compact ("⋯" + Font + Mở Lab) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LibraryFontSizeControl compact className="hidden sm:inline-flex" />

              <button
                type="button"
                onClick={() => setFocusMode(true)}
                title="Đọc tập trung (phím F)"
                aria-label="Chế độ đọc tập trung"
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleShareLink}
                aria-label="Chia sẻ liên kết tài liệu"
                title="Chia sẻ liên kết tài liệu"
                className="hidden sm:inline-flex btn-secondary !min-h-9 !px-2.5 !py-1.5 !text-xs"
              >
                <Share2 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="hidden xl:inline">Chia sẻ</span>
              </button>

              <button
                type="button"
                onClick={() => setToulminMode((prev) => !prev)}
                aria-pressed={toulminMode}
                title="Bật chế độ soi 5 thành phần lập luận Toulmin trên bài đọc"
                className={`hidden md:inline-flex btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs ${
                  toulminMode ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''
                }`}
              >
                <Highlighter className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>{toulminMode ? 'Đang soi lập luận' : 'Soi lập luận'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleCompleted}
                aria-pressed={isCompleted}
                aria-label={isCompleted ? 'Bỏ đánh dấu đã đọc xong' : 'Đánh dấu đã đọc xong'}
                className={`hidden sm:inline-flex btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs ${
                  isCompleted ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{isCompleted ? 'Đã đọc xong' : 'Đánh dấu xong'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu vào tủ sách'}
                className={`hidden sm:inline-flex btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs ${
                  isSaved ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''
                }`}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNotes}
                aria-label="Mở bảng ghi chú bài đọc"
                className="hidden sm:inline-flex btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
              >
                <NotebookPen className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>Ghi chú{docNotes.length > 0 ? ` (${docNotes.length})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                title="Báo cáo lỗi nội dung"
                aria-label="Báo cáo lỗi nội dung bài đọc"
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>

              {/* Mobile (< 640px) compact font toggle + overflow "⋯" menu */}
              <button
                type="button"
                onClick={() => {
                  const idx = READING_FONT_SIZE_OPTIONS.findIndex((o) => o.key === fontSize);
                  const next =
                    READING_FONT_SIZE_OPTIONS[(idx + 1) % READING_FONT_SIZE_OPTIONS.length];
                  updateLayoutPrefs({ readingFontSize: next.key });
                }}
                aria-label="Đổi cỡ chữ đọc bài"
                className="inline-flex sm:hidden btn-secondary !min-h-9 !px-2.5 !py-1.5 !text-xs"
              >
                <Type className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="font-mono-num font-semibold">
                  {READING_FONT_SIZE_OPTIONS.find((o) => o.key === fontSize)?.shortLabel ?? 'A'}
                </span>
              </button>

              <div className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen((v) => !v)}
                  aria-label="Thêm thao tác bài đọc"
                  aria-expanded={mobileMoreOpen}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {mobileMoreOpen && (
                  <div
                    className="absolute right-0 mt-1.5 z-40 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg space-y-0.5"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        setToulminMode((v) => !v);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <Highlighter className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>{toulminMode ? 'Tắt soi lập luận' : 'Soi lập luận Toulmin'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        handleToggleCompleted();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <CheckCheck className={`h-3.5 w-3.5 ${isCompleted ? 'text-[var(--color-primary)]' : ''}`} />
                      <span>{isCompleted ? 'Đã đọc xong' : 'Đánh dấu đã đọc xong'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        handleToggleSave();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current text-[var(--color-primary)]' : ''}`} />
                      <span>{isSaved ? 'Bỏ lưu bài đọc' : 'Lưu bài đọc'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        handleOpenNotes();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <NotebookPen className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>Ghi chú ({docNotes.length})</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        void handleShareLink();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>Sao chép liên kết</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMobileMoreOpen(false);
                        setReportModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    >
                      <Flag className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>Báo cáo nội dung</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  handoffToLab('debate', doc.excerpt, {
                    blockLabel: 'Toàn bài đọc',
                    actionIntent: 'debate_claim',
                  })
                }
                className="btn-primary !min-h-9 !px-3 !py-1.5 !text-xs whitespace-nowrap"
              >
                <span className="hidden md:inline">Mở trong Thinking Lab</span>
                <span className="md:hidden">Mở Lab</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Laptop 1024px–1279px Sticky Right Edge Tab */}
      {!focusMode && (
        <button
          type="button"
          onClick={() => setSlideOverToolsOpen(true)}
          aria-label="Mở Thuật ngữ, Tài liệu liên quan và Ghi chú"
          className="hidden lg:flex xl:hidden fixed right-0 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 rounded-l-xl border border-r-0 border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-4 text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] shadow-sm transition-colors cursor-pointer"
        >
          <NotebookPen className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">
            Thuật ngữ & Ghi chú
          </span>
        </button>
      )}

      {/* Mobile / Tablet Quick Triggers for Bottom Sheet (TOC + Tools) */}
      {!focusMode && (
        <div className="flex lg:hidden items-center justify-center gap-2 px-4 pt-4">
          <button
            type="button"
            onClick={() => setMobileSheet('toc')}
            className="btn-secondary flex-1 !min-h-10 !text-xs"
          >
            <List className="h-4 w-4 text-[var(--color-primary)]" />
            Mục lục ({tocItems.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileSheet('tools')}
            className="btn-secondary flex-1 !min-h-10 !text-xs"
          >
            <NotebookPen className="h-4 w-4 text-[var(--color-primary)]" />
            Thuật ngữ & Ghi chú ({docNotes.length})
          </button>
        </div>
      )}

      {/* Scroll Restoration Quiet Toast */}
      {restoredBanner && (
        <div className="mx-auto max-w-[740px] px-4 sm:px-5 pt-4">
          <div className="rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2">
            <span>{restoredBanner}</span>
            <button
              type="button"
              onClick={() => setRestoredBanner(null)}
              aria-label="Đóng thông báo"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3-Column Adaptive Reading Layout */}
      <div
        className={`mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 lg:py-10 ${
          focusMode
            ? 'max-w-[760px]'
            : 'max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'
        }`}
      >
        {/* Column 1: Left Table of Contents (100% auto-derived from heading blocks) */}
        {!focusMode && (
          <aside
            aria-label="Mục lục tài liệu"
            className="hidden lg:block lg:col-span-3 xl:col-span-2 sticky top-20"
          >
            <div className="rounded-2xl p-4 surface-card">
              <div className="font-display text-sm font-semibold text-[var(--color-text)] mb-3">
                Mục lục ({tocItems.length})
              </div>
              <nav className="space-y-1">
                {tocItems.map((section) => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs leading-snug transition-colors ${
                        isActive
                          ? 'bg-[var(--color-bg)] text-[var(--color-primary)] font-semibold border border-[var(--color-border)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]/50'
                      }`}
                    >
                      {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span>{section.title}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-5 pt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Mẹo đọc sâu: Nhấn vào các thuật ngữ gạch chân chấm để xem định nghĩa, hoặc bôi đen
                đoạn văn để tra nghĩa nhanh / mở Thinking Lab.
              </div>
            </div>
          </aside>
        )}

        {/* Column 2: Center Reading Canvas */}
        <article
          ref={articleRef}
          data-article-selection-host="true"
          onMouseUp={handleArticleMouseUp}
          className={
            focusMode
              ? 'mx-auto w-full max-w-[68ch]'
              : 'lg:col-span-9 xl:col-span-7 mx-auto w-full max-w-[68ch] min-w-0'
          }
        >
          {/* Editorial Article Header */}
          <header className="pb-7 border-b border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
              <Link
                to={`/library?category=${encodeURIComponent(doc.category)}`}
                className="text-[var(--color-primary)] hover:underline"
              >
                {doc.category}
              </Link>
              <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
              <span className="text-[var(--color-text-muted)] font-medium">
                {getDifficultyLabel(doc.difficulty)}
              </span>
              <span className="text-[var(--color-text-muted)]" aria-hidden="true">·</span>
              {verified ? (
                <span className="inline-flex items-center gap-1 text-[var(--color-gold)]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Đã kiểm chứng nguồn
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] font-normal">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Đang bổ sung nguồn tham khảo
                </span>
              )}
            </div>

            <h1 className="mt-2.5 font-display lib-scale-h1 font-semibold tracking-tight text-[var(--color-text)] break-words">
              {doc.title}
            </h1>

            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">{doc.author}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.source}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{doc.publishedDate}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{readingMinutes} phút đọc</span>
              {doc.wordCount ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{doc.wordCount} chữ</span>
                </>
              ) : null}
              {doc.reviewNote && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{doc.reviewNote}</span>
                </>
              )}
            </div>

            <p className="mt-4 font-reading lib-scale-lead text-[var(--color-text-muted)]">
              {doc.subtitle}
            </p>

            {/* Quick Action Strip: Toulmin Highlighter Toggle */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setToulminMode((prev) => !prev)}
                  aria-pressed={toulminMode}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                    toulminMode
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  {toulminMode ? 'Đang bật chế độ Soi lập luận' : 'Soi lập luận (Toulmin)'}
                </button>
                <span className="text-[var(--color-text-muted)]">
                  Gắn nhãn Luận điểm · Căn cứ · Lí lẽ · Từ giới hạn · Phản bác
                </span>
              </div>
              {toulminMode && (
                <button
                  type="button"
                  onClick={() => {
                    setToulminAssignments({});
                    setToulminCompare(null);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Xóa nhãn
                </button>
              )}
            </div>

            {toulminMode && (
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)] mr-1">
                  Vai trò đang chọn:
                </span>
                {TOULMIN_ROLES.map((role) => {
                  const active = activeToulminRole === role.key;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setActiveToulminRole(role.key)}
                      title={role.shortDesc}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-[var(--color-text)] font-semibold'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: role.colorVar }}
                      />
                      <span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)]">
              <HybridMediaCard
                src={doc.coverImage}
                alt={doc.coverAlt}
                title={doc.title}
                aspect="16/9"
              />
            </div>
          </header>

          {/* Structured Reading Blocks */}
          <div className="mt-8">{doc.blocks.map((block, idx) => renderBlock(block, idx))}</div>

          {/* Standalone Stance Box if document has no question block */}
          {!doc.blocks.some((b) => b.type === 'question') && (
            <section className="my-8 rounded-2xl p-5 sm:p-6 border border-[var(--color-border-strong)]/60 surface-subtle space-y-3">
              <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
                Viết lập trường của bạn
              </h2>
              {renderStancePracticeBox('standalone')}
            </section>
          )}

          {/* Inline 3-Question Glossary Quick Quiz */}
          {quickQuiz.length > 0 && (
            <section
              aria-labelledby="quick-quiz-heading"
              className="my-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  <h2
                    id="quick-quiz-heading"
                    className="font-display text-lg font-semibold text-[var(--color-text)]"
                  >
                    Kiểm tra nhanh thuật ngữ trong bài ({quickQuiz.length} câu)
                  </h2>
                </div>
                {Object.keys(quizAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuizAnswers({})}
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    Làm lại
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {quickQuiz.map((qItem, qIdx) => {
                  const chosenIdx = quizAnswers[qIdx];
                  const answered = chosenIdx !== undefined;
                  const isCorrect = answered && chosenIdx === qItem.correctIndex;
                  return (
                    <div
                      key={qItem.term}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 space-y-2.5"
                    >
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        <span className="font-mono-num text-[var(--color-primary)] mr-1.5">
                          Câu {qIdx + 1}:
                        </span>
                        {qItem.question}
                      </p>
                      <div className="space-y-1.5">
                        {qItem.options.map((optText, oIdx) => {
                          const selected = chosenIdx === oIdx;
                          const rightOpt = oIdx === qItem.correctIndex;
                          let cls =
                            'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50';
                          if (answered && rightOpt) {
                            cls =
                              'border-emerald-500/60 bg-emerald-500/10 text-[var(--color-text)] font-medium';
                          } else if (answered && selected && !rightOpt) {
                            cls =
                              'border-[var(--color-danger)]/60 bg-[var(--color-danger)]/10 text-[var(--color-text)]';
                          }
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                              }
                              className={`w-full text-left rounded-lg border px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed transition-colors cursor-pointer ${cls}`}
                            >
                              {optText}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <p
                          className={`text-xs font-medium ${
                            isCorrect
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-[var(--color-gold)]'
                          }`}
                        >
                          {isCorrect
                            ? 'Chính xác — bạn đã nắm đúng lõi khái niệm này.'
                            : `Chưa đúng — định nghĩa chính xác là lựa chọn thứ ${qItem.correctIndex + 1}.`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Mark Completed & Active Journey Step Navigation */}
          <section className="my-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)]">
                  Hoàn tất lượt đọc này?
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Lưu tiến độ vào Tổng quan thư phòng để theo dõi lộ trình của bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleCompleted}
                aria-pressed={isCompleted}
                className={
                  isCompleted
                    ? 'btn-primary !min-h-10 !px-4 !text-xs'
                    : 'btn-secondary !min-h-10 !px-4 !text-xs'
                }
              >
                <CheckCheck className="h-4 w-4" />
                {isCompleted ? 'Đã đọc xong' : 'Đánh dấu đã đọc xong'}
              </button>
            </div>

            {activeJourney && journeyPosition && (
              <div className="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-[var(--color-primary)]">
                    Hành trình: {activeJourney.title}
                  </span>
                  <span className="ml-2 font-mono-num text-[var(--color-text-muted)]">
                    (Bài {journeyPosition.index + 1}/{journeyPosition.total})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {journeyPosition.prevDoc && (
                    <Link
                      to={`/library/${journeyPosition.prevDoc.id}`}
                      className="btn-secondary !min-h-8 !px-3 !text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Bài trước
                    </Link>
                  )}
                  {journeyPosition.nextDoc && (
                    <Link
                      to={`/library/${journeyPosition.nextDoc.id}`}
                      className="btn-primary !min-h-8 !px-3 !text-xs"
                    >
                      Bài tiếp
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Verified References Section */}
          {doc.references && doc.references.length > 0 && (
            <section
              aria-labelledby="references-heading"
              className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                <h2
                  id="references-heading"
                  className="font-display text-lg font-semibold text-[var(--color-text)]"
                >
                  Nguồn tham khảo & Tác phẩm gốc
                </h2>
                {verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-gold)]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Đã đối chiếu ({doc.references.filter((r) => r.verified).length} nguồn)
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Đang bổ sung thêm nguồn đối chiếu
                  </span>
                )}
              </div>
              <ol className="mt-4 space-y-3 lib-scale-small font-reading text-[var(--color-text-muted)] list-decimal pl-5">
                {doc.references.map((ref) => (
                  <li key={ref.id} className="leading-relaxed">
                    {ref.author && (
                      <span className="font-semibold text-[var(--color-text)]">{ref.author}. </span>
                    )}
                    <span className="italic text-[var(--color-text)]">{ref.title}</span>
                    {ref.publisher && <span>. {ref.publisher}</span>}
                    {ref.publicationYear && <span> ({ref.publicationYear})</span>}.
                    {ref.url && isSafeHttpUrl(ref.url) && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Liên kết <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <ChapterDividerSvg />

          {/* End-of-article 5-Action Bridge to Thinking Lab */}
          <section className="rounded-2xl p-5 sm:p-7 surface-card space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>Chuyển hóa tri thức thành tư duy</span>
              </div>
              <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-semibold text-[var(--color-text)]">
                Khám phá sâu hơn cùng Thinking Lab
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-text-muted)]">
                Chọn một cách tiếp cận bên dưới — đoạn trích và ngữ cảnh tài liệu sẽ được điền sẵn
                vào khung soạn thảo để bạn chỉnh sửa trước khi gửi.
              </p>
            </div>

            <LibraryToLabActionsMenu
              onSelectAction={(option) =>
                handleLabActionSelect(option, doc.excerpt, {
                  blockLabel: 'Tổng quan bài đọc',
                  sectionId: activeSectionId,
                  sectionTitle: activeSectionTitle,
                })
              }
            />
          </section>

          {/* Rating, Comments & Content Reporting Section */}
          <DocumentFeedbackSection
            documentId={doc.id}
            onOpenReport={() => setReportModalOpen(true)}
          />
        </article>

        {/* Column 3: Right Concepts, Related Docs & Margin Notes */}
        {!focusMode && (
          <aside
            aria-label="Thuật ngữ, tài liệu liên quan và ghi chú"
            className="hidden xl:block xl:col-span-3 sticky top-20 rounded-2xl p-5 surface-card max-h-[calc(100vh-6rem)] overflow-y-auto"
          >
            {renderRightSidebarContent()}
          </aside>
        )}
      </div>

      {/* Laptop 1024px–1279px Slide-over Right Drawer */}
      <AnimatePresence>
        {slideOverToolsOpen && !focusMode && (
          <div
            className="fixed inset-0 z-50 hidden lg:block xl:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Thuật ngữ, tài liệu liên quan và ghi chú"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSlideOverToolsOpen(false)}
              className="fixed inset-0 bg-black/35 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-10 w-[360px] bg-[var(--color-surface)] border-l border-[var(--color-border)] p-5 overflow-y-auto"
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
                <h2 className="font-display text-base font-semibold">Thuật ngữ & Ghi chú</h2>
                <button
                  type="button"
                  onClick={() => setSlideOverToolsOpen(false)}
                  aria-label="Đóng bảng phụ"
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--color-surface-muted)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderRightSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile / Tablet Bottom Sheet for TOC & Tools */}
      <AnimatePresence>
        {mobileSheet !== 'none' && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSheet('none')}
              className="fixed inset-0 bg-black/45"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-10 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 safe-pb"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
                <h2 className="font-display text-base font-semibold">
                  {mobileSheet === 'toc' ? 'Mục lục bài đọc' : 'Thuật ngữ, Liên quan & Ghi chú'}
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileSheet('none')}
                  aria-label="Đóng bảng phụ"
                  className="flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {mobileSheet === 'toc' ? (
                <nav className="space-y-1.5">
                  {tocItems.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={() => setMobileSheet('none')}
                      className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-[var(--color-surface-muted)]"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              ) : (
                renderRightSidebarContent()
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Concept Tooltip Dialog */}
      <ConceptPopoverDialog
        concept={activeConcept}
        onClose={() => setActiveConcept(null)}
        onSelectConcept={(concept) => setActiveConcept(concept)}
        activeDocument={doc}
        allPublishedDocuments={publishedDocuments}
      />

      {/* Content Report Modal */}
      <DocumentReportModal
        open={reportModalOpen}
        documentId={doc.id}
        documentTitle={doc.title}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
