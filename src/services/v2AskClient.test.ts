import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIRateLimitError,
  AIServiceError,
  askV2WithSearch,
  parseV2AskLabPayload,
  requestLabAnalysis,
} from './aiService.ts';
import type { LabApiRequestPayload } from '../lib/types.ts';

const BASE_LAB_PAYLOAD: LabApiRequestPayload = {
  session_id: 'sess-v2-ask-1234',
  lab_type: 'debate',
  difficulty: 'intermediate',
  message: 'Trí tuệ nhân tạo có làm giảm năng lực viết phản biện của học sinh THPT không?',
  history: [
    {
      role: 'user',
      content: 'Mình nghĩ AI hỗ trợ tìm ý nhanh hơn.',
      turnRef: 'U#1',
    },
  ],
};

test('askV2WithSearch calls /api/v2-ask and sanitizes/deduplicates grounding sources', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedMethod = '';

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method ?? 'GET';
    return new Response(
      JSON.stringify({
        answer: 'Nghiên cứu giáo dục cho thấy tác động phụ thuộc vào cách thiết kế bài tập.',
        text: 'Nghiên cứu giáo dục cho thấy tác động phụ thuộc vào cách thiết kế bài tập.',
        sources: [
          { title: 'UNESCO AI Guidance', uri: 'https://unesco.org/ai-education', url: 'https://unesco.org/ai-education' },
          { title: 'Duplicate URL', uri: 'https://unesco.org/ai-education' },
          { title: 'Unsafe link', uri: 'javascript:alert(1)' },
          { title: 'Stanford Study', uri: 'http://hai.stanford.edu/research' },
        ],
        searchQueries: ['AI critical writing high school'],
        model: 'gemini-4-hydrogen',
        finishReason: 'STOP',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const res = await askV2WithSearch({ prompt: 'Kiểm tra nguồn về AI giáo dục' });
    assert.equal(capturedUrl, '/api/v2-ask');
    assert.equal(capturedMethod, 'POST');
    assert.equal(res.model, 'gemini-4-hydrogen');
    assert.equal(res.sources.length, 2);
    assert.equal(res.sources[0].title, 'UNESCO AI Guidance');
    assert.equal(res.sources[0].uri, 'https://unesco.org/ai-education');
    assert.equal(res.sources[1].uri, 'http://hai.stanford.edu/research');
    assert.deepEqual(res.searchQueries, ['AI critical writing high school']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('askV2WithSearch surfaces AIRateLimitError on HTTP 429 and AIServiceError on HTTP 500', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Chạm hạn mức tạm thời', retry_after: 22 }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '22' },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => askV2WithSearch({ prompt: 'Test 429' }),
      (err: unknown) => err instanceof AIRateLimitError && err.retryAfter === 22
    );

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'Thiếu key', code: 'MISSING_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      () => askV2WithSearch({ prompt: 'Test 500' }),
      (err: unknown) =>
        err instanceof AIServiceError && err.status === 500 && err.code === 'MISSING_API_KEY'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requestLabAnalysis sends request to /api/v2-ask and forwards grounded sources', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedBody: Record<string, unknown> = {};

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        answer: JSON.stringify({
          user_claim_summary: 'Lo ngại AI làm giảm kỹ năng viết phản biện.',
          ai_claim_summary: 'Phân tích tác động hai chiều của AI trong rèn viết học thuật.',
          new_assumptions: ['Học sinh dùng AI để viết thay thay vì phản biện dàn ý.'],
          debate_steps: [],
          three_layer: {
            tldr: 'AI không tự động làm yếu tư duy nếu được dùng ở bước phản biện thay vì viết hộ.',
            positive_points: ['Bạn đặt đúng trọng tâm vào năng lực phản biện của học sinh THPT.'],
            negative_points: ['Cần phân biệt dùng AI để gợi phản đề với việc chép nguyên văn bản.'],
            facts: 'Báo cáo giáo dục gần đây ghi nhận sự phân hóa rõ theo cách hướng dẫn của giáo viên.',
            assumptions: 'Giả định rằng mọi hình thức dùng AI đều thay thế hoàn toàn quá trình viết.',
            interpretation:
              'Nếu học sinh tự lập luận trước rồi mới dùng AI để kiểm tra phản ví dụ, năng lực phản biện vẫn được rèn luyện.',
            guidingQuestion:
              'Theo bạn, ranh giới cụ thể nào phân biệt việc dùng AI làm công cụ đối thoại với việc lệ thuộc viết hộ?',
            evidence_check: {
              status: 'partial',
              grounded_claims: ['Vai trò thiết kế bài tập phản biện'],
              unverified_claims: [],
              warning: null,
            },
          },
        }),
        sources: [
          { title: 'OECD Education Outlook', uri: 'https://www.oecd.org/education' },
        ],
        searchQueries: ['OECD AI education critical thinking'],
        model: 'gemini-4-hydrogen',
        finishReason: 'STOP',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const result = await requestLabAnalysis(BASE_LAB_PAYLOAD, null);
    assert.equal(capturedUrl, '/api/v2-ask');
    assert.equal(typeof capturedBody.prompt, 'string');
    assert.ok(Array.isArray(capturedBody.history));
    assert.equal(result.source_engine, 'gemini');
    assert.equal(result.sources?.length, 1);
    assert.equal(result.sources?.[0].title, 'OECD Education Outlook');
    assert.equal(result.sources?.[0].uri, 'https://www.oecd.org/education');
    assert.match(result.three_layer.guidingQuestion, /ranh giới/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('parseV2AskLabPayload gracefully converts Markdown prose + sources without duplicating opening text', () => {
  const result = parseV2AskLabPayload(
    {
      answer: [
        'Khảo sát tại nhiều trường phổ thông cho thấy việc dùng AI hỗ trợ lập dàn ý giúp tiết kiệm thời gian tra cứu ban đầu.',
        'Tuy nhiên, nếu học sinh bỏ qua khâu tự kiểm chứng lập luận và nguồn trích dẫn, lập luận dễ trở nên đồng nhất và thiếu chiều sâu cá nhân.',
        'Theo bạn, tiêu chí nào giúp nhận biết một bài nghị luận do học sinh thực sự tư duy dù có tham khảo AI?',
      ].join('\n\n'),
      sources: [
        { title: 'EdTech Research Journal', uri: 'https://edtech.example.org/article-1' },
      ],
      searchQueries: ['AI outline writing high school'],
    },
    BASE_LAB_PAYLOAD
  );

  assert.equal(result.sources?.length, 1);
  assert.equal(result.sources?.[0].uri, 'https://edtech.example.org/article-1');
  assert.ok(result.three_layer.tldr?.includes('tiết kiệm thời gian tra cứu'));
  assert.ok(result.three_layer.interpretation.includes('thiếu chiều sâu cá nhân'));
  assert.ok(!result.three_layer.interpretation.includes('tiết kiệm thời gian tra cứu'));
  assert.equal(
    result.three_layer.guidingQuestion,
    'Theo bạn, tiêu chí nào giúp nhận biết một bài nghị luận do học sinh thực sự tư duy dù có tham khảo AI?'
  );
  assert.equal(result.three_layer.evidenceCheck?.status, 'verified');
});
