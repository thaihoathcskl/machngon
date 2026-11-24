import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  LayoutGrid,
  Layers,
  X,
} from 'lucide-react';
import { PublicHeader, WorkspaceShell } from '../components/layout/AppShell';
import { CategoryGrid } from '../components/library/CategoryGrid';
import { CollectionCard } from '../components/library/CollectionCard';
import { ConceptPopoverDialog } from '../components/library/ConceptTooltip';
import { ContinueReading } from '../components/library/ContinueReading';
import { DocumentCard } from '../components/library/DocumentCard';
import { FeaturedDocuments } from '../components/library/FeaturedDocuments';
import { LibraryFontSizeControl } from '../components/library/LibraryFontSizeControl';
import { LibraryHero } from '../components/library/LibraryHero';
import { LibrarySearch } from '../components/library/LibrarySearch';
import { EmptyStateCard } from '../components/ui/EditorialPrimitives';
import { useToast } from '../components/ui/ToastProvider';
import { Pagination } from '../components/ui/UiControls';
import { EDITORIAL_TOPIC_ROADMAP } from '../content/library/categories';
import { LIBRARY_CONCEPTS } from '../content/library/concepts';
import { useApp } from '../lib/AppContext';
import { searchDocuments } from '../lib/library/search';
import {
  estimateReadingMinutes,
  getDifficultyTone,
  isDocumentVerified,
  normalizeCategoryName,
} from '../lib/library/validation';
import { loadReadingScrollPosition } from '../lib/storage';
import { Link, useRouter } from '../lib/router';
import { DocumentCategory, DocumentDifficulty, LibraryConcept } from '../lib/types';

const PAGE_SIZE = 9;

type SortMode = 'default' | 'az' | 'shortest' | 'level' | 'newest';
type ProgressFilter = 'all' | 'new' | 'reading' | 'done' | 'saved';

const DIFFICULTY_TIERS: Array<{
  key: DocumentDifficulty;
  step: string;
  label: string;
  subtitle: string;
  description: string;
}> = [
  {
    key: 'intro',
    step: 'Bậc 1',
    label: 'Nhập môn',
    subtitle: 'Nền tảng khái niệm',
    description: 'Diễn giải trực quan, ít thuật ngữ nặng, phù hợp bắt đầu làm quen chủ đề mới.',
  },
  {
    key: 'explore',
    step: 'Bậc 2',
    label: 'Khám phá',
    subtitle: 'Liên hệ & phân tích',
    description: 'Mở rộng bối cảnh lịch sử – xã hội, so sánh nhiều góc nhìn và phản ví dụ.',
  },
  {
    key: 'advanced',
    step: 'Bậc 3',
    label: 'Chuyên sâu',
    subtitle: 'Phản biện học thuật',
    description: 'Bóc tách giả định triết học – logic chặt chẽ, trích dẫn chuyên khảo gốc.',
  },
];

function parseDateValue(dateStr: string): number {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts.map(Number);
    return new Date(yyyy, mm - 1, dd).getTime() || 0;
  }
  return Date.parse(dateStr) || 0;
}

