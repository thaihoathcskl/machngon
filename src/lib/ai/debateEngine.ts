import { GoogleGenAI, Type } from '@google/genai';
import { SEED_DOCUMENTS } from '../../content/seedDocuments.ts';
import type {
  DebateStepItem,
  LabApiRequestPayload,
  LabApiResponsePayload,
  LibraryDocument,
  ThreeLayerResponse,
} from '../types.ts';
import { runLocalFallbackEngine } from './localFallbackEngine.ts';
import {
  buildConversationContextPrompt,
  cleanSpokenVietnameseFillers,
  computeDebateStage,
  extractCleanJson,
  normalizeDebateSteps,
  normalizeThreeLayer,
} from './promptBuilder.ts';
import { getSystemPrompt } from './systemPrompts.ts';

export { cleanSpokenVietnameseFillers, computeDebateStage, extractCleanJson };

// In-memory server map keeping OpenAI Responses API `previous_response_id` per `session_id`
const sessionPreviousResponseMap = new Map<string, string>();

const STRUCTURED_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'user_claim_summary',
    'ai_claim_summary',
    'new_assumptions',
    'contradiction_note',
    'contradiction_ref',
    'debate_steps',
    'three_layer',
  ],
  properties: {
    user_claim_summary: { type: 'string' },
    ai_claim_summary: { type: 'string' },
    new_assumptions: {
      type: 'array',
      items: { type: 'string' },
    },
    contradiction_note: { type: ['string', 'null'] },
    contradiction_ref: { type: ['string', 'null'] },
    debate_steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'title', 'vietnameseTitle', 'summary'],
        properties: {
          key: {
            type: 'string',
            enum: ['identify', 'analyze', 'challenge', 'synthesize', 'respond'],
          },
          title: { type: 'string' },
          vietnameseTitle: { type: 'string' },
          summary: { type: 'string' },
        },
      },
    },
    three_layer: {
      type: 'object',
      additionalProperties: false,
      required: [
        'tldr',
        'positive_points',
        'negative_points',
        'facts',
        'assumptions',
        'interpretation',
        'guidingQuestion',
        'questionHint',
        'evidence_check',
      ],
      properties: {
        tldr: { type: 'string' },
        positive_points: { type: 'array', items: { type: 'string' } },
        negative_points: { type: 'array', items: { type: 'string' } },
        facts: { type: 'string' },
        assumptions: { type: 'string' },
        interpretation: { type: 'string' },
        guidingQuestion: { type: 'string' },
        questionHint: { type: 'string' },
        evidence_check: {
          type: 'object',
          additionalProperties: false,
          required: ['status', 'grounded_claims', 'unverified_claims', 'warning'],
          properties: {
            status: { type: 'string', enum: ['verified', 'partial', 'unverified'] },
            grounded_claims: { type: 'array', items: { type: 'string' } },
            unverified_claims: { type: 'array', items: { type: 'string' } },
            warning: { type: ['string', 'null'] },
          },
        },
      },
    },
  },
};

const OPENROUTER_JSON_CONTRACT_INSTRUCTION = `
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT JSON OBJECT HỢP LỆ (không kèm giải thích ngoài JSON, không markdown code block) theo đúng cấu trúc sau:
{
  "user_claim_summary": "Tóm tắt ngắn gọn lập luận của học sinh (1 câu)",
  "ai_claim_summary": "Tóm tắt ngắn gọn phản biện/gợi mở của AI (1 câu)",
  "new_assumptions": ["Giả định ngầm mới phát hiện (nếu có)"],
  "contradiction_note": null,
  "contradiction_ref": null,
  "debate_steps": [
    { "key": "identify", "title": "Identify", "vietnameseTitle": "Lập trường & khái niệm", "summary": "..." },
    { "key": "analyze", "title": "Analyze", "vietnameseTitle": "Giả định & bằng chứng", "summary": "..." },
    { "key": "challenge", "title": "Challenge", "vietnameseTitle": "Phản ví dụ thử thách", "summary": "..." },
    { "key": "synthesize", "title": "Synthesize", "vietnameseTitle": "Điều chỉnh quan điểm", "summary": "..." },
    { "key": "respond", "title": "Respond", "vietnameseTitle": "Tổng kết & gợi mở", "summary": "..." }
  ],
  "three_layer": {
    "tldr": "1-2 câu đi thẳng vào ý lõi",
    "positive_points": ["Điểm tích cực / hợp lý bám sát phát biểu"],
    "negative_points": ["Điểm hạn chế / cần phản biện bám sát chủ đề"],
    "facts": "1 ý ngắn ghi nhận cơ sở/dẫn chứng",
    "assumptions": "1 ý ngắn nêu giả định ngầm cần kiểm chứng",
    "interpretation": "2-3 câu ngắn phân tích lỗ hổng chính hoặc phản ví dụ sát chủ đề",
    "guidingQuestion": "DUY NHẤT 1 câu hỏi Socrates sắc bén kết thúc bằng dấu ?",
    "questionHint": "Gợi ý rất ngắn (tối đa 16 từ)",
    "evidence_check": {
      "status": "verified | partial | unverified",
      "grounded_claims": ["Ý đã có dẫn chứng/khớp tài liệu"],
      "unverified_claims": ["Ý chưa có nguồn xác thực"],
      "warning": "Cảnh báo ngắn nếu thiếu nguồn hoặc null"
    }
  }
}
`.trim();

/**
 * Backward-compatible alias using the upgraded `extractCleanJson`.
 */
export function extractJsonObject(rawText: string): Record<string, unknown> {
  return extractCleanJson(rawText);
}

function findPublishedSeedDocument(id?: string | null): LibraryDocument | null {
  if (!id) return null;
  const found = SEED_DOCUMENTS.find((doc) => doc.id === id && doc.status === 'published');
  return found ?? null;
}

function normalizeModelPayload(
  parsed: Record<string, unknown>,
  payload: LabApiRequestPayload,
  responseId: string,
  sourceEngine: LabApiResponsePayload['source_engine']
): LabApiResponsePayload {
  const aiClaimSummary =
    typeof parsed.ai_claim_summary === 'string' && parsed.ai_claim_summary.trim()
      ? parsed.ai_claim_summary.trim()
      : 'Phản hồi đối thoại Socrates.';

  const userClaimSummary =
    typeof parsed.user_claim_summary === 'string' && parsed.user_claim_summary.trim()
      ? parsed.user_claim_summary.trim()
      : payload.message.slice(0, 120);

  const newAssumptions = Array.isArray(parsed.new_assumptions)
    ? parsed.new_assumptions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : [];

  const contradictionNote =
    typeof parsed.contradiction_note === 'string' && parsed.contradiction_note.trim()
      ? parsed.contradiction_note.trim()
      : null;

  const contradictionRef =
    typeof parsed.contradiction_ref === 'string' && parsed.contradiction_ref.trim()
      ? parsed.contradiction_ref.trim()
      : null;

  const rawThreeLayer =
    parsed.three_layer && typeof parsed.three_layer === 'object'
      ? (parsed.three_layer as Partial<ThreeLayerResponse> & Record<string, unknown>)
      : undefined;

  return {
    session_id: payload.session_id,
    lab_type: payload.lab_type,
    response_id: responseId,
    source_engine: sourceEngine,
    user_claim_summary: userClaimSummary,
    ai_claim_summary: aiClaimSummary,
    new_assumptions: newAssumptions,
    contradiction_note: contradictionNote,
    contradiction_ref: contradictionRef,
    debate_steps: normalizeDebateSteps(parsed.debate_steps as DebateStepItem[] | undefined),
    three_layer: normalizeThreeLayer(rawThreeLayer, aiClaimSummary),
  };
}

const ENGINE_PLACEHOLDER_KEYS = new Set([
  'MY_GEMINI_API_KEY',
  'your_api_key_here',
  'YOUR_GEMINI_API_KEY',
  'YOUR_OPENROUTER_API_KEY',
  'CHANGE_ME',
]);

function hasValidGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key.length > 0 && !ENGINE_PLACEHOLDER_KEYS.has(key));
}

function hasValidOpenRouterKey(): boolean {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return Boolean(key && key.length > 0 && !ENGINE_PLACEHOLDER_KEYS.has(key));
}

function hasValidOpenAIKey(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.length > 0 && !ENGINE_PLACEHOLDER_KEYS.has(key));
}

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
]);

async function callGeminiStructuredAPI(
  payload: LabApiRequestPayload,
  systemPrompt: string,
  userPrompt: string
): Promise<LabApiResponsePayload> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_api_key_here') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const requestedModel = payload.model?.trim();
  const modelName =
    requestedModel && ALLOWED_GEMINI_MODELS.has(requestedModel)
      ? requestedModel
      : process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPrompt }];

  if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    for (const att of payload.attachments.slice(0, 3)) {
      if (att.textContent && att.textContent.trim()) {
        parts.push({
          text: `\n[Tệp đính kèm: ${att.name}]\n${att.textContent.slice(0, 12000)}`,
        });
      } else if (att.base64Data && att.mimeType) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64Data,
          },
        });
      }
    }
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: parts.length === 1 ? userPrompt : [{ role: 'user', parts }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 2048,
      temperature: 0.4,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          user_claim_summary: { type: Type.STRING },
          ai_claim_summary: { type: Type.STRING },
          new_assumptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          contradiction_note: { type: Type.STRING, nullable: true },
          contradiction_ref: { type: Type.STRING, nullable: true },
          debate_steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                title: { type: Type.STRING },
                vietnameseTitle: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ['key', 'title', 'vietnameseTitle', 'summary'],
            },
          },
          three_layer: {
            type: Type.OBJECT,
            properties: {
              tldr: { type: Type.STRING },
              positive_points: { type: Type.ARRAY, items: { type: Type.STRING } },
              negative_points: { type: Type.ARRAY, items: { type: Type.STRING } },
              facts: { type: Type.STRING },
              assumptions: { type: Type.STRING },
              interpretation: { type: Type.STRING },
              guidingQuestion: { type: Type.STRING },
              questionHint: { type: Type.STRING },
              evidence_check: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING },
                  grounded_claims: { type: Type.ARRAY, items: { type: Type.STRING } },
                  unverified_claims: { type: Type.ARRAY, items: { type: Type.STRING } },
                  warning: { type: Type.STRING, nullable: true },
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
      },
    },
  });

  const parsed = extractCleanJson(response.text ?? '');
  const responseId = `resp_gem_${payload.session_id.slice(0, 8)}_${Date.now().toString(36)}`;
  sessionPreviousResponseMap.set(payload.session_id, responseId);

  return normalizeModelPayload(parsed, payload, responseId, 'gemini');
}

function extractOpenRouterCitationSources(
  annotations: Array<{ url_citation?: { url?: string; title?: string }; url?: string; title?: string }> | undefined
) {
  if (!Array.isArray(annotations)) return [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string; url: string }> = [];
  for (const ann of annotations) {
    const rawUrl = (ann?.url_citation?.url || ann?.url || '').trim();
    if (!rawUrl || seen.has(rawUrl)) continue;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      seen.add(rawUrl);
      const rawTitle = (ann?.url_citation?.title || ann?.title || '').trim();
      sources.push({
        title: rawTitle || parsed.hostname.replace(/^www\./, ''),
        uri: rawUrl,
        url: rawUrl,
      });
    } catch {
      // Ignore malformed URI
    }
  }
  return sources;
}

