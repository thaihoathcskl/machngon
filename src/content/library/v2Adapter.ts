import { normalizeVietnamese } from '../../lib/vietnamese.ts';
import { estimateReadingMinutes, isSafeHttpUrl } from '../../lib/library/validation.ts';
import type {
  ArticleReference,
  DocumentBlock,
  DocumentCategory,
  DocumentDifficulty,
  DocumentSection,
  LibraryConcept,
  LibraryDocument,
} from '../../lib/types.ts';
import { RAW_V2_GLOSS } from './data/v2GlossData.ts';
import { RAW_V2_LIBRARY, type RawV2Article } from './data/v2LibraryData.ts';

/**
 * Legacy V1 document slug aliases mapped to the new machngon-v2 catalog IDs
 * so existing bookmarks/saved items seamlessly open the corresponding article.
 */
export const LEGACY_DOCUMENT_ID_ALIAS: Record<string, string> = {
  'triet-hoc-hien-sinh-con-nguoi-va-su-tu-do': 'triet-hoc-hien-sinh',
  'ngon-ngu-va-tu-duy-moi-lien-he-bien-chung': 'ngon-ngu-va-tu-duy',
  'phong-cach-ngon-ngu-va-an-du-trong-doi-song': 'an-du-y-niem',
  'ngu-dung-hoc-va-ham-ngon-trong-giao-tiep': 'ngu-dung-hoc-va-ham-ngon',
  'ky-hieu-hoc-va-cau-truc-cua-nghia': 'ki-hieu-hoc',
  've-dep-ham-suc-cua-tho-ca-co-dien-viet-nam': 'tho-duong-luat-thi-phap',
  'nguoi-ke-chuyen-va-diem-nhin-tu-su': 'diem-nhin-nguoi-ke-chuyen',
  'ly-thuyet-tiep-nhan-va-vai-tro-cua-nguoi-doc': 'ly-thuyet-tiep-nhan',
  'lien-van-ban-va-doi-thoai-trong-van-hoc': 'lien-van-ban',
  'phuong-phap-doi-thoai-socrates-va-nghe-thuat-dat-cau-hoi': 'phuong-phap-socrates',
  'dao-duc-hoc-duc-hanh-va-hanh-phuc-aristotle': 'aristotle-duc-hanh',
  'chu-nghia-khac-ky-va-tu-do-noi-tam': 'chu-nghia-khac-ky',
  'nguy-bien-trong-dien-ngon-cong-cong': 'nguy-bien-thuong-gap',
  'mo-hinh-lap-luan-toulmin-trong-viet-hoc-thuat': 'mo-hinh-lap-luan-toulmin',
  'nguyen-tac-bac-ai-va-nghe-thuat-phan-bien': 'nguyen-tac-bac-ai',
  'thien-kien-nhan-thuc-va-bay-tu-duy-nhanh': 'thien-kien-nhan-thuc',
  'phan-biet-su-kien-dien-giai-va-gia-dinh-ngam': 'su-kien-dien-giai-gia-dinh',
  'kiem-chung-thong-tin-va-doc-hieu-nguon-tin': 'nhan-dien-tin-gia',
  'tri-tue-nhan-tao-va-dao-duc-trach-nhiem': 'ai-va-dao-duc',
  'truyen-thong-so-va-khong-gian-cong-cong': 'dien-ngon-mang-xa-hoi',
  'sinh-thai-hoc-van-hoa-va-phat-trien-ben-vung': 'van-hoc-va-moi-truong',
};

const CRITICAL_THINKING_IDS = new Set([
  'su-kien-dien-giai-gia-dinh',
  'thien-kien-nhan-thuc',
  'phuong-phap-socrates',
  'nguyen-tac-bac-ai',
]);

const FEATURED_V2_IDS = new Set([
  'nam-cao-chi-pheo',
  'tho-duong-luat-thi-phap',
  'mo-hinh-lap-luan-toulmin',
  'triet-hoc-hien-sinh',
  'hsgqg-2024-nlxh-trai-nghiem-chia-se',
  'hsgqg-2025-nlvh-camus-nghe-si',
  'ngon-ngu-va-tu-duy',
  'ai-va-dao-duc',
]);

