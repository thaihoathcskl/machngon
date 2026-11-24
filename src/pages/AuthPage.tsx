import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Sparkles, X } from 'lucide-react';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useToast } from '../components/ui/ToastProvider';
import { HybridMediaCard } from '../components/visuals/ThemeSyncedHero';
import { useApp } from '../lib/AppContext';
import { EDITORIAL_IMAGES } from '../lib/assets';
import { AUTH_REQUIRED_MESSAGE, sanitizeRedirectPath } from '../lib/authGuard';
import { Link, useRouter, useSearchParams } from '../lib/router';

interface AuthPageProps {
  forcedReason?: string;
  forcedRedirect?: string;
}

export function AuthPage({ forcedReason, forcedRedirect }: AuthPageProps = {}) {
  const { signIn, user } = useApp();
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const redirectParam = forcedRedirect ?? searchParams.get('redirect');
  const authReason = forcedReason ?? searchParams.get('reason');
  const isAuthRequiredNotice = authReason === 'auth_required';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    const queryMode = searchParams.get('mode');
    if (queryMode === 'register' || queryMode === 'login') {
      setMode(queryMode);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setError('Vui lòng nhập họ tên đầy đủ của bạn.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận chưa trùng khớp.');
        return;
      }
      if (!agreed) {
        setError('Vui lòng xác nhận đồng ý với nguyên tắc học thuật của Mạch Ngôn.');
        return;
      }
    }

    const destination = redirectParam
      ? sanitizeRedirectPath(redirectParam, '/dashboard')
      : mode === 'register'
        ? '/onboarding'
        : '/dashboard';

    signIn(trimmedEmail, mode === 'register' ? name : user.name);
    showToast(
      mode === 'register'
        ? 'Đăng ký tài khoản thành công! Chào mừng bạn đến với Mạch Ngôn.'
        : 'Chào mừng bạn quay lại thư phòng Mạch Ngôn.',
      { variant: 'success' }
    );
    navigate(destination, { replace: true });
  };

  const handleGoogleContinue = () => {
    const destination = redirectParam
      ? sanitizeRedirectPath(redirectParam, '/dashboard')
      : user.onboardingCompleted
        ? '/dashboard'
        : '/onboarding';
    signIn(user.email || 'lanphuong@machngon.edu.vn', user.name || 'Lan Phương');
    showToast('Đã đăng nhập bằng hồ sơ học viên.', { variant: 'success' });
    navigate(destination, { replace: true });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = forgotEmail.trim();
    if (!cleaned || !cleaned.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ để khôi phục.', { variant: 'warning' });
      return;
    }
    setForgotSent(true);
    showToast(
      `Yêu cầu đặt lại mật khẩu cho ${cleaned} đã được ghi nhận (môi trường học tập cục bộ).`,
      { variant: 'info' }
    );
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay về Trang chủ
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 pb-12">
        <div className="w-full max-w-[1000px] overflow-hidden rounded-2xl surface-card grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Literary Split Panel */}
          <div
            className="lg:col-span-5 p-7 sm:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--color-border)]"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-surface-muted) 45%, var(--color-surface) 55%)',
            }}
          >
            <div>
              <BrandLogo size="md" />
              <h1 className="mt-6 font-display text-2xl sm:text-[1.7rem] font-semibold leading-snug text-[var(--color-text)]">
                Không gian đọc chậm và tranh biện có căn cứ
              </h1>
              <p className="mt-3.5 font-reading text-sm sm:text-[0.95rem] italic leading-relaxed text-[var(--color-text-muted)]">
                “Đặt câu hỏi. Khám phá tri thức. Kiến tạo tư duy của riêng bạn.”
              </p>
            </div>

            <div className="mt-7 overflow-hidden rounded-xl border border-[var(--color-border)]">
              <HybridMediaCard
                src={EDITORIAL_IMAGES.coverLanguageThought}
                alt="Bàn học gỗ sồi với sách và lọ mực cổ điển"
                aspect="4/3"
              />
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-center">
            <div
              role="tablist"
              aria-label="Chọn đăng nhập hoặc đăng ký"
              className="inline-flex self-start rounded-xl p-1 border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            <h2 className="mt-6 font-display text-2xl sm:text-[1.75rem] font-semibold text-[var(--color-text)]">
              {mode === 'login' ? 'Chào mừng trở lại thư phòng' : 'Bắt đầu hành trình tri thức'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {mode === 'login'
                ? 'Đăng nhập để lưu Sổ tay mạch lập luận, ghi chú đọc chậm và lịch sử các phiên Thinking Lab.'
                : 'Tạo tài khoản cá nhân để lưu Sổ tay mạch lập luận, ghi chú đọc sâu và lịch sử phiên Lab trên trình duyệt.'}
            </p>

            {isAuthRequiredNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-primary) 7%, var(--color-surface) 93%)',
                  borderColor:
                    'color-mix(in srgb, var(--color-primary) 28%, var(--color-border) 72%)',
                  color: 'var(--color-text)',
                }}
              >
                <Lock className="h-4 w-4 shrink-0 mt-0.5 text-[var(--color-primary)]" />
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)]">
                    {AUTH_REQUIRED_MESSAGE}
                  </p>
                  {redirectParam && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      Sau khi đăng nhập, bạn sẽ được đưa thẳng tới trang vừa chọn.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl px-4 py-3 text-sm border"
                style={{
                  backgroundColor: 'var(--color-warn-bg)',
                  borderColor: 'var(--color-warn-border)',
                  color: 'var(--color-text)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                    Họ tên đầy đủ
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Lan Phương"
                    className="input-editorial"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="banhoc@machngon.edu.vn"
                  className="input-editorial"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-[var(--color-text)]">
                    Mật khẩu
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotSent(false);
                        setForgotOpen(true);
                      }}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="input-editorial !pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-confirm" className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                      Xác nhận mật khẩu
                    </label>
                    <input
                      id="auth-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="input-editorial"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--color-text-muted)] cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                    />
                    <span>
                      Tôi đồng ý tuân thủ nguyên tắc liêm chính học thuật và đối thoại tôn trọng trong Mạch Ngôn.
                    </span>
                  </label>
                </>
              )}

              <button type="submit" className="btn-primary w-full !min-h-11">
                {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              <span>hoặc</span>
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleContinue}
              className="btn-secondary w-full !min-h-11"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              Dùng thử nhanh (Tài khoản học viên mẫu)
            </button>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <div
            onClick={() => setForgotOpen(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 id="forgot-password-title" className="font-display text-lg font-semibold">
                    Khôi phục mật khẩu
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Nhập email đã đăng ký tài khoản Mạch Ngôn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                aria-label="Đóng hộp thoại"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="mt-5 space-y-4">
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-4 text-xs leading-relaxed text-[var(--color-text)]">
                  Mạch Ngôn V1 hiện đang lưu hồ sơ học tập cục bộ trên trình duyệt của bạn (chưa kết nối máy chủ gửi email SMTP). Bạn có thể đăng nhập lại bằng email <strong>{forgotEmail}</strong> và đặt mật khẩu mới bất kỳ từ 6 ký tự trở lên.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(forgotEmail);
                    setForgotOpen(false);
                  }}
                  className="btn-primary w-full !min-h-10 !text-xs"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-medium mb-1.5">
                    Địa chỉ email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="banhoc@machngon.edu.vn"
                    className="input-editorial"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="btn-secondary !min-h-10 !px-4 !text-xs"
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary !min-h-10 !px-4 !text-xs">
                    Gửi hướng dẫn
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
