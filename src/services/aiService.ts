import { runLocalFallbackEngine } from '../lib/ai/localFallbackEngine.ts';
import {
  buildConversationContextPrompt,
  extractCleanJson,
  normalizeDebateSteps,
  normalizeThreeLayer,
} from '../lib/ai/promptBuilder.ts';
import { getSystemPrompt } from '../lib/ai/systemPrompts.ts';
import { loadPreferredAiModel } from '../lib/storage.ts';
import {
  buildRubricGradingPrompt,
  buildToulminAnnotationPrompt,
  classifySentenceToulminLocal,
  evaluateRubricLocal,
  parseRubricEvaluationJson,
  parseToulminRolesJson,
} from '../lib/ai/v2Pedagogy.ts';
import type {
  AiModelId,
  GroundingSource,
  LabApiRequestPayload,
  LabApiResponsePayload,
  LibraryDocument,
  RubricEvaluationResult,
  ToulminRole,
} from '../lib/types.ts';

export interface GenerateHistoryTurn {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface GenerateAIRequest {
  prompt?: string;
  systemInstruction?: string;
  history?: GenerateHistoryTurn[];
  attachments?: Array<{
    name: string;
    mimeType: string;
    kind: 'text' | 'image' | 'pdf';
    textContent?: string;
    base64Data?: string;
  }>;
  model?: AiModelId;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    thinkingConfig?: { thinkingBudget: number };
    responseMimeType?: 'application/json' | 'text/plain';
    responseSchema?: Record<string, unknown>;
  };
}

export interface GenerateAIResponse {
  text: string;
  model: string;
  finishReason: string | null;
}

export type V2AskModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite' | 'gemini-2.5-flash';

export interface AskV2Request {
  prompt: string;
  systemInstruction?: string;
  history?: GenerateHistoryTurn[];
  model?: V2AskModelId;
}

export interface AskV2Response {
  answer: string;
  text: string;
  sources: GroundingSource[];
  searchQueries: string[];
  model: string;
  finishReason: string | null;
}

export class AIRateLimitError extends Error {
  readonly status = 429;
  readonly retryAfter: number;
  readonly code = 'QUOTA_EXHAUSTED';

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'AIRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class AIServiceError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
    this.code = code;
  }
}

function sanitizeGroundingSources(rawSources: unknown): GroundingSource[] {
  if (!Array.isArray(rawSources)) return [];
  const seen = new Set<string>();
  const cleaned: GroundingSource[] = [];

  for (const item of rawSources) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const rawUri =
      typeof obj.uri === 'string' && obj.uri.trim()
        ? obj.uri.trim()
        : typeof obj.url === 'string' && obj.url.trim()
          ? obj.url.trim()
          : '';
    if (!rawUri) continue;

    try {
      const parsed = new URL(rawUri);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      const safeUri = parsed.toString();
      if (seen.has(safeUri)) continue;
      seen.add(safeUri);

      const title =
        typeof obj.title === 'string' && obj.title.trim()
          ? obj.title.trim()
          : parsed.hostname.replace(/^www\./, '');

      cleaned.push({
        title,
        uri: safeUri,
        url: safeUri,
      });
    } catch {
      // Ignore malformed URIs
    }
  }

  return cleaned;
}

/**
 * Calls our Google-Search-grounded serverless endpoint (/api/v2-ask)
 * and returns both the AI answer and deduplicated reference sources.
 */
export async function askV2WithSearch(request: AskV2Request): Promise<AskV2Response> {
  const payload: Record<string, unknown> = {
    prompt: request.prompt,
  };
  if (request.systemInstruction?.trim()) {
    payload.systemInstruction = request.systemInstruction.trim();
  }
  if (Array.isArray(request.history) && request.history.length > 0) {
    payload.history = request.history;
  }
  if (request.model) {
    payload.model = request.model;
  }

  const res = await fetch('/api/v2-ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) {
    const retryHeader = Number(res.headers.get('Retry-After') || '15');
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      retry_after?: number;
    };
    const seconds = Number.isFinite(body.retry_after)
      ? Number(body.retry_after)
      : Number.isFinite(retryHeader) && retryHeader > 0
        ? retryHeader
        : 15;

    throw new AIRateLimitError(
      body.error ||
        'Đã hết bản thông minh (API AI) hiện tại do chạm giới hạn hạn mức. Toàn bộ văn bản và tệp bạn đang chuẩn bị vẫn được giữ nguyên.',
      seconds
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    answer?: string;
    text?: string;
    sources?: unknown;
    searchQueries?: unknown;
    model?: string;
    finishReason?: string | null;
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new AIServiceError(
      data.error || 'Kết nối tới máy chủ tra cứu AI bị gián đoạn.',
      res.status,
      data.code
    );
  }

  const rawAnswer =
    typeof data.answer === 'string' && data.answer.trim()
      ? data.answer.trim()
      : typeof data.text === 'string' && data.text.trim()
        ? data.text.trim()
        : '';

  if (!rawAnswer) {
    throw new AIServiceError(
      'Máy chủ AI không trả về nội dung hợp lệ. Vui lòng thử lại.',
      502,
      'EMPTY_AI_RESPONSE'
    );
  }

  const sources = sanitizeGroundingSources(data.sources);
  const searchQueries = Array.isArray(data.searchQueries)
    ? data.searchQueries.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
    : [];

  return {
    answer: rawAnswer,
    text: rawAnswer,
    sources,
    searchQueries,
    model: data.model || request.model || 'gemini-4-hydrogen',
    finishReason: data.finishReason ?? null,
  };
}

