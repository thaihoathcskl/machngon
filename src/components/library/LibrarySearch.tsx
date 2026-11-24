import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Lightbulb, Search, X } from 'lucide-react';
import { LIBRARY_CONCEPTS } from '../../content/library/concepts';
import {
  getSearchSuggestions,
  LIBRARY_SUGGESTED_KEYWORDS,
} from '../../lib/library/search';
import { useRouter } from '../../lib/router';
import { LibraryConcept, LibraryDocument } from '../../lib/types';

interface LibrarySearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  publishedDocuments: LibraryDocument[];
  onSelectConcept?: (concept: LibraryConcept) => void;
  onSubmitSearch?: () => void;
}

export function LibrarySearch({
  query,
  onQueryChange,
  publishedDocuments,
  onSelectConcept,
  onSubmitSearch,
}: LibrarySearchProps) {
  const { navigate } = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () => getSearchSuggestions(query, publishedDocuments, LIBRARY_CONCEPTS, 4, 3),
    [query, publishedDocuments]
  );

  const hasSuggestions =
    query.trim().length > 0 &&
    (suggestions.documents.length > 0 || suggestions.concepts.length > 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section aria-label="Tìm kiếm tài liệu và khái niệm" className="relative" ref={containerRef}>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setIsOpen(false);
            onSubmitSearch?.();
          }}
          className="relative"
        >
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            id="library-search-input"
            type="search"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setIsOpen(true);
            }}
            placeholder="Bạn muốn khám phá điều gì hôm nay? (VD: tự do, ngôn ngữ, ngụy biện, Socrates...) — nhấn / để tìm nhanh"
            aria-label="Tìm kiếm tài liệu, khái niệm hoặc tác giả trong thư viện"
            className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg)] pl-12 pr-11 py-3.5 text-sm sm:text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                setIsOpen(false);
              }}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Suggested clickable keywords — every keyword strictly matches real documents */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
          <span className="text-[var(--color-text-muted)] font-medium mr-1">Gợi ý nhanh:</span>
          {LIBRARY_SUGGESTED_KEYWORDS.map((keyword) => {
            const isActive = query.trim().toLowerCase() === keyword.toLowerCase();
            return (
              <button
                key={keyword}
                type="button"
                onClick={() => {
                  onQueryChange(isActive ? '' : keyword);
                  setIsOpen(false);
                  if (!isActive) onSubmitSearch?.();
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:text-[var(--color-primary)]'
                }`}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Autocomplete Dropdown (real documents & concepts only) */}
      {isOpen && hasSuggestions && (
        <div
          role="listbox"
          aria-label="Gợi ý tìm kiếm trực tiếp"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-xl"
        >
          {suggestions.documents.length > 0 && (
            <div className="p-3">
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Tài liệu phù hợp
              </p>
              <div className="space-y-1">
                {suggestions.documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/library/${doc.id}`);
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {doc.category} · {doc.readingMinutes} phút đọc
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.concepts.length > 0 && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3">
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Khái niệm học thuật
              </p>
              <div className="space-y-1">
                {suggestions.concepts.map((concept) => (
                  <button
                    key={concept.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (onSelectConcept) {
                        onSelectConcept(concept);
                      } else if (concept.documentIds[0]) {
                        navigate(`/library/${concept.documentIds[0]}`);
                      }
                    }}
                    className="w-full flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-gold)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {concept.term}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                          {concept.shortDefinition}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-[var(--color-primary)]">
                      Xem
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
