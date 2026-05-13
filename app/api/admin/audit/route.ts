import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { checkAdminAuth } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit';
import { AuthError, ValidationError, createErrorResponse } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Admin:Audit');

/**
 * GET /api/admin/audit
 * 查询审计日志
 */
export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      throw new AuthError();
    }

    const url = request.nextUrl;

    const params = {
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '20'),
      action: url.searchParams.get('action') || undefined,
      resource_type: url.searchParams.get('resource_type') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };

    // 参数校验
    if (params.page && (isNaN(params.page) || params.page < 1)) {
      throw new ValidationError('page must be a positive integer');
    }
    if (params.pageSize && (isNaN(params.pageSize) || params.pageSize < 1 || params.pageSize > 100)) {
      throw new ValidationError('pageSize must be between 1 and 100');
    }

    const result = getAuditLogs(params);
    return Response.json(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}