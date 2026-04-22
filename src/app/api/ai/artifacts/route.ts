import { NextResponse } from "next/server";
import { z } from "zod";

import { coerceInternalRouteScope } from "@/lib/ai-share";
import { listViewerAiArtifacts, registerAiArtifact } from "@/lib/server/ai-generations";
import { assertValidCsrf } from "@/lib/server/csrf";
import { getViewerProfile } from "@/lib/server/profiles";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

const artifactSchema = z.object({
  surfaceKey: z.enum(["chart_insight", "visualizer"]),
  surfaceDetail: z.string().trim().min(1).max(120).optional().nullable(),
  targetType: z.enum(["chart_insight", "challenge_summary", "visualizer_chart"]),
  targetId: z.string().trim().min(1).max(512),
  routeScope: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((value) => coerceInternalRouteScope(value)),
  routeEntityId: z.string().trim().max(120).optional().nullable(),
  articleId: z.string().uuid().optional().nullable(),
  gamePk: z.number().int().optional().nullable(),
  title: z.string().trim().max(180).optional().nullable(),
  summary: z.string().trim().max(320).optional().nullable(),
  artifactPayload: z.unknown().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const viewer = await getViewerProfile(request);
    if (!viewer) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 12), 1), 50);
    const artifacts = viewer.aiHistoryEnabled ? await listViewerAiArtifacts(viewer.userId, limit) : [];

    return NextResponse.json(
      {
        enabled: viewer.aiHistoryEnabled,
        artifacts,
      },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved artifacts";
    return NextResponse.json({ error: message }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    assertValidCsrf(request);
    const body = artifactSchema.parse(await request.json());
    const viewer = await getViewerProfile(request);
    const result = await registerAiArtifact({
      ...body,
      userId: viewer?.aiHistoryEnabled ? viewer.userId : null,
    });
    return NextResponse.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register artifact";
    const status = message.startsWith("CSRF") ? 403 : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