export function mapV2Category(article: RawV2Article): DocumentCategory {
  if (CRITICAL_THINKING_IDS.has(article.i) || article.g === 'Tư duy phản biện') {
    return 'Tư duy phản biện';
  }
  switch (article.f) {
    case 'vh':
      return 'Văn học và lý luận văn học';
    case 'nn':
      return 'Ngôn ngữ học';
    case 'lt':
      return 'Logic và lập luận';
    case 'th':
      return 'Triết học và tư tưởng';
    case 'tt':
    case 'kh':
    default:
      return 'Kiến thức liên ngành';
  }
}

export function mapV2Cover(article: RawV2Article): { src: string; alt: string } {
  if (CRITICAL_THINKING_IDS.has(article.i) || article.g === 'Tư duy phản biện') {
    return {
      src: '/assets/images/cover_pb.jpg',
      alt: `Minh họa tư duy phản biện cho bài đọc ${article.t}`,
    };
  }
  switch (article.f) {
    case 'vh':
      return {
        src: '/assets/images/cover_vh.jpg',
        alt: `Minh họa văn học cổ điển cho bài đọc ${article.t}`,
      };
    case 'nn':
      return {
        src: '/assets/images/cover_nn.jpg',
        alt: `Minh họa thư phòng ngôn ngữ học cho bài đọc ${article.t}`,
      };
    case 'lt':
      return {
        src: '/assets/images/cover_lt.jpg',
        alt: `Minh họa logic và lập luận cho bài đọc ${article.t}`,
      };
    case 'th':
      return {
        src: '/assets/images/cover_th.jpg',
        alt: `Minh họa không gian triết học cho bài đọc ${article.t}`,
      };
    case 'tt':
      return {
        src: '/assets/images/cover_tt.jpg',
        alt: `Minh họa giảng đường truyền thông số cho bài đọc ${article.t}`,
      };
    case 'kh':
    default:
      return {
        src: '/assets/images/cover_kh.jpg',
        alt: `Minh họa thư viện liên ngành cho bài đọc ${article.t}`,
      };
  }
}

export function mapV2Difficulty(level: 1 | 2 | 3): DocumentDifficulty {
  if (level === 1) return 'intro';
  if (level === 3) return 'advanced';
  return 'explore';
}

function slugifyTerm(term: string): string {
  const base = normalizeVietnamese(term)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'thuat-ngu';
}

function parseV2Reference(raw: string, docId: string, index: number): ArticleReference {
  const parts = raw.split('|').map((s) => s.trim());
  const titlePart = parts[0] || raw.trim();
  const maybeUrl = parts[1];
  const validUrl = maybeUrl && isSafeHttpUrl(maybeUrl) ? maybeUrl : undefined;

  const yearMatch = titlePart.match(/\((1[0-9]{3}|20[0-9]{2})[^)]*\)/);
  const publicationYear = yearMatch ? Number(yearMatch[1]) : undefined;

  return {
    id: `${docId}-ref-${index + 1}`,
    title: titlePart,
    url: validUrl,
    publicationYear: Number.isFinite(publicationYear) ? publicationYear : undefined,
    verified: true,
  };
}

