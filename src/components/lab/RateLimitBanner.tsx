import React from 'react';
import { AlertCircle, Clock, Cpu, RefreshCw, Settings2 } from 'lucide-react';
import { Link } from '../../lib/router';

interface RateLimitBannerProps {
  variant: 'rate_limited' | 'api_error';
  title?: string;
  message: string;
  secondsLeft?: number;
  autosaveNotice?: string | null;
  onRetry?: () => void;
  onUseLocalFallback: () => void;
}

/**
 * Transparent quota/API fallback banner shown when AI API hits HTTP 429,
 * quota exhaustion, missing server key, or temporary connectivity failure.
 */
export function RateLimitBanner({
  variant,
  title,
  message,
  secondsLeft = 0,
  autosaveNotice,
  onRetry,
  onUseLocalFallback,
}: RateLimitBannerProps) {
  const isRateLimit = variant === 'rate_limited';

  return (
    <div
      role={isRateLimit ? 'status' : 'alert'}
      aria-live="polite"
      data-testid={isRateLimit ? 'quota-exhausted-banner' : 'api-error-banner'}
      className="rounded-xl p-4 border space-y-3"
      style={
        isRateLimit
          ? {
              backgroundColor: 'var(--color-warn-bg)',
              borderColor: 'var(--color-warn-border)',
            }
          : {
              backgroundColor: 'var(--color-surface)',
              borderColor: 'color-mix(in srgb, var(--color-danger) 35%, var(--color-border) 65%)',
            }
      }
    >
      <div className="flex items-start gap-3">
        {isRateLimit ? (
          <Clock className="h-4.5 w-4.5 shrink-0 text-[var(--color-gold)] mt-0.5" />
        ) : (
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-[var(--color-danger)] mt-0.5" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--color-text)]">
              {title ||
                (isRateLimit
                  ? 'Hết hạn mức gọi AI hiện tại (HTTP 429)'
                  : 'Kết nối tới máy chủ AI đang tạm gián đoạn')}
            </span>
            {isRateLimit && secondsLeft > 0 && (
              <span className="font-mono-num text-xs font-semibold text-[var(--color-primary)]">
                Thử lại sau {secondsLeft}s
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{message}</p>
          {autosaveNotice && (
            <p className="text-[11px] text-[var(--color-text-muted)]">{autosaveNotice}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Link
          to="/profile#ai-settings"
          data-testid="quota-ai-settings-link"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
        >
          <Settings2 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          Đổi model / Kiểm tra AI
        </Link>

        {!isRateLimit && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary !min-h-8 !px-3 !text-xs whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại với AI
          </button>
        )}

        <button
          type="button"
          data-testid="fallback-local-btn"
          onClick={onUseLocalFallback}
          className={`${
            isRateLimit ? 'btn-secondary' : 'btn-primary'
          } !min-h-8 !px-3 !text-xs whitespace-nowrap`}
        >
          <Cpu className="h-3.5 w-3.5" />
          Tiếp tục bằng chế độ phân tích cục bộ
        </button>
      </div>
    </div>
  );
}
