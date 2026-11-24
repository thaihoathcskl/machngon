import { DEFAULT_THEME_CONFIG, SavedThemeConfig } from './palettes';
import {
  AiFeedbackFlag,
  AiModelId,
  DocumentComment,
  DocumentReportItem,
  LabDifficultyLevel,
  LabHandoffPayload,
  LabSession,
  LibraryCategoryMeta,
  LibraryCollection,
  LibraryDocument,
  ReadingNote,
  RubricScoreEntry,
  UserProfile,
} from './types';

const KEYS = {
  THEME: 'machngon_theme_v1',
  USER: 'machngon_user_v1',
  SESSIONS: 'machngon_lab_sessions_v1',
  SAVED_DOCS: 'machngon_saved_docs_v1',
  NOTES: 'machngon_reading_notes_v1',
  CUSTOM_DOCS: 'machngon_admin_docs_v1',
  CUSTOM_CATEGORIES: 'machngon_admin_categories_v1',
  CUSTOM_COLLECTIONS: 'machngon_admin_collections_v1',
  LAYOUT_PREFS: 'machngon_layout_prefs_v1',
  LAB_DRAFT_PREFIX: 'machngon_lab_draft_',
  LAB_HANDOFF: 'machngon_lab_handoff_v1',
  READ_POS_PREFIX: 'machngon_read_pos_',
  LAB_DIFFICULTY: 'machngon_lab_difficulty_v1',
  PREFERRED_AI_MODEL: 'machngon_ai_model_v1',
  DOC_COMMENTS: 'machngon_doc_comments_v1',
  DOC_REPORTS: 'machngon_doc_reports_v1',
  AI_FEEDBACK_FLAGS: 'machngon_ai_flags_v1',
  COMPLETED_DOCS: 'machngon_completed_docs_v1',
  OPENED_DOCS: 'machngon_opened_docs_v1',
  ACTIVE_JOURNEY: 'machngon_active_journey_v1',
  RUBRIC_SCORES: 'machngon_rubric_scores_v1',
  MY_CONCEPT_DEFS: 'machngon_my_defs_v1',
  DOC_STANCES: 'machngon_doc_stance_v1',
  ANNOTATE_DRAFT: 'machngon_annotate_draft_v1',
  GRADE_DRAFT: 'machngon_grade_draft_v1',
};

export interface ReadingScrollState {
  scrollPercent: number;
  scrollY: number;
  nearestHeadingId?: string;
  updatedAt: string;
}

export type ReadingFontSize = 'sm' | 'md' | 'lg' | 'xl';

export const LIBRARY_FONT_SCALE_MAP: Record<ReadingFontSize, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.125,
  xl: 1.25,
};

export const READING_FONT_SIZE_OPTIONS: Array<{
  key: ReadingFontSize;
  label: string;
  shortLabel: string;
  scale: number;
  percentLabel: string;
}> = [
  { key: 'sm', label: 'Nhỏ', shortLabel: 'A-', scale: 0.9, percentLabel: '90%' },
  { key: 'md', label: 'Vừa', shortLabel: 'A', scale: 1, percentLabel: '100%' },
  { key: 'lg', label: 'Lớn', shortLabel: 'A+', scale: 1.125, percentLabel: '113%' },
  { key: 'xl', label: 'Rất lớn', shortLabel: 'A++', scale: 1.25, percentLabel: '125%' },
];

export function isValidReadingFontSize(value: unknown): value is ReadingFontSize {
  return value === 'sm' || value === 'md' || value === 'lg' || value === 'xl';
}

export interface LayoutPreferences {
  rightPanelOpenDesktop: boolean;
  leftTocOpenDesktop: boolean;
  readingFontSize: ReadingFontSize;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Lan Phương',
  email: 'lanphuong@machngon.edu.vn',
  roleLabel: 'Học sinh · Người yêu tri thức',
  bio: 'Học để hiểu, hiểu để sống sâu hơn.',
  avatarTint: 'primary',
  isAuthenticated: false,
  onboardingCompleted: false,
  interests: ['Triết học và tư tưởng', 'Ngôn ngữ', 'Ngữ văn'],
  readingDepth: 'Đọc sâu có trích dẫn học thuật',
  debateStyle: 'Phản biện điềm tĩnh, ưu tiên làm rõ giả định ngầm',
  goal: 'Rèn cấu trúc lập luận mạch lạc và đặt câu hỏi sắc nét',
  weeklyRhythm: '3–4 phiên đọc và suy ngẫm mỗi tuần',
  confidenceLevel: 'Đang rèn luyện phân tích và tìm phản đề',
  exploreTopic: 'Triết học hiện sinh & tự do lựa chọn',
  notifications: {
    dailyQuoteReminder: true,
    labFollowUpSuggestions: true,
    libraryNewHighlights: false,
  },
  privacy: {
    saveReadingProgress: true,
    saveLabHistory: true,
  },
};

function safeGetLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadThemeConfig(): SavedThemeConfig {
  return safeGetLocal<SavedThemeConfig>(KEYS.THEME, DEFAULT_THEME_CONFIG);
}

export function saveThemeConfig(config: SavedThemeConfig): void {
  safeSetLocal(KEYS.THEME, config);
}

export function loadUserProfile(): UserProfile {
  const stored = safeGetLocal<Partial<UserProfile>>(KEYS.USER, DEFAULT_USER_PROFILE);
  return {
    ...DEFAULT_USER_PROFILE,
    ...stored,
    notifications: {
      ...DEFAULT_USER_PROFILE.notifications!,
      ...(stored.notifications ?? {}),
    },
    privacy: {
      ...DEFAULT_USER_PROFILE.privacy!,
      ...(stored.privacy ?? {}),
    },
  };
}

export function saveUserProfile(profile: UserProfile): void {
  safeSetLocal(KEYS.USER, profile);
}

export function loadSavedDocIds(): string[] {
  return safeGetLocal<string[]>(KEYS.SAVED_DOCS, [
    'triet-hoc-hien-sinh',
    'ngon-ngu-va-tu-duy',
  ]);
}

export function saveSavedDocIds(ids: string[]): void {
  safeSetLocal(KEYS.SAVED_DOCS, ids);
}

export function loadReadingNotes(): ReadingNote[] {
  return safeGetLocal<ReadingNote[]>(KEYS.NOTES, [
    {
      id: 'note-seed-1',
      documentId: 'triet-hoc-hien-sinh',
      blockId: 'triet-hoc-hien-sinh-b-1',
      content:
        'Cần phân biệt rõ giữa tự do lựa chọn thái độ ứng xử và tự do thoát khỏi điều kiện vật chất.',
      createdAt: '2026-11-18T09:30:00.000Z',
    },
  ]);
}

export function saveReadingNotes(notes: ReadingNote[]): void {
  safeSetLocal(KEYS.NOTES, notes);
}

