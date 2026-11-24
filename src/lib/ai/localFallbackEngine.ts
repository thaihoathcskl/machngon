import type {
  DebateStepItem,
  EvidenceVerification,
  LabApiRequestPayload,
  LabApiResponsePayload,
  LabAttachment,
  LabDifficultyLevel,
  LabType,
  LedgerEntry,
  LibraryDocument,
} from '../types.ts';
import { normalizeVietnamese } from '../vietnamese.ts';
import { V2_WORK_ALIASES } from './v2Pedagogy.ts';

const ABSOLUTE_MARKERS: Array<{ key: string; label: string }> = [
  { key: 'luon luon', label: 'luôn luôn' },
  { key: 'tat ca', label: 'tất cả' },
  { key: 'khong bao gio', label: 'không bao giờ' },
  { key: 'duy nhat', label: 'duy nhất' },
  { key: 'chac chan 100', label: 'chắc chắn 100%' },
  { key: 'moi nguoi deu', label: 'mọi người đều' },
  { key: 'hien nhien', label: 'hiển nhiên' },
  { key: 'tuyet doi', label: 'tuyệt đối' },
  { key: 'hoan toan dung', label: 'hoàn toàn đúng' },
  { key: 'hoan toan sai', label: 'hoàn toàn sai' },
  { key: 'khong the nao', label: 'không thể nào' },
];

const CONTRADICTION_REFERENCES = [
  'mau thuan',
  'lap luan thu',
  'gia dinh ban dau',
  'luot truoc',
  'ban vua noi',
  'u#',
  'a#',
  'khac voi',
  'tu phu nhan',
];

const STUCK_PHRASES = [
  'khong biet',
  'ko biet',
  'k biet',
  'em chiu',
  'minh chiu',
  'bo tay',
  'bi y tuong',
  'bi qua',
  'chua nghi ra',
  'khong nghi ra',
  'kho qua',
  'em khong ro',
  'minh khong ro',
];

const SUMMARY_MARKERS = [
  'tong ket',
  'ban do tu duy',
  'ban do truy vet',
  'tom tat phien',
  'ket thuc phien',
  'tong hop lai',
  'tien bo lap luan',
];

const EVIDENCE_CUES = [
  'theo ',
  'nghien cuu',
  'bao cao',
  'so lieu',
  'thong ke',
  'dan chung',
  'vi du',
  'trich ',
  'tai lieu',
  'khao sat',
  'nguon',
  'tac pham',
  'nam 20',
  'nam 19',
  '%',
];