/**
 * Sends an AI generation request securely to our Vercel Serverless Function (/api/generate).
 * No API key or third-party AI SDK is ever loaded or exposed in the browser.
 */
export async function generateWithAI(request: GenerateAIRequest): Promise<GenerateAIResponse> {
  const preferredModel =
    request.model ?? (typeof window !== 'undefined' ? loadPreferredAiModel() : 'gemini-2.5-flash');
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      model: preferredModel,
    }),
  });

  if (res.status === 429) {
    const retryHeader = Number(res.headers.get('Retry-After') || '15');
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      retry_after?: number;
    };
    const seconds = Number.isFinite(body.retry_after)
      ? Number(body.retry_after)
      : Number.isFinite(retryHeader) && retryHeader > 0
        ? retryHeader
        : 15;

    throw new AIRateLimitError(
      body.error ||
        'Đã hết bản thông minh (API AI) hiện tại do chạm giới hạn hạn mức. Toàn bộ văn bản và tệp bạn đang chuẩn bị vẫn được giữ nguyên.',
      seconds
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    model?: string;
    finishReason?: string | null;
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new AIServiceError(
      data.error || 'Kết nối tới máy chủ phân tích AI bị gián đoạn.',
      res.status,
      data.code
    );
  }

  if (typeof data.text !== 'string' || !data.text.trim()) {
    throw new AIServiceError(
      'Máy chủ AI không trả về nội dung hợp lệ. Vui lòng thử lại.',
      502,
      'EMPTY_AI_RESPONSE'
    );
  }

  return {
    text: data.text,
    model: data.model || 'gemini-2.5-flash',
    finishReason: data.finishReason ?? null,
  };
}

/**
 * Explicitly runs the deterministic local fallback engine when the user chooses
 * to continue offline after seeing a transparent API quota/key notice.
 */
export function runLocalLabFallback(
  payload: LabApiRequestPayload,
  attachedResource: LibraryDocument | null = null
): LabApiResponsePayload {
  return runLocalFallbackEngine(payload, attachedResource);
}

/**
 * Converts a `/api/v2-ask` response (either structured Mạch Ngôn JSON or natural
 * Google-Search-grounded Markdown prose) into a `LabApiResponsePayload` with `sources`.
 */
