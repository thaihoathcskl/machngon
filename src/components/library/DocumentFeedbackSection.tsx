import React, { useState } from 'react';
import { Flag, MessageSquarePlus, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { buildAuthRedirectUrl } from '../../lib/authGuard';
import { useRouter } from '../../lib/router';
import {
  addDocumentComment,
  addDocumentReport,
  loadDocumentComments,
} from '../../lib/storage';
import { DocumentComment, DocumentReportReason } from '../../lib/types';
import { useToast } from '../ui/ToastProvider';

const REPORT_REASONS: DocumentReportReason[] = [
  'Sai kiến thức',
  'Thiếu hoặc sai nguồn dẫn chứng',
  'Lỗi chính tả / hiển thị',
  'Đề xuất cập nhật nội dung',
  'Khác',
];

function formatCommentTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

interface DocumentFeedbackSectionProps {
  documentId: string;
  onOpenReport: () => void;
}

export function DocumentFeedbackSection({
  documentId,
  onOpenReport,
}: DocumentFeedbackSectionProps) {
  const { user } = useApp();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [comments, setComments] = useState<DocumentComment[]>(() =>
    loadDocumentComments(documentId)
  );
  const [rating, setRating] = useState<'helpful' | 'needs_improvement'>('helpful');
  const [stars, setStars] = useState<number>(5);
  const [content, setContent] = useState('');

  React.useEffect(() => {
    setComments(loadDocumentComments(documentId));
  }, [documentId]);

  const helpfulCount = comments.filter((c) => c.rating === 'helpful').length;
  const starredComments = comments.filter((c) => typeof c.stars === 'number' && c.stars > 0);
  const avgStars =
    starredComments.length > 0
      ? (
          starredComments.reduce((sum, c) => sum + (c.stars ?? 0), 0) / starredComments.length
        ).toFixed(1)
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isAuthenticated) {
      navigate(buildAuthRedirectUrl(`/library/${encodeURIComponent(documentId)}`));
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length < 4) {
      showToast('Hãy viết ít nhất vài từ nhận xét trước khi gửi.', { variant: 'warning' });
      return;
    }
    const newComment: DocumentComment = {
      id: `cmt_${Date.now().toString(36)}`,
      documentId,
      authorName: user.name || 'Học viên Mạch Ngôn',
      rating,
      stars,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    addDocumentComment(newComment);
    setComments((prev) => [newComment, ...prev]);
    setContent('');
    showToast('Cảm ơn bạn đã chia sẻ đánh giá và thảo luận cho bài đọc!', { variant: 'success' });
  };

  return (
    <section
      aria-labelledby="doc-feedback-heading"
      className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div>
          <h2
            id="doc-feedback-heading"
            className="font-display text-lg font-semibold text-[var(--color-text)]"
          >
            Đánh giá & Góp ý tài liệu ({comments.length})
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {avgStars
              ? `Trung bình ${avgStars}/5 sao · ${helpfulCount} nhận xét đánh giá hữu ích.`
              : helpfulCount > 0
                ? `${helpfulCount} nhận xét đánh giá bài đọc hữu ích.`
                : 'Chấm điểm, chia sẻ góc nhìn bổ sung hoặc báo cáo sai sót để hoàn thiện học liệu.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/45 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Báo cáo lỗi nội dung
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-text-muted)] font-medium">Mức độ hài lòng:</span>
            <div role="radiogroup" aria-label="Chấm điểm 1 đến 5 sao" className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={stars === value}
                  aria-label={`${value} sao`}
                  onClick={() => {
                    setStars(value);
                    setRating(value >= 3 ? 'helpful' : 'needs_improvement');
                  }}
                  className="p-1 rounded-md hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
                >
                  <Star
                    className={`h-4 w-4 ${
                      value <= stars
                        ? 'fill-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'text-[var(--color-border-strong)]'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-1 font-mono-num text-[11px] font-semibold text-[var(--color-text)]">
                {stars}/5
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRating('helpful')}
              aria-pressed={rating === 'helpful'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium border transition-colors cursor-pointer ${
                rating === 'helpful'
                  ? 'border-[var(--color-success)] text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface)_90%)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Hữu ích
            </button>
            <button
              type="button"
              onClick={() => setRating('needs_improvement')}
              aria-pressed={rating === 'needs_improvement'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium border transition-colors cursor-pointer ${
                rating === 'needs_improvement'
                  ? 'border-[var(--color-gold)] text-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_10%,var(--color-surface)_90%)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Cần cải thiện
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            user.isAuthenticated
              ? 'Chia sẻ nhận xét, ví dụ thực tế hoặc điểm bạn muốn thảo luận thêm về bài viết…'
              : 'Đăng nhập để chia sẻ nhận xét và thảo luận cùng bạn đọc…'
          }
          className="textarea-editorial !text-sm resize-none"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Bình luận của bạn được lưu cục bộ trong hồ sơ học tập trên trình duyệt này.
          </span>
          <button type="submit" className="btn-primary !min-h-9 !px-4 !text-xs shrink-0">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            {user.isAuthenticated ? 'Gửi bình luận' : 'Đăng nhập để bình luận'}
          </button>
        </div>
      </form>

      {comments.length > 0 && (
        <ul className="space-y-3 pt-2 border-t border-[var(--color-border)]">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3.5 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[var(--color-text)]">{c.authorName}</span>
                  {typeof c.stars === 'number' && c.stars > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-mono-num text-[11px] font-semibold text-[var(--color-gold)]">
                      <Star className="h-3 w-3 fill-[var(--color-gold)]" />
                      {c.stars}/5
                    </span>
                  )}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                      c.rating === 'helpful'
                        ? 'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]'
                        : 'text-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]'
                    }`}
                  >
                    {c.rating === 'helpful' ? 'Hữu ích' : 'Góp ý cải thiện'}
                  </span>
                </div>
                <span className="font-mono-num text-[11px] text-[var(--color-text-muted)]">
                  {formatCommentTime(c.createdAt)}
                </span>
              </div>
              <p className="font-reading text-sm leading-relaxed text-[var(--color-text)]">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface DocumentReportModalProps {
  open: boolean;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export function DocumentReportModal({
  open,
  documentId,
  documentTitle,
  onClose,
}: DocumentReportModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState<DocumentReportReason>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/library/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          reason,
          detail: detail.trim(),
        }),
      }).catch(() => undefined);

      addDocumentReport({
        id: `rep_${Date.now().toString(36)}`,
        documentId,
        documentTitle,
        reason,
        detail: detail.trim(),
        createdAt: new Date().toISOString(),
      });

      showToast('Đã tiếp nhận báo cáo lỗi nội dung. Cảm ơn bạn đã góp phần nâng cao chất lượng học liệu!', {
        variant: 'success',
      });
      setDetail('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-report-modal-title"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/45 backdrop-blur-[1px]" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        style={{ boxShadow: 'var(--shadow-float)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="doc-report-modal-title" className="font-display text-lg font-semibold text-[var(--color-text)]">
              Báo cáo nội dung bài đọc
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-1">
              {documentTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại báo cáo"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--color-text)] mb-1">
              Chọn lý do báo cáo
            </legend>
            {REPORT_REASONS.map((item) => (
              <label
                key={item}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition-colors ${
                  reason === item
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-medium text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[var(--color-text-muted)]'
                }`}
              >
                <input
                  type="radio"
                  name="doc-report-reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                  className="accent-[var(--color-primary)]"
                />
                <span>{item}</span>
              </label>
            ))}
          </fieldset>

          <div>
            <label htmlFor="doc-report-detail" className="block text-xs font-medium mb-1.5">
              Mô tả chi tiết (tuỳ chọn)
            </label>
            <textarea
              id="doc-report-detail"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ghi rõ đoạn văn, nguồn cần kiểm tra hoặc gợi ý chỉnh sửa…"
              className="textarea-editorial !text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary !min-h-9 !px-4 !text-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !min-h-9 !px-4 !text-xs"
            >
              {submitting ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
