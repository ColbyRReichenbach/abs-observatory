import { revalidatePath } from "next/cache";

import { sql, sqlOne } from "@/lib/db";
import type { EditorialArticleStatus, EditorialRunStatus, EditorialValidationState } from "@/lib/editorial-workflow";
import { clearCachedValue, getCacheKey } from "@/lib/server/scale";
import { requireOwnerAdmin } from "@/lib/server/admin";
import { writeAuditLog } from "@/lib/server/audit";
import { generateDailyAutoArticle } from "@/lib/server/articles";

type EditorialRunRow = {
  generationrunid: string;
  articletype: string | null;
  sourcedate: string | null;
  status: EditorialRunStatus;
  selectedauthor: string | null;
  storytheme: string | null;
  validationstate: EditorialValidationState;
  errormessage: string | null;
  startedat: string;
  finishedat: string | null;
  articleid: string | null;
  articleslug: string | null;
  articletitle: string | null;
  articlestatus: EditorialArticleStatus;
  articlepublishedat: string | null;
  authorprovider: string | null;
  authormodelname: string | null;
  authorgenerationid: string | null;
  inputtokens: number | null;
  outputtokens: number | null;
  estimatedcostusd: string | number | null;
  latencyms: number | null;
};

type EditorialStepRow = {
  generationstepid: string;
  stepkey: string;
  agentname: string;
  status: string;
  provider: string | null;
  modelname: string | null;
  generationid: string | null;
  inputtokens: number | null;
  outputtokens: number | null;
  estimatedcostusd: string | number | null;
  latencyms: number | null;
  errormessage: string | null;
  inputpayload: unknown;
  outputpayload: unknown;
  startedat: string;
  finishedat: string | null;
};

export type EditorialRunSummary = {
  generationRunId: string;
  articleType: string | null;
  sourceDate: string | null;
  status: EditorialRunStatus;
  selectedAuthor: string | null;
  storyTheme: string | null;
  validationState: EditorialValidationState;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  articleId: string | null;
  articleSlug: string | null;
  articleTitle: string | null;
  articleStatus: EditorialArticleStatus;
  articlePublishedAt: string | null;
  authorProvider: string | null;
  authorModelName: string | null;
  authorGenerationId: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number | null;
};

export type EditorialRunDetail = EditorialRunSummary & {
  steps: Array<{
    generationStepId: string;
    stepKey: string;
    agentName: string;
    status: string;
    provider: string | null;
    modelName: string | null;
    generationId: string | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    latencyMs: number | null;
    errorMessage: string | null;
    inputPayload: unknown;
    outputPayload: unknown;
    startedAt: string;
    finishedAt: string | null;
  }>;
};