export function parseV2AskLabPayload(
  v2Response: Pick<AskV2Response, 'answer' | 'sources' | 'searchQueries'>,
  payload: LabApiRequestPayload
): LabApiResponsePayload {
  const responseId = `resp_v2_${payload.session_id.slice(0, 8)}_${Date.now().toString(36)}`;
  const cleanSources = sanitizeGroundingSources(v2Response.sources);
  const searchQueries = v2Response.searchQueries ?? [];

  try {
    const parsed = extractCleanJson(v2Response.answer);
    const hasStructuredThreeLayer =
      parsed.three_layer && typeof parsed.three_layer === 'object';

    if (hasStructuredThreeLayer) {
      const aiClaimSummary =
        typeof parsed.ai_claim_summary === 'string' && parsed.ai_claim_summary.trim()
          ? parsed.ai_claim_summary.trim()
          : 'Phản hồi đối thoại Socrates.';

      const normalizedLayer = normalizeThreeLayer(
        parsed.three_layer as Partial<LabApiResponsePayload['three_layer']> &
          Record<string, unknown>,
        aiClaimSummary
      );

      if (cleanSources.length > 0 && normalizedLayer.evidenceCheck) {
        const mergedGrounded = Array.from(
          new Set([
            ...normalizedLayer.evidenceCheck.groundedClaims,
            ...cleanSources.slice(0, 3).map((s) => s.title),
          ])
        ).slice(0, 4);
        normalizedLayer.evidenceCheck = {
          ...normalizedLayer.evidenceCheck,
          status:
            normalizedLayer.evidenceCheck.unverifiedClaims.length === 0
              ? 'verified'
              : normalizedLayer.evidenceCheck.status === 'unverified'
                ? 'partial'
                : normalizedLayer.evidenceCheck.status,
          groundedClaims: mergedGrounded,
        };
      }

      return {
        session_id: payload.session_id,
        lab_type: payload.lab_type,
        response_id: responseId,
        source_engine: 'gemini',
        user_claim_summary:
          typeof parsed.user_claim_summary === 'string' && parsed.user_claim_summary.trim()
            ? parsed.user_claim_summary.trim()
            : payload.message.slice(0, 120),
        ai_claim_summary: aiClaimSummary,
        new_assumptions: Array.isArray(parsed.new_assumptions)
          ? parsed.new_assumptions.filter((item): item is string => typeof item === 'string')
          : [],
        contradiction_note:
          typeof parsed.contradiction_note === 'string' ? parsed.contradiction_note : null,
        contradiction_ref:
          typeof parsed.contradiction_ref === 'string' ? parsed.contradiction_ref : null,
        debate_steps: normalizeDebateSteps(
          Array.isArray(parsed.debate_steps)
            ? (parsed.debate_steps as LabApiResponsePayload['debate_steps'])
            : undefined
        ),
        three_layer: normalizedLayer,
        sources: cleanSources,
        searchQueries,
      };
    }
  } catch {
    // Plain/Markdown grounded prose from Google Search is expected here; handle cleanly below.
  }

  const prose = v2Response.answer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const paragraphs = prose
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  let guidingQuestion = '';
  let bodyParagraphs = paragraphs;

  const lastParagraph = paragraphs[paragraphs.length - 1] ?? '';
  if (lastParagraph.endsWith('?') && paragraphs.length > 1) {
    guidingQuestion = lastParagraph;
    bodyParagraphs = paragraphs.slice(0, -1);
  } else {
    const questionMatch = prose.match(/([^.!?\n][^\n]*\?)\s*$/);
    if (questionMatch && prose.length > questionMatch[1].length + 24) {
      guidingQuestion = questionMatch[1].trim();
      const stripped = prose.slice(0, prose.length - questionMatch[0].length).trim();
      bodyParagraphs = stripped
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }

  const cleanParagraphs = bodyParagraphs.length > 0 ? bodyParagraphs : [prose];
  const firstParagraph = cleanParagraphs[0] ?? prose;
  const remainingParagraphs = cleanParagraphs.slice(1).join('\n\n');
  const firstLinePlain = firstParagraph
    .replace(/\*\*/g, '')
    .split(/\n+/)
    .find(Boolean)
    ?.trim();
  const aiClaimSummary = firstLinePlain
    ? firstLinePlain.slice(0, 220)
    : 'Phản hồi phân tích kèm nguồn đối chiếu từ Google Search.';

  return {
    session_id: payload.session_id,
    lab_type: payload.lab_type,
    response_id: responseId,
    source_engine: 'gemini',
    user_claim_summary: payload.message.trim().slice(0, 140),
    ai_claim_summary: aiClaimSummary,
    new_assumptions: [],
    contradiction_note: null,
    contradiction_ref: null,
    debate_steps: normalizeDebateSteps(undefined),
    three_layer: {
      tldr: firstParagraph,
      facts:
        cleanSources.length > 0
          ? `Đã đối chiếu thông tin với ${cleanSources.length} nguồn tham khảo trực tuyến bên dưới.`
          : '',
      assumptions: '',
      interpretation: remainingParagraphs,
      guidingQuestion,
      evidenceCheck:
        cleanSources.length > 0
          ? {
              status: 'verified',
              groundedClaims: cleanSources.slice(0, 3).map((s) => s.title),
              unverifiedClaims: [],
              warning: null,
            }
          : undefined,
    },
    sources: cleanSources,
    searchQueries,
  };
}

/**
 * Executes an AI Labs (Concept Lab / Debate Lab) turn via the grounded `/api/v2-ask` endpoint.
 * Transparently surfaces quota/rate-limit/key errors instead of silently degrading so users
 * always know whether they are using the Smart API or explicitly choosing Local Fallback.
 */
export async function requestLabAnalysis(
  payload: LabApiRequestPayload,
  attachedResource: LibraryDocument | null = null
): Promise<LabApiResponsePayload> {
  if (payload.simulate_429) {
    throw new AIRateLimitError(
      'Đã hết bản thông minh (API AI) hiện tại do vượt giới hạn hạn mức (HTTP 429). Nội dung và tệp đính kèm của bạn vẫn được giữ nguyên.',
      12
    );
  }

  const systemInstruction = getSystemPrompt(
    payload.lab_type,
    attachedResource
      ? {
          title: attachedResource.title,
          author: attachedResource.author,
          excerpt: attachedResource.excerpt,
          source: attachedResource.source,
        }
      : null,
    null,
    payload.difficulty ?? 'intermediate'
  );

  const contextPrompt = buildConversationContextPrompt(payload);
  const prompt = [
    contextPrompt,
    'Khi trả lời, hãy ưu tiên xuất đúng một đối tượng JSON hợp lệ chứa các trường: user_claim_summary, ai_claim_summary, new_assumptions, contradiction_note, contradiction_ref, debate_steps, three_layer (tldr, positive_points, negative_points, facts, assumptions, interpretation, guidingQuestion, questionHint, evidence_check).',
  ].join('\n\n');

  const history: GenerateHistoryTurn[] = (payload.history ?? [])
    .slice(-8)
    .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim().slice(0, 800),
    }));

  const v2Response = await askV2WithSearch({
    prompt,
    systemInstruction,
    history,
  });

  return parseV2AskLabPayload(v2Response, payload);
}