export function loadLabSessions(): LabSession[] {
  return safeGetLocal<LabSession[]>(KEYS.SESSIONS, [
    {
      id: 'session-seed-existential',
      title: 'Ranh giới giữa tự do hiện sinh và điều kiện xã hội',
      labType: 'debate',
      resourceContextId: 'triet-hoc-hien-sinh',
      messages: [
        {
          id: 'msg-seed-u1',
          role: 'user',
          turnRef: 'U#1',
          content:
            'Nếu Sartre nói con người luôn luôn tự do lựa chọn, vậy người sinh ra trong hoàn cảnh nghèo khó có thực sự tự do không?',
          timestamp: '2026-11-19T14:10:00.000Z',
        },
        {
          id: 'msg-seed-a1',
          role: 'assistant',
          turnRef: 'A#1',
          content:
            'Phân tích ranh giới giữa tự do bản thể học (lựa chọn thái độ) và tự do thực tiễn (không gian phương án xã hội).',
          timestamp: '2026-11-19T14:10:14.000Z',
          sourceEngine: 'local-fallback',
          debateSteps: [
            {
              key: 'identify',
              title: 'Identify',
              vietnameseTitle: 'Xác định',
              summary:
                'Xác định câu hỏi trung tâm ở U#1: kiểm thử giới hạn mệnh đề "con người luôn tự do" khi đặt trong điều kiện kinh tế – xã hội bất bình đẳng.',
            },
            {
              key: 'analyze',
              title: 'Analyze',
              vietnameseTitle: 'Phân tích',
              summary:
                'Tách khái niệm tự do trong văn bản thành hai tầng: tự do ý thức (nội tâm) và tự do khả năng (tập lựa chọn khả thi).',
            },
            {
              key: 'challenge',
              title: 'Challenge',
              vietnameseTitle: 'Thử thách',
              summary:
                'Nếu gộp hai tầng làm một, ta sẽ rơi vào một trong hai cực đoan: phủ nhận hoàn toàn vai trò hoàn cảnh hoặc phủ nhận mọi chủ thể tính cá nhân.',
            },
            {
              key: 'synthesize',
              title: 'Synthesize',
              vietnameseTitle: 'Tổng hợp',
              summary:
                'Kết nối quan điểm Sartre (1946) với phê bình cấu trúc xã hội của Bourdieu và Simone de Beauvoir được nêu ở mục 3 tài liệu.',
            },
            {
              key: 'respond',
              title: 'Respond',
              vietnameseTitle: 'Phản hồi',
              summary:
                'Trình bày rõ 3 tầng nhận thức và đặt câu hỏi về tiêu chí phân biệt giới hạn hoàn cảnh với sự ngụy tín.',
            },
          ],
          threeLayer: {
            facts:
              'Trong bài đọc "Triết học hiện sinh: Con người và sự tự do", Sartre bàn về tự do chủ yếu ở bình diện ý thức và trách nhiệm tạo nghĩa; còn các nhà xã hội học như Pierre Bourdieu nhấn mạnh giới hạn cấu trúc do giai tầng và nguồn lực tạo ra.',
            assumptions:
              'Câu hỏi U#1 đang chứa một giả định ngầm đáng chú ý: "tự do" chỉ thực sự tồn tại khi các cá nhân có cùng số lượng và chất lượng cơ hội vật chất như nhau.',
            interpretation:
              'Diễn giải lập luận của bạn theo hướng mạnh nhất: bất công cấu trúc rõ ràng thu hẹp biên độ lựa chọn thực tế, nên không thể đánh đồng vị thế của mọi cá nhân. Tuy nhiên, ngay cả trong hoàn cảnh chật hẹp, chủ thể vẫn giữ phần tự do định vị thái độ và phản kháng trước hoàn cảnh ấy. Cái bẫy nằm ở chỗ tuyệt đối hóa một phía mà quên phía kia.',
            guidingQuestion:
              'Theo bạn, khi nào việc viện dẫn hoàn cảnh nghèo khó là một phân tích khách quan hợp lý, và khi nào nó trượt sang "ngụy tín" (tự tước bỏ trách nhiệm hành động)?',
          },
        },
      ],
      ledger: [
        {
          id: 'U#1',
          speaker: 'user',
          turnIndex: 1,
          claim:
            'Đặt nghi vấn về tính khả thi của tự do hiện sinh trước rào cản hoàn cảnh nghèo khó.',
          assumptions: [
            'Tự do thực chất đòi hỏi không gian cơ hội vật chất tương xứng.',
          ],
          timestamp: '2026-11-19T14:10:00.000Z',
        },
        {
          id: 'A#1',
          speaker: 'ai',
          turnIndex: 1,
          claim:
            'Tách bạch tự do ý thức (Sartre) và không gian lựa chọn cấu trúc xã hội (Bourdieu).',
          assumptions: [
            'Cần phân biệt giới hạn hoàn cảnh với sự thoái thác trách nhiệm.',
          ],
          timestamp: '2026-11-19T14:10:14.000Z',
        },
      ],
      coreAssumptions: [
        'Tự do thực chất đòi hỏi không gian cơ hội vật chất tương xứng.',
        'Cần phân biệt giới hạn hoàn cảnh với sự thoái thác trách nhiệm.',
      ],
      contradictions: [],
      createdAt: '2026-11-19T14:10:00.000Z',
      updatedAt: '2026-11-19T14:10:14.000Z',
    },
  ]);
}

export function saveLabSessions(sessions: LabSession[]): void {
  safeSetLocal(KEYS.SESSIONS, sessions);
}

export function loadCustomAdminDocs(): LibraryDocument[] {
  return safeGetLocal<LibraryDocument[]>(KEYS.CUSTOM_DOCS, []);
}

export function saveCustomAdminDocs(docs: LibraryDocument[]): void {
  safeSetLocal(KEYS.CUSTOM_DOCS, docs);
}

export function loadCustomCategories(): LibraryCategoryMeta[] | null {
  return safeGetLocal<LibraryCategoryMeta[] | null>(KEYS.CUSTOM_CATEGORIES, null);
}

export function saveCustomCategories(categories: LibraryCategoryMeta[]): void {
  safeSetLocal(KEYS.CUSTOM_CATEGORIES, categories);
}

export function loadCustomCollections(): LibraryCollection[] | null {
  return safeGetLocal<LibraryCollection[] | null>(KEYS.CUSTOM_COLLECTIONS, null);
}

export function saveCustomCollections(collections: LibraryCollection[]): void {
  safeSetLocal(KEYS.CUSTOM_COLLECTIONS, collections);
}

