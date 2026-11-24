import React from 'react';
import { BookOpen, Compass, Layers, Sparkles } from 'lucide-react';
import { resolveEditorialAsset } from '../../lib/assets';

interface LibraryHeroProps {
  totalDocs: number;
  verifiedDocsCount?: number;
  totalCategories: number;
  totalCollections: number;
  totalConcepts: number;
  onJumpToCatalog: () => void;
  onJumpToCollections: () => void;
}

export function LibraryHero({
  totalDocs,
  verifiedDocsCount,
  totalCategories,
  totalCollections,
  totalConcepts,
  onJumpToCatalog,
  onJumpToCollections,
}: LibraryHeroProps) {
  const heroBg = resolveEditorialAsset('/assets/images/cover_lib.jpg');

  return (
    <section
      aria-label="Giới thiệu Thư viện Tri thức"
      className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Subtle architectural reading hall artwork */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover opacity-[0.16]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, var(--color-surface) 38%, color-mix(in srgb, var(--color-surface) 84%, transparent) 72%, color-mix(in srgb, var(--color-surface-elevated) 72%, transparent) 100%)',
          }}
        />
      </div>

      <div className="relative px-6 py-8 sm:px-9 sm:py-11 lg:px-11 lg:py-12">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Mạch Ngôn AI Library · Học liệu chọn lọc
          </p>

          <h1 className="mt-2.5 font-display lib-scale-hero-title font-bold tracking-tight text-[var(--color-text)]">
            AI LIBRARY — THƯ VIỆN TRI THỨC
          </h1>

          <p className="mt-3.5 font-reading lib-scale-lead text-[var(--color-text-muted)] max-w-2xl">
            Kho chuyên luận độc lập về ngôn ngữ, văn học, triết học, logic và tư duy phản biện —
            phân cấp rõ theo 3 mức Nhập môn, Khám phá và Chuyên sâu kèm thuật ngữ tương tác
            và đối chiếu nguồn minh bạch.
          </p>

          {/* Honest, live platform inventory counts (no fake user metrics) */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text)]">
              <BookOpen className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
              <strong className="font-mono-num">{totalDocs}</strong> bài đọc
              {typeof verifiedDocsCount === 'number' && (
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  ({verifiedDocsCount} đạt chuẩn ≥2 nguồn kiểm chứng)
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
              <strong className="font-mono-num text-[var(--color-text)]">{totalCategories}</strong> lĩnh vực cốt lõi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
              <strong className="font-mono-num text-[var(--color-text)]">{totalCollections}</strong> hành trình tri thức
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
              <strong className="font-mono-num text-[var(--color-text)]">{totalConcepts}</strong> thuật ngữ tương tác
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onJumpToCatalog}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
            >
              Khám phá kho tài liệu
            </button>
            <button
              type="button"
              onClick={onJumpToCollections}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/90 px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              Xem Hành trình Tri thức
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
