// 模型费率配置
// 费率单位: 美元/1K tokens

export interface PricingConfig {
  inputCostPer1K: number;
  outputCostPer1K: number;
  // 简化计费时使用的统一费率
  flatRatePer1K?: number;
}

export const MODEL_PRICING: Record<string, PricingConfig> = {
  // DeepSeek
  'deepseek-v4-pro': {
    inputCostPer1K: 0.001,
    outputCostPer1K: 0.002
  },
  'deepseek-chat': {
    inputCostPer1K: 0.001,
    outputCostPer1K: 0.002
  },
  // 智谱
  'glm-5': {
    inputCostPer1K: 0.0015,
    outputCostPer1K: 0.0015
  },
  'glm-4-flash': {
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0005
  },
  // 通义千问
  'qwen-plus': {
    inputCostPer1K: 0.0008,
    outputCostPer1K: 0.002
  },
  'qwen-max': {
    inputCostPer1K: 0.005,
    outputCostPer1K: 0.01
  },
  // MiniMax
  'MiniMax-M2.7': {
    inputCostPer1K: 0.001,
    outputCostPer1K: 0.004
  }
};

// 兼容旧配置的默认费率
export const DEFAULT_RATE_MULTIPLIER = 1.0;
export const DEFAULT_COST_PER_1K = 0.01;

/**
 * 计算请求成本
 * @param model 模型名称
 * @param usage token使用统计
 * @param fallbackRate 降级使用的统一费率
 */
export function calculateCost(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number },
  fallbackRate: number = DEFAULT_COST_PER_1K
): number {
  const pricing = MODEL_PRICING[model];

  if (pricing) {
    const inputCost = (usage.prompt_tokens / 1000) * pricing.inputCostPer1K;
    const outputCost =
      (usage.completion_tokens / 1000) * pricing.outputCostPer1K;
    return parseFloat((inputCost + outputCost).toFixed(10));
  }

  // 降级：使用统一费率
  const totalTokens = usage.prompt_tokens + usage.completion_tokens;
  return parseFloat(((totalTokens / 1000) * fallbackRate).toFixed(10));
}

/**
 * 估算流式请求成本（无 usage 时）
 */
export function estimateStreamingCost(model: string): number {
  const pricing = MODEL_PRICING[model];
  if (pricing) {
    // 假设平均 500 tokens 输出
    return parseFloat(((500 / 1000) * pricing.outputCostPer1K).toFixed(10));
  }
  return 0.001; // 保底费用
}