export function loadLayoutPrefs(): LayoutPreferences {
  const stored = safeGetLocal<Partial<LayoutPreferences>>(KEYS.LAYOUT_PREFS, {});
  return {
    rightPanelOpenDesktop: stored.rightPanelOpenDesktop ?? true,
    leftTocOpenDesktop: stored.leftTocOpenDesktop ?? true,
    readingFontSize: isValidReadingFontSize(stored.readingFontSize)
      ? stored.readingFontSize
      : 'md',
  };
}

export function saveLayoutPrefs(prefs: LayoutPreferences): void {
  safeSetLocal(KEYS.LAYOUT_PREFS, prefs);
}

/**
 * Autosave draft text per session so network errors or HTTP 429 never lose user typing.
 */
export function loadLabDraft(sessionId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(`${KEYS.LAB_DRAFT_PREFIX}${sessionId}`) ?? '';
  } catch {
    return '';
  }
}

export function saveLabDraft(sessionId: string, text: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!text) {
      window.localStorage.removeItem(`${KEYS.LAB_DRAFT_PREFIX}${sessionId}`);
    } else {
      window.localStorage.setItem(`${KEYS.LAB_DRAFT_PREFIX}${sessionId}`, text);
    }
  } catch {
    // Ignore
  }
}

/**
 * Store pending Library -> Thinking Lab quote handoff (prefills Composer without auto-sending).
 */
export function setLabHandoff(payload: LabHandoffPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEYS.LAB_HANDOFF, JSON.stringify(payload));
  } catch {
    // Ignore
  }
}

export function consumeLabHandoff(): LabHandoffPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEYS.LAB_HANDOFF);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEYS.LAB_HANDOFF);
    return JSON.parse(raw) as LabHandoffPayload;
  } catch {
    return null;
  }
}

/**
 * Persist and restore scroll position per document in sessionStorage under `machngon_read_pos_{resource_id}`.
 */
export function saveReadingScrollPosition(
  resourceId: string,
  state: ReadingScrollState
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      `${KEYS.READ_POS_PREFIX}${resourceId}`,
      JSON.stringify(state)
    );
  } catch {
    // Ignore
  }
}

export function loadReadingScrollPosition(
  resourceId: string
): ReadingScrollState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${KEYS.READ_POS_PREFIX}${resourceId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingScrollState;
  } catch {
    return null;
  }
}

export function getAllReadingProgress(): Record<string, ReadingScrollState> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, ReadingScrollState> = {};
  try {
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(KEYS.READ_POS_PREFIX)) {
        const docId = key.slice(KEYS.READ_POS_PREFIX.length);
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          result[docId] = JSON.parse(raw) as ReadingScrollState;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return result;
}

export function loadLabDifficulty(): LabDifficultyLevel {
  const stored = safeGetLocal<string>(KEYS.LAB_DIFFICULTY, 'intermediate');
  if (stored === 'basic' || stored === 'intermediate' || stored === 'advanced') {
    return stored;
  }
  return 'intermediate';
}

export function saveLabDifficulty(level: LabDifficultyLevel): void {
  safeSetLocal(KEYS.LAB_DIFFICULTY, level);
}

export function loadPreferredAiModel(): AiModelId {
  const stored = safeGetLocal<string>(KEYS.PREFERRED_AI_MODEL, 'gemini-2.5-flash');
  if (
    stored === 'gemini-2.5-flash' ||
    stored === 'gemini-2.5-pro' ||
    stored === 'gemini-2.0-flash'
  ) {
    return stored;
  }
  return 'gemini-2.5-flash';
}

export function savePreferredAiModel(model: AiModelId): void {
  safeSetLocal(KEYS.PREFERRED_AI_MODEL, model);
}

export function loadDocumentComments(documentId?: string): DocumentComment[] {
  const all = safeGetLocal<DocumentComment[]>(KEYS.DOC_COMMENTS, []);
  if (!documentId) return all;
  return all.filter((c) => c.documentId === documentId);
}

export function addDocumentComment(comment: DocumentComment): DocumentComment[] {
  const all = safeGetLocal<DocumentComment[]>(KEYS.DOC_COMMENTS, []);
  const next = [comment, ...all].slice(0, 300);
  safeSetLocal(KEYS.DOC_COMMENTS, next);
  return next;
}

export function loadDocumentReports(): DocumentReportItem[] {
  return safeGetLocal<DocumentReportItem[]>(KEYS.DOC_REPORTS, []);
}

export function addDocumentReport(report: DocumentReportItem): DocumentReportItem[] {
  const all = loadDocumentReports();
  const next = [report, ...all].slice(0, 200);
  safeSetLocal(KEYS.DOC_REPORTS, next);
  return next;
}

