import React, { useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Compass,
  FileEdit,
  History,
  Home,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Palette,
  Settings,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../lib/AppContext';
import { Link, useRouter } from '../../lib/router';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { BrandLogo } from '../brand/BrandLogo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
  group: 'primary' | 'personal';
}

const WORKSPACE_NAV: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: Home, group: 'primary' },
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, group: 'primary' },
  { to: '/library', label: 'AI Library', icon: BookOpen, matchPrefix: true, group: 'primary' },
  { to: '/glossary', label: 'Thuật ngữ', icon: BookMarked, group: 'primary' },
  { to: '/lab', label: 'AI Labs', icon: MessageSquareText, matchPrefix: true, group: 'primary' },
  { to: '/guide', label: 'Hướng dẫn', icon: Compass, group: 'personal' },
  { to: '/history', label: 'Lịch sử', icon: History, group: 'personal' },
  { to: '/profile', label: 'Hồ sơ & Cài đặt', icon: Settings, group: 'personal' },
  { to: '/admin', label: 'Quản trị nội dung', icon: FileEdit, group: 'personal' },
];

const MOBILE_BOTTOM_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, group: 'primary' },
  { to: '/library', label: 'AI Library', icon: BookOpen, matchPrefix: true, group: 'primary' },
  { to: '/lab', label: 'AI Labs', icon: MessageSquareText, matchPrefix: true, group: 'primary' },
  { to: '/profile', label: 'Hồ sơ', icon: Settings, group: 'personal' },
];

export function PublicHeader() {
  const { user, signOut } = useApp();
  const { navigate } = useRouter();
  const { setPaletteModalOpen } = useTheme();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    setMobileMenuOpen(false);
    signOut();
    showToast('Bạn đã đăng xuất khỏi Mạch Ngôn.', { variant: 'info' });
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10 h-16">
        {/* Zone 1: Official Brand Logo Lockup */}
        <Link to="/" className="inline-flex items-center shrink-0">
          <BrandLogo size="sm" />
        </Link>

        {/* Zone 2: 4 Centered Navigation Links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-5 lg:gap-8 text-sm font-medium text-[var(--color-text-muted)]"
        >
          <Link
            to="/about"
            className="py-1 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            Giới thiệu
          </Link>
          <Link
            to="/library"
            className="py-1 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            AI Library
          </Link>
          <Link
            to="/lab"
            className="py-1 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            AI Labs
          </Link>
          <Link
            to="/guide"
            className="py-1 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap shrink-0"
          >
            Hướng dẫn
          </Link>
        </nav>

        {/* Zone 3: Right Actions — Auth-aware */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            aria-hidden="true"
            className="hidden md:block h-4 w-px bg-[var(--color-border)] mr-1"
          />
          {user.isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex btn-primary !min-h-10 !px-3.5 !text-sm"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline">Vào không gian học tập</span>
                <span className="xl:hidden">Tổng quan</span>
              </Link>
              <Link
                to="/profile"
                title={`Hồ sơ: ${user.name}`}
                data-testid="header-account-link"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/45 transition-colors max-w-[190px]"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold border border-[var(--color-border)]"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-primary) 12%, var(--color-bg) 88%)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                  {user.name}
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex btn-secondary !min-h-10 !px-4 !text-sm"
              >
                Đăng nhập
              </Link>
              <Link
                to="/library"
                className="hidden sm:inline-flex btn-primary !min-h-10 !px-4 !text-sm"
              >
                Bắt đầu
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Mở menu điều hướng"
            aria-expanded={mobileMenuOpen}
            className="flex md:hidden h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3"
          >
            <div className="flex flex-col gap-1">
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Giới thiệu & Về dự án
              </Link>
              <Link
                to="/library"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                AI Library
              </Link>
              <Link
                to="/lab"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                AI Labs
              </Link>
              <Link
                to="/guide"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                Hướng dẫn đọc & tranh biện
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPaletteModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                Đổi bảng màu đọc sách
              </button>
              <div className="mt-2 pt-3 border-t border-[var(--color-border)]">
                {user.isAuthenticated ? (
                  <div className="space-y-2.5">
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-[var(--color-border)] bg-[var(--color-bg)]/60"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold border border-[var(--color-border)]"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-primary) 12%, var(--color-bg) 88%)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {user.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--color-text)] truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                          {user.email}
                        </div>
                      </div>
                    </Link>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        to="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="btn-primary min-h-11 text-sm"
                      >
                        Tổng quan
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="btn-secondary min-h-11 text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-secondary min-h-11 text-sm"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/library"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-primary min-h-11 text-sm"
                    >
                      Bắt đầu
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

interface WorkspaceShellProps {
  children: React.ReactNode;
  hideChrome?: boolean;
  noMainBottomPadding?: boolean;
}

/**
 * Adaptive Multi-column Academic Workspace Shell:
 * - >= 1440px: Full 244px editorial Sidebar with grouped navigation
 * - 1024px – 1439px: Auto-collapsed 68px Icon Rail preserving central reading/lab width
 * - < 1024px: Compact 56px Mobile Header + Slide-out Drawer + Fixed Bottom Navigation
 */
