// 轻量级输入验证（无需引入 zod 等外部依赖）

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// OpenAI 多模态 content 格式: string | [{type: 'text', text: string}, {type: 'image_url', image_url: {...}}]
function normalizeContent(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    // 提取所有 text 类型的内容拼接
    const texts: string[] = [];
    for (const item of content) {
      if (typeof item === 'object' && item && 'type' in item) {
        if (item.type === 'text' && typeof item.text === 'string') {
          texts.push(item.text);
        }
        // 忽略 image_url 等其他类型（只保留文本用于验证）
      }
    }
    return texts.length > 0 ? texts.join('\n') : null;
  }
  return String(content);
}

// Chat Request 验证
export interface ValidatedChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

export function validateChatRequest(
  body: unknown
): ValidationResult<ValidatedChatRequest> {
  console.log('[Validator] Raw body:', JSON.stringify(body).slice(0, 500));
  
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  // messages 验证
  if (!b.messages || !Array.isArray(b.messages) || b.messages.length === 0) {
    return {
      success: false,
      error: 'messages is required and must be a non-empty array'
    };
  }

  let msgIndex = 0;
  for (const msg of b.messages) {
    console.log(`[Validator] Checking message[${msgIndex}]:`, JSON.stringify(msg));
    if (!msg || typeof msg !== 'object') {
      return { success: false, error: `Message[${msgIndex}] must be an object, got: ${typeof msg}` };
    }
    const m = msg as Record<string, unknown>;
    if (
      !m.role ||
      !['system', 'user', 'assistant', 'tool', 'function'].includes(m.role as string)
    ) {
      return {
        success: false,
        error: 'message.role must be system, user, assistant, tool, or function'
      };
    }
    // 规范化 content（处理多模态格式）
    const normalizedContent = normalizeContent(m.content);
    
    // system/user: content 必须是非空字符串
    if (m.role === 'system' || m.role === 'user') {
      if (!normalizedContent || normalizedContent.length === 0) {
        return { success: false, error: `${m.role} message[${msgIndex}].content is required (string or text array)` };
      }
      // 替换为规范化后的字符串
      m.content = normalizedContent;
    }
    // assistant 消息允许 null content（如果是 function call）
    if (m.role === 'assistant') {
      const hasFunctionCall = 'function_call' in m || 'tool_calls' in m;
      if (!hasFunctionCall && (!normalizedContent || normalizedContent.length === 0)) {
        return { success: false, error: 'assistant message must have content or function_call/tool_calls' };
      }
      // 非结构化 content 时替换为字符串
      if (normalizedContent) m.content = normalizedContent;
    }
    // tool/function 角色需要 content，但可以接受 null/空
    if ((m.role === 'tool' || m.role === 'function')) {
      if (normalizedContent) m.content = normalizedContent;
    }
    msgIndex++;
  }

  // model 验证
  const model = typeof b.model === 'string' ? b.model : 'auto';

  // stream 验证
  const stream = b.stream === true;

  // 可选参数验证
  const result: ValidatedChatRequest = {
    model,
    messages: b.messages as Array<{ role: string; content: string }>,
    stream
  };

  if (b.temperature !== undefined) {
    const temp = Number(b.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return { success: false, error: 'temperature must be between 0 and 2' };
    }
    result.temperature = temp;
  }

  if (b.max_tokens !== undefined) {
    const max = Number(b.max_tokens);
    if (isNaN(max) || max < 1 || max > 32768) {
      return {
        success: false,
        error: 'max_tokens must be between 1 and 32768'
      };
    }
    result.max_tokens = max;
  }

  return { success: true, data: result };
}

// Admin: Channel 创建验证
export interface ValidatedChannelInput {
  name: string;
  provider: string;
  base_url: string;
  api_key: string;
  model_name: string;
  rate_multiplier?: number;
  priority?: number;
  max_tokens?: number;
}

export function validateChannelInput(
  body: unknown
): ValidationResult<ValidatedChannelInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;
  const required = ['name', 'provider', 'base_url', 'api_key', 'model_name'];

  for (const field of required) {
    if (
      !b[field] ||
      typeof b[field] !== 'string' ||
      (b[field] as string).trim() === ''
    ) {
      return {
        success: false,
        error: `${field} is required and must be a non-empty string`
      };
    }
  }

  const result: ValidatedChannelInput = {
    name: b.name as string,
    provider: b.provider as string,
    base_url: b.base_url as string,
    api_key: b.api_key as string,
    model_name: b.model_name as string
  };

  if (b.rate_multiplier !== undefined) {
    const rate = Number(b.rate_multiplier);
    if (isNaN(rate) || rate < 0) {
      return {
        success: false,
        error: 'rate_multiplier must be a non-negative number'
      };
    }
    result.rate_multiplier = rate;
  }

  if (b.priority !== undefined) {
    const p = Number(b.priority);
    if (isNaN(p)) {
      return { success: false, error: 'priority must be a number' };
    }
    result.priority = p;
  }

  if (b.max_tokens !== undefined) {
    const m = Number(b.max_tokens);
    if (isNaN(m) || m < 1) {
      return { success: false, error: 'max_tokens must be a positive number' };
    }
    result.max_tokens = m;
  }

  return { success: true, data: result };
}

// Admin: Key 创建验证
export function validateKeyInput(
  body: unknown
): ValidationResult<{ name: string; balance?: number }> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  if (!b.name || typeof b.name !== 'string' || b.name.trim() === '') {
    return {
      success: false,
      error: 'name is required and must be a non-empty string'
    };
  }

  let balance: number | undefined;
  if (b.balance !== undefined) {
    balance = Number(b.balance);
    if (isNaN(balance) || balance < 0) {
      return { success: false, error: 'balance must be a non-negative number' };
    }
  }

  return { success: true, data: { name: b.name as string, balance } };
}

// ID 参数验证
export function validateId(id: unknown): ValidationResult<number> {
  const num = Number(id);
  if (isNaN(num) || num < 1) {
    return { success: false, error: 'ID must be a positive integer' };
  }
  return { success: true, data: num };
}
