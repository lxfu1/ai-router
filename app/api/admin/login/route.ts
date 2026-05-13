import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { generateToken } from '@/lib/auth';
import { ValidationError, AuthError, AppError, createErrorResponse } from '@/lib/errors';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Admin:Login');

// 登录暴力破解保护：同一 IP 5 分钟内最多 10 次失败尝试
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 分钟
const CLEANUP_INTERVAL = 60 * 1000; // 每分钟清理过期条目

// 定期清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      loginAttempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

function checkLoginLockout(ip: string): void {
  const entry = loginAttempts.get(ip);
  if (!entry) return;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const remainingSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    throw new AppError(
      `Too many login attempts. Try again in ${remainingSec} seconds.`,
      'login_locked',
      429
    );
  }
  // 锁定已过期，清除
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
  }
}

function recordLoginFailure(ip: string): void {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    logger.warn('Login lockout triggered', { ip, attempts: entry.count });
  }
  loginAttempts.set(ip, entry);
}

function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * POST /api/admin/login
 * 管理员登录
 */
export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const b = rawBody as Record<string, unknown>;
    if (!b.password || typeof b.password !== 'string') {
      throw new ValidationError('password is required');
    }

    const ip = getClientIp(request);

    // 检查是否被锁定
    checkLoginLockout(ip);

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (b.password !== adminPassword) {
      recordLoginFailure(ip);
      logAudit({
        action: 'login_failed',
        resource_type: 'auth',
        detail: 'Invalid password attempt',
        ip_address: ip,
      });
      logger.warn('Login failed', { ip });
      throw new AuthError('Invalid password');
    }

    const token = generateToken({
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    clearLoginFailures(ip);
    logAudit({
      action: 'login',
      actor: 'admin',
      resource_type: 'auth',
      detail: 'Admin login successful',
      ip_address: ip,
    });
    logger.info('Login successful', { ip });

    return Response.json({ token });
  } catch (error) {
    return createErrorResponse(error);
  }
}