import { formatAttachmentsContextSummary } from './attachments.ts';
import { getLabDifficultyLabel } from '../library/validation.ts';
import type {
  DebateStepItem,
  EvidenceVerification,
  EvidenceVerificationStatus,
  LabApiRequestPayload,
  ThreeLayerResponse,
} from '../types.ts';

export const GEMINI_LAB_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    user_claim_summary: { type: 'STRING' },
    ai_claim_summary: { type: 'STRING' },
    new_assumptions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    contradiction_note: { type: 'STRING', nullable: true },
    contradiction_ref: { type: 'STRING', nullable: true },
    debate_steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          key: { type: 'STRING' },
          title: { type: 'STRING' },
          vietnameseTitle: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['key', 'title', 'vietnameseTitle', 'summary'],
      },
    },
    three_layer: {
      type: 'OBJECT',
      properties: {
        tldr: { type: 'STRING' },
        positive_points: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        negative_points: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        facts: { type: 'STRING' },
        assumptions: { type: 'STRING' },
        interpretation: { type: 'STRING' },
        guidingQuestion: { type: 'STRING' },
        questionHint: { type: 'STRING' },
        evidence_check: {
          type: 'OBJECT',
          properties: {
            status: { type: 'STRING' },
            grounded_claims: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            unverified_claims: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            warning: { type: 'STRING', nullable: true },
          },
          required: ['status', 'grounded_claims', 'unverified_claims'],
        },
      },
      required: [
        'tldr',
        'positive_points',
        'negative_points',
        'facts',
        'assumptions',
        'interpretation',
        'guidingQuestion',
        'evidence_check',
      ],
    },
  },
  required: [
    'user_claim_summary',
    'ai_claim_summary',
    'new_assumptions',
    'debate_steps',
    'three_layer',
  ],
} as const;

const DEBATE_STAGE_GUIDANCE: Record<number, { label: string; directive: string }> = {
  1: {
    label: 'Bước 1/5 — Xác định lập trường & làm rõ khái niệm cốt lõi',
    directive:
      'Ghi nhận điểm hợp lý lẫn giới hạn ban đầu bám sát chủ đề, kiểm tra nguồn dẫn chứng và hỏi đúng 1 câu làm rõ ranh giới khái niệm.',
  },
  2: {
    label: 'Bước 2/5 — Kiểm tra giả định & bằng chứng',
    directive:
      'Đánh giá hai chiều (điểm tích cực + điểm hạn chế), phân tách rõ ý đã có căn cứ và ý chưa có nguồn, rồi hỏi đúng 1 câu kiểm chứng bằng chứng.',
  },
  3: {
    label: 'Bước 3/5 — Đưa phản ví dụ thực tế để thử thách lập luận',
    directive:
      'Ghi nhận nỗ lực lập luận, đưa đúng 1 phản ví dụ sát chủ đề để thử độ bền và hỏi đúng 1 câu sắc bén kiểm tra lập trường.',
  },
  4: {
    label: 'Bước 4/5 — Hỗ trợ điều chỉnh quan điểm',
    directive:
      'Ghi nhận cách phản hồi trước phản ví dụ, chỉ rõ điểm cần siết chặt điều kiện áp dụng và hỏi đúng 1 câu giúp hoàn thiện lập trường.',
  },
  5: {
    label: 'Bước 5/5 — Tổng kết so sánh sự tiến bộ lập luận',
    directive:
      'Tổng kết đối chiếu giữa lập trường ban đầu (U#1) và kết luận hiện tại theo Bản đồ truy vết tư duy, kết bằng đúng 1 câu hỏi mở gọn.',
  },
};

/**
 * Safely strips `<think>...</think>` blocks and markdown code fences, then slices
 * from the first `{` to the last `}` before parsing JSON.
 */
export function extractCleanJson(rawText: string): Record<string, unknown> {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('EMPTY_JSON_RESPONSE');
  }

  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('INVALID_JSON_OBJECT_RESPONSE');
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_JSON_OBJECT_RESPONSE');
  }

  return parsed as Record<string, unknown>;
}

/**
 * Removes common Vietnamese spoken-language filler phrases (e.g. from Voice STT)
 * without distorting the student's actual core claim.
 */
export function cleanSpokenVietnameseFillers(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.replace(/\s+/g, ' ').trim();

  const fillerPatterns: RegExp[] = [
    /(?<=^|[\s,.;:!?])(?:kiểu\s+như\s+là|kiểu\s+như|thì\s+em\s+thấy\s+là|thì\s+em\s+thấy|thì\s+mình\s+thấy\s+là|thì\s+mình\s+thấy|à\s+mà|nghĩa\s+là|nói\s+chung\s+là|ý\s+em\s+là|ý\s+mình\s+là|thì\s+là|ừm+|ờm+)(?=$|[\s,.;:!?])[\s,]*/giu,
  ];

  for (const pattern of fillerPatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  cleaned = cleaned
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/^[,.;:\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 6) {
    return rawText.trim();
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Maps current conversation turn count and summary intent to DebateStepper5 stage (1..5).
 */
export function computeDebateStage(userTurnCount: number, isSummary: boolean): number {
  if (isSummary) return 5;
  if (userTurnCount <= 1) return 1;
  if (userTurnCount === 2) return 2;
  if (userTurnCount === 3) return 3;
  if (userTurnCount === 4) return 4;
  return 5;
}

function isStuckReply(text: string): boolean {
  const lower = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
  if (lower.length === 0) return false;
  const stuckPhrases = [
    'khong biet',
    'ko biet',
    'k biet',
    'em chiu',
    'minh chiu',
    'bo tay',
    'bi y tuong',
    'bi qua',
    'chua nghi ra',
    'khong nghi ra',
    'kho qua',
    'em khong ro',
    'minh khong ro',
  ];
  return stuckPhrases.some((phrase) => lower.includes(phrase)) && lower.length <= 90;
}

function isSummaryMapRequest(text: string): boolean {
  const lower = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
  return [
    'tong ket',
    'ban do tu duy',
    'ban do truy vet',
    'tom tat phien',
    'ket thuc phien',
    'tong hop lai',
    'tien bo lap luan',
  ].some((k) => lower.includes(k));
}

export function buildConversationContextPrompt(payload: LabApiRequestPayload): string {
  const parts: string[] = [];
  const userTurnCount =
    (payload.history?.filter((m) => m.role === 'user').length ?? 0) + 1;

  const prevUserMessages = (payload.history ?? []).filter((m) => m.role === 'user');
  const lastPrevUser = prevUserMessages[prevUserMessages.length - 1]?.content ?? '';
  const stuckTwiceInARow = isStuckReply(payload.message) && isStuckReply(lastPrevUser);
  const summaryRequested = isSummaryMapRequest(payload.message);
  const currentStage = computeDebateStage(userTurnCount, summaryRequested);
  const stageMeta = DEBATE_STAGE_GUIDANCE[currentStage];
  const cleanedMessage = cleanSpokenVietnameseFillers(payload.message);
  const difficultyLabel = getLabDifficultyLabel(payload.difficulty);

  const modeTitle =
    payload.lab_type === 'concept'
      ? 'Concept Lab (Khám phá khái niệm)'
      : payload.lab_type === 'read'
        ? 'Đọc văn bản văn học (Literary Close-Reading)'
        : 'Debate Lab (Tranh biện Socrates)';

  parts.push(
    `TRẠNG THÁI PHIÊN: Chế độ ${modeTitle} · Cấp độ: ${difficultyLabel} · Lượt học sinh thứ ${userTurnCount} · ${stageMeta.label}.`
  );
  parts.push(`NHỊP DẪN DẮT HIỆN TẠI: ${stageMeta.directive}`);

  if (stuckTwiceInARow) {
    parts.push(
      `TÍN HIỆU GỠ BÍ (BẮT BUỘC): Người học đang bí ý tưởng liên tiếp 2 lần. Hãy kích hoạt **Cơ chế gỡ bí**: đưa đúng **2 phương án/góc nhìn gợi ý (Phương án A hoặc Phương án B)** thật ngắn gọn bám sát chủ đề hiện tại để họ chọn và giải thích.`
    );
  } else if (isStuckReply(payload.message)) {
    parts.push(
      `LƯU Ý ĐỒNG HÀNH: Người học vừa bày tỏ chưa nghĩ ra ở lần đầu. Hãy gợi 1 mảnh kiến thức nền ngắn gọn (1–2 câu) kèm 1 ví dụ đời thường sát chủ đề rồi hỏi 1 câu thật dễ tiếp cận.`
    );
  }

  if (summaryRequested) {
    parts.push(
      `YÊU CẦU TỔNG KẾT PHIÊN HỌC (BẮT BUỘC): Tổng hợp thành **Bản đồ truy vết tư duy** so sánh lập trường/khái niệm ban đầu với bước tiến hiện tại dựa trên Sổ tay lập luận trong trường \`interpretation\`, kết bằng đúng 1 câu hỏi mở gọn.`
    );
  }

  if (payload.core_assumptions && payload.core_assumptions.length > 0) {
    parts.push(
      `GIẢ ĐỊNH BAN ĐẦU CỦA PHIÊN:\n${payload.core_assumptions.map((a, i) => `- GĐ${i + 1}: ${a}`).join('\n')}`
    );
  }

  if (payload.ledger_snapshot && payload.ledger_snapshot.length > 0) {
    const recentLedger = payload.ledger_snapshot.slice(-16);
    parts.push(
      `SỔ TAY MẠCH LẬP LUẬN:\n${recentLedger
        .map((item) => `- ${item.id}: ${item.claim}`)
        .join('\n')}`
    );
  }

  if (payload.history && payload.history.length > 0) {
    const recentTurns = payload.history.slice(-12);
    parts.push(
      `LỊCH SỬ TRAO ĐỔI GẦN ĐÂY:\n${recentTurns
        .map((m) => `${m.turnRef ?? m.role}: ${m.content.slice(0, 320)}`)
        .join('\n')}`
    );
  }

  if (payload.attachments && payload.attachments.length > 0) {
    parts.push(
      `TỆP NGƯỜI HỌC ĐÍNH KÈM TRONG LƯỢT NÀY (BẮT BUỘC ĐỌC & ĐỐI CHIẾU DẪN CHỨNG):\n${formatAttachmentsContextSummary(
        payload.attachments
      )}`
    );
  }

  if (cleanedMessage !== payload.message.trim()) {
    parts.push(
      `PHÁT BIỂU MỚI NHẤT CỦA NGƯỜI HỌC (đã lọc từ đệm khẩu ngữ):\n- Nguyên văn: ${payload.message}\n- Ý lõi: ${cleanedMessage}`
    );
  } else {
    parts.push(`PHÁT BIỂU MỚI NHẤT CỦA NGƯỜI HỌC:\n${payload.message}`);
  }

  parts.push(
    `BẮT BUỘC:\n` +
      `1. Bám chặt đúng chủ đề và câu trả lời mới nhất của người học, không lạc đề, không lan man, không chào hỏi sáo rỗng.\n` +
      `2. Nêu rõ cả điểm tích cực (\`positive_points\`) lẫn điểm hạn chế/phản biện (\`negative_points\`).\n` +
      `3. Kiểm tra dẫn chứng/nguồn trong \`evidence_check\` (phân biệt ý có căn cứ với ý chưa có nguồn xác thực, cảnh báo rõ nếu thiếu nguồn).\n` +
      `4. Kết thúc bằng DUY NHẤT 1 câu hỏi Socrates sắc bén (\`guidingQuestion\`).`
  );

  return parts.join('\n\n');
}

export function normalizeDebateSteps(steps: DebateStepItem[] | undefined): DebateStepItem[] {
  const requiredOrder: Array<{
    key: DebateStepItem['key'];
    title: string;
    vietnameseTitle: string;
  }> = [
    { key: 'identify', title: 'Identify', vietnameseTitle: 'Lập trường & khái niệm' },
    { key: 'analyze', title: 'Analyze', vietnameseTitle: 'Giả định & bằng chứng' },
    { key: 'challenge', title: 'Challenge', vietnameseTitle: 'Phản ví dụ thử thách' },
    { key: 'synthesize', title: 'Synthesize', vietnameseTitle: 'Điều chỉnh quan điểm' },
    { key: 'respond', title: 'Respond', vietnameseTitle: 'Tổng kết & gợi mở' },
  ];

  return requiredOrder.map((meta) => {
    const found = Array.isArray(steps) ? steps.find((s) => s?.key === meta.key) : undefined;
    return {
      key: meta.key,
      title: meta.title,
      vietnameseTitle: meta.vietnameseTitle,
      summary:
        typeof found?.summary === 'string' && found.summary.trim()
          ? found.summary.trim()
          : `Hoàn tất bước ${meta.vietnameseTitle} cho lập luận hiện tại.`,
    };
  });
}

function deriveFallbackTldr(
  rawTldr: unknown,
  aiClaimSummary: string,
  interpretation: string
): string {
  if (typeof rawTldr === 'string' && rawTldr.trim().length > 0) {
    return rawTldr.trim();
  }
  const cleanSummary = aiClaimSummary.trim();
  if (cleanSummary.length >= 24) {
    return cleanSummary;
  }
  const firstLine = interpretation
    .replace(/\*\*/g, '')
    .split(/\n+/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .find(Boolean);
  return firstLine
    ? firstLine.slice(0, 220)
    : 'Bạn đã nêu được một ý chính rõ ràng để chúng ta cùng kiểm chứng phạm vi áp dụng.';
}

function toCleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeEvidenceCheck(raw: unknown): EvidenceVerification | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const rawStatus = typeof obj.status === 'string' ? obj.status.trim().toLowerCase() : 'unverified';
  const status: EvidenceVerificationStatus =
    rawStatus === 'verified' || rawStatus === 'partial' || rawStatus === 'unverified'
      ? rawStatus
      : 'unverified';

  const groundedClaims = toCleanStringArray(obj.groundedClaims ?? obj.grounded_claims);
  const unverifiedClaims = toCleanStringArray(obj.unverifiedClaims ?? obj.unverified_claims);
  const warning =
    typeof obj.warning === 'string' && obj.warning.trim().length > 0
      ? obj.warning.trim()
      : status !== 'verified'
        ? 'Một số nhận định chưa kèm dẫn chứng hoặc nguồn kiểm chứng cụ thể.'
        : null;

  return {
    status,
    groundedClaims,
    unverifiedClaims,
    warning,
  };
}

export function normalizeThreeLayer(
  raw: (Partial<ThreeLayerResponse> & Record<string, unknown>) | undefined,
  aiClaimSummary: string
): ThreeLayerResponse {
  const facts = typeof raw?.facts === 'string' ? raw.facts.trim() : '';
  const assumptions = typeof raw?.assumptions === 'string' ? raw.assumptions.trim() : '';
  const interpretation = typeof raw?.interpretation === 'string' ? raw.interpretation.trim() : '';
  const guidingQuestion =
    typeof raw?.guidingQuestion === 'string' && raw.guidingQuestion.trim().length > 0
      ? raw.guidingQuestion.trim()
      : 'Theo bạn, nếu đặt lập luận này vào một tình huống thực tế trái chiều thì điểm nào cần kiểm chứng trước tiên?';
  const questionHint =
    typeof raw?.questionHint === 'string' && raw.questionHint.trim().length > 0
      ? raw.questionHint.trim()
      : undefined;

  const positivePoints = toCleanStringArray(raw?.positivePoints ?? raw?.positive_points);
  const negativePoints = toCleanStringArray(raw?.negativePoints ?? raw?.negative_points);
  const evidenceCheck = normalizeEvidenceCheck(raw?.evidenceCheck ?? raw?.evidence_check);

  return {
    tldr: deriveFallbackTldr(raw?.tldr, aiClaimSummary, interpretation),
    positivePoints: positivePoints.length > 0 ? positivePoints : undefined,
    negativePoints: negativePoints.length > 0 ? negativePoints : undefined,
    facts,
    assumptions,
    interpretation,
    guidingQuestion,
    questionHint,
    evidenceCheck,
  };
}
