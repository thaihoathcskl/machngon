import { getLabDifficultyLabel } from '../library/validation.ts';
import type {
  EvidenceVerificationStatus,
  LabSession,
  LibraryDocument,
  SessionReportData,
} from '../types.ts';

function pushUnique(target: string[], candidate?: string | null) {
  const clean = (candidate || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const key = clean.toLowerCase();
  if (!target.some((item) => item.toLowerCase() === key)) {
    target.push(clean);
  }
}

export function buildSessionReport(
  session: LabSession,
  attachedResource?: LibraryDocument | null
): SessionReportData {
  const userMessages = session.messages.filter((m) => m.role === 'user');
  const aiMessages = session.messages.filter((m) => m.role === 'assistant');

  const attachedFileNames: string[] = [];
  for (const msg of userMessages) {
    for (const att of msg.attachments ?? []) {
      pushUnique(attachedFileNames, att.name);
    }
  }

  const keyArguments = session.ledger.map((entry) => ({
    ref: entry.id,
    speaker: entry.speaker,
    claim: entry.claim,
    contradictionFlag: entry.contradictionFlag,
  }));

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const coreQuestions: Array<{ turnRef: string; question: string }> = [];

  let verifiedCount = 0;
  let partialCount = 0;
  let unverifiedCount = 0;
  const groundedClaims: string[] = [];
  const unverifiedClaims: string[] = [];
  const warnings: string[] = [];

  for (const msg of aiMessages) {
    const tl = msg.threeLayer;
    if (!tl) continue;

    if (Array.isArray(tl.positivePoints) && tl.positivePoints.length > 0) {
      for (const p of tl.positivePoints) {
        pushUnique(strengths, p);
      }
    } else if (tl.tldr) {
      pushUnique(strengths, tl.tldr);
    }

    if (Array.isArray(tl.negativePoints) && tl.negativePoints.length > 0) {
      for (const n of tl.negativePoints) {
        pushUnique(weaknesses, n);
      }
    } else if (tl.interpretation) {
      const firstLine = tl.interpretation
        .split(/\n+/)
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .find(Boolean);
      pushUnique(weaknesses, firstLine);
    }

    if (tl.assumptions) {
      pushUnique(weaknesses, tl.assumptions);
    }

    if (tl.guidingQuestion?.trim()) {
      coreQuestions.push({
        turnRef: msg.turnRef || 'A#?',
        question: tl.guidingQuestion.replace(/\*\*/g, '').trim(),
      });
    }

    if (tl.evidenceCheck) {
      if (tl.evidenceCheck.status === 'verified') verifiedCount += 1;
      else if (tl.evidenceCheck.status === 'partial') partialCount += 1;
      else unverifiedCount += 1;

      for (const g of tl.evidenceCheck.groundedClaims ?? []) {
        pushUnique(groundedClaims, g);
      }
      for (const u of tl.evidenceCheck.unverifiedClaims ?? []) {
        pushUnique(unverifiedClaims, u);
      }
      if (tl.evidenceCheck.warning) {
        pushUnique(warnings, tl.evidenceCheck.warning);
      }
    } else if (tl.facts) {
      partialCount += 1;
      pushUnique(groundedClaims, tl.facts);
    }
  }

  for (const c of session.contradictions) {
    pushUnique(weaknesses, `Mâu thuẫn cần đối chiếu (${c.refA} ↔ ${c.refB}): ${c.note}`);
  }

  let overallStatus: EvidenceVerificationStatus = 'unverified';
  if (verifiedCount > 0 && unverifiedCount === 0 && partialCount === 0) {
    overallStatus = 'verified';
  } else if (verifiedCount > 0 || partialCount > 0 || groundedClaims.length > 0) {
    overallStatus = unverifiedCount > verifiedCount ? 'partial' : 'partial';
    if (verifiedCount > 0 && unverifiedCount === 0) {
      overallStatus = 'verified';
    }
  }

  if (warnings.length === 0 && overallStatus !== 'verified' && userMessages.length > 0) {
    warnings.push(
      'Một số luận điểm trong phiên vẫn dựa trên lập luận chủ quan hoặc chưa đính kèm dẫn chứng/nguồn kiểm chứng cụ thể.'
    );
  }

  return {
    sessionId: session.id,
    title: session.title,
    labType: session.labType,
    difficultyLabel: getLabDifficultyLabel(session.difficulty),
    generatedAtIso: new Date().toISOString(),
    userTurnsCount: userMessages.length,
    aiTurnsCount: aiMessages.length,
    attachedResourceTitle: attachedResource?.title ?? null,
    attachedFileNames,
    keyArguments,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
    coreAssumptions: session.coreAssumptions.slice(0, 8),
    coreQuestions: coreQuestions.slice(-6),
    evidenceSummary: {
      overallStatus,
      verifiedCount,
      partialCount,
      unverifiedCount,
      groundedClaims: groundedClaims.slice(0, 8),
      unverifiedClaims: unverifiedClaims.slice(0, 8),
      warnings: warnings.slice(0, 4),
    },
  };
}

export function getEvidenceStatusLabel(status: EvidenceVerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Có dẫn chứng / khớp tài liệu';
    case 'partial':
      return 'Có một phần căn cứ — cần bổ sung nguồn';
    case 'unverified':
    default:
      return 'Chưa có nguồn xác thực';
  }
}

