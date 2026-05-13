// Prometheus 指标模块
// 提供标准的 Prometheus 格式指标暴露，无需第三方依赖
// 在 /metrics 端点暴露，方便 Prometheus 采集

// ============ 指标存储 ============

interface MetricEntry {
  labels: Record<string, string>
  value: number
  timestamp: number
}

interface CounterDef {
  type: 'counter'
  name: string
  help: string
  entries: Map<string, number> // key = label hash, value = cumulative value
}

interface GaugeDef {
  type: 'gauge'
  name: string
  help: string
  entries: Map<string, number> // key = label hash, value = current value
}

interface HistogramDef {
  type: 'histogram'
  name: string
  help: string
  buckets: number[]
  entries: Map<string, { buckets: Map<string, number>; sum: number; count: number }>
}

type MetricDef = CounterDef | GaugeDef | HistogramDef

const metrics = new Map<string, MetricDef>()

// ============ 标签哈希 ============

function labelKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')
}

function labelString(labels: Record<string, string>): string {
  const entries = Object.entries(labels)
  if (entries.length === 0) return ''
  return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}'
}

// ============ 指标注册 ============

export function registerCounter(name: string, help: string): void {
  if (!metrics.has(name)) {
    metrics.set(name, { type: 'counter', name, help, entries: new Map() })
  }
}

export function registerGauge(name: string, help: string): void {
  if (!metrics.has(name)) {
    metrics.set(name, { type: 'gauge', name, help, entries: new Map() })
  }
}

export function registerHistogram(name: string, help: string, buckets: number[] = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]): void {
  if (!metrics.has(name)) {
    metrics.set(name, { type: 'histogram', name, help, buckets, entries: new Map() })
  }
}

// ============ 指标操作 ============

export function incCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
  const metric = metrics.get(name)
  if (!metric || metric.type !== 'counter') return
  const key = labelKey(labels)
  metric.entries.set(key, (metric.entries.get(key) || 0) + value)
}

export function setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
  const metric = metrics.get(name)
  if (!metric || metric.type !== 'gauge') return
  const key = labelKey(labels)
  metric.entries.set(key, value)
}

export function observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const metric = metrics.get(name)
  if (!metric || metric.type !== 'histogram') return
  const key = labelKey(labels)
  
  let entry = metric.entries.get(key)
  if (!entry) {
    entry = { buckets: new Map(), sum: 0, count: 0 }
    metric.entries.set(key, entry)
  }

  entry.sum += value
  entry.count += 1

  // 累加到合适的 bucket
  for (const bucket of metric.buckets) {
    if (value <= bucket) {
      const bucketKey = `${bucket}`
      entry.buckets.set(bucketKey, (entry.buckets.get(bucketKey) || 0) + 1)
    }
  }
  // +Inf bucket 包含所有
  entry.buckets.set('+Inf', entry.count)
}

// ============ 输出 Prometheus 格式 ============

export function generatePrometheusOutput(): string {
  const lines: string[] = []

  for (const metric of metrics.values()) {
    // HELP 行
    lines.push(`# HELP ${metric.name} ${metric.help}`)
    // TYPE 行
    lines.push(`# TYPE ${metric.name} ${metric.type}`)

    if (metric.type === 'counter' || metric.type === 'gauge') {
      for (const [key, value] of metric.entries) {
        const labels = key ? `{${key}}` : ''
        lines.push(`${metric.name}${labels} ${value}`)
      }
    } else if (metric.type === 'histogram') {
      for (const [key, entry] of metric.entries) {
        const labels = key ? `${key},` : ''
        // bucket 行
        for (const bucket of (metric as HistogramDef).buckets) {
          const bucketKey = `${bucket}`
          const count = entry.buckets.get(bucketKey) || 0
          lines.push(`${metric.name}_bucket{${labels}le="${bucket}"} ${count}`)
        }
        // +Inf bucket
        lines.push(`${metric.name}_bucket{${labels}le="+Inf"} ${entry.count}`)
        // sum 和 count
        lines.push(`${metric.name}_sum{${key}} ${entry.sum}`)
        lines.push(`${metric.name}_count{${key}} ${entry.count}`)
      }
    }

    lines.push('') // 空行分隔
  }

  return lines.join('\n')
}

// ============ 预定义指标 ============

// HTTP 请求计数
registerCounter('ai_router_http_requests_total', 'Total number of HTTP requests')
// HTTP 请求延迟
registerHistogram('ai_router_http_request_duration_seconds', 'HTTP request duration in seconds', [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60])
// 上游请求计数
registerCounter('ai_router_upstream_requests_total', 'Total number of upstream API requests')
// 上游请求延迟
registerHistogram('ai_router_upstream_request_duration_seconds', 'Upstream API request duration in seconds', [0.1, 0.5, 1, 2, 5, 10, 30, 60])
// 上游错误计数
registerCounter('ai_router_upstream_errors_total', 'Total number of upstream API errors')
// Token 使用量
registerCounter('ai_router_tokens_total', 'Total tokens used', )
// 费用
registerCounter('ai_router_cost_total', 'Total cost in USD')
// 活跃渠道数
registerGauge('ai_router_channels_active', 'Number of active channels')
// 活跃 Key 数
registerGauge('ai_router_keys_active', 'Number of active API keys')
// 限流拒绝数
registerCounter('ai_router_rate_limit_rejected_total', 'Total number of rate-limited requests')

// ============ 便捷方法 ============

/**
 * 记录 HTTP 请求
 */
export function recordHttpRequest(method: string, path: string, status: number, durationMs: number) {
  incCounter('ai_router_http_requests_total', { method, path, status: String(status) })
  observeHistogram('ai_router_http_request_duration_seconds', durationMs / 1000, { method, path })
}

/**
 * 记录上游请求
 */
export function recordUpstreamRequest(provider: string, model: string, status: number, durationMs: number) {
  incCounter('ai_router_upstream_requests_total', { provider, model, status: String(status) })
  observeHistogram('ai_router_upstream_request_duration_seconds', durationMs / 1000, { provider, model })
  if (status >= 400) {
    incCounter('ai_router_upstream_errors_total', { provider, model, status: String(status) })
  }
}

/**
 * 记录 Token 使用
 */
export function recordTokenUsage(model: string, promptTokens: number, completionTokens: number) {
  incCounter('ai_router_tokens_total', { model, type: 'prompt' }, promptTokens)
  incCounter('ai_router_tokens_total', { model, type: 'completion' }, completionTokens)
}

/**
 * 记录费用
 */
export function recordCost(model: string, cost: number) {
  incCounter('ai_router_cost_total', { model }, cost)
}

/**
 * 记录限流拒绝
 */
export function recordRateLimitRejected(keyPrefix: string) {
  incCounter('ai_router_rate_limit_rejected_total', { key_type: keyPrefix })
}