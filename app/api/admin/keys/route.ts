import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import {
  createKey,
  getAllKeys,
  toggleKey,
  deleteKey,
  updateKeyBalance,
} from '@/lib/keys';
import { AuthError, ValidationError, createErrorResponse } from '@/lib/errors';
import { validateKeyInput, validateId } from '@/lib/validator';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Admin:Keys');

/**
 * GET /api/admin/keys
 * 获取所有 API Key 列表
 */
export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    const keys = getAllKeys();
    return Response.json({ keys });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/keys
 * 创建新 API Key
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

    const validation = validateKeyInput(rawBody);
    if (!validation.success) {
      throw new ValidationError(validation.error!);
    }

    const { name, balance } = validation.data!;
    const key = createKey(name, balance ?? 100);
    const ip = getClientIp(request);
    logAudit({
      action: 'key_create',
      actor: 'admin',
      resource_type: 'api_key',
      resource_id: key.id,
      detail: `Created key: ${name}, balance: ${balance ?? 100}`,
      ip_address: ip,
    });
    logger.info('API key created', { keyId: key.id, name, ip });
    return Response.json({ key }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/admin/keys
 * 更新 API Key（启用/禁用/修改余额）
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
    const id = idValidation.data!;

    const action = String(b.action || '');
    const ip = getClientIp(request);

    if (action === 'toggle') {
      const keys = getAllKeys();
      const key = keys.find((k) => k.id === id);
      if (!key) {
        throw new ValidationError('Key not found');
      }
      toggleKey(id, key.enabled === 0);
      logAudit({
        action: 'key_toggle',
        actor: 'admin',
        resource_type: 'api_key',
        resource_id: id,
        detail: `Key ${key.name} ${key.enabled === 0 ? 'enabled' : 'disabled'}`,
        ip_address: ip,
      });
      logger.info('API key toggled', { keyId: id, enabled: key.enabled === 0, ip });
    } else if (action === 'balance') {
      const balance = Number(b.balance);
      if (isNaN(balance) || balance < 0) {
        throw new ValidationError('balance must be a non-negative number');
      }
      updateKeyBalance(id, balance);
      logAudit({
        action: 'key_balance_update',
        actor: 'admin',
        resource_type: 'api_key',
        resource_id: id,
        detail: `Balance updated to ${balance}`,
        ip_address: ip,
      });
      logger.info('API key balance updated', { keyId: id, balance, ip });
    } else {
      throw new ValidationError('Invalid action. Use: toggle | balance');
    }

    return Response.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/keys
 * 删除 API Key
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

    deleteKey(idValidation.data!);
    const ip = getClientIp(request);
    logAudit({
      action: 'key_delete',
      actor: 'admin',
      resource_type: 'api_key',
      resource_id: idValidation.data!,
      detail: 'Key deleted',
      ip_address: ip,
    });
    logger.info('API key deleted', { keyId: idValidation.data!, ip });
    return Response.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}