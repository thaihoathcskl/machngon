import React, { useEffect } from 'react';
import { ArrowUpRight, BookOpen, Lightbulb, Sparkles, X } from 'lucide-react';
import { LIBRARY_CONCEPTS } from '../../content/library/concepts';
import { Link, useRouter } from '../../lib/router';
import { setLabHandoff } from '../../lib/storage';
import { LibraryConcept, LibraryDocument } from '../../lib/types';
import { dispatchQuickExplain } from '../dictionary/QuickDictionarySuite';

interface ConceptModalProps {
  concept: LibraryConcept | null;
  onClose: () => void;
  onSelectConcept: (concept: LibraryConcept) => void;
  activeDocument?: LibraryDocument;
  allPublishedDocuments: LibraryDocument[];
}

/**
 * Accessible click/tap dialog (desktop centered popover, mobile bottom sheet)
 * displaying concept definition, student-friendly example, related concepts,
 * and direct handoff to Concept Lab.
 */
export function ConceptPopoverDialog({
  concept,
  onClose,
  onSelectConcept,
  activeDocument,
  allPublishedDocuments,
}: ConceptModalProps) {
  const { navigate } = useRouter();

  useEffect(() => {
    if (!concept) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [concept, onClose]);

  if (!concept) return null;

  const relatedConcepts = concept.relatedConceptIds
    .map((id) => LIBRARY_CONCEPTS.find((item) => item.id === id))
    .filter((item): item is LibraryConcept => Boolean(item));

  const linkedDocs = concept.documentIds
    .map((id) => allPublishedDocuments.find((doc) => doc.id === id))
    .filter((doc): doc is LibraryDocument => Boolean(doc));

  const handleDeepDiveInLab = () => {
    const contextDoc = activeDocument ?? linkedDocs[0];
    if (contextDoc) {
      setLabHandoff({
        labType: 'concept',
        resourceContextId: contextDoc.id,
        resourceTitle: contextDoc.title,
        quoteText: `${concept.term}${concept.englishTerm ? ` (${concept.englishTerm})` : ''}: ${concept.shortDefinition}`,
        blockLabel: 'Khái niệm trọng tâm',
        actionIntent: 'analyze_concept',
      });
      onClose();
      navigate(`/lab?mode=concept&resource=${encodeURIComponent(contextDoc.id)}`);
    } else {
      onClose();
      navigate('/lab?mode=concept');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[86vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              Thuật ngữ · {concept.category}
            </p>
            <h3
              id="concept-dialog-title"
              className="mt-1 font-display text-xl font-bold text-[var(--color-text)]"
            >
              {concept.term}
            </h3>
            {concept.englishTerm && (
              <p className="text-xs italic text-[var(--color-text-muted)]">
                {concept.englishTerm}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giải thích khái niệm"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 font-reading text-sm sm:text-[15px] leading-relaxed text-[var(--color-text)]">
          {concept.shortDefinition}
        </p>

        {concept.example && (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              Ví dụ dễ hiểu
            </p>
            <p className="mt-1 font-reading text-sm leading-relaxed text-[var(--color-text-muted)]">
              {concept.example}
            </p>
          </div>
        )}

        {relatedConcepts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">
              Khái niệm liên quan
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedConcepts.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectConcept(rel)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  {rel.term}
                </button>
              ))}
            </div>
          </div>
        )}

        {linkedDocs.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">
              Xuất hiện trong tài liệu
            </p>
            <div className="mt-2 space-y-1.5">
              {linkedDocs.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/library/${doc.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                    <span className="truncate">{doc.title}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              const ctx = activeDocument
                ? `${concept.term} — ${concept.shortDefinition}`
                : concept.shortDefinition;
              onClose();
              dispatchQuickExplain(concept.term, ctx, activeDocument?.title, true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/45 bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface)_92%)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Giải thích sâu hơn theo ngữ cảnh bằng AI
          </button>
          <button
            type="button"
            onClick={handleDeepDiveInLab}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Mở trong Concept Lab
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Safely renders prose text with interactive underlined buttons for the first occurrence
 * of each linked concept alias (pure React nodes, zero dangerouslySetInnerHTML).
 */
export function renderTextWithConceptHighlights(
  text: string,
  concepts: LibraryConcept[],
  onSelectConcept: (concept: LibraryConcept) => void
): React.ReactNode {
  if (!text || concepts.length === 0) return text;

  const aliases: Array<{ alias: string; concept: LibraryConcept }> = [];
  for (const concept of concepts) {
    const terms = concept.matchAliases && concept.matchAliases.length > 0
      ? concept.matchAliases
      : [concept.term];
    for (const term of terms) {
      if (term.trim().length >= 3) {
        aliases.push({ alias: term.trim(), concept });
      }
    }
  }

  if (aliases.length === 0) return text;

  // Prefer longer phrases first
  aliases.sort((a, b) => b.alias.length - a.alias.length);

  const lowerText = text.toLowerCase();
  const matchedSpans: Array<{ start: number; end: number; concept: LibraryConcept }> = [];
  const usedConceptIds = new Set<string>();

  const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
  const isBoundedMatch = (source: string, start: number, end: number): boolean => {
    const prev = start > 0 ? source[start - 1] : '';
    const next = end < source.length ? source[end] : '';
    return (!prev || !WORD_CHAR_RE.test(prev)) && (!next || !WORD_CHAR_RE.test(next));
  };

  for (const { alias, concept } of aliases) {
    if (usedConceptIds.has(concept.id)) continue;
    const lowerAlias = alias.toLowerCase();
    let searchFrom = 0;
    let matchedIdx = -1;
    let matchedEnd = -1;

    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(lowerAlias, searchFrom);
      if (idx < 0) break;
      const end = idx + alias.length;
      if (isBoundedMatch(text, idx, end)) {
        const overlaps = matchedSpans.some((s) => !(end <= s.start || idx >= s.end));
        if (!overlaps) {
          matchedIdx = idx;
          matchedEnd = end;
          break;
        }
      }
      searchFrom = idx + 1;
    }

    if (matchedIdx >= 0) {
      matchedSpans.push({ start: matchedIdx, end: matchedEnd, concept });
      usedConceptIds.add(concept.id);
    }
  }

  if (matchedSpans.length === 0) return text;

  matchedSpans.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  matchedSpans.forEach((span, i) => {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    const matchedText = text.slice(span.start, span.end);
    nodes.push(
      <button
        key={`${span.concept.id}-${i}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectConcept(span.concept);
        }}
        title={`Nhấn để xem giải thích khái niệm: ${span.concept.term}`}
        className="inline font-medium text-[var(--color-primary)] underline decoration-dotted decoration-[var(--color-gold)] underline-offset-4 hover:decoration-solid hover:bg-[var(--color-primary-soft)] rounded px-0.5 transition-colors cursor-pointer"
      >
        {matchedText}
      </button>
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
