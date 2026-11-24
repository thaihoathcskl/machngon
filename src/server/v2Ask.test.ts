import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import handler, { extractGroundingSources, extractOpenRouterSources } from '../../api/v2-ask.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
}

function createMockRes(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = String(value);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

const originalApiKey = process.env.GEMINI_API_KEY;
const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
const originalPrimaryProvider = process.env.AI_PRIMARY_PROVIDER;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }
  if (originalOpenRouterKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  }
  if (originalPrimaryProvider === undefined) {
    delete process.env.AI_PRIMARY_PROVIDER;
  } else {
    process.env.AI_PRIMARY_PROVIDER = originalPrimaryProvider;
  }
  globalThis.fetch = originalFetch;
});

describe('Vercel Serverless Function api/v2-ask.js', () => {
  it('rejects non-POST methods with HTTP 405 and Allow: POST', async () => {
    const res = createMockRes();
    await handler({ method: 'GET', body: {} }, res);

    assert.equal(res.statusCode, 405);
    assert.equal(res.headers['allow'], 'POST');
    assert.equal((res.body as { code?: string }).code, 'METHOD_NOT_ALLOWED');
  });

  it('returns HTTP 500 when GEMINI_API_KEY is missing or placeholder', async () => {
    delete process.env.GEMINI_API_KEY;
    const resMissing = createMockRes();
    await handler({ method: 'POST', body: { question: 'Chí Phèo viết năm nào?' } }, resMissing);

    assert.equal(resMissing.statusCode, 500);
    assert.equal((resMissing.body as { code?: string }).code, 'MISSING_API_KEY');

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    const resPlaceholder = createMockRes();
    await handler({ method: 'POST', body: { prompt: 'Xin chào' } }, resPlaceholder);
    assert.equal(resPlaceholder.statusCode, 500);
    assert.equal((resPlaceholder.body as { code?: string }).code, 'MISSING_API_KEY');
  });

  it('validates missing or oversized prompt payloads with HTTP 400', async () => {
    process.env.GEMINI_API_KEY = 'test-key-for-validation';
    const resEmpty = createMockRes();
    await handler({ method: 'POST', body: { question: '   ' } }, resEmpty);

    assert.equal(resEmpty.statusCode, 400);
    assert.equal((resEmpty.body as { code?: string }).code, 'INVALID_PROMPT_PAYLOAD');
  });

  it('extracts, deduplicates, and filters safe HTTP/HTTPS grounding sources', () => {
    const { sources, searchQueries } = extractGroundingSources({
      candidates: [
        {
          groundingMetadata: {
            webSearchQueries: ['Nam Cao Chí Phèo 1941'],
            groundingChunks: [
              { web: { uri: 'https://vi.wikipedia.org/wiki/Chi_Pheo', title: 'Chí Phèo - Wikipedia' } },
              { web: { uri: 'https://vi.wikipedia.org/wiki/Chi_Pheo', title: 'Duplicate URL' } },
              { web: { uri: 'javascript:alert(1)', title: 'Unsafe URI' } },
              { web: { uri: 'https://plo.vn/bai-viet-1.html' } },
            ],
          },
        },
      ],
    });

    assert.deepEqual(searchQueries, ['Nam Cao Chí Phèo 1941']);
    assert.equal(sources.length, 2);
    assert.deepEqual(sources[0], {
      title: 'Chí Phèo - Wikipedia',
      uri: 'https://vi.wikipedia.org/wiki/Chi_Pheo',
      url: 'https://vi.wikipedia.org/wiki/Chi_Pheo',
    });
    assert.deepEqual(sources[1], {
      title: 'plo.vn',
      uri: 'https://plo.vn/bai-viet-1.html',
      url: 'https://plo.vn/bai-viet-1.html',
    });
  });

  it('calls Gemini with googleSearch enabled via @google/genai and returns answer + sources', async () => {
    const fakeSecret = 'AIzaTestSecretNeverExpose888';
    process.env.GEMINI_API_KEY = fakeSecret;

    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const hdrs = init?.headers;
      if (hdrs && typeof (hdrs as Headers).forEach === 'function') {
        (hdrs as Headers).forEach((v, k) => {
          capturedHeaders[k.toLowerCase()] = v;
        });
      } else if (hdrs && typeof hdrs === 'object') {
        for (const [k, v] of Object.entries(hdrs)) {
          capturedHeaders[k.toLowerCase()] = String(v);
        }
      }
      capturedBody = JSON.parse(String(init?.body || '{}'));

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'Tác phẩm Chí Phèo của Nam Cao ra đời năm 1941.' }],
              },
              finishReason: 'STOP',
              groundingMetadata: {
                webSearchQueries: ['Chí Phèo Nam Cao năm sáng tác'],
                groundingChunks: [
                  {
                    web: {
                      uri: 'https://vi.wikipedia.org/wiki/Ch%C3%AD_Ph%C3%A8o',
                      title: 'Chí Phèo – Wikipedia tiếng Việt',
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const res = createMockRes();
    await handler(
      {
        method: 'POST',
        body: {
          question: 'Truyện ngắn Chí Phèo của Nam Cao ra đời năm nào?',
        },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.match(capturedUrl, /models\/gemini-4-hydrogen:generateContent/);
    assert.equal(capturedHeaders['user-agent'], 'aistudio-build');
    assert.deepEqual(capturedBody.tools, [{ googleSearch: {} }]);

    const payload = res.body as {
      answer: string;
      text: string;
      model: string;
      sources: Array<{ title: string; uri: string; url: string }>;
      searchQueries: string[];
    };
    assert.equal(payload.answer, 'Tác phẩm Chí Phèo của Nam Cao ra đời năm 1941.');
    assert.equal(payload.text, payload.answer);
    assert.equal(payload.model, 'gemini-4-hydrogen');
    assert.equal(payload.sources.length, 1);
    assert.equal(payload.sources[0].title, 'Chí Phèo – Wikipedia tiếng Việt');
    assert.equal(payload.sources[0].uri, 'https://vi.wikipedia.org/wiki/Ch%C3%AD_Ph%C3%A8o');
    assert.deepEqual(payload.searchQueries, ['Chí Phèo Nam Cao năm sáng tác']);
    assert.equal(JSON.stringify(res.body).includes(fakeSecret), false);
  });

  it('extracts and sanitizes OpenRouter url_citation annotations into sources', () => {
    const sources = extractOpenRouterSources({
      annotations: [
        {
          type: 'url_citation',
          url_citation: {
            url: 'https://stanford.edu/entries/toulmin/',
            title: 'Toulmin Model Overview',
          },
        },
        {
          type: 'url_citation',
          url_citation: {
            url: 'https://stanford.edu/entries/toulmin/',
            title: 'Duplicate Citation',
          },
        },
        {
          type: 'url_citation',
          url_citation: {
            url: 'javascript:alert(1)',
            title: 'Blocked Script URI',
          },
        },
      ],
    });

    assert.equal(sources.length, 1);
    assert.deepEqual(sources[0], {
      title: 'Toulmin Model Overview',
      uri: 'https://stanford.edu/entries/toulmin/',
      url: 'https://stanford.edu/entries/toulmin/',
    });
  });

  it('falls back to OPENROUTER_API_KEY with web search plugin when GEMINI_API_KEY is unset and never leaks secrets', async () => {
    delete process.env.GEMINI_API_KEY;
    const fakeOrSecret = 'sk-or-v1-test-secret-never-leak-999';
    process.env.OPENROUTER_API_KEY = fakeOrSecret;

    let capturedEndpoint = '';
    let capturedAuth = '';
    let capturedPayload: Record<string, unknown> = {};

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedEndpoint =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const hdrs = (init?.headers ?? {}) as Record<string, string>;
      capturedAuth = hdrs.Authorization || hdrs.authorization || '';
      capturedPayload = JSON.parse(String(init?.body || '{}'));

      return new Response(
        JSON.stringify({
          model: 'openrouter/free',
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: 'Ẩn dụ ý niệm giúp người nói ánh xạ miền cụ thể sang miền trừu tượng.',
                annotations: [
                  {
                    type: 'url_citation',
                    url_citation: {
                      url: 'https://plato.stanford.edu/entries/metaphor/',
                      title: 'Metaphor - Stanford Encyclopedia',
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const res = createMockRes();
    await handler(
      {
        method: 'POST',
        body: { question: 'Ẩn dụ ý niệm là gì?' },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.match(capturedEndpoint, /\/chat\/completions$/);
    assert.equal(capturedAuth, `Bearer ${fakeOrSecret}`);
    assert.deepEqual(capturedPayload.plugins, [{ id: 'web', max_results: 4 }]);

    const payload = res.body as {
      answer: string;
      provider: string;
      sources: Array<{ title: string; uri: string; url: string }>;
    };
    assert.equal(payload.provider, 'openrouter');
    assert.match(payload.answer, /Ẩn dụ ý niệm/);
    assert.equal(payload.sources.length, 1);
    assert.equal(payload.sources[0].uri, 'https://plato.stanford.edu/entries/metaphor/');
    assert.equal(JSON.stringify(res.body).includes(fakeOrSecret), false);
  });
});
