import type {
  GlossaryQuizQuestion,
  LibraryConcept,
  LibraryDocument,
  RubricCriterionKey,
  RubricEvaluationResult,
  RubricScoreEntry,
  RubricScores,
  ToulminRole,
} from '../types.ts';
import { normalizeVietnamese } from '../vietnamese.ts';

export interface ToulminRoleMeta {
  key: Exclude<ToulminRole, 'none'>;
  label: string;
  shortDesc: string;
  colorVar: string;
}

export const TOULMIN_ROLES: ToulminRoleMeta[] = [
  {
    key: 'claim',
    label: 'Luận điểm',
    shortDesc: 'Điều người viết khẳng định hoặc bảo vệ',
    colorVar: 'var(--c-claim)',
  },
  {
    key: 'ground',
    label: 'Căn cứ / bằng chứng',
    shortDesc: 'Dữ kiện, số liệu, chi tiết văn bản, ví dụ',
    colorVar: 'var(--c-ground)',
  },
  {
    key: 'warrant',
    label: 'Lí lẽ – giả định',
    shortDesc: 'Cầu nối giải thích vì sao căn cứ dẫn tới luận điểm',
    colorVar: 'var(--c-warrant)',
  },
  {
    key: 'qual',
    label: 'Từ giới hạn',
    shortDesc: 'Thu hẹp phạm vi khẳng định (thường, phần lớn, có thể…)',
    colorVar: 'var(--c-qual)',
  },
  {
    key: 'reb',
    label: 'Phản bác',
    shortDesc: 'Xét ý kiến trái chiều hoặc trường hợp ngoại lệ',
    colorVar: 'var(--c-reb)',
  },
];

export interface RubricCriterionMeta {
  key: RubricCriterionKey;
  label: string;
  levels: [string, string, string];
}

export const RUBRIC_CRITERIA: RubricCriterionMeta[] = [
  {
    key: 'claim',
    label: 'Rõ ràng luận điểm',
    levels: ['Lập trường mơ hồ', 'Nêu được lập trường', 'Lập trường rõ, có phạm vi'],
  },
  {
    key: 'evidence',
    label: 'Bằng chứng',
    levels: [
      'Không có',
      'Có ví dụ chung chung/cá nhân',
      'Dữ kiện, chi tiết văn bản hoặc nguồn kiểm chứng được',
    ],
  },
  {
    key: 'assumption',
    label: 'Giả định ngầm',
    levels: ['Không nhận ra', 'Ngầm có nhưng chưa nêu', 'Tự nêu và biện minh'],
  },
  {
    key: 'counter',
    label: 'Xét phản đề',
    levels: ['Bỏ qua', 'Có nhắc đến', 'Trả lời phản đề mạnh nhất'],
  },
  {
    key: 'wording',
    label: 'Dùng từ chính xác',
    levels: ['Nhiều từ tuyệt đối/cảm xúc', 'Ít lỗi', 'Có từ giới hạn phù hợp'],
  },
];