export function WorkspaceShell({
  children,
  hideChrome = false,
  noMainBottomPadding = false,
}: WorkspaceShellProps) {
  const { pathname, navigate } = useRouter();
  const { user, signOut, adminSessionToken } = useApp();
  const { activePreset, setPaletteModalOpen } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isNavActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return pathname === item.to || pathname.startsWith(`${item.to}/`);
    }
    return pathname === item.to;
  };

  if (hideChrome) {
    return <div className="min-h-dvh bg-[var(--color-bg)] overflow-x-clip">{children}</div>;
  }

  const visibleWorkspaceNav = WORKSPACE_NAV.filter((n) =>
    n.to === '/admin' ? Boolean(adminSessionToken) : true
  );
  const primaryNav = visibleWorkspaceNav.filter((n) => n.group === 'primary');
  const personalNav = visibleWorkspaceNav.filter((n) => n.group === 'personal');

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col lg:flex-row overflow-x-clip max-w-full">
      {/* Desktop Wide (>=1440px): Full 244px Sidebar | Laptop (1024px–1439px): 68px Icon Rail */}
      <aside
        aria-label="Thanh điều hướng thư phòng"
        className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-dvh lg:shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:w-[68px] wide:w-[244px] transition-[width] duration-200"
      >
        {/* Official Brand Lockup */}
        <div className="flex items-center justify-center wide:justify-start gap-2.5 h-16 px-3 wide:px-5 border-b border-[var(--color-border)]">
          <Link
            to="/"
            title="Mạch Ngôn — Trang chủ"
            className="inline-flex items-center gap-2.5 whitespace-nowrap"
          >
            <BrandLogo size="sm" showWordmark={false} />
            <span className="hidden wide:inline font-display text-lg font-bold tracking-tight text-[var(--color-text)]">
              MẠCH NGÔN
            </span>
          </Link>
        </div>

        {/* User profile summary (>=1440px) */}
        <div className="hidden wide:flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold border border-[var(--color-border)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-bg) 88%)',
              color: 'var(--color-primary)',
            }}
          >
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-[var(--color-text)]">{user.name}</div>
            <div className="text-xs text-[var(--color-text-muted)] truncate">{user.roleLabel}</div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 wide:px-3 space-y-5">
          <div>
            <div className="hidden wide:block px-3 pb-2 text-[11px] font-medium text-[var(--color-text-muted)]">
              Không gian học tập
            </div>
            <div className="space-y-1">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-center wide:justify-start gap-3 rounded-xl h-10 px-2.5 wide:px-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="hidden wide:inline truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]/80">
            <div className="hidden wide:block px-3 pb-2 text-[11px] font-medium text-[var(--color-text-muted)]">
              Cá nhân & Hệ thống
            </div>
            <div className="space-y-1">
              {personalNav.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-center wide:justify-start gap-3 rounded-xl h-10 px-2.5 wide:px-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="hidden wide:inline truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom quick theme & auth */}
        <div className="p-2.5 wide:p-3 border-t border-[var(--color-border)] space-y-1">
          <button
            type="button"
            onClick={() => setPaletteModalOpen(true)}
            title={`Bảng màu: ${activePreset.name}`}
            aria-label="Chuyển đổi bảng màu đọc sách"
            className="flex w-full items-center justify-center wide:justify-start gap-3 rounded-xl h-10 px-2.5 wide:px-3 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <Palette className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <span className="hidden wide:inline truncate">
              Màu: {activePreset.name}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('machngon:open-shortcuts'))}
            title="Phím tắt (?)"
            aria-label="Phím tắt bàn phím"
            className="flex w-full items-center justify-center wide:justify-start gap-3 rounded-xl h-9 px-2.5 wide:px-3 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <Keyboard className="h-4 w-4 shrink-0" />
            <span className="hidden wide:inline truncate">Phím tắt (?)</span>
          </button>

          {user.isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate('/');
              }}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="flex w-full items-center justify-center wide:justify-start gap-3 rounded-xl h-10 px-2.5 wide:px-3 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden wide:inline">Đăng xuất</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile / Tablet Top Header (< 1024px) — compact 56px */}
      <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between h-14 px-3 sm:px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở danh mục điều hướng"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="inline-flex items-center">
          <BrandLogo size="xs" />
        </Link>

        <button
          type="button"
          onClick={() => setPaletteModalOpen(true)}
          aria-label="Đổi bảng màu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
        >
          <Palette className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile / Tablet Slide-out Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 w-72 max-w-[82vw] bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)]">
                <BrandLogo size="xs" />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Đóng menu"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/45">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold border border-[var(--color-border)]"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-bg) 88%)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{user.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">{user.roleLabel}</div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {visibleWorkspaceNav.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl min-h-11 px-3.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {user.isAuthenticated && (
                <div className="p-3 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      signOut();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-3 rounded-xl min-h-11 px-3.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 ${noMainBottomPadding ? '' : 'pb-20 lg:pb-0'}`}>
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (< 1024px) */}
      <nav
        aria-label="Điều hướng nhanh di động"
        className="fixed bottom-0 inset-x-0 z-30 flex lg:hidden items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/96 backdrop-blur-sm px-2 pt-1 safe-pb"
      >
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl px-2 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
