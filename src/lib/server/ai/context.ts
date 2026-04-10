import type { ChartInsightPayload } from "@/lib/chart-insight-payload";
import type { CopilotContext } from "@/lib/copilot-context";
import type { ViewerProfile } from "@/lib/server/profiles";

import type { AiChatSurface } from "./request-schema";
import type { SurfaceTaskFamily } from "./task-family";

export type AiAudienceMode = "fan" | "org";

export type AiSurfaceExecutionContext = {
  surface: AiChatSurface;
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
  viewer?: ViewerProfile | null;
};

export function resolveAiAudienceMode(viewer?: ViewerProfile | null): AiAudienceMode {
  if (!viewer) return "fan";
  return viewer.roles.includes("owner") || viewer.roles.includes("admin") ? "org" : "fan";
}