export const V2_WORK_ALIASES: Array<{ keys: string[]; docId: string }> = [
  { keys: ['mị', 'a phủ', 'tô hoài', 'hồng ngài'], docId: 'to-hoai-vo-chong-a-phu' },
  { keys: ['chí phèo', 'thị nở', 'bá kiến', 'nam cao', 'làng vũ đại'], docId: 'nam-cao-chi-pheo' },
  { keys: ['huấn cao', 'viên quản ngục', 'chữ người tử tù'], docId: 'nguyen-tuan-chu-nguoi-tu-tu' },
  { keys: ['tràng giang', 'huy cận'], docId: 'huy-can-trang-giang' },
  { keys: ['vợ nhặt', 'tràng', 'thị', 'bà cụ tứ', 'kim lân'], docId: 'kim-lan-vo-nhat' },
  { keys: ['thúy kiều', 'kiều', 'nguyễn du', 'truyện kiều'], docId: 'nguyen-du-truyen-kieu-kieu-o-lau-ngung-bich' },
  { keys: ['tiểu thanh', 'độc tiểu thanh kí'], docId: 'nguyen-du-doc-tieuthanh' },
  { keys: ['liên', 'an', 'hai đứa trẻ', 'phố huyện', 'thạch lam'], docId: 'thach-lam-hai-dua-tre' },
  { keys: ['trương ba', 'đế thích', 'lưu quang vũ'], docId: 'luu-quang-vu-hon-truong-ba' },
  { keys: ['vũ như tô', 'cửu trùng đài', 'đan thiềm'], docId: 'nguyen-huy-tuong-vu-nhu-to' },
  { keys: ['chiếc thuyền ngoài xa', 'phùng', 'người đàn bà hàng chài', 'nguyễn minh châu'], docId: 'nguyen-minh-chau-chiec-thuyen' },
  { keys: ['xuân tóc đỏ', 'số đỏ', 'vũ trọng phụng'], docId: 'vu-trong-phung-so-do' },
  { keys: ['tây tiến', 'quang dũng'], docId: 'quang-dung-tay-tien' },
  { keys: ['việt bắc', 'tố hữu'], docId: 'to-huu-viet-bac' },
  { keys: ['sóng', 'xuân quỳnh'], docId: 'xuan-quynh-song' },
  { keys: ['đất nước', 'nguyễn khoa điềm'], docId: 'nguyen-khoa-diem-dat-nuoc' },
  { keys: ['vội vàng', 'xuân diệu'], docId: 'xuan-dieu-voi-vang' },
  { keys: ['vĩ dạ', 'thôn vĩ', 'hàn mặc tử'], docId: 'han-mac-tu-day-thon-vi-da' },
  { keys: ['sông đà', 'ông đò', 'người lái đò'], docId: 'nguyen-tuan-nguoi-lai-do-song-da' },
  { keys: ['sông hương', 'hoàng phủ ngọc tường'], docId: 'hoang-phu-ngoc-tuong-song-huong' },
  { keys: ['tự tình', 'hồ xuân hương'], docId: 'ho-xuan-huong-tu-tinh' },
  { keys: ['thu điếu', 'câu cá mùa thu', 'nguyễn khuyến'], docId: 'nguyen-khuyen-thu-dieu' },
  { keys: ['thương vợ', 'tú xương', 'trần tế xương'], docId: 'tran-te-xuong-thuong-vo' },
  { keys: ['cảnh ngày hè', 'bảo kính cảnh giới', 'nguyễn trãi'], docId: 'nguyen-trai-canh-ngay-he' },
  { keys: ['cần giuộc', 'nguyễn đình chiểu'], docId: 'nguyen-dinh-chieu-van-te' },
  { keys: ['bình ngô đại cáo', 'đại cáo bình ngô'], docId: 'binh-ngo-dai-cao' },
  { keys: ['hịch tướng sĩ', 'trần quốc tuấn'], docId: 'hich-tuong-si' },
  { keys: ['tuyên ngôn độc lập'], docId: 'tuyen-ngon-doc-lap' },
  { keys: ['đăm săn', 'đam san', 'mtao mxây'], docId: 'su-thi-dam-san' },
  { keys: ['tấm cám', 'cô tấm'], docId: 'truyen-co-tich-cau-truc' },
  { keys: ['ca dao'], docId: 'ca-dao-than-than-yeu-thuong' },
  { keys: ['hamlet', 'shakespeare'], docId: 'shakespeare-hamlet' },
  { keys: ['gregor', 'kafka', 'hóa thân', 'hoá thân'], docId: 'kafka-hoa-than' },
  { keys: ['santiago', 'hemingway', 'ông già và biển cả'], docId: 'hemingway-tang-bang-troi' },
  { keys: ['belikov', 'người trong bao', 'chekhov'], docId: 'chekhov-nguoi-trong-bao' },
  { keys: ['valjean', 'javert', 'victor hugo', 'những người khốn khổ'], docId: 'victor-hugo-nhan-dao' },
  { keys: ['haiku', 'bashō', 'basho'], docId: 'basho-haiku' },
  { keys: ['ngụy biện', 'nguỵ biện'], docId: 'nguy-bien-thuong-gap' },
  { keys: ['tin giả'], docId: 'nhan-dien-tin-gia' },
  { keys: ['trí tuệ nhân tạo', 'chatgpt', 'dùng ai', 'công cụ ai'], docId: 'ai-va-dao-duc' },
  { keys: ['hàm ngôn'], docId: 'ngu-dung-hoc-va-ham-ngon' },
  { keys: ['ẩn dụ'], docId: 'an-du-y-niem' },
  { keys: ['hạnh phúc'], docId: 'aristotle-duc-hanh' },
  { keys: ['tự do'], docId: 'triet-hoc-hien-sinh' },
];