export function getLabTypeDisplayLabel(labType: LabSession['labType']): string {
  switch (labType) {
    case 'concept':
      return 'Concept Lab';
    case 'read':
      return 'Đọc văn bản văn học';
    case 'annotate':
      return 'Soi lập luận (Toulmin)';
    case 'grade':
      return 'Chấm theo tiêu chí';
    case 'debate':
    default:
      return 'Debate Lab';
  }
}

export function formatSessionReportMarkdown(report: SessionReportData): string {
  const modeLabel = getLabTypeDisplayLabel(report.labType);
  const lines: string[] = [
    `# BÁO CÁO PHIÊN ${modeLabel.toUpperCase()} — MẠCH NGÔN`,
    '',
    `- **Chủ đề:** ${report.title}`,
    `- **Chế độ:** ${modeLabel}`,
    `- **Cấp độ tư duy:** ${report.difficultyLabel}`,
    `- **Số lượt trao đổi:** ${report.userTurnsCount} lượt của bạn · ${report.aiTurnsCount} lượt phản hồi AI`,
  ];

  if (report.attachedResourceTitle) {
    lines.push(`- **Học liệu AI Library đính kèm:** ${report.attachedResourceTitle}`);
  }
  if (report.attachedFileNames.length > 0) {
    lines.push(`- **Tệp đính kèm trong phiên:** ${report.attachedFileNames.join(', ')}`);
  }

  lines.push('', '## 1. Tổng hợp mạch luận điểm');
  if (report.keyArguments.length === 0) {
    lines.push('- Chưa có luận điểm nào được ghi nhận.');
  } else {
    for (const arg of report.keyArguments) {
      const speakerLabel = arg.speaker === 'user' ? 'Bạn' : 'AI Mạch Ngôn';
      const flag = arg.contradictionFlag ? ` *(Lưu ý đối chiếu: ${arg.contradictionFlag})*` : '';
      lines.push(`- **${arg.ref} (${speakerLabel}):** ${arg.claim}${flag}`);
    }
  }

  lines.push('', '## 2. Điểm mạnh / Điểm tích cực');
  if (report.strengths.length === 0) {
    lines.push('- Chưa có dữ liệu điểm mạnh.');
  } else {
    for (const s of report.strengths) {
      lines.push(`- ${s}`);
    }
  }

  lines.push('', '## 3. Điểm yếu, lỗ hổng & giả định ngầm');
  if (report.weaknesses.length === 0 && report.coreAssumptions.length === 0) {
    lines.push('- Chưa ghi nhận lỗ hổng hoặc giả định ngầm.');
  } else {
    for (const w of report.weaknesses) {
      lines.push(`- ${w}`);
    }
    for (const a of report.coreAssumptions) {
      lines.push(`- *Giả định ngầm:* ${a}`);
    }
  }

  lines.push('', '## 4. Các câu hỏi trọng tâm (Socrates)');
  if (report.coreQuestions.length === 0) {
    lines.push('- Chưa có câu hỏi trọng tâm.');
  } else {
    for (const q of report.coreQuestions) {
      lines.push(`- **${q.turnRef}:** ${q.question}`);
    }
  }

  lines.push('', '## 5. Kiểm tra dẫn chứng & trạng thái nguồn');
  lines.push(`- **Đánh giá chung:** ${getEvidenceStatusLabel(report.evidenceSummary.overallStatus)}`);
  lines.push(
    `- **Thống kê lượt phản hồi:** ${report.evidenceSummary.verifiedCount} có dẫn chứng · ${report.evidenceSummary.partialCount} có một phần · ${report.evidenceSummary.unverifiedCount} chưa có nguồn`
  );

  if (report.evidenceSummary.groundedClaims.length > 0) {
    lines.push('- **Ý đã có căn cứ / khớp tài liệu:**');
    for (const g of report.evidenceSummary.groundedClaims) {
      lines.push(`  - ${g}`);
    }
  }

  if (report.evidenceSummary.unverifiedClaims.length > 0) {
    lines.push('- **Ý chưa có nguồn xác thực:**');
    for (const u of report.evidenceSummary.unverifiedClaims) {
      lines.push(`  - ${u}`);
    }
  }

  if (report.evidenceSummary.warnings.length > 0) {
    lines.push('- **Cảnh báo kiểm chứng:**');
    for (const warn of report.evidenceSummary.warnings) {
      lines.push(`  - ⚠ ${warn}`);
    }
  }

  return lines.join('\n');
}
