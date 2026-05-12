import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import {
  getAllChannels,
  createChannel,
  updateChannel,
  checkAllChannels,
} from '@/lib/channels';
import { AuthError, ValidationError, createErrorResponse } from '@/lib/errors';
import { validateChannelInput, validateId } from '@/lib/validator';

/**
 * GET /api/admin/channels
 * 获取所有渠道列表
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
 * POST /api/admin/channels
 * 创建新渠道
 */
export async function POST(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = validateChannelInput(rawBody);
    if (!validation.success) {
      throw new ValidationError(validation.error!);
    }

    const channel = createChannel(validation.data!);
    return Response.json({ channel }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/channels
 * 更新渠道信息
 */
export async function PUT(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const b = rawBody as Record<string, unknown>;
    const idValidation = validateId(b.id);
    if (!idValidation.success) {
      throw new ValidationError(idValidation.error!);
    }

    const { id, ...data } = b;
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    updateChannel(idValidation.data!, data);
    return Response.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
