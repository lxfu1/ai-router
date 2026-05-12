// 轻量级输入验证（无需引入 zod 等外部依赖）

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
}

// Chat Request 验证
export interface ValidatedChatRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream: boolean
  temperature?: number
  max_tokens?: number
}

export function validateChatRequest(body: unknown): ValidationResult<ValidatedChatRequest> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' }
  }

  const b = body as Record<string, unknown>

  // messages 验证
  if (!b.messages || !Array.isArray(b.messages) || b.messages.length === 0) {
    return { success: false, error: 'messages is required and must be a non-empty array' }
  }

  for (const msg of b.messages) {
    if (!msg || typeof msg !== 'object') {
      return { success: false, error: 'Each message must be an object' }
    }
    const m = msg as Record<string, unknown>
    if (!m.role || !['system', 'user', 'assistant'].includes(m.role as string)) {
      return { success: false, error: 'message.role must be system, user, or assistant' }
    }
    if (!m.content || typeof m.content !== 'string' || m.content.length === 0) {
      return { success: false, error: 'message.content is required' }
    }
  }

  // model 验证
  const model = typeof b.model === 'string' ? b.model : 'auto'

  // stream 验证
  const stream = b.stream === true

  // 可选参数验证
  const result: ValidatedChatRequest = {
    model,
    messages: b.messages as Array<{ role: string; content: string }>,
    stream,
  }

  if (b.temperature !== undefined) {
    const temp = Number(b.temperature)
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return { success: false, error: 'temperature must be between 0 and 2' }
    }
    result.temperature = temp
  }

  if (b.max_tokens !== undefined) {
    const max = Number(b.max_tokens)
    if (isNaN(max) || max < 1 || max > 32768) {
      return { success: false, error: 'max_tokens must be between 1 and 32768' }
    }
    result.max_tokens = max
  }

  return { success: true, data: result }
}

// Admin: Channel 创建验证
export interface ValidatedChannelInput {
  name: string
  provider: string
  base_url: string
  api_key: string
  model_name: string
  rate_multiplier?: number
  priority?: number
  max_tokens?: number
}

export function validateChannelInput(body: unknown): ValidationResult<ValidatedChannelInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' }
  }

  const b = body as Record<string, unknown>
  const required = ['name', 'provider', 'base_url', 'api_key', 'model_name']
  
  for (const field of required) {
    if (!b[field] || typeof b[field] !== 'string' || (b[field] as string).trim() === '') {
      return { success: false, error: `${field} is required and must be a non-empty string` }
    }
  }

  const result: ValidatedChannelInput = {
    name: b.name as string,
    provider: b.provider as string,
    base_url: b.base_url as string,
    api_key: b.api_key as string,
    model_name: b.model_name as string,
  }

  if (b.rate_multiplier !== undefined) {
    const rate = Number(b.rate_multiplier)
    if (isNaN(rate) || rate < 0) {
      return { success: false, error: 'rate_multiplier must be a non-negative number' }
    }
    result.rate_multiplier = rate
  }

  if (b.priority !== undefined) {
    const p = Number(b.priority)
    if (isNaN(p)) {
      return { success: false, error: 'priority must be a number' }
    }
    result.priority = p
  }

  if (b.max_tokens !== undefined) {
    const m = Number(b.max_tokens)
    if (isNaN(m) || m < 1) {
      return { success: false, error: 'max_tokens must be a positive number' }
    }
    result.max_tokens = m
  }

  return { success: true, data: result }
}

// Admin: Key 创建验证
export function validateKeyInput(body: unknown): ValidationResult<{ name: string; balance?: number }> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' }
  }

  const b = body as Record<string, unknown>
  
  if (!b.name || typeof b.name !== 'string' || b.name.trim() === '') {
    return { success: false, error: 'name is required and must be a non-empty string' }
  }

  let balance: number | undefined
  if (b.balance !== undefined) {
    balance = Number(b.balance)
    if (isNaN(balance) || balance < 0) {
      return { success: false, error: 'balance must be a non-negative number' }
    }
  }

  return { success: true, data: { name: b.name as string, balance } }
}

// ID 参数验证
export function validateId(id: unknown): ValidationResult<number> {
  const num = Number(id)
  if (isNaN(num) || num < 1) {
    return { success: false, error: 'ID must be a positive integer' }
  }
  return { success: true, data: num }
}