async function callOpenRouterAPI(
  payload: LabApiRequestPayload,
  systemPrompt: string,
  userPrompt: string
): Promise<LabApiResponsePayload> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || ENGINE_PLACEHOLDER_KEYS.has(apiKey)) {
    throw new Error('OPENROUTER_API_KEY_MISSING');
  }

  const baseUrl = (process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1').replace(
    /\/+$/,
    ''
  );
  const configuredModel = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
  const appUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : 'http://localhost:3000';

  const invokeModel = async (modelId: string, withWebPlugin: boolean) => {
    const requestBody: Record<string, unknown> = {
      model: modelId,
      temperature: 0.4,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\n${OPENROUTER_JSON_CONTRACT_INSTRUCTION}`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };
    if (withWebPlugin) {
      requestBody.plugins = [{ id: 'web', max_results: 4 }];
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': appUrl,
        'X-Title': 'Mach Ngon AI Labs',
      },
      body: JSON.stringify(requestBody),
    });

    if (res.status === 429) {
      const err = new Error('OPENROUTER_RATE_LIMIT_429') as Error & { status?: number };
      err.status = 429;
      throw err;
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      const err = new Error(
        `OpenRouter API error (${res.status}): ${errorText.slice(0, 200)}`
      ) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    const data = (await res.json()) as {
      id?: string;
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
          annotations?: Array<{
            url_citation?: { url?: string; title?: string };
            url?: string;
            title?: string;
          }>;
        };
      }>;
    };

    const msg = data.choices?.[0]?.message;
    const rawContent = msg?.content;
    const contentText =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map((part) => part.text ?? '').join('')
          : '';

    const parsed = extractCleanJson(contentText);
    const responseId = `resp_openrouter_${payload.session_id.slice(0, 8)}_${Date.now().toString(36)}`;
    sessionPreviousResponseMap.set(payload.session_id, responseId);

    const normalized = normalizeModelPayload(parsed, payload, responseId, 'openai-responses');
    const sources = extractOpenRouterCitationSources(msg?.annotations);
    if (sources.length > 0) {
      normalized.sources = sources;
    }
    return normalized;
  };

  try {
    return await invokeModel(configuredModel, true);
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 0;
    if (status === 401 || status === 403 || status === 429) {
      throw err;
    }
    try {
      return await invokeModel(configuredModel, false);
    } catch (plainErr) {
      if (configuredModel !== 'openrouter/free') {
        return await invokeModel('openrouter/free', false);
      }
      throw plainErr;
    }
  }
}

async function callOpenAIResponsesAPI(
  payload: LabApiRequestPayload,
  systemPrompt: string,
  userPrompt: string
): Promise<LabApiResponsePayload> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING');
  }

  const prevResponseId =
    payload.previous_response_id ?? sessionPreviousResponseMap.get(payload.session_id) ?? undefined;

  const requestBody: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    instructions: systemPrompt,
    input: userPrompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'mach_ngon_debate_response',
        strict: true,
        schema: STRUCTURED_OUTPUT_JSON_SCHEMA,
      },
    },
  };

  if (
    prevResponseId &&
    prevResponseId.startsWith('resp_') &&
    !prevResponseId.startsWith('resp_local_') &&
    !prevResponseId.startsWith('resp_gem_') &&
    !prevResponseId.startsWith('resp_openrouter_')
  ) {
    requestBody.previous_response_id = prevResponseId;
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (res.status === 429) {
    const err = new Error('OPENAI_RATE_LIMIT_429') as Error & { status?: number };
    err.status = 429;
    throw err;
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`OpenAI Responses API error (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const rawJson =
    data.output_text ||
    data.output?.[0]?.content?.find((c) => typeof c.text === 'string')?.text ||
    '';

  const parsed = extractCleanJson(rawJson);
  const responseId = data.id || `resp_openai_${Date.now().toString(36)}`;
  sessionPreviousResponseMap.set(payload.session_id, responseId);

  return normalizeModelPayload(parsed, payload, responseId, 'openai-responses');
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export interface DebateEngineProviderOverrides {
  callGemini?: typeof callGeminiStructuredAPI;
  callOpenRouter?: typeof callOpenRouterAPI;
  callOpenAI?: typeof callOpenAIResponsesAPI;
}

export async function executeDebateEngine(
  payload: LabApiRequestPayload,
  overrides?: DebateEngineProviderOverrides
): Promise<LabApiResponsePayload> {
  const resourceDoc = findPublishedSeedDocument(payload.resource_context_id);

  const systemPrompt = getSystemPrompt(
    payload.lab_type,
    resourceDoc
      ? {
          title: resourceDoc.title,
          author: resourceDoc.author,
          excerpt: resourceDoc.excerpt,
          source: resourceDoc.source,
        }
      : null,
    null,
    payload.difficulty ?? 'intermediate'
  );
  const userPrompt = buildConversationContextPrompt(payload);

  const geminiCaller = overrides?.callGemini ?? callGeminiStructuredAPI;
  const openRouterCaller = overrides?.callOpenRouter ?? callOpenRouterAPI;
  const openAICaller = overrides?.callOpenAI ?? callOpenAIResponsesAPI;
  const preferOpenRouterFirst =
    process.env.AI_PRIMARY_PROVIDER?.trim().toLowerCase() === 'openrouter' &&
    (hasValidOpenRouterKey() || Boolean(overrides?.callOpenRouter));

  if (preferOpenRouterFirst) {
    try {
      return await withTimeout(
        openRouterCaller(payload, systemPrompt, userPrompt),
        18_000,
        'OPENROUTER'
      );
    } catch (err) {
      console.error('[DebateEngine] OpenRouter primary error:', err);
    }
  }

  if (hasValidGeminiKey() || overrides?.callGemini) {
    try {
      return await withTimeout(geminiCaller(payload, systemPrompt, userPrompt), 15_000, 'GEMINI');
    } catch (err) {
      console.error('[DebateEngine] Gemini error:', err);
    }
  }

  if (!preferOpenRouterFirst && (hasValidOpenRouterKey() || overrides?.callOpenRouter)) {
    try {
      return await withTimeout(
        openRouterCaller(payload, systemPrompt, userPrompt),
        18_000,
        'OPENROUTER'
      );
    } catch (err) {
      console.error('[DebateEngine] OpenRouter error:', err);
    }
  }

  if (hasValidOpenAIKey() || overrides?.callOpenAI) {
    try {
      return await withTimeout(openAICaller(payload, systemPrompt, userPrompt), 15_000, 'OPENAI');
    } catch (err) {
      console.error('[DebateEngine] OpenAI error:', err);
    }
  }

  return runLocalFallbackEngine(payload, resourceDoc);
}
