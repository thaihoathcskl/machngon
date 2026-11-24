export type DocumentCategory =
  | 'Ngôn ngữ học'
  | 'Văn học và lý luận văn học'
  | 'Triết học và tư tưởng'
  | 'Logic và lập luận'
  | 'Tư duy phản biện'
  | 'Kiến thức liên ngành'
  // Legacy category strings kept strictly for backward compatibility with stored custom docs
  | 'Ngôn ngữ'
  | 'Ngữ văn'
  | 'Tư duy và lập luận'
  | 'Văn hóa - xã hội'
  | 'Văn hóa – xã hội'
  | 'Lịch sử - Văn hóa'
  | 'Kỹ năng viết'
  | 'Khác';

export type DocumentBlockType =
  | 'prose'
  | 'concept'
  | 'quote'
  | 'counterargument'
  | 'question';

export type DocumentDifficulty = 'intro' | 'explore' | 'advanced';

export type DocumentReviewStatus =
  | 'editing'
  | 'pending_source'
  | 'verified'
  | 'published'
  | 'archived';

export interface ArticleReference {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  publicationYear?: number;
  url?: string;
  note?: string;
  verified: boolean;
}

export interface DocumentBlock {
  id: string;
  sectionId: string;
  type: DocumentBlockType;
  label?: string;
  heading?: string;
  content: string;
  citation?: string;
}

export interface DocumentSection {
  id: string;
  title: string;
}

export interface LibraryDocument {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  source: string;
  publishedDate: string;
  readingMinutes: number;
  category: DocumentCategory;
  coverImage: string;
  coverAlt: string;
  excerpt: string;
  keywords: string[];
  sections: DocumentSection[];
  blocks: DocumentBlock[];
  status: 'published' | 'draft';
  // Backward-compatible extensions (Library Expansion)
  difficulty?: DocumentDifficulty;
  tags?: string[];
  featured?: boolean;
  collectionIds?: string[];
  references?: ArticleReference[];
  relatedConceptIds?: string[];
  reviewedAt?: string;
  reviewStatus?: DocumentReviewStatus;
  verified?: boolean;
  contentVersion?: number;
  // Structured V2 fields preserved alongside rendered blocks
  fieldCode?: 'vh' | 'nn' | 'lt' | 'th' | 'tt' | 'kh';
  genre?: string;
  dePrompt?: string;
  keyPoints?: string[];
  examples?: string[];
  practiceCorpora?: Array<{
    title: string;
    source?: string;
    text: string;
    task?: string;
    mode?: LabType;
  }>;
  thinkingQuestions?: string[];
  practiceExercise?: string;
  isFullEssay?: boolean;
  wordCount?: number;
  reviewNote?: string;
}

export interface LibraryCategoryMeta {
  id: string;
  name: DocumentCategory;
  shortName: string;
  description: string;
  iconKey: 'languages' | 'feather' | 'landmark' | 'scale' | 'compass' | 'layers';
  order: number;
  hidden?: boolean;
}

export interface LibraryCollection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  coverAlt: string;
  documentIds: string[];
  status: 'published' | 'draft';
  order: number;
}

export interface LibraryConcept {
  id: string;
  term: string;
  englishTerm?: string;
  category: DocumentCategory;
  shortDefinition: string;
  example?: string;
  relatedConceptIds: string[];
  documentIds: string[];
  matchAliases?: string[];
}

export type LabType = 'concept' | 'debate' | 'read' | 'annotate' | 'grade';

export type LabDifficultyLevel = 'basic' | 'intermediate' | 'advanced';

export interface LabAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'text' | 'image' | 'pdf';
  textContent?: string;
  base64Data?: string;
  previewUrl?: string;
}

export type EvidenceVerificationStatus = 'verified' | 'partial' | 'unverified';

export interface EvidenceVerification {
  status: EvidenceVerificationStatus;
  /** Các ý đã có dẫn chứng rõ ràng hoặc khớp với tài liệu/tệp đính kèm */
  groundedClaims: string[];
  /** Các ý chưa có nguồn xác thực hoặc đang dựa trên nhận định chủ quan */
  unverifiedClaims: string[];
  /** Cảnh báo cụ thể khi thiếu dẫn chứng hoặc cần kiểm chứng nguồn */
  warning?: string | null;
}

export type LabActionIntent =
  | 'explain'
  | 'analyze_concept'
  | 'examples_counterexamples'
  | 'guiding_questions'
  | 'debate_claim';

export interface DebateStepItem {
  key: 'identify' | 'analyze' | 'challenge' | 'synthesize' | 'respond';
  title: string;
  vietnameseTitle: string;
  summary: string;
}

export interface ThreeLayerResponse {
  /** Lớp 1 – Tóm tắt ý chính / Công nhận trực diện bám sát câu trả lời vừa nêu */
  tldr?: string;
  /** Điểm tích cực / điểm hợp lý trong quan điểm người dùng */
  positivePoints?: string[];
  /** Điểm hạn chế / điểm cần phản biện bám sát chủ đề người dùng nêu */
  negativePoints?: string[];
  /** Cơ sở / dữ kiện khách quan */
  facts: string;
  /** Giả định ngầm */
  assumptions: string;
  /** Góc nhìn phản biện / Điểm hở logic / Ví dụ minh họa bám sát chủ đề */
  interpretation: string;
  /** Lớp 3 – Đúng 1 câu hỏi Socrates sắc bén, ngắn gọn xoáy thẳng vào lập luận vừa nêu */
  guidingQuestion: string;
  /** Gợi ý ngắn gọn giúp người dùng dễ trả lời câu hỏi ở Lớp 3 */
  questionHint?: string;
  /** Kiểm lại nguồn và trạng thái dẫn chứng */
  evidenceCheck?: EvidenceVerification;
}

