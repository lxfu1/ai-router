// 统一错误类型和错误处理

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        type: this.code,
      },
    }
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'auth_error', 401)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'invalid_request_error', 400)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'not_found', 404)
  }
}

export class UpstreamError extends AppError {
  constructor(message: string = 'Upstream service error') {
    super(message, 'upstream_error', 502)
  }
}

// 安全的错误序列化，避免泄露敏感信息
export function serializeError(error: unknown): { message: string; type: string } {
  if (error instanceof AppError) {
    return { message: error.message, type: error.code }
  }
  
  if (error instanceof Error) {
    // 生产环境只返回通用错误
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Internal server error', type: 'internal_error' }
    }
    return { message: error.message, type: 'internal_error' }
  }
  
  return { message: 'Unknown error', type: 'unknown_error' }
}

// 错误响应构造器
export function createErrorResponse(
  error: unknown,
  statusCode?: number
): Response {
  const serialized = serializeError(error)
  const code = error instanceof AppError ? error.statusCode : (statusCode || 500)
  
  return Response.json(serialized, { status: code })
}
