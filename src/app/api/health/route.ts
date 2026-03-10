import { NextResponse } from "next/server";

import { sqlOne } from "@/lib/db";
import { validateServerEnv } from "@/lib/server/env";

export async function GET() {
  const startedAt = Date.now();
  const env = validateServerEnv(false);

  try {
    await sqlOne<{ ok: number }>("SELECT 1 AS ok");

    return NextResponse.json({
      ok: true,
      environment: process.env.NODE_ENV ?? "development",
      checks: {
        database: "ok",
        env: env.ok ? "ok" : "degraded",
      },
      envIssues: process.env.NODE_ENV === "production" ? undefined : env.issues.map((issue) => issue.name),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        environment: process.env.NODE_ENV ?? "development",
        checks: {
          database: "failed",
          env: env.ok ? "ok" : "degraded",
        },
        envIssues: process.env.NODE_ENV === "production" ? undefined : env.issues.map((issue) => issue.name),
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown health check error",
      },
      { status: 503 },
    );
  }
}
