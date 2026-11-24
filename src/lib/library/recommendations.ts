import { DEFAULT_LIBRARY_COLLECTIONS } from '../../content/library/collections.ts';
import { LIBRARY_CONCEPTS } from '../../content/library/concepts.ts';
import type { ReadingScrollState } from '../storage.ts';
import type { LibraryConcept, LibraryDocument, UserProfile } from '../types.ts';
import { normalizeVietnameseText, scoreDocumentMatch } from './search.ts';
import { normalizeCategoryName } from './validation.ts';

/**
 * Computes related published documents for DocumentDetailPage right sidebar
 * and Lab contextual follow-up reading.
 */
export function getRelatedDocuments(
  currentDoc: LibraryDocument,
  allPublishedDocs: LibraryDocument[],
  limit = 3
): LibraryDocument[] {
  const currentCategory = normalizeCategoryName(currentDoc.category);
  const currentConcepts = new Set(currentDoc.relatedConceptIds ?? []);
  const currentCollections = new Set(currentDoc.collectionIds ?? []);
  const currentTags = new Set(
    [...currentDoc.keywords, ...(currentDoc.tags ?? [])].map((t) => normalizeVietnameseText(t))
  );

  const scored = allPublishedDocs
    .filter((candidate) => candidate.id !== currentDoc.id && candidate.status === 'published')
    .map((candidate) => {
      let score = 0;

      if (normalizeCategoryName(candidate.category) === currentCategory) {
        score += 12;
      }

      for (const conceptId of candidate.relatedConceptIds ?? []) {
        if (currentConcepts.has(conceptId)) score += 9;
      }

      for (const colId of candidate.collectionIds ?? []) {
        if (currentCollections.has(colId)) score += 8;
      }

      const candidateTags = [...candidate.keywords, ...(candidate.tags ?? [])].map((t) =>
        normalizeVietnameseText(t)
      );
      for (const tag of candidateTags) {
        if (currentTags.has(tag)) score += 4;
      }

      if (candidate.featured) score += 1;

      return { doc: candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title, 'vi'));

  return scored.slice(0, limit).map((item) => item.doc);
}

/**
 * Unified personalized recommendations for Dashboard ("Có thể bạn muốn khám phá").
 * Strictly recommends published documents based on onboarding interests, reading history, and featured balance.
 */
export function getPersonalizedRecommendations(
  user: UserProfile,
  allPublishedDocs: LibraryDocument[],
  readingProgressMap: Record<string, ReadingScrollState>,
  savedDocIds: string[],
  limit = 3
): LibraryDocument[] {
  const published = allPublishedDocs.filter((doc) => doc.status === 'published');
  if (published.length === 0) return [];

  const preferredCategories = new Set(
    (user.interests ?? []).map((interest) => normalizeCategoryName(interest))
  );
  const exploreQuery = normalizeVietnameseText(user.exploreTopic ?? '');
  const savedSet = new Set(savedDocIds);

  // Identify the next unread document in any collection the user has started reading
  const nextCollectionDocIds = new Set<string>();
  for (const collection of DEFAULT_LIBRARY_COLLECTIONS) {
    const hasStartedAny = collection.documentIds.some((docId) => {
      const progress = readingProgressMap[docId];
      return Boolean(progress && progress.scrollPercent >= 5);
    });
    if (!hasStartedAny) continue;
    const nextUnreadId = collection.documentIds.find((docId) => {
      const progress = readingProgressMap[docId];
      return (!progress || progress.scrollPercent < 85) && !savedSet.has(docId);
    });
    if (nextUnreadId) {
      nextCollectionDocIds.add(nextUnreadId);
    }
  }

  // Exclude already-saved docs and docs completed >= 90% from primary recommendations
  const primaryPool = published.filter((doc) => {
    const progress = readingProgressMap[doc.id];
    const completed = Boolean(progress && progress.scrollPercent >= 90);
    return !savedSet.has(doc.id) && !completed;
  });

  const scoreCandidates = (pool: LibraryDocument[]) =>
    pool
      .map((doc) => {
        let score = 0;
        const docCategory = normalizeCategoryName(doc.category);
        const progress = readingProgressMap[doc.id];

        if (nextCollectionDocIds.has(doc.id)) {
          score += 10;
        }

        if (preferredCategories.has(docCategory)) {
          score += 14;
        }

        if (exploreQuery) {
          const match = scoreDocumentMatch(doc, exploreQuery);
          if (match > 0) score += Math.min(18, match);
        }

        // Prioritize documents the user hasn't finished yet
        if (!progress) {
          score += 5;
        } else if (progress.scrollPercent < 85) {
          score += 3;
        } else {
          score -= 8;
        }

        if (doc.featured) score += 4;
        if (doc.difficulty === 'intro') score += 2;

        return { doc, score };
      })
      .sort((a, b) => b.score - a.score);

  const scoredPrimary = scoreCandidates(primaryPool);
  const scoredFallback =
    scoredPrimary.length < limit
      ? scoreCandidates(
          published.filter((doc) => !primaryPool.some((candidate) => candidate.id === doc.id))
        )
      : [];
  const scored = [...scoredPrimary, ...scoredFallback];

  // Pick diverse categories when scores are close so recommendations feel broad and inspiring
  const selected: LibraryDocument[] = [];
  const usedCategories = new Set<string>();

  for (const item of scored) {
    if (selected.length >= limit) break;
    const cat = normalizeCategoryName(item.doc.category);
    if (!usedCategories.has(cat) || selected.length >= 2) {
      selected.push(item.doc);
      usedCategories.add(cat);
    }
  }

  for (const item of scored) {
    if (selected.length >= limit) break;
    if (!selected.some((d) => d.id === item.doc.id)) {
      selected.push(item.doc);
    }
  }

  return selected.slice(0, limit);
}

/**
 * Contextual follow-up reading inside Thinking Lab based on attached document and latest discussion topic.
 */
export function getLabFollowUpDocuments(
  activeResourceId: string | undefined,
  recentTopicText: string,
  allPublishedDocs: LibraryDocument[],
  concepts: LibraryConcept[] = LIBRARY_CONCEPTS,
  limit = 3
): LibraryDocument[] {
  const published = allPublishedDocs.filter((d) => d.status === 'published');
  if (published.length === 0) return [];

  if (activeResourceId) {
    const activeDoc = published.find((d) => d.id === activeResourceId);
    if (activeDoc) {
      return getRelatedDocuments(activeDoc, published, limit);
    }
  }

  const normalized = normalizeVietnameseText(recentTopicText);
  if (normalized.length >= 3) {
    const tokens = normalized
      .split(' ')
      .filter((t) => t.length >= 3)
      .slice(0, 8);
    if (tokens.length > 0) {
      const scored = published
        .map((doc) => {
          let score = 0;
          for (const token of tokens) {
            score += scoreDocumentMatch(doc, token, concepts);
          }
          return { doc, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        return scored.slice(0, limit).map((item) => item.doc);
      }
    }
  }

  return published.filter((d) => d.featured).slice(0, limit);
}
