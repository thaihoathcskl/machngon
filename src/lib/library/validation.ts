import { LEGACY_CATEGORY_MAP } from '../../content/library/categories.ts';
import type {
  DocumentBlock,
  DocumentCategory,
  DocumentSection,
  LabDifficultyLevel,
  LibraryDocument,
} from '../types.ts';

/**
 * Normalizes legacy or dash-variant category names into canonical Library categories.
 */
export function normalizeCategoryName(category: string): DocumentCategory {
  const key = category.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
  return LEGACY_CATEGORY_MAP[key] ?? (category.trim() as DocumentCategory);
}

/**
 * Computes actual Vietnamese reading duration directly from document text:
 * Math.max(1, Math.ceil(wordCount / 200))
 */
export function estimateReadingMinutes(blocks: DocumentBlock[], excerpt = ''): number {
  const fullText = [
    excerpt,
    ...blocks.map((b) => `${b.heading ?? ''} ${b.content} ${b.citation ?? ''}`),
  ].join(' ');
  const words = fullText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 200));
}

export function isSafeHttpUrl(url?: string): boolean {
  if (!url || !url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Transparent verification standard:
 * A document is marked "Đã kiểm chứng nguồn" ONLY when it is verified, not in editing/pending_source,
 * and contains at least 2 verified academic references.
 */
export function isDocumentVerified(doc: LibraryDocument): boolean {
  if (doc.verified !== true) return false;
  if (doc.reviewStatus === 'editing' || doc.reviewStatus === 'pending_source') return false;
  const refs = doc.references ?? [];
  const verifiedCount = refs.filter((ref) => ref.verified).length;
  return verifiedCount >= 2;
}

/**
 * Deterministic anchor ID for heading blocks so TOC links match rendered headings 100% across all documents.
 */
export function getBlockHeadingAnchorId(headingOrdinal: number): string {
  return `sec-${headingOrdinal}`;
}

export interface DerivedTocItem extends DocumentSection {
  blockId: string;
}

/**
 * Automatically derives the Table of Contents from all actual heading blocks in a document.
 * Guarantees 100% parity between TOC entries and section headings (zero stale or missing sections).
 */
export function deriveDocumentToc(doc: LibraryDocument): DerivedTocItem[] {
  const items: DerivedTocItem[] = [];
  let ordinal = 0;
  for (const block of doc.blocks) {
    const heading = block.heading?.trim();
    if (!heading) continue;
    ordinal += 1;
    items.push({
      id: getBlockHeadingAnchorId(ordinal),
      title: `${ordinal}. ${heading}`,
      blockId: block.id,
    });
  }
  if (items.length > 0) return items;
  return (doc.sections ?? []).map((sec, idx) => ({
    id: sec.id || getBlockHeadingAnchorId(idx + 1),
    title: sec.title,
    blockId: doc.blocks[idx]?.id ?? sec.id,
  }));
}

export function getDifficultyLabel(difficulty?: LibraryDocument['difficulty']): string {
  switch (difficulty) {
    case 'intro':
      return 'Nhập môn (Cơ bản)';
    case 'advanced':
      return 'Chuyên sâu (Nâng cao)';
    case 'explore':
    default:
      return 'Khám phá (Trung cấp)';
  }
}

export function getDifficultyShortLabel(difficulty?: LibraryDocument['difficulty']): string {
  switch (difficulty) {
    case 'intro':
      return 'Nhập môn';
    case 'advanced':
      return 'Chuyên sâu';
    case 'explore':
    default:
      return 'Khám phá';
  }
}

export function getDifficultyTone(difficulty?: LibraryDocument['difficulty']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (difficulty) {
    case 'intro':
      return {
        bg: 'color-mix(in srgb, var(--color-success) 12%, var(--color-surface) 88%)',
        text: 'var(--color-success)',
        border: 'color-mix(in srgb, var(--color-success) 32%, var(--color-border) 68%)',
      };
    case 'advanced':
      return {
        bg: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface) 88%)',
        text: 'var(--color-primary)',
        border: 'color-mix(in srgb, var(--color-primary) 32%, var(--color-border) 68%)',
      };
    case 'explore':
    default:
      return {
        bg: 'color-mix(in srgb, var(--color-gold) 14%, var(--color-surface) 86%)',
        text: 'var(--color-gold)',
        border: 'color-mix(in srgb, var(--color-gold) 36%, var(--color-border) 64%)',
      };
  }
}

export function getLabDifficultyLabel(difficulty?: LabDifficultyLevel): string {
  switch (difficulty) {
    case 'basic':
      return 'Người mới bắt đầu';
    case 'advanced':
      return 'Chuyên gia';
    case 'intermediate':
    default:
      return 'Tầm trung';
  }
}

export function getLabDifficultyDescription(difficulty?: LabDifficultyLevel): string {
  switch (difficulty) {
    case 'basic':
      return 'Ngôn ngữ gần gũi, dẫn dắt từng bước, ưu tiên ví dụ đời thường dễ nắm bắt.';
    case 'advanced':
      return 'Phản biện chặt chẽ, soi sâu giả định triết học – logic và yêu cầu dẫn chứng rõ ràng.';
    case 'intermediate':
    default:
      return 'Cân bằng giữa gợi mở tự nhiên và kiểm chứng lập luận, phù hợp luyện tranh biện THPT.';
  }
}

export function getReviewStatusLabel(status?: LibraryDocument['reviewStatus']): string {
  switch (status) {
    case 'editing':
      return 'Chờ biên tập';
    case 'pending_source':
      return 'Chờ kiểm tra nguồn';
    case 'verified':
      return 'Đã kiểm duyệt';
    case 'published':
      return 'Đã xuất bản';
    case 'archived':
      return 'Đã lưu trữ';
    default:
      return 'Chưa phân loại';
  }
}
