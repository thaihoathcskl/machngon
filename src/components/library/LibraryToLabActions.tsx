import React from 'react';
import {
  BookOpenText,
  HelpCircle,
  Lightbulb,
  Scale,
  Sparkles,
} from 'lucide-react';
import { LabActionIntent, LabHandoffPayload, LabType } from '../../lib/types';

export interface LibraryLabActionOption {
  intent: LabActionIntent;
  label: string;
  shortLabel: string;
  labType: LabType;
  description: string;
  icon: typeof Lightbulb;
}

export const LIBRARY_LAB_ACTIONS: LibraryLabActionOption[] = [
  {
    intent: 'explain',
    label: 'Giải thích đoạn này',
    shortLabel: 'Giải thích',
    labType: 'concept',
    description: 'Diễn giải dễ hiểu, làm rõ ý chính và ngữ cảnh của đoạn văn.',
    icon: BookOpenText,
  },
  {
    intent: 'analyze_concept',
    label: 'Phân tích khái niệm',
    shortLabel: 'Khái niệm',
    labType: 'concept',
    description: 'Bóc tách định nghĩa, ranh giới khái niệm và các giả định nền.',
    icon: Lightbulb,
  },
  {
    intent: 'examples_counterexamples',
    label: 'Tìm ví dụ & phản ví dụ',
    shortLabel: 'Ví dụ & phản ví dụ',
    labType: 'concept',
    description: 'Đối chiếu ví dụ đời sống và trường hợp ngoại lệ đáng lưu ý.',
    icon: Sparkles,
  },
  {
    intent: 'guiding_questions',
    label: 'Đặt câu hỏi gợi suy nghĩ',
    shortLabel: 'Câu hỏi gợi mở',
    labType: 'concept',
    description: 'Gợi mở câu hỏi kiểu Socrates để tự kiểm nghiệm và đào sâu.',
    icon: HelpCircle,
  },
  {
    intent: 'debate_claim',
    label: 'Tranh biện về nhận định',
    shortLabel: 'Tranh biện',
    labType: 'debate',
    description: 'Đưa nhận định vào Debate Lab để kiểm thử lý lẽ đa chiều.',
    icon: Scale,
  },
];

/**
 * Formats an editable Vietnamese starter prompt for Lab Composer (NEVER auto-sent).
 */
export function buildLabIntentPrompt(handoff: LabHandoffPayload): string {
  const snippet = handoff.quoteText.trim().slice(0, 380);
  const sectionCtx = handoff.sectionTitle ? ` (mục "${handoff.sectionTitle}")` : '';
  const sourceHeader = `Từ tài liệu "${handoff.resourceTitle}"${sectionCtx}:\n"${snippet}"\n\n`;

  if (handoff.question?.trim()) {
    return `Từ tài liệu "${handoff.resourceTitle}"${sectionCtx}, tôi muốn suy ngẫm và trả lời câu hỏi gợi mở sau:\n"${handoff.question.trim()}"\n\nQuan điểm ban đầu của tôi là: `;
  }

  switch (handoff.actionIntent) {
    case 'explain':
      return handoff.labType === 'read'
        ? `${sourceHeader}Hãy hướng dẫn tôi đọc chậm ngữ liệu văn học này: bắt đầu từ thể loại, ấn tượng ban đầu và những chi tiết ngôn từ đáng chú ý nhất.`
        : `${sourceHeader}Hãy giúp tôi giải thích đoạn trích này một cách dễ hiểu, chỉ rõ ý cốt lõi và kết nối với một tình huống thực tế gần gũi với học sinh.`;
    case 'analyze_concept':
      return `${sourceHeader}Hãy phân tích khái niệm trung tâm trong đoạn trích này: bản chất, phạm vi áp dụng, và phân biệt với những khái niệm dễ nhầm lẫn.`;
    case 'examples_counterexamples':
      return `${sourceHeader}Hãy cùng tôi tìm ít nhất hai ví dụ đời sống ủng hộ ý tưởng trên và một phản ví dụ (hoặc ngoại lệ) giúp nhìn rõ giới hạn của nó.`;
    case 'guiding_questions':
      return `${sourceHeader}Đừng vội đưa kết luận sẵn — hãy đặt cho tôi những câu hỏi gợi mở theo tinh thần Socrates để tôi tự suy ngẫm và kiểm tra các giả định ngầm phía sau đoạn này.`;
    case 'debate_claim':
      return `${sourceHeader}Tôi muốn đưa nhận định này vào bàn tranh biện: hãy giúp tôi bóc tách giả định ngầm, trình bày phiên bản mạnh nhất của lập luận đối lập và thử thách tính vững chắc của nó.`;
    default:
      if (handoff.labType === 'read') {
        return `${sourceHeader}Hãy hướng dẫn tôi đọc sâu tác phẩm / ngữ liệu văn học này theo từng chi tiết nghệ thuật: `;
      }
      if (handoff.labType === 'debate') {
        return `${sourceHeader}Tôi muốn phản biện và kiểm thử các giả định ẩn sau nhận định này: `;
      }
      return `${sourceHeader}Hãy giúp tôi phân tích sâu khái niệm trong đoạn trích này và nêu một phản ví dụ giúp kiểm chứng: `;
  }
}

interface LibraryToLabActionsMenuProps {
  onSelectAction: (option: LibraryLabActionOption) => void;
  compact?: boolean;
}

export function LibraryToLabActionsMenu({
  onSelectAction,
  compact = false,
}: LibraryToLabActionsMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Khám phá đoạn trích cùng Thinking Lab"
      className={compact ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}
    >
      {LIBRARY_LAB_ACTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.intent}
            type="button"
            role="menuitem"
            onClick={() => onSelectAction(option)}
            className={`w-full flex items-start gap-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
              compact
                ? 'border-transparent px-3 py-2 hover:bg-[var(--color-surface-elevated)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/50'
            }`}
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                option.labType === 'debate'
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-gold)]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  {option.label}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] shrink-0">
                  {option.labType === 'debate' ? 'Debate Lab' : 'Concept Lab'}
                </span>
              </div>
              {!compact && (
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)]">
                  {option.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