/**
 * Evaluates an argument paragraph against V2's 5x3 Rubric using `/api/v2-ask`,
 * falling back transparently to local linguistic rubric analysis when AI is unavailable.
 */
export async function evaluateRubricWithV2(
  text: string,
  topic?: string
): Promise<RubricEvaluationResult> {
  try {
    const res = await askV2WithSearch({
      prompt: buildRubricGradingPrompt(text, topic),
      systemInstruction:
        'Bạn là giám khảo Ngữ văn THPT chấm lập luận theo 5 tiêu chí (mỗi tiêu chí 1..3 điểm). Trả về DUY NHẤT JSON hợp lệ, không viết bài thay học sinh.',
    });
    const parsed = parseRubricEvaluationJson(res.answer);
    if (parsed) {
      return {
        ...parsed,
        source: 'ai',
        sources: res.sources,
      };
    }
    return evaluateRubricLocal(
      text,
      'Phản hồi AI không đúng định dạng bảng chấm 5 tiêu chí; đã chuyển sang chấm cục bộ theo dấu hiệu ngôn ngữ.'
    );
  } catch (err) {
    const reason =
      err instanceof AIRateLimitError || err instanceof AIServiceError
        ? err.message
        : 'AI tạm thời không phản hồi; kết quả dưới đây do bộ phân tích cục bộ tạo (chỉ để tham khảo).';
    return evaluateRubricLocal(text, reason);
  }
}

export interface ToulminCompareResult {
  roles: ToulminRole[];
  why: string[];
  source: 'ai' | 'local';
  fallbackReason?: string;
}

/**
 * Suggests Toulmin sentence roles for a paragraph via `/api/v2-ask` with transparent local fallback.
 */
export async function annotateToulminWithV2(sentences: string[]): Promise<ToulminCompareResult> {
  try {
    const res = await askV2WithSearch({
      prompt: buildToulminAnnotationPrompt(sentences),
      systemInstruction:
        'Phân loại vai trò câu theo mô hình Toulmin (claim, ground, warrant, qual, reb, none). Trả về DUY NHẤT JSON hợp lệ.',
    });
    const parsed = parseToulminRolesJson(res.answer, sentences.length);
    if (parsed) {
      return {
        ...parsed,
        source: 'ai',
      };
    }
    return {
      roles: sentences.map((s, idx) => classifySentenceToulminLocal(s, idx)),
      why: sentences.map(() => ''),
      source: 'local',
      fallbackReason: 'Định dạng JSON AI chưa khớp số câu; đã chuyển sang gợi ý cục bộ theo từ khóa.',
    };
  } catch (err) {
    const reason =
      err instanceof AIRateLimitError || err instanceof AIServiceError
        ? err.message
        : 'AI tạm thời không phản hồi; đang dùng gợi ý cục bộ theo từ khóa.';
    return {
      roles: sentences.map((s, idx) => classifySentenceToulminLocal(s, idx)),
      why: sentences.map(() => ''),
      source: 'local',
      fallbackReason: reason,
    };
  }
}