export function loadAiFeedbackFlags(): AiFeedbackFlag[] {
  return safeGetLocal<AiFeedbackFlag[]>(KEYS.AI_FEEDBACK_FLAGS, []);
}

export function addAiFeedbackFlag(flag: AiFeedbackFlag): AiFeedbackFlag[] {
  const all = loadAiFeedbackFlags();
  const next = [flag, ...all].slice(0, 200);
  safeSetLocal(KEYS.AI_FEEDBACK_FLAGS, next);
  return next;
}

export function loadCompletedDocIds(): string[] {
  return safeGetLocal<string[]>(KEYS.COMPLETED_DOCS, []);
}

export function saveCompletedDocIds(ids: string[]): void {
  safeSetLocal(KEYS.COMPLETED_DOCS, ids);
}

export function loadOpenedDocIds(): string[] {
  return safeGetLocal<string[]>(KEYS.OPENED_DOCS, []);
}

export function saveOpenedDocIds(ids: string[]): void {
  safeSetLocal(KEYS.OPENED_DOCS, ids);
}

export function loadActiveJourneyId(): string {
  return safeGetLocal<string>(KEYS.ACTIVE_JOURNEY, '');
}

export function saveActiveJourneyId(journeyId: string): void {
  safeSetLocal(KEYS.ACTIVE_JOURNEY, journeyId);
}

export function loadRubricScores(): RubricScoreEntry[] {
  return safeGetLocal<RubricScoreEntry[]>(KEYS.RUBRIC_SCORES, []);
}

export function saveRubricScores(entries: RubricScoreEntry[]): void {
  safeSetLocal(KEYS.RUBRIC_SCORES, entries.slice(0, 120));
}

export function loadMyConceptDefs(): Record<string, string> {
  return safeGetLocal<Record<string, string>>(KEYS.MY_CONCEPT_DEFS, {});
}

export function saveMyConceptDef(term: string, definition: string): Record<string, string> {
  const current = loadMyConceptDefs();
  const next = { ...current };
  if (!definition.trim()) {
    delete next[term];
  } else {
    next[term] = definition.trim();
  }
  safeSetLocal(KEYS.MY_CONCEPT_DEFS, next);
  return next;
}

export function loadDocStances(): Record<string, string> {
  return safeGetLocal<Record<string, string>>(KEYS.DOC_STANCES, {});
}

export function saveDocStance(docId: string, text: string): Record<string, string> {
  const current = loadDocStances();
  const next = { ...current };
  if (!text.trim()) {
    delete next[docId];
  } else {
    next[docId] = text;
  }
  safeSetLocal(KEYS.DOC_STANCES, next);
  return next;
}

export function loadLabToolDraft(tool: 'annotate' | 'grade'): string {
  if (typeof window === 'undefined') return '';
  try {
    const key = tool === 'annotate' ? KEYS.ANNOTATE_DRAFT : KEYS.GRADE_DRAFT;
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function saveLabToolDraft(tool: 'annotate' | 'grade', text: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = tool === 'annotate' ? KEYS.ANNOTATE_DRAFT : KEYS.GRADE_DRAFT;
    if (!text) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, text);
    }
  } catch {
    // Ignore
  }
}

export function exportAllLocalDataJson(): string {
  const payload = {
    app: 'Mạch Ngôn',
    exportedAt: new Date().toISOString(),
    profile: loadUserProfile(),
    savedDocIds: loadSavedDocIds(),
    completedDocIds: loadCompletedDocIds(),
    openedDocIds: loadOpenedDocIds(),
    activeJourneyId: loadActiveJourneyId(),
    rubricScores: loadRubricScores(),
    myConceptDefs: loadMyConceptDefs(),
    docStances: loadDocStances(),
    readingNotes: loadReadingNotes(),
    labSessions: loadLabSessions(),
    readingProgress: getAllReadingProgress(),
    documentComments: loadDocumentComments(),
    documentReports: loadDocumentReports(),
    aiFeedbackFlags: loadAiFeedbackFlags(),
    preferences: {
      theme: loadThemeConfig(),
      layout: loadLayoutPrefs(),
      labDifficulty: loadLabDifficulty(),
      preferredAiModel: loadPreferredAiModel(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function clearAllLocalData(): void {
  if (typeof window === 'undefined') return;
  try {
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('machngon_')) {
        localKeysToRemove.push(k);
      }
    }
    localKeysToRemove.forEach((k) => window.localStorage.removeItem(k));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('machngon_')) {
        sessionKeysToRemove.push(k);
      }
    }
    sessionKeysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Ignore storage clear errors
  }
}


