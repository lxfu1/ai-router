import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { generateToken } from '@/lib/auth';
import { ValidationError, AuthError, createErrorResponse } from '@/lib/errors';

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

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (b.password !== adminPassword) {
      throw new AuthError('Invalid password');
    }

    const token = generateToken({
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 86400,
    });

    return Response.json({ token });
  } catch (error) {
    return createErrorResponse(error);
  }
}