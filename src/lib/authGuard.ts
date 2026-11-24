/**
 * Centralized route access-control helpers for MẠCH NGÔN.
 * Public routes: "/", "/auth", "/about", "/guide", "/library", and "/library/:slug".
 * Protected workspaces: "/dashboard", "/lab", "/history", "/profile", "/onboarding", "/survey", "/admin".
 */

export const AUTH_REQUIRED_NOTICE =
  'Vui lòng đăng nhập để sử dụng đầy đủ tính năng cá nhân hóa của Mạch Ngôn.';

export const AUTH_REQUIRED_MESSAGE = AUTH_REQUIRED_NOTICE;

const PUBLIC_PATHS = new Set<string>(['/', '/auth', '/about', '/guide', '/library', '/glossary']);

export function normalizeRoutePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

export function isPublicRoute(pathname: string): boolean {
  const normalized = normalizeRoutePath(pathname);
  if (PUBLIC_PATHS.has(normalized)) return true;
  if (normalized.startsWith('/library/')) return true;
  return false;
}

export function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

/**
 * Ensures post-login redirect targets are always safe internal app paths
 * and never redirect back to /auth or external origins.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return fallback;
    }
    const normalizedPath = normalizeRoutePath(parsed.pathname);
    if (normalizedPath === '/auth') {
      return fallback;
    }
    return `${normalizedPath}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export function buildAuthRedirectUrl(pathname: string, search = ''): string {
  const normalized = normalizeRoutePath(pathname);
  const fullTarget = `${normalized}${search || ''}`;
  const params = new URLSearchParams();
  params.set('redirect', fullTarget);
  params.set('reason', 'auth_required');
  return `/auth?${params.toString()}`;
}
