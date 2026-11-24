import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  CornerDownRight,
  ExternalLink,
  Flag,
  Globe,
  Map as MapIcon,
  Quote,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getEvidenceStatusLabel } from '../../lib/ai/sessionReport';
import { LabMessage } from '../../lib/types';
import { DebateStepperAccordion } from './DebateStepper5';

interface ThreeLayerResponseCardProps {
  message: LabMessage;
  onQuoteToComposer: (text: string) => void;
  /** Enable smooth typing/streaming reveal effect for newly received AI messages */
  animateTyping?: boolean;
  /** Callback to speak or stop speaking this AI message via Vietnamese TTS */
  onSpeakMessage?: (textToSpeak: string, messageId: string) => void;
  /** Whether this specific message is currently being spoken aloud */
  isSpeaking?: boolean;
  /** Optional callback to flag inaccurate AI responses */
  onFlagMessage?: (message: LabMessage, note: string) => void;
}

/**
 * Renders inline **bold**, *italic*, and `code` Markdown cleanly via React nodes (zero raw HTML).
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--color-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded px-1.5 py-0.5 text-[0.88em] bg-[var(--color-surface-muted)] text-[var(--color-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function ConversationalMarkdown({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const blocks = useMemo(() => {
    const rawLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsed: Array<{ type: 'list'; items: string[] } | { type: 'paragraph'; text: string }> =
      [];

    for (const line of rawLines) {
      const bulletMatch = line.match(/^(?:[-•*]|\d+[.)])\s+(.+)$/);
      if (bulletMatch) {
        const prev = parsed[parsed.length - 1];
        if (prev && prev.type === 'list') {
          prev.items.push(bulletMatch[1].trim());
        } else {
          parsed.push({ type: 'list', items: [bulletMatch[1].trim()] });
        }
      } else {
        parsed.push({ type: 'paragraph', text: line });
      }
    }

    return parsed;
  }, [text]);

  if (blocks.length === 0) return null;

  return (
    <div
      className={`space-y-3 font-reading text-[0.98rem] sm:text-[1.03rem] leading-[1.78] text-[var(--color-text)] ${className}`}
    >
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="space-y-2 pl-5 list-disc marker:text-[var(--color-primary)]">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-0.5">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}

function resolveOpeningText(message: LabMessage): string {
  const layers = message.threeLayer;
  if (!layers) return message.content;
  if (layers.tldr && layers.tldr.trim().length > 0) {
    return layers.tldr.trim();
  }
  if (message.content && message.content.trim().length >= 24) {
    return message.content.trim();
  }
  return '';
}

function isThinkingTraceMap(text: string): boolean {
  return (
    text.includes('Khái niệm ban đầu của bạn') ||
    text.includes('Lập trường & Luận điểm chính') ||
    text.includes('Bản đồ truy vết tư duy')
  );
}

function getSafeExternalSourceUrl(rawUrl?: string): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function ThreeLayerResponseCard({
  message,
  onQuoteToComposer,
  animateTyping = false,
  onSpeakMessage,
  isSpeaking = false,
  onFlagMessage,
}: ThreeLayerResponseCardProps) {
  const layers = message.threeLayer;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [flagged, setFlagged] = useState(false);

  const openingText = useMemo(() => resolveOpeningText(message), [message]);
  const fullBodyText = useMemo(() => {
    if (!layers) return message.content;
    return [openingText, layers.interpretation].filter((s) => s && s.trim().length > 0).join('\n\n');
  }, [layers, message.content, openingText]);

  const fullSpeechText = useMemo(() => {
    if (!layers) return message.content;
    return [openingText, layers.interpretation, layers.guidingQuestion]
      .filter((s) => s && s.trim().length > 0)
      .join('. ');
  }, [layers, message.content, openingText]);

  const isMapCard = useMemo(
    () =>
      Boolean(
        layers &&
          (isThinkingTraceMap(openingText) || isThinkingTraceMap(layers.interpretation))
      ),
    [layers, openingText]
  );

  const [revealedCount, setRevealedCount] = useState<number>(() =>
    animateTyping ? 0 : fullBodyText.length
  );

  useEffect(() => {
    if (!animateTyping) {
      setRevealedCount(fullBodyText.length);
      return;
    }

    setRevealedCount(0);
    const total = fullBodyText.length;
    if (total === 0) return;

    const stepSize = Math.max(4, Math.ceil(total / 34));
    const timer = window.setInterval(() => {
      setRevealedCount((prev) => {
        if (prev + stepSize >= total) {
          window.clearInterval(timer);
          return total;
        }
        return prev + stepSize;
      });
    }, 18);

    return () => window.clearInterval(timer);
  }, [animateTyping, fullBodyText, message.id]);

  const isStreaming = revealedCount < fullBodyText.length;
  const visibleBodyText = isStreaming ? fullBodyText.slice(0, revealedCount) : fullBodyText;

  const hasBalancedCritique = Boolean(
    layers &&
      ((layers.positivePoints && layers.positivePoints.length > 0) ||
        (layers.negativePoints && layers.negativePoints.length > 0))
  );

  const hasDetailsDrawer = Boolean(
    (layers && (layers.assumptions.trim().length > 0 || layers.facts.trim().length > 0)) ||
      (message.debateSteps && message.debateSteps.length > 0)
  );

  const validSources = useMemo(() => {
    if (!Array.isArray(message.sources) || message.sources.length === 0) return [];
    const seen = new Set<string>();
    const list: Array<{ title: string; url: string; domain: string }> = [];
    for (const src of message.sources) {
      const safeUrl = getSafeExternalSourceUrl(src?.uri || src?.url);
      if (!safeUrl || seen.has(safeUrl)) continue;
      seen.add(safeUrl);
      let domain = safeUrl;
      try {
        domain = new URL(safeUrl).hostname.replace(/^www\./, '');
      } catch {
        // Keep safeUrl
      }
      list.push({
        title: (src?.title || '').trim() || domain,
        url: safeUrl,
        domain,
      });
    }
    return list;
  }, [message.sources]);

  return (
    <article
      data-testid="three-layer-card"
      className="group flex items-start gap-3 sm:gap-3.5"
    >
      {/* Minimalist Mentor Avatar */}
      <div
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] mt-0.5 shadow-2xs"
      >
        <Sparkles className="h-4 w-4" />
      </div>

      {/* Main Conversational Bubble */}
      <div className="flex-1 min-w-0 space-y-3.5">
        {/* Quiet Top Row: Name + Turn Ref + Local Fallback honesty tag + Speaker + Quote */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-text)]">Trợ lý Mạch Ngôn</span>
            {message.turnRef && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-[11px] font-medium text-[var(--color-primary)]">
                  {message.turnRef}
                </span>
              </>
            )}
            {message.sourceEngine === 'local-fallback' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] font-medium text-[var(--color-gold)]">
                  Chế độ phân tích cục bộ
                </span>
              </>
            )}
            {isMapCard && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)]">
                  <MapIcon className="h-3 w-3" />
                  Bản đồ tư duy
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onSpeakMessage && (
              <button
                type="button"
                onClick={() => onSpeakMessage(fullSpeechText, message.id)}
                aria-label={isSpeaking ? 'Dừng đọc tin nhắn' : 'Nghe phản hồi bằng giọng nói'}
                title={isSpeaking ? 'Dừng đọc' : 'Nghe lại tin nhắn này'}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface)_86%)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span className="hidden sm:inline text-[11px]">Dừng</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-[11px]">Nghe</span>
                  </>
                )}
              </button>
            )}

            {message.turnRef && (
              <button
                type="button"
                onClick={() =>
                  onQuoteToComposer(
                    `Về ý ở lượt ${message.turnRef}, mình muốn trao đổi thêm: `
                  )
                }
                aria-label={`Đối chiếu lượt ${message.turnRef}`}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Quote className="h-3 w-3" />
                <span className="hidden sm:inline">Đối chiếu</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Dialogue Body */}
        <div
          onClick={() => {
            if (isStreaming) setRevealedCount(fullBodyText.length);
          }}
          className={isStreaming ? 'cursor-pointer' : undefined}
        >
          {isMapCard && !isStreaming ? (
            <div className="space-y-3">
              {openingText && <ConversationalMarkdown text={openingText} />}
              {layers?.interpretation && (
                <section
                  aria-label="Bản đồ truy vết tư duy"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-2.5"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                    <MapIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Bản đồ truy vết tư duy</span>
                  </div>
                  <ConversationalMarkdown text={layers.interpretation} />
                </section>
              )}
            </div>
          ) : (
            <div className="relative">
              <ConversationalMarkdown text={visibleBodyText} />
              {isStreaming && (
                <span
                  aria-hidden="true"
                  className="inline-block ml-1 h-4 w-1.5 align-middle rounded-full bg-[var(--color-primary)] animate-pulse"
                />
              )}
            </div>
          )}
        </div>

        {/* Balanced Critique Grid: Góp ý tích cực (Điểm mạnh) & Phản biện / Góp ý tiêu cực (Điểm hở) */}
        {hasBalancedCritique && !isStreaming && layers && (
          <div
            data-testid="balanced-critique-box"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {layers.positivePoints && layers.positivePoints.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Góp ý tích cực (Điểm mạnh)</span>
                </div>
                <ul className="space-y-1 text-xs sm:text-[13px] leading-relaxed text-[var(--color-text)] list-disc pl-4">
                  {layers.positivePoints.map((pt, idx) => (
                    <li key={idx}>{renderInlineMarkdown(pt)}</li>
                  ))}
                </ul>
              </div>
            )}

            {layers.negativePoints && layers.negativePoints.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-gold)]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Phản biện / Góp ý tiêu cực (Điểm hở)</span>
                </div>
                <ul className="space-y-1 text-xs sm:text-[13px] leading-relaxed text-[var(--color-text)] list-disc pl-4">
                  {layers.negativePoints.map((pt, idx) => (
                    <li key={idx}>{renderInlineMarkdown(pt)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Evidence & Source Verification Block */}
        {layers?.evidenceCheck && !isStreaming && (
          <div
            data-testid="evidence-verification-box"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/65 px-3.5 py-3 space-y-2 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                {layers.evidenceCheck.status === 'verified' ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-gold)] shrink-0" />
                )}
                Kiểm chứng dẫn chứng &amp; nguồn
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  layers.evidenceCheck.status === 'verified'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[var(--color-gold)]'
                }`}
              >
                {getEvidenceStatusLabel(layers.evidenceCheck.status)}
              </span>
            </div>

            {layers.evidenceCheck.groundedClaims.length > 0 && (
              <p className="text-[12px] leading-relaxed text-[var(--color-text)]">
                <strong className="text-emerald-700 dark:text-emerald-400">Có căn cứ: </strong>
                {layers.evidenceCheck.groundedClaims.join(' · ')}
              </p>
            )}

            {layers.evidenceCheck.unverifiedClaims.length > 0 && (
              <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">Chưa có nguồn xác thực: </strong>
                {layers.evidenceCheck.unverifiedClaims.join(' · ')}
              </p>
            )}

            {layers.evidenceCheck.warning && (
              <p
                className="rounded-lg border px-2.5 py-1.5 text-[11.5px] leading-relaxed text-[var(--color-text)]"
                style={{
                  backgroundColor: 'var(--color-warn-bg)',
                  borderColor: 'var(--color-warn-border)',
                }}
              >
                {layers.evidenceCheck.warning}
              </p>
            )}
          </div>
        )}

        {/* Highlighted Editorial Callout for the ONE Socratic Closing Question */}
        {layers?.guidingQuestion && !isStreaming && (
          <motion.blockquote
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Câu hỏi Socrates chốt hạ"
            className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border)_70%)] px-4 py-3.5 sm:px-5 sm:py-4 space-y-2.5"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-primary) 7%, var(--color-surface) 93%)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-[var(--color-primary)]">
                Câu hỏi Socrates trọng tâm
              </span>
              {onSpeakMessage && (
                <button
                  type="button"
                  onClick={() => onSpeakMessage(layers.guidingQuestion, `${message.id}_q`)}
                  aria-label="Nghe câu hỏi gợi mở"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Đọc câu hỏi</span>
                </button>
              )}
            </div>

            <p className="font-reading text-[1.02rem] sm:text-[1.07rem] font-semibold leading-[1.68] text-[var(--color-text)]">
              {renderInlineMarkdown(layers.guidingQuestion)}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {layers.questionHint ? (
                <p className="text-xs leading-[1.55] text-[var(--color-text-muted)]">
                  {layers.questionHint}
                </p>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() =>
                  onQuoteToComposer(
                    `Trả lời câu hỏi ở ${message.turnRef || 'lượt trên'}: Theo mình, `
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap cursor-pointer"
              >
                <CornerDownRight className="h-3 w-3" />
                Trả lời ngay
              </button>
            </div>
          </motion.blockquote>
        )}

        {/* Grounding Sources List (from /api/v2-ask Google Search) */}
        {!isStreaming && validSources.length > 0 && (
          <section
            data-testid="ai-sources-list"
            aria-label="Nguồn tham khảo từ Google Search"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-3.5 py-3 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text)]">
                <Globe className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                <span>Nguồn tham khảo ({validSources.length})</span>
              </span>
              <span className="text-[10.5px] font-medium text-[var(--color-text-muted)]">
                Google Search
              </span>
            </div>

            <ul className="space-y-1.5">
              {validSources.map((source, idx) => (
                <li key={source.url} className="min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.url}
                    className="group/link flex items-center justify-between gap-2 rounded-lg border border-transparent bg-[var(--color-surface)]/80 px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-num text-[11px] font-semibold text-[var(--color-primary)] shrink-0">
                        [{idx + 1}]
                      </span>
                      <span className="font-medium text-[var(--color-text)] group-hover/link:text-[var(--color-primary)] truncate">
                        {source.title}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] shrink-0">
                      <span className="hidden sm:inline max-w-[140px] truncate">
                        {source.domain}
                      </span>
                      <ExternalLink className="h-3 w-3 group-hover/link:text-[var(--color-primary)] shrink-0" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Subtle Footer Row: Progressive Disclosure + Flag Inaccurate AI Answer */}
        {!isStreaming && (hasDetailsDrawer || onFlagMessage) && (
          <div className="pt-0.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {hasDetailsDrawer ? (
                <button
                  type="button"
                  onClick={() => setDetailsOpen((prev) => !prev)}
                  aria-expanded={detailsOpen}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {detailsOpen
                      ? 'Ẩn phân tích căn cứ & 5 bước'
                      : 'Soi căn cứ, giả định ngầm & 5 bước'}
                  </span>
                  {detailsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span />
              )}

              {onFlagMessage && (
                <button
                  type="button"
                  disabled={flagged}
                  data-testid="flag-ai-response-btn"
                  onClick={() => setFlagOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-gold)] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Flag className="h-3 w-3 shrink-0" />
                  <span>{flagged ? 'Đã ghi nhận góp ý' : 'Báo câu trả lời chưa đúng'}</span>
                </button>
              )}
            </div>

            {flagOpen && onFlagMessage && !flagged && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onFlagMessage(
                    message,
                    flagNote.trim() || 'Người dùng đánh dấu câu trả lời AI chưa chính xác.'
                  );
                  setFlagged(true);
                  setFlagOpen(false);
                  setFlagNote('');
                }}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs"
              >
                <input
                  type="text"
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Mô tả ngắn điểm chưa chính xác (tuỳ chọn)…"
                  className="flex-1 min-w-[180px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-on-primary)] cursor-pointer"
                >
                  Gửi báo lỗi
                </button>
                <button
                  type="button"
                  onClick={() => setFlagOpen(false)}
                  className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  Hủy
                </button>
              </form>
            )}

            <AnimatePresence initial={false}>
              {detailsOpen && hasDetailsDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 space-y-2.5">
                    {layers?.assumptions && (
                      <div
                        className="rounded-xl border border-[var(--color-border)]/80 px-3.5 py-3 space-y-1"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-gold) 7%, var(--color-surface) 93%)',
                        }}
                      >
                        <h4 className="text-[11px] font-semibold text-[var(--color-gold)]">
                          Giả định ngầm cần kiểm chứng
                        </h4>
                        <p className="font-reading text-[0.88rem] leading-[1.65] text-[var(--color-text)]">
                          {layers.assumptions}
                        </p>
                      </div>
                    )}

                    {layers?.facts && (
                      <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/80 px-3.5 py-3 space-y-1">
                        <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Căn cứ &amp; học liệu nền
                        </h4>
                        <p className="font-reading text-[0.88rem] leading-[1.65] text-[var(--color-text)]">
                          {layers.facts}
                        </p>
                      </div>
                    )}

                    {message.debateSteps && message.debateSteps.length > 0 && (
                      <DebateStepperAccordion steps={message.debateSteps} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </article>
  );
}
