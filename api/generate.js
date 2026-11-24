const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
]);
const REQUEST_TIMEOUT_MS = 28_000;
const MAX_TOTAL_CHARS = 75_000;
const MAX_TURNS = 50;
const MAX_ATTACHMENTS = 3;
const MAX_INLINE_BASE64_CHARS = 7_000_000; // ~5 MB decoded binary payload

function resolveGeminiModel(requested) {
  if (typeof requested === 'string') {
    const clean = requested.trim();
    if (ALLOWED_GEMINI_MODELS.has(clean)) {
      return clean;
    }
  }
  return DEFAULT_GEMINI_MODEL;
}

const ALLOWED_INLINE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

const PLACEHOLDER_KEYS = new Set([
  'MY_GEMINI_API_KEY',
  'your_api_key_here',
  'YOUR_GEMINI_API_KEY',
  'CHANGE_ME',
]);

function isConfiguredApiKey(rawKey) {
  if (typeof rawKey !== 'string') return false;
  const trimmed = rawKey.trim();
  return trimmed.length > 0 && !PLACEHOLDER_KEYS.has(trimmed);
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

function normalizeRole(role) {
  if (role === 'model' || role === 'assistant') return 'model';
  return 'user';
}

function isValidBase64(str) {
  if (typeof str !== 'string' || str.length === 0 || str.length > MAX_INLINE_BASE64_CHARS) {
    return false;
  }
  return /^[A-Za-z0-9+/=\r\n]+$/.test(str);
}

function normalizeParts(rawParts, state) {
  if (!Array.isArray(rawParts)) return { ok: true, parts: [] };
  const parts = [];
  for (const part of rawParts) {
    if (!part || typeof part !== 'object') continue;
    if (typeof part.text === 'string') {
      const text = part.text.trim();
      if (text) {
        parts.push({ text });
      }
    } else if (part.inlineData && typeof part.inlineData === 'object') {
      const mimeType = typeof part.inlineData.mimeType === 'string' ? part.inlineData.mimeType.trim().toLowerCase() : '';
      const data = typeof part.inlineData.data === 'string' ? part.inlineData.data.replace(/\s+/g, '') : '';
      if (!ALLOWED_INLINE_MIME_TYPES.has(mimeType)) {
        return {
          ok: false,
          error: `Định dạng tệp đính kèm không được hỗ trợ (${mimeType || 'không xác định'}). Chỉ hỗ trợ PNG, JPG, WEBP và PDF.`,
        };
      }
      if (!isValidBase64(data)) {
        return {
          ok: false,
          error: 'Dữ liệu tệp đính kèm không hợp lệ hoặc vượt quá giới hạn 5 MB mỗi tệp.',
        };
      }
      state.inlineCount += 1;
      if (state.inlineCount > MAX_ATTACHMENTS) {
        return {
          ok: false,
          error: `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp hình ảnh/PDF trong mỗi lượt.`,
        };
      }
      parts.push({ inlineData: { mimeType, data } });
    }
  }
  return { ok: true, parts };
}

function buildGeminiPayload(body) {
  const contents = [];
  const state = { inlineCount: 0 };

  if (Array.isArray(body.contents)) {
    for (const item of body.contents.slice(-MAX_TURNS)) {
      if (!item || typeof item !== 'object') continue;
      const res = normalizeParts(item.parts, state);
      if (!res.ok) return res;
      if (res.parts.length > 0) {
        contents.push({
          role: normalizeRole(item.role),
          parts: res.parts,
        });
      }
    }
  } else {
    if (Array.isArray(body.history)) {
      for (const turn of body.history.slice(-MAX_TURNS)) {
        if (!turn || typeof turn !== 'object') continue;
        let turnParts = [];
        if (Array.isArray(turn.parts)) {
          const res = normalizeParts(turn.parts, state);
          if (!res.ok) return res;
          turnParts = res.parts;
        } else if (typeof turn.content === 'string' && turn.content.trim()) {
          turnParts = [{ text: turn.content.trim() }];
        } else if (typeof turn.text === 'string' && turn.text.trim()) {
          turnParts = [{ text: turn.text.trim() }];
        }

        if (turnParts.length > 0) {
          contents.push({
            role: normalizeRole(turn.role),
            parts: turnParts,
          });
        }
      }
    }

    const latestUserParts = [];
    if (typeof body.prompt === 'string' && body.prompt.trim().length > 0) {
      latestUserParts.push({ text: body.prompt.trim() });
    }

    // Optional top-level attachments array: [{ name, mimeType, data?, textContent? }]
    if (Array.isArray(body.attachments)) {
      if (body.attachments.length > MAX_ATTACHMENTS) {
        return {
          ok: false,
          error: `Chỉ hỗ trợ tối đa ${MAX_ATTACHMENTS} tệp đính kèm trong một lượt gửi.`,
        };
      }
      for (const att of body.attachments) {
        if (!att || typeof att !== 'object') continue;
        const safeName = typeof att.name === 'string' ? att.name.trim().slice(0, 140) : 'tep-dinh-kem';
        const inlinePayload =
          typeof att.data === 'string' && att.data.trim().length > 0
            ? att.data
            : typeof att.base64Data === 'string' && att.base64Data.trim().length > 0
              ? att.base64Data
              : '';
        if (typeof att.textContent === 'string' && att.textContent.trim().length > 0) {
          latestUserParts.push({
            text: `[Nội dung tệp đính kèm "${safeName}"]\n${att.textContent.trim().slice(0, 15_000)}`,
          });
        } else if (inlinePayload.length > 0) {
          const mimeType = typeof att.mimeType === 'string' ? att.mimeType.trim().toLowerCase() : '';
          const cleanData = inlinePayload.replace(/\s+/g, '');
          if (!ALLOWED_INLINE_MIME_TYPES.has(mimeType)) {
            return {
              ok: false,
              error: `Định dạng tệp "${safeName}" chưa được hỗ trợ. Hỗ trợ: TXT, MD, DOCX, CSV, JSON, PNG, JPG, WEBP, PDF.`,
            };
          }
          if (!isValidBase64(cleanData)) {
            return {
              ok: false,
              error: `Tệp "${safeName}" vượt quá giới hạn 5 MB hoặc dữ liệu không hợp lệ.`,
            };
          }
          state.inlineCount += 1;
          if (state.inlineCount > MAX_ATTACHMENTS) {
            return {
              ok: false,
              error: `Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp hình ảnh/PDF trong mỗi lượt.`,
            };
          }
          latestUserParts.push({
            inlineData: {
              mimeType,
              data: cleanData,
            },
          });
        }
      }
    }

    if (latestUserParts.length > 0) {
      contents.push({
        role: 'user',
        parts: latestUserParts,
      });
    }
  }

  if (contents.length === 0) {
    return {
      ok: false,
      error: 'Vui lòng cung cấp nội dung câu hỏi (prompt, history, contents hoặc tệp đính kèm).',
    };
  }

  if (contents.length > MAX_TURNS) {
    return {
      ok: false,
      error: `Số lượt hội thoại vượt quá giới hạn cho phép (${MAX_TURNS} lượt).`,
    };
  }

  const payload = { contents };
  let totalChars = 0;

  for (const turn of contents) {
    for (const part of turn.parts) {
      if (typeof part.text === 'string') {
        totalChars += part.text.length;
      }
    }
  }

  if (typeof body.systemInstruction === 'string' && body.systemInstruction.trim().length > 0) {
    const sysText = body.systemInstruction.trim();
    totalChars += sysText.length;
    payload.systemInstruction = {
      parts: [{ text: sysText }],
    };
  } else if (
    body.systemInstruction &&
    typeof body.systemInstruction === 'object' &&
    Array.isArray(body.systemInstruction.parts)
  ) {
    const sysRes = normalizeParts(body.systemInstruction.parts, { inlineCount: 0 });
    if (!sysRes.ok) return sysRes;
    const textOnlyParts = sysRes.parts.filter((p) => typeof p.text === 'string');
    if (textOnlyParts.length > 0) {
      for (const part of textOnlyParts) {
        totalChars += part.text.length;
      }
      payload.systemInstruction = { parts: textOnlyParts };
    }
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    return {
      ok: false,
      error: 'Tổng dung lượng văn bản gửi lên vượt quá giới hạn cho phép. Hãy rút gọn nội dung hoặc tệp đính kèm.',
    };
  }

  const safeConfig = {
    temperature: 0.4,
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (
    body.generationConfig &&
    typeof body.generationConfig === 'object' &&
    !Array.isArray(body.generationConfig)
  ) {
    const cfg = body.generationConfig;

    if (typeof cfg.temperature === 'number' && Number.isFinite(cfg.temperature)) {
      safeConfig.temperature = Math.min(2, Math.max(0, cfg.temperature));
    }
    if (typeof cfg.topP === 'number' && Number.isFinite(cfg.topP)) {
      safeConfig.topP = Math.min(1, Math.max(0, cfg.topP));
    }
    if (typeof cfg.topK === 'number' && Number.isFinite(cfg.topK)) {
      safeConfig.topK = Math.min(100, Math.max(1, Math.round(cfg.topK)));
    }
    if (typeof cfg.maxOutputTokens === 'number' && Number.isFinite(cfg.maxOutputTokens)) {
      safeConfig.maxOutputTokens = Math.min(8192, Math.max(128, Math.round(cfg.maxOutputTokens)));
    }
    if (cfg.responseMimeType === 'application/json' || cfg.responseMimeType === 'text/plain') {
      safeConfig.responseMimeType = cfg.responseMimeType;
    }
    if (
      cfg.responseSchema &&
      typeof cfg.responseSchema === 'object' &&
      !Array.isArray(cfg.responseSchema)
    ) {
      safeConfig.responseSchema = cfg.responseSchema;
    }
  }

  payload.generationConfig = safeConfig;

  return { ok: true, payload };
}

function extractTextFromGeminiData(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const firstCandidate = candidates[0];
  const parts = Array.isArray(firstCandidate?.content?.parts) ? firstCandidate.content.parts : [];
  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return {
    text,
    finishReason: typeof firstCandidate?.finishReason === 'string' ? firstCandidate.finishReason : null,
    candidates,
  };
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

  const rawApiKey = process.env.GEMINI_API_KEY;
  if (!isConfiguredApiKey(rawApiKey)) {
    return res.status(500).json({
      error:
        'Bản thông minh (API AI) hiện chưa được cấu hình khóa GEMINI_API_KEY trên máy chủ. Nội dung bạn đang soạn vẫn được giữ nguyên.',
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

  const built = buildGeminiPayload(parsedBody.data);
  if (!built.ok) {
    return res.status(400).json({
      error: built.error,
      code: 'INVALID_PROMPT_PAYLOAD',
    });
  }

  const apiKey = rawApiKey.trim();
  const activeModel = resolveGeminiModel(parsedBody.data.model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(built.payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const upstreamJson = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const upstreamStatus = upstreamResponse.status;
      const upstreamErrorStatus = String(upstreamJson?.error?.status || '');

      if (upstreamStatus === 429 || upstreamErrorStatus === 'RESOURCE_EXHAUSTED') {
        const retryHeader = Number(upstreamResponse.headers.get('retry-after') || '15');
        const retryAfter = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : 15;
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error:
            'Đã hết hạn mức hoặc chạm giới hạn lượt của bản thông minh (Gemini API) ở thời điểm hiện tại. Toàn bộ nội dung và tệp bạn đang soạn vẫn được bảo toàn nguyên vẹn.',
          code: 'QUOTA_EXHAUSTED',
          retry_after: retryAfter,
        });
      }

      if (upstreamStatus === 401 || upstreamStatus === 403) {
        console.error(`[POST /api/generate] Gemini auth error (status ${upstreamStatus})`);
        return res.status(500).json({
          error:
            'Khóa GEMINI_API_KEY trên máy chủ đã hết hiệu lực hoặc không có quyền truy cập bản thông minh (API). Nội dung của bạn vẫn được bảo toàn.',
          code: 'INVALID_API_KEY',
        });
      }

      if (upstreamStatus === 400) {
        console.error('[POST /api/generate] Gemini rejected request (status 400)');
        return res.status(400).json({
          error:
            'Yêu cầu hoặc tệp đính kèm chưa hợp lệ với Google Gemini API. Hãy kiểm tra lại định dạng tệp hoặc nội dung đầu vào.',
          code: 'UPSTREAM_BAD_REQUEST',
        });
      }

      console.error(`[POST /api/generate] Gemini upstream failure (status ${upstreamStatus})`);
      return res.status(502).json({
        error:
          'Dịch vụ Google Gemini API đang tạm gián đoạn. Nội dung bạn đang soạn vẫn được giữ nguyên.',
        code: 'UPSTREAM_ERROR',
      });
    }

    const { text, finishReason, candidates } = extractTextFromGeminiData(upstreamJson);
    if (!text) {
      return res.status(502).json({
        error:
          'Google Gemini API không trả về nội dung phản hồi phù hợp. Vui lòng thử diễn đạt lại câu hỏi.',
        code: 'EMPTY_AI_RESPONSE',
      });
    }

    return res.status(200).json({
      text,
      model: activeModel,
      finishReason,
      candidates,
      usageMetadata: upstreamJson?.usageMetadata ?? null,
    });
  } catch (err) {
    clearTimeout(timeoutId);

    if (err && typeof err === 'object' && err.name === 'AbortError') {
      return res.status(504).json({
        error:
          'Kết nối tới bản thông minh (Google Gemini API) quá thời gian chờ. Nội dung bạn đang soạn vẫn được giữ nguyên.',
        code: 'UPSTREAM_TIMEOUT',
      });
    }

    console.error(
      '[POST /api/generate] Unexpected server error:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return res.status(500).json({
      error: 'Không thể kết nối tới máy chủ AI vào lúc này. Nội dung của bạn vẫn được giữ nguyên.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
