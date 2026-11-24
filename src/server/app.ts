import 'dotenv/config';
import express, { type Express } from 'express';
import { executeDebateEngine } from '../lib/ai/debateEngine.ts';
import {
  getLibraryLexiconPrompt,
  LIBRARY_LEXICON_SYSTEM_PROMPT,
} from '../lib/ai/systemPrompts.ts';
import type { AiModelId, LabApiRequestPayload } from '../lib/types.ts';
import { SEED_DOCUMENTS } from '../content/seedDocuments.ts';
import { QUOTE_CATEGORIES } from '../content/verifiedQuotes.ts';
import {
  dailyQuoteService,
  getVietnamDateKey,
  VIETNAM_TIMEZONE,
} from './dailyQuoteService.ts';
import {
  adminAuthService,
  extractBearerToken,
  requireAdmin,
} from './adminAuth.ts';
import generateHandler from '../../api/generate.js';
import v2AskHandler from '../../api/v2-ask.js';

// Lightweight per-session sliding window rate limiter (protects /api/lab & /api/admin/auth)
const requestBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;

function checkRateLimit(
  sessionKey: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW
): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const timestamps = (requestBuckets.get(sessionKey) ?? []).filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(5, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    requestBuckets.set(sessionKey, timestamps);
    return { limited: true, retryAfterSeconds };
  }
  timestamps.push(now);
  requestBuckets.set(sessionKey, timestamps);
  return { limited: false, retryAfterSeconds: 0 };
}

const PLACEHOLDER_API_KEYS = new Set([
  'MY_GEMINI_API_KEY',
  'your_api_key_here',
  'YOUR_GEMINI_API_KEY',
  'YOUR_OPENROUTER_API_KEY',
  'CHANGE_ME',
]);

function isConfiguredEnvKey(raw?: string): boolean {
  const val = raw?.trim();
  return Boolean(val && !PLACEHOLDER_API_KEYS.has(val));
}

function getActiveAiEngine(): 'openai-responses' | 'gemini' | 'openrouter' | 'local-fallback' {
  const hasOpenAI = isConfiguredEnvKey(process.env.OPENAI_API_KEY);
  const hasGemini = isConfiguredEnvKey(process.env.GEMINI_API_KEY);
  const hasOpenRouter = isConfiguredEnvKey(process.env.OPENROUTER_API_KEY);

  if (process.env.AI_PRIMARY_PROVIDER?.trim().toLowerCase() === 'openrouter' && hasOpenRouter) {
    return 'openrouter';
  }
  if (hasOpenAI) return 'openai-responses';
  if (hasGemini) return 'gemini';
  if (hasOpenRouter) return 'openrouter';
  return 'local-fallback';
}

/**
 * Creates the Express app with all /api/* routes mounted.
 * Shared by local/Node server (`server.ts`) and Vercel Serverless entrypoint (`api/index.ts`).
 */