const ABS_MARKERS = [
  'luôn luôn',
  'luôn',
  'tất cả',
  'mọi người',
  'mọi',
  'ai cũng',
  'không ai',
  'không bao giờ',
  'hoàn toàn',
  'chắc chắn',
  'duy nhất',
  'bao giờ cũng',
  'tuyệt đối',
  '100%',
  'chỉ vì',
  'chỉ có',
];

const QUAL_MARKERS = [
  'có thể',
  'thường',
  'phần lớn',
  'đa số',
  'hầu hết',
  'trong nhiều trường hợp',
  'phần nào',
  'ở mức độ',
  'trừ khi',
  'nếu',
  'khi',
];

const EVID_MARKERS = [
  'ví dụ',
  'chẳng hạn',
  'số liệu',
  'theo ',
  'nghiên cứu',
  'khảo sát',
  'chi tiết',
  'câu thơ',
  'câu văn',
  'đoạn văn',
  'hình ảnh',
  'trích',
  'như khi',
  'minh chứng',
  'dẫn chứng',
  'thực tế',
];

const COUNTER_MARKERS = [
  'tuy nhiên',
  'mặc dù',
  'có ý kiến',
  'có người cho rằng',
  'ngược lại',
  'phản biện',
  'trừ khi',
  'song',
  'dẫu vậy',
  'mặt khác',
];

const CAUSAL_MARKERS = ['vì', 'bởi', 'do đó', 'dẫn đến', 'khiến', 'nên', 'cho nên', 'vì vậy', 'vì thế'];

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

export function splitVietnameseSentences(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const matches = cleaned.match(/[^.!?…\n]+(?:[.!?…]+|$)/g);
  return (matches ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && countWords(s) >= 2);
}

export function findPhraseHits(text: string, list: string[]): string[] {
  const padded = ` ${text.toLowerCase()} `;
  return list.filter((w) => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'u');
    return re.test(padded);
  });
}

export function detectLiteraryWork(
  text: string,
  documents: LibraryDocument[]
): LibraryDocument | null {
  const padded = ` ${text.toLowerCase()} `;
  for (const entry of V2_WORK_ALIASES) {
    for (const k of entry.keys) {
      const escaped = k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, 'u');
      if (re.test(padded)) {
        const matched = documents.find((d) => d.id === entry.docId);
        if (matched) return matched;
      }
    }
  }
  return null;
}

export function classifySentenceToulminLocal(sentence: string, index: number): ToulminRole {
  const t = sentence.toLowerCase();
  if (
    findPhraseHits(t, ['tuy nhiên', 'ngược lại', 'có ý kiến', 'có người cho rằng', 'trừ khi', 'mặc dù', 'song'])
      .length > 0
  ) {
    return 'reb';
  }
  if (
    findPhraseHits(t, ['ví dụ', 'chẳng hạn', 'theo', 'số liệu', 'khảo sát', 'nghiên cứu', 'chi tiết', 'trong tác phẩm', 'câu thơ'])
      .length > 0 ||
    /\d/.test(t)
  ) {
    return 'ground';
  }
  if (
    findPhraseHits(t, ['bởi vì', 'vì', 'do đó', 'điều này cho thấy', 'nghĩa là', 'bởi lẽ']).length > 0
  ) {
    return 'warrant';
  }
  if (
    findPhraseHits(t, ['có thể', 'thường', 'trong nhiều trường hợp', 'phần lớn', 'ở mức độ']).length > 0 &&
    countWords(sentence) < 22
  ) {
    return 'qual';
  }
  if (
    index === 0 ||
    findPhraseHits(t, ['cho rằng', 'cần', 'nên', 'phải', 'là điều']).length > 0
  ) {
    return 'claim';
  }
  return 'none';
}

