import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { validateKey, deductBalance } from '@/lib/keys';
import {
  getChannelByModel,
  getChannelForAuto,
  updateChannelHealth,
  type Channel
} from '@/lib/channels';
import { logRequest } from '@/lib/usage';
import { v4 as uuidv4 } from 'uuid';
import {
  resolveModel,
  buildUpstreamUrl,
  sanitizeRequestBody
} from '@/lib/models';
import { calculateCost } from '@/config/pricing';
import {
  AuthError,
  ValidationError,
  UpstreamError,
  AppError,
  createErrorResponse
} from '@/lib/errors';
import { validateChatRequest } from '@/lib/validator';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  recordHttpRequest,
  recordUpstreamRequest,
  recordTokenUsage,
  recordCost,
  recordRateLimitRejected
} from '@/lib/metrics';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ChatCompletions');

// 请求超时设置
const PROXY_TIMEOUT_MS = 120000;
const UPSTREAM_TIMEOUT_MS = 115000; // 略小于 proxy timeout

/**
 * 验证 API Key
 */
function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError(
      'Missing API key. Use: Authorization: Bearer sk-router-xxx'
    );
  }

  const apiKey = validateKey(authHeader.slice(7));
  if (!apiKey) {
    throw new AuthError('Invalid or disabled API key');
  }

  // 限流检查
  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(authHeader.slice(7), ip);
  if (!rateLimitResult.allowed) {
    recordRateLimitRejected('api_key');
    const error = new AppError(
      `Rate limit exceeded. Limit: ${rateLimitResult.limit} requests per minute.`,
      'rate_limit_exceeded',
      429
    );
    (error as any).rateLimit = rateLimitResult;
    throw error;
  }

  return { apiKey, rateLimitResult };
}

/**
 * 解析并验证渠道
 */
async function resolveChannel(rawModel: string): Promise<Channel> {
  const model = resolveModel(rawModel || 'auto');

  if (model === 'auto') {
    const channel = await getChannelForAuto();
    if (!channel) {
      throw new ValidationError('No available channels for auto routing');
    }
    return channel;
  }

  const channel = await getChannelByModel(model);
  if (!channel) {
    throw new ValidationError(
      `Model '${rawModel}' not available. Supported: deepseek-v4, glm-5, qwen-plus, minimax-m2.7, auto`
    );
  }

  return channel;
}

/**
 * 构建上游请求（处理不同供应商的 API 格式）
 */
