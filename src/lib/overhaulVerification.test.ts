import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_DOCUMENTS } from '../content/seedDocuments';
import { DEFAULT_LIBRARY_COLLECTIONS } from '../content/library/collections';
import { adminAuthService } from '../server/adminAuth';
import { isProtectedRoute, isPublicRoute, sanitizeRedirectPath } from './authGuard';
import {
  deriveDocumentToc,
  estimateReadingMinutes,
  isDocumentVerified,
} from './library/validation';
import { getPersonalizedRecommendations } from './library/recommendations';
import {
  DOCX_MIME_TYPE,
  MAX_BINARY_FILE_BYTES,
  validateAttachmentFile,
} from './ai/attachments';
import {
  getLibraryLexiconPrompt,
  getSystemPrompt,
  LIBRARY_LEXICON_SYSTEM_PROMPT,
} from './ai/systemPrompts';
import type { UserProfile } from './types';

test('adminAuthService hard-locks admin login when ADMIN_PASSCODE is unset', async () => {
  const prev = process.env.ADMIN_PASSCODE;
  delete process.env.ADMIN_PASSCODE;
  try {
    assert.equal(adminAuthService.isConfigured(), false);
    const status = await adminAuthService.getStatus();
    assert.equal(status.configured, false);
    const loginResult = await adminAuthService.login('any-passcode');
    assert.equal(loginResult, null);
  } finally {
    if (prev !== undefined) {
      process.env.ADMIN_PASSCODE = prev;
    }
  }
});

test('authGuard separates public knowledge routes from protected workspace routes', () => {
  const publicRoutes = [
    '/',
    '/auth',
    '/about',
    '/guide',
    '/library',
    '/library/tri-tue-nhan-tao-va-dao-duc-trach-nhiem',
  ];
  for (const path of publicRoutes) {
    assert.equal(isPublicRoute(path), true, `Expected ${path} to be public`);
    assert.equal(isProtectedRoute(path), false, `Expected ${path} not to be protected`);
  }

  const protectedRoutes = ['/dashboard', '/lab', '/history', '/profile', '/onboarding', '/admin'];
  for (const path of protectedRoutes) {
    assert.equal(isProtectedRoute(path), true, `Expected ${path} to be protected`);
    assert.equal(isPublicRoute(path), false, `Expected ${path} not to be public`);
  }

  assert.equal(sanitizeRedirectPath('https://evil.example'), '/dashboard');
  assert.equal(sanitizeRedirectPath('/lab?mode=debate'), '/lab?mode=debate');
});

test('library validation derives non-empty TOC, dynamic reading time, and >=2 refs verification', () => {
  assert.equal(SEED_DOCUMENTS.length, 24);
  for (const doc of SEED_DOCUMENTS) {
    const toc = deriveDocumentToc(doc.blocks);
    assert.ok(toc.length >= 1, `Expected auto-derived TOC for ${doc.id}`);
    const minutes = estimateReadingMinutes(doc.blocks, doc.excerpt);
    assert.ok(minutes >= 1 && minutes <= 30, `Unexpected reading minutes ${minutes} for ${doc.id}`);
    assert.equal(
      isDocumentVerified(doc),
      true,
      `Expected seed document ${doc.id} to have >= 2 verified references`
    );
  }
});

test('getPersonalizedRecommendations excludes saved and >=90% completed docs and boosts next collection doc', () => {
  const mockUser: UserProfile = {
    name: 'Test Reader',
    email: 'reader@machngon.edu.vn',
    roleLabel: 'Người học',
    isAuthenticated: true,
    interests: ['Kiến thức liên ngành'],
    goal: 'Rèn tư duy phản biện',
    readingDepth: 'Đọc sâu',
    debateStyle: 'Socrates',
    onboardingCompleted: true,
  };

  const collection = DEFAULT_LIBRARY_COLLECTIONS[0];
  const firstDocId = collection.documentIds[0];
  const secondDocId = collection.documentIds[1];
  const savedDocId = SEED_DOCUMENTS.find((d) => d.id !== firstDocId && d.id !== secondDocId)!.id;

  const recs = getPersonalizedRecommendations(
    mockUser,
    SEED_DOCUMENTS,
    {
      [firstDocId]: { scrollY: 1200, scrollPercent: 95, updatedAt: new Date().toISOString() },
    },
    [savedDocId],
    3
  );

  assert.equal(recs.length, 3);
  assert.equal(
    recs.some((d) => d.id === savedDocId),
    false,
    'Saved document should be excluded from primary recommendations'
  );
  assert.equal(
    recs.some((d) => d.id === firstDocId),
    false,
    'Document with >= 90% scroll progress should be excluded from primary recommendations'
  );
  assert.equal(
    recs.some((d) => d.id === secondDocId),
    true,
    'Next unread document in started collection should be prioritized'
  );
});

test('validateAttachmentFile accepts .docx up to 5 MB and rejects oversized files', () => {
  const validDocx = validateAttachmentFile({
    name: 'bai-luan.docx',
    type: DOCX_MIME_TYPE,
    size: 2 * 1024 * 1024,
  });
  assert.equal(validDocx.ok, true);
  assert.equal(validDocx.kind, 'docx');

  const validPdf = validateAttachmentFile({
    name: 'tai-lieu.pdf',
    type: 'application/pdf',
    size: MAX_BINARY_FILE_BYTES,
  });
  assert.equal(validPdf.ok, true);
  assert.equal(validPdf.kind, 'pdf');

  const oversizedPdf = validateAttachmentFile({
    name: 'qua-lon.pdf',
    type: 'application/pdf',
    size: MAX_BINARY_FILE_BYTES + 1,
  });
  assert.equal(oversizedPdf.ok, false);
  assert.ok(oversizedPdf.error?.includes('5 MB'));
});

test('AI Library prompts are separated from AI Labs prompts across all 3 proficiency levels', () => {
  assert.ok(LIBRARY_LEXICON_SYSTEM_PROMPT.includes('library_lexicon'));
  assert.ok(LIBRARY_LEXICON_SYSTEM_PROMPT.includes('KHÔNG kéo người đọc sang tranh biện'));

  const lexiconPrompt = getLibraryLexiconPrompt(
    'ẩn dụ',
    'Ẩn dụ ý niệm định hình cách con người hiểu khái niệm trừu tượng.',
    'Phong cách ngôn ngữ'
  );
  assert.ok(lexiconPrompt.includes('ẩn dụ'));
  assert.ok(lexiconPrompt.includes('Phong cách ngôn ngữ'));

  const basicPrompt = getSystemPrompt('debate', null, null, 'basic');
  const midPrompt = getSystemPrompt('debate', null, null, 'intermediate');
  const expertPrompt = getSystemPrompt('debate', null, null, 'advanced');

  assert.ok(basicPrompt.includes('NGƯỜI MỚI BẮT ĐẦU'));
  assert.ok(midPrompt.includes('TẦM TRUNG'));
  assert.ok(expertPrompt.includes('CHUYÊN GIA'));
  assert.ok(expertPrompt.includes('positive_points'));
  assert.ok(expertPrompt.includes('negative_points'));
});