export function evaluateRubricLocal(
  text: string,
  fallbackReason?: string
): RubricEvaluationResult {
  const sn = splitVietnameseSentences(text).length;
  const abs = findPhraseHits(text, ABS_MARKERS);
  const qu = findPhraseHits(text, QUAL_MARKERS);
  const ev = findPhraseHits(text, EVID_MARKERS);
  const co = findPhraseHits(text, COUNTER_MARKERS);
  const ca = findPhraseHits(text, CAUSAL_MARKERS);

  const hasNum = /\d/.test(text);
  const hasQuote = /[“"«].{4,}[”"»]/.test(text);
  const stance =
    /(cho rằng|theo em|theo tôi|tôi nghĩ|em nghĩ|quan điểm|cần|nên|không nên|phải|là )/i.test(
      text
    );

  const scores: RubricScores = {
    claim: !stance ? 1 : qu.length > 0 && sn >= 2 ? 3 : 2,
    evidence:
      (hasNum || hasQuote || /theo [A-ZĐ]/.test(text)) && ev.length > 0
        ? 3
        : ev.length > 0 || hasNum || hasQuote
          ? 2
          : 1,
    assumption: /giả định|với điều kiện|tiền đề|điều này chỉ đúng/i.test(text)
      ? 3
      : ca.length > 0
        ? 2
        : 1,
    counter:
      co.length >= 2 || (co.length > 0 && /(nhưng|song|tuy vậy|dù vậy)/i.test(text))
        ? 3
        : co.length > 0
          ? 2
          : 1,
    wording: abs.length === 0 && qu.length > 0 ? 3 : abs.length <= 1 ? 2 : 1,
  };

  const comments: Record<RubricCriterionKey, string> = {
    claim:
      scores.claim === 1
        ? 'Chưa thấy câu nêu lập trường rõ. Hãy mở đầu bằng một câu khẳng định quan điểm.'
        : scores.claim === 2
          ? 'Lập trường có, nhưng chưa nói rõ phạm vi (đúng trong trường hợp nào).'
          : 'Lập trường rõ và có giới hạn phạm vi.',
    evidence:
      scores.evidence === 1
        ? 'Chưa có dẫn chứng cụ thể.'
        : scores.evidence === 2
          ? 'Có dấu hiệu dẫn chứng nhưng còn chung; nên thêm chi tiết, số liệu hoặc trích dẫn có nguồn.'
          : 'Có dẫn chứng cụ thể (số liệu/trích dẫn/chi tiết).',
    assumption:
      scores.assumption === 3
        ? 'Bạn đã tự nêu điều kiện/giả định của lập luận.'
        : 'Hãy viết ra điều phải đúng thì lập luận của bạn mới đúng.',
    counter:
      scores.counter === 1
        ? 'Chưa xét ý kiến trái chiều.'
        : scores.counter === 2
          ? 'Có nhắc tới ý kiến khác; hãy trả lời trực tiếp phản đề mạnh nhất.'
          : 'Có xét và trả lời phản đề.',
    wording:
      abs.length > 0
        ? `Có từ tuyệt đối hóa: “${abs.join('”, “')}”.`
        : qu.length > 0
          ? 'Dùng từ giới hạn hợp lí.'
          : 'Ít từ tuyệt đối, có thể thêm từ giới hạn (thường, phần lớn, trừ khi…).',
  };

  const order: RubricCriterionKey[] = ['wording', 'evidence', 'counter', 'assumption', 'claim'];
  const weakest = [...order].sort((a, b) => scores[a] - scores[b])[0];
  const nextMap: Record<RubricCriterionKey, string> = {
    wording: 'Thay một từ tuyệt đối bằng từ giới hạn và nêu điều kiện cụ thể.',
    evidence: 'Thêm 1 dẫn chứng kiểm chứng được (chi tiết văn bản, số liệu có nguồn).',
    counter: 'Viết 2–3 câu nêu phản đề mạnh nhất rồi trả lời nó.',
    assumption: 'Viết thêm 1 câu: “Lập luận này dựa trên giả định rằng…”.',
    claim: 'Viết lại câu mở đầu thành một lập trường rõ ràng, có phạm vi.',
  };

  const allTop = Object.values(scores).every((v) => v === 3);
  return {
    scores,
    comments,
    next: allTop
      ? 'Các dấu hiệu đều tốt. Thử thách tiếp: chọn phản đề khó nhất bạn có thể nghĩ ra và trả lời nó bằng một dẫn chứng mới.'
      : nextMap[weakest],
    question:
      'Nếu người phản đối mạnh nhất đọc đoạn này, họ sẽ bắt bẻ câu nào trước tiên?',
    source: 'local',
    fallbackReason,
  };
}

export interface SkillMapStats {
  totalRuns: number;
  criteria: Array<{
    key: RubricCriterionKey;
    label: string;
    average: number; // 1..3
    delta: number | null;
  }>;
  priorityCriterion: {
    key: RubricCriterionKey;
    label: string;
    average: number;
  } | null;
}