export type EditorialOpsOverview = {
  totalRuns: number;
  persistedRuns: number;
  failedRuns: number;
  publishedArticles: number;
  generatedArticles: number;
  suppressedArticles: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  latestSourceDate: string | null;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function mapRun(row: EditorialRunRow): EditorialRunSummary {
  const inputTokens = toNumber(row.inputtokens);
  const outputTokens = toNumber(row.outputtokens);
  return {
    generationRunId: row.generationrunid,
    articleType: row.articletype,
    sourceDate: row.sourcedate,
    status: row.status,
    selectedAuthor: row.selectedauthor,
    storyTheme: row.storytheme,
    validationState: row.validationstate,
    errorMessage: row.errormessage,
    startedAt: row.startedat,
    finishedAt: row.finishedat,
    articleId: row.articleid,
    articleSlug: row.articleslug,
    articleTitle: row.articletitle,
    articleStatus: row.articlestatus,
    articlePublishedAt: row.articlepublishedat,
    authorProvider: row.authorprovider,
    authorModelName: row.authormodelname,
    authorGenerationId: row.authorgenerationid,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: toNumber(row.estimatedcostusd),
    latencyMs: row.latencyms === null ? null : Number(row.latencyms),
  };
}

async function listRunRows(limit: number) {
  return sql<EditorialRunRow>(
    `
    SELECT
      gr.generation_run_id AS generationRunId,
      gr.article_type AS articleType,
      gr.source_date::text AS sourceDate,
      gr.status,
      gr.selected_author AS selectedAuthor,
      gr.story_theme AS storyTheme,
      gr.validation_state AS validationState,
      gr.error_message AS errorMessage,
      gr.started_at AS startedAt,
      gr.finished_at AS finishedAt,
      a.article_id AS articleId,
      a.slug AS articleSlug,
      a.title AS articleTitle,
      a.status AS articleStatus,
      a.published_at AS articlePublishedAt,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.provider END) AS authorProvider,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.model_name END) AS authorModelName,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.generation_id::text END) AS authorGenerationId,
      COALESCE(SUM(gs.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(gs.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(gs.estimated_cost_usd), 0) AS estimatedCostUsd,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.latency_ms END) AS latencyMs
    FROM editorial.generation_runs gr
    LEFT JOIN editorial.articles a ON a.article_id = gr.article_id
    LEFT JOIN editorial.generation_steps gs ON gs.generation_run_id = gr.generation_run_id
    GROUP BY
      gr.generation_run_id,
      gr.article_type,
      gr.source_date,
      gr.status,
      gr.selected_author,
      gr.story_theme,
      gr.validation_state,
      gr.error_message,
      gr.started_at,
      gr.finished_at,
      a.article_id,
      a.slug,
      a.title,
      a.status,
      a.published_at
    ORDER BY gr.started_at DESC
    LIMIT $1
    `,
    [limit],
  );
}

export async function getEditorialOpsOverview(): Promise<EditorialOpsOverview> {
  await requireOwnerAdmin();

  const [overview, latestRun] = await Promise.all([
    sqlOne<{
      totalruns: number;
      persistedruns: number;
      failedruns: number;
      publishedarticles: number;
      generatedarticles: number;
      suppressedarticles: number;
      totaltokens: number | null;
      totalestimatedcostusd: string | number | null;
    }>(
      `
      SELECT
        COUNT(*) AS totalRuns,
        COUNT(*) FILTER (WHERE gr.status = 'persisted') AS persistedRuns,
        COUNT(*) FILTER (WHERE gr.status = 'failed') AS failedRuns,
        COUNT(*) FILTER (WHERE a.status = 'published') AS publishedArticles,
        COUNT(*) FILTER (WHERE a.status = 'generated') AS generatedArticles,
        COUNT(*) FILTER (WHERE a.status = 'suppressed') AS suppressedArticles,
        COALESCE(SUM(COALESCE(gs.input_tokens, 0) + COALESCE(gs.output_tokens, 0)), 0) AS totalTokens,
        COALESCE(SUM(gs.estimated_cost_usd), 0) AS totalEstimatedCostUsd
      FROM editorial.generation_runs gr
      LEFT JOIN editorial.articles a ON a.article_id = gr.article_id
      LEFT JOIN editorial.generation_steps gs ON gs.generation_run_id = gr.generation_run_id
      `,
    ),
    sqlOne<{ sourcedate: string | null }>(
      `
      SELECT source_date::text AS sourceDate
      FROM editorial.generation_runs
      WHERE source_date IS NOT NULL
      ORDER BY source_date DESC, started_at DESC
      LIMIT 1
      `,
    ),
  ]);

  return {
    totalRuns: Number(overview?.totalruns ?? 0),
    persistedRuns: Number(overview?.persistedruns ?? 0),
    failedRuns: Number(overview?.failedruns ?? 0),
    publishedArticles: Number(overview?.publishedarticles ?? 0),
    generatedArticles: Number(overview?.generatedarticles ?? 0),
    suppressedArticles: Number(overview?.suppressedarticles ?? 0),
    totalTokens: Number(overview?.totaltokens ?? 0),
    totalEstimatedCostUsd: toNumber(overview?.totalestimatedcostusd),
    latestSourceDate: latestRun?.sourcedate ?? null,
  };
}

export async function listEditorialRuns(limit = 12): Promise<EditorialRunSummary[]> {
  await requireOwnerAdmin();
  const rows = await listRunRows(limit);
  return rows.map(mapRun);
}

export async function getEditorialRunDetail(generationRunId: string): Promise<EditorialRunDetail | null> {
  await requireOwnerAdmin();

  const run = await sqlOne<EditorialRunRow>(
    `
    SELECT
      gr.generation_run_id AS generationRunId,
      gr.article_type AS articleType,
      gr.source_date::text AS sourceDate,
      gr.status,
      gr.selected_author AS selectedAuthor,
      gr.story_theme AS storyTheme,
      gr.validation_state AS validationState,
      gr.error_message AS errorMessage,
      gr.started_at AS startedAt,
      gr.finished_at AS finishedAt,
      a.article_id AS articleId,
      a.slug AS articleSlug,
      a.title AS articleTitle,
      a.status AS articleStatus,
      a.published_at AS articlePublishedAt,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.provider END) AS authorProvider,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.model_name END) AS authorModelName,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.generation_id::text END) AS authorGenerationId,
      COALESCE(SUM(gs.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(gs.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(gs.estimated_cost_usd), 0) AS estimatedCostUsd,
      MAX(CASE WHEN gs.step_key = 'author_draft' THEN gs.latency_ms END) AS latencyMs
    FROM editorial.generation_runs gr
    LEFT JOIN editorial.articles a ON a.article_id = gr.article_id
    LEFT JOIN editorial.generation_steps gs ON gs.generation_run_id = gr.generation_run_id
    WHERE gr.generation_run_id = $1
    GROUP BY
      gr.generation_run_id,
      gr.article_type,
      gr.source_date,
      gr.status,
      gr.selected_author,
      gr.story_theme,
      gr.validation_state,
      gr.error_message,
      gr.started_at,
      gr.finished_at,
      a.article_id,
      a.slug,
      a.title,
      a.status,
      a.published_at
    LIMIT 1
    `,
    [generationRunId],
  );

  if (!run) {
    return null;
  }

  const steps = await sql<EditorialStepRow>(
    `
    SELECT
      generation_step_id AS generationStepId,
      step_key AS stepKey,
      agent_name AS agentName,
      status,
      provider,
      model_name AS modelName,
      generation_id::text AS generationId,
      input_tokens AS inputTokens,
      output_tokens AS outputTokens,
      estimated_cost_usd AS estimatedCostUsd,
      latency_ms AS latencyMs,
      error_message AS errorMessage,
      input_payload AS inputPayload,
      output_payload AS outputPayload,
      started_at AS startedAt,
      finished_at AS finishedAt
    FROM editorial.generation_steps
    WHERE generation_run_id = $1
    ORDER BY
      CASE step_key
        WHEN 'scout_brief' THEN 1
        WHEN 'telemetry_research' THEN 2
        WHEN 'author_draft' THEN 3
        WHEN 'editor_validation' THEN 4
        WHEN 'persist_article' THEN 5
        ELSE 99
      END ASC,
      started_at ASC
    `,
    [generationRunId],
  );

  return {
    ...mapRun(run),
    steps: steps.map((step) => ({
      generationStepId: step.generationstepid,
      stepKey: step.stepkey,
      agentName: step.agentname,
      status: step.status,
      provider: step.provider,
      modelName: step.modelname,
      generationId: step.generationid,
      inputTokens: Number(step.inputtokens ?? 0),
      outputTokens: Number(step.outputtokens ?? 0),
      estimatedCostUsd: toNumber(step.estimatedcostusd),
      latencyMs: step.latencyms === null ? null : Number(step.latencyms),
      errorMessage: step.errormessage,
      inputPayload: step.inputpayload,
      outputPayload: step.outputpayload,
      startedAt: step.startedat,
      finishedAt: step.finishedat,
    })),
  };
}

function revalidateEditorialPaths(slug: string | null) {
  clearCachedValue(getCacheKey(["published-articles", 20]));
  if (slug) {
    clearCachedValue(getCacheKey(["published-article", slug]));
    revalidatePath(`/articles/${slug}`);
  }
  revalidatePath("/articles");
  revalidatePath("/admin/editorial");
}

export async function rerunDailyAutoArticleAdmin(sourceDate: string) {
  const viewer = await requireOwnerAdmin();
  const article = await generateDailyAutoArticle(sourceDate);

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "editorial_daily_auto_rerun",
    targetType: "editorial.source_date",
    targetId: sourceDate,
    metadata: {
      articleId: article.articleId,
      slug: article.slug,
      status: article.status,
      validationState: article.validationState,
    },
  });

  revalidateEditorialPaths(article.slug);
  return article;
}

