// 统一导出的类型定义

// Channels
export interface Channel {
  id: number
  name: string
  provider: string
  base_url: string
  api_key: string
  model_name: string
  enabled: number
  priority: number
  rate_multiplier: number
  max_tokens: number
  healthy: number
  last_check_at: string | null
  latency_ms: number | null
  created_at: string
  updated_at: string
}

export interface CreateChannelInput {
  name: string
  provider: string
  base_url: string
  api_key: string
  model_name: string
  rate_multiplier?: number
  priority?: number
  max_tokens?: number
}

// API Keys
export interface ApiKey {
  id: number
  key_value: string
  name: string
  balance: number
  used_balance: number
  enabled: number
  created_at: string
  updated_at: string
}

// Usage / Logs
export interface RequestLog {
  id: number
  request_id: string
  api_key_id: number
  channel_id: number
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
  latency_ms: number
  status: string
  error_message: string | null
  is_stream: number
  created_at: string
}

export interface LogQueryParams {
  page?: number
  pageSize?: number
  model?: string
  status?: string
  keyId?: number
  startDate?: string
  endDate?: string
}

export interface UsageStats {
  totalRequests: number
  todayRequests: number
  totalTokens: number
  totalCost: number
  totalKeys: number
  activeKeys: number
  errorRate: number
  modelStats: {
    model: string
    count: number
    tokens: number
    cost: number
    avg_latency: number
  }[]
  dailyStats: {
    date: string
    count: number
    tokens: number
    cost: number
  }[]
}

// Chat Completion
export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

// API Responses
export interface ApiError {
  message: string
  type: string
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

// Auth
export interface JwtPayload {
  role: string
  exp?: number
  [key: string]: unknown
}

// Audit Log
export interface AuditLog {
  id: number
  action: string
  actor: string
  resource_type: string
  resource_id: string | null
  detail: string | null
  ip_address: string | null
  created_at: string
}