export interface LedgerEntry {
  id: string; // e.g., "U#1", "A#1"
  speaker: 'user' | 'ai';
  turnIndex: number;
  claim: string;
  assumptions: string[];
  contradictionFlag?: string;
  timestamp: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
  url?: string;
}

export interface LabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  turnRef?: string; // U#1 or A#1
  threeLayer?: ThreeLayerResponse;
  debateSteps?: DebateStepItem[];
  sourceEngine?: 'openai-responses' | 'gemini' | 'local-fallback';
  responseId?: string;
  sources?: GroundingSource[];
  searchQueries?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    kind: 'text' | 'image' | 'pdf';
  }>;
}

export interface LabSession {
  id: string;
  title: string;
  labType: LabType;
  difficulty?: LabDifficultyLevel;
  resourceContextId?: string;
  previousResponseId?: string;
  messages: LabMessage[];
  ledger: LedgerEntry[];
  coreAssumptions: string[];
  contradictions: Array<{
    id: string;
    refA: string;
    refB: string;
    note: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LabApiRequestPayload {
  session_id: string;
  lab_type: LabType;
  difficulty?: LabDifficultyLevel;
  model?: AiModelId;
  message: string;
  resource_context_id?: string | null;
  attachments?: LabAttachment[];
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    turnRef?: string;
  }>;
  ledger_snapshot?: LedgerEntry[];
  core_assumptions?: string[];
  previous_response_id?: string | null;
  simulate_429?: boolean;
}

export interface LabApiResponsePayload {
  session_id: string;
  lab_type: LabType;
  response_id: string;
  source_engine: 'openai-responses' | 'gemini' | 'local-fallback';
  user_claim_summary: string;
  ai_claim_summary: string;
  new_assumptions: string[];
  contradiction_note?: string | null;
  contradiction_ref?: string | null;
  debate_steps: DebateStepItem[];
  three_layer: ThreeLayerResponse;
  sources?: GroundingSource[];
  searchQueries?: string[];
}

export interface SessionReportData {
  sessionId: string;
  title: string;
  labType: LabType;
  difficultyLabel: string;
  generatedAtIso: string;
  userTurnsCount: number;
  aiTurnsCount: number;
  attachedResourceTitle?: string | null;
  attachedFileNames: string[];
  keyArguments: Array<{
    ref: string;
    speaker: 'user' | 'ai';
    claim: string;
    contradictionFlag?: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  coreAssumptions: string[];
  coreQuestions: Array<{
    turnRef: string;
    question: string;
  }>;
  evidenceSummary: {
    overallStatus: EvidenceVerificationStatus;
    verifiedCount: number;
    partialCount: number;
    unverifiedCount: number;
    groundedClaims: string[];
    unverifiedClaims: string[];
    warnings: string[];
  };
}

export interface UserNotificationPrefs {
  dailyQuoteReminder: boolean;
  labFollowUpSuggestions: boolean;
  libraryNewHighlights: boolean;
}

export interface UserPrivacyPrefs {
  saveReadingProgress: boolean;
  saveLabHistory: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  roleLabel: string;
  bio?: string;
  avatarTint?: string;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  interests: string[];
  readingDepth: string;
  debateStyle: string;
  goal: string;
  weeklyRhythm: string;
  confidenceLevel?: string;
  exploreTopic?: string;
  notifications?: UserNotificationPrefs;
  privacy?: UserPrivacyPrefs;
}

export interface ReadingNote {
  id: string;
  documentId: string;
  blockId?: string;
  sectionId?: string;
  sectionTitle?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LabHandoffPayload {
  labType: LabType;
  resourceContextId: string;
  resourceTitle: string;
  quoteText: string;
  question?: string;
  blockLabel?: string;
  sectionId?: string;
  sectionTitle?: string;
  actionIntent?: LabActionIntent;
}

export type ToulminRole = 'claim' | 'ground' | 'warrant' | 'qual' | 'reb' | 'none';

export type RubricCriterionKey = 'claim' | 'evidence' | 'assumption' | 'counter' | 'wording';

export type RubricScores = Record<RubricCriterionKey, 1 | 2 | 3>;

export interface RubricEvaluationResult {
  scores: RubricScores;
  comments: Partial<Record<RubricCriterionKey, string>>;
  next: string;
  question: string;
  source: 'ai' | 'local';
  sources?: GroundingSource[];
  fallbackReason?: string;
}

export interface RubricScoreEntry {
  id: string;
  timestamp: number;
  scores: RubricScores;
  source: 'ai' | 'local';
  documentId?: string | null;
  words: number;
}

export interface GlossaryQuizQuestion {
  term: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export type AiModelId = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.0-flash';

export interface DocumentComment {
  id: string;
  documentId: string;
  authorName: string;
  rating: 'helpful' | 'needs_improvement';
  stars?: number;
  content: string;
  createdAt: string;
}

export type DocumentReportReason =
  | 'Sai kiến thức'
  | 'Lỗi chính tả / hiển thị'
  | 'Thiếu hoặc sai nguồn dẫn chứng'
  | 'Đề xuất cập nhật nội dung'
  | 'Khác';

export interface DocumentReportItem {
  id: string;
  documentId: string;
  documentTitle: string;
  reason: DocumentReportReason;
  detail: string;
  createdAt: string;
}

export interface AiFeedbackFlag {
  id: string;
  sessionId: string;
  messageId: string;
  turnRef?: string;
  note: string;
  createdAt: string;
}

