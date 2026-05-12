import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import { getStats } from '@/lib/usage';
import { AuthError, createErrorResponse } from '@/lib/errors';

/**
 * GET /api/admin/stats
 * 获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    const stats = getStats();
    return Response.json(stats);
  } catch (error) {
    return createErrorResponse(error);
  }
}
