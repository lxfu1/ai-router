import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { validateKey } from '@/lib/keys';
import { getEnabledChannels } from '@/lib/channels';
import { AuthError, AppError, createErrorResponse } from '@/lib/errors';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { recordHttpRequest, recordRateLimitRejected } from '@/lib/metrics';
import { cacheAside } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Models');

const CACHE_TTL_MODELS = 2 * 60 * 1000; // 2 分钟

/**
 * GET /v1/models
 * 返回可用的模型列表
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 验证 API Key
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('Missing API key');
    }

    const apiKey = validateKey(authHeader.slice(7));
    if (!apiKey) {
      throw new AuthError('Invalid or disabled API key');
    }

    // 限流检查
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(authHeader.slice(7), ip);
    if (!rateLimitResult.allowed) {
      recordRateLimitRejected('api_key');
      const error = new AppError(
        `Rate limit exceeded. Limit: ${rateLimitResult.limit} requests per minute.`,
        'rate_limit_exceeded',
        429
      );
      (error as any).rateLimit = rateLimitResult;
      throw error;
    }

    // 获取启用的渠道（带缓存）
    const channels = await cacheAside<{ id: string; object: string; created: number; owned_by: string }[]>(
      'models:list',
      async () => {
        const chs = await getEnabledChannels();
        const now = Math.floor(Date.now() / 1000);
        return [
          ...chs.map((ch) => ({
            id: ch.model_name,
            object: 'model' as const,
            created: now,
            owned_by: ch.provider,
          })),
          {
            id: 'auto',
            object: 'model' as const,
            created: now,
            owned_by: 'ai-router',
          },
        ];
      },
      CACHE_TTL_MODELS
    );

    recordHttpRequest('GET', '/v1/models', 200, Date.now() - startTime);

    return NextResponse.json(
      { object: 'list', data: channels },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetAt / 1000)),
        },
      }
    );
  } catch (error) {
    recordHttpRequest('GET', '/v1/models', error instanceof AppError ? error.statusCode : 500, Date.now() - startTime);
    logger.warn('Models request error', { error: error instanceof Error ? error.message : String(error) });

    const response = createErrorResponse(error);
    if (error instanceof AppError && (error as any).rateLimit) {
      const rl = (error as any).rateLimit;
      response.headers.set('X-RateLimit-Limit', String(rl.limit));
      response.headers.set('X-RateLimit-Remaining', String(rl.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));
    }
    return response;
  }
}