// API 限流模块
// 支持按 API Key 和 IP 地址的滑动窗口限流

// 限流配置
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM || '60', 10); // 每分钟请求数
const RATE_LIMIT_IP_RPM = parseInt(process.env.RATE_LIMIT_IP_RPM || '120', 10); // 每 IP 每分钟请求数
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false'; // 默认启用

interface RateLimitEntry {
  timestamps: number[];
}

// 内存存储（单实例足够，Next.js API Routes 在同一进程）
const keyStore = new Map<string, RateLimitEntry>();
const ipStore = new Map<string, RateLimitEntry>();

// 清理间隔：每 5 分钟清理过期条目
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const WINDOW_MS = 60 * 1000; // 1 分钟窗口

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 启动清理定时器
 */
export function startRateLimitCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;

    for (const [key, entry] of keyStore) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) keyStore.delete(key);
    }

    for (const [ip, entry] of ipStore) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) ipStore.delete(ip);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * 停止清理定时器
 */
export function stopRateLimitCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // 窗口重置时间（Unix ms）
}

/**
 * 滑动窗口限流检查
 */
function checkLimit(
  store: Map<string, RateLimitEntry>,
  identifier: string,
  limit: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // 移除窗口外的记录
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, limit - entry.timestamps.length);
  const allowed = entry.timestamps.length < limit;

  if (allowed) {
    entry.timestamps.push(now);
  }

  // 计算窗口重置时间（最早的请求过期时间）
  const resetAt =
    entry.timestamps.length > 0
      ? entry.timestamps[0] + WINDOW_MS
      : now + WINDOW_MS;

  return { allowed, limit, remaining: allowed ? remaining - 1 : 0, resetAt };
}

/**
 * 按 API Key 限流检查
 */
export function checkKeyRateLimit(keyValue: string): RateLimitResult {
  if (!RATE_LIMIT_ENABLED) {
    return {
      allowed: true,
      limit: RATE_LIMIT_RPM,
      remaining: RATE_LIMIT_RPM,
      resetAt: Date.now() + WINDOW_MS
    };
  }
  return checkLimit(keyStore, `key:${keyValue}`, RATE_LIMIT_RPM);
}

/**
 * 按 IP 地址限流检查
 */
export function checkIpRateLimit(ip: string): RateLimitResult {
  if (!RATE_LIMIT_ENABLED) {
    return {
      allowed: true,
      limit: RATE_LIMIT_IP_RPM,
      remaining: RATE_LIMIT_IP_RPM,
      resetAt: Date.now() + WINDOW_MS
    };
  }
  return checkLimit(ipStore, `ip:${ip}`, RATE_LIMIT_IP_RPM);
}

/**
 * 获取客户端 IP（考虑代理头）
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  console.log('Extracted IP from headers:', { forwarded, realIp });
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

/**
 * 组合限流检查：同时检查 Key 和 IP
 * 返回更严格的限制结果
 */
export function checkRateLimit(keyValue: string, ip: string): RateLimitResult {
  const keyResult = checkKeyRateLimit(keyValue);
  const ipResult = checkIpRateLimit(ip);

  // 返回更严格的那个
  if (!keyResult.allowed || !ipResult.allowed) {
    return {
      allowed: false,
      limit: Math.min(keyResult.limit, ipResult.limit),
      remaining: 0,
      resetAt: Math.min(keyResult.resetAt, ipResult.resetAt)
    };
  }

  return {
    allowed: true,
    limit: keyResult.limit,
    remaining: Math.min(keyResult.remaining, ipResult.remaining),
    resetAt: Math.max(keyResult.resetAt, ipResult.resetAt)
  };
}