export function createApiApp(): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: getActiveAiEngine(),
      timezone: VIETNAM_TIMEZONE,
      vietnamDate: getVietnamDateKey(),
    });
  });

  // =========================================================================
  // SECURE GEMINI PROXY (/api/generate — shared with Vercel Serverless Function)
  // =========================================================================
  app.all('/api/generate', async (req, res) => {
    await generateHandler(req, res);
  });

  app.all('/api/v2-ask', async (req, res) => {
    await v2AskHandler(req, res);
  });

  // =========================================================================
  // DAILY QUOTE PUBLIC API (Single source of truth for HomePage & Dashboard)
  // =========================================================================
  app.get('/api/quotes/today', async (_req, res) => {
    try {
      const data = await dailyQuoteService.getQuoteForDate();
      res.setHeader('Cache-Control', 'no-store');
      res.json(data);
    } catch (err) {
      console.error('[GET /api/quotes/today] Error:', err);
      res.status(500).json({
        error: 'Không thể tải danh ngôn hôm nay. Vui lòng thử lại sau.',
      });
    }
  });

  // =========================================================================
  // ADMIN AUTHENTICATION (Real server-side RBAC — HMAC-SHA256 Bearer token)
  // =========================================================================
  app.get('/api/admin/auth/status', async (req, res) => {
    try {
      const status = await adminAuthService.getStatus();
      const token = extractBearerToken(req);
      const authenticated = Boolean(token && adminAuthService.verifyToken(token));
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ...status, authenticated });
    } catch (err) {
      console.error('[GET /api/admin/auth/status] Error:', err);
      res.status(500).json({ error: 'Không thể kiểm tra trạng thái xác thực quản trị.' });
    }
  });

  app.post('/api/admin/auth/bootstrap', (_req, res) => {
    res.status(403).json({
      error:
        'Tính năng thiết lập mã quản trị từ trình duyệt đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng cấu hình biến môi trường ADMIN_PASSCODE trên máy chủ.',
    });
  });

  app.post('/api/admin/auth/login', async (req, res) => {
    if (!adminAuthService.isConfigured()) {
      res.status(403).json({
        error:
          'Cổng quản trị đang tạm khóa vì biến môi trường ADMIN_PASSCODE chưa được thiết lập trên máy chủ.',
      });
      return;
    }
    const rate = checkRateLimit(`admin-auth:${req.ip || 'local'}`, 10);
    if (rate.limited) {
      res.status(429).json({
        error: `Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ ${rate.retryAfterSeconds} giây.`,
      });
      return;
    }
    try {
      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
      const session = await adminAuthService.verifyAndLogin(passcode);
      if (!session) {
        res.status(401).json({ error: 'Mã quản trị không chính xác.' });
        return;
      }
      res.json(session);
    } catch (err) {
      console.error('[POST /api/admin/auth/login] Error:', err);
      res.status(500).json({ error: 'Lỗi xác thực máy chủ.' });
    }
  });

  app.post('/api/admin/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      adminAuthService.revokeToken(token);
    }
    res.json({ ok: true });
  });

  // =========================================================================
  // AI STATUS & SAFE CONNECTION TEST (No client API key exposure)
  // =========================================================================
  const ALLOWED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

  app.get('/api/ai/status', (_req, res) => {
    const engine = getActiveAiEngine();
    const defaultModel =
      engine === 'openrouter'
        ? process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free'
        : process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      configured: engine !== 'local-fallback',
      engine,
      defaultModel,
      openRouterModel: process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free',
      providers: {
        gemini: isConfiguredEnvKey(process.env.GEMINI_API_KEY),
        openrouter: isConfiguredEnvKey(process.env.OPENROUTER_API_KEY),
        openai: isConfiguredEnvKey(process.env.OPENAI_API_KEY),
      },
      allowedModels: ALLOWED_GEMINI_MODELS,
    });
  });

  app.post('/api/ai/test', async (req, res) => {
    const rate = checkRateLimit(`ai-test:${req.ip || 'local'}`, 6);
    if (rate.limited) {
      res.status(429).json({
        ok: false,
        message: `Vui lòng đợi ${rate.retryAfterSeconds} giây trước khi kiểm tra lại kết nối.`,
      });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const hasGemini = isConfiguredEnvKey(geminiKey);
    const hasOpenRouter = isConfiguredEnvKey(openRouterKey);
    const preferOpenRouter =
      process.env.AI_PRIMARY_PROVIDER?.trim().toLowerCase() === 'openrouter' || !hasGemini;

    const requestedModel =
      typeof req.body?.model === 'string' && ALLOWED_GEMINI_MODELS.includes(req.body.model.trim())
        ? req.body.model.trim()
        : process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    if (!hasGemini && !hasOpenRouter) {
      res.json({
        ok: false,
        configured: false,
        model: requestedModel,
        latencyMs: 0,
        message:
          'Máy chủ chưa có biến môi trường GEMINI_API_KEY hoặc OPENROUTER_API_KEY. Ứng dụng vẫn hoạt động ổn định bằng chế độ phản biện học thuật cục bộ.',
      });
      return;
    }

    const startedAt = Date.now();
    if (hasGemini && !preferOpenRouter) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestedModel)}:generateContent?key=${encodeURIComponent(geminiKey!)}`;
        const upstream = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Trả lời duy nhất 2 từ: Sẵn sàng' }] }],
            generationConfig: {
              maxOutputTokens: 32,
              temperature: 0,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });
        const latencyMs = Date.now() - startedAt;
        if (upstream.ok) {
          res.json({
            ok: true,
            configured: true,
            model: requestedModel,
            latencyMs,
            message: `Kết nối Gemini (${requestedModel}) thành công trong ${latencyMs}ms.`,
          });
          return;
        }
        if (!hasOpenRouter) {
          res.status(200).json({
            ok: false,
            configured: true,
            model: requestedModel,
            latencyMs,
            message:
              upstream.status === 429
                ? 'Kết nối máy chủ hợp lệ nhưng API đang chạm giới hạn tần suất (HTTP 429). Vui lòng thử lại sau ít phút.'
                : `Không thể gọi model ${requestedModel} (mã trạng thái ${upstream.status}). Hãy kiểm tra quyền truy cập model trên máy chủ.`,
          });
          return;
        }
      } catch {
        if (!hasOpenRouter) {
          res.status(200).json({
            ok: false,
            configured: true,
            model: requestedModel,
            latencyMs: Date.now() - startedAt,
            message: 'Không thể kết nối tới máy chủ Google Gemini vào lúc này. Vui lòng thử lại sau.',
          });
          return;
        }
      }
    }

    if (hasOpenRouter && openRouterKey) {
      const orBase = (
        process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1'
      ).replace(/\/+$/, '');
      const orModel = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
      try {
        const orUpstream = await fetch(`${orBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'Mach Ngon AI Labs',
          },
          body: JSON.stringify({
            model: orModel,
            max_tokens: 24,
            temperature: 0,
            messages: [{ role: 'user', content: 'Trả lời duy nhất 2 từ: Sẵn sàng' }],
          }),
        });
        const latencyMs = Date.now() - startedAt;
        if (orUpstream.ok) {
          res.json({
            ok: true,
            configured: true,
            model: orModel,
            latencyMs,
            message: `Kết nối OpenRouter (${orModel}) thành công trong ${latencyMs}ms.`,
          });
          return;
        }
        res.status(200).json({
          ok: false,
          configured: true,
          model: orModel,
          latencyMs,
          message:
            orUpstream.status === 429
              ? 'OpenRouter đang chạm giới hạn tần suất (HTTP 429). Vui lòng thử lại sau ít phút.'
              : `Không thể gọi OpenRouter (${orModel}, mã ${orUpstream.status}). Vui lòng kiểm tra khóa OPENROUTER_API_KEY trong Settings > Secrets.`,
        });
        return;
      } catch {
        res.status(200).json({
          ok: false,
          configured: true,
          model: orModel,
          latencyMs: Date.now() - startedAt,
          message: 'Không thể kết nối tới máy chủ OpenRouter vào lúc này. Vui lòng thử lại sau.',
        });
        return;
      }
    }
  });

  // =========================================================================
  // LIBRARY CONTEXTUAL EXPLAIN & CONTENT REPORTS
  // =========================================================================
  const documentReports: Array<{
    id: string;
    documentId: string;
    reason: string;
    detail: string;
    receivedAt: string;
  }> = [];

  app.post('/api/library/report', (req, res) => {
    const rate = checkRateLimit(`lib-report:${req.ip || 'local'}`, 12);
    if (rate.limited) {
      res.status(429).json({
        error: `Bạn đã gửi nhiều báo cáo liên tiếp. Vui lòng chờ ${rate.retryAfterSeconds} giây.`,
      });
      return;
    }
    const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const detail = typeof req.body?.detail === 'string' ? req.body.detail.trim().slice(0, 1000) : '';
    if (!documentId || !reason) {
      res.status(400).json({ error: 'Vui lòng chọn lý do báo cáo hợp lệ.' });
      return;
    }
    const entry = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      documentId,
      reason,
      detail,
      receivedAt: new Date().toISOString(),
    };
    documentReports.unshift(entry);
    if (documentReports.length > 200) documentReports.length = 200;
    res.status(201).json({ ok: true, ...entry });
  });

  app.post('/api/library/explain', async (req, res) => {
    const rate = checkRateLimit(`lib-explain:${req.ip || 'local'}`, 30);
    if (rate.limited) {
      res.status(429).json({
        error: `Bạn đang tra cứu quá nhanh. Vui lòng chờ ${rate.retryAfterSeconds} giây.`,
      });
      return;
    }

    const rawTerm = typeof req.body?.term === 'string' ? req.body.term.trim() : '';
    const contextSnippet =
      typeof req.body?.contextSnippet === 'string' ? req.body.contextSnippet.trim().slice(0, 500) : '';
    const articleTitle =
      typeof req.body?.articleTitle === 'string' ? req.body.articleTitle.trim().slice(0, 180) : '';
    const requestedModel =
      typeof req.body?.model === 'string' && ALLOWED_GEMINI_MODELS.includes(req.body.model.trim())
        ? req.body.model.trim()
        : process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    if (rawTerm.length < 2 || rawTerm.length > 260) {
      res.status(400).json({ error: 'Vui lòng chọn từ hoặc cụm từ từ 2 đến 260 ký tự để giải thích.' });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const hasGemini = isConfiguredEnvKey(geminiKey);
    const hasOpenRouter = isConfiguredEnvKey(openRouterKey);
    const preferOpenRouter =
      process.env.AI_PRIMARY_PROVIDER?.trim().toLowerCase() === 'openrouter' && hasOpenRouter;
    let quotaExhausted = !hasGemini && !hasOpenRouter;
    const prompt = getLibraryLexiconPrompt(rawTerm, contextSnippet, articleTitle);

    const tryGeminiExplain = async () => {
      if (!hasGemini || !geminiKey) return false;
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(requestedModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const upstream = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: LIBRARY_LEXICON_SYSTEM_PROMPT }],
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 420,
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        });

        if (upstream.status === 429) {
          quotaExhausted = true;
          return false;
        }
        if (upstream.ok) {
          const data = (await upstream.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((p) => (typeof p.text === 'string' ? p.text : ''))
              .join('')
              .trim() ?? '';
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          const first = cleaned.indexOf('{');
          const last = cleaned.lastIndexOf('}');
          if (first !== -1 && last > first) {
            const parsed = JSON.parse(cleaned.slice(first, last + 1)) as {
              definition?: string;
              example?: string;
              contextNote?: string;
            };
            if (parsed.definition && parsed.definition.trim()) {
              res.json({
                term: rawTerm,
                mode: 'library_lexicon',
                model: requestedModel,
                definition: parsed.definition.trim(),
                contextNote: (parsed.contextNote || '').trim(),
                example: (parsed.example || '').trim(),
                source: 'ai',
                quotaExhausted: false,
              });
              return true;
            }
          }
        }
      } catch {
        // Fall through cleanly
      }
      return false;
    };

    const tryOpenRouterExplain = async () => {
      if (!hasOpenRouter || !openRouterKey) return false;
      const orBase = (
        process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1'
      ).replace(/\/+$/, '');
      const orModel = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';

      const attemptOr = async (withWebPlugin: boolean) => {
        const bodyPayload: Record<string, unknown> = {
          model: orModel,
          temperature: 0.2,
          max_tokens: 520,
          messages: [
            {
              role: 'system',
              content: `${LIBRARY_LEXICON_SYSTEM_PROMPT}\n\nTrả về DUY NHẤT JSON hợp lệ: {"definition":"...","contextNote":"...","example":"..."}`,
            },
            { role: 'user', content: prompt },
          ],
        };
        if (withWebPlugin) {
          bodyPayload.plugins = [{ id: 'web', max_results: 3 }];
        }

        const upstream = await fetch(`${orBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'Mach Ngon AI Library',
          },
          body: JSON.stringify(bodyPayload),
        });
        if (upstream.status === 429) {
          quotaExhausted = true;
          return false;
        }
        if (!upstream.ok) return null;

        const data = (await upstream.json()) as {
          model?: string;
          choices?: Array<{
            message?: {
              content?: string | Array<{ text?: string }>;
              annotations?: Array<{
                url_citation?: { url?: string; title?: string };
                url?: string;
                title?: string;
              }>;
            };
          }>;
        };
        const msg = data.choices?.[0]?.message;
        const rawText =
          typeof msg?.content === 'string'
            ? msg.content
            : Array.isArray(msg?.content)
              ? msg.content.map((p) => p.text ?? '').join('')
              : '';
        const cleaned = rawText
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/```json\s*/gi, '')
          .replace(/```/g, '')
          .trim();

        const annotations = Array.isArray(msg?.annotations) ? msg.annotations : [];
        const sources: Array<{ title: string; uri: string; url: string }> = [];
        const seenUrls = new Set<string>();
        for (const ann of annotations) {
          const url = (ann?.url_citation?.url || ann?.url || '').trim();
          if (!url || seenUrls.has(url)) continue;
          try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') continue;
            seenUrls.add(url);
            sources.push({
              title: (ann?.url_citation?.title || ann?.title || parsedUrl.hostname).trim(),
              uri: url,
              url,
            });
          } catch {
            // Skip invalid URL
          }
        }

        const first = cleaned.indexOf('{');
        const last = cleaned.lastIndexOf('}');
        if (first !== -1 && last > first) {
          try {
            const parsed = JSON.parse(cleaned.slice(first, last + 1)) as {
              definition?: string;
              contextNote?: string;
              example?: string;
            };
            if (parsed.definition && parsed.definition.trim()) {
              res.json({
                term: rawTerm,
                mode: 'library_lexicon',
                model: data.model || orModel,
                definition: parsed.definition.trim(),
                contextNote: (parsed.contextNote || '').trim(),
                example: (parsed.example || '').trim(),
                sources,
                source: 'ai',
                quotaExhausted: false,
              });
              return true;
            }
          } catch {
            // Fall through to plain-text rescue below
          }
        }
        if (cleaned) {
          res.json({
            term: rawTerm,
            mode: 'library_lexicon',
            model: data.model || orModel,
            definition: cleaned.slice(0, 600),
            contextNote: '',
            example: '',
            sources,
            source: 'ai',
            quotaExhausted: false,
          });
          return true;
        }
        return false;
      };

      try {
        const withPlugin = await attemptOr(true);
        if (withPlugin === true || withPlugin === false) return withPlugin;
        const plain = await attemptOr(false);
        return plain === true;
      } catch {
        return false;
      }
    };

    if (preferOpenRouter) {
      if (await tryOpenRouterExplain()) return;
      if (await tryGeminiExplain()) return;
    } else {
      if (await tryGeminiExplain()) return;
      if (await tryOpenRouterExplain()) return;
    }

    // Contextual fallback — never returns a dead "không tra được nghĩa" error
    const fallbackDef = contextSnippet
      ? `"${rawTerm}" là khái niệm/cụm từ khóa trọng tâm xuất hiện trực tiếp trong đoạn đọc, dùng để gọi tên hiện tượng, nguyên lý hoặc thao tác lập luận mà tác giả đang phân tích.`
      : `"${rawTerm}" là thuật ngữ hoặc cụm từ học thuật cần được đặt trong mạch lập luận cụ thể để xác định phạm vi nghĩa chính xác.`;
    const fallbackContext = contextSnippet
      ? `Trong câu/đoạn đang đọc (“${contextSnippet.slice(0, 150)}${contextSnippet.length > 150 ? '…' : ''}”), cụm "${rawTerm}" kết nối trực tiếp với luận điểm chính của mục này.`
      : 'Gợi ý: Hãy đối chiếu cụm từ này với định đề trung tâm của đoạn văn để nắm rõ sắc thái ngữ nghĩa.';
    const fallbackExample = `Ví dụ vận dụng: Khi nhắc đến "${rawTerm}" trong bài nghị luận, bạn nên nêu rõ phạm vi áp dụng kèm 1 trường hợp cụ thể trong đời sống để người nghe hiểu đúng ý.`;

    res.json({
      term: rawTerm,
      mode: 'library_lexicon',
      model: requestedModel,
      definition: fallbackDef,
      contextNote: fallbackContext,
      example: fallbackExample,
      source: 'contextual-fallback',
      quotaExhausted,
    });
  });

  // =========================================================================
  // ADMIN PROTECTED ROUTES (requireAdmin middleware enforces Bearer token)
  // =========================================================================
  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const [todayData, listData, nextPreview, authStatus] = await Promise.all([
        dailyQuoteService.getQuoteForDate(),
        dailyQuoteService.listQuotes(),
        dailyQuoteService.previewNextQuote(),
        adminAuthService.getStatus(),
      ]);

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        timezone: VIETNAM_TIMEZONE,
        todayDate: todayData.date,
        nextUpdateAtIso: todayData.nextUpdateAtIso,
        aiEngine: getActiveAiEngine(),
        adminAuthSource: authStatus.source,
        quotesSummary: {
          total: listData.quotes.length,
          verified: listData.totalVerified,
          unverified: listData.totalUnverified,
          hidden: listData.totalHidden,
          cycleNumber: listData.cycleNumber,
          remainingInCycle: listData.remainingInCycle,
          displayedDaysCount: listData.history.length,
          categoriesCount: QUOTE_CATEGORIES.length,
        },
        todayQuote: todayData.quote,
        nextPreview,
      });
    } catch (err) {
      console.error('[GET /api/admin/overview] Error:', err);
      res.status(500).json({ error: 'Không thể tải tổng quan hệ thống.' });
    }
  });

  app.get('/api/admin/quotes', requireAdmin, async (_req, res) => {
    try {
      const [listData, nextPreview] = await Promise.all([
        dailyQuoteService.listQuotes(),
        dailyQuoteService.previewNextQuote(),
      ]);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ...listData,
        categories: QUOTE_CATEGORIES,
        nextPreview,
      });
    } catch (err) {
      console.error('[GET /api/admin/quotes] Error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách danh ngôn.' });
    }
  });

  app.get('/api/admin/quotes/preview-next', requireAdmin, async (_req, res) => {
    try {
      const preview = await dailyQuoteService.previewNextQuote();
      res.setHeader('Cache-Control', 'no-store');
      res.json(preview);
    } catch (err) {
      console.error('[GET /api/admin/quotes/preview-next] Error:', err);
      res.status(500).json({ error: 'Không thể xem trước danh ngôn tiếp theo.' });
    }
  });

  app.post('/api/admin/quotes/check-duplicate', requireAdmin, async (req, res) => {
    try {
      const content = typeof req.body?.content === 'string' ? req.body.content : '';
      const excludeId = typeof req.body?.excludeId === 'string' ? req.body.excludeId : undefined;
      const matches = await dailyQuoteService.findPossibleDuplicates(content, excludeId);
      res.json({ matches });
    } catch (err) {
      console.error('[POST /api/admin/quotes/check-duplicate] Error:', err);
      res.status(500).json({ error: 'Không thể kiểm tra trùng lặp.' });
    }
  });

  app.post('/api/admin/quotes', requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await dailyQuoteService.addQuote({
        content: typeof body.content === 'string' ? body.content : '',
        author: typeof body.author === 'string' ? body.author : null,
        source: typeof body.source === 'string' ? body.source : '',
        sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
        originalLanguage:
          typeof body.originalLanguage === 'string' ? body.originalLanguage : undefined,
        originalText: typeof body.originalText === 'string' ? body.originalText : undefined,
        category: body.category,
        verified: Boolean(body.verified),
      });
      res.status(201).json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể thêm danh ngôn mới.';
      res.status(400).json({ error: msg });
    }
  });

  app.patch('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const body = req.body ?? {};
      const updated = await dailyQuoteService.updateQuote(id, {
        content: typeof body.content === 'string' ? body.content : undefined,
        author:
          body.author === null || typeof body.author === 'string' ? body.author : undefined,
        source: typeof body.source === 'string' ? body.source : undefined,
        sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
        originalLanguage:
          typeof body.originalLanguage === 'string' ? body.originalLanguage : undefined,
        originalText: typeof body.originalText === 'string' ? body.originalText : undefined,
        category:
          typeof body.category === 'string'
            ? (body.category as (typeof QUOTE_CATEGORIES)[number])
            : undefined,
        verified: typeof body.verified === 'boolean' ? body.verified : undefined,
        hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
      });
      res.json({ quote: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật danh ngôn.';
      res.status(400).json({ error: msg });
    }
  });

  app.delete('/api/admin/quotes/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      await dailyQuoteService.deleteQuote(id);
      res.json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa danh ngôn.';
      res.status(400).json({ error: msg });
    }
  });

  // Core Thinking Lab endpoint keeping exact contract:
  // { session_id, lab_type, message, resource_context_id }
  app.post('/api/lab', async (req, res) => {
    try {
      const body = req.body as Partial<LabApiRequestPayload> | undefined;
      const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
      const labType =
        body?.lab_type === 'concept' || body?.lab_type === 'debate' || body?.lab_type === 'read'
          ? body.lab_type
          : null;
      const message = typeof body?.message === 'string' ? body.message.trim() : '';

      if (!sessionId || !labType || !message) {
        res.status(400).json({
          error: 'Yêu cầu chưa hợp lệ: cần đầy đủ session_id, lab_type và nội dung câu hỏi.',
        });
        return;
      }

      if (message.length > 4000) {
        res.status(400).json({
          error: 'Nội dung phát biểu vượt quá giới hạn 4.000 ký tự cho một lượt.',
        });
        return;
      }

      // Deterministic HTTP 429 simulation hook or real sliding-window rate limiter
      if (body?.simulate_429 === true) {
        const retryAfter = 10;
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error:
            'Phòng thí nghiệm tư duy đang tạm nghỉ nhịp để giữ chất lượng phân tích. Nội dung bạn đang viết vẫn được bảo toàn nguyên vẹn.',
          retry_after: retryAfter,
        });
        return;
      }

      const rateStatus = checkRateLimit(sessionId);
      if (rateStatus.limited) {
        res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
        res.status(429).json({
          error:
            'Bạn đã gửi nhiều lượt phân tích liên tiếp trong một phút. Hãy dành vài giây suy ngẫm trước khi tiếp tục — bản thảo của bạn vẫn được giữ nguyên.',
          retry_after: rateStatus.retryAfterSeconds,
        });
        return;
      }

      const rawResourceId =
        typeof body?.resource_context_id === 'string' ? body.resource_context_id.trim() : '';
      const verifiedResourceId =
        rawResourceId &&
        SEED_DOCUMENTS.some((doc) => doc.id === rawResourceId && doc.status === 'published')
          ? rawResourceId
          : null;

      const payload: LabApiRequestPayload = {
        session_id: sessionId,
        lab_type: labType,
        difficulty:
          body?.difficulty === 'basic' ||
          body?.difficulty === 'intermediate' ||
          body?.difficulty === 'advanced'
            ? body.difficulty
            : 'intermediate',
        message,
        resource_context_id: verifiedResourceId,
        attachments: Array.isArray(body?.attachments) ? body.attachments.slice(0, 3) : undefined,
        history: Array.isArray(body?.history) ? body.history.slice(-24) : [],
        ledger_snapshot: Array.isArray(body?.ledger_snapshot)
          ? body.ledger_snapshot.slice(-30)
          : [],
        core_assumptions: Array.isArray(body?.core_assumptions)
          ? body.core_assumptions.slice(0, 12)
          : [],
        previous_response_id:
          typeof body?.previous_response_id === 'string' ? body.previous_response_id : null,
        model:
          typeof body?.model === 'string' && ALLOWED_GEMINI_MODELS.includes(body.model.trim())
            ? (body.model.trim() as AiModelId)
            : undefined,
      };

      const result = await executeDebateEngine(payload);
      res.json(result);
    } catch (err) {
      const e = err as Error & { status?: number; retryAfter?: number };
      if (e.status === 429) {
        const retryAfter = e.retryAfter ?? 15;
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error:
            'Hệ thống AI đang chạm ngưỡng tần suất tạm thời. Nội dung bạn gõ được giữ nguyên — bạn có thể gửi lại ngay khi đồng hồ kết thúc.',
          retry_after: retryAfter,
        });
        return;
      }
      console.error('[POST /api/lab] Unexpected error:', e);
      res.status(500).json({
        error:
          'Không thể kết nối tới máy chủ phân tích vào lúc này. Bản thảo của bạn đã được tự động lưu cục bộ.',
      });
    }
  });

  return app;
}
