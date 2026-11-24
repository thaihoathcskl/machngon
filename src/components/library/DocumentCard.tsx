import React from 'react';
import { ArrowRight, Bookmark, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { buildAuthRedirectUrl } from '../../lib/authGuard';
import {
  estimateReadingMinutes,
  getDifficultyShortLabel,
  getDifficultyTone,
  isDocumentVerified,
} from '../../lib/library/validation';
import { Link, useRouter } from '../../lib/router';
import { loadReadingScrollPosition } from '../../lib/storage';
import { LibraryDocument } from '../../lib/types';
import { useToast } from '../ui/ToastProvider';
import { HybridMediaCard } from '../visuals/ThemeSyncedHero';

interface DocumentCardProps {
  doc: LibraryDocument;
  compact?: boolean;
}

export function DocumentCard({ doc, compact = false }: DocumentCardProps) {
  const { user, savedDocIds, completedDocIds, openedDocIds, toggleSavedDoc } = useApp();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const isSaved = user.isAuthenticated && savedDocIds.includes(doc.id);
  const progress = loadReadingScrollPosition(doc.id);
  const readPct = progress ? Math.round(progress.scrollPercent) : 0;
  const isCompleted = completedDocIds.includes(doc.id) || readPct >= 90;
  const isReading = !isCompleted && (readPct >= 5 || openedDocIds.includes(doc.id));
  const verified = isDocumentVerified(doc);
  const readingMinutes = estimateReadingMinutes(doc.blocks, doc.excerpt);
  const difficultyLabel = getDifficultyShortLabel(doc.difficulty);
  const difficultyTone = getDifficultyTone(doc.difficulty);

  const readStatusLabel = isCompleted
    ? 'Đã xong'
    : readPct >= 5
      ? `Đang đọc ${readPct}%`
      : isReading
        ? 'Đang đọc'
        : 'Chưa đọc';

  const handleToggleSave = () => {
    if (!user.isAuthenticated) {
      navigate(buildAuthRedirectUrl(`/library/${encodeURIComponent(doc.id)}`));
      return;
    }
    toggleSavedDoc(doc.id);
    showToast(
      isSaved
        ? `Đã bỏ lưu "${doc.title}" khỏi tủ sách.`
        : `Đã lưu "${doc.title}" vào tủ sách cá nhân.`,
      { variant: isSaved ? 'info' : 'success' }
    );
  };

  return (
    <article className="group h-full flex flex-col overflow-hidden rounded-2xl surface-card surface-card-interactive hover:-translate-y-0.5">
      {/* 4:3 Editorial Cover Image */}
      <div className="relative overflow-hidden border-b border-[var(--color-border)]/70">
        <Link to={`/library/${doc.id}`} className="block overflow-hidden">
          <HybridMediaCard
            src={doc.coverImage}
            alt={doc.coverAlt}
            title={doc.title}
            aspect="4/3"
            className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </Link>

        {/* Reading Progress Status Tag */}
        <span
          className="absolute top-3 left-3 rounded-lg border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
          style={{
            backgroundColor: isCompleted
              ? 'color-mix(in srgb, var(--color-success) 88%, var(--color-surface) 12%)'
              : 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
            borderColor: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
            color: isCompleted ? '#ffffff' : 'var(--color-text)',
          }}
        >
          {readStatusLabel}
        </span>

        <button
          type="button"
          onClick={handleToggleSave}
          aria-label={isSaved ? `Bỏ lưu tài liệu ${doc.title}` : `Lưu tài liệu ${doc.title}`}
          aria-pressed={isSaved}
          className={`absolute top-3 right-3 flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
            isSaved
              ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
              : 'bg-[var(--color-surface)]/92 text-[var(--color-text)] border-[var(--color-border)] hover:text-[var(--color-primary)]'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {readPct >= 5 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/20" aria-hidden="true">
            <div
              className="h-full transition-[width]"
              style={{
                width: `${Math.min(100, readPct)}%`,
                backgroundColor: readPct >= 90 ? 'var(--color-success)' : 'var(--color-gold)',
              }}
            />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className={`flex flex-1 flex-col ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[var(--color-text-muted)]">
          <span className="truncate text-[var(--color-primary)]">
            {doc.genre ? `${doc.category} · ${doc.genre}` : doc.category}
          </span>
          <span className="shrink-0 flex items-center gap-1.5">
            <span
              className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: difficultyTone.bg,
                color: difficultyTone.text,
                borderColor: difficultyTone.border,
              }}
            >
              {difficultyLabel}
            </span>
            {verified && (
              <span
                className="inline-flex items-center text-[var(--color-gold)]"
                title="Đã đối chiếu tối thiểu 2 nguồn tham khảo học thuật"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-label="Đã kiểm chứng nguồn" />
              </span>
            )}
          </span>
        </div>

        <Link to={`/library/${doc.id}`} className="mt-2 block">
          <h3 className="font-display lib-scale-h3 font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
            {doc.title}
          </h3>
        </Link>

        <p className="mt-2 flex-1 font-reading lib-scale-body text-[var(--color-text-muted)] line-clamp-3">
          {doc.excerpt}
        </p>

        {/* Bottom Reading Time + CTA */}
        <div className="mt-4 pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)] font-mono-num">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {readingMinutes} phút đọc
          </span>

          <Link
            to={`/library/${doc.id}`}
            className="inline-flex items-center gap-1 font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            {isCompleted ? 'Đọc lại' : isReading ? 'Đọc tiếp' : 'Khám phá'}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
