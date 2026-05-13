import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import {
  getAllChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  checkAllChannels,
} from '@/lib/channels';
import { AuthError, ValidationError, createErrorResponse } from '@/lib/errors';
import { validateChannelInput, validateId } from '@/lib/validator';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Admin:Channels');

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

    const channel = await createChannel(validation.data!);
    const ip = getClientIp(request);
    logAudit({
      action: 'channel_create',
      actor: 'admin',
      resource_type: 'channel',
      resource_id: channel.id,
      detail: `Created channel: ${validation.data!.name} (${validation.data!.provider})`,
      ip_address: ip,
    });
    logger.info('Channel created', { channelId: channel.id, name: validation.data!.name, ip });
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

    await updateChannel(idValidation.data!, data);
    const ip = getClientIp(request);
    logAudit({
      action: 'channel_update',
      actor: 'admin',
      resource_type: 'channel',
      resource_id: idValidation.data!,
      detail: `Updated fields: ${Object.keys(data).join(', ')}`,
      ip_address: ip,
    });
    logger.info('Channel updated', { channelId: idValidation.data!, fields: Object.keys(data).join(','), ip });
    return Response.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/channels
 * 删除渠道
 */
export async function DELETE(request: NextRequest) {
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

    await deleteChannel(idValidation.data!);
    const ip = getClientIp(request);
    logAudit({
      action: 'channel_delete',
      actor: 'admin',
      resource_type: 'channel',
      resource_id: idValidation.data!,
      detail: 'Channel deleted',
      ip_address: ip,
    });
    logger.info('Channel deleted', { channelId: idValidation.data!, ip });
    return Response.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}