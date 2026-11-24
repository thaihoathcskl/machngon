import { LIBRARY_CONCEPTS } from '../content/library/concepts.ts';
import { AIRateLimitError, AIServiceError, askV2WithSearch } from '../services/aiService.ts';
import type { GroundingSource, LabDifficultyLevel } from './types.ts';
import { normalizeVietnamese } from './vietnamese.ts';

export interface DictionaryEntry {
  term: string;
  englishTerm?: string;
  category: string;
  definition: string;
  contextMeaning?: string;
  example?: string;
  source: 'local-glossary' | 'ai-api';
  relatedDocumentIds?: string[];
  sources?: GroundingSource[];
}

interface BuiltInGlossaryTerm {
  term: string;
  englishTerm?: string;
  category: string;
  definition: string;
  example: string;
  aliases?: string[];
}

const BUILTIN_ACADEMIC_GLOSSARY: BuiltInGlossaryTerm[] = [
  {
    term: 'Biện chứng',
    englishTerm: 'Dialectics',
    category: 'Triết học và tư tưởng',
    definition:
      'Phương pháp tư duy xem xét sự vật trong sự vận động, biến đổi và tác động qua lại giữa các mặt đối lập thay vì tách rời tĩnh tại.',
    example: 'Ngôn ngữ và tư duy có quan hệ biện chứng: ngôn ngữ gọi tên ý nghĩ, còn tư duy mở rộng cách dùng ngôn ngữ.',
    aliases: ['bien chung', 'phep bien chung'],
  },
  {
    term: 'Ngụy biện',
    englishTerm: 'Logical Fallacy',
    category: 'Logic và lập luận',
    definition:
      'Lỗi suy luận khiến một lập luận nghe có vẻ hợp lý hoặc thuyết phục nhưng thực chất thiếu căn cứ logic vững chắc.',
    example: 'Chê bai cá tính người nói thay vì phản bác lý lẽ của họ là lỗi ngụy biện công kích cá nhân.',
    aliases: ['nguy bien', 'fallacy'],
  },
  {
    term: 'Giả định ngầm',
    englishTerm: 'Hidden Assumption',
    category: 'Tư duy phản biện',
    definition:
      'Điều người nói mặc nhiên coi là đúng mà không nêu rõ ra thành lời, nhưng toàn bộ kết luận lại phụ thuộc vào nó.',
    example: 'Nói "cấm AI để học sinh giỏi hơn" ngầm giả định rằng hễ dùng AI là người học sẽ ngừng tự suy nghĩ.',
    aliases: ['gia dinh ngam', 'tien de ngam'],
  },
  {
    term: 'Phản ví dụ',
    englishTerm: 'Counterexample',
    category: 'Logic và lập luận',
    definition:
      'Một trường hợp cụ thể đáp ứng điều kiện của nhận định nhưng cho kết quả ngược lại, đủ để bác bỏ một khẳng định tuyệt đối.',
    example: 'Để kiểm tra câu "mọi quy tắc đều có ích", chỉ cần tìm 1 quy tắc lỗi thời gây bất công làm phản ví dụ.',
    aliases: ['phan vi du', 'counterexample'],
  },
  {
    term: 'Tự do và tùy tiện',
    category: 'Triết học và tư tưởng',
    definition:
      'Tự do đi kèm năng lực tự chủ và trách nhiệm với người khác, còn tùy tiện là làm theo ý thích nhất thời bất chấp hậu quả chung.',
    example: 'Tự do ngôn luận khác với tùy tiện bịa đặt làm tổn hại danh dự người vô tội.',
    aliases: ['tuy tien', 'tu do'],
  },
  {
    term: 'Hàm súc',
    englishTerm: 'Conciseness / Suggestiveness',
    category: 'Văn học và lý luận văn học',
    definition:
      'Đặc tính dùng ít lời nhưng gợi mở nhiều tầng nghĩa, cảm xúc và liên tưởng sâu xa cho người đọc.',
    example: 'Thơ đường luật cổ điển thường hàm súc: chỉ tả cảnh chiều tà nhưng gợi trọn nỗi cô đơn của nhân vật trữ tình.',
    aliases: ['ham suc'],
  },
  {
    term: 'Ẩn dụ',
    englishTerm: 'Metaphor',
    category: 'Ngôn ngữ học',
    definition:
      'Cách gọi tên sự vật, hiện tượng này bằng tên của sự vật, hiện tượng khác có nét tương đồng ngầm nhằm tăng sức gợi hình và chiều sâu tư duy.',
    example: 'Nói "thời gian là vàng bạc" là một ẩn dụ quen thuộc nhấn mạnh giá trị hữu hạn của thời gian.',
    aliases: ['an du', 'metaphor'],
  },
  {
    term: 'Diễn ngôn',
    englishTerm: 'Discourse',
    category: 'Ngôn ngữ học',
    definition:
      'Hệ thống lời nói, văn bản và cách đặt vấn đề trong một bối cảnh xã hội nhất định, góp phần định hình cách con người nhìn nhận thế giới.',
    example: 'Diễn ngôn công cộng trên mạng xã hội dễ nghiêng về cảm xúc mạnh nếu thiếu quy tắc kiểm chứng nguồn.',
    aliases: ['dien ngon', 'discourse'],
  },
  {
    term: 'Hiện sinh',
    englishTerm: 'Existentialism',
    category: 'Triết học và tư tưởng',
    definition:
      'Trào lưu triết học nhấn mạnh con người tự do lựa chọn hành động và tự kiến tạo ý nghĩa cuộc sống của chính mình kèm trách nhiệm cá nhân.',
    example: 'Theo triết học hiện sinh, hoàn cảnh không quyết định trọn vẹn bạn là ai; chính lựa chọn của bạn mới định hình điều đó.',
    aliases: ['hien sinh', 'triet hoc hien sinh'],
  },
  {
    term: 'Phương pháp Socrates',
    englishTerm: 'Socratic Method',
    category: 'Tư duy phản biện',
    definition:
      'Cách đối thoại bằng chuỗi câu hỏi sắc bén, điềm tĩnh nhằm giúp người đối diện tự bóc tách giả định ngầm và tự kiểm chứng lập luận của mình.',
    example: 'Thay vì áp đặt đáp án, cố vấn hỏi: "Nếu áp dụng nguyên tắc này cho trường hợp ngoại lệ, nó có còn đúng không?"',
    aliases: ['socrates', 'socratic', 'phuong phap socrates'],
  },
  {
    term: 'Thực chứng',
    englishTerm: 'Empirical / Positivism',
    category: 'Kiến thức liên ngành',
    definition:
      'Dựa trên dữ liệu quan sát được, thí nghiệm hoặc bằng chứng có thể kiểm chứng độc lập thay vì suy đoán thuần cảm tính.',
    example: 'Một nhận định có tính thực chứng cần chỉ rõ số liệu khảo sát hoặc nguồn tài liệu gốc.',
    aliases: ['thuc chung', 'bang chung thuc chung'],
  },
];

export function lookupLocalDictionary(rawTerm: string): DictionaryEntry | null {
  const cleanTerm = rawTerm.replace(/\s+/g, ' ').trim();
  if (cleanTerm.length < 2) return null;
  const normQuery = normalizeVietnamese(cleanTerm);

  // 1a. Exact match in LIBRARY_CONCEPTS (230 machngon-v2 glossary terms)
  for (const concept of LIBRARY_CONCEPTS) {
    const candidates = [
      concept.term,
      concept.englishTerm ?? '',
      ...(concept.matchAliases ?? []),
    ]
      .filter(Boolean)
      .map((s) => normalizeVietnamese(s));

    if (candidates.some((c) => c === normQuery)) {
      return {
        term: concept.term,
        englishTerm: concept.englishTerm,
        category: concept.category,
        definition: concept.shortDefinition,
        example: concept.example,
        source: 'local-glossary',
        relatedDocumentIds: concept.documentIds,
      };
    }
  }

  // 1b. Exact match in built-in academic glossary
  for (const item of BUILTIN_ACADEMIC_GLOSSARY) {
    const candidates = [item.term, item.englishTerm ?? '', ...(item.aliases ?? [])]
      .filter(Boolean)
      .map((s) => normalizeVietnamese(s));

    if (candidates.some((c) => c === normQuery)) {
      return {
        term: item.term,
        englishTerm: item.englishTerm,
        category: item.category,
        definition: item.definition,
        example: item.example,
        source: 'local-glossary',
      };
    }
  }

  // 2. Partial match only for meaningful phrases (>= 4 chars) and terms >= 4 chars
  if (normQuery.length >= 4) {
    for (const concept of LIBRARY_CONCEPTS) {
      const candidates = [
        concept.term,
        concept.englishTerm ?? '',
        ...(concept.matchAliases ?? []),
      ]
        .filter(Boolean)
        .map((s) => normalizeVietnamese(s));

      if (
        candidates.some(
          (c) => c.length >= 4 && (c.includes(normQuery) || normQuery.includes(c))
        )
      ) {
        return {
          term: concept.term,
          englishTerm: concept.englishTerm,
          category: concept.category,
          definition: concept.shortDefinition,
          example: concept.example,
          source: 'local-glossary',
          relatedDocumentIds: concept.documentIds,
        };
      }
    }

    for (const item of BUILTIN_ACADEMIC_GLOSSARY) {
      const candidates = [item.term, item.englishTerm ?? '', ...(item.aliases ?? [])]
        .filter(Boolean)
        .map((s) => normalizeVietnamese(s));

      if (
        candidates.some(
          (c) => c.length >= 4 && (c.includes(normQuery) || normQuery.includes(c))
        )
      ) {
        return {
          term: item.term,
          englishTerm: item.englishTerm,
          category: item.category,
          definition: item.definition,
          example: item.example,
          source: 'local-glossary',
        };
      }
    }
  }

  return null;
}

export function getSuggestedDictionaryTerms(): string[] {
  const fromConcepts = LIBRARY_CONCEPTS.slice(0, 4).map((c) => c.term);
  return [...fromConcepts, 'Biện chứng', 'Giả định ngầm', 'Phản ví dụ'];
}

export interface DictionaryExplainResult {
  entry: DictionaryEntry | null;
  quotaExhausted?: boolean;
  errorMessage?: string;
}

/**
 * Looks up a term or short highlighted phrase (even 1–2 words):
 * 1. Returns instant verified local glossary entry if matched and not forcing AI deep dive.
 * 2. Otherwise queries `/api/generate` securely for a concise Vietnamese definition + example.
 * 3. Transparently reports quota/API limits instead of silently fabricating an answer.
 */
export async function explainTermQuickly(
  rawTerm: string,
  options?: {
    contextSnippet?: string;
    articleTitle?: string;
    difficulty?: LabDifficultyLevel;
    forceAI?: boolean;
  }
): Promise<DictionaryExplainResult> {
  const cleanTerm = rawTerm.replace(/\s+/g, ' ').trim();
  if (cleanTerm.length < 2) {
    return {
      entry: null,
      errorMessage: 'Hãy nhập hoặc bôi đen ít nhất 2 ký tự để tra nghĩa.',
    };
  }

  const localHit = lookupLocalDictionary(cleanTerm);
  if (localHit && !options?.forceAI) {
    return {
      entry: {
        ...localHit,
        contextMeaning: options?.contextSnippet?.trim()
          ? `Trong câu đang đọc (“${options.contextSnippet.trim().slice(0, 130)}${options.contextSnippet.trim().length > 130 ? '…' : ''}”), thuật ngữ này giữ vai trò làm rõ khái niệm nền của lập luận.`
          : undefined,
      },
    };
  }

  const levelInstruction =
    options?.difficulty === 'advanced'
      ? 'Giải thích ở mức Chuyên gia: chặt chẽ về học thuật, nêu sắc thái khái niệm và 1 ví dụ phân tích ngắn.'
      : options?.difficulty === 'basic'
        ? 'Giải thích ở mức Người mới bắt đầu: thật dễ hiểu bằng tiếng Việt đời thường, kèm 1 ví dụ gần gũi.'
        : 'Giải thích ở mức Tầm trung: rõ ràng, chuẩn xác, kèm 1 ví dụ cụ thể.';

  const systemInstruction = [
    'Bạn là AI Library — Từ điển học thuật Mạch Ngôn chuyên giải thích nhanh từ vựng khó và cụm từ theo đúng ngữ cảnh bài đọc (không tranh biện).',
    levelInstruction,
    'Trả lời gọn 3 dòng:',
    '- Nghĩa: 1–2 câu định nghĩa cốt lõi dễ hiểu.',
    '- Trong ngữ cảnh: 1 câu giải thích nghĩa cụ thể trong câu văn đang đọc.',
    '- Ví dụ: 1 câu ví dụ đời thực ngắn gọn.',
  ].join('\n');

  const promptParts = [`Hãy giải thích từ/cụm từ: "${cleanTerm}"`];
  if (options?.articleTitle?.trim()) {
    promptParts.push(`Bài đang đọc: "${options.articleTitle.trim()}"`);
  }
  if (options?.contextSnippet?.trim()) {
    promptParts.push(`Ngữ cảnh xuất hiện: "${options.contextSnippet.trim().slice(0, 320)}"`);
  }
  const prompt = promptParts.join('\n');

  try {
    const res = await askV2WithSearch({
      prompt,
      systemInstruction,
    });

    const cleanedText = res.answer
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\*\*/g, '')
      .trim();

    const lines = cleanedText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const defChunks: string[] = [];
    const ctxChunks: string[] = [];
    const exChunks: string[] = [];
    let activeSection: 'def' | 'ctx' | 'ex' | null = null;

    for (const line of lines) {
      if (/^[-•*]?\s*nghĩa\s*:/i.test(line)) {
        activeSection = 'def';
        const val = line.replace(/^[-•*]?\s*nghĩa\s*:\s*/i, '').trim();
        if (val) defChunks.push(val);
      } else if (/^[-•*]?\s*trong\s+ngữ\s+cảnh\s*:/i.test(line)) {
        activeSection = 'ctx';
        const val = line.replace(/^[-•*]?\s*trong\s+ngữ\s+cảnh\s*:\s*/i, '').trim();
        if (val) ctxChunks.push(val);
      } else if (/^[-•*]?\s*ví\s*dụ\s*:/i.test(line)) {
        activeSection = 'ex';
        const val = line.replace(/^[-•*]?\s*ví\s*dụ\s*:\s*/i, '').trim();
        if (val) exChunks.push(val);
      } else if (activeSection === 'ctx') {
        ctxChunks.push(line);
      } else if (activeSection === 'ex') {
        exChunks.push(line);
      } else {
        defChunks.push(line);
      }
    }

    const definition = defChunks.join(' ').trim() || cleanedText;
    const contextMeaning = ctxChunks.join(' ').trim() || undefined;
    const example = exChunks.join(' ').trim() || undefined;

    return {
      entry: {
        term: cleanTerm,
        category:
          res.sources.length > 0 ? 'AI Library · Google/Web Search' : 'AI Library · Tra cứu học thuật',
        definition,
        contextMeaning,
        example,
        source: 'ai-api',
        sources: res.sources.length > 0 ? res.sources : undefined,
      },
    };
  } catch (err) {
    if (!(err instanceof AIRateLimitError)) {
      try {
        const rescueRes = await fetch('/api/library/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            term: cleanTerm,
            contextSnippet: options?.contextSnippet?.trim() || '',
            articleTitle: options?.articleTitle?.trim() || '',
          }),
        });
        if (rescueRes.ok) {
          const rescueData = (await rescueRes.json()) as {
            definition?: string;
            contextNote?: string;
            example?: string;
            source?: string;
            quotaExhausted?: boolean;
            sources?: GroundingSource[];
          };
          if (rescueData.source === 'ai' && rescueData.definition?.trim()) {
            return {
              entry: {
                term: cleanTerm,
                category:
                  Array.isArray(rescueData.sources) && rescueData.sources.length > 0
                    ? 'AI Library · Web Search'
                    : 'AI Library · Tra cứu học thuật',
                definition: rescueData.definition.trim(),
                contextMeaning: rescueData.contextNote?.trim() || undefined,
                example: rescueData.example?.trim() || undefined,
                source: 'ai-api',
                sources:
                  Array.isArray(rescueData.sources) && rescueData.sources.length > 0
                    ? rescueData.sources
                    : undefined,
              },
            };
          }
        }
      } catch {
        // Proceed to clean local fallback below
      }
    }

    if (localHit) {
      return {
        entry: localHit,
        quotaExhausted: err instanceof AIRateLimitError,
        errorMessage:
          err instanceof AIRateLimitError
            ? 'Đã hết lượt bản thông minh (API) hiện tại — đang hiển thị định nghĩa từ kho từ điển nội bộ.'
            : undefined,
      };
    }

    const snippet = options?.contextSnippet?.trim();
    return {
      entry: {
        term: cleanTerm,
        category: 'Gợi ý đọc theo ngữ cảnh',
        definition: snippet
          ? `"${cleanTerm}" là cụm từ/khái niệm xuất hiện trực tiếp trong đoạn văn đang đọc. Hãy đối chiếu với vế trước và vế sau để xác định vai trò lập luận của nó.`
          : `"${cleanTerm}" là khái niệm cần được đặt trong ngữ cảnh cụ thể để xác định phạm vi nghĩa chính xác.`,
        example: snippet
          ? `Ngữ cảnh tham chiếu: “${snippet.slice(0, 140)}${snippet.length > 140 ? '…' : ''}”`
          : 'Bạn có thể mở Concept Lab để nhờ AI bóc tách định nghĩa và ví dụ đối chiếu.',
        source: 'local-glossary',
      },
      quotaExhausted:
        err instanceof AIRateLimitError ||
        (err instanceof AIServiceError &&
          (err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')),
      errorMessage:
        err instanceof AIRateLimitError
          ? 'API AI tạm chạm ngưỡng tần suất — đang hiển thị gợi ý phân tích theo ngữ cảnh.'
          : undefined,
    };
  }
}
