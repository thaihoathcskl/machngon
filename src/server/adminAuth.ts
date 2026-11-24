import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

interface AdminTokenPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_FALLBACK_SECRET;
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Server-side Admin Authentication Service.
 * - Requires `process.env.ADMIN_PASSCODE` to be configured on the server.
 * - Never permits first-run client bootstrap; when unconfigured, all /api/admin/* endpoints hard-lock with 403.
 */
export class AdminAuthService {
  private revokedTokens = new Set<string>();

  isConfigured(): boolean {
    const envPass = process.env.ADMIN_PASSCODE?.trim();
    return Boolean(envPass && envPass.length > 0);
  }

  async getStatus(): Promise<{
    configured: boolean;
    source: 'env' | 'unconfigured';
  }> {
    if (this.isConfigured()) {
      return { configured: true, source: 'env' };
    }
    return { configured: false, source: 'unconfigured' };
  }

  async verifyAndLogin(passcode: string): Promise<{ token: string; expiresAt: string } | null> {
    if (!this.isConfigured()) return null;
    const trimmed = passcode.trim();
    if (!trimmed) return null;

    const envPass = process.env.ADMIN_PASSCODE!.trim();
    if (constantTimeStringEqual(trimmed, envPass)) {
      return this.issueToken();
    }
    return null;
  }

  issueToken(): { token: string; expiresAt: string } {
    const now = Date.now();
    const exp = now + TOKEN_TTL_MS;
    const payload: AdminTokenPayload = {
      role: 'admin',
      iat: now,
      exp,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(encodedPayload)
      .digest('base64url');
    return {
      token: `${encodedPayload}.${sig}`,
      expiresAt: new Date(exp).toISOString(),
    };
  }

  verifyToken(token: string): AdminTokenPayload | null {
    if (!this.isConfigured()) return null;
    if (!token || this.revokedTokens.has(token)) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(encodedPayload)
      .digest('base64url');

    if (!constantTimeStringEqual(providedSig, expectedSig)) return null;

    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      ) as AdminTokenPayload;
      if (parsed.role !== 'admin' || typeof parsed.exp !== 'number') return null;
      if (Date.now() > parsed.exp) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  revokeToken(token: string): void {
    if (token) this.revokedTokens.add(token);
  }
}

export const adminAuthService = new AdminAuthService();

export function extractBearerToken(req: Request): string | null {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!adminAuthService.isConfigured()) {
    res.status(403).json({
      error:
        'Cổng quản trị đang tạm khóa vì biến môi trường ADMIN_PASSCODE chưa được thiết lập trên máy chủ.',
    });
    return;
  }
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Yêu cầu xác thực quản trị viên để truy cập tài nguyên này.' });
    return;
  }
  const verified = adminAuthService.verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn.' });
    return;
  }
  next();
}
