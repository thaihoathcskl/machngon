import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Scale,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  buildSessionReport,
  formatSessionReportMarkdown,
  getEvidenceStatusLabel,
  getLabTypeDisplayLabel,
} from '../../lib/ai/sessionReport';
import type { LabSession, LibraryDocument } from '../../lib/types';

interface SessionReportModalProps {
  open: boolean;
  onClose: () => void;
  session: LabSession;
  attachedResource?: LibraryDocument | null;
  onNotify?: (message: string, variant?: 'info' | 'warning' | 'error') => void;
}

export function SessionReportModal({
  open,
  onClose,
  session,
  attachedResource,
  onNotify,
}: SessionReportModalProps) {
  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () => buildSessionReport(session, attachedResource),
    [session, attachedResource]
  );

  const markdown = useMemo(() => formatSessionReportMarkdown(report), [report]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      onNotify?.('Đã sao chép báo cáo phiên sang bộ nhớ tạm.', 'info');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify?.('Không thể sao chép tự động. Bạn có thể tải tệp .md thay thế.', 'warning');
    }
  };

  const handleDownload = () => {
    const slug = report.title
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const filename = `mach-ngon-report-${slug || report.sessionId}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất báo cáo "${filename}".`, 'info');
  };

  const evidenceStatus = report.evidenceSummary.overallStatus;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-report-title"
          data-testid="session-report-modal"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-3xl max-h-[88dvh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>Báo cáo tổng hợp phiên {getLabTypeDisplayLabel(report.labType)}</span>
                </div>
                <h2
                  id="session-report-title"
                  className="mt-0.5 font-display text-lg sm:text-xl font-bold text-[var(--color-text)] truncate"
                >
                  {report.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  data-testid="report-copy-btn"
                  className="btn-secondary !min-h-9 !px-3 !text-xs whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Sao chép
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  data-testid="report-export-btn"
                  className="btn-primary !min-h-9 !px-3.5 !text-xs whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Xuất .md
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng báo cáo"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
              {/* Metadata summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3.5 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)] block">Cấp độ</span>
                  <strong className="text-[var(--color-text)] font-semibold">
                    {report.difficultyLabel}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block">Lượt trao đổi</span>
                  <strong className="font-mono-num text-[var(--color-text)] font-semibold">
                    {report.userTurnsCount} bạn · {report.aiTurnsCount} AI
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block">Tệp đính kèm</span>
                  <strong className="font-mono-num text-[var(--color-text)] font-semibold">
                    {report.attachedFileNames.length > 0
                      ? `${report.attachedFileNames.length} tệp`
                      : 'Không có'}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block">Dẫn chứng & nguồn</span>
                  <strong className="text-[var(--color-primary)] font-semibold">
                    {evidenceStatus === 'verified'
                      ? 'Đã kiểm chứng'
                      : evidenceStatus === 'partial'
                        ? 'Một phần căn cứ'
                        : 'Thiếu nguồn'}
                  </strong>
                </div>
              </div>

              {report.userTurnsCount === 0 ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-6 text-center space-y-2">
                  <p className="font-display text-base font-semibold text-[var(--color-text)]">
                    Phiên chưa có lượt trao đổi nào
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
                    Hãy gửi ít nhất 1 quan điểm hoặc câu hỏi trong AI Labs để hệ thống tổng hợp mạch luận điểm, điểm mạnh/yếu, câu hỏi trọng tâm và trạng thái dẫn chứng.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Key Arguments */}
                  <section className="space-y-2.5">
                    <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[var(--color-text)]">
                      <Scale className="h-4 w-4 text-[var(--color-primary)]" />
                      1. Mạch luận điểm chính
                    </h3>
                    <div className="space-y-2">
                      {report.keyArguments.map((arg) => (
                        <div
                          key={arg.ref}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/45 px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono-num text-[11px] font-semibold text-[var(--color-primary)]">
                              {arg.ref}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                              {arg.speaker === 'user' ? 'Bạn' : 'Trợ lý Mạch Ngôn'}
                            </span>
                          </div>
                          <p className="text-[var(--color-text)]">{arg.claim}</p>
                          {arg.contradictionFlag && (
                            <p className="mt-1 text-xs text-[var(--color-gold)]">
                              Lưu ý đối chiếu: {arg.contradictionFlag}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 2. Strengths & Weaknesses Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/45 p-4 space-y-2.5">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        2. Điểm mạnh / Điểm tích cực
                      </h3>
                      {report.strengths.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)]">Chưa có ghi nhận.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--color-text)] list-disc pl-4">
                          {report.strengths.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/45 p-4 space-y-2.5">
                      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-gold)]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        3. Điểm yếu &amp; giả định cần kiểm tra
                      </h3>
                      {report.weaknesses.length === 0 && report.coreAssumptions.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)]">Chưa ghi nhận điểm yếu.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--color-text)] list-disc pl-4">
                          {report.weaknesses.map((item, idx) => (
                            <li key={`w-${idx}`}>{item}</li>
                          ))}
                          {report.coreAssumptions.map((item, idx) => (
                            <li key={`a-${idx}`} className="text-[var(--color-text-muted)]">
                              <strong className="text-[var(--color-text)]">Giả định ngầm:</strong> {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>

                  {/* 4. Core Socratic Questions */}
                  <section className="space-y-2.5">
                    <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[var(--color-text)]">
                      <HelpCircle className="h-4 w-4 text-[var(--color-primary)]" />
                      4. Câu hỏi trọng tâm (Socrates)
                    </h3>
                    {report.coreQuestions.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)]">Chưa có câu hỏi trọng tâm.</p>
                    ) : (
                      <div className="space-y-2">
                        {report.coreQuestions.map((q, idx) => (
                          <div
                            key={`${q.turnRef}-${idx}`}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs sm:text-sm"
                          >
                            <span className="font-mono-num text-[11px] font-semibold text-[var(--color-primary)] mr-2">
                              {q.turnRef}
                            </span>
                            <span className="font-reading font-medium text-[var(--color-text)]">
                              {q.question}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* 5. Evidence Verification Status */}
                  <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[var(--color-text)]">
                        {evidenceStatus === 'verified' ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-[var(--color-gold)]" />
                        )}
                        5. Trạng thái dẫn chứng &amp; kiểm chứng nguồn
                      </h3>
                      <span className="text-xs font-semibold text-[var(--color-primary)]">
                        {getEvidenceStatusLabel(evidenceStatus)}
                      </span>
                    </div>

                    {report.evidenceSummary.groundedClaims.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          Đã có dẫn chứng / khớp tài liệu
                        </p>
                        <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-text)] list-disc pl-4">
                          {report.evidenceSummary.groundedClaims.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.evidenceSummary.unverifiedClaims.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-gold)]">
                          Chưa có nguồn xác thực / cần bổ sung bằng chứng
                        </p>
                        <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-text-muted)] list-disc pl-4">
                          {report.evidenceSummary.unverifiedClaims.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.evidenceSummary.warnings.length > 0 && (
                      <div
                        className="rounded-lg border px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text)]"
                        style={{
                          backgroundColor: 'var(--color-warn-bg)',
                          borderColor: 'var(--color-warn-border)',
                        }}
                      >
                        {report.evidenceSummary.warnings.map((w, idx) => (
                          <p key={idx}>{w}</p>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
