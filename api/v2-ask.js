import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-4-hydrogen';
const ALLOWED_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
]);

const MAX_PROMPT_CHARS = 30_000;
const MAX_SYSTEM_CHARS = 8_000;
const MAX_HISTORY_TURNS = 20;
const REQUEST_TIMEOUT_MS = 28_000;
const MAX_RETRIES = 2;

const DEFAULT_SYSTEM_INSTRUCTION = [
  'Bạn là trợ lý tra cứu học thuật của nền tảng Mạch Ngôn.',
  'Hãy trả lời bằng tiếng Việt rõ ràng, chính xác, khách quan và sử dụng công cụ tìm kiếm Google / Web khi cần kiểm chứng sự kiện, số liệu hoặc tài liệu tham khảo.',
  'Nếu thông tin còn chưa chắc chắn hoặc có nhiều cách hiểu, hãy nêu rõ phạm vi và nguồn đối chiếu.',
].join(' ');

const PLACEHOLDER_KEYS = new Set([
  'MY_GEMINI_API_KEY',
  'your_api_key_here',
  'YOUR_GEMINI_API_KEY',
  'YOUR_OPENROUTER_API_KEY',
  'CHANGE_ME',
]);

function isConfiguredApiKey(rawKey) {
  if (typeof rawKey !== 'string') return false;
  const trimmed = rawKey.trim();
  return trimmed.length > 0 && !PLACEHOLDER_KEYS.has(trimmed);
}

function resolveModel(requested) {
  if (typeof requested === 'string') {
    const clean = requested.trim();
    if (ALLOWED_MODELS.has(clean)) {
      return clean;
    }
  }
  const envModel = process.env.GEMINI_V2_ASK_MODEL?.trim();
  if (envModel && ALLOWED_MODELS.has(envModel)) {
    return envModel;
  }
  return DEFAULT_MODEL;
}

function parseRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return { ok: false, error: 'Thiếu dữ liệu yêu cầu (request body).' };
  }
  if (typeof rawBody === 'string') {
    const trimmed = rawBody.trim();
    if (!trimmed) {
      return { ok: false, error: 'Nội dung yêu cầu không được để trống.' };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'Định dạng JSON không hợp lệ: cần một đối tượng JSON.' };
      }
      return { ok: true, data: parsed };
    } catch {
      return { ok: false, error: 'Dữ liệu gửi lên không phải JSON hợp lệ.' };
    }
  }
  if (typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    return { ok: true, data: rawBody };
  }
  return { ok: false, error: 'Định dạng dữ liệu yêu cầu không hợp lệ.' };
}

function buildContents(body) {
  const contents = [];
  let totalChars = 0;

  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-MAX_HISTORY_TURNS)) {
      if (!turn || typeof turn !== 'object') continue;
      const text =
        typeof turn.content === 'string'
          ? turn.content.trim()
          : typeof turn.text === 'string'
            ? turn.text.trim()
            : '';
      if (!text) continue;
      totalChars += text.length;
      contents.push({
        role: turn.role === 'model' || turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      });
    }
  }

  const rawPrompt = [body.prompt, body.question, body.query, body.message].find(
    (v) => typeof v === 'string' && v.trim().length > 0
  );

  if (typeof rawPrompt === 'string') {
    const promptText = rawPrompt.trim();
    totalChars += promptText.length;
    contents.push({
      role: 'user',
      parts: [{ text: promptText }],
    });
  } else if (Array.isArray(body.contents) && contents.length === 0) {
    for (const item of body.contents.slice(-MAX_HISTORY_TURNS)) {
      if (!item || typeof item !== 'object' || !Array.isArray(item.parts)) continue;
      const textParts = item.parts
        .filter((p) => p && typeof p.text === 'string' && p.text.trim().length > 0)
        .map((p) => {
          const t = p.text.trim();
          totalChars += t.length;
          return { text: t };
        });
      if (textParts.length > 0) {
        contents.push({
          role: item.role === 'model' || item.role === 'assistant' ? 'model' : 'user',
          parts: textParts,
        });
      }
    }
  }

  if (contents.length === 0) {
    return {
      ok: false,
      error: 'Vui lòng cung cấp câu hỏi hoặc nội dung cần tra cứu (question hoặc prompt).',
    };
  }

  if (totalChars > MAX_PROMPT_CHARS) {
    return {
      ok: false,
      error: `Nội dung câu hỏi vượt quá giới hạn cho phép (${MAX_PROMPT_CHARS.toLocaleString('vi-VN')} ký tự).`,
    };
  }

  const systemInstruction =
    typeof body.systemInstruction === 'string' && body.systemInstruction.trim().length > 0
      ? body.systemInstruction.trim().slice(0, MAX_SYSTEM_CHARS)
      : DEFAULT_SYSTEM_INSTRUCTION;

  return { ok: true, contents, systemInstruction };
}

function isSafeHttpUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractGroundingSources(response) {
  const metadata = response?.candidates?.[0]?.groundingMetadata;
  const chunks = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  const seenUris = new Set();
  const sources = [];

  for (const chunk of chunks) {
    const uri = typeof chunk?.web?.uri === 'string' ? chunk.web.uri.trim() : '';
    if (!uri || !isSafeHttpUrl(uri) || seenUris.has(uri)) continue;
    seenUris.add(uri);
    const rawTitle = typeof chunk?.web?.title === 'string' ? chunk.web.title.trim() : '';
    let fallbackHost = uri;
    try {
      fallbackHost = new URL(uri).hostname.replace(/^www\./, '');
    } catch {
      // Keep original URI as fallback label
    }
    sources.push({
      title: rawTitle || fallbackHost,
      uri,
      url: uri,
    });
  }

  const searchQueries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.filter((q) => typeof q === 'string' && q.trim().length > 0)
    : [];

  return { sources, searchQueries };
}

export function extractOpenRouterSources(message) {
  const annotations = Array.isArray(message?.annotations) ? message.annotations : [];
  const seenUris = new Set();
  const sources = [];

  for (const ann of annotations) {
    const url =
      typeof ann?.url_citation?.url === 'string'
        ? ann.url_citation.url.trim()
        : typeof ann?.url === 'string'
          ? ann.url.trim()
          : '';
    if (!url || !isSafeHttpUrl(url) || seenUris.has(url)) continue;
    seenUris.add(url);
    const rawTitle =
      typeof ann?.url_citation?.title === 'string'
        ? ann.url_citation.title.trim()
        : typeof ann?.title === 'string'
          ? ann.title.trim()
          : '';
    let fallbackHost = url;
    try {
      fallbackHost = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // Keep original URL as fallback label
    }
    sources.push({
      title: rawTitle || fallbackHost,
      uri: url,
      url,
    });
  }

  return sources;
}

function getUpstreamErrorInfo(err) {
  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.code === 'number'
        ? err.code
        : undefined;
  const message = err instanceof Error ? err.message : String(err || '');
  const upperMsg = message.toUpperCase();

  if (status === 429 || upperMsg.includes('RESOURCE_EXHAUSTED') || upperMsg.includes('429')) {
    return {
      httpStatus: 429,
      code: 'QUOTA_EXHAUSTED',
      retryable: true,
      error:
        'Hệ thống AI đang chạm giới hạn tần suất (429). Vui lòng thử lại sau ít giây hoặc kiểm tra hạn mức API.',
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    upperMsg.includes('PERMISSION_DENIED') ||
    upperMsg.includes('API_KEY_INVALID')
  ) {
    return {
      httpStatus: 500,
      code: 'INVALID_API_KEY',
      retryable: false,
      error:
        'Khóa API trên máy chủ không hợp lệ hoặc không có quyền truy cập dịch vụ.',
    };
  }

  if (status === 404 || upperMsg.includes('NOT_FOUND')) {
    return {
      httpStatus: 502,
      code: 'MODEL_NOT_FOUND',
      retryable: false,
      error: 'Model AI được yêu cầu hiện không khả dụng trên máy chủ.',
    };
  }

  if (status === 400 || upperMsg.includes('INVALID_ARGUMENT')) {
    return {
      httpStatus: 400,
      code: 'UPSTREAM_BAD_REQUEST',
      retryable: false,
      error: 'Yêu cầu tra cứu chưa hợp lệ với dịch vụ AI.',
    };
  }

  if (status === 503 || status === 502 || status === 504 || upperMsg.includes('UNAVAILABLE')) {
    return {
      httpStatus: 502,
      code: 'UPSTREAM_UNAVAILABLE',
      retryable: true,
      error: 'Dịch vụ AI tạm thời gián đoạn. Vui lòng thử lại sau.',
    };
  }

  return {
    httpStatus: 502,
    code: 'UPSTREAM_ERROR',
    retryable: false,
    error: 'Không thể hoàn tất tra cứu từ máy chủ AI vào lúc này.',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateGroundedWithRetry(ai, params) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          const timeoutErr = new Error('REQUEST_TIMEOUT');
          timeoutErr.name = 'AbortError';
          reject(timeoutErr);
        }, REQUEST_TIMEOUT_MS);
        timer.unref?.();
      });

      return await Promise.race([
        ai.models.generateContent(params),
        timeoutPromise,
      ]);
    } catch (err) {
      lastError = err;
      if (err && typeof err === 'object' && err.name === 'AbortError') {
        throw err;
      }
      const info = getUpstreamErrorInfo(err);
      if (!info.retryable || attempt === MAX_RETRIES) {
        throw err;
      }
      await sleep(350 * Math.pow(2, attempt));
    }
  }
  throw lastError;
}

async function invokeOpenRouterV2({ contents, systemInstruction, apiKey }) {
  const baseUrl = (process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1').replace(
    /\/+$/,
    ''
  );
  const configuredModel = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
  const appUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : 'https://machngon.edu.vn';

  const messages = [{ role: 'system', content: systemInstruction }];
  for (const item of contents) {
    const joinedText = (item.parts || [])
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
    if (!joinedText) continue;
    messages.push({
      role: item.role === 'model' ? 'assistant' : 'user',
      content: joinedText,
    });
  }

  const attemptCall = async (modelId, withWebPlugin) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const requestPayload = {
        model: modelId,
        messages,
        temperature: 0.45,
        max_tokens: 2048,
      };
      if (withWebPlugin) {
        requestPayload.plugins = [{ id: 'web', max_results: 4 }];
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': appUrl,
          'X-Title': 'Mach Ngon AI Library & Labs',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const err = new Error(`OpenRouter error (${response.status}): ${errorBody.slice(0, 180)}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const msg = data?.choices?.[0]?.message;
      const rawContent = msg?.content;
      const answer =
        typeof rawContent === 'string'
          ? rawContent.trim()
          : Array.isArray(rawContent)
            ? rawContent.map((part) => part?.text || '').join('').trim()
            : '';

      if (!answer) {
        const emptyErr = new Error('EMPTY_AI_RESPONSE');
        emptyErr.status = 502;
        throw emptyErr;
      }

      const sources = extractOpenRouterSources(msg);
      return {
        answer,
        text: answer,
        sources,
        searchQueries: [],
        model: data?.model || modelId,
        finishReason: data?.choices?.[0]?.finish_reason ?? null,
        provider: 'openrouter',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Try configured model with OpenRouter web search plugin first, then plain if plugin unsupported
  try {
    return await attemptCall(configuredModel, true);
  } catch (err) {
    if (err && typeof err === 'object' && err.name === 'AbortError') {
      throw err;
    }
    const status = typeof err?.status === 'number' ? err.status : 0;
    if (status === 401 || status === 403) {
      throw err;
    }
    try {
      return await attemptCall(configuredModel, false);
    } catch (plainErr) {
      if (configuredModel !== 'openrouter/free') {
        return await attemptCall('openrouter/free', false);
      }
      throw plainErr;
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Phương thức không được hỗ trợ. Vui lòng gửi yêu cầu bằng phương thức POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  const rawGeminiKey = process.env.GEMINI_API_KEY;
  const rawOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const hasGemini = isConfiguredApiKey(rawGeminiKey);
  const hasOpenRouter = isConfiguredApiKey(rawOpenRouterKey);

  if (!hasGemini && !hasOpenRouter) {
    return res.status(500).json({
      error: 'Máy chủ chưa được cấu hình khóa GEMINI_API_KEY hoặc OPENROUTER_API_KEY.',
      code: 'MISSING_API_KEY',
    });
  }

  const parsedBody = parseRequestBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({
      error: parsedBody.error,
      code: 'INVALID_REQUEST_BODY',
    });
  }

  const built = buildContents(parsedBody.data);
  if (!built.ok) {
    return res.status(400).json({
      error: built.error,
      code: 'INVALID_PROMPT_PAYLOAD',
    });
  }

  const preferOpenRouterFirst =
    process.env.AI_PRIMARY_PROVIDER?.trim().toLowerCase() === 'openrouter' && hasOpenRouter;

  let lastError = null;

  if (preferOpenRouterFirst) {
    try {
      const orResult = await invokeOpenRouterV2({
        contents: built.contents,
        systemInstruction: built.systemInstruction,
        apiKey: rawOpenRouterKey,
      });
      return res.status(200).json(orResult);
    } catch (err) {
      lastError = err;
      console.error('[POST /api/v2-ask] OpenRouter primary failed:', err instanceof Error ? err.message : 'Unknown');
    }
  }

  if (hasGemini) {
    const activeModel = resolveModel(parsedBody.data.model);
    const ai = new GoogleGenAI({
      apiKey: rawGeminiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const response = await generateGroundedWithRetry(ai, {
        model: activeModel,
        contents: built.contents,
        config: {
          systemInstruction: built.systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const answer = typeof response?.text === 'string' ? response.text.trim() : '';
      if (!answer) {
        const emptyErr = new Error('EMPTY_AI_RESPONSE');
        emptyErr.status = 502;
        throw emptyErr;
      }

      const { sources, searchQueries } = extractGroundingSources(response);

      return res.status(200).json({
        answer,
        text: answer,
        sources,
        searchQueries,
        model: activeModel,
        finishReason: response?.candidates?.[0]?.finishReason ?? null,
        provider: 'gemini',
      });
    } catch (err) {
      lastError = err;
      console.error('[POST /api/v2-ask] Gemini error:', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (hasOpenRouter && !preferOpenRouterFirst) {
    try {
      const orResult = await invokeOpenRouterV2({
        contents: built.contents,
        systemInstruction: built.systemInstruction,
        apiKey: rawOpenRouterKey,
      });
      return res.status(200).json(orResult);
    } catch (err) {
      lastError = err;
      console.error('[POST /api/v2-ask] OpenRouter fallback error:', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (lastError && typeof lastError === 'object' && lastError.name === 'AbortError') {
    return res.status(504).json({
      error: 'Yêu cầu tra cứu AI quá thời gian chờ. Vui lòng thử lại.',
      code: 'UPSTREAM_TIMEOUT',
    });
  }

  const info = getUpstreamErrorInfo(lastError);
  if (info.httpStatus === 429) {
    res.setHeader('Retry-After', '15');
  }

  return res.status(info.httpStatus).json({
    error: info.error,
    code: info.code,
  });
}
