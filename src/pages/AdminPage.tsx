import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Quote,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AdminLibraryConsole } from '../components/admin/AdminLibraryConsole';
import { BrandLogo } from '../components/brand/BrandLogo';
import { WorkspaceShell } from '../components/layout/AppShell';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyStateCard, PageHeader } from '../components/ui/EditorialPrimitives';
import { useToast } from '../components/ui/ToastProvider';
import { LoadingState, Pagination } from '../components/ui/UiControls';
import {
  DailyQuote,
  QUOTE_CATEGORIES,
  QuoteCategory,
} from '../content/verifiedQuotes';
import { useApp } from '../lib/AppContext';
import { matchesVietnameseQuery } from '../lib/vietnamese';

type AdminTab = 'overview' | 'quotes' | 'library' | 'system';

interface AdminAuthStatus {
  configured: boolean;
  source: 'env' | 'unconfigured';
  authenticated: boolean;
}

interface QuoteHistoryItem {
  date: string;
  quoteId: string;
  content: string;
  author: string | null;
  source: string;
  category: QuoteCategory;
}

interface NextQuotePreview {
  nextQuote: DailyQuote | null;
  startsNewCycleTomorrow: boolean;
  remainingInCycle: number;
  cycleNumber: number;
}

interface AdminOverviewData {
  timezone: string;
  todayDate: string;
  nextUpdateAtIso: string;
  aiEngine: string;
  adminAuthSource: string;
  quotesSummary: {
    total: number;
    verified: number;
    unverified: number;
    hidden: number;
    cycleNumber: number;
    remainingInCycle: number;
    displayedDaysCount: number;
    categoriesCount: number;
  };
  todayQuote: DailyQuote;
  nextPreview: NextQuotePreview;
}

interface AdminQuotesData {
  quotes: DailyQuote[];
  history: QuoteHistoryItem[];
  cycleNumber: number;
  remainingInCycle: number;
  todayDate: string;
  todayQuoteId: string | null;
  totalVerified: number;
  totalUnverified: number;
  totalHidden: number;
  nextPreview: NextQuotePreview;
}

const QUOTES_PAGE_SIZE = 10;

/**
 * Protected Admin Panel (/admin):
 * - Enforces real server-side RBAC via HMAC-SHA256 Bearer token held strictly in memory.
 * - Zero fake user statistics or fabricated analytics.
 * - Full Daily Quote Manager (CRUD, duplicate warning, verified gate, history, next-day preview)
 *   + Expanded Library Console (Articles + Categories + Collections) + System overview.
 */
export default function AdminPage() {
  const {
    user,
    documents,
    sessions,
    notes,
    adminSessionToken: adminToken,
    setAdminSessionToken: setAdminToken,
  } = useApp();
  const { showToast } = useToast();

  // Admin auth state — Bearer token stored ONLY in React memory (never localStorage/sessionStorage)
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [quotesData, setQuotesData] = useState<AdminQuotesData | null>(null);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  // Quote manager state
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteCategoryFilter, setQuoteCategoryFilter] = useState<string>('Tất cả');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'hidden'>('all');
  const [quotePage, setQuotePage] = useState(1);

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [qContent, setQContent] = useState('');
  const [qAuthor, setQAuthor] = useState('');
  const [qSource, setQSource] = useState('');
  const [qSourceUrl, setQSourceUrl] = useState('');
  const [qOriginalLang, setQOriginalLang] = useState('');
  const [qOriginalText, setQOriginalText] = useState('');
  const [qCategory, setQCategory] = useState<QuoteCategory>(QUOTE_CATEGORIES[0]);
  const [qVerified, setQVerified] = useState(true);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DailyQuote[]>([]);
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<DailyQuote | null>(null);

  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/status', {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Không thể kiểm tra trạng thái quản trị.');
      const data = (await res.json()) as AdminAuthStatus;
      setAuthStatus(data);
    } catch {
      setAuthStatus({ configured: false, source: 'unconfigured', authenticated: false });
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!adminToken) throw new Error('Phiên đăng nhập quản trị chưa sẵn sàng.');
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          ...(init?.headers ?? {}),
        },
      });
      if (res.status === 401) {
        setAdminToken(null);
        showToast('Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.', { variant: 'warning' });
        throw new Error('Phiên đăng nhập quản trị đã hết hạn.');
      }
      return res;
    },
    [adminToken, showToast]
  );

  const loadAdminData = useCallback(async () => {
    if (!adminToken) return;
    setLoadingAdminData(true);
    try {
      const [ovRes, qRes] = await Promise.all([
        adminFetch('/api/admin/overview', { cache: 'no-store' }),
        adminFetch('/api/admin/quotes', { cache: 'no-store' }),
      ]);
      if (ovRes.ok) {
        setOverview((await ovRes.json()) as AdminOverviewData);
      }
      if (qRes.ok) {
        setQuotesData((await qRes.json()) as AdminQuotesData);
      }
    } catch (err) {
      if (err instanceof Error) {
        showToast(err.message, { variant: 'error' });
      }
    } finally {
      setLoadingAdminData(false);
    }
  }, [adminToken, adminFetch, showToast]);

  useEffect(() => {
    if (adminToken) {
      loadAdminData();
    }
  }, [adminToken, loadAdminData]);

  // Debounced duplicate check while typing quote content
  useEffect(() => {
    if (!adminToken || qContent.trim().length < 10) {
      setDuplicateMatches([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await adminFetch('/api/admin/quotes/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({ content: qContent, excludeId: editingQuoteId ?? undefined }),
        });
        if (res.ok) {
          const data = (await res.json()) as { matches: DailyQuote[] };
          setDuplicateMatches(data.matches ?? []);
        }
      } catch {
        // Ignore transient check errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [adminToken, qContent, editingQuoteId, adminFetch]);

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authStatus?.configured) {
      setAuthError('Cổng quản trị đang tạm khóa vì biến môi trường ADMIN_PASSCODE chưa được thiết lập trên máy chủ.');
      return;
    }

    if (!passcodeInput.trim()) {
      setAuthError('Vui lòng nhập mã quản trị.');
      return;
    }

    setAuthBusy(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !body.token) {
        setAuthError(body.error || 'Xác thực quản trị không thành công.');
        return;
      }
      setAdminToken(body.token);
      setPasscodeInput('');
      setAuthStatus({
        configured: true,
        source: 'env',
        authenticated: true,
      });
      showToast('Đăng nhập bảng quản trị thành công.', { variant: 'success' });
    } catch {
      setAuthError('Không thể kết nối máy chủ xác thực.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminLogout = async () => {
    if (adminToken) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => undefined);
    }
    setAdminToken(null);
    setOverview(null);
    setQuotesData(null);
    showToast('Đã đăng xuất phiên quản trị.', { variant: 'info' });
  };

  // Quote CRUD handlers
  const resetQuoteForm = () => {
    setEditingQuoteId(null);
    setQContent('');
    setQAuthor('');
    setQSource('');
    setQSourceUrl('');
    setQOriginalLang('');
    setQOriginalText('');
    setQCategory(QUOTE_CATEGORIES[0]);
    setQVerified(true);
    setDuplicateMatches([]);
  };

  const loadQuoteForEdit = (q: DailyQuote) => {
    setEditingQuoteId(q.id);
    setQContent(q.content);
    setQAuthor(q.author ?? '');
    setQSource(q.source);
    setQSourceUrl(q.sourceUrl ?? '');
    setQOriginalLang(q.originalLanguage ?? '');
    setQOriginalText(q.originalText ?? '');
    setQCategory(q.category);
    setQVerified(q.verified);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSaving(true);
    try {
      const payload = {
        content: qContent,
        author: qAuthor.trim() ? qAuthor.trim() : null,
        source: qSource,
        sourceUrl: qSourceUrl,
        originalLanguage: qOriginalLang,
        originalText: qOriginalText,
        category: qCategory,
        verified: qVerified,
      };
      const url = editingQuoteId
        ? `/api/admin/quotes/${encodeURIComponent(editingQuoteId)}`
        : '/api/admin/quotes';
      const res = await adminFetch(url, {
        method: editingQuoteId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        duplicateWarning?: boolean;
      };
      if (!res.ok) {
        showToast(data.error || 'Không thể lưu danh ngôn.', { variant: 'error' });
        return;
      }
      showToast(
        editingQuoteId
          ? 'Đã cập nhật danh ngôn thành công.'
          : data.duplicateWarning
            ? 'Đã thêm danh ngôn mới (lưu ý có nội dung gần giống một câu đã tồn tại).'
            : 'Đã thêm danh ngôn mới vào kho hệ thống.',
        { variant: data.duplicateWarning ? 'warning' : 'success' }
      );
      resetQuoteForm();
      await loadAdminData();
    } catch (err) {
      if (err instanceof Error) showToast(err.message, { variant: 'error' });
    } finally {
      setQuoteSaving(false);
    }
  };

  const handleQuickPatchQuote = async (
    quote: DailyQuote,
    patch: { verified?: boolean; hidden?: boolean },
    successMsg: string
  ) => {
    try {
      const res = await adminFetch(`/api/admin/quotes/${encodeURIComponent(quote.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showToast(body.error || 'Không thể cập nhật trạng thái danh ngôn.', { variant: 'error' });
        return;
      }
      showToast(successMsg, { variant: 'success' });
      await loadAdminData();
    } catch (err) {
      if (err instanceof Error) showToast(err.message, { variant: 'error' });
    }
  };

  const confirmDeleteQuote = async () => {
    if (!deleteQuoteTarget) return;
    try {
      const res = await adminFetch(
        `/api/admin/quotes/${encodeURIComponent(deleteQuoteTarget.id)}`,
        { method: 'DELETE' }
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showToast(body.error || 'Không thể xóa danh ngôn.', { variant: 'error' });
      } else {
        showToast('Đã xóa danh ngôn khỏi kho hệ thống.', { variant: 'info' });
        if (editingQuoteId === deleteQuoteTarget.id) resetQuoteForm();
        await loadAdminData();
      }
    } finally {
      setDeleteQuoteTarget(null);
    }
  };

  const filteredQuotes = useMemo(() => {
    const list = quotesData?.quotes ?? [];
    return list.filter((q) => {
      if (quoteCategoryFilter !== 'Tất cả' && q.category !== quoteCategoryFilter) return false;
      if (quoteStatusFilter === 'verified' && (!q.verified || q.hidden)) return false;
      if (quoteStatusFilter === 'unverified' && (q.verified || q.hidden)) return false;
      if (quoteStatusFilter === 'hidden' && !q.hidden) return false;
      if (!quoteSearch.trim()) return true;
      const haystack = `${q.content} ${q.author ?? ''} ${q.source} ${q.category}`;
      return matchesVietnameseQuery(haystack, quoteSearch);
    });
  }, [quotesData?.quotes, quoteCategoryFilter, quoteStatusFilter, quoteSearch]);

  // =========================================================================
  // GATE: Server-Side Admin Authentication Screen
  // =========================================================================
  if (!adminToken) {
    const isLockedUnconfigured = authStatus !== null && !authStatus.configured;

    return (
      <WorkspaceShell>
        <div className="mx-auto max-w-[520px] px-5 sm:px-8 py-12 sm:py-16">
          <div className="rounded-2xl p-7 sm:p-9 surface-card">
            <div className="flex flex-col items-center text-center">
              <BrandLogo size="md" showWordmark={false} />
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                <Lock className="h-3.5 w-3.5" />
                <span>Khu vực quản trị có xác thực máy chủ</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--color-text)]">
                {isLockedUnconfigured
                  ? 'Cổng quản trị đang tạm khóa'
                  : 'Đăng nhập Quản trị Mạch Ngôn'}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {isLockedUnconfigured
                  ? 'Để đảm bảo an toàn, trang Quản trị chỉ mở khi quản trị viên hệ thống đã cấu hình biến môi trường ADMIN_PASSCODE trên máy chủ.'
                  : 'Nhập mã quản trị viên để truy cập bảng điều khiển Danh ngôn hôm nay, Thư viện học liệu và Cài đặt hệ thống.'}
              </p>
            </div>

            {authStatus === null ? (
              <LoadingState compact label="Đang kiểm tra trạng thái xác thực máy chủ…" />
            ) : isLockedUnconfigured ? (
              <div
                role="status"
                className="mt-6 rounded-xl px-4 py-4 text-xs leading-relaxed border text-left space-y-2"
                style={{
                  backgroundColor: 'var(--color-warn-bg)',
                  borderColor: 'var(--color-warn-border)',
                  color: 'var(--color-text)',
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <span>Quyền quản trị chưa được kích hoạt trên môi trường này</span>
                </div>
                <p className="text-[var(--color-text-muted)]">
                  Hệ thống đã vô hiệu hóa việc tạo mật khẩu quản trị từ trình duyệt. Nếu bạn là người vận hành dự án, hãy thiết lập biến môi trường <code className="font-mono">ADMIN_PASSCODE</code> trong cài đặt máy chủ rồi khởi động lại.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAdminAuthSubmit} className="mt-6 space-y-4">
                {authError && (
                  <div
                    role="alert"
                    className="rounded-xl px-4 py-3 text-xs border"
                    style={{
                      backgroundColor: 'var(--color-warn-bg)',
                      borderColor: 'var(--color-warn-border)',
                    }}
                  >
                    {authError}
                  </div>
                )}

                <div>
                  <label htmlFor="admin-passcode" className="block text-xs font-medium mb-1.5">
                    Mã quản trị viên
                  </label>
                  <input
                    id="admin-passcode"
                    type="password"
                    autoComplete="current-password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="••••••••"
                    className="input-editorial"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="btn-primary w-full !min-h-11"
                >
                  <KeyRound className="h-4 w-4" />
                  {authBusy ? 'Đang xác thực…' : 'Xác thực & Đăng nhập'}
                </button>
              </form>
            )}
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  // =========================================================================
  // AUTHENTICATED ADMIN PANEL
  // =========================================================================
  const publishedDocsCount = documents.filter((d) => d.status === 'published').length;
  const draftDocsCount = documents.filter((d) => d.status === 'draft').length;

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-[1260px] px-5 sm:px-8 py-8 lg:py-10 space-y-7">
        <PageHeader
          kicker="Bảng quản trị Mạch Ngôn V1 · Xác thực máy chủ"
          title="Quản trị nội dung & Danh ngôn"
          description="Quản lý kho Danh ngôn hôm nay (múi giờ Asia/Ho_Chi_Minh), biên tập học liệu Library và theo dõi trạng thái thực tế của hệ thống."
          action={
            <button
              type="button"
              onClick={handleAdminLogout}
              className="btn-secondary !min-h-10 !px-4 !text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Khóa phiên quản trị
            </button>
          }
        />

        {/* Admin Section Tabs */}
        <div
          role="tablist"
          aria-label="Phân khu quản trị"
          className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-3"
        >
          {[
            { id: 'overview' as const, label: 'Tổng quan', icon: LayoutDashboard },
            {
              id: 'quotes' as const,
              label: `Quản lý danh ngôn (${quotesData?.quotes.length ?? '…'})`,
              icon: Quote,
            },
            {
              id: 'library' as const,
              label: `Thư viện học liệu (${documents.length})`,
              icon: BookOpen,
            },
            { id: 'system' as const, label: 'Người dùng & Hệ thống', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {loadingAdminData && !overview ? (
          <LoadingState label="Đang tải dữ liệu thực tế từ máy chủ…" />
        ) : null}

        {/* =============================================================== */}
        {/* TAB 1: OVERVIEW (100% Real Server & Library Data — Zero Fake Stats) */}
        {/* =============================================================== */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl p-5 surface-card">
                <div className="text-xs text-[var(--color-text-muted)]">Danh ngôn đã xác minh</div>
                <div className="mt-2 font-display text-3xl font-bold font-mono-num text-[var(--color-primary)]">
                  {overview.quotesSummary.verified}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Chờ duyệt: {overview.quotesSummary.unverified} · Đang ẩn: {overview.quotesSummary.hidden}
                </div>
              </div>

              <div className="rounded-2xl p-5 surface-card">
                <div className="text-xs text-[var(--color-text-muted)]">Chu kỳ Danh ngôn hiện tại</div>
                <div className="mt-2 font-display text-3xl font-bold font-mono-num text-[var(--color-primary)]">
                  #{overview.quotesSummary.cycleNumber}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Còn {overview.quotesSummary.remainingInCycle} câu chưa hiển thị trong chu kỳ
                </div>
              </div>

              <div className="rounded-2xl p-5 surface-card">
                <div className="text-xs text-[var(--color-text-muted)]">Học liệu Library</div>
                <div className="mt-2 font-display text-3xl font-bold font-mono-num text-[var(--color-primary)]">
                  {publishedDocsCount}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Đã xuất bản · {draftDocsCount} bản nháp
                </div>
              </div>

              <div className="rounded-2xl p-5 surface-card">
                <div className="text-xs text-[var(--color-text-muted)]">Động cơ Thinking Lab</div>
                <div className="mt-2 font-display text-lg font-bold text-[var(--color-text)] truncate">
                  {overview.aiEngine === 'openai-responses'
                    ? 'OpenAI Responses'
                    : overview.aiEngine === 'gemini'
                      ? 'Gemini AI'
                      : 'Local Debate Engine'}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Múi giờ: {overview.timezone}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="rounded-2xl p-6 surface-card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                    <Sparkles className="h-4 w-4 text-[var(--color-gold)]" />
                    Danh ngôn đang hiển thị hôm nay ({overview.todayDate})
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    {overview.todayQuote.category}
                  </span>
                </div>
                <blockquote className="font-reading text-base italic leading-relaxed text-[var(--color-text)]">
                  “{overview.todayQuote.content}”
                </blockquote>
                <div className="text-xs text-[var(--color-text-muted)]">
                  — <strong className="text-[var(--color-text)]">{overview.todayQuote.author || overview.todayQuote.source}</strong>
                  {overview.todayQuote.author ? ` · ${overview.todayQuote.source}` : ''}
                </div>
              </section>

              <section className="rounded-2xl p-6 surface-card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                    <Calendar className="h-4 w-4 text-[var(--color-gold)]" />
                    Xem trước danh ngôn ngày tiếp theo
                  </span>
                  <span className="text-[11px] font-mono-num text-[var(--color-text-muted)]">
                    Đổi lúc 00:00 VN
                  </span>
                </div>
                {overview.nextPreview.nextQuote ? (
                  <>
                    <blockquote className="font-reading text-base italic leading-relaxed text-[var(--color-text)]">
                      “{overview.nextPreview.nextQuote.content}”
                    </blockquote>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      —{' '}
                      <strong className="text-[var(--color-text)]">
                        {overview.nextPreview.nextQuote.author || overview.nextPreview.nextQuote.source}
                      </strong>
                      {overview.nextPreview.nextQuote.author
                        ? ` · ${overview.nextPreview.nextQuote.source}`
                        : ''}
                    </div>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                    Hôm nay là danh ngôn cuối cùng của chu kỳ #{overview.nextPreview.cycleNumber}. Vào 00:00 ngày mai (giờ Việt Nam), hệ thống sẽ tự động xáo trộn toàn bộ kho danh ngôn đã xác minh để mở chu kỳ mới không trùng thứ tự cũ.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 2: DAILY QUOTES MANAGER (Full CRUD + Duplicate Check + History) */}
        {/* =============================================================== */}
        {activeTab === 'quotes' && quotesData && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Left: Quote Inventory + Search + Filters + Pagination */}
            <section className="xl:col-span-7 space-y-5">
              <div className="rounded-2xl p-5 sm:p-6 surface-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Kho Danh ngôn hệ thống</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Chỉ danh ngôn có trạng thái “Đã xác minh” mới được xoay vòng hiển thị mỗi ngày.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetQuoteForm}
                    className="btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm câu mới
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <input
                      type="search"
                      value={quoteSearch}
                      onChange={(e) => {
                        setQuoteSearch(e.target.value);
                        setQuotePage(1);
                      }}
                      placeholder="Tìm nội dung, tác giả, nguồn…"
                      className="input-editorial !pl-9 !text-xs"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      aria-label="Lọc theo chủ đề danh ngôn"
                      value={quoteCategoryFilter}
                      onChange={(e) => {
                        setQuoteCategoryFilter(e.target.value);
                        setQuotePage(1);
                      }}
                      className="input-editorial !text-xs"
                    >
                      <option value="Tất cả">Tất cả 10 chủ đề</option>
                      {QUOTE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      aria-label="Lọc theo trạng thái xác minh"
                      value={quoteStatusFilter}
                      onChange={(e) => {
                        setQuoteStatusFilter(
                          e.target.value as 'all' | 'verified' | 'unverified' | 'hidden'
                        );
                        setQuotePage(1);
                      }}
                      className="input-editorial !text-xs"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="verified">Đã xác minh ({quotesData.totalVerified})</option>
                      <option value="unverified">Chờ duyệt ({quotesData.totalUnverified})</option>
                      <option value="hidden">Đang ẩn ({quotesData.totalHidden})</option>
                    </select>
                  </div>
                </div>

                {filteredQuotes.length === 0 ? (
                  <EmptyStateCard
                    compact
                    title="Không tìm thấy danh ngôn phù hợp"
                    description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc chủ đề."
                  />
                ) : (
                  <>
                    <ul className="divide-y divide-[var(--color-border)]">
                      {filteredQuotes
                        .slice((quotePage - 1) * QUOTES_PAGE_SIZE, quotePage * QUOTES_PAGE_SIZE)
                        .map((q) => {
                          const isToday = quotesData.todayQuoteId === q.id;
                          return (
                            <li
                              key={q.id}
                              className="py-4 first:pt-1 last:pb-0 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="font-semibold text-[var(--color-primary)]">
                                    {q.category}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color: q.hidden
                                        ? 'var(--color-text-muted)'
                                        : q.verified
                                          ? 'var(--color-success)'
                                          : 'var(--color-gold)',
                                    }}
                                  >
                                    {q.hidden
                                      ? 'Đang ẩn'
                                      : q.verified
                                        ? 'Đã xác minh'
                                        : 'Chờ xác minh'}
                                  </span>
                                  {isToday && (
                                    <span className="rounded-md bg-[var(--color-primary)] text-[var(--color-on-primary)] px-1.5 py-0.5 text-[10px] font-semibold">
                                      Hôm nay
                                    </span>
                                  )}
                                  {q.displayedDate && !isToday && (
                                    <span className="font-mono-num text-[var(--color-text-muted)]">
                                      · Đã phát {q.displayedDate}
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1.5 font-reading text-sm leading-relaxed text-[var(--color-text)]">
                                  “{q.content}”
                                </p>
                                <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                                  — {q.author || q.source}
                                  {q.author ? ` · ${q.source}` : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  title={q.verified ? 'Bỏ đánh dấu xác minh' : 'Xác minh để đưa vào xoay vòng'}
                                  aria-label={q.verified ? 'Bỏ đánh dấu xác minh danh ngôn' : 'Xác minh danh ngôn'}
                                  onClick={() =>
                                    handleQuickPatchQuote(
                                      q,
                                      { verified: !q.verified },
                                      !q.verified
                                        ? 'Đã xác minh danh ngôn để đưa vào lịch hiển thị.'
                                        : 'Đã chuyển danh ngôn về trạng thái chờ duyệt.'
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors cursor-pointer"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title={q.hidden ? 'Hiện lại danh ngôn' : 'Ẩn danh ngôn khỏi xoay vòng'}
                                  aria-label={q.hidden ? 'Hiện lại danh ngôn' : 'Ẩn danh ngôn'}
                                  onClick={() =>
                                    handleQuickPatchQuote(
                                      q,
                                      { hidden: !q.hidden },
                                      !q.hidden ? 'Đã ẩn danh ngôn.' : 'Đã hiện lại danh ngôn.'
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                >
                                  {q.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  title="Chỉnh sửa danh ngôn"
                                  aria-label="Chỉnh sửa danh ngôn"
                                  onClick={() => loadQuoteForEdit(q)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Xóa danh ngôn"
                                  aria-label="Xóa danh ngôn"
                                  onClick={() => setDeleteQuoteTarget(q)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                    </ul>

                    <Pagination
                      currentPage={quotePage}
                      totalPages={Math.ceil(filteredQuotes.length / QUOTES_PAGE_SIZE)}
                      onPageChange={setQuotePage}
                      className="pt-2"
                    />
                  </>
                )}
              </div>

              {/* Display History by Vietnam Date */}
              <div className="rounded-2xl p-5 sm:p-6 surface-card">
                <h3 className="font-display text-lg font-semibold">
                  Lịch sử hiển thị theo ngày ({quotesData.history.length} ngày)
                </h3>
                <ul className="mt-3 divide-y divide-[var(--color-border)]">
                  {quotesData.history.slice(0, 10).map((item) => (
                    <li key={item.date} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-reading text-sm text-[var(--color-text)] line-clamp-1">
                          “{item.content}”
                        </div>
                        <div className="mt-0.5 text-[var(--color-text-muted)]">
                          {item.author || item.source} · {item.category}
                        </div>
                      </div>
                      <span className="font-mono-num font-semibold text-[var(--color-primary)] shrink-0">
                        {item.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Right: Add / Edit Quote Form */}
            <section className="xl:col-span-5 rounded-2xl p-6 surface-card space-y-4">
              <div className="pb-3 border-b border-[var(--color-border)]">
                <h2 className="font-display text-xl font-semibold">
                  {editingQuoteId ? 'Chỉnh sửa danh ngôn' : 'Thêm danh ngôn mới'}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Bắt buộc ghi rõ nguồn trích dẫn có thật. Với tục ngữ/ca dao, để trống ô Tác giả và ghi “Tục ngữ Việt Nam” ở ô Nguồn.
                </p>
              </div>

              {duplicateMatches.length > 0 && (
                <div
                  role="alert"
                  className="rounded-xl p-3.5 border text-xs flex items-start gap-2.5"
                  style={{
                    backgroundColor: 'var(--color-warn-bg)',
                    borderColor: 'var(--color-warn-border)',
                  }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-gold)]" />
                  <div>
                    <div className="font-semibold">Cảnh báo khả năng trùng lặp ({duplicateMatches.length})</div>
                    <p className="mt-0.5 text-[var(--color-text-muted)] line-clamp-2">
                      Gần giống: “{duplicateMatches[0].content}”
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                <div>
                  <label htmlFor="q-content" className="block text-xs font-medium mb-1.5">
                    Nội dung danh ngôn (tiếng Việt) *
                  </label>
                  <textarea
                    id="q-content"
                    rows={3}
                    required
                    value={qContent}
                    onChange={(e) => setQContent(e.target.value)}
                    placeholder="Nhập chính xác nội dung câu danh ngôn hoặc tục ngữ..."
                    className="textarea-editorial"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="q-author" className="block text-xs font-medium mb-1.5">
                      Tác giả (để trống nếu là tục ngữ)
                    </label>
                    <input
                      id="q-author"
                      type="text"
                      value={qAuthor}
                      onChange={(e) => setQAuthor(e.target.value)}
                      placeholder="Ví dụ: Khổng Tử, Nam Cao"
                      className="input-editorial"
                    />
                  </div>
                  <div>
                    <label htmlFor="q-category" className="block text-xs font-medium mb-1.5">
                      Chủ đề *
                    </label>
                    <select
                      id="q-category"
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value as QuoteCategory)}
                      className="input-editorial"
                    >
                      {QUOTE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="q-source" className="block text-xs font-medium mb-1.5">
                    Nguồn trích dẫn / Tác phẩm *
                  </label>
                  <input
                    id="q-source"
                    type="text"
                    required
                    value={qSource}
                    onChange={(e) => setQSource(e.target.value)}
                    placeholder="Ví dụ: Luận Ngữ (2.15) hoặc Tục ngữ Việt Nam"
                    className="input-editorial"
                  />
                </div>

                <div>
                  <label htmlFor="q-source-url" className="block text-xs font-medium mb-1.5">
                    Liên kết nguồn đối chiếu (http/https, tùy chọn)
                  </label>
                  <input
                    id="q-source-url"
                    type="url"
                    value={qSourceUrl}
                    onChange={(e) => setQSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="input-editorial"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="q-orig-lang" className="block text-xs font-medium mb-1.5">
                      Ngôn ngữ gốc (tùy chọn)
                    </label>
                    <input
                      id="q-orig-lang"
                      type="text"
                      value={qOriginalLang}
                      onChange={(e) => setQOriginalLang(e.target.value)}
                      placeholder="Latin, Tiếng Pháp, Hán cổ..."
                      className="input-editorial"
                    />
                  </div>
                  <div>
                    <label htmlFor="q-orig-text" className="block text-xs font-medium mb-1.5">
                      Nguyên văn gốc (tùy chọn)
                    </label>
                    <input
                      id="q-orig-text"
                      type="text"
                      value={qOriginalText}
                      onChange={(e) => setQOriginalText(e.target.value)}
                      placeholder="Bản gốc nếu có"
                      className="input-editorial"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[var(--color-text)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={qVerified}
                    onChange={(e) => setQVerified(e.target.checked)}
                    className="mt-0.5 accent-[var(--color-primary)]"
                  />
                  <span>
                    <strong>Đã xác minh nguồn trích dẫn (verified: true)</strong> — cho phép đưa vào hệ thống xoay vòng mỗi ngày.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  {editingQuoteId && (
                    <button
                      type="button"
                      onClick={resetQuoteForm}
                      className="btn-secondary !min-h-10 !px-4 !text-xs"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={quoteSaving}
                    className="btn-primary !min-h-10 !px-5 !text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {quoteSaving
                      ? 'Đang lưu…'
                      : editingQuoteId
                        ? 'Cập nhật danh ngôn'
                        : 'Lưu vào kho danh ngôn'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 3: EXPANDED LIBRARY CONSOLE (Articles, Categories, Collections) */}
        {/* =============================================================== */}
        {activeTab === 'library' && <AdminLibraryConsole />}

        {/* =============================================================== */}
        {/* TAB 4: USERS & SYSTEM CONFIGURATION (Honest Architecture View)  */}
        {/* =============================================================== */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-2xl p-6 surface-card space-y-4">
              <h2 className="font-display text-xl font-semibold">Phiên người học hiện tại</h2>
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                Mạch Ngôn V1 không hiển thị số liệu người dùng ảo. Dưới đây là thông tin phiên học tập thực tế trên trình duyệt hiện tại:
              </p>
              <dl className="divide-y divide-[var(--color-border)] text-xs">
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Tên hiển thị</dt>
                  <dd className="font-semibold text-[var(--color-text)]">{user.name}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Email phiên</dt>
                  <dd className="font-mono-num text-[var(--color-text)]">{user.email}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Phiên Thinking Lab cục bộ</dt>
                  <dd className="font-mono-num font-semibold text-[var(--color-text)]">{sessions.length}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Ghi chú đọc chậm cục bộ</dt>
                  <dd className="font-mono-num font-semibold text-[var(--color-text)]">{notes.length}</dd>
                </div>
              </dl>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
                Để quản lý danh sách nhiều tài khoản học viên tập trung qua nhiều thiết bị, có thể kết nối thêm cơ sở dữ liệu đám mây (Firestore hoặc PostgreSQL) ở giai đoạn triển khai mở rộng.
              </div>
            </section>

            <section className="rounded-2xl p-6 surface-card space-y-4">
              <h2 className="font-display text-xl font-semibold">Cấu hình máy chủ & Bảo mật</h2>
              <dl className="divide-y divide-[var(--color-border)] text-xs">
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Nguồn xác thực quản trị</dt>
                  <dd className="font-semibold text-[var(--color-text)]">
                    {overview?.adminAuthSource === 'env'
                      ? 'Biến môi trường ADMIN_PASSCODE'
                      : 'Mã bảo vệ thiết lập lần đầu (băm scrypt trên máy chủ)'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Lưu trữ khóa phiên Admin</dt>
                  <dd className="font-semibold text-[var(--color-text)]">
                    Chỉ trong bộ nhớ RAM trình duyệt (Bearer HMAC-SHA256)
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Múi giờ Danh ngôn hôm nay</dt>
                  <dd className="font-mono-num text-[var(--color-text)]">
                    {overview?.timezone || 'Asia/Ho_Chi_Minh'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-3">
                  <dt className="text-[var(--color-text-muted)]">Chống lặp danh ngôn</dt>
                  <dd className="text-[var(--color-text)]">
                    Khóa tuần tự & ghi tệp nguyên tử trên máy chủ
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        )}
      </div>

      {/* Confirm Delete Quote Modal */}
      <ConfirmModal
        open={Boolean(deleteQuoteTarget)}
        destructive
        title="Xóa danh ngôn khỏi hệ thống?"
        description={
          deleteQuoteTarget
            ? `Bạn chắc chắn muốn xóa câu “${deleteQuoteTarget.content}”? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa vĩnh viễn"
        onCancel={() => setDeleteQuoteTarget(null)}
        onConfirm={confirmDeleteQuote}
      />
    </WorkspaceShell>
  );
}
