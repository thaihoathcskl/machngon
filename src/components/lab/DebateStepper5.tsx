import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DebateStepItem, LabType } from '../../lib/types';

export interface DebateStageMeta {
  stage: number;
  key: DebateStepItem['key'];
  debateLabel: string;
  debateShort: string;
  conceptLabel: string;
  conceptShort: string;
  readLabel: string;
  readShort: string;
}

export const DEBATE_STAGES: DebateStageMeta[] = [
  {
    stage: 1,
    key: 'identify',
    debateLabel: 'Lập trường & khái niệm',
    debateShort: '1. Lập trường',
    conceptLabel: 'Cách hiểu ban đầu',
    conceptShort: '1. Khái niệm',
    readLabel: 'Thể loại & ấn tượng',
    readShort: '1. Thể loại',
  },
  {
    stage: 2,
    key: 'analyze',
    debateLabel: 'Giả định & bằng chứng',
    debateShort: '2. Bằng chứng',
    conceptLabel: 'Đặc điểm cốt lõi',
    conceptShort: '2. Cốt lõi',
    readLabel: 'Chi tiết ngôn từ',
    readShort: '2. Chi tiết',
  },
  {
    stage: 3,
    key: 'challenge',
    debateLabel: 'Phản ví dụ',
    debateShort: '3. Phản ví dụ',
    conceptLabel: 'Ví dụ & phản ví dụ',
    conceptShort: '3. Phản ví dụ',
    readLabel: 'Quy luật nghệ thuật',
    readShort: '3. Quy luật',
  },
  {
    stage: 4,
    key: 'synthesize',
    debateLabel: 'Điều chỉnh',
    debateShort: '4. Điều chỉnh',
    conceptLabel: 'Tinh chỉnh ranh giới',
    conceptShort: '4. Ranh giới',
    readLabel: 'Diễn giải nghĩa',
    readShort: '4. Diễn giải',
  },
  {
    stage: 5,
    key: 'respond',
    debateLabel: 'Tổng kết tiến bộ',
    debateShort: '5. Tổng kết',
    conceptLabel: 'Hoàn thiện định nghĩa',
    conceptShort: '5. Tổng kết',
    readLabel: 'Cảm nhận cá nhân',
    readShort: '5. Cảm nhận',
  },
];

function getStageLabels(item: DebateStageMeta, labType: LabType): { label: string; shortLabel: string } {
  if (labType === 'concept') {
    return { label: item.conceptLabel, shortLabel: item.conceptShort };
  }
  if (labType === 'read') {
    return { label: item.readLabel, shortLabel: item.readShort };
  }
  return { label: item.debateLabel, shortLabel: item.debateShort };
}

interface DebateStepperBarProps {
  currentStage: number; // 1..5
  labType: LabType;
  isAnalyzing?: boolean;
  analyzingStepIndex?: number; // 0..4
}

/**
 * Slim horizontal 5-stage progress bar pinned at the top of the chat frame.
 * Compact height preserves 75–80%+ viewport space for dialogue on desktop and mobile.
 */