export function LibraryPage() {
  const {
    user,
    publishedDocuments,
    visibleCategories,
    publishedCollections,
    savedDocIds,
    completedDocIds,
    openedDocIds,
  } = useApp();
  const { showToast } = useToast();
  const { search: urlSearch } = useRouter();

  const initialParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);

  const [rawQuery, setRawQuery] = useState(() => initialParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => initialParams.get('q') ?? '');
  const [activeCategory, setActiveCategory] = useState<'Tất cả' | DocumentCategory>(() => {
    const cat = initialParams.get('category');
    return cat ? normalizeCategoryName(cat) : 'Tất cả';
  });
  const [activeSubGenre, setActiveSubGenre] = useState<string>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    () => initialParams.get('collection')
  );
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DocumentDifficulty>('all');
  const [groupByDifficulty, setGroupByDifficulty] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [page, setPage] = useState(1);

  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(
    publishedCollections[0]?.id ?? null
  );
  const [selectedConcept, setSelectedConcept] = useState<LibraryConcept | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  const catalogRef = useRef<HTMLElement | null>(null);
  const collectionsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cat = initialParams.get('category');
    if (cat) {
      setActiveCategory(normalizeCategoryName(cat));
      setActiveSubGenre('all');
    }
    if (initialParams.get('focus') === '1') {
      const el = document.getElementById('library-search-input') as HTMLInputElement | null;
      if (el) {
        window.setTimeout(() => {
          el.focus();
        }, 60);
      }
    }
  }, [initialParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(rawQuery);
      setPage(1);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToCollections = () => {
    collectionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeCollection = useMemo(
    () => publishedCollections.find((c) => c.id === activeCollectionId) ?? null,
    [publishedCollections, activeCollectionId]
  );

  const availableSubGenres = useMemo(() => {
    const base =
      activeCategory === 'Tất cả'
        ? publishedDocuments
        : publishedDocuments.filter((d) => normalizeCategoryName(d.category) === activeCategory);
    const genres = new Set<string>();
    for (const d of base) {
      if (d.genre?.trim()) genres.add(d.genre.trim());
    }
    return Array.from(genres).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [publishedDocuments, activeCategory]);

  const filteredDocuments = useMemo(() => {
    let list = debouncedQuery.trim()
      ? searchDocuments(publishedDocuments, debouncedQuery, LIBRARY_CONCEPTS)
      : [...publishedDocuments];

    if (activeCategory !== 'Tất cả') {
      list = list.filter((doc) => normalizeCategoryName(doc.category) === activeCategory);
    }

    if (activeSubGenre !== 'all') {
      list = list.filter((doc) => doc.genre?.trim() === activeSubGenre);
    }

    if (activeCollection) {
      const idSet = new Set(activeCollection.documentIds);
      list = list.filter((doc) => idSet.has(doc.id));
    }

    if (difficultyFilter !== 'all') {
      list = list.filter((doc) => (doc.difficulty ?? 'explore') === difficultyFilter);
    }

    if (progressFilter !== 'all') {
      const savedSet = new Set(savedDocIds);
      const doneSet = new Set(completedDocIds);
      const openedSet = new Set(openedDocIds);
      list = list.filter((doc) => {
        const scroll = loadReadingScrollPosition(doc.id);
        const pct = scroll ? scroll.scrollPercent : 0;
        const isDone = doneSet.has(doc.id) || pct >= 90;
        const isReading = !isDone && (pct >= 5 || openedSet.has(doc.id));
        if (progressFilter === 'saved') return savedSet.has(doc.id);
        if (progressFilter === 'done') return isDone;
        if (progressFilter === 'reading') return isReading;
        return !isDone && !isReading;
      });
    }

    const diffRank = (d?: DocumentDifficulty) =>
      d === 'intro' ? 1 : d === 'advanced' ? 3 : 2;

    if (sortMode === 'az') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    } else if (sortMode === 'shortest') {
      list = [...list].sort(
        (a, b) =>
          estimateReadingMinutes(a.blocks, a.excerpt) -
          estimateReadingMinutes(b.blocks, b.excerpt)
      );
    } else if (sortMode === 'level') {
      list = [...list].sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty));
    } else if (sortMode === 'newest') {
      list = [...list].sort(
        (a, b) => parseDateValue(b.publishedDate) - parseDateValue(a.publishedDate)
      );
    }

    return list;
  }, [
    publishedDocuments,
    debouncedQuery,
    activeCategory,
    activeSubGenre,
    activeCollection,
    difficultyFilter,
    progressFilter,
    savedDocIds,
    completedDocIds,
    openedDocIds,
    sortMode,
  ]);

  const isSearching = debouncedQuery.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDocuments = filteredDocuments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetAllFilters = () => {
    setRawQuery('');
    setDebouncedQuery('');
    setActiveCategory('Tất cả');
    setActiveSubGenre('all');
    setProgressFilter('all');
    setActiveCollectionId(null);
    setDifficultyFilter('all');
    setSortMode('default');
    setPage(1);
  };

  const difficultyCounts = useMemo(() => {
    const counts: Record<DocumentDifficulty, number> = { intro: 0, explore: 0, advanced: 0 };
    for (const d of publishedDocuments) {
      counts[d.difficulty ?? 'explore'] += 1;
    }
    return counts;
  }, [publishedDocuments]);

  const verifiedDocsCount = useMemo(
    () => publishedDocuments.filter((d) => isDocumentVerified(d)).length,
    [publishedDocuments]
  );

  const publishedRoadmapCount = EDITORIAL_TOPIC_ROADMAP.filter((t) =>
    Boolean(t.publishedDocId && publishedDocuments.some((d) => d.id === t.publishedDocId))
  ).length;

  const pageBody = (
    <>
      <div className="mx-auto max-w-[1220px] px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Top Reading Comfort Bar: Synced Font Size Control (persisted in localStorage) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            Tùy chỉnh độ lớn chữ để đọc thoải mái trên mọi thiết bị — đồng bộ cả trang Thư viện và bài đọc chi tiết.
          </p>
          <LibraryFontSizeControl />
        </div>

        {/* 1. Central Academic Search & Autocomplete (Prominent position) */}
        <LibrarySearch
          query={rawQuery}
          onQueryChange={setRawQuery}
          publishedDocuments={publishedDocuments}
          onSelectConcept={(concept) => setSelectedConcept(concept)}
          onSubmitSearch={scrollToCatalog}
        />

        {/* 2. Library Hero + Quick Glossary Bar */}
        <LibraryHero
          totalDocs={publishedDocuments.length}
          verifiedDocsCount={verifiedDocsCount}
          totalCategories={visibleCategories.length}
          totalCollections={publishedCollections.length}
          totalConcepts={LIBRARY_CONCEPTS.length}
          onJumpToCatalog={scrollToCatalog}
          onJumpToCollections={scrollToCollections}
        />

        {!isSearching && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-base font-semibold text-[var(--color-text)]">
                Sổ từ vựng tư duy ({LIBRARY_CONCEPTS.length} thuật ngữ & Thẻ ghi nhớ)
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Tra thuật ngữ A–Z liên thông tới bài đọc và tự kiểm tra ghi nhớ bằng Flashcard.
              </p>
            </div>
            <Link to="/glossary" className="btn-secondary !min-h-9 !px-4 !text-xs shrink-0">
              Mở Sổ thuật ngữ →
            </Link>
          </div>
        )}

        {/* 3. Continue Reading (real progress only; auto-hides when empty) */}
        {!isSearching && <ContinueReading publishedDocuments={publishedDocuments} />}

        {/* 4. Featured Curated Documents */}
        {!isSearching && (
          <FeaturedDocuments
            documents={publishedDocuments}
            onViewAll={() => {
              resetAllFilters();
              scrollToCatalog();
            }}
          />
        )}

        {/* 5. Explore by 6 Core Disciplines */}
        {!isSearching && (
          <CategoryGrid
            categories={visibleCategories}
            publishedDocuments={publishedDocuments}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => {
              setActiveCategory(cat);
              setActiveCollectionId(null);
              setPage(1);
              scrollToCatalog();
            }}
          />
        )}

        {/* 6. Academic Collections ("HÀNH TRÌNH TRI THỨC") */}
        {!isSearching && publishedCollections.length > 0 && (
          <section
            ref={collectionsRef}
            aria-labelledby="collections-heading"
            className="space-y-5 scroll-mt-20"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                Lộ trình đọc có hệ thống
              </p>
              <h2
                id="collections-heading"
                className="mt-1 font-display lib-scale-h2 font-bold text-[var(--color-text)]"
              >
                Hành trình tri thức
              </h2>
              <p className="mt-1 lib-scale-body text-[var(--color-text-muted)]">
                Các bộ sưu tập chuyên đề được sắp xếp theo trình tự đọc từ nền tảng đến phản biện sâu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  documents={publishedDocuments}
                  expanded={expandedCollectionId === collection.id}
                  onToggleExpand={() =>
                    setExpandedCollectionId((prev) =>
                      prev === collection.id ? null : collection.id
                    )
                  }
                  onFilterByCollection={(colId) => {
                    setActiveCollectionId(colId);
                    setActiveCategory('Tất cả');
                    setPage(1);
                    scrollToCatalog();
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6.5. 3-Tier Academic Difficulty Progression */}
        {!isSearching && (
          <section
            aria-labelledby="difficulty-hierarchy-heading"
            data-testid="library-difficulty-hierarchy"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                  Phân cấp học liệu 3 bậc
                </p>
                <h2
                  id="difficulty-hierarchy-heading"
                  className="mt-1 font-display lib-scale-h2 font-bold text-[var(--color-text)]"
                >
                  Đọc theo độ sâu tư duy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDifficultyFilter('all');
                  setGroupByDifficulty(true);
                  scrollToCatalog();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                Xem toàn bộ kho chia theo 3 bậc →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DIFFICULTY_TIERS.map((tier) => {
                const tone = getDifficultyTone(tier.key);
                const count = difficultyCounts[tier.key];
                const isSelected = difficultyFilter === tier.key;
                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => {
                      setDifficultyFilter(isSelected ? 'all' : tier.key);
                      setGroupByDifficulty(false);
                      setPage(1);
                      scrollToCatalog();
                    }}
                    className={`text-left rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/45'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: tone.bg,
                          color: tone.text,
                          borderColor: tone.border,
                        }}
                      >
                        {tier.step} · {tier.label}
                      </span>
                      <span className="font-mono-num text-xs font-semibold text-[var(--color-text-muted)]">
                        {count} bài
                      </span>
                    </div>
                    <div className="mt-2.5 font-display text-base font-semibold text-[var(--color-text)]">
                      {tier.subtitle}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                      {tier.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. Full Paginated Catalog with Filters & Sorting */}
        <section
          ref={catalogRef}
          aria-labelledby="catalog-heading"
          className="space-y-5 pt-2 scroll-mt-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                Kho học liệu đầy đủ
              </p>
              <h2
                id="catalog-heading"
                className="mt-1 font-display lib-scale-h2 font-bold text-[var(--color-text)]"
              >
                {activeCollection
                  ? `Hành trình: ${activeCollection.title}`
                  : activeCategory === 'Tất cả'
                    ? 'Tất cả tài liệu học thuật'
                    : activeCategory}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Chế độ hiển thị danh mục"
                className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => setGroupByDifficulty(false)}
                  aria-pressed={!groupByDifficulty}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    !groupByDifficulty
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Lưới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroupByDifficulty(true);
                    setDifficultyFilter('all');
                  }}
                  aria-pressed={groupByDifficulty}
                  data-testid="group-by-difficulty-btn"
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    groupByDifficulty
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Theo 3 bậc
                </button>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-mono-num">
                Hiển thị <strong className="text-[var(--color-text)]">{filteredDocuments.length}</strong> /{' '}
                {publishedDocuments.length} tài liệu
              </div>
            </div>
          </div>

          {/* Filter Strip: Categories + Difficulty + Sort */}
          <div className="space-y-3">
            {/* Mobile (< 640px): Clean <select> so filter chips never clip or overflow at 390px */}
            <div className="sm:hidden">
              <label htmlFor="mobile-category-select" className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                Lọc theo lĩnh vực
              </label>
              <select
                id="mobile-category-select"
                value={activeCategory}
                onChange={(e) => {
                  const val = e.target.value as 'Tất cả' | DocumentCategory;
                  setActiveCategory(val);
                  setActiveCollectionId(null);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Tất cả">Tất cả lĩnh vực ({publishedDocuments.length})</option>
                {visibleCategories.map((cat) => {
                  const count = publishedDocuments.filter(
                    (d) => normalizeCategoryName(d.category) === cat.name
                  ).length;
                  return (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Desktop / Tablet (sm+): Tablist */}
            <div
              role="tablist"
              aria-label="Lọc tài liệu theo lĩnh vực"
              className="hidden sm:flex items-center gap-2 flex-wrap"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'Tất cả' && !activeCollectionId}
                onClick={() => {
                  setActiveCategory('Tất cả');
                  setActiveCollectionId(null);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCategory === 'Tất cả' && !activeCollectionId
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                Tất cả ({publishedDocuments.length})
              </button>

              {visibleCategories.map((cat) => {
                const count = publishedDocuments.filter(
                  (d) => normalizeCategoryName(d.category) === cat.name
                ).length;
                const selected = activeCategory === cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => {
                      setActiveCategory(cat.name);
                      setActiveCollectionId(null);
                      setPage(1);
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selected
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {cat.shortName} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] font-medium">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  Mức độ:
                </span>
                {(
                  [
                    { key: 'all', label: `Tất cả (${publishedDocuments.length})` },
                    { key: 'intro', label: `Nhập môn (${difficultyCounts.intro})` },
                    { key: 'explore', label: `Khám phá (${difficultyCounts.explore})` },
                    { key: 'advanced', label: `Chuyên sâu (${difficultyCounts.advanced})` },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setDifficultyFilter(item.key);
                      if (item.key !== 'all') setGroupByDifficulty(false);
                      setPage(1);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      difficultyFilter === item.key
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {(activeCollection ||
                  activeCategory !== 'Tất cả' ||
                  activeSubGenre !== 'all' ||
                  progressFilter !== 'all' ||
                  difficultyFilter !== 'all' ||
                  isSearching) && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {availableSubGenres.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="library-subgenre-select" className="text-[var(--color-text-muted)]">
                      Nhóm:
                    </label>
                    <select
                      id="library-subgenre-select"
                      value={activeSubGenre}
                      onChange={(e) => {
                        setActiveSubGenre(e.target.value);
                        setPage(1);
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] max-w-[180px]"
                    >
                      <option value="all">Tất cả thể loại / nhóm</option>
                      {availableSubGenres.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <label htmlFor="library-progress-select" className="text-[var(--color-text-muted)]">
                    Trạng thái:
                  </label>
                  <select
                    id="library-progress-select"
                    value={progressFilter}
                    onChange={(e) => {
                      setProgressFilter(e.target.value as ProgressFilter);
                      setPage(1);
                    }}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="new">Chưa đọc</option>
                    <option value="reading">Đang đọc dở</option>
                    <option value="done">Đã xong</option>
                    <option value="saved">Đã lưu</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="library-sort-select" className="text-[var(--color-text-muted)]">
                    Sắp xếp:
                  </label>
                  <select
                    id="library-sort-select"
                    value={sortMode}
                    onChange={(e) => {
                      setSortMode(e.target.value as SortMode);
                      setPage(1);
                    }}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="default">Tuyển chọn mặc định</option>
                    <option value="az">Tên A → Z</option>
                    <option value="shortest">Ngắn trước</option>
                    <option value="level">Dễ → Khó</option>
                    <option value="newest">Mới cập nhật</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Document Grid, Grouped 3-Tier View, or Empty State */}
          {filteredDocuments.length === 0 ? (
            <EmptyStateCard
              title="Chưa tìm thấy tài liệu phù hợp"
              description="Thử nới rộng từ khóa, đổi mức độ đọc hoặc đặt lại bộ lọc để duyệt toàn bộ kho học liệu."
              action={
                <button type="button" onClick={resetAllFilters} className="btn-primary">
                  Đặt lại toàn bộ bộ lọc
                </button>
              }
            />
          ) : groupByDifficulty && difficultyFilter === 'all' ? (
            <div className="space-y-8" data-testid="grouped-difficulty-catalog">
              {DIFFICULTY_TIERS.map((tier) => {
                const tierDocs = filteredDocuments.filter(
                  (d) => (d.difficulty ?? 'explore') === tier.key
                );
                if (tierDocs.length === 0) return null;
                const tone = getDifficultyTone(tier.key);
                return (
                  <div key={tier.key} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: tone.bg,
                            color: tone.text,
                            borderColor: tone.border,
                          }}
                        >
                          {tier.step} · {tier.label}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {tier.subtitle}
                        </span>
                      </div>
                      <span className="font-mono-num text-xs font-medium text-[var(--color-text-muted)]">
                        {tierDocs.length} bài đọc
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                      {tierDocs.map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                {pagedDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    scrollToCatalog();
                  }}
                  className="pt-4"
                />
              )}
            </>
          )}
        </section>

        {/* 8. Transparent 60-Topic Editorial Curriculum Roadmap */}
        <section
          aria-label="Lộ trình biên soạn học liệu"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                Lộ trình biên soạn minh bạch
              </p>
              <h3 className="mt-1 font-display lib-scale-h3 font-bold text-[var(--color-text)]">
                Khung chương trình {EDITORIAL_TOPIC_ROADMAP.length} chủ đề học thuật ({publishedRoadmapCount} đã xuất bản · {verifiedDocsCount} đạt chuẩn ≥2 nguồn kiểm chứng)
              </h3>
              <p className="mt-1 lib-scale-small text-[var(--color-text-muted)]">
                Mọi bài đọc mới đều trải qua quy trình biên soạn và đối chiếu nguồn tham khảo thực trước khi công bố.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoadmapOpen((prev) => !prev)}
              aria-expanded={roadmapOpen}
              className="btn-secondary !min-h-9 !text-xs shrink-0"
            >
              {roadmapOpen ? (
                <>
                  Thu gọn lộ trình <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Xem danh mục 60 chủ đề <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {roadmapOpen && (
            <div className="mt-5 pt-5 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleCategories.map((cat) => {
                const topics = EDITORIAL_TOPIC_ROADMAP.filter((t) => t.category === cat.name);
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4"
                  >
                    <h4 className="font-display text-sm font-bold text-[var(--color-text)] pb-2 border-b border-[var(--color-border)]">
                      {cat.name}
                    </h4>
                    <ul className="mt-2.5 space-y-2 text-xs">
                      {topics.map((topic) => {
                        const isLive = Boolean(
                          topic.publishedDocId &&
                            publishedDocuments.some((d) => d.id === topic.publishedDocId)
                        );
                        return (
                          <li key={topic.title} className="flex items-start gap-2">
                            {isLive ? (
                              <BookOpenCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--color-text-muted)]/60" />
                            )}
                            {isLive && topic.publishedDocId ? (
                              <Link
                                to={`/library/${topic.publishedDocId}`}
                                className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                              >
                                {topic.title}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  showToast(
                                    `Chủ đề "${topic.title}" hiện đang trong quá trình biên soạn và kiểm chứng nguồn.`,
                                    { variant: 'info' }
                                  )
                                }
                                className="text-left text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                              >
                                {topic.title}{' '}
                                <span className="italic opacity-75">(đang biên soạn)</span>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Interactive Concept Dialog when user selects a concept from Search */}
      <ConceptPopoverDialog
        concept={selectedConcept}
        onClose={() => setSelectedConcept(null)}
        onSelectConcept={(concept) => setSelectedConcept(concept)}
        allPublishedDocuments={publishedDocuments}
      />
    </>
  );

  if (user.isAuthenticated) {
    return <WorkspaceShell>{pageBody}</WorkspaceShell>;
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col overflow-x-clip">
      <PublicHeader />
      <main className="flex-1">{pageBody}</main>
    </div>
  );
}
