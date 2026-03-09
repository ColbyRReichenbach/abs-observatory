import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateAiArtifactGeneration } from "@/lib/server/ai-generations";
import { assertValidCsrf } from "@/lib/server/csrf";

const artifactSchema = z.object({
  surfaceKey: z.literal("chart_insight"),
  surfaceDetail: z.string().trim().min(1).max(120).optional().nullable(),
  targetType: z.enum(["chart_insight", "challenge_summary"]),
  targetId: z.string().trim().min(1).max(512),
  routeScope: z.string().trim().max(80).optional().nullable(),
  routeEntityId: z.string().trim().max(120).optional().nullable(),
  articleId: z.string().uuid().optional().nullable(),
  gamePk: z.number().int().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    assertValidCsrf(request);
    const body = artifactSchema.parse(await request.json());
    const generationId = await getOrCreateAiArtifactGeneration(body);
    return NextResponse.json({ generationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register artifact";
    const status = message.startsWith("CSRF") ? 403 : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
