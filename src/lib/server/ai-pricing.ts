const MODEL_PRICING = [
  { provider: "openai", modelName: "gpt-4.1-mini", inputCostPer1M: 0.4, outputCostPer1M: 1.6 },
  { provider: "openai", modelName: "gpt-4o", inputCostPer1M: 2.5, outputCostPer1M: 10 },
  { provider: "anthropic", modelName: "claude-sonnet-4", inputCostPer1M: 3, outputCostPer1M: 15 },
  { provider: "anthropic", modelName: "claude-3-7-sonnet", inputCostPer1M: 3, outputCostPer1M: 15 },
] as const;

function resolvePricing(provider: string, modelName: string) {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedModel = modelName.trim().toLowerCase();

  return (
    MODEL_PRICING.find(
      (entry) =>
        entry.provider === normalizedProvider &&
        (normalizedModel === entry.modelName || normalizedModel.startsWith(`${entry.modelName}-`)),
    ) ??
    (normalizedProvider === "openai" && normalizedModel.includes("mini")
      ? { provider: "openai", modelName: "gpt-4.1-mini", inputCostPer1M: 0.4, outputCostPer1M: 1.6 }
      : normalizedProvider === "openai"
        ? { provider: "openai", modelName: "gpt-4o", inputCostPer1M: 2.5, outputCostPer1M: 10 }
        : normalizedProvider === "anthropic"
          ? { provider: "anthropic", modelName: "claude-sonnet-4", inputCostPer1M: 3, outputCostPer1M: 15 }
          : null)
  );
}

export function estimateAiCostUsd(input: {
  provider: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = resolvePricing(input.provider, input.modelName);
  if (!pricing) return 0;

  const inputCost = (input.inputTokens / 1_000_000) * pricing.inputCostPer1M;
  const outputCost = (input.outputTokens / 1_000_000) * pricing.outputCostPer1M;
  return Number((inputCost + outputCost).toFixed(6));
}