export function DebateStepperBar({
  currentStage,
  labType,
  isAnalyzing = false,
  analyzingStepIndex = 0,
}: DebateStepperBarProps) {
  const activeStage = Math.min(Math.max(currentStage, 1), 5);
  const effectiveIndex = isAnalyzing
    ? Math.min(Math.max(analyzingStepIndex, 0), 4)
    : activeStage - 1;

  const currentMeta = DEBATE_STAGES[effectiveIndex] ?? DEBATE_STAGES[0];
  const currentStepName = getStageLabels(currentMeta, labType).label;
  const progressPct = Math.round(((effectiveIndex + 1) / DEBATE_STAGES.length) * 100);

  return (
    <div
      role="region"
      aria-label="Tiến trình 5 bước đối thoại Socrates"
      className="shrink-0 border-b border-[var(--color-border)]/80 bg-[var(--color-bg)]/85 backdrop-blur-[2px] px-3 sm:px-5 py-2"
    >
      {/* Mobile (< 640px): Compact 1-line Bước X/5 · [Tên bước] with zero horizontal overflow */}
      <div className="sm:hidden flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          <span className="shrink-0 font-mono-num font-semibold text-[var(--color-primary)]">
            {isAnalyzing ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Bước {effectiveIndex + 1}/5
              </span>
            ) : (
              `Bước ${activeStage}/5`
            )}
          </span>
          <span aria-hidden="true" className="text-[var(--color-text-muted)]">·</span>
          <span className="truncate font-medium text-[var(--color-text)]">{currentStepName}</span>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)]"
        >
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tablet & Desktop (sm+): Full 5-stage horizontal progress bar */}
      <div className="hidden sm:flex mx-auto max-w-[960px] items-center justify-center gap-2 overflow-x-auto no-scrollbar">
        <span className="shrink-0 text-[11px] font-semibold text-[var(--color-primary)] font-mono-num pr-1">
          {isAnalyzing ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {effectiveIndex + 1}/5
            </span>
          ) : (
            `Bước ${activeStage}/5`
          )}
        </span>

        <ol className="flex items-center gap-1 min-w-max">
          {DEBATE_STAGES.map((item, idx) => {
            const isCompleted = !isAnalyzing && item.stage < activeStage;
            const isCurrent = isAnalyzing ? idx === effectiveIndex : item.stage === activeStage;
            const { label, shortLabel } = getStageLabels(item, labType);

            return (
              <React.Fragment key={item.key}>
                <li
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface)_88%)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border)_65%)] font-semibold'
                      : isCompleted
                        ? 'text-[var(--color-text)] bg-[var(--color-surface)]/80 border border-[var(--color-border)]/80'
                        : 'text-[var(--color-text-muted)] border border-transparent'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 text-[var(--color-primary)] shrink-0" />
                  ) : (
                    <span className="font-mono-num text-[10px] opacity-85">{item.stage}.</span>
                  )}
                  <span className="hidden lg:inline">{label}</span>
                  <span className="lg:hidden">{shortLabel.replace(/^\d+\.\s*/, '')}</span>
                </li>
                {idx < DEBATE_STAGES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-px w-2 sm:w-3 shrink-0 ${
                      isCompleted ? 'bg-[var(--color-primary)]/45' : 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * Compact inline thinking indicator shown inside the chat stream while AI analyzes.
 */
export function DebateStepperLive({
  activeIndex,
  labType = 'debate',
}: {
  activeIndex: number;
  labType?: LabType;
}) {
  const safeIdx = Math.min(Math.max(activeIndex, 0), 4);
  const currentMeta = DEBATE_STAGES[safeIdx] ?? DEBATE_STAGES[0];
  const currentLabel = getStageLabels(currentMeta, labType).label;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 py-2 text-xs text-[var(--color-text-muted)]"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
        aria-hidden="true"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium text-[var(--color-text)]">
          Trợ lý Mạch Ngôn đang suy luận…
        </span>
        <span className="font-mono-num text-[11px] text-[var(--color-primary)]">
          ({safeIdx + 1}/5 · {currentLabel})
        </span>
      </div>
    </div>
  );
}

/**
 * Quiet collapsible 5-step trace inside the optional "Soi chiếu căn cứ" drawer.
 */
export function DebateStepperAccordion({ steps }: { steps: DebateStepItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-bg)]/45 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
      >
        <span>Mạch suy luận 5 bước của lượt này</span>
        <span className="inline-flex items-center gap-1 shrink-0 text-[11px] text-[var(--color-primary)] whitespace-nowrap">
          <span>{expanded ? 'Thu gọn' : 'Chi tiết'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[var(--color-border)]/80"
          >
            <ol className="divide-y divide-[var(--color-border)]/70">
              {steps.map((step, index) => {
                const friendlyLabel =
                  DEBATE_STAGES.find((item) => item.key === step.key)?.debateLabel ||
                  step.vietnameseTitle;
                return (
                  <li key={step.key} className="px-3.5 py-2.5 text-xs bg-[var(--color-surface)]/75">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                      <span className="font-mono-num text-[var(--color-primary)]">
                        0{index + 1}.
                      </span>
                      <span>{friendlyLabel}</span>
                    </div>
                    <p className="mt-0.5 font-reading text-[0.84rem] leading-[1.6] text-[var(--color-text-muted)]">
                      {step.summary}
                    </p>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
