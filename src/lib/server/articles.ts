import type { QueryResultRow } from "pg";
import { subDays, format } from "date-fns";
import fs from "fs";
import path from "path";

import { sql, sqlOne, withTransaction } from "@/lib/db";

import { getViewerProfile } from "@/lib/server/profiles";
import { requireRole } from "@/lib/server/roles";
import { clearCachedValue, getCacheKey, withCachedValue } from "@/lib/server/scale";
import { uniqueSlug } from "@/lib/server/slugs";
import { assertValidCsrf } from "@/lib/server/csrf";

function getTeamMeta(teamId: number) {
  try {
    const configPath = path.join(process.cwd(), "src/config/team-motifs.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return config.teams.find((t: any) => t.team_id === teamId) || null;
  } catch (e) {
    return null;
  }
}

export type ArticleKind = "daily_auto" | "weekly_editorial" | "game_daily" | "feature" | "analysis";
export type ArticleStatus = "draft" | "generated" | "published" | "suppressed" | "failed";
export type SectionKind = "fact" | "derived_metric" | "hypothesis";
type GazetteStepKey = "scout_brief" | "telemetry_research" | "author_draft" | "editor_validation" | "persist_article";
type GazetteValidationState = "pending" | "passed" | "failed";
type GazetteRunStatus = "queued" | "running" | "failed" | "validated" | "persisted";

export type ArticleListItem = {
  articleId: string;
  slug: string;
  title: string;
  authorName: string | null;
  dek: string | null;
  articleType: ArticleKind;
  status: ArticleStatus;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  sourceDate: string | null;
  gamePk: number | null;
};

export const EDITORIAL_STAFF = [
  { name: "Abner B. Strike", role: "Veteran Editor", tone: "authoritative & nostalgic" },
  { name: "Bowie Blue", role: "Umpire Auditor", tone: "witty & investigative" },
  { name: "Miles Meridian", role: "Lead Correspondent", tone: "scientific & refined" },
];

export const ANALYST_STAFF = [
  { name: "Theo Telemetry", role: "Lead Data Analyst" },
  { name: "Scout Bot 1", role: "Baseball Analyst" },
  { name: "Atlas Absolute", role: "The Source" },
];

export type ArticleSectionInput = {
  sectionKey: string;
  sectionKind: SectionKind;
  heading: string;
  bodyMd: string;
  sectionOrder: number;
  evidencePayload?: unknown;
};

export type ArticleDetail = ArticleListItem & {
  title: string;
  bodyMd: string;
  validationState: "pending" | "passed" | "failed";
  factsPayload: unknown;
  derivedMetricsPayload: unknown;
  hypothesisPayload: unknown;
  evidencePayload: unknown;
  sections: Array<{
    sectionId: string;
    sectionKey: string;
    sectionKind: SectionKind;
    heading: string;
    bodyMd: string;
    sectionOrder: number;
    evidencePayload: unknown;
  }>;
  evidenceBlobs: Array<{
    evidenceBlobId: string;
    sectionId: string | null;
    evidenceKind: SectionKind | "snapshot";
    label: string;
    payload: unknown;
  }>;
  revisions: Array<{
    revisionId: string;
    revisionNumber: number;
    revisionNote: string | null;
    createdAt: string;
  }>;
  contributors: Array<{
    articleContributorId: string;
    displayName: string;
    role: string;
    contributorType: "author" | "analyst" | "source";
    sortOrder: number;
    metadata: unknown;
  }>;
};

type DailyEditorialSummary = {
  summaryDate: string;
  gamesTracked: number;
  challengesTotal: number;
  overturnsTotal: number;
  overturnRate: number;
  teamsChallenging: number;
  avgTeamChallenges: number;
  teamSummaries: unknown;
};

type WeeklyEditorialSummary = {
  weekStart: string;
  gamesTracked: number;
  challengesTotal: number;
  overturnsTotal: number;
  overturnRate: number;
  avgDailyChallenges: number;
  avgDailyOverturnRate: number;
};

type GazetteContributorInput = {
  displayName: string;
  role: string;
  contributorType: "author" | "analyst" | "source";
  sortOrder: number;
  metadata?: unknown;
};

type ScoutBriefPayload = {
  storyOfDay: {
    headline: string;
    theme: string;
    summary: string;
  };
  leadCandidates: Array<{
    teamId: number;
    challengeTotal: number;
    overturnRate: number;
  }>;
  auditCandidates: Array<{
    kind: string;
    label: string;
  }>;
  milestones: Array<{
    kind: string;
    label: string;
  }>;
  leagueNotes: string[];
};

type TelemetryResearchPayload = {
  trendSummary: string;
  chartIntents: Array<{
    chartKey: string;
    title: string;
    sectionKey: string;
    datasetKey: string;
  }>;
  standingsPulse: Awaited<ReturnType<typeof listLeagueStandingsWithMovement>>;
  evidenceRefs: Array<{
    kind: string;
    key: string;
    sourceDate: string;
  }>;
};

type GazetteDraftPayload = {
  title: string;
  dek: string;
  sections: ArticleSectionInput[];
  bodyMd: string;
  factsPayload: unknown;
  derivedMetricsPayload: unknown;
  hypothesisPayload: unknown;
  evidencePayload: unknown;
  contributors: GazetteContributorInput[];
};

type GazetteValidationPayload = {
  status: GazetteValidationState;
  issues: string[];
  requiredEvidencePresent: boolean;
  sectionCount: number;
};

type GenerateDailyAutoArticleOptions = {
  jobRunId?: string | null;
};

async function requireEditorialAdmin(request: Request) {
  const viewer = await getViewerProfile(request);
  if (!viewer?.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);
  requireRole(viewer.roles, "admin");
  return viewer;
}

function normalizeSections(sections: ArticleSectionInput[]) {
  return sections
    .slice()
    .sort((a, b) => a.sectionOrder - b.sectionOrder)
    .map((section, index) => ({
      ...section,
      sectionOrder: index + 1,
    }));
}

function selectDailyAuthor(sourceDate: string) {
  const seed = sourceDate.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return EDITORIAL_STAFF[seed % EDITORIAL_STAFF.length];
}

function validateAutoArticleSections(sections: ArticleSectionInput[]) {
  const factSections = sections.filter((section) => section.sectionKind === "fact");
  const derivedSections = sections.filter((section) => section.sectionKind === "derived_metric");
  const allHaveEvidence = sections.every((section) => section.evidencePayload !== undefined);

  if (factSections.length === 0) {
    return { ok: false, reason: "At least one fact section is required." };
  }
  if (derivedSections.length === 0) {
    return { ok: false, reason: "At least one derived metric section is required." };
  }
  if (!allHaveEvidence) {
    return { ok: false, reason: "All auto-generated sections must include evidence." };
  }
  return { ok: true as const };
}

async function replaceArticleSections(
  articleId: string,
  sections: ArticleSectionInput[],
  query: <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>,
) {
  await query("DELETE FROM editorial.article_sections WHERE article_id = $1", [articleId]);

  for (const section of normalizeSections(sections)) {
    await query(
      `
      INSERT INTO editorial.article_sections (
        article_id,
        section_key,
        section_kind,
        heading,
        body_md,
        section_order,
        evidence_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        articleId,
        section.sectionKey,
        section.sectionKind,
        section.heading,
        section.bodyMd,
        section.sectionOrder,
        section.evidencePayload ?? null,
      ],
    );
  }
}

async function replaceArticleContributors(
  articleId: string,
  contributors: GazetteContributorInput[],
  query: <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>,
) {
  await query("DELETE FROM editorial.article_contributors WHERE article_id = $1", [articleId]);

  for (const contributor of contributors.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    await query(
      `
      INSERT INTO editorial.article_contributors (
        article_id,
        display_name,
        role,
        contributor_type,
        sort_order,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        articleId,
        contributor.displayName,
        contributor.role,
        contributor.contributorType,
        contributor.sortOrder,
        contributor.metadata ?? null,
      ],
    );
  }
}

async function createGenerationRun(
  query: <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>,
  input: {
    articleType: ArticleKind;
    sourceDate: string;
    selectedAuthor: string;
    jobRunId?: string | null;
    contextPayload: unknown;
  },
) {
  const rows = await query<{ generationrunid: string }>(
    `
    INSERT INTO editorial.generation_runs (
      job_run_id,
      article_type,
      source_date,
      status,
      selected_author,
      context_payload
    )
    VALUES ($1, $2, $3, 'running', $4, $5)
    RETURNING generation_run_id AS generationRunId
    `,
    [input.jobRunId ?? null, input.articleType, input.sourceDate, input.selectedAuthor, input.contextPayload],
  );

  const generationRunId = rows[0]?.generationrunid;
  if (!generationRunId) {
    throw new Error("Failed to create editorial generation run");
  }
  return generationRunId;
}

async function runGenerationStep<T>(
  query: <R extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<R[]>,
  input: {
    generationRunId: string;
    stepKey: GazetteStepKey;
    agentName: string;
    modelName?: string | null;
    inputPayload: unknown;
    execute: () => Promise<T>;
  },
) {
  await query(
    `
    INSERT INTO editorial.generation_steps (
      generation_run_id,
      step_key,
      agent_name,
      status,
      model_name,
      input_payload
    )
    VALUES ($1, $2, $3, 'running', $4, $5)
    ON CONFLICT (generation_run_id, step_key) DO UPDATE SET
      agent_name = EXCLUDED.agent_name,
      status = 'running',
      model_name = EXCLUDED.model_name,
      input_payload = EXCLUDED.input_payload,
      output_payload = NULL,
      error_message = NULL,
      finished_at = NULL,
      started_at = NOW()
    `,
    [input.generationRunId, input.stepKey, input.agentName, input.modelName ?? null, input.inputPayload ?? null],
  );

  try {
    const output = await input.execute();
    await query(
      `
      UPDATE editorial.generation_steps
      SET status = 'success', output_payload = $3, finished_at = NOW()
      WHERE generation_run_id = $1 AND step_key = $2
      `,
      [input.generationRunId, input.stepKey, output ?? null],
    );
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation step failed";
    await query(
      `
      UPDATE editorial.generation_steps
      SET status = 'failed', error_message = $3, finished_at = NOW()
      WHERE generation_run_id = $1 AND step_key = $2
      `,
      [input.generationRunId, input.stepKey, message],
    );
    throw error;
  }
}

async function insertRevision(
  articleId: string,
  article: {
    title: string;
    dek: string | null;
    bodyMd: string;
    factsPayload: unknown;
    derivedMetricsPayload: unknown;
    hypothesisPayload: unknown;
  },
  revisionNote: string | null,
  actorUserId: string | null,
  query: <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>,
) {
  const current = await query<{ revisionnumber: number }>(
    `
    SELECT COALESCE(MAX(revision_number), 0) AS revisionNumber
    FROM editorial.article_revisions
    WHERE article_id = $1
    `,
    [articleId],
  );
  const nextRevision = Number(current[0]?.revisionnumber ?? 0) + 1;

  await query(
    `
    INSERT INTO editorial.article_revisions (
      article_id,
      revision_number,
      title,
      dek,
      body_md,
      facts_payload,
      derived_metrics_payload,
      hypothesis_payload,
      revision_note,
      created_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      articleId,
      nextRevision,
      article.title,
      article.dek,
      article.bodyMd,
      article.factsPayload ?? null,
      article.derivedMetricsPayload ?? null,
      article.hypothesisPayload ?? null,
      revisionNote,
      actorUserId,
    ],
  );
}

export async function listPublishedArticles(limit = 20): Promise<ArticleListItem[]> {
  return withCachedValue(getCacheKey(["published-articles", limit]), 60_000, async () => {
    const rows = await sql<{
      articleid: string;
      slug: string;
      title: string;
      authorname: string | null;
      dek: string | null;
      articletype: ArticleKind;
      status: ArticleStatus;
      publishedat: string | null;
      scheduledpublishat: string | null;
      sourcedate: string | null;
      gamepk: number | null;
    }>(
      `
    SELECT
      article_id AS articleId,
      slug,
      title,
      author_name AS authorName,
      dek,
      article_type AS articleType,
      status,
      published_at AS publishedAt,
      scheduled_publish_at AS scheduledPublishAt,
      source_date AS sourceDate,
      game_pk AS gamePk
    FROM editorial.articles
    WHERE status = 'published'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT $1
    `,
      [limit],
    );

    return rows.map((row) => ({
      articleId: row.articleid,
      slug: row.slug,
      title: row.title,
      authorName: row.authorname,
      dek: row.dek,
      articleType: row.articletype,
      status: row.status,
      publishedAt: row.publishedat,
      scheduledPublishAt: row.scheduledpublishat,
      sourceDate: row.sourcedate,
      gamePk: row.gamepk === null ? null : Number(row.gamepk),
    }));
  });
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  return withCachedValue(getCacheKey(["published-article", slug]), 30_000, async () => {
    const article = await sqlOne<{
      articleid: string;
      slug: string;
      title: string;
      authorname: string | null;
      dek: string | null;
      articletype: ArticleKind;
      status: ArticleStatus;
      publishedat: string | null;
      scheduledpublishat: string | null;
      sourcedate: string | null;
      gamepk: number | null;
      bodymd: string;
      validationstate: "pending" | "passed" | "failed";
      factspayload: unknown;
      derivedmetricspayload: unknown;
      hypothesispayload: unknown;
      evidencepayload: unknown;
    }>(
      `
    SELECT
      article_id AS articleId,
      slug,
      title,
      author_name AS authorName,
      dek,
      article_type AS articleType,
      status,
      published_at AS publishedAt,
      scheduled_publish_at AS scheduledPublishAt,
      source_date AS sourceDate,
      game_pk AS gamePk,
      body_md AS bodyMd,
      validation_state AS validationState,
      facts_payload AS factsPayload,
      derived_metrics_payload AS derivedMetricsPayload,
      hypothesis_payload AS hypothesisPayload,
      evidence_payload AS evidencePayload
    FROM editorial.articles
    WHERE slug = $1
      AND status = 'published'
    LIMIT 1
    `,
      [slug],
    );

    if (!article) return null;

    const [sections, evidenceBlobs, revisions, contributors] = await Promise.all([
      sql<{
        sectionid: string;
        sectionkey: string;
        sectionkind: SectionKind;
        heading: string;
        bodymd: string;
        sectionorder: number;
        evidencepayload: unknown;
      }>(
        `
      SELECT
        section_id AS sectionId,
        section_key AS sectionKey,
        section_kind AS sectionKind,
        heading,
        body_md AS bodyMd,
        section_order AS sectionOrder,
        evidence_payload AS evidencePayload
      FROM editorial.article_sections
      WHERE article_id = $1
      ORDER BY section_order ASC, created_at ASC
      `,
        [article.articleid],
      ),
      sql<{
        evidenceblobid: string;
        sectionid: string | null;
        evidencekind: SectionKind | "snapshot";
        label: string;
        payload: unknown;
      }>(
        `
      SELECT
        evidence_blob_id AS evidenceBlobId,
        section_id AS sectionId,
        evidence_kind AS evidenceKind,
        label,
        payload
      FROM editorial.article_evidence_blobs
      WHERE article_id = $1
      ORDER BY created_at ASC
      `,
        [article.articleid],
      ),
      sql<{
        revisionid: string;
        revisionnumber: number;
        revisionnote: string | null;
        createdat: string;
      }>(
        `
      SELECT
        revision_id AS revisionId,
        revision_number AS revisionNumber,
        revision_note AS revisionNote,
        created_at AS createdAt
      FROM editorial.article_revisions
      WHERE article_id = $1
      ORDER BY revision_number DESC
      `,
        [article.articleid],
      ),
      sql<{
        articlecontributorid: string;
        displayname: string;
        role: string;
        contributortype: "author" | "analyst" | "source";
        sortorder: number;
        metadata: unknown;
      }>(
        `
      SELECT
        article_contributor_id AS articleContributorId,
        display_name AS displayName,
        role,
        contributor_type AS contributorType,
        sort_order AS sortOrder,
        metadata
      FROM editorial.article_contributors
      WHERE article_id = $1
      ORDER BY sort_order ASC, created_at ASC
      `,
        [article.articleid],
      ),
    ]);

    return {
      articleId: article.articleid,
      slug: article.slug,
      title: article.title,
      authorName: article.authorname,
      dek: article.dek,
      articleType: article.articletype,
      status: article.status,
      publishedAt: article.publishedat,
      scheduledPublishAt: article.scheduledpublishat,
      sourceDate: article.sourcedate,
      gamePk: article.gamepk === null ? null : Number(article.gamepk),
      bodyMd: article.bodymd,
      validationState: article.validationstate,
      factsPayload: article.factspayload,
      derivedMetricsPayload: article.derivedmetricspayload,
      hypothesisPayload: article.hypothesispayload,
      evidencePayload: article.evidencepayload,
      sections: sections.map((section) => ({
        sectionId: section.sectionid,
        sectionKey: section.sectionkey,
        sectionKind: section.sectionkind,
        heading: section.heading,
        bodyMd: section.bodymd,
        sectionOrder: Number(section.sectionorder),
        evidencePayload: section.evidencepayload,
      })),
      evidenceBlobs: evidenceBlobs.map((evidence) => ({
        evidenceBlobId: evidence.evidenceblobid,
        sectionId: evidence.sectionid,
        evidenceKind: evidence.evidencekind,
        label: evidence.label,
        payload: evidence.payload,
      })),
      revisions: revisions.map((revision) => ({
        revisionId: revision.revisionid,
        revisionNumber: Number(revision.revisionnumber),
        revisionNote: revision.revisionnote,
        createdAt: revision.createdat,
      })),
      contributors: contributors.map((contributor) => ({
        articleContributorId: contributor.articlecontributorid,
        displayName: contributor.displayname,
        role: contributor.role,
        contributorType: contributor.contributortype,
        sortOrder: Number(contributor.sortorder),
        metadata: contributor.metadata,
      })),
    };
  });
}

export async function createArticleDraft(
  request: Request,
  input: {
    articleType: ArticleKind;
    title: string;
    dek?: string | null;
    bodyMd: string;
    sourceDate?: string | null;
    gamePk?: number | null;
    scheduledPublishAt?: string | null;
    sections?: ArticleSectionInput[];
    evidenceBlobs?: Array<{
      sectionKey?: string;
      evidenceKind: SectionKind | "snapshot";
      label: string;
      payload: unknown;
    }>;
    factsPayload?: unknown;
    derivedMetricsPayload?: unknown;
    hypothesisPayload?: unknown;
    revisionNote?: string | null;
  },
) {
  const viewer = await requireEditorialAdmin(request);
  const slug = uniqueSlug(input.title, input.sourceDate ?? input.articleType);

  return withTransaction(async (query) => {
    const rows = await query<{ articleid: string }>(
      `
      INSERT INTO editorial.articles (
        slug,
        article_type,
        status,
        game_pk,
        source_date,
        title,
        dek,
        body_md,
        scheduled_publish_at,
        facts_payload,
        derived_metrics_payload,
        hypothesis_payload,
        created_by_user_id
      )
      VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING article_id AS articleId
      `,
      [
        slug,
        input.articleType,
        input.gamePk ?? null,
        input.sourceDate ?? null,
        input.title,
        input.dek ?? null,
        input.bodyMd,
        input.scheduledPublishAt ?? null,
        input.factsPayload ?? null,
        input.derivedMetricsPayload ?? null,
        input.hypothesisPayload ?? null,
        viewer.userId,
      ],
    );

    const articleId = rows[0]?.articleid;
    if (!articleId) {
      throw new Error("Failed to create article draft");
    }

    await replaceArticleSections(articleId, input.sections ?? [], query);
    await attachEvidenceBlobs(articleId, input.sections ?? [], input.evidenceBlobs ?? [], query);
    await insertRevision(
      articleId,
      {
        title: input.title,
        dek: input.dek ?? null,
        bodyMd: input.bodyMd,
        factsPayload: input.factsPayload ?? null,
        derivedMetricsPayload: input.derivedMetricsPayload ?? null,
        hypothesisPayload: input.hypothesisPayload ?? null,
      },
      input.revisionNote ?? "Initial draft",
      viewer.userId,
      query,
    );

    clearCachedValue(getCacheKey(["published-articles", 20]));

    return articleId;
  });
}

async function attachEvidenceBlobs(
  articleId: string,
  sections: ArticleSectionInput[],
  evidenceBlobs: Array<{
    sectionKey?: string;
    evidenceKind: SectionKind | "snapshot";
    label: string;
    payload: unknown;
  }>,
  query: <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>,
) {
  await query("DELETE FROM editorial.article_evidence_blobs WHERE article_id = $1", [articleId]);

  const sectionIds = await query<{ sectionid: string; sectionkey: string }>(
    `
    SELECT section_id AS sectionId, section_key AS sectionKey
    FROM editorial.article_sections
    WHERE article_id = $1
    `,
    [articleId],
  );

  const sectionKeyToId = new Map(sectionIds.map((section) => [section.sectionkey, section.sectionid]));

  for (const evidence of evidenceBlobs) {
    await query(
      `
      INSERT INTO editorial.article_evidence_blobs (
        article_id,
        section_id,
        evidence_kind,
        label,
        payload
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [articleId, evidence.sectionKey ? sectionKeyToId.get(evidence.sectionKey) ?? null : null, evidence.evidenceKind, evidence.label, evidence.payload],
    );
  }

  for (const section of sections) {
    if (section.evidencePayload === undefined) continue;
    await query(
      `
      INSERT INTO editorial.article_evidence_blobs (
        article_id,
        section_id,
        evidence_kind,
        label,
        payload
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        articleId,
        sectionKeyToId.get(section.sectionKey) ?? null,
        section.sectionKind,
        section.heading,
        section.evidencePayload,
      ],
    );
  }
}

export async function updateArticleDraft(
  request: Request,
  slug: string,
  input: {
    title?: string;
    dek?: string | null;
    bodyMd?: string;
    scheduledPublishAt?: string | null;
    sections?: ArticleSectionInput[];
    evidenceBlobs?: Array<{
      sectionKey?: string;
      evidenceKind: SectionKind | "snapshot";
      label: string;
      payload: unknown;
    }>;
    factsPayload?: unknown;
    derivedMetricsPayload?: unknown;
    hypothesisPayload?: unknown;
    revisionNote?: string | null;
  },
) {
  const viewer = await requireEditorialAdmin(request);

  return withTransaction(async (query) => {
    const current = await query<{
      articleid: string;
      title: string;
      dek: string | null;
      bodymd: string;
      factspayload: unknown;
      derivedmetricspayload: unknown;
      hypothesispayload: unknown;
    }>(
      `
      SELECT
        article_id AS articleId,
        title,
        dek,
        body_md AS bodyMd,
        facts_payload AS factsPayload,
        derived_metrics_payload AS derivedMetricsPayload,
        hypothesis_payload AS hypothesisPayload
      FROM editorial.articles
      WHERE slug = $1
      LIMIT 1
      `,
      [slug],
    );

    const article = current[0];
    if (!article) {
      throw new Error("Article not found");
    }

    await query(
      `
      UPDATE editorial.articles
      SET
        title = COALESCE($2, title),
        dek = COALESCE($3, dek),
        body_md = COALESCE($4, body_md),
        scheduled_publish_at = $5,
        facts_payload = COALESCE($6, facts_payload),
        derived_metrics_payload = COALESCE($7, derived_metrics_payload),
        hypothesis_payload = COALESCE($8, hypothesis_payload),
        updated_at = NOW()
      WHERE slug = $1
      `,
      [
        slug,
        input.title ?? null,
        input.dek === undefined ? null : input.dek,
        input.bodyMd ?? null,
        input.scheduledPublishAt ?? null,
        input.factsPayload ?? null,
        input.derivedMetricsPayload ?? null,
        input.hypothesisPayload ?? null,
      ],
    );

    if (input.sections) {
      await replaceArticleSections(article.articleid, input.sections, query);
    }
    if (input.sections || input.evidenceBlobs) {
      const sections = input.sections ?? [];
      await attachEvidenceBlobs(article.articleid, sections, input.evidenceBlobs ?? [], query);
    }

    await insertRevision(
      article.articleid,
      {
        title: input.title ?? article.title,
        dek: input.dek === undefined ? article.dek : input.dek,
        bodyMd: input.bodyMd ?? article.bodymd,
        factsPayload: input.factsPayload ?? article.factspayload,
        derivedMetricsPayload: input.derivedMetricsPayload ?? article.derivedmetricspayload,
        hypothesisPayload: input.hypothesisPayload ?? article.hypothesispayload,
      },
      input.revisionNote ?? "Draft updated",
      viewer.userId,
      query,
    );

    clearCachedValue(getCacheKey(["published-article", slug]));
    clearCachedValue(getCacheKey(["published-articles", 20]));

    return article.articleid;
  });
}

export async function publishArticle(request: Request, slug: string) {
  await requireEditorialAdmin(request);
  await sql(
    `
    UPDATE editorial.articles
    SET status = 'published', validation_state = 'passed', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
    WHERE slug = $1
    `,
    [slug],
  );
  clearCachedValue(getCacheKey(["published-article", slug]));
  clearCachedValue(getCacheKey(["published-articles", 20]));
}

export async function listDailyEditorialSummary(sourceDate: string): Promise<DailyEditorialSummary | null> {
  const row = await sqlOne<{
    summarydate: string;
    gamestracked: number;
    challengestotal: number;
    overturnstotal: number;
    overturnrate: number;
    teamschallenging: number;
    avgteamchallenges: number;
    teamsummaries: unknown;
  }>(
    `
    SELECT
      summary_date AS summaryDate,
      games_tracked AS gamesTracked,
      challenges_total AS challengesTotal,
      overturns_total AS overturnsTotal,
      overturn_rate AS overturnRate,
      teams_challenging AS teamsChallenging,
      avg_team_challenges AS avgTeamChallenges,
      team_summaries AS teamSummaries
    FROM mart_daily_editorial_summary
    WHERE summary_date = $1::date
    LIMIT 1
    `,
    [sourceDate],
  );

  if (!row) return null;
  return {
    summaryDate: row.summarydate,
    gamesTracked: Number(row.gamestracked),
    challengesTotal: Number(row.challengestotal),
    overturnsTotal: Number(row.overturnstotal),
    overturnRate: Number(row.overturnrate ?? 0),
    teamsChallenging: Number(row.teamschallenging),
    avgTeamChallenges: Number(row.avgteamchallenges ?? 0),
    teamSummaries: row.teamsummaries,
  };
}

export async function listWeeklyEditorialSummary(weekStart: string): Promise<WeeklyEditorialSummary | null> {
  const row = await sqlOne<{
    weekstart: string;
    gamestracked: number;
    challengestotal: number;
    overturnstotal: number;
    overturnrate: number;
    avgdailychallenges: number;
    avgdailyoverturnrate: number;
  }>(
    `
    SELECT
      week_start AS weekStart,
      games_tracked AS gamesTracked,
      challenges_total AS challengesTotal,
      overturns_total AS overturnsTotal,
      overturn_rate AS overturnRate,
      avg_daily_challenges AS avgDailyChallenges,
      avg_daily_overturn_rate AS avgDailyOverturnRate
    FROM mart_weekly_editorial_summary
    WHERE week_start = $1::date
    LIMIT 1
    `,
    [weekStart],
  );

  if (!row) return null;
  return {
    weekStart: row.weekstart,
    gamesTracked: Number(row.gamestracked),
    challengesTotal: Number(row.challengestotal),
    overturnsTotal: Number(row.overturnstotal),
    overturnRate: Number(row.overturnrate ?? 0),
    avgDailyChallenges: Number(row.avgdailychallenges ?? 0),
    avgDailyOverturnRate: Number(row.avgdailyoverturnrate ?? 0),
  };
}

export async function getStandingsSnapshot(sourceDate: string) {
  return sql<{
    teamid: number;
    leagueid: number;
    wins: number;
    losses: number;
    pct: number | null;
    gamesback: string | null;
    wildcardrank: number | null;
    divisionrank: number | null;
  }>(
    `
    SELECT
      team_id AS teamId,
      league_id AS leagueId,
      wins,
      losses,
      pct,
      games_back AS gamesBack,
      wild_card_rank AS wildCardRank,
      division_rank AS divisionRank
    FROM editorial.standings_snapshots
    WHERE snapshot_date = $1::date
    ORDER BY league_id ASC, division_rank ASC NULLS LAST, team_id ASC
    `,
    [sourceDate],
  );
}

export async function listLeagueStandingsWithMovement(sourceDate: string) {
  const prevDate = format(subDays(new Date(sourceDate), 1), "yyyy-MM-dd");

  const [current = [], previous = []] = await Promise.all([
    getStandingsSnapshot(sourceDate),
    getStandingsSnapshot(prevDate),
  ]);

  if (!current.length) return null;

  const prevMap = new Map(previous.map(s => [s.teamid, s.divisionrank]));

  const processLeague = (leagueId: number) => {
    return current
      .filter(s => s.leagueid === leagueId)
      .slice(0, 3)
      .map((s, idx) => {
        const teamMeta = getTeamMeta(s.teamid);
        const prevRank = prevMap.get(s.teamid);

        let movement: "up" | "down" | "same" = "same";
        let movementValue = 0;

        if (prevRank != null) {
          if (s.divisionrank != null && s.divisionrank < prevRank) {
            movement = "up";
            movementValue = prevRank - s.divisionrank;
          } else if (s.divisionrank != null && s.divisionrank > prevRank) {
            movement = "down";
            movementValue = s.divisionrank - prevRank;
          }
        }

        return {
          rank: idx + 1,
          name: teamMeta?.name.split(" ").pop() || "Team",
          abbreviation: teamMeta?.abbreviation || String(s.teamid),
          record: `${s.wins}-${s.losses}`,
          movement,
          movementValue: movementValue || undefined
        };
      });
  };

  return {
    al: processLeague(103), // AL
    nl: processLeague(104), // NL
  };
}

function buildScoutBrief(sourceDate: string, summary: DailyEditorialSummary | null): ScoutBriefPayload {
  const teamSummaries = Array.isArray(summary?.teamSummaries) ? summary.teamSummaries : [];
  const leadCandidates = teamSummaries
    .filter((team): team is Record<string, unknown> => typeof team === "object" && team !== null)
    .slice(0, 3)
    .map((team) => ({
      teamId: Number(team.teamId ?? team.teamid ?? 0),
      challengeTotal: Number(team.challengesTotal ?? team.challengestotal ?? 0),
      overturnRate: Number(team.overturnRate ?? team.overturnrate ?? 0),
    }))
    .filter((team) => Number.isFinite(team.teamId) && team.teamId > 0);

  if (!summary) {
    return {
      storyOfDay: {
        headline: `Daily ABS recap unavailable for ${sourceDate}`,
        theme: "insufficient_evidence",
        summary: `Source marts were incomplete for ${sourceDate}, so the Gazette desk could not identify a lead story.`,
      },
      leadCandidates: [],
      auditCandidates: [{ kind: "data_gap", label: "Daily editorial marts incomplete" }],
      milestones: [],
      leagueNotes: ["No evidence-backed daily summary was available."],
    };
  }

  return {
    storyOfDay: {
      headline: `${summary.challengesTotal} challenges shaped ${summary.gamesTracked} games`,
      theme: "league_daily_recap",
      summary: `${summary.teamsChallenging} teams used ABS with an overturn rate of ${(summary.overturnRate * 100).toFixed(1)}%.`,
    },
    leadCandidates,
    auditCandidates: leadCandidates.length
      ? leadCandidates.slice(0, 1).map((team) => ({
          kind: "team_volume",
          label: `Team ${team.teamId} drove the heaviest challenge volume of the day.`,
        }))
      : [],
    milestones: [
      {
        kind: "league_total",
        label: `${summary.challengesTotal} challenges with ${summary.overturnsTotal} overturns.`,
      },
    ],
    leagueNotes: [
      `${summary.gamesTracked} tracked games fed the desk package.`,
      `${summary.avgTeamChallenges.toFixed(2)} average team challenges per active club.`,
    ],
  };
}

function buildTelemetryResearch(
  sourceDate: string,
  summary: DailyEditorialSummary | null,
  standingsPulse: Awaited<ReturnType<typeof listLeagueStandingsWithMovement>>,
): TelemetryResearchPayload {
  const evidenceRefs = [{ kind: "summary_mart", key: "mart_daily_editorial_summary", sourceDate }];
  if (standingsPulse) {
    evidenceRefs.push({ kind: "standings_snapshot", key: "editorial.standings_snapshots", sourceDate });
  }

  return {
    trendSummary: summary
      ? `League overturn rate settled at ${(summary.overturnRate * 100).toFixed(1)}%, with ${summary.teamsChallenging} clubs challenging at least once.`
      : `No validated daily trendline could be generated for ${sourceDate}.`,
    chartIntents: standingsPulse
      ? [
          {
            chartKey: "standings_pulse",
            title: "League Standings Pulse",
            sectionKey: "standings_pulse",
            datasetKey: "editorial.standings_snapshots",
          },
        ]
      : [],
    standingsPulse,
    evidenceRefs,
  };
}

function buildDailyGazetteDraft(
  sourceDate: string,
  author: (typeof EDITORIAL_STAFF)[number],
  summary: DailyEditorialSummary | null,
  standings: Awaited<ReturnType<typeof getStandingsSnapshot>>,
  scout: ScoutBriefPayload,
  telemetry: TelemetryResearchPayload,
): GazetteDraftPayload {
  const title = `ABS Daily Recap: ${sourceDate}`;
  const factsPayload = { sourceDate, summary, standings, scoutBrief: scout, authorName: author.name };
  const derivedMetricsPayload = summary
    ? {
        overturnRate: summary.overturnRate,
        avgTeamChallenges: summary.avgTeamChallenges,
        teamsChallenging: summary.teamsChallenging,
        trendSummary: telemetry.trendSummary,
      }
    : null;

  const sections: ArticleSectionInput[] = summary
    ? [
        {
          sectionKey: "lead_recap",
          sectionKind: "fact",
          heading: "League Snapshot",
          bodyMd: `${scout.storyOfDay.summary} The desk tracked **${summary.gamesTracked}** games and **${summary.challengesTotal}** challenges on ${sourceDate}.`,
          sectionOrder: 1,
          evidencePayload: {
            summary,
            scoutStory: scout.storyOfDay,
          },
        },
        {
          sectionKey: "stat_recap",
          sectionKind: "derived_metric",
          heading: "ABS Trendline",
          bodyMd: telemetry.trendSummary,
          sectionOrder: 2,
          evidencePayload: derivedMetricsPayload,
        },
        {
          sectionKey: "standings_pulse",
          sectionKind: "fact",
          heading: "League Standings",
          bodyMd: telemetry.standingsPulse
            ? `Standings movement through **${sourceDate}** is attached to the Gazette pulse, with both leagues compared to the previous snapshot.`
            : `Standings snapshots were not available for **${sourceDate}**, so the desk held this section to a factual placeholder.`,
          sectionOrder: 3,
          evidencePayload: telemetry.standingsPulse ?? { al: [], nl: [] },
        },
      ]
    : [];

  const bodyMd = sections.length
    ? sections.map((section) => `## ${section.heading}\n\n${section.bodyMd}`).join("\n\n")
    : `## Suppressed\n\nNo evidence-backed daily recap could be generated for ${sourceDate}.`;

  return {
    title,
    dek: summary
      ? "Automated daily ABS recap built from same-day league marts."
      : "Automated daily ABS recap suppressed because source evidence is incomplete.",
    sections,
    bodyMd,
    factsPayload,
    derivedMetricsPayload,
    hypothesisPayload: null,
    evidencePayload: {
      sourceDate,
      summary,
      standingsCount: standings.length,
      scoutBrief: scout,
      telemetryResearch: telemetry,
    },
    contributors: [
      {
        displayName: author.name,
        role: author.role,
        contributorType: "author",
        sortOrder: 1,
        metadata: { tone: author.tone },
      },
      {
        displayName: ANALYST_STAFF[0]!.name,
        role: ANALYST_STAFF[0]!.role,
        contributorType: "analyst",
        sortOrder: 2,
      },
      {
        displayName: ANALYST_STAFF[1]!.name,
        role: ANALYST_STAFF[1]!.role,
        contributorType: "source",
        sortOrder: 3,
      },
    ],
  };
}

function buildGazetteValidation(draft: GazetteDraftPayload): GazetteValidationPayload {
  const validation = validateAutoArticleSections(draft.sections);
  return validation.ok
    ? {
        status: "passed",
        issues: [],
        requiredEvidencePresent: true,
        sectionCount: draft.sections.length,
      }
    : {
        status: "failed",
        issues: [validation.reason],
        requiredEvidencePresent: false,
        sectionCount: draft.sections.length,
      };
}

export async function generateDailyAutoArticle(sourceDate: string, options: GenerateDailyAutoArticleOptions = {}) {
  const [summary, standings, standingsPulse] = await Promise.all([
    listDailyEditorialSummary(sourceDate),
    getStandingsSnapshot(sourceDate),
    listLeagueStandingsWithMovement(sourceDate),
  ]);

  const autoPublishFrozen = process.env.ARTICLE_AUTOPUBLISH_FREEZE === "true";
  const author = selectDailyAuthor(sourceDate);

  return withTransaction(async (query) => {
    const generationRunId = await createGenerationRun(query, {
      articleType: "daily_auto",
      sourceDate,
      selectedAuthor: author.name,
      jobRunId: options.jobRunId ?? null,
      contextPayload: {
        sourceDate,
        summaryAvailable: Boolean(summary),
        standingsCount: standings.length,
        standingsPulseAvailable: Boolean(standingsPulse),
      },
    });

    const scout = await runGenerationStep(query, {
      generationRunId,
      stepKey: "scout_brief",
      agentName: ANALYST_STAFF[1]!.name,
      inputPayload: { sourceDate, summary },
      execute: async () => buildScoutBrief(sourceDate, summary),
    });

    const telemetry = await runGenerationStep(query, {
      generationRunId,
      stepKey: "telemetry_research",
      agentName: ANALYST_STAFF[0]!.name,
      inputPayload: { sourceDate, summary, standingsPulse },
      execute: async () => buildTelemetryResearch(sourceDate, summary, standingsPulse),
    });

    const draft = await runGenerationStep(query, {
      generationRunId,
      stepKey: "author_draft",
      agentName: author.name,
      inputPayload: { sourceDate, scout, telemetry, standingsCount: standings.length },
      execute: async () => buildDailyGazetteDraft(sourceDate, author, summary, standings, scout, telemetry),
    });

    const validation = await runGenerationStep(query, {
      generationRunId,
      stepKey: "editor_validation",
      agentName: "Gazette Validator",
      inputPayload: { sourceDate, sectionCount: draft.sections.length },
      execute: async () => buildGazetteValidation(draft),
    });

    const articleStatus: ArticleStatus =
      validation.status === "passed" ? (autoPublishFrozen ? "generated" : "published") : "suppressed";
    const validationState: GazetteValidationState = validation.status;
    const slug = uniqueSlug(draft.title, "daily-auto");

    const persistResult = await runGenerationStep(query, {
      generationRunId,
      stepKey: "persist_article",
      agentName: "Gazette Publisher",
      inputPayload: { sourceDate, articleStatus, validationState, slug },
      execute: async () => {
        const rows = await query<{ articleid: string }>(
          `
          INSERT INTO editorial.articles (
            slug,
            article_type,
            status,
            source_date,
            title,
            author_name,
            dek,
            body_md,
            published_at,
            facts_payload,
            derived_metrics_payload,
            hypothesis_payload,
            generation_payload,
            evidence_payload,
            validation_state
          )
          VALUES ($1, 'daily_auto', $2, $3, $4, $5, $6, $7, CASE WHEN $2 = 'published' THEN NOW() ELSE NULL END, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (slug) DO UPDATE SET
            status = EXCLUDED.status,
            source_date = EXCLUDED.source_date,
            title = EXCLUDED.title,
            author_name = EXCLUDED.author_name,
            dek = EXCLUDED.dek,
            body_md = EXCLUDED.body_md,
            published_at = CASE WHEN EXCLUDED.status = 'published' THEN COALESCE(editorial.articles.published_at, NOW()) ELSE editorial.articles.published_at END,
            facts_payload = EXCLUDED.facts_payload,
            derived_metrics_payload = EXCLUDED.derived_metrics_payload,
            hypothesis_payload = EXCLUDED.hypothesis_payload,
            generation_payload = EXCLUDED.generation_payload,
            evidence_payload = EXCLUDED.evidence_payload,
            validation_state = EXCLUDED.validation_state,
            updated_at = NOW()
          RETURNING article_id AS articleId
          `,
          [
            slug,
            articleStatus,
            sourceDate,
            draft.title,
            author.name,
            validation.status === "passed"
              ? autoPublishFrozen
                ? "Automated daily ABS recap generated but held by auto-publish freeze."
                : draft.dek
              : draft.dek,
            draft.bodyMd,
            draft.factsPayload,
            draft.derivedMetricsPayload,
            draft.hypothesisPayload,
            {
              generationRunId,
              scout,
              telemetry,
              draft: {
                title: draft.title,
                dek: draft.dek,
                sectionCount: draft.sections.length,
              },
              validator: validation,
            },
            draft.evidencePayload,
            validationState,
          ],
        );
        const articleId = rows[0]?.articleid;
        if (!articleId) {
          throw new Error("Failed to generate daily auto article");
        }

        await replaceArticleSections(articleId, draft.sections, query);
        await attachEvidenceBlobs(
          articleId,
          draft.sections,
          [
            { evidenceKind: "snapshot", label: "Daily Summary", payload: summary },
            { evidenceKind: "snapshot", label: "Standings Snapshot", payload: standings },
            { evidenceKind: "snapshot", label: "Scout Brief", payload: scout },
            { evidenceKind: "snapshot", label: "Telemetry Research", payload: telemetry },
            { evidenceKind: "snapshot", label: "Validator Report", payload: validation },
          ],
          query,
        );
        await replaceArticleContributors(articleId, draft.contributors, query);

        const runStatus: GazetteRunStatus = articleId ? "persisted" : "failed";
        await query(
          `
          UPDATE editorial.generation_runs
          SET
            article_id = $2,
            status = $3,
            story_theme = $4,
            validation_state = $5,
            error_message = $6,
            finished_at = NOW(),
            updated_at = NOW()
          WHERE generation_run_id = $1
          `,
          [
            generationRunId,
            articleId,
            runStatus,
            scout.storyOfDay.theme,
            validationState,
            validation.issues[0] ?? null,
          ],
        );

        return { articleId };
      },
    });

    clearCachedValue(getCacheKey(["published-article", slug]));
    clearCachedValue(getCacheKey(["published-articles", 20]));

    return {
      articleId: persistResult.articleId,
      slug,
      status: articleStatus,
      validationState,
    };
  });
}
