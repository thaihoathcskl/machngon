import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  FileDown,
  FileText,
  Printer,
  Scale,
  Search,
  Trash2,
} from 'lucide-react';
import { SessionReportModal } from '../components/lab/SessionReportModal';
import { WorkspaceShell } from '../components/layout/AppShell';
import { EmptyStateCard, PageHeader } from '../components/ui/EditorialPrimitives';
import { useToast } from '../components/ui/ToastProvider';
import {
  buildSessionReport,
  formatSessionReportMarkdown,
  getLabTypeDisplayLabel,
} from '../lib/ai/sessionReport';
import { useApp } from '../lib/AppContext';
import { Link } from '../lib/router';
import type { LabSession } from '../lib/types';
import { matchesVietnameseQuery } from '../lib/vietnamese';

export function HistoryPage() {
  const { sessions, deleteSession, documents } = useApp();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'concept' | 'debate' | 'read'>('all');
  const [reportSession, setReportSession] = useState<LabSession | null>(null);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (modeFilter !== 'all' && s.labType !== modeFilter) return false;
      if (!query.trim()) return true;
      const haystack = `${s.title} ${s.ledger.map((l) => l.claim).join(' ')}`;
      return matchesVietnameseQuery(haystack, query);
    });
  }, [sessions, modeFilter, query]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handleExportMarkdown = (session: LabSession) => {
    const linkedDoc = session.resourceContextId
      ? documents.find((d) => d.id === session.resourceContextId) ?? null
      : null;
    const report = buildSessionReport(session, linkedDoc);
    const markdown = formatSessionReportMarkdown(report);
    const slug = report.title
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u1EF9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const filename = `mach-ngon-session-${slug || session.id}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo Markdown "${filename}".`, { variant: 'success' });
  };

  const handlePrintSession = (session: LabSession) => {
    setReportSession(session);
    window.setTimeout(() => {
      window.print();
    }, 260);
  };

  const reportLinkedDoc = reportSession?.resourceContextId
    ? documents.find((d) => d.id === reportSession.resourceContextId) ?? null
    : null;

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-[1040px] px-5 sm:px-8 py-8 lg:py-10 space-y-7">
        <PageHeader
          kicker="Lưu trữ đối thoại học thuật"
          title="Lịch sử"
          description="Xem lại, xuất báo cáo Markdown (.md) hoặc in PDF các phiên Concept Lab và Debate Lab kèm toàn bộ Sổ tay mạch lập luận."
          action={
            <Link to="/lab" className="btn-primary !min-h-10 !text-sm no-print">
              Bắt đầu phiên mới
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 no-print">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="history-search" className="sr-only">
              Tìm kiếm trong lịch sử phiên tư duy
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              id="history-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo chủ đề hoặc luận điểm..."
              className="input-editorial !pl-10"
            />
          </div>

          <div
            role="group"
            aria-label="Lọc theo chế độ Lab"
            className="inline-flex rounded-xl p-1 border border-[var(--color-border)] bg-[var(--color-surface)] self-start"
          >
            {(
              [
                ['all', 'Tất cả'],
                ['debate', 'Debate Lab'],
                ['concept', 'Concept Lab'],
                ['read', 'Đọc văn học'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setModeFilter(val)}
                aria-pressed={modeFilter === val}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  modeFilter === val
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        {filtered.length === 0 ? (
          <EmptyStateCard
            title="Chưa có phiên tư duy nào phù hợp"
            description="Các cuộc trao đổi trong Concept Lab và Debate Lab sẽ tự động lưu lại tại đây để bạn tiếp tục đối chiếu bất cứ lúc nào."
            action={
              <Link to="/lab" className="btn-primary">
                Mở Thinking Lab
              </Link>
            }
          />
        ) : (
          <div className="space-y-3.5">
            {filtered.map((session) => {
              const linkedDoc = session.resourceContextId
                ? documents.find((d) => d.id === session.resourceContextId)
                : null;
              return (
                <article
                  key={session.id}
                  className="rounded-2xl p-5 sm:p-6 surface-card surface-card-interactive flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-primary)]">
                        {session.labType === 'concept' ? (
                          <BrainCircuit className="h-3.5 w-3.5" />
                        ) : session.labType === 'read' ? (
                          <BookOpen className="h-3.5 w-3.5" />
                        ) : (
                          <Scale className="h-3.5 w-3.5" />
                        )}
                        {getLabTypeDisplayLabel(session.labType)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{session.messages.length} lượt trao đổi</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{session.ledger.length} mốc Sổ tay</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{formatDate(session.updatedAt)}</span>
                    </div>

                    <h2 className="font-display text-lg sm:text-xl font-semibold leading-snug text-[var(--color-text)]">
                      {session.title}
                    </h2>

                    {linkedDoc && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        Tài liệu đính kèm: {linkedDoc.title}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
                    <button
                      type="button"
                      onClick={() => setReportSession(session)}
                      className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
                      aria-label={`Xem báo cáo phiên ${session.title}`}
                    >
                      <FileText className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      Báo cáo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportMarkdown(session)}
                      className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
                      aria-label={`Xuất Markdown phiên ${session.title}`}
                    >
                      <FileDown className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      Xuất .md
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintSession(session)}
                      className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
                      aria-label={`In hoặc lưu PDF phiên ${session.title}`}
                    >
                      <Printer className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      In / PDF
                    </button>
                    <Link
                      to={`/lab?session=${encodeURIComponent(session.id)}`}
                      className="btn-primary !min-h-9 !px-4 !py-1.5 !text-xs"
                    >
                      Mở tiếp phiên
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSession(session.id);
                        showToast('Đã xóa phiên khỏi lịch sử cục bộ.', { variant: 'info' });
                      }}
                      aria-label={`Xóa phiên ${session.title}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/45 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {reportSession && (
        <SessionReportModal
          open={Boolean(reportSession)}
          onClose={() => setReportSession(null)}
          session={reportSession}
          attachedResource={reportLinkedDoc}
          onNotify={(msg, variant) => showToast(msg, { variant: variant ?? 'info' })}
        />
      )}
    </WorkspaceShell>
  );
}