function buildUpstreamRequest(
  channel: Channel,
  body: any
): { url: string; headers: Record<string, string>; body: unknown } {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${channel.api_key}`
  };

  const sanitizedBody = sanitizeRequestBody(
    { ...body, model: channel.model_name },
    channel.provider
  );
  logger.debug('Upstream request body', {
    provider: channel.provider,
    model: channel.model_name,
    messages: sanitizedBody.messages?.map((m: any) => ({
      role: m.role,
      contentLength: m.content?.length
    }))
  });

  return {
    url: buildUpstreamUrl(
      channel.base_url,
      channel.provider,
      'chat/completions'
    ),
    headers,
    body: sanitizedBody
  };
}

/**
 * 代理请求到上游
 */
async function proxyToUpstream(
  channel: Channel,
  body: any,
  abortSignal: AbortSignal
): Promise<Response> {
  const req = buildUpstreamRequest(channel, body);

  const response = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(req.body),
    signal: abortSignal
  });

  return response;
}

/**
 * 构建速率限制响应头
 */
function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetAt: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000))
  };
}

/**
 * 处理非流式响应
 */
async function handleNonStreamResponse(
  upstream: Response,
  channel: Channel,
  apiKey: { id: number },
  requestId: string,
  startTime: number,
  requestedModel: string,
  rateLimitHeaders: Record<string, string>
): Promise<Response> {
  const data = await upstream.json();
  const latencyMs = Date.now() - startTime;

  const usage = data.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  };

  const cost = calculateCost(
    channel.model_name,
    usage,
    channel.rate_multiplier * 0.01
  );

  deductBalance(apiKey.id, cost);
  logRequest({
    request_id: requestId,
    api_key_id: apiKey.id,
    channel_id: channel.id,
    model: requestedModel,
    prompt_tokens: usage.prompt_tokens || 0,
    completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    cost,
    latency_ms: latencyMs,
    status: 'success',
    error_message: null,
    is_stream: 0
  });

  recordUpstreamRequest(channel.provider, channel.model_name, 200, latencyMs);
  recordTokenUsage(
    requestedModel,
    usage.prompt_tokens || 0,
    usage.completion_tokens || 0
  );
  recordCost(requestedModel, cost);

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    ...rateLimitHeaders
  };

  return Response.json({ ...data, model: requestedModel }, { headers });
}

/**
 * 处理流式响应
 */
function handleStreamResponse(
  upstream: Response,
  channel: Channel,
  apiKey: { id: number },
  requestId: string,
  startTime: number,
  requestedModel: string,
  rateLimitHeaders: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let isCompleted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);

            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));

              if (!isCompleted) {
                isCompleted = true;
                const latencyMs = Date.now() - startTime;
                const cost =
                  totalUsage.total_tokens > 0
                    ? calculateCost(
                        channel.model_name,
                        totalUsage,
                        channel.rate_multiplier * 0.01
                      )
                    : 0.001;

                deductBalance(apiKey.id, cost);
                logRequest({
                  request_id: requestId,
                  api_key_id: apiKey.id,
                  channel_id: channel.id,
                  model: requestedModel,
                  prompt_tokens: totalUsage.prompt_tokens,
                  completion_tokens: totalUsage.completion_tokens,
                  total_tokens: totalUsage.total_tokens,
                  cost,
                  latency_ms: latencyMs,
                  status: 'success',
                  error_message: null,
                  is_stream: 1
                });
                recordUpstreamRequest(
                  channel.provider,
                  channel.model_name,
                  200,
                  latencyMs
                );
                recordTokenUsage(
                  requestedModel,
                  totalUsage.prompt_tokens,
                  totalUsage.completion_tokens
                );
                recordCost(requestedModel, cost);
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.usage?.total_tokens > 0) {
                totalUsage = {
                  prompt_tokens: parsed.usage.prompt_tokens || 0,
                  completion_tokens: parsed.usage.completion_tokens || 0,
                  total_tokens: parsed.usage.total_tokens || 0
                };
              }

              if (parsed.model) {
                parsed.model = requestedModel;
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`)
              );
            } catch {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        }
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        if (!isCompleted) {
          isCompleted = true;
          logRequest({
            request_id: requestId,
            api_key_id: apiKey.id,
            channel_id: channel.id,
            model: requestedModel,
            prompt_tokens: totalUsage.prompt_tokens,
            completion_tokens: totalUsage.completion_tokens,
            total_tokens: totalUsage.total_tokens,
            cost: 0,
            latency_ms: latencyMs,
            status: 'error',
            error_message: err instanceof Error ? err.message : 'Stream error',
            is_stream: 1
          });
        }
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
      ...rateLimitHeaders
    }
  });
}

/**
 * POST /v1/chat/completions
 */