function stripSpokenVietnameseFillers(rawText: string): string {
  if (!rawText) return '';
  const cleaned = rawText
    .replace(/\s+/g, ' ')
    .replace(
      /(?<=^|[\s,.;:!?])(?:kiểu\s+như\s+là|kiểu\s+như|thì\s+em\s+thấy\s+là|thì\s+em\s+thấy|thì\s+mình\s+thấy\s+là|thì\s+mình\s+thấy|à\s+mà|nghĩa\s+là|nói\s+chung\s+là|ý\s+em\s+là|ý\s+mình\s+là|thì\s+là|ừm+|ờm+)(?=$|[\s,.;:!?])[\s,]*/giu,
      ' '
    )
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/^[,.;:\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 6) return rawText.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractShortSummary(text: string, maxLen = 115): string {
  const cleaned = text.replace(/\s+/g, ' ').replace(/^["“”'\s]+|["“”'\s]+$/g, '').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen).trimEnd()}…`;
}

function detectAbsoluteClaims(message: string): string[] {
  const norm = normalizeVietnamese(message);
  return ABSOLUTE_MARKERS.filter((marker) => norm.includes(marker.key)).map(
    (marker) => marker.label
  );
}

function isStuckMessage(message: string): boolean {
  const norm = normalizeVietnamese(message);
  return norm.length <= 95 && STUCK_PHRASES.some((phrase) => norm.includes(phrase));
}

function isSummaryRequest(message: string): boolean {
  const norm = normalizeVietnamese(message);
  return SUMMARY_MARKERS.some((marker) => norm.includes(marker));
}

function detectReferencedPriorTurn(
  message: string,
  ledger: LedgerEntry[]
): { referencedEntry: LedgerEntry | null; mentionsContradiction: boolean } {
  const norm = normalizeVietnamese(message);
  const mentionsContradiction = CONTRADICTION_REFERENCES.some((k) => norm.includes(k));

  const explicitMatch = message.match(/\b([UA])#(\d+)\b/i);
  if (explicitMatch) {
    const code = `${explicitMatch[1].toUpperCase()}#${explicitMatch[2]}`;
    const found = ledger.find((item) => item.id.toUpperCase() === code) ?? null;
    return { referencedEntry: found, mentionsContradiction };
  }

  const aiEntries = ledger.filter((l) => l.speaker === 'ai');
  const userEntries = ledger.filter((l) => l.speaker === 'user');
  if (norm.includes('thu hai') || norm.includes('thu 2')) {
    return {
      referencedEntry: aiEntries[1] ?? userEntries[1] ?? ledger[1] ?? null,
      mentionsContradiction: true,
    };
  }
  if (norm.includes('dau tien') || norm.includes('ban dau') || norm.includes('thu nhat')) {
    return {
      referencedEntry: ledger[0] ?? null,
      mentionsContradiction,
    };
  }
  if (mentionsContradiction && ledger.length > 0) {
    return {
      referencedEntry: aiEntries[aiEntries.length - 1] ?? ledger[ledger.length - 1],
      mentionsContradiction: true,
    };
  }
  return { referencedEntry: null, mentionsContradiction: false };
}

function inferHiddenAssumptions(message: string, labType: LabType): string[] {
  const norm = normalizeVietnamese(message);
  const found: string[] = [];

  if (norm.includes('tu do') || norm.includes('lua chon')) {
    found.push(
      'Tự do cá nhân có thể tách rời khỏi hoàn cảnh thực tế và tác động lên người xung quanh.'
    );
  }
  if (norm.includes('ngon ngu') || norm.includes('tu vung') || norm.includes('an du')) {
    found.push(
      'Lời nói phát ra bên ngoài phản ánh trọn vẹn mọi tầng suy nghĩ bên trong người nói.'
    );
  }
  if (
    norm.includes('cong nghe') ||
    /\bAI\b/.test(message) ||
    norm.includes('tri tue nhan tao') ||
    norm.includes('chatgpt')
  ) {
    found.push(
      'Sử dụng công cụ hỗ trợ (như AI) mặc nhiên đồng nghĩa với việc người học bỏ qua quá trình tự tư duy.'
    );
  }
  if (/\bnen\b/.test(norm) || /\bphai\b/.test(norm) || norm.includes('bat buoc')) {
    found.push(
      'Đã có sẵn một tiêu chuẩn chung về điều "nên/phải" làm mà mọi thành viên đều đồng thuận.'
    );
  }
  if (norm.includes('thuc dung') || norm.includes('hieu qua') || norm.includes('thanh cong')) {
    found.push(
      'Giá trị của một lựa chọn có thể đo trọn vẹn bằng kết quả nhìn thấy ngay trong ngắn hạn.'
    );
  }

  if (found.length === 0) {
    found.push(
      labType === 'concept'
        ? 'Khái niệm này có một ranh giới cố định, không đổi dù đặt trong những tình huống khác nhau.'
        : 'Cùng một tiêu chí đúng/sai có thể áp dụng đồng đều cho mọi hoàn cảnh mà không cần ngoại lệ.'
    );
  }
  return found.slice(0, 2);
}

function buildEverydayExample(message: string, labType: LabType): string {
  const norm = normalizeVietnamese(message);
  if (norm.includes('tu do') || norm.includes('tuy tien') || norm.includes('cong dong')) {
    return 'nếu một người bật loa lớn lúc 2 giờ sáng trong khu trọ, họ đang "làm điều mình thích" nhưng lại tước mất quyền nghỉ ngơi của cả xóm';
  }
  if (norm.includes('cong nghe') || /\bAI\b/.test(message) || norm.includes('tri tue nhan tao')) {
    return 'dùng máy tính bỏ túi giúp học sinh bớt sai phép nhân, nhưng người đó vẫn phải tự hiểu cách lập phương trình';
  }
  if (norm.includes('thuc dung') || norm.includes('hieu qua') || norm.includes('diem')) {
    return 'một môn học giúp rèn cách đọc và đặt câu hỏi có thể chưa ra tiền ngay, nhưng lại quyết định khả năng tự học nhiều năm sau';
  }
  if (norm.includes('ngon ngu') || norm.includes('van hoc') || norm.includes('an du')) {
    return 'cùng một câu "bạn làm nhanh ghê" có thể là lời khen thật lòng hoặc lời châm biếm tùy giọng điệu và bối cảnh';
  }
  return labType === 'concept'
    ? 'cùng một quy tắc trong lớp học đôi khi cần hiểu linh hoạt hơn khi đặt vào hoàn cảnh ngoại lệ'
    : 'một quy định có lợi cho đa số đôi khi lại gây bất công cho một nhóm nhỏ có hoàn cảnh đặc biệt';
}

function buildEvidenceVerification(
  cleanedMessage: string,
  resourceDoc?: LibraryDocument | null,
  attachments?: LabAttachment[]
): EvidenceVerification {
  const norm = normalizeVietnamese(cleanedMessage);
  const hasExplicitEvidenceCue = EVIDENCE_CUES.some((cue) => norm.includes(cue));
  const hasAttachments = Boolean(attachments && attachments.length > 0);
  const groundedClaims: string[] = [];
  const unverifiedClaims: string[] = [];

  if (resourceDoc) {
    groundedClaims.push(`Có điểm tựa đối chiếu từ học liệu AI Library: "${resourceDoc.title}".`);
  }

  if (hasAttachments && attachments) {
    const names = attachments.map((a) => a.name).join(', ');
    groundedClaims.push(`Đã nhận tệp đính kèm làm ngữ cảnh đối chiếu: ${names}.`);
  }

  if (hasExplicitEvidenceCue) {
    groundedClaims.push(
      `Phát biểu có nêu ví dụ/dấu hiệu dẫn chứng cụ thể ("${extractShortSummary(cleanedMessage, 70)}").`
    );
  } else {
    unverifiedClaims.push(
      `Nhận định "${extractShortSummary(cleanedMessage, 75)}" hiện chủ yếu dựa trên quan điểm cá nhân, chưa có số liệu hay nguồn độc lập.`
    );
  }

  if (groundedClaims.length > 0 && unverifiedClaims.length === 0) {
    return {
      status: 'verified',
      groundedClaims,
      unverifiedClaims: [],
      warning: null,
    };
  }

  if (groundedClaims.length > 0) {
    return {
      status: 'partial',
      groundedClaims,
      unverifiedClaims,
      warning:
        'Bạn đã có một phần bối cảnh tài liệu, nhưng nhận định chính vẫn cần thêm 1 dẫn chứng cụ thể hoặc trích dẫn nguồn kiểm chứng được.',
    };
  }

  return {
    status: 'unverified',
    groundedClaims: [],
    unverifiedClaims,
    warning:
      'Chưa phát hiện nguồn tài liệu hay số liệu kiểm chứng trong phát biểu này. Hãy bổ sung 1 ví dụ thực tế hoặc đính kèm tài liệu để lập luận đứng vững hơn.',
  };
}

function buildThinkingTraceMap(
  labType: LabType,
  ledger: LedgerEntry[],
  coreAssumptions: string[],
  resourceDoc?: LibraryDocument | null
): { tldr: string; interpretation: string; guidingQuestion: string; questionHint: string } {
  const userEntries = ledger.filter((e) => e.speaker === 'user');
  const aiEntries = ledger.filter((e) => e.speaker === 'ai');
  const firstClaim = userEntries[0]?.claim || 'Cách hiểu ban đầu bạn đặt ra ở đầu phiên.';
  const latestClaim =
    userEntries.length > 1
      ? userEntries[userEntries.length - 1].claim
      : 'Lập trường đã được làm rõ hơn qua các lượt trao đổi.';
  const keyBoundary =
    coreAssumptions[0] ||
    'Phân biệt giữa phần đã có căn cứ và giả định ngầm phụ thuộc vào bối cảnh thực tế.';
  const counterPoint =
    aiEntries[aiEntries.length - 1]?.claim ||
    'Tình huống biên và góc nhìn trái chiều giúp kiểm thử độ vững của lập luận.';

  if (labType === 'concept') {
    return {
      tldr: `Dưới đây là **Bản đồ truy vết tư duy** tóm tắt bước tiến của bạn qua ${userEntries.length || 1} lượt khám phá khái niệm:`,
      interpretation: [
        `- **Khái niệm ban đầu của bạn:** "${firstClaim}"`,
        `- **Những ranh giới đã làm rõ:** Đã kiểm tra điểm dễ nhầm lẫn (${keyBoundary})${resourceDoc ? ` và đối chiếu với "${resourceDoc.title}"` : ''}.`,
        `- **Định nghĩa sau khi hoàn thiện:** "${latestClaim}"`,
      ].join('\n'),
      guidingQuestion:
        'Nếu phải giải thích lại khái niệm này trong đúng 1 câu ngắn cho một người bạn, bạn sẽ giữ lại điều gì cốt lõi nhất?',
      questionHint: 'Gợi ý: Chốt 1 đặc điểm bản chất nhất kèm ranh giới không thể vượt qua.',
    };
  }

  return {
    tldr: `Dưới đây là **Bản đồ truy vết tư duy** đối chiếu lập trường ban đầu và kết luận sau ${userEntries.length || 1} lượt tranh biện:`,
    interpretation: [
      `- **Lập trường & Luận điểm chính:** Khởi đầu từ "${firstClaim}".`,
      `- **Phản đề đã đối diện:** ${counterPoint}`,
      `- **Bước chuyển trong lập luận:** Tinh chỉnh sang "${latestClaim}" và nhận diện giả định ngầm (${keyBoundary}).`,
      `- **Điểm có thể đào sâu thêm:** Thử tìm 1 dẫn chứng đời thực hoặc nguồn học liệu mới để tiếp tục kiểm chứng.`,
    ].join('\n'),
    guidingQuestion:
      'Nhìn lại chặng đường từ lượt đầu đến bây giờ, lập luận nào khiến bạn thay đổi hoặc củng cố suy nghĩ nhiều nhất?',
    questionHint: 'Gợi ý: Nêu 1 điều bạn đã điều chỉnh và lý do vì sao.',
  };
}

function adaptQuestionForDifficulty(
  baseQuestion: string,
  difficulty: LabDifficultyLevel
): string {
  if (difficulty === 'advanced') {
    return baseQuestion.includes('tiêu chí') || baseQuestion.includes('điều kiện')
      ? baseQuestion
      : `${baseQuestion.replace(/\?$/, '')} — và bạn dựa trên tiêu chí hay nguồn kiểm chứng nào?`;
  }
  return baseQuestion;
}

/**
 * Concise, balanced Vietnamese Socratic local fallback engine:
 * - Produces balanced positivePoints & negativePoints strictly on the user's topic
 * - Performs explicit evidence verification (grounded vs unverified + warning)
 * - Adapts rigor to difficulty (basic / intermediate / advanced)
 * - Ends with exactly 1 focused Socratic question
 */
export function runLocalFallbackEngine(
  payload: LabApiRequestPayload,
  resourceDoc?: LibraryDocument | null
): LabApiResponsePayload {
  const ledger = payload.ledger_snapshot ?? [];
  const history = payload.history ?? [];
  const difficulty: LabDifficultyLevel = payload.difficulty ?? 'intermediate';
  const rawMessage = payload.message.trim();
  const cleanedMessage = stripSpokenVietnameseFillers(rawMessage);
  const nextUserTurn = ledger.filter((l) => l.speaker === 'user').length + 1;
  const userTurnRef = `U#${nextUserTurn}`;

  const absoluteClaims = detectAbsoluteClaims(cleanedMessage);
  const newAssumptions = inferHiddenAssumptions(cleanedMessage, payload.lab_type);
  const { referencedEntry, mentionsContradiction } = detectReferencedPriorTurn(
    cleanedMessage,
    ledger
  );
  const prevUserMessages = history.filter((m) => m.role === 'user');
  const lastPrevUser = prevUserMessages[prevUserMessages.length - 1]?.content ?? '';
  const stuckNow = isStuckMessage(cleanedMessage);
  const stuckTwiceInARow = stuckNow && isStuckMessage(lastPrevUser);
  const summaryRequested = isSummaryRequest(cleanedMessage);

  const userClaimSummary = extractShortSummary(cleanedMessage, 115);
  const everydayExample = buildEverydayExample(cleanedMessage, payload.lab_type);
  const evidenceCheck = buildEvidenceVerification(
    cleanedMessage,
    resourceDoc,
    payload.attachments
  );

  let contradictionNote: string | null = null;
  let contradictionRef: string | null = null;

  if (mentionsContradiction && referencedEntry) {
    contradictionRef = referencedEntry.id;
    contradictionNote = `Đối chiếu ${userTurnRef} với mốc ${referencedEntry.id} ("${extractShortSummary(
      referencedEntry.claim,
      70
    )}").`;
  } else if (absoluteClaims.length > 0 && ledger.length >= 2) {
    const firstUser = ledger.find((e) => e.speaker === 'user');
    if (firstUser) {
      contradictionRef = firstUser.id;
      contradictionNote = `Lượt ${userTurnRef} dùng lối khẳng định tuyệt đối (${absoluteClaims.join(
        ', '
      )}), cần đối chiếu lại giới hạn đặt ra ở ${firstUser.id}.`;
    }
  }

  const attachedNames = (payload.attachments ?? []).map((a) => a.name);
  const factsSummary =
    attachedNames.length > 0
      ? `Đã tiếp nhận tệp đính kèm (${attachedNames.join(', ')})${resourceDoc ? ` cùng học liệu "${resourceDoc.title}"` : ''} để đối chiếu với ý chính ở ${userTurnRef}.`
      : resourceDoc
        ? `Điểm tựa học liệu: "${resourceDoc.title}" (${resourceDoc.author}) đối chiếu cùng lập trường bạn nêu ở ${userTurnRef}.`
        : `Điểm đã có căn cứ: lập trường trực tiếp bạn vừa nêu ở ${userTurnRef} (chưa kèm số liệu hay nguồn kiểm chứng độc lập).`;

  const assumptionsSummary = `Giả định ngầm cần kiểm chứng: ${newAssumptions[0]}`;

  let tldr = '';
  let positivePoints: string[] = [];
  let negativePoints: string[] = [];
  let interpretation = '';
  let guidingQuestion = '';
  let questionHint = '';
  let aiClaimSummary = '';

  if (summaryRequested) {
    const mapData = buildThinkingTraceMap(
      payload.lab_type,
      ledger,
      [...(payload.core_assumptions ?? []), ...newAssumptions],
      resourceDoc
    );
    tldr = mapData.tldr;
    positivePoints = ['Bạn đã theo sát mạch lập luận và đối diện trực tiếp với phản biện qua các lượt.'];
    negativePoints = ['Cần tiếp tục bổ sung dẫn chứng cụ thể cho những kết luận có phạm vi rộng.'];
    interpretation = mapData.interpretation;
    guidingQuestion = mapData.guidingQuestion;
    questionHint = mapData.questionHint;
    aiClaimSummary = 'Tổng kết Bản đồ truy vết tư duy cho toàn bộ phiên học.';
  } else if (stuckTwiceInARow) {
    tldr = 'Dừng lại ở điểm khó này cho thấy bạn đang chạm đúng nút thắt của vấn đề.';
    positivePoints = ['Bạn trung thực nhận diện điểm chưa rõ thay vì đoán mò.'];
    negativePoints = ['Chưa chốt được tiêu chí so sánh giữa hai hướng tiếp cận chính.'];
    interpretation = [
      `- **Phương án A (Ưu tiên cá nhân):** Giữ rộng quyền lựa chọn và chỉ giới hạn khi có bằng chứng gây hại trực tiếp (ví dụ: ${everydayExample}).`,
      `- **Phương án B (Ưu tiên hài hòa chung):** Đặt một bộ quy tắc tối thiểu để quyền của người này không xâm phạm quyền cơ bản của người khác.`,
    ].join('\n');
    guidingQuestion =
      'Giữa **Phương án A** và **Phương án B**, bạn thấy hướng nào thuyết phục hơn và vì sao?';
    questionHint = 'Gợi ý: Chọn A hoặc B rồi nêu 1 lý do gần gũi nhất với bạn.';
    aiClaimSummary = 'Kích hoạt cơ chế gỡ bí với 2 lựa chọn A/B để người học tự phân tích.';
  } else if (stuckNow) {
    tldr = 'Điểm này dễ vướng khi chỉ nhìn ở mức khái niệm trừu tượng.';
    positivePoints = ['Bạn đang dừng lại đúng chỗ cần tách tình huống thực tế.'];
    negativePoints = ['Cần gắn khái niệm với một bối cảnh đời thực để dễ phân tích hơn.'];
    interpretation = `- **Mảnh ghép gợi mở:** Thử thu nhỏ câu chuyện về tình huống cụ thể: ${everydayExample}.`;
    guidingQuestion =
      'Đặt mình vào tình huống đó, bạn sẽ đồng ý hay phản đối dựa trên lý do đầu tiên nào?';
    questionHint = 'Gợi ý: Bắt đầu từ trực giác của bạn rồi nêu 1 lý do ngắn.';
    aiClaimSummary = 'Cung cấp ví dụ đời thường ngắn để gỡ nút thắt.';
  } else if (mentionsContradiction && referencedEntry) {
    tldr = `Mình **thừa nhận** điểm bạn vừa đối chiếu tại mốc **${referencedEntry.id}** — nhận xét đó xác đáng.`;
    positivePoints = [`Bạn theo sát mạch lập luận và chỉ ra đúng điểm cần đối chiếu ở ${referencedEntry.id}.`];
    negativePoints = ['Hai bên vẫn cần xác định rõ điều kiện áp dụng để tránh hiểu rộng quá mức.'];
    interpretation = `- **Điều chỉnh phạm vi:** Cần thu hẹp lại nhận định ở ${referencedEntry.id} theo bối cảnh thực tế thay vì phát biểu chung chung.`;
    guidingQuestion =
      'Sau khi thu hẹp điều kiện như vậy, bạn thấy điểm nào trong lập luận của chúng ta vẫn còn lỗ hổng?';
    questionHint = 'Gợi ý: Chỉ ra 1 ngoại lệ khiến nguyên tắc mới vẫn có thể gãy.';
    aiClaimSummary = `Thừa nhận và điều chỉnh phạm vi lập luận tại mốc ${referencedEntry.id}.`;
  } else if (absoluteClaims.length > 0) {
    const markerLabel = absoluteClaims.map((w) => `"${w}"`).join(', ');
    tldr = `Bạn nêu lập trường dứt khoát ở ${userTurnRef} về **${extractShortSummary(cleanedMessage, 58)}**.`;
    positivePoints = [
      `Lập trường ở ${userTurnRef} rõ ràng, dễ xác định hướng bảo vệ ngay từ đầu.`,
    ];
    negativePoints = [
      `Cách dùng từ tuyệt đối (${markerLabel}) khiến lập luận dễ gãy chỉ cần gặp 1 ngoại lệ thực tế.`,
      evidenceCheck.status === 'unverified'
        ? 'Chưa kèm bằng chứng cụ thể để chứng minh tính đúng đắn trong mọi trường hợp.'
        : 'Cần thu hẹp phạm vi áp dụng cho khớp với dẫn chứng hiện có.',
    ];
    interpretation = `- **Điểm hở do tuyệt đối hóa (${markerLabel}):** Khi khẳng định không chừa ngoại lệ, chỉ cần 1 tình huống ngược lại là lập luận lung lay (ví dụ: ${everydayExample}).`;
    guidingQuestion = adaptQuestionForDifficulty(
      `Nếu bỏ từ ${markerLabel} đi, bạn sẽ thêm **điều kiện cụ thể nào** để lập luận này đứng vững hơn?`,
      difficulty
    );
    questionHint = 'Gợi ý: Dùng mẫu "Điều này đúng trong trường hợp..., trừ khi...".';
    aiClaimSummary = `Chỉ ra điểm hở do khẳng định tuyệt đối (${markerLabel}) kèm phản ví dụ.`;
  } else if (payload.lab_type === 'concept') {
    if (nextUserTurn === 1) {
      tldr = `Cách diễn đạt của bạn đã chạm đúng hạt nhân đầu tiên: **${extractShortSummary(cleanedMessage, 58)}**.`;
      positivePoints = ['Bạn tự diễn đạt khái niệm bằng lời riêng thay vì chép định nghĩa sách giáo khoa.'];
      negativePoints = [
        'Ranh giới giữa khái niệm này với các trường hợp ngoại lệ chưa được nêu rõ.',
      ];
      interpretation = `- **Thử ranh giới bằng tình huống biên:** Hãy đặt cách hiểu này vào đời sống: ${everydayExample}.`;
      guidingQuestion = adaptQuestionForDifficulty(
        'Trong tình huống vừa nêu, cách hiểu ban đầu của bạn vẫn giữ nguyên hay cần thêm ranh giới phân biệt rõ hơn?',
        difficulty
      );
      questionHint = 'Gợi ý: Nêu 1 điều kiện bắt buộc để phân biệt đúng bản chất khái niệm.';
      aiClaimSummary = 'Ghi nhận phần lõi khái niệm và kiểm thử ranh giới bằng phản ví dụ.';
    } else if (nextUserTurn === 2) {
      tldr = 'Bạn đã bắt đầu tách rõ hơn đặc điểm cốt lõi thay vì định nghĩa chung chung.';
      positivePoints = ['Biết bổ sung điều kiện cụ thể để làm rõ phạm vi khái niệm.'];
      negativePoints = [`Vẫn còn giả định ngầm chưa kiểm chứng: ${newAssumptions[0]}`];
      interpretation = `- **Giả định ngầm cần soi kỹ:** Cách hiểu này vẫn đang dựa trên một điều mặc định (${newAssumptions[0]}).`;
      guidingQuestion = adaptQuestionForDifficulty(
        'Nếu đặt khái niệm này cạnh một khái niệm gần nghĩa dễ nhầm, **một dấu hiệu duy nhất** nào giúp bạn phân biệt dứt khoát hai bên?',
        difficulty
      );
      questionHint = 'Gợi ý: So sánh mục đích hoặc hệ quả thực tế của hai khái niệm.';
      aiClaimSummary = 'Soi giả định ngầm và mời phân biệt với khái niệm gần nghĩa.';
    } else {
      tldr = 'Định nghĩa của bạn đã sắc nét và có ranh giới rõ ràng hơn hẳn lượt đầu.';
      positivePoints = ['Định nghĩa nhất quán hơn và đã loại bỏ được nhiều trường hợp mơ hồ.'];
      negativePoints = ['Cần thử áp dụng vào một tình huống mới để chắc chắn không còn điểm hở.'];
      interpretation = `- **Kiểm tra tính nhất quán:** Điều kiện bạn vừa thêm giúp giữ vững bản chất khái niệm khi chuyển sang bối cảnh khác.`;
      guidingQuestion =
        'Bạn có muốn chốt lại định nghĩa hoàn chỉnh trong 1 câu ngắn để mình lập **Bản đồ truy vết tư duy** không?';
      questionHint = 'Gợi ý: Viết lại định nghĩa trọn vẹn hoặc bấm "Tổng kết · Bản đồ tư duy".';
      aiClaimSummary = 'Ghi nhận định nghĩa đã tinh chỉnh và mời chốt Bản đồ truy vết tư duy.';
    }
  } else if (payload.lab_type === 'read') {
    const padded = ` ${cleanedMessage.toLowerCase()} `;
    const matchedAlias = V2_WORK_ALIASES.find((entry) =>
      entry.keys.some((k) => {
        const escKey = k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^\\p{L}])${escKey}(?=$|[^\\p{L}])`, 'u').test(padded);
      })
    );
    const hasPoemBreak = cleanedMessage.includes('\n') && cleanedMessage.split('\n').length >= 3;
    const genreGuess = resourceDoc?.genre || (hasPoemBreak ? 'Thơ' : 'Tác phẩm văn học');
    const devices: string[] = [];
    if (cleanedMessage.includes('?')) devices.push('câu hỏi tu từ');
    if (/\bnhư\b/i.test(cleanedMessage)) devices.push('phép so sánh ("như")');

    tldr = resourceDoc
      ? `Bạn đang đọc **${resourceDoc.title.split(':')[0]}** (${genreGuess}) và bám vào chi tiết: **${extractShortSummary(cleanedMessage, 60)}**.`
      : matchedAlias
        ? `Phát hiện tín hiệu văn bản liên quan mục **${matchedAlias.docId}** (${genreGuess}): "${extractShortSummary(cleanedMessage, 58)}".`
        : `Bạn vừa đưa đoạn văn bản / cảm nhận (${genreGuess}) vào để đọc chậm: "${extractShortSummary(cleanedMessage, 58)}".`;

    positivePoints = [
      'Bạn bắt đầu trực tiếp từ cảm nhận và chi tiết cụ thể thay vì học thuộc văn mẫu.',
      ...(devices.length > 0 ? [`Nhận ra dấu hiệu hình thức đáng chú ý: ${devices.join(', ')}.`] : []),
    ].slice(0, 2);
    negativePoints = [
      devices.length > 0
        ? 'Đừng chỉ gọi tên biện pháp tu từ — cần giải thích nó tạo ra hiệu quả thẩm mĩ và tâm lí gì.'
        : 'Cần trích rõ 2–3 từ ngữ, hình ảnh hoặc chi tiết cụ thể trong văn bản làm điểm tựa diễn giải.',
    ];

    const stepQuestions = [
      'Văn bản thuộc thể loại nào và đặc trưng thể loại ấy gợi ý em nên chú ý yếu tố nào trước tiên (vần nhịp, điểm nhìn, xung đột hay chi tiết)?',
      'Chi tiết, câu thơ hoặc từ ngữ nào khiến em dừng lại lâu nhất và vì sao?',
      'Các chi tiết ấy có lặp lại, đối lập hay biến đổi theo một quy luật nghệ thuật nào không?',
      'Từ quy luật nghệ thuật đó, em diễn giải ý nghĩa chủ đề ra sao và căn cứ nằm ở câu chữ nào?',
      'Hãy tự viết 3–5 câu cảm nhận hoàn chỉnh theo mạch: luận điểm → chi tiết → phân tích → nhận xét.',
    ];

    const stepLabel =
      nextUserTurn <= 1
        ? 'Bước 1/5 (Xác định thể loại)'
        : nextUserTurn === 2
          ? 'Bước 2/5 (Đọc chi tiết)'
          : nextUserTurn === 3
            ? 'Bước 3/5 (Tìm quy luật nghệ thuật)'
            : nextUserTurn === 4
              ? 'Bước 4/5 (Diễn giải có căn cứ)'
              : 'Bước 5/5 (Viết đoạn cảm nhận)';

    interpretation = `- **${stepLabel}:** ${
      devices.length > 0
        ? `Chú ý ${devices.join('; ')} trong đoạn bạn nêu — hãy đặt nó trong mối quan hệ với mạch cảm xúc hoặc tình huống truyện.`
        : 'Đọc văn học bắt đầu từ câu chữ trên trang giấy: khoanh lại 2 từ ngữ hoặc chi tiết lạ nhất trước khi khái quát ý nghĩa.'
    }`;
    guidingQuestion = adaptQuestionForDifficulty(
      resourceDoc?.thinkingQuestions?.[Math.min(nextUserTurn - 1, Math.max(0, (resourceDoc.thinkingQuestions.length || 1) - 1))] ??
        stepQuestions[Math.min(nextUserTurn - 1, 4)],
      difficulty
    );
    questionHint = 'Gợi ý: Trích nguyên 1 cụm từ hoặc chi tiết cụ thể trong văn bản rồi nêu hiệu quả của nó.';
    aiClaimSummary = `Hướng dẫn đọc sâu văn bản (${stepLabel}) theo đặc trưng thể loại.`;
  } else {
    // Debate Lab synchronized with 5 stages
    if (nextUserTurn === 1) {
      tldr = `Bạn chốt được lập trường trực diện về **${extractShortSummary(cleanedMessage, 58)}**.`;
      positivePoints = ['Nêu rõ quan điểm ngay ở lượt đầu, đi thẳng vào trọng tâm chủ đề.'];
      negativePoints = [
        `Đang dựa trên giả định ngầm: ${newAssumptions[0]}`,
        evidenceCheck.status === 'unverified'
          ? 'Chưa đưa dẫn chứng thực tế hoặc nguồn kiểm chứng đi kèm.'
          : 'Cần kết nối chặt hơn giữa dẫn chứng và kết luận.',
      ];
      interpretation = `- **Giả định ngầm cần kiểm tra:** Lập trường này đang mặc định rằng **${newAssumptions[0]}** — nếu tiền đề này thay đổi, kết luận sẽ lung lay.`;
      guidingQuestion = adaptQuestionForDifficulty(
        'Bằng chứng hoặc ví dụ thực tế nào khiến bạn tin tưởng nhất vào lập trường vừa nêu?',
        difficulty
      );
      questionHint = 'Gợi ý: Nêu 1 dẫn chứng cụ thể từ đời sống hoặc tài liệu.';
      aiClaimSummary = 'Ghi nhận lập trường ban đầu, nêu điểm mạnh/yếu và hỏi bằng chứng nền tảng.';
    } else if (nextUserTurn === 2) {
      tldr = 'Lý lẽ bạn vừa bổ sung giúp lập trường có chiều sâu và rõ cơ sở hơn.';
      positivePoints = ['Chủ động củng cố lập luận bằng lý lẽ gắn với chủ đề đang tranh biện.'];
      negativePoints = ['Chưa xét đến tình huống ngoại lệ khi nguyên tắc này va chạm lợi ích khác.'];
      interpretation = `- **Phản ví dụ thử thách:** Hãy đặt lập luận vừa nêu vào tình huống thực tế sau: ${everydayExample}.`;
      guidingQuestion = adaptQuestionForDifficulty(
        'Trước phản ví dụ đó, bạn sẽ bảo vệ quan điểm ban đầu bằng cách nào hay cần điều chỉnh giới hạn của nó?',
        difficulty
      );
      questionHint = 'Gợi ý: Bảo vệ bằng nguyên tắc sâu hơn hoặc thêm ngoại lệ hợp lý.';
      aiClaimSummary = 'Đưa 1 phản ví dụ đời thường sát chủ đề để kiểm thử độ bền lập luận.';
    } else if (nextUserTurn === 3) {
      tldr = 'Bạn đối diện trực diện với phản ví dụ thay vì né tránh — đó là điểm mạnh khi tranh biện.';
      positivePoints = ['Biết tiếp thu phản ví dụ và điều chỉnh lập luận có kiểm soát.'];
      negativePoints = ['Vẫn cần chốt một tiêu chí ranh giới đo lường được thay vì nêu nguyên tắc chung.'];
      interpretation = `- **Điểm cần siết chặt:** Để lập trường không bị phản bác ngược, cần làm rõ **tiêu chí ranh giới** (khi nào áp dụng và khi nào có ngoại lệ).`;
      guidingQuestion = adaptQuestionForDifficulty(
        'Nếu người phản đối hỏi "đâu là giới hạn cụ thể?", bạn sẽ đặt ra **1 tiêu chí rõ ràng** nào?',
        difficulty
      );
      questionHint = 'Gợi ý: Nêu 1 tiêu chí dễ kiểm chứng thay vì nói chung chung.';
      aiClaimSummary = 'Hỗ trợ siết chặt ranh giới và tiêu chí của lập trường.';
    } else {
      tldr = 'Lập luận của bạn qua các lượt đã chuyển từ cảm tính sang có điều kiện và căn cứ rõ ràng hơn.';
      positivePoints = ['Giữ được mạch nhất quán từ U#1 đồng thời biết đặt giới hạn hợp lý.'];
      negativePoints = ['Nên đối chiếu thêm 1 nguồn độc lập nếu muốn mở rộng thành bài nghị luận hoàn chỉnh.'];
      interpretation = `- **Đối chiếu chặng đường:** Bạn đã cân bằng tốt hơn giữa nguyên tắc cốt lõi và ngoại lệ thực tế.`;
      guidingQuestion =
        'Bạn muốn tự chốt kết luận cuối cùng trong 1–2 câu để mình tổng kết so sánh tiến bộ cho phiên tranh biện này chứ?';
      questionHint = 'Gợi ý: Tóm tắt quan điểm sau cùng hoặc yêu cầu tổng kết phiên.';
      aiClaimSummary = 'Ghi nhận bước tiến lập luận và mời rút kết luận cuối.';
    }
  }

  const debateSteps: DebateStepItem[] = [
    {
      key: 'identify',
      title: 'Identify',
      vietnameseTitle: 'Lập trường & khái niệm',
      summary: `Nắm ý cốt lõi ở ${userTurnRef}: "${userClaimSummary}".`,
    },
    {
      key: 'analyze',
      title: 'Analyze',
      vietnameseTitle: 'Giả định & bằng chứng',
      summary: `Kiểm chứng nguồn (${evidenceCheck.status}) và tách giả định ngầm: ${newAssumptions[0]}`,
    },
    {
      key: 'challenge',
      title: 'Challenge',
      vietnameseTitle: 'Phản ví dụ thử thách',
      summary:
        absoluteClaims.length > 0
          ? `Soi điểm hở từ lối khẳng định tuyệt đối (${absoluteClaims.join(', ')}) bằng phản ví dụ thực tế.`
          : `Đưa tình huống thực tế (${extractShortSummary(everydayExample, 70)}) để thử độ bền lập luận.`,
    },
    {
      key: 'synthesize',
      title: 'Synthesize',
      vietnameseTitle: 'Điều chỉnh quan điểm',
      summary: contradictionNote
        ? `Đối chiếu mạch lập luận: ${contradictionNote}`
        : resourceDoc
          ? `Kết nối với học liệu "${resourceDoc.title}" và ${ledger.length} mốc trong Sổ tay.`
          : `Đồng bộ với ${ledger.length} mốc đã ghi trong Sổ tay mạch lập luận.`,
    },
    {
      key: 'respond',
      title: 'Respond',
      vietnameseTitle: 'Tổng kết & gợi mở',
      summary: `Đánh giá cân bằng hai chiều kèm 1 câu hỏi Socrates trọng tâm ở mức ${difficulty}.`,
    },
  ];

  return {
    session_id: payload.session_id,
    lab_type: payload.lab_type,
    response_id: `resp_local_${payload.session_id.slice(0, 8)}_${Date.now().toString(36)}`,
    source_engine: 'local-fallback',
    user_claim_summary: userClaimSummary,
    ai_claim_summary: aiClaimSummary,
    new_assumptions: newAssumptions,
    contradiction_note: contradictionNote,
    contradiction_ref: contradictionRef,
    debate_steps: debateSteps,
    three_layer: {
      tldr,
      positivePoints,
      negativePoints,
      facts: factsSummary,
      assumptions: assumptionsSummary,
      interpretation,
      guidingQuestion,
      questionHint,
      evidenceCheck,
    },
  };
}