function buildV2Blocks(article: RawV2Article): {
  blocks: DocumentBlock[];
  sections: DocumentSection[];
} {
  const blocks: DocumentBlock[] = [];
  let ordinal = 0;

  const pushBlock = (
    type: DocumentBlock['type'],
    heading: string,
    content: string,
    options?: { label?: string; citation?: string }
  ) => {
    ordinal += 1;
    const sectionId = `sec-${ordinal}`;
    blocks.push({
      id: `${article.i}-b-${ordinal}`,
      sectionId,
      type,
      heading,
      label: options?.label,
      content,
      citation: options?.citation,
    });
  };

  if (article.de && article.de.trim()) {
    pushBlock('quote', 'Đề bài & bối cảnh tham khảo', article.de.trim(), {
      label: 'Đề thi chọn HSG Quốc gia',
      citation: article.a,
    });
  }

  if (article.k && article.k.length > 0) {
    const formattedKeyPoints = article.k
      .map((point, idx) => `${idx + 1}. ${point.trim()}`)
      .join('\n\n');
    pushBlock('concept', 'Luận điểm cốt lõi', formattedKeyPoints, {
      label: 'Hệ thống ý chính',
    });
  }

  if (article.b && article.b.length > 0) {
    for (const sec of article.b) {
      const bodyText = sec.p
        .map((para) => para.trim())
        .filter(Boolean)
        .join('\n\n');
      if (bodyText) {
        pushBlock('prose', sec.h.trim(), bodyText);
      }
    }
  }

  if (article.e && article.e.length > 0) {
    const examplesText = article.e
      .map((ex, idx) => `Ví dụ ${idx + 1}: ${ex.trim()}`)
      .join('\n\n');
    pushBlock('concept', 'Ví dụ minh họa', examplesText, {
      label: 'Ví dụ thực hành',
    });
  }

  if (article.n && article.n.length > 0) {
    for (const item of article.n) {
      const excerptBody = item.task?.trim()
        ? `${item.txt.trim()}\n\nGợi ý đọc hiểu: ${item.task.trim()}`
        : item.txt.trim();
      pushBlock('quote', item.t.trim(), excerptBody, {
        label: 'Ngữ liệu đối chiếu',
        citation: item.src?.trim(),
      });
    }
  }

  if (article.q && article.q.length > 0) {
    const questionsText = article.q
      .map((question, idx) => `${idx + 1}. ${question.trim()}`)
      .join('\n\n');
    pushBlock('question', 'Câu hỏi gợi mở & phản biện', questionsText, {
      label: 'Đối thoại tư duy',
    });
  }

  if (article.x && article.x.trim()) {
    pushBlock('counterargument', 'Bài tập thực hành', article.x.trim(), {
      label: 'Vận dụng & tự kiểm chứng',
    });
  }

  const sections: DocumentSection[] = blocks
    .filter((b) => Boolean(b.heading))
    .map((b, idx) => ({
      id: b.sectionId,
      title: `${idx + 1}. ${b.heading}`,
    }));

  return { blocks, sections };
}

const CONCEPT_ENRICHMENTS: Record<string, { englishTerm?: string; example?: string }> = {
  'sapir-whorf': {
    englishTerm: 'Linguistic Relativity (Sapir-Whorf Hypothesis)',
    example:
      'Hệ thống đại từ xưng hô phong phú trong tiếng Việt buộc người nói định vị quan hệ tuổi tác và thân sơ trước khi mở lời.',
  },
  'an-du-y-niem': {
    englishTerm: 'Conceptual Metaphor',
    example:
      'Khi nói "tiết kiệm thời gian" hay "lãng phí tuổi trẻ", ta đang tư duy theo ẩn dụ ý niệm THỜI GIAN LÀ TIỀN BẠC.',
  },
  'ham-ngon': {
    englishTerm: 'Conversational Implicature',
    example:
      'Câu "Trời tối rồi đấy" có hiển ngôn là nhận xét thời gian nhưng hàm ngôn có thể là lời nhắc ra về.',
  },
  'nguyen-tac-bac-ai': {
    englishTerm: 'Principle of Charity',
    example:
      'Trước khi phản bác, hãy diễn đạt lại luận điểm của đối phương ở dạng hợp lí nhất: "Nếu tôi hiểu đúng, bạn cho rằng…"',
  },
  steelman: {
    englishTerm: 'Steelmanning',
    example:
      'Trình bày phiên bản thuyết phục nhất của quan điểm trái chiều rồi mới phân tích giới hạn của nó.',
  },
  'nguoi-rom': {
    englishTerm: 'Straw Man Fallacy',
    example:
      'Bóp méo đề xuất "giảm bài tập về nhà" thành "muốn học sinh không học gì cả" để dễ công kích.',
  },
  'thien-kien-xac-nhan': {
    englishTerm: 'Confirmation Bias',
    example:
      'Chỉ tìm đọc các bài viết củng cố nỗi lo về một ngành học và bỏ qua dữ liệu tuyển sinh, việc làm khách quan.',
  },
  'lien-van-ban': {
    englishTerm: 'Intertextuality',
    example:
      'Trần Tế Xương vận dụng sáng tạo hình ảnh "thân cò" từ ca dao vào bài Thương vợ để mở rộng tầng nghĩa mới.',
  },
  'tam-don-doi': {
    englishTerm: 'Horizon of Expectations',
    example:
      'Thơ tự do không vần từng gây ngỡ ngàng cho độc giả quen thơ Đường luật nhưng dần trở thành chuẩn mực quen thuộc.',
  },
  'khoang-trong-van-ban': {
    englishTerm: 'Textual Gaps (Wolfgang Iser)',
    example:
      'Chi tiết cái lò gạch cũ bỏ không ở cuối Chí Phèo là khoảng trống mời người đọc suy ngẫm về vòng lặp bi kịch.',
  },
  'hien-sinh': {
    englishTerm: 'Existentialism',
    example:
      'Theo Sartre, nói "tôi không có lựa chọn nào khác" thường là biểu hiện của ngụy tín nhằm né tránh trách nhiệm tự do.',
  },
  eudaimonia: {
    englishTerm: 'Human Flourishing',
    example:
      'Sống viên mãn thông qua việc rèn luyện đức hạnh như can đảm, công bằng và tiết độ thành thói quen hằng ngày.',
  },
  'khac-ky': {
    englishTerm: 'Stoicism',
    example:
      'Tập trung vào nỗ lực ôn tập thuộc quyền kiểm soát của mình thay vì hoảng loạn trước đề thi nằm ngoài tầm kiểm soát.',
  },
  'phe-binh-sinh-thai': {
    englishTerm: 'Ecocriticism',
    example:
      'Đọc lại Người lái đò sông Đà không chỉ như chuyện chinh phục mà còn nhìn dòng sông như một sinh thể có giá trị riêng.',
  },
};