export function computeSkillMapStats(entries: RubricScoreEntry[]): SkillMapStats {
  if (entries.length === 0) {
    return {
      totalRuns: 0,
      criteria: RUBRIC_CRITERIA.map((c) => ({
        key: c.key,
        label: c.label,
        average: 0,
        delta: null,
      })),
      priorityCriterion: null,
    };
  }

  // Entries are newest-first
  const recent = entries.slice(0, 5);
  const older = entries.slice(5, 10);

  const criteria = RUBRIC_CRITERIA.map((meta) => {
    const sumRecent = recent.reduce((acc, item) => acc + (item.scores[meta.key] ?? 1), 0);
    const avgRecent = Number((sumRecent / recent.length).toFixed(2));
    let delta: number | null = null;
    if (older.length > 0) {
      const sumOlder = older.reduce((acc, item) => acc + (item.scores[meta.key] ?? 1), 0);
      const avgOlder = sumOlder / older.length;
      delta = Number((avgRecent - avgOlder).toFixed(2));
    }
    return {
      key: meta.key,
      label: meta.label,
      average: avgRecent,
      delta,
    };
  });

  const sorted = [...criteria].sort((a, b) => a.average - b.average);
  return {
    totalRuns: entries.length,
    criteria,
    priorityCriterion: sorted[0]
      ? { key: sorted[0].key, label: sorted[0].label, average: sorted[0].average }
      : null,
  };
}

export function buildGlossaryQuickQuiz(
  doc: LibraryDocument,
  concepts: LibraryConcept[]
): GlossaryQuizQuestion[] {
  const byNormTerm = new Map<string, LibraryConcept>();
  for (const c of concepts) {
    byNormTerm.set(normalizeVietnamese(c.term), c);
  }

  const docTerms = (doc.keywords ?? [])
    .map((kw) => byNormTerm.get(normalizeVietnamese(kw)))
    .filter((c): c is LibraryConcept => Boolean(c && c.shortDefinition))
    .slice(0, 3);

  if (docTerms.length === 0 || concepts.length < 3) return [];

  const docNormSet = new Set((doc.keywords ?? []).map((kw) => normalizeVietnamese(kw)));
  const distractorPool = concepts.filter(
    (c) => c.shortDefinition && !docNormSet.has(normalizeVietnamese(c.term))
  );
  if (distractorPool.length < 2) return [];

  return docTerms.map((target, idx) => {
    const picks: LibraryConcept[] = [];
    let seed = doc.id.length * 7 + idx * 13;
    let guard = 0;
    while (picks.length < 2 && guard < 40) {
      guard += 1;
      seed = (seed * 31 + 17) % distractorPool.length;
      const cand = distractorPool[seed];
      if (cand && cand.id !== target.id && !picks.some((p) => p.id === cand.id)) {
        picks.push(cand);
      }
    }
    if (picks.length < 2) {
      for (const cand of distractorPool) {
        if (cand.id !== target.id && !picks.some((p) => p.id === cand.id)) {
          picks.push(cand);
          if (picks.length >= 2) break;
        }
      }
    }

    const rawOptions = [
      target.shortDefinition,
      picks[0]?.shortDefinition ?? 'Một khái niệm khác ngoài phạm vi bài đọc này.',
      picks[1]?.shortDefinition ?? 'Cách phân loại văn bản không gắn với ngữ cảnh hiện tại.',
    ];
    const order = [0, 1, 2].sort(
      (a, b) => ((a * 7 + doc.id.length + idx) % 3) - ((b * 7 + doc.id.length + idx) % 3)
    );

    return {
      term: target.term,
      question: `“${target.term}” là gì?`,
      options: order.map((k) => rawOptions[k]),
      correctIndex: order.indexOf(0),
    };
  });
}

export function buildToulminAnnotationPrompt(sentences: string[]): string {
  return [
    'Phân loại vai trò của từng câu trong đoạn nghị luận theo mô hình Toulmin. Nhãn hợp lệ: "claim" (luận điểm), "ground" (căn cứ/bằng chứng), "warrant" (lí lẽ – giả định nối căn cứ với luận điểm), "qual" (câu chủ yếu giới hạn mức độ khẳng định), "reb" (phản bác/ngoại lệ), "none" (dẫn dắt, không đóng vai trò lập luận).',
    'Các câu:',
    ...sentences.map((s, i) => `${i}. ${s}`),
    `Trả về DUY NHẤT JSON: {"roles":["claim","ground",...],"why":["lí do ngắn ≤15 chữ cho từng câu",...]} với đúng ${sentences.length} phần tử mỗi mảng.`,
  ].join('\n');
}

