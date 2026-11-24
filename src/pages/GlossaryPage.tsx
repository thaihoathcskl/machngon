import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Check,
  FlipHorizontal2,
  Layers,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { PublicHeader, WorkspaceShell } from '../components/layout/AppShell';
import { PageHeader } from '../components/ui/EditorialPrimitives';
import { useToast } from '../components/ui/ToastProvider';
import { LIBRARY_CONCEPTS } from '../content/library/concepts';
import { useApp } from '../lib/AppContext';
import { Link } from '../lib/router';
import { loadMyConceptDefs, saveMyConceptDef } from '../lib/storage';
import { normalizeVietnamese } from '../lib/vietnamese';

const ALPHABET_BUCKETS = ['A', 'B', 'C', 'D', 'Đ', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'Q', 'S', 'T', 'U', 'V', 'X'];

export function GlossaryPage() {
  const { user, publishedDocuments } = useApp();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'list' | 'flashcard'>('list');
  const [activeLetter, setActiveLetter] = useState<string>('all');
  const [myDefs, setMyDefs] = useState<Record<string, string>>(() => loadMyConceptDefs());

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draftDef, setDraftDef] = useState('');

  const docById = useMemo(
    () => new Map(publishedDocuments.map((d) => [d.id, d])),
    [publishedDocuments]
  );

  const sortedConcepts = useMemo(
    () => [...LIBRARY_CONCEPTS].sort((a, b) => a.term.localeCompare(b.term, 'vi')),
    []
  );

  const filteredConcepts = useMemo(() => {
    const q = normalizeVietnamese(query.trim());
    return sortedConcepts.filter((c) => {
      if (activeLetter !== 'all') {
        const firstChar = c.term.trim().charAt(0).toUpperCase();
        const normFirst = normalizeVietnamese(firstChar);
        const normTarget = normalizeVietnamese(activeLetter);
        if (activeLetter === 'Đ') {
          if (firstChar !== 'Đ') return false;
        } else if (normFirst !== normTarget || (activeLetter === 'D' && firstChar === 'Đ')) {
          return false;
        }
      }
      if (!q) return true;
      const haystack = normalizeVietnamese(
        `${c.term} ${c.englishTerm ?? ''} ${c.shortDefinition} ${myDefs[c.term] ?? ''}`
      );
      return haystack.includes(q);
    });
  }, [sortedConcepts, query, activeLetter, myDefs]);

  const currentCard = sortedConcepts[cardIndex % Math.max(1, sortedConcepts.length)];

  const handleOpenCard = (nextIdx: number) => {
    const bounded = (nextIdx + sortedConcepts.length) % sortedConcepts.length;
    setCardIndex(bounded);
    setFlipped(false);
    const term = sortedConcepts[bounded]?.term;
    setDraftDef(term ? myDefs[term] ?? '' : '');
  };

  const handleSavePersonalDef = (term: string, value: string) => {
    const updated = saveMyConceptDef(term, value);
    setMyDefs(updated);
    showToast(
      value.trim()
        ? `Đã lưu định nghĩa cá nhân cho “${term}”.`
        : `Đã xóa định nghĩa cá nhân cho “${term}”.`,
      { variant: 'success' }
    );
  };

  const content = (
    <div className="mx-auto max-w-[1160px] px-5 sm:px-8 py-8 lg:py-10 space-y-7">
      <PageHeader
        kicker="AI Library · Sổ từ vựng tư duy"
        title={`${LIBRARY_CONCEPTS.length} thuật ngữ Ngữ văn, Logic & Triết học`}
        description="Tra nhanh thuật ngữ theo chữ cái hoặc ý nghĩa, xem các bài đọc liên quan và tự kiểm tra ghi nhớ bằng thẻ lật (Flashcard)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('list')}
              className={tab === 'list' ? 'btn-primary !min-h-10 !px-4 !text-xs' : 'btn-secondary !min-h-10 !px-4 !text-xs'}
            >
              <BookMarked className="h-3.5 w-3.5" />
              Danh sách A–Z
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('flashcard');
                setDraftDef(currentCard ? myDefs[currentCard.term] ?? '' : '');
              }}
              className={tab === 'flashcard' ? 'btn-primary !min-h-10 !px-4 !text-xs' : 'btn-secondary !min-h-10 !px-4 !text-xs'}
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
              Thẻ ghi nhớ ({Object.keys(myDefs).length} tự viết)
            </button>
          </div>
        }
      />

      {tab === 'list' ? (
        <section className="space-y-5">
          {/* Search & Alphabet Jump Bar */}
          <div className="rounded-2xl p-4 sm:p-5 surface-card space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm thuật ngữ (vd: ẩn dụ, ngụy biện, Toulmin, hàm ngôn…)"
                  aria-label="Tìm thuật ngữ trong sổ từ vựng"
                  className="input-editorial !pl-10"
                />
              </div>
              <span className="text-xs font-mono-num text-[var(--color-text-muted)] shrink-0">
                Hiển thị {filteredConcepts.length} / {LIBRARY_CONCEPTS.length} thuật ngữ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo chữ cái đầu">
              <button
                type="button"
                onClick={() => setActiveLetter('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                  activeLetter === 'all'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Tất cả
              </button>
              {ALPHABET_BUCKETS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setActiveLetter(letter)}
                  className={`rounded-md px-2 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                    activeLetter === letter
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {filteredConcepts.length === 0 ? (
            <div className="rounded-2xl p-8 text-center surface-card space-y-2">
              <p className="font-display text-lg font-semibold text-[var(--color-text)]">
                Không tìm thấy thuật ngữ phù hợp
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Hãy thử từ khóa ngắn hơn hoặc đặt lại bộ lọc chữ cái.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveLetter('all');
                }}
                className="btn-secondary !min-h-9 !px-4 !text-xs mt-2"
              >
                Xem toàn bộ {LIBRARY_CONCEPTS.length} thuật ngữ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConcepts.map((concept) => {
                const personalDef = myDefs[concept.term];
                const linkedDocs = concept.documentIds
                  .map((id) => docById.get(id))
                  .filter((d): d is NonNullable<typeof d> => Boolean(d));

                return (
                  <article
                    key={concept.id}
                    className="rounded-2xl p-5 surface-card flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
                            {concept.term}
                          </h2>
                          {concept.englishTerm && (
                            <p className="text-xs italic text-[var(--color-text-muted)]">
                              {concept.englishTerm}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[var(--color-primary)] shrink-0">
                          {concept.category}
                        </span>
                      </div>

                      <p className="font-reading text-sm leading-relaxed text-[var(--color-text)]">
                        {concept.shortDefinition}
                      </p>

                      {concept.example && (
                        <p className="text-xs leading-relaxed text-[var(--color-text-muted)] bg-[var(--color-bg)]/70 rounded-lg px-3 py-2 border border-[var(--color-border)]/70">
                          <strong className="text-[var(--color-text)]">Ví dụ:</strong> {concept.example}
                        </p>
                      )}

                      {personalDef && (
                        <p className="text-xs leading-relaxed text-[var(--color-text)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface)_90%)] rounded-lg px-3 py-2 border border-[var(--color-success)]/35">
                          <strong className="text-[var(--color-success)]">Cách hiểu của bạn:</strong>{' '}
                          {personalDef}
                        </p>
                      )}
                    </div>

                    {linkedDocs.length > 0 && (
                      <div className="pt-2.5 border-t border-[var(--color-border)]/75 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-[var(--color-text-muted)]">Xuất hiện trong:</span>
                        {linkedDocs.slice(0, 3).map((d) => (
                          <Link
                            key={d.id}
                            to={`/library/${d.id}`}
                            className="font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {d.title.split(':')[0]}
                          </Link>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-2xl mx-auto space-y-5">
          {currentCard && (
            <div className="rounded-2xl p-6 sm:p-8 surface-card space-y-5">
              <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)]">
                  <Layers className="h-3.5 w-3.5" />
                  Thẻ {(cardIndex % sortedConcepts.length) + 1} / {sortedConcepts.length}
                </span>
                <span>{currentCard.category}</span>
              </div>

              <button
                type="button"
                onClick={() => setFlipped((v) => !v)}
                className="w-full min-h-[210px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/65 p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
              >
                {!flipped ? (
                  <>
                    <span className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-text-muted)]">
                      Nhấn để lật xem định nghĩa
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-primary)]">
                      {currentCard.term}
                    </h2>
                    {currentCard.englishTerm && (
                      <p className="text-sm italic text-[var(--color-text-muted)]">
                        {currentCard.englishTerm}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 text-left w-full">
                    <div className="text-xs font-semibold text-[var(--color-primary)]">
                      Định nghĩa học thuật — {currentCard.term}
                    </div>
                    <p className="font-reading text-base leading-relaxed text-[var(--color-text)]">
                      {currentCard.shortDefinition}
                    </p>
                    {currentCard.example && (
                      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                        <strong>Ví dụ:</strong> {currentCard.example}
                      </p>
                    )}
                  </div>
                )}
              </button>

              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]/80">
                <label
                  htmlFor="personal-def-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  Định nghĩa bằng lời của chính bạn (khuyến khích tự diễn đạt trước khi lật thẻ)
                </label>
                <textarea
                  id="personal-def-input"
                  rows={2}
                  value={draftDef}
                  onChange={(e) => setDraftDef(e.target.value)}
                  placeholder={`Theo cách hiểu của bạn, "${currentCard.term}" nghĩa là…`}
                  className="textarea-editorial"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSavePersonalDef(currentCard.term, draftDef)}
                    className="btn-secondary !min-h-9 !px-3.5 !text-xs"
                  >
                    <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    Lưu cách hiểu cá nhân
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFlipped((v) => !v)}
                      className="btn-secondary !min-h-9 !px-3.5 !text-xs"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      {flipped ? 'Úp thẻ' : 'Lật thẻ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCard(cardIndex - 1)}
                      className="btn-secondary !min-h-9 !px-3 !text-xs"
                    >
                      ← Trước
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCard(cardIndex + 1)}
                      className="btn-primary !min-h-9 !px-3.5 !text-xs"
                    >
                      Thẻ tiếp
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );

  if (user.isAuthenticated) {
    return <WorkspaceShell>{content}</WorkspaceShell>;
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col overflow-x-clip">
      <PublicHeader />
      <main className="flex-1">{content}</main>
    </div>
  );
}
