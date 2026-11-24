import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
} from 'lucide-react';
import { useApp } from '../../lib/AppContext';
import { Link } from '../../lib/router';
import { loadReadingScrollPosition } from '../../lib/storage';
import { LibraryCollection, LibraryDocument } from '../../lib/types';
import { HybridMediaCard } from '../visuals/ThemeSyncedHero';

interface CollectionCardProps {
  collection: LibraryCollection;
  documents: LibraryDocument[];
  expanded: boolean;
  onToggleExpand: () => void;
  onFilterByCollection?: (collectionId: string) => void;
}

export function CollectionCard({
  collection,
  documents,
  expanded,
  onToggleExpand,
  onFilterByCollection,
}: CollectionCardProps) {
  const { completedDocIds, activeJourneyId, setActiveJourneyId } = useApp();
  const docById = new Map(documents.map((d) => [d.id, d]));
  const orderedDocs = collection.documentIds
    .map((id) => docById.get(id))
    .filter((d): d is LibraryDocument => Boolean(d && d.status === 'published'));

  if (orderedDocs.length === 0) return null;

  const totalMinutes = orderedDocs.reduce((sum, doc) => sum + doc.readingMinutes, 0);
  const completedSet = new Set(completedDocIds);
  const isDocDone = (docId: string) => {
    if (completedSet.has(docId)) return true;
    const pos = loadReadingScrollPosition(docId);
    return Boolean(pos && pos.scrollPercent >= 85);
  };

  const completedCount = orderedDocs.filter((doc) => isDocDone(doc.id)).length;
  const nextUnreadDoc = orderedDocs.find((doc) => !isDocDone(doc.id)) ?? orderedDocs[0];
  const isActiveJourney = activeJourneyId === collection.id;
  const progressPct = Math.round((completedCount / orderedDocs.length) * 100);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface)] transition-all ${
        isActiveJourney
          ? 'border-[var(--color-primary)] shadow-sm'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/45'
      }`}
    >
      <div className="relative overflow-hidden border-b border-[var(--color-border)]/70">
        <HybridMediaCard
          src={collection.coverImage}
          alt={collection.coverAlt}
          title={collection.title}
          aspect="16/9"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(20, 14, 18, 0.72), transparent)',
          }}
          aria-hidden="true"
        />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white/95">
          <span className="font-semibold tracking-wide">
            {orderedDocs.length} bài đọc theo trình tự
          </span>
          <span className="inline-flex items-center gap-1 font-mono-num">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            ~{totalMinutes} phút
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display lib-scale-h3 font-bold text-[var(--color-text)]">
            {collection.title}
          </h3>
          {isActiveJourney && (
            <span className="shrink-0 rounded-md border border-[var(--color-primary)]/40 bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface)_90%)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
              Đang theo
            </span>
          )}
        </div>

        <p className="mt-1.5 lib-scale-body text-[var(--color-text-muted)]">
          {collection.description}
        </p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1 font-medium">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${completedCount > 0 ? 'text-[var(--color-success)]' : 'opacity-50'}`}
                aria-hidden="true"
              />
              Đã xong {completedCount}/{orderedDocs.length} bài
            </span>
            <span className="font-mono-num">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
          >
            {expanded ? (
              <>
                Thu gọn <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Xem {orderedDocs.length} bài <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveJourneyId(collection.id)}
              aria-pressed={isActiveJourney}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                isActiveJourney
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-primary)]/45'
              }`}
            >
              {isActiveJourney ? (
                <>
                  <Check className="h-3 w-3" /> Đang theo
                </>
              ) : (
                <>
                  <Compass className="h-3 w-3" /> Theo hành trình
                </>
              )}
            </button>

            {onFilterByCollection && (
              <button
                type="button"
                onClick={() => onFilterByCollection(collection.id)}
                className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer"
              >
                Lọc
              </button>
            )}

            <Link
              to={`/library/${nextUnreadDoc.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
            >
              {completedCount > 0 && completedCount < orderedDocs.length ? 'Đọc tiếp' : 'Bắt đầu'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Ordered reading itinerary */}
        {expanded && (
          <ol className="mt-4 space-y-2 border-t border-[var(--color-border)]/70 pt-3.5">
            {orderedDocs.map((doc, idx) => {
              const done = isDocDone(doc.id);
              return (
                <li key={doc.id}>
                  <Link
                    to={`/library/${doc.id}`}
                    className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[var(--color-surface-elevated)] transition-colors"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold font-mono-num ${
                        done
                          ? 'bg-[var(--color-success)] text-white'
                          : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      }`}
                    >
                      {done ? '✓' : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="lib-scale-small font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{doc.genre || doc.category}</span>
                        <span>·</span>
                        <span>{doc.readingMinutes} phút</span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </article>
  );
}