export function buildRubricGradingPrompt(text: string, topic?: string): string {
  return [
    'Bạn là giám khảo môn Ngữ văn THPT, chấm lập luận theo bảng tiêu chí của Mạch Ngôn. KHÔNG viết lại bài thay học sinh.',
    'Tiêu chí (mỗi tiêu chí cho 1, 2 hoặc 3 điểm):',
    ...RUBRIC_CRITERIA.map(
      (c) => `- ${c.key} (${c.label}): 1 = ${c.levels[0]}; 2 = ${c.levels[1]}; 3 = ${c.levels[2]}`
    ),
    topic?.trim() ? `Đề bài/ngữ cảnh: ${topic.trim()}` : '',
    'Bài của học sinh:',
    `"""${text.trim()}"""`,
    'Trả về DUY NHẤT một đối tượng JSON hợp lệ, không thêm chữ nào khác, theo mẫu:',
    '{"scores":{"claim":2,"evidence":1,"assumption":2,"counter":1,"wording":2},"comments":{"claim":"…","evidence":"…","assumption":"…","counter":"…","wording":"…"},"next":"một việc cụ thể nên sửa tiếp theo","question":"một câu hỏi Socrates"}',
    'Mỗi nhận xét tối đa 30 chữ, tiếng Việt, trích dẫn từ ngữ của học sinh khi có thể.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseToulminRolesJson(
  rawText: string,
  expectedLength: number
): { roles: ToulminRole[]; why: string[] } | null {
  try {
    const cleaned = rawText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as {
      roles?: unknown;
      why?: unknown;
    };
    if (!Array.isArray(parsed.roles) || parsed.roles.length !== expectedLength) {
      return null;
    }
    const allowed = new Set<ToulminRole>(['claim', 'ground', 'warrant', 'qual', 'reb', 'none']);
    const roles: ToulminRole[] = parsed.roles.map((r) =>
      typeof r === 'string' && allowed.has(r as ToulminRole) ? (r as ToulminRole) : 'none'
    );
    const why: string[] = Array.isArray(parsed.why)
      ? parsed.why.map((w) => (typeof w === 'string' ? w.trim() : ''))
      : new Array(expectedLength).fill('');
    return { roles, why };
  } catch {
    return null;
  }
}

export function parseRubricEvaluationJson(
  rawText: string
): Omit<RubricEvaluationResult, 'source' | 'sources' | 'fallbackReason'> | null {
  try {
    const cleaned = rawText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as {
      scores?: Partial<Record<RubricCriterionKey, unknown>>;
      comments?: Partial<Record<RubricCriterionKey, unknown>>;
      next?: unknown;
      question?: unknown;
    };
    if (!parsed.scores || typeof parsed.scores !== 'object') return null;

    const clampLevel = (val: unknown): 1 | 2 | 3 => {
      const n = Math.round(Number(val));
      if (n <= 1 || Number.isNaN(n)) return 1;
      if (n >= 3) return 3;
      return 2;
    };

    const scores: RubricScores = {
      claim: clampLevel(parsed.scores.claim),
      evidence: clampLevel(parsed.scores.evidence),
      assumption: clampLevel(parsed.scores.assumption),
      counter: clampLevel(parsed.scores.counter),
      wording: clampLevel(parsed.scores.wording),
    };

    const comments: Partial<Record<RubricCriterionKey, string>> = {};
    for (const c of RUBRIC_CRITERIA) {
      const rawComment = parsed.comments?.[c.key];
      if (typeof rawComment === 'string' && rawComment.trim()) {
        comments[c.key] = rawComment.trim();
      }
    }

    return {
      scores,
      comments,
      next:
        typeof parsed.next === 'string' && parsed.next.trim()
          ? parsed.next.trim()
          : 'Tiếp tục bổ sung dẫn chứng cụ thể hoặc trả lời phản đề mạnh nhất.',
      question:
        typeof parsed.question === 'string' && parsed.question.trim()
          ? parsed.question.trim()
          : 'Nếu người phản đối mạnh nhất đọc đoạn này, họ sẽ bắt bẻ câu nào trước tiên?',
    };
  } catch {
    return null;
  }
}
