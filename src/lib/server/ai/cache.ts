import { getCacheKey } from "@/lib/server/scale";

import type { AiChatSurface } from "./request-schema";

type BuildSurfaceCacheKeyParams = {
  surface: AiChatSurface;
  promptVersion: string;
  modelName: string;
  dataVersion: string | null;
  scope: string;
  entityId: string | null;
  range: string | null;
  taskFamily: string;
  chartKey?: string | null;
  promptFingerprint?: string | null;
  message: string;
};

export function buildSurfaceCacheKey(params: BuildSurfaceCacheKeyParams) {
  return getCacheKey([
    "ai-surface",
    params.surface,
    params.promptVersion,
    params.modelName,
    params.dataVersion ?? "unknown",
    params.scope,
    params.entityId ?? "none",
    params.range ?? "default",
    params.taskFamily,
    params.chartKey ?? "none",
    params.promptFingerprint ?? "none",
    params.message.trim().toLowerCase(),
  ]);
}
