import { NextResponse } from "next/server";
import { z } from "zod";

import { getArticleBySlug, publishArticle, updateArticleDraft } from "@/lib/server/articles";
import { logServerError } from "@/lib/server/logging";

const sectionSchema = z.object({
  sectionKey: z.string().min(1).max(120),
  sectionKind: z.enum(["fact", "derived_metric", "hypothesis"]),
  heading: z.string().min(1).max(160),
  bodyMd: z.string().min(1),
  sectionOrder: z.number().int().min(1),
  evidencePayload: z.unknown().optional(),
});

const patchSchema = z.object({
  action: z.enum(["update", "publish"]),
  title: z.string().min(1).max(180).optional(),
  dek: z.string().max(280).nullable().optional(),
  bodyMd: z.string().min(1).optional(),
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

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  return NextResponse.json({ article });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const input = patchSchema.parse(await request.json());

    if (input.action === "publish") {
      await publishArticle(request, slug);
      return NextResponse.json({ ok: true });
    }

    await updateArticleDraft(request, slug, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("api.articles.slug.patch", error, { slug });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid article payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to update article";
    if (message === "Verified identity required" || message === "Forbidden" || message.startsWith("CSRF")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Article not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "New signups are temporarily disabled") {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