function buildV2Corpus(): {
  concepts: LibraryConcept[];
  documents: LibraryDocument[];
} {
  // 1. Index glossary terms by normalized name for fast linking from article.w
  const termSlugCount = new Map<string, number>();
  const normTermToConceptId = new Map<string, string>();
  const conceptDocIds = new Map<string, Set<string>>();
  const conceptPrimaryCategory = new Map<string, DocumentCategory>();
  const conceptCoOccurrences = new Map<string, Set<string>>();

  const rawGlossEntries = Object.entries(RAW_V2_GLOSS);
  const baseConcepts = rawGlossEntries.map(([term, definition]) => {
    const baseSlug = slugifyTerm(term);
    const seen = termSlugCount.get(baseSlug) ?? 0;
    termSlugCount.set(baseSlug, seen + 1);
    const id = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`;
    const norm = normalizeVietnamese(term);
    normTermToConceptId.set(norm, id);
    conceptDocIds.set(id, new Set<string>());
    conceptCoOccurrences.set(id, new Set<string>());
    return { id, term, definition, norm };
  });

  // 2. Transform all 91 articles and collect bidirectional term <-> article links
  const documents: LibraryDocument[] = RAW_V2_LIBRARY.map((article, idx) => {
    const category = mapV2Category(article);
    const cover = mapV2Cover(article);
    const difficulty = mapV2Difficulty(article.l);
    const { blocks, sections } = buildV2Blocks(article);
    const computedMinutes =
      article.m > 0 ? article.m : estimateReadingMinutes(blocks, article.s);

    const relatedConceptIds: string[] = [];
    for (const kw of article.w ?? []) {
      const normKw = normalizeVietnamese(kw);
      const conceptId = normTermToConceptId.get(normKw);
      if (conceptId && !relatedConceptIds.includes(conceptId)) {
        relatedConceptIds.push(conceptId);
        conceptDocIds.get(conceptId)?.add(article.i);
        if (!conceptPrimaryCategory.has(conceptId)) {
          conceptPrimaryCategory.set(conceptId, category);
        }
      }
    }

    for (const cid of relatedConceptIds) {
      const set = conceptCoOccurrences.get(cid);
      if (!set) continue;
      for (const otherId of relatedConceptIds) {
        if (otherId !== cid) set.add(otherId);
      }
    }

    const references = (article.r ?? []).map((refStr, rIdx) =>
      parseV2Reference(refStr, article.i, rIdx)
    );

    const tags = Array.from(
      new Set([article.g, ...(article.w ?? [])].map((t) => t.trim()).filter(Boolean))
    );

    // Deterministic descending editorial publication dates for newest sorting
    const day = String(Math.max(1, 28 - (idx % 28))).padStart(2, '0');
    const month = String(Math.max(1, 11 - Math.floor(idx / 28))).padStart(2, '0');
    const publishedDate = `${day}/${month}/2026`;

    const fullText = [
      article.s,
      ...(article.k ?? []),
      ...(article.q ?? []),
      ...(article.e ?? []),
      article.x ?? '',
      article.de ?? '',
      ...(article.b ?? []).flatMap((sec) => [sec.h, ...sec.p]),
      ...(article.n ?? []).flatMap((item) => [item.t, item.txt, item.task ?? '']),
    ].join(' ');
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

    const practiceCorpora = (article.n ?? []).map((item) => ({
      title: item.t.trim(),
      source: item.src?.trim(),
      text: item.txt.trim(),
      task: item.task?.trim(),
      mode:
        item.mode === 'read' ||
        item.mode === 'concept' ||
        item.mode === 'debate' ||
        item.mode === 'annotate' ||
        item.mode === 'grade'
          ? item.mode
          : undefined,
    }));

    return {
      id: article.i,
      title: article.t,
      subtitle: `${article.g} · ${article.a}`,
      author: article.a,
      source: `Mạch Ngôn v2 · ${article.g}`,
      publishedDate,
      readingMinutes: computedMinutes,
      category,
      coverImage: cover.src,
      coverAlt: cover.alt,
      excerpt: article.s,
      keywords: article.w ?? [],
      tags,
      difficulty,
      featured: FEATURED_V2_IDS.has(article.i),
      sections,
      blocks,
      references,
      relatedConceptIds,
      status: 'published',
      reviewStatus: 'published',
      verified: true,
      reviewedAt: '2026-11-22',
      contentVersion: 2,
      fieldCode: article.f,
      genre: article.g,
      dePrompt: article.de?.trim() || undefined,
      keyPoints: (article.k ?? []).map((pt) => pt.trim()).filter(Boolean),
      examples: (article.e ?? []).map((ex) => ex.trim()).filter(Boolean),
      practiceCorpora: practiceCorpora.length > 0 ? practiceCorpora : undefined,
      thinkingQuestions: (article.q ?? []).map((q) => q.trim()).filter(Boolean),
      practiceExercise: article.x?.trim() || undefined,
      isFullEssay: Boolean(article.b && article.b.length > 0),
      wordCount,
      reviewNote: (article as RawV2Article & { rv?: string }).rv?.trim() || undefined,
    };
  });

  // 3. Finalize all 230 LibraryConcept objects with linked docs & co-occurring concepts
  const concepts: LibraryConcept[] = baseConcepts.map(({ id, term, definition }) => {
    const enrichment = CONCEPT_ENRICHMENTS[id];
    const linkedDocs = Array.from(conceptDocIds.get(id) ?? []);
    const relatedIds = Array.from(conceptCoOccurrences.get(id) ?? []).slice(0, 5);
    const aliases = [term];
    if (enrichment?.englishTerm) {
      aliases.push(enrichment.englishTerm);
    }

    return {
      id,
      term,
      englishTerm: enrichment?.englishTerm,
      category: conceptPrimaryCategory.get(id) ?? 'Văn học và lý luận văn học',
      shortDefinition: definition,
      example: enrichment?.example,
      relatedConceptIds: relatedIds,
      documentIds: linkedDocs,
      matchAliases: aliases,
    };
  });

  return { concepts, documents };
}

const V2_CORPUS = buildV2Corpus();

export const V2_LIBRARY_DOCUMENTS: LibraryDocument[] = V2_CORPUS.documents;
export const V2_LIBRARY_CONCEPTS: LibraryConcept[] = V2_CORPUS.concepts;
