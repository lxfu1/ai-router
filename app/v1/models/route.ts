import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { validateKey } from '@/lib/keys';
import { getEnabledChannels } from '@/lib/channels';
import { AuthError, createErrorResponse } from '@/lib/errors';

/**
 * GET /v1/models
 * 返回可用的模型列表
 */
export async function GET(request: NextRequest) {
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

    // 获取启用的渠道
    const channels = getEnabledChannels();
    const now = Math.floor(Date.now() / 1000);

    // 构建模型列表
    const models = [
      // 渠道对应的模型
      ...channels.map((ch) => ({
        id: ch.model_name,
        object: 'model' as const,
        created: now,
        owned_by: ch.provider,
      })),
      // 支持自动路由
      {
        id: 'auto',
        object: 'model' as const,
        created: now,
        owned_by: 'ai-router',
      },
    ];

    return NextResponse.json({ object: 'list', data: models });
  } catch (error) {
    return createErrorResponse(error);
  }
}
