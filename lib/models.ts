// 模型映射和供应商配置

export interface ModelMapping {
  aliases: string[]
  provider: string
  actualModel: string
}

export interface ProviderConfig {
  name: string
  defaultBaseUrl: string
  supportedParams: string[]
  unsupportedParams?: string[]
  needsModelTransform: boolean
}

// 模型别名映射（用户输入 -> 实际模型）
export const MODEL_ALIASES: Record<string, string> = {
  // DeepSeek
  'deepseek-v4': 'deepseek-v4-pro',
  'deepseek': 'deepseek-v4-pro',
  'deepseek-chat': 'deepseek-chat',
  'v4': 'deepseek-v4-pro',
  
  // 智谱
  'glm-5': 'glm-5',
  'zhipu': 'glm-5',
  'zhipu-ai': 'glm-5',
  
  // 通义千问
  'qwen-plus': 'qwen-plus',
  'qwen': 'qwen-plus',
  'tongyi': 'qwen-plus',

  // MiniMax
  'minimax-m2.7': 'MiniMax-M2.7',
  'minimax': 'MiniMax-M2.7',
  'm2.7': 'MiniMax-M2.7',

  // 特殊
  'auto': 'auto',
}

// 供应商配置
export const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty'],
    needsModelTransform: false,
  },
  zhipu: {
    name: '智谱 AI',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    supportedParams: ['temperature', 'max_tokens', 'top_p'],
    unsupportedParams: ['frequency_penalty', 'presence_penalty', 'logprobs', 'top_logprobs'],
    needsModelTransform: true,
  },
  qwen: {
    name: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    supportedParams: ['temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty'],
    unsupportedParams: ['stream_options'],
    needsModelTransform: false,
  },
  minimax: {
    name: 'MiniMax',
    defaultBaseUrl: 'https://api.minimaxi.com/v1',
    supportedParams: ['temperature', 'max_tokens', 'top_p'],
    unsupportedParams: ['frequency_penalty', 'presence_penalty', 'logprobs', 'top_logprobs'],
    needsModelTransform: false,
  },
}

/**
 * 解析用户输入的模型名称为实际模型
 */
export function resolveModel(input: string): string {
  const normalized = input.toLowerCase().trim()
  return MODEL_ALIASES[normalized] || input
}

/**
 * 获取模型对应的供应商
 */
export function getProviderForModel(model: string): ProviderConfig | null {
  const resolved = resolveModel(model)
  
  // 从渠道数据反查（简化版 - 直接匹配 known 模型）
  if (resolved.includes('deepseek')) return PROVIDERS.deepseek
  if (resolved.includes('glm')) return PROVIDERS.zhipu
  if (resolved.includes('qwen')) return PROVIDERS.qwen
  if (resolved.toLowerCase().includes('minimax')) return PROVIDERS.minimax
  
  return null
}

/**
 * 根据供应商清理请求体（移除不支持的参数）
 */
export function sanitizeRequestBody(body: any, provider: string): any {
  const config = PROVIDERS[provider]
  if (!config || !config.unsupportedParams) {
    return body
  }

  const result = { ...body }
  for (const param of config.unsupportedParams) {
    delete result[param]
  }
  return result
}

/**
 * 构建上游 URL
 */
export function buildUpstreamUrl(baseUrl: string, provider: string, endpoint: string = 'chat/completions'): string {
  // 清理 base_url 结尾的斜杠
  const cleanBase = baseUrl.replace(/\/+$/, '')
  
  // 智谱使用不同路径
  if (provider === 'zhipu') {
    // 智谱 v4 不需要 /v1 前缀
    if (cleanBase.includes('/paas/v4')) {
      return `${cleanBase}/${endpoint}`
    }
  }
  
  // 标准 OpenAI 兼容格式
  if (cleanBase.endsWith('/v1')) {
    return `${cleanBase}/${endpoint}`
  }
  
  return `${cleanBase}/v1/${endpoint}`
}
