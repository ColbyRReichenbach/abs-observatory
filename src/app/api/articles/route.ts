import { NextResponse } from "next/server";
import { z } from "zod";

import { createArticleDraft, generateDailyAutoArticle, listPublishedArticles } from "@/lib/server/articles";
import { enqueueJob } from "@/lib/server/job-queue";
import { logServerError } from "@/lib/server/logging";

const sectionSchema = z.object({
  sectionKey: z.string().min(1).max(120),
  sectionKind: z.enum(["fact", "derived_metric", "hypothesis"]),
  heading: z.string().min(1).max(160),
  bodyMd: z.string().min(1),
  sectionOrder: z.number().int().min(1),
  evidencePayload: z.unknown().optional(),
});

const articleDraftSchema = z.object({
  articleType: z.enum(["daily_auto", "weekly_editorial", "game_daily", "feature", "analysis"]),
  title: z.string().min(1).max(180),
  dek: z.string().max(280).nullable().optional(),
  bodyMd: z.string().min(1),
  sourceDate: z.string().nullable().optional(),
  gamePk: z.number().int().nullable().optional(),
  scheduledPublishAt: z.string().nullable().optional(),
  factsPayload: z.unknown().optional(),
  derivedMetricsPayload: z.unknown().optional(),
  hypothesisPayload: z.unknown().optional(),
  revisionNote: z.string().max(240).nullable().optional(),
  sections: z.array(sectionSchema).optional(),
  evidenceBlobs: z
    .array(
      z.object({
        sectionKey: z.string().optional(),
        evidenceKind: z.enum(["fact", "derived_metric", "hypothesis", "snapshot"]),
        label: z.string().min(1).max(160),
        payload: z.unknown(),
      }),
    )
    .optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);
  const articles = await listPublishedArticles(limit);
  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  try {
    if (mode === "daily-auto") {
      const sourceDate = url.searchParams.get("sourceDate");
      if (!sourceDate) {
        return NextResponse.json({ error: "sourceDate is required" }, { status: 400 });
      }
      if (url.searchParams.get("async") === "true") {
        const job = await enqueueJob({
          jobType: "article_daily_auto",
          payload: { sourceDate },
          idempotencyKey: `article-daily-auto:${sourceDate}`,
          metadata: { enqueuedFrom: "api.articles.daily-auto" },
        });
        return NextResponse.json(
          {
            jobRunId: job.jobRunId,
            status: "queued",
            pollAfterSeconds: 5,
          },
          { status: 202 },
        );
      }
      const article = await generateDailyAutoArticle(sourceDate);
      return NextResponse.json({ article }, { status: 201 });
    }

    const input = articleDraftSchema.parse(await request.json());
    const articleId = await createArticleDraft(request, input);
    return NextResponse.json({ articleId }, { status: 201 });
  } catch (error) {
    logServerError("api.articles.post", error, { mode });
    const message = error instanceof Error ? error.message : "Unable to create article";
    if (message === "Verified identity required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.startsWith("CSRF")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "New signups are temporarily disabled") {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid article payload" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
