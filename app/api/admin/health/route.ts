import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import { checkAllChannels, getAllChannels } from '@/lib/channels';
import { AuthError, createErrorResponse } from '@/lib/errors';

/**
 * GET /api/admin/health
 * 获取渠道状态列表
 */
export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    const channels = getAllChannels();
    return Response.json({ channels });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/health
 * 触发渠道健康检查
 */
export async function POST(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    const results = await checkAllChannels();
    return Response.json({
      channels: results.map((r) => ({
        id: r.channel.id,
        name: r.channel.name,
        provider: r.channel.provider,
        healthy: r.result.healthy,
        latency_ms: r.result.latencyMs,
      })),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
