import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  GripHorizontal,
  Loader2,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type DictionaryEntry,
  explainTermQuickly,
  getSuggestedDictionaryTerms,
} from '../../lib/dictionary';
import { Link } from '../../lib/router';

interface QuickExplainEventDetail {
  term: string;
  contextSnippet?: string;
  articleTitle?: string;
  forceAI?: boolean;
}

interface SelectionBubbleState {
  text: string;
  contextSnippet: string;
  articleTitle?: string;
  x: number;
  y: number;
}

interface DictionaryHistoryItem {
  id: string;
  query: string;
  contextSnippet?: string;
  articleTitle?: string;
  entry?: DictionaryEntry | null;
  errorMessage?: string;
  quotaExhausted?: boolean;
  loading?: boolean;
}

export const QUICK_EXPLAIN_EVENT = 'machngon:quick-explain';

export function dispatchQuickExplain(
  term: string,
  contextSnippet?: string,
  articleTitle?: string,
  forceAI?: boolean
) {
  window.dispatchEvent(
    new CustomEvent<QuickExplainEventDetail>(QUICK_EXPLAIN_EVENT, {
      detail: { term, contextSnippet, articleTitle, forceAI },
    })
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[data-quick-dictionary-root="true"]'));
}

export function QuickDictionarySuite() {
  const [open, setOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [history, setHistory] = useState<DictionaryHistoryItem[]>([]);
  const [selectionBubble, setSelectionBubble] = useState<SelectionBubbleState | null>(null);

  // Draggable offset relative to bottom-right anchor (clamped to viewport)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestedTerms = getSuggestedDictionaryTerms().slice(0, 4);

  const runLookup = useCallback(
    async (
      rawTerm: string,
      options?: { contextSnippet?: string; articleTitle?: string; forceAI?: boolean }
    ) => {
      const cleanTerm = rawTerm.replace(/\s+/g, ' ').trim();
      if (cleanTerm.length < 2) return;

      const itemId = `dict_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      setOpen(true);
      setSelectionBubble(null);
      setHistory((prev) => [
        ...prev.slice(-11),
        {
          id: itemId,
          query: cleanTerm,
          contextSnippet: options?.contextSnippet,
          articleTitle: options?.articleTitle,
          loading: true,
        },
      ]);

      const result = await explainTermQuickly(cleanTerm, {
        contextSnippet: options?.contextSnippet,
        articleTitle: options?.articleTitle,
        forceAI: options?.forceAI,
      });

      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                loading: false,
                entry: result.entry,
                errorMessage: result.errorMessage,
                quotaExhausted: result.quotaExhausted,
              }
            : item
        )
      );

      window.setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 60);
    },
    []
  );

  // Listen for programmatic quick-explain requests (e.g., from DocumentDetailPage / ConceptTooltip)
  useEffect(() => {
    const onCustomExplain = (event: Event) => {
      const custom = event as CustomEvent<QuickExplainEventDetail>;
      if (custom.detail?.term) {
        void runLookup(custom.detail.term, {
          contextSnippet: custom.detail.contextSnippet,
          articleTitle: custom.detail.articleTitle,
          forceAI: custom.detail.forceAI,
        });
      }
    };
    window.addEventListener(QUICK_EXPLAIN_EVENT, onCustomExplain);
    return () => window.removeEventListener(QUICK_EXPLAIN_EVENT, onCustomExplain);
  }, [runLookup]);

  // Global text selection listener supporting short 1–2 word phrases (>= 2 chars)
  useEffect(() => {
    const inspectSelection = (ev: MouseEvent | TouchEvent) => {
      if (isEditableTarget(ev.target)) return;

      window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setSelectionBubble(null);
          return;
        }

        const anchorNode = sel.anchorNode;
        const anchorEl =
          anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement ?? null;
        if (anchorEl && isEditableTarget(anchorEl)) {
          setSelectionBubble(null);
          return;
        }

        const text = sel.toString().replace(/\s+/g, ' ').trim();
        if (text.length < 2 || text.length > 160) {
          setSelectionBubble(null);
          return;
        }

        // Coordinate with DocumentDetailPage desktop popover (>= 15 chars inside article host)
        // so we never stack two floating popovers on top of each other.
        const insideArticleHost = Boolean(
          anchorEl?.closest('[data-article-selection-host="true"]')
        );
        if (insideArticleHost && window.innerWidth >= 1024 && text.length >= 15) {
          setSelectionBubble(null);
          return;
        }

        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            setSelectionBubble(null);
            return;
          }

          const blockHost = anchorEl?.closest('p, li, blockquote, section, article') ?? anchorEl;
          const containerText = blockHost?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          const articleHost = anchorEl?.closest('[data-article-selection-host="true"]');
          const articleTitle =
            articleHost?.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
          const x = Math.max(90, Math.min(window.innerWidth - 90, rect.left + rect.width / 2));
          const y = Math.max(58, rect.top - 10);

          setSelectionBubble({
            text,
            contextSnippet: containerText.slice(0, 320),
            articleTitle,
            x,
            y,
          });
        } catch {
          setSelectionBubble(null);
        }
      }, 20);
    };

    const handleScrollOrKey = () => {
      setSelectionBubble(null);
    };

    document.addEventListener('mouseup', inspectSelection);
    document.addEventListener('touchend', inspectSelection);
    window.addEventListener('scroll', handleScrollOrKey, true);
    return () => {
      document.removeEventListener('mouseup', inspectSelection);
      document.removeEventListener('touchend', inspectSelection);
      window.removeEventListener('scroll', handleScrollOrKey, true);
    };
  }, []);

  // Clamp offset inside viewport on window resize
  useEffect(() => {
    const clampOffset = () => {
      const maxLeft = -(window.innerWidth - 96);
      const maxUp = -(window.innerHeight - 120);
      setOffset((prev) => ({
        x: Math.max(maxLeft, Math.min(0, prev.x)),
        y: Math.max(maxUp, Math.min(0, prev.y)),
      }));
    };
    window.addEventListener('resize', clampOffset);
    return () => window.removeEventListener('resize', clampOffset);
  }, []);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Allow clicking buttons inside header without starting drag
    if ((e.target as HTMLElement).closest('button[data-no-drag="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      state.moved = true;
    }

    const panelW = widgetRef.current?.offsetWidth ?? 340;
    const panelH = widgetRef.current?.offsetHeight ?? 440;
    const minX = -(window.innerWidth - Math.min(panelW, window.innerWidth - 24) - 20);
    const minY = -(window.innerHeight - Math.min(panelH, window.innerHeight - 24) - 24);

    setOffset({
      x: Math.max(minX, Math.min(0, state.originX + dx)),
      y: Math.max(minY, Math.min(0, state.originY + dy)),
    });
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release errors
    }
    const wasClick = !state.moved;
    dragStateRef.current = null;
    setIsDragging(false);

    if (wasClick && !open) {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = queryInput.trim();
    if (trimmed.length < 2) return;
    setQueryInput('');
    void runLookup(trimmed);
  };

  return (
    <>
      {/* Quick Explain Floating Trigger for Highlighted Text (works for 1–2 word phrases too) */}
      <AnimatePresence>
        {selectionBubble && (
          <motion.div
            data-testid="quick-explain-selection-btn"
            data-quick-dictionary-root="true"
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              left: `${selectionBubble.x}px`,
              top: `${selectionBubble.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 60,
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent clearing text selection before click runs
                e.preventDefault();
              }}
              onClick={() => {
                const { text, contextSnippet, articleTitle } = selectionBubble;
                window.getSelection()?.removeAllRanges();
                void runLookup(text, { contextSnippet, articleTitle });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] shadow-md hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Giải thích nghĩa</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable Floating Mini-Chatbot Anchor */}
      <div
        ref={widgetRef}
        data-quick-dictionary-root="true"
        data-testid="floating-dictionary-widget"
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '76px',
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          zIndex: 55,
          touchAction: 'none',
        }}
        className="lg:!bottom-5"
      >
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.div
              key="launcher"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.16 }}
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              role="button"
              tabIndex={0}
              aria-label="Mở Từ điển tra nhanh (kéo để di chuyển)"
              title="Bấm để mở Từ điển tra nhanh · Kéo để di chuyển vị trí"
              data-testid="dictionary-launcher-btn"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen(true);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] select-none transition-colors hover:border-[var(--color-primary)] ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span className="whitespace-nowrap">Tra từ nhanh</span>
            </motion.div>
          ) : (
            <motion.section
              key="panel"
              aria-label="Trợ lý tra từ vựng khó"
              data-testid="dictionary-panel"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-[332px] max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden"
              style={{ boxShadow: 'var(--shadow-float)' }}
            >
              {/* Draggable Header Bar */}
              <div
                data-testid="dictionary-drag-handle"
                onPointerDown={handleDragPointerDown}
                onPointerMove={handleDragPointerMove}
                onPointerUp={handleDragPointerUp}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/75 select-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GripHorizontal className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                      Từ điển tra nhanh
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                      Kéo thanh này để di chuyển · Bôi đen từ bất kỳ
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-no-drag="true"
                  onClick={() => setOpen(false)}
                  aria-label="Thu gọn từ điển nhanh"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Conversation / Lookup Feed */}
              <div className="h-[270px] overflow-y-auto px-3.5 py-3 space-y-3 text-xs">
                {history.length === 0 ? (
                  <div className="space-y-3 py-1">
                    <p className="leading-relaxed text-[var(--color-text-muted)]">
                      Nhập từ vựng khó hoặc <strong className="text-[var(--color-text)]">bôi đen 1–2 từ</strong> bất kỳ trên trang để xem định nghĩa súc tích và ví dụ.
                    </p>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                        Thử tra nhanh:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedTerms.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => void runLookup(term)}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex justify-end">
                        <span className="inline-block rounded-xl rounded-br-sm border border-[var(--color-primary)]/25 bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface)_90%)] px-2.5 py-1.5 font-medium text-[var(--color-text)]">
                          {item.query}
                        </span>
                      </div>

                      {item.loading ? (
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3 py-2 text-[var(--color-text-muted)]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                          <span>Đang tra nghĩa…</span>
                        </div>
                      ) : item.entry ? (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/65 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-[13px] font-bold text-[var(--color-text)]">
                              {item.entry.term}
                              {item.entry.englishTerm ? (
                                <span className="ml-1 font-sans text-[11px] font-normal text-[var(--color-text-muted)]">
                                  ({item.entry.englishTerm})
                                </span>
                              ) : null}
                            </span>
                            <span className="text-[10px] font-medium text-[var(--color-primary)] shrink-0">
                              {item.entry.source === 'local-glossary' ? 'Kho từ điển' : 'AI Library'}
                            </span>
                          </div>
                          <p className="font-reading text-[12.5px] leading-relaxed text-[var(--color-text)]">
                            <strong className="font-sans text-[11px] text-[var(--color-primary)]">
                              1. Định nghĩa cốt lõi:{' '}
                            </strong>
                            {item.entry.definition}
                          </p>
                          {item.entry.contextMeaning && (
                            <p className="text-[11.5px] leading-relaxed text-[var(--color-text)] pt-1 border-t border-[var(--color-border)]/70">
                              <strong className="text-[var(--color-gold)]">
                                2. Trong ngữ cảnh câu văn:{' '}
                              </strong>
                              {item.entry.contextMeaning}
                            </p>
                          )}
                          {item.entry.example && (
                            <p className="text-[11.5px] leading-relaxed text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]/70">
                              <strong className="text-[var(--color-text)]">
                                {item.entry.contextMeaning ? '3. Ví dụ:' : 'Ví dụ:'}
                              </strong>{' '}
                              {item.entry.example}
                            </p>
                          )}
                          {item.entry.sources && item.entry.sources.length > 0 && (
                            <div
                              data-testid="dictionary-sources-list"
                              className="pt-1.5 border-t border-[var(--color-border)]/70 space-y-1"
                            >
                              <div className="text-[10.5px] font-semibold text-[var(--color-text-muted)]">
                                Nguồn tham khảo:
                              </div>
                              <ul className="space-y-1">
                                {item.entry.sources
                                  .filter((src) => {
                                    try {
                                      const parsed = new URL(src.uri || src.url || '');
                                      return (
                                        parsed.protocol === 'http:' || parsed.protocol === 'https:'
                                      );
                                    } catch {
                                      return false;
                                    }
                                  })
                                  .map((src, idx) => (
                                    <li key={src.uri || src.url || idx} className="min-w-0">
                                      <a
                                        href={src.uri || src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 max-w-full text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                                      >
                                        <span className="truncate">{src.title}</span>
                                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                      </a>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                          {item.entry.source === 'local-glossary' && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void runLookup(item.query, {
                                    contextSnippet: item.contextSnippet,
                                    articleTitle: item.articleTitle,
                                    forceAI: true,
                                  })
                                }
                                className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                              >
                                Giải thích sâu hơn theo ngữ cảnh bằng AI
                              </button>
                            </div>
                          )}
                          {item.quotaExhausted && (
                            <div
                              className="rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--color-text)] space-y-1"
                              style={{
                                backgroundColor: 'var(--color-warn-bg)',
                                borderColor: 'var(--color-warn-border)',
                              }}
                            >
                              <p>
                                {item.errorMessage ||
                                  'Hết hạn mức gọi AI hiện tại — đang hiển thị giải thích cục bộ.'}
                              </p>
                              <Link
                                to="/profile#ai-settings"
                                onClick={() => setOpen(false)}
                                className="inline-block font-semibold text-[var(--color-primary)] hover:underline"
                              >
                                Mở Cấu hình AI →
                              </Link>
                            </div>
                          )}
                          {!item.quotaExhausted && item.errorMessage && (
                            <p className="text-[11px] text-[var(--color-gold)]">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          className="rounded-xl border p-2.5 text-[11.5px] leading-relaxed text-[var(--color-text)] space-y-1.5"
                          style={{
                            backgroundColor: 'var(--color-warn-bg)',
                            borderColor: 'var(--color-warn-border)',
                          }}
                        >
                          <p>{item.errorMessage || 'Không tìm thấy giải thích cho từ này.'}</p>
                          {item.quotaExhausted && (
                            <Link
                              to="/profile#ai-settings"
                              onClick={() => setOpen(false)}
                              className="inline-block font-semibold text-[var(--color-primary)] hover:underline"
                            >
                              Đổi model / Kiểm tra kết nối AI →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={listEndRef} />
              </div>

              {/* Input Bar */}
              <form
                onSubmit={handleFormSubmit}
                className="flex items-center gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-2.5"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Nhập từ vựng cần giải thích…"
                    aria-label="Nhập từ vựng cần giải thích"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] pl-8 pr-2.5 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/75 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={queryInput.trim().length < 2}
                  aria-label="Tra nghĩa"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] disabled:opacity-45 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