export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  let rawBody: unknown;

  try {
    // 1. 验证 API Key
    const { apiKey, rateLimitResult } = validateApiKey(request);
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    // 2. 解析并验证请求体
    try {
      rawBody = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = validateChatRequest(rawBody);
    if (!validation.success) {
      throw new ValidationError(validation.error!);
    }
    const body = validation.data!;

    // 3. 解析渠道
    const primaryChannel = await resolveChannel(body.model);
    const isStream = body.stream;

    logger.info('Chat request received', {
      requestId,
      model: body.model,
      channelId: primaryChannel.id,
      provider: primaryChannel.provider,
      stream: isStream,
      messages: body.messages.map((m: any) => ({
        role: m.role,
        content:
          m.content?.substring?.(0, 50) ||
          JSON.stringify(m.content).slice(0, 50)
      }))
    });

    // 4. 构建重试队列
    const sameModelChannel = await getChannelByModel(primaryChannel.model_name);
    const availableChannels = sameModelChannel ? [primaryChannel] : [];
    const retryChannels = primaryChannel.healthy
      ? [primaryChannel, ...availableChannels]
      : [...availableChannels, primaryChannel];

    // 5. 代理请求（带重试）
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      UPSTREAM_TIMEOUT_MS
    );

    let lastError: string | null = null;

    for (const tryChannel of retryChannels) {
      try {
        const upstream = await proxyToUpstream(
          tryChannel,
          body,
          abortController.signal
        );
        clearTimeout(timeoutId);

        if (!upstream.ok) {
          const errText = await upstream.text().catch(() => '');
          lastError = `Upstream ${upstream.status}: ${errText}`;
          recordUpstreamRequest(
            tryChannel.provider,
            tryChannel.model_name,
            upstream.status,
            Date.now() - startTime
          );
          logger.warn('Upstream request failed', {
            requestId,
            channelId: tryChannel.id,
            provider: tryChannel.provider,
            model: tryChannel.model_name,
            status: upstream.status,
            error: errText,
            sentMessages: JSON.stringify(body.messages).slice(0, 500)
          });
          if (tryChannel.id === primaryChannel.id) {
            updateChannelHealth(tryChannel.id, false, null);
          }
          continue;
        }

        // 更新渠道健康状态
        updateChannelHealth(tryChannel.id, true, Date.now() - startTime);

        // 返回流式或非流式响应
        if (isStream) {
          return handleStreamResponse(
            upstream,
            tryChannel,
            apiKey,
            requestId,
            startTime,
            body.model,
            rateLimitHeaders
          );
        } else {
          return handleNonStreamResponse(
            upstream,
            tryChannel,
            apiKey,
            requestId,
            startTime,
            body.model,
            rateLimitHeaders
          );
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Upstream request error', {
          requestId,
          channelId: tryChannel.id,
          error: lastError
        });
        if (tryChannel.id === primaryChannel.id) {
          updateChannelHealth(tryChannel.id, false, null);
        }
        continue;
      }
    }

    // 所有渠道都失败
    throw new UpstreamError(
      lastError || 'All upstream channels failed. Please try again later.'
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    recordHttpRequest(
      'POST',
      '/v1/chat/completions',
      error instanceof AppError ? error.statusCode : 500,
      latencyMs
    );

    if (error instanceof UpstreamError) {
      logger.error('All upstream channels failed', {
        requestId,
        latencyMs,
        error: error.message
      });
      try {
        const authHeader = request.headers.get('authorization');
        const keyValue = authHeader?.slice(7);
        const apiKey = keyValue ? validateKey(keyValue) : null;

        if (apiKey) {
          logRequest({
            request_id: requestId,
            api_key_id: apiKey.id,
            channel_id: 0,
            model: 'unknown',
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            cost: 0,
            latency_ms: latencyMs,
            status: 'error',
            error_message: error.message,
            is_stream: 0
          });
        }
      } catch {
        // 忽略日志记录错误
      }
    } else if (error instanceof AppError) {
      logger.warn('Request error', {
        requestId,
        code: error.code,
        status: error.statusCode,
        message: error.message,
        rawBody: JSON.stringify(rawBody).slice(0, 1000)
      });
    }

    const response = createErrorResponse(error);
    // 附加速率限制头
    if (error instanceof AppError && (error as any).rateLimit) {
      const rlHeaders = getRateLimitHeaders((error as any).rateLimit);
      response.headers.set('X-RateLimit-Limit', rlHeaders['X-RateLimit-Limit']);
      response.headers.set(
        'X-RateLimit-Remaining',
        rlHeaders['X-RateLimit-Remaining']
      );
      response.headers.set('X-RateLimit-Reset', rlHeaders['X-RateLimit-Reset']);
    }
    return response;
  }
}