export async function publishArticleFromAdmin(slug: string) {
  const viewer = await requireOwnerAdmin();

  const current = await sqlOne<{
    articleid: string;
    slug: string;
    status: string;
    validationstate: string;
  }>(
    `
    SELECT
      article_id AS articleId,
      slug,
      status,
      validation_state AS validationState
    FROM editorial.articles
    WHERE slug = $1
    LIMIT 1
    `,
    [slug],
  );

  if (!current) {
    throw new Error("Article not found");
  }

  if (current.status === "published") {
    return { articleId: current.articleid, slug: current.slug };
  }

  if (current.validationstate !== "passed") {
    throw new Error("Only validation-passed articles can be published");
  }

  if (current.status === "suppressed" || current.status === "failed") {
    throw new Error("Blocked articles cannot be published from the desk");
  }

  if (current.status !== "generated" && current.status !== "draft") {
    throw new Error("Article is not in a publishable desk state");
  }

  const row = await sqlOne<{ articleid: string; slug: string }>(
    `
    UPDATE editorial.articles
    SET
      status = 'published',
      validation_state = 'passed',
      published_at = COALESCE(published_at, NOW()),
      updated_at = NOW()
    WHERE slug = $1
    RETURNING article_id AS articleId, slug
    `,
    [slug],
  );

  if (!row) {
    throw new Error("Article not found");
  }

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "editorial_article_published",
    targetType: "editorial.article",
    targetId: row.articleid,
    metadata: { slug },
  });

  revalidateEditorialPaths(row.slug);
  return { articleId: row.articleid, slug: row.slug };
}

export async function suppressArticleFromAdmin(articleId: string) {
  const viewer = await requireOwnerAdmin();

  const row = await sqlOne<{ articleid: string; slug: string | null }>(
    `
    UPDATE editorial.articles
    SET
      status = 'suppressed',
      updated_at = NOW()
    WHERE article_id = $1::uuid
    RETURNING article_id AS articleId, slug
    `,
    [articleId],
  );

  if (!row) {
    throw new Error("Article not found");
  }

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "editorial_article_suppressed",
    targetType: "editorial.article",
    targetId: row.articleid,
    metadata: { slug: row.slug },
  });

  revalidateEditorialPaths(row.slug);
  return { articleId: row.articleid, slug: row.slug };
}
