import { sql, sqlOne } from "@/lib/db";

export type AdminAiAnalyticsFilters = {
  from: string;
  to: string;
  surfaceKey?: string | null;
  surfaceDetail?: string | null;
  provider?: string | null;
  model?: string | null;
  status?: string | null;
  sentiment?: "up" | "down" | null;
};

export type AdminAiFeedbackReviewFilters = AdminAiAnalyticsFilters & {
  bucket?: string | null;
  hasComment?: "all" | "yes" | "no" | null;
  reviewStatus?: string | null;
};

const HIGH_PRIORITY_BUCKETS = new Set(["data_accuracy", "hallucination"]);

function defaultReviewPriority(sentiment: "up" | "down", comment: string | null, bucket: string | null) {
  if (sentiment === "down" && comment && bucket && HIGH_PRIORITY_BUCKETS.has(bucket)) return "high";
  if (sentiment === "up") return "low";
  return "normal";
}

function defaultIssueOwner(rootCause: string | null) {
  if (rootCause === "data_issue") return "data";
  if (rootCause === "prompt_issue") return "ai";
  if (rootCause === "rendering_issue") return "frontend";
  return "colby";
}

type SqlParts = {
  whereSql: string;
  feedbackWhereSql: string;
  values: unknown[];
};

function buildGenerationFilterParts(filters: AdminAiAnalyticsFilters): SqlParts {
  const values: unknown[] = [filters.from, filters.to];
  const generationClauses = [
    "ge.created_at >= $1::date",
    "ge.created_at < ($2::date + INTERVAL '1 day')",
  ];
  const feedbackClauses = [
    "EXISTS (SELECT 1 FROM filtered_generations ge WHERE (f.generation_id IS NOT NULL AND ge.generation_id = f.generation_id) OR (f.generation_id IS NULL AND ge.target_type = f.target_type AND ge.target_id = f.target_id))",
  ];

  const pushMatch = (value: string | null | undefined, column?: string | null, feedbackColumn?: string) => {
    if (!value || value === "all") return;
    values.push(value);
    const idx = values.length;
    if (column) {
      generationClauses.push(`${column} = $${idx}`);
    }
    if (feedbackColumn) {
      feedbackClauses.push(`${feedbackColumn} = $${idx}`);
    }
  };

  pushMatch(filters.surfaceKey, "ge.surface_key", "f.surface");
  pushMatch(filters.surfaceDetail, "ge.surface_detail");
  pushMatch(filters.provider, "ge.provider");
  pushMatch(filters.model, "ge.model_name");
  pushMatch(filters.status, "ge.status");
  pushMatch(filters.sentiment ?? null, null, "f.sentiment");

  return {
    whereSql: generationClauses.join(" AND "),
    feedbackWhereSql: feedbackClauses.join(" AND "),
    values,
  };
}

function filteredCtes(filters: AdminAiAnalyticsFilters) {
  const parts = buildGenerationFilterParts(filters);
  return {
    values: parts.values,
    sql: `
      WITH filtered_generations AS (
        SELECT *
        FROM ai.generation_events ge
        WHERE ${parts.whereSql}
      ),
      filtered_feedback AS (
        SELECT f.*
        FROM ai.feedback f
        WHERE ${parts.feedbackWhereSql}
      )
    `,
  };
}

function filteredFeedbackReviewCtes(filters: AdminAiFeedbackReviewFilters) {
  const parts = buildGenerationFilterParts(filters);
  const values = [...parts.values];
  const feedbackClauses = [parts.feedbackWhereSql];

  if (filters.bucket && filters.bucket !== "all") {
    values.push(filters.bucket);
    feedbackClauses.push(`COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') = $${values.length}`);
  }

  if (filters.hasComment === "yes") {
    feedbackClauses.push("f.comment IS NOT NULL");
  } else if (filters.hasComment === "no") {
    feedbackClauses.push("f.comment IS NULL");
  }

  if (filters.reviewStatus && filters.reviewStatus !== "all") {
    values.push(filters.reviewStatus);
    feedbackClauses.push(`f.review_status = $${values.length}`);
  }

  return {
    values,
    sql: `
      WITH filtered_generations AS (
        SELECT *
        FROM ai.generation_events ge
        WHERE ${parts.whereSql}
      ),
      filtered_feedback AS (
        SELECT f.*
        FROM ai.feedback f
        WHERE ${feedbackClauses.join(" AND ")}
      )
    `,
  };
}

export async function getAiOverview(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sqlOne<{
    totalgenerations: string;
    uniqueusers: string;
    totaltokens: string;
    totalestimatedcostusd: string;
    avglatencyms: string | null;
    fallbackrate: string;
    feedbackcount: string;
    positivefeedbackcount: string;
  }>(
    `
    ${ctes}
    SELECT
      COUNT(*)::text AS totalGenerations,
      COUNT(DISTINCT user_id)::text AS uniqueUsers,
      COALESCE(SUM(total_tokens), 0)::text AS totalTokens,
      COALESCE(SUM(estimated_cost_usd), 0)::text AS totalEstimatedCostUsd,
      ROUND(COALESCE(AVG(latency_ms), 0))::text AS avgLatencyMs,
      COALESCE(AVG(CASE WHEN status IN ('fallback', 'failed') THEN 1 ELSE 0 END), 0)::text AS fallbackRate,
      (SELECT COUNT(*)::text FROM filtered_feedback) AS feedbackCount,
      (SELECT COUNT(*)::text FROM filtered_feedback WHERE sentiment = 'up') AS positiveFeedbackCount
    FROM filtered_generations
    `,
    values,
  ).then((row) => ({
    totalGenerations: Number(row?.totalgenerations ?? 0),
    uniqueUsers: Number(row?.uniqueusers ?? 0),
    totalTokens: Number(row?.totaltokens ?? 0),
    totalEstimatedCostUsd: Number(row?.totalestimatedcostusd ?? 0),
    avgLatencyMs: Number(row?.avglatencyms ?? 0),
    fallbackRate: Number(row?.fallbackrate ?? 0),
    feedbackRate:
      Number(row?.totalgenerations ?? 0) > 0 ? Number(row?.feedbackcount ?? 0) / Number(row?.totalgenerations ?? 0) : 0,
    positiveFeedbackRate:
      Number(row?.feedbackcount ?? 0) > 0 ? Number(row?.positivefeedbackcount ?? 0) / Number(row?.feedbackcount ?? 0) : 0,
  }));
}

export async function getAiDailySeries(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    day: string;
    generations: string;
    totaltokens: string;
    totalestimatedcostusd: string;
    fallbackrate: string;
  }>(
    `
    ${ctes}
    SELECT
      DATE(created_at)::text AS day,
      COUNT(*)::text AS generations,
      COALESCE(SUM(total_tokens), 0)::text AS totalTokens,
      COALESCE(SUM(estimated_cost_usd), 0)::text AS totalEstimatedCostUsd,
      COALESCE(AVG(CASE WHEN status IN ('fallback', 'failed') THEN 1 ELSE 0 END), 0)::text AS fallbackRate
    FROM filtered_generations
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      day: row.day,
      generations: Number(row.generations),
      totalTokens: Number(row.totaltokens),
      totalEstimatedCostUsd: Number(row.totalestimatedcostusd),
      fallbackRate: Number(row.fallbackrate),
    })),
  );
}

export async function getAiSurfaceBreakdown(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    surfacekey: string;
    generations: string;
    totalestimatedcostusd: string;
    avglatencyms: string;
    fallbackrate: string;
    upcount: string;
    downcount: string;
  }>(
    `
    ${ctes}
    SELECT
      ge.surface_key AS surfaceKey,
      COUNT(*)::text AS generations,
      COALESCE(SUM(ge.estimated_cost_usd), 0)::text AS totalEstimatedCostUsd,
      ROUND(COALESCE(AVG(ge.latency_ms), 0))::text AS avgLatencyMs,
      COALESCE(AVG(CASE WHEN ge.status IN ('fallback', 'failed') THEN 1 ELSE 0 END), 0)::text AS fallbackRate,
      COUNT(DISTINCT f.feedback_id) FILTER (WHERE f.sentiment = 'up')::text AS upCount,
      COUNT(DISTINCT f.feedback_id) FILTER (WHERE f.sentiment = 'down')::text AS downCount
    FROM filtered_generations ge
    LEFT JOIN filtered_feedback f
      ON (f.generation_id IS NOT NULL AND f.generation_id = ge.generation_id)
      OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
    GROUP BY ge.surface_key
    ORDER BY COUNT(*) DESC, ge.surface_key ASC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      surfaceKey: row.surfacekey,
      generations: Number(row.generations),
      totalEstimatedCostUsd: Number(row.totalestimatedcostusd),
      avgLatencyMs: Number(row.avglatencyms),
      fallbackRate: Number(row.fallbackrate),
      upCount: Number(row.upcount),
      downCount: Number(row.downcount),
    })),
  );
}

export async function getAiModelBreakdown(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    provider: string;
    modelname: string;
    generations: string;
    totalestimatedcostusd: string;
    avglatencyms: string;
    upcount: string;
    downcount: string;
  }>(
    `
    ${ctes}
    SELECT
      ge.provider,
      ge.model_name AS modelName,
      COUNT(*)::text AS generations,
      COALESCE(SUM(ge.estimated_cost_usd), 0)::text AS totalEstimatedCostUsd,
      ROUND(COALESCE(AVG(ge.latency_ms), 0))::text AS avgLatencyMs,
      COUNT(DISTINCT f.feedback_id) FILTER (WHERE f.sentiment = 'up')::text AS upCount,
      COUNT(DISTINCT f.feedback_id) FILTER (WHERE f.sentiment = 'down')::text AS downCount
    FROM filtered_generations ge
    LEFT JOIN filtered_feedback f
      ON (f.generation_id IS NOT NULL AND f.generation_id = ge.generation_id)
      OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
    GROUP BY ge.provider, ge.model_name
    ORDER BY COUNT(*) DESC, ge.provider ASC, ge.model_name ASC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      provider: row.provider,
      modelName: row.modelname,
      generations: Number(row.generations),
      totalEstimatedCostUsd: Number(row.totalestimatedcostusd),
      avgLatencyMs: Number(row.avglatencyms),
      upCount: Number(row.upcount),
      downCount: Number(row.downcount),
    })),
  );
}

export async function getAiFeedbackBreakdown(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    surfacekey: string;
    bucket: string | null;
    count: string;
  }>(
    `
    ${ctes}
    SELECT
      COALESCE(ge.surface_key, f.surface) AS surfaceKey,
      COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') AS bucket,
      COUNT(*)::text AS count
    FROM filtered_feedback f
    LEFT JOIN filtered_generations ge
      ON (f.generation_id IS NOT NULL AND f.generation_id = ge.generation_id)
      OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
    GROUP BY COALESCE(ge.surface_key, f.surface), COALESCE(f.override_bucket, f.classification_bucket, 'unclassified')
    ORDER BY COUNT(*) DESC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      surfaceKey: row.surfacekey,
      bucket: row.bucket ?? "unclassified",
      count: Number(row.count),
    })),
  );
}

export async function getAiFailureBreakdown(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    surfacekey: string;
    status: string;
    count: string;
  }>(
    `
    ${ctes}
    SELECT
      surface_key AS surfaceKey,
      status,
      COUNT(*)::text AS count
    FROM filtered_generations
    WHERE status IN ('fallback', 'failed', 'cached')
    GROUP BY surface_key, status
    ORDER BY COUNT(*) DESC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      surfaceKey: row.surfacekey,
      status: row.status,
      count: Number(row.count),
    })),
  );
}

export async function getRecentNegativeFeedback(filters: AdminAiAnalyticsFilters) {
  const { sql: ctes, values } = filteredCtes(filters);

  return sql<{
    feedbackid: string;
    createdat: string;
    surface: string;
    targettype: string;
    targetid: string;
    comment: string | null;
    classificationbucket: string | null;
    modelname: string | null;
    provider: string | null;
    generationid: string | null;
  }>(
    `
    ${ctes}
    SELECT
      f.feedback_id AS feedbackId,
      f.created_at AS createdAt,
      f.surface,
      f.target_type AS targetType,
      f.target_id AS targetId,
      f.comment,
      COALESCE(f.override_bucket, f.classification_bucket) AS classificationBucket,
      ge.model_name AS modelName,
      ge.provider,
      ge.generation_id AS generationId
    FROM filtered_feedback f
    LEFT JOIN filtered_generations ge
      ON (f.generation_id IS NOT NULL AND f.generation_id = ge.generation_id)
      OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
    WHERE f.sentiment = 'down'
    ORDER BY f.created_at DESC
    LIMIT 25
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      feedbackId: row.feedbackid,
      createdAt: row.createdat,
      surface: row.surface,
      targetType: row.targettype,
      targetId: row.targetid,
      comment: row.comment,
      classificationBucket: row.classificationbucket,
      modelName: row.modelname,
      provider: row.provider,
      generationId: row.generationid,
    })),
  );
}

export async function getAiFeedbackReviewList(filters: AdminAiFeedbackReviewFilters) {
  const { sql: ctes, values } = filteredFeedbackReviewCtes(filters);

  return sql<{
    feedbackid: string;
    createdat: string;
    updatedat: string;
    surface: string;
    targettype: string;
    targetid: string;
    sentiment: "up" | "down";
    comment: string | null;
    reviewstatus: string;
    reviewnotes: string | null;
    reviewedat: string | null;
    reviewpriority: string;
    rootcause: string | null;
    issueowner: string | null;
    resolutiontype: string | null;
    effectivebucket: string | null;
    classificationbucket: string | null;
    overridebucket: string | null;
    provider: string | null;
    modelname: string | null;
    generationid: string | null;
    generationstatus: string | null;
    routescope: string | null;
    routeentityid: string | null;
    gamepk: string | null;
    articleid: string | null;
    totaltokens: string | null;
    totalestimatedcostusd: string | null;
    latencyms: string | null;
    unresolvedsiblingcount: string;
  }>(
    `
    ${ctes}
    SELECT
      f.feedback_id AS feedbackId,
      f.created_at AS createdAt,
      f.updated_at AS updatedAt,
      f.surface,
      f.target_type AS targetType,
      f.target_id AS targetId,
      f.sentiment,
      f.comment,
      f.review_status AS reviewStatus,
      f.review_notes AS reviewNotes,
      f.reviewed_at AS reviewedAt,
      f.review_priority AS reviewPriority,
      f.root_cause AS rootCause,
      f.issue_owner AS issueOwner,
      f.resolution_type AS resolutionType,
      COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') AS effectiveBucket,
      f.classification_bucket AS classificationBucket,
      f.override_bucket AS overrideBucket,
      ge.provider,
      ge.model_name AS modelName,
      ge.generation_id AS generationId,
      ge.status AS generationStatus,
      ge.route_scope AS routeScope,
      ge.route_entity_id AS routeEntityId,
      ge.game_pk::text AS gamePk,
      ge.article_id::text AS articleId,
      ge.total_tokens::text AS totalTokens,
      ge.estimated_cost_usd::text AS totalEstimatedCostUsd,
      ge.latency_ms::text AS latencyMs,
      (
        SELECT COUNT(*)::text
        FROM ai.feedback sibling
        WHERE sibling.feedback_id <> f.feedback_id
          AND sibling.surface = f.surface
          AND COALESCE(sibling.override_bucket, sibling.classification_bucket, 'unclassified')
              = COALESCE(f.override_bucket, f.classification_bucket, 'unclassified')
          AND sibling.review_status <> 'resolved'
      ) AS unresolvedSiblingCount
    FROM filtered_feedback f
    LEFT JOIN LATERAL (
      SELECT ge.*
      FROM filtered_generations ge
      WHERE (f.generation_id IS NOT NULL AND ge.generation_id = f.generation_id)
         OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
      ORDER BY ge.created_at DESC
      LIMIT 1
    ) ge ON TRUE
    ORDER BY
      CASE f.review_priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END ASC,
      CASE f.review_status WHEN 'new' THEN 0 WHEN 'triaged' THEN 1 ELSE 2 END ASC,
      CASE f.sentiment WHEN 'down' THEN 0 ELSE 1 END ASC,
      f.created_at DESC
    LIMIT 100
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      feedbackId: row.feedbackid,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      surface: row.surface,
      targetType: row.targettype,
      targetId: row.targetid,
      sentiment: row.sentiment,
      comment: row.comment,
      reviewStatus: row.reviewstatus,
      reviewNotes: row.reviewnotes,
      reviewedAt: row.reviewedat,
      reviewPriority: row.reviewpriority ?? defaultReviewPriority(row.sentiment, row.comment, row.effectivebucket),
      rootCause: row.rootcause,
      issueOwner: row.issueowner,
      resolutionType: row.resolutiontype,
      effectiveBucket: row.effectivebucket ?? "unclassified",
      classificationBucket: row.classificationbucket,
      overrideBucket: row.overridebucket,
      provider: row.provider,
      modelName: row.modelname,
      generationId: row.generationid,
      generationStatus: row.generationstatus,
      routeScope: row.routescope,
      routeEntityId: row.routeentityid,
      gamePk: row.gamepk,
      articleId: row.articleid,
      totalTokens: Number(row.totaltokens ?? 0),
      totalEstimatedCostUsd: Number(row.totalestimatedcostusd ?? 0),
      latencyMs: row.latencyms ? Number(row.latencyms) : null,
      unresolvedSiblingCount: Number(row.unresolvedsiblingcount ?? 0),
    })),
  );
}

export async function getAiFeedbackReviewDetail(feedbackId: string) {
  return sqlOne<{
    feedbackid: string;
    createdat: string;
    updatedat: string;
    surface: string;
    targettype: string;
    targetid: string;
    sentiment: "up" | "down";
    comment: string | null;
    reviewstatus: string;
    reviewnotes: string | null;
    reviewedat: string | null;
    reviewedbyuserid: string | null;
    reviewpriority: string;
    rootcause: string | null;
    issueowner: string | null;
    resolutiontype: string | null;
    resolutionnotes: string | null;
    effectivebucket: string | null;
    classificationstatus: string;
    classificationbucket: string | null;
    classificationconfidence: string | null;
    classificationnotes: string | null;
    overridebucket: string | null;
    metadata: unknown;
    provider: string | null;
    modelname: string | null;
    generationid: string | null;
    generationstatus: string | null;
    routescope: string | null;
    routeentityid: string | null;
    gamepk: string | null;
    articleid: string | null;
    totaltokens: string | null;
    totalestimatedcostusd: string | null;
    latencyms: string | null;
    generationmetadata: unknown;
    promptversion: string | null;
    sametargetcount: string;
    samegenerationcount: string;
    unresolvedbucketcount: string;
    samenegativesurfacecount: string;
  }>(
    `
    SELECT
      f.feedback_id AS feedbackId,
      f.created_at AS createdAt,
      f.updated_at AS updatedAt,
      f.surface,
      f.target_type AS targetType,
      f.target_id AS targetId,
      f.sentiment,
      f.comment,
      f.review_status AS reviewStatus,
      f.review_notes AS reviewNotes,
      f.reviewed_at AS reviewedAt,
      f.reviewed_by_user_id::text AS reviewedByUserId,
      f.review_priority AS reviewPriority,
      f.root_cause AS rootCause,
      f.issue_owner AS issueOwner,
      f.resolution_type AS resolutionType,
      f.resolution_notes AS resolutionNotes,
      COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') AS effectiveBucket,
      f.classification_status AS classificationStatus,
      f.classification_bucket AS classificationBucket,
      f.classification_confidence::text AS classificationConfidence,
      f.classification_notes AS classificationNotes,
      f.override_bucket AS overrideBucket,
      f.metadata,
      ge.provider,
      ge.model_name AS modelName,
      ge.generation_id AS generationId,
      ge.status AS generationStatus,
      ge.route_scope AS routeScope,
      ge.route_entity_id AS routeEntityId,
      ge.game_pk::text AS gamePk,
      ge.article_id::text AS articleId,
      ge.total_tokens::text AS totalTokens,
      ge.estimated_cost_usd::text AS totalEstimatedCostUsd,
      ge.latency_ms::text AS latencyMs,
      ge.metadata AS generationMetadata,
      ge.prompt_version AS promptVersion,
      (SELECT COUNT(*)::text FROM ai.feedback same_target WHERE same_target.target_type = f.target_type AND same_target.target_id = f.target_id) AS sameTargetCount,
      (
        SELECT COUNT(*)::text
        FROM ai.feedback same_generation
        WHERE f.generation_id IS NOT NULL
          AND same_generation.generation_id = f.generation_id
      ) AS sameGenerationCount,
      (
        SELECT COUNT(*)::text
        FROM ai.feedback sibling
        WHERE sibling.feedback_id <> f.feedback_id
          AND sibling.review_status <> 'resolved'
          AND sibling.surface = f.surface
          AND COALESCE(sibling.override_bucket, sibling.classification_bucket, 'unclassified')
              = COALESCE(f.override_bucket, f.classification_bucket, 'unclassified')
      ) AS unresolvedBucketCount,
      (
        SELECT COUNT(*)::text
        FROM ai.feedback surface_negative
        WHERE surface_negative.surface = f.surface
          AND surface_negative.sentiment = 'down'
      ) AS sameNegativeSurfaceCount
    FROM ai.feedback f
    LEFT JOIN LATERAL (
      SELECT ge.*
      FROM ai.generation_events ge
      WHERE (f.generation_id IS NOT NULL AND ge.generation_id = f.generation_id)
         OR (f.generation_id IS NULL AND f.target_type = ge.target_type AND f.target_id = ge.target_id)
      ORDER BY ge.created_at DESC
      LIMIT 1
    ) ge ON TRUE
    WHERE f.feedback_id = $1
    LIMIT 1
    `,
    [feedbackId],
  ).then((row) =>
    row
      ? {
          feedbackId: row.feedbackid,
          createdAt: row.createdat,
          updatedAt: row.updatedat,
          surface: row.surface,
          targetType: row.targettype,
          targetId: row.targetid,
          sentiment: row.sentiment,
          comment: row.comment,
          reviewStatus: row.reviewstatus,
          reviewNotes: row.reviewnotes,
          reviewedAt: row.reviewedat,
          reviewedByUserId: row.reviewedbyuserid,
          reviewPriority: row.reviewpriority ?? defaultReviewPriority(row.sentiment, row.comment, row.effectivebucket),
          rootCause: row.rootcause,
          issueOwner: row.issueowner,
          resolutionType: row.resolutiontype,
          resolutionNotes: row.resolutionnotes,
          effectiveBucket: row.effectivebucket ?? "unclassified",
          classificationStatus: row.classificationstatus,
          classificationBucket: row.classificationbucket,
          classificationConfidence: row.classificationconfidence ? Number(row.classificationconfidence) : null,
          classificationNotes: row.classificationnotes,
          overrideBucket: row.overridebucket,
          metadata: row.metadata,
          provider: row.provider,
          modelName: row.modelname,
          generationId: row.generationid,
          generationStatus: row.generationstatus,
          routeScope: row.routescope,
          routeEntityId: row.routeentityid,
          gamePk: row.gamepk,
          articleId: row.articleid,
          totalTokens: Number(row.totaltokens ?? 0),
          totalEstimatedCostUsd: Number(row.totalestimatedcostusd ?? 0),
          latencyMs: row.latencyms ? Number(row.latencyms) : null,
          generationMetadata: row.generationmetadata,
          promptVersion: row.promptversion,
          relatedSignalCounts: {
            sameTarget: Number(row.sametargetcount ?? 0),
            sameGeneration: Number(row.samegenerationcount ?? 0),
            sameSurfaceBucketUnresolved: Number(row.unresolvedbucketcount ?? 0),
            sameSurfaceNegative: Number(row.samenegativesurfacecount ?? 0),
          },
        }
      : null,
  );
}

export async function updateAiFeedbackReview(input: {
  feedbackId: string;
  reviewStatus: "new" | "triaged" | "resolved";
  overrideBucket?: string | null;
  reviewNotes?: string | null;
  reviewPriority?: "low" | "normal" | "high";
  issueOwner?: string | null;
  rootCause?: "prompt_issue" | "data_issue" | "rendering_issue" | "product_expectation" | "model_limit" | "unknown" | null;
  resolutionType?: "prompt_fix" | "data_fix" | "ui_fix" | "no_action" | "needs_follow_up" | null;
  resolutionNotes?: string | null;
}) {
  const { requireOwnerAdmin } = await import("@/lib/server/admin");
  const { writeAuditLog } = await import("@/lib/server/audit");
  const viewer = await requireOwnerAdmin();
  const normalizedNotes = input.reviewNotes?.trim() ? input.reviewNotes.trim() : null;
  const normalizedBucket = input.overrideBucket?.trim() ? input.overrideBucket.trim() : null;
  const normalizedRootCause = input.rootCause?.trim() ? input.rootCause.trim() : null;
  const normalizedResolutionType = input.resolutionType?.trim() ? input.resolutionType.trim() : null;
  const normalizedResolutionNotes = input.resolutionNotes?.trim() ? input.resolutionNotes.trim() : null;
  const normalizedIssueOwner = input.issueOwner?.trim() ? input.issueOwner.trim() : normalizedRootCause ? defaultIssueOwner(normalizedRootCause) : null;

  if (input.reviewStatus === "triaged" && !normalizedRootCause) {
    throw new Error("Root cause is required before triaging a feedback row");
  }

  if (input.reviewStatus === "resolved" && (!normalizedRootCause || !normalizedResolutionType)) {
    throw new Error("Root cause and resolution type are required before resolving a feedback row");
  }

  await sqlOne(
    `
    UPDATE ai.feedback
    SET
      review_status = $2,
      override_bucket = $3,
      review_notes = $4,
      review_priority = $5,
      issue_owner = $6,
      root_cause = $7,
      resolution_type = $8,
      resolution_notes = $9,
      reviewed_by_user_id = $10,
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE feedback_id = $1
    `,
    [
      input.feedbackId,
      input.reviewStatus,
      normalizedBucket,
      normalizedNotes,
      input.reviewPriority ?? "normal",
      normalizedIssueOwner,
      normalizedRootCause,
      normalizedResolutionType,
      normalizedResolutionNotes,
      viewer.userId,
    ],
  );

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "ai_feedback_review_updated",
    targetType: "ai.feedback",
    targetId: input.feedbackId,
    metadata: {
      reviewStatus: input.reviewStatus,
      reviewPriority: input.reviewPriority ?? "normal",
      overrideBucket: normalizedBucket,
      hasReviewNotes: Boolean(normalizedNotes),
      rootCause: normalizedRootCause,
      issueOwner: normalizedIssueOwner,
      resolutionType: normalizedResolutionType,
    },
  });
}

export async function getAiOutstandingReviewCounts() {
  const [rows] = await Promise.all([
    sql<{
      unreviewed: string;
      highpriority: string;
      dataissues: string;
      promptissues: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE review_status = 'new')::text AS unreviewed,
        COUNT(*) FILTER (WHERE review_status <> 'resolved' AND review_priority = 'high')::text AS highPriority,
        COUNT(*) FILTER (WHERE review_status <> 'resolved' AND root_cause = 'data_issue')::text AS dataIssues,
        COUNT(*) FILTER (WHERE review_status <> 'resolved' AND root_cause = 'prompt_issue')::text AS promptIssues
      FROM ai.feedback
      `,
    ),
  ]);

  const row = rows[0] ?? { unreviewed: "0", highpriority: "0", dataissues: "0", promptissues: "0" };
  return {
    unreviewed: Number(row.unreviewed),
    highPriority: Number(row.highpriority),
    dataIssues: Number(row.dataissues),
    promptIssues: Number(row.promptissues),
  };
}

export async function getAiFeedbackRootCauseBreakdown(filters: AdminAiFeedbackReviewFilters) {
  const { sql: ctes, values } = filteredFeedbackReviewCtes(filters);
  return sql<{ rootcause: string | null; count: string }>(
    `
    ${ctes}
    SELECT COALESCE(root_cause, 'unassigned') AS rootCause, COUNT(*)::text AS count
    FROM filtered_feedback
    GROUP BY COALESCE(root_cause, 'unassigned')
    ORDER BY COUNT(*) DESC, COALESCE(root_cause, 'unassigned') ASC
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      rootCause: row.rootcause ?? "unassigned",
      count: Number(row.count),
    })),
  );
}

export async function getAiFeedbackClusterSummary(filters: AdminAiFeedbackReviewFilters) {
  const { sql: ctes, values } = filteredFeedbackReviewCtes(filters);
  return sql<{ surface: string; effectivebucket: string; count: string }>(
    `
    ${ctes}
    SELECT
      f.surface,
      COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') AS effectiveBucket,
      COUNT(*)::text AS count
    FROM filtered_feedback f
    WHERE f.review_status <> 'resolved'
    GROUP BY f.surface, COALESCE(f.override_bucket, f.classification_bucket, 'unclassified')
    ORDER BY COUNT(*) DESC, f.surface ASC
    LIMIT 12
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      surface: row.surface,
      effectiveBucket: row.effectivebucket,
      count: Number(row.count),
    })),
  );
}

export async function getAiFeedbackNeedsActionList(filters: AdminAiFeedbackReviewFilters) {
  const { sql: ctes, values } = filteredFeedbackReviewCtes(filters);
  return sql<{
    feedbackid: string;
    surface: string;
    reviewpriority: string;
    effectivebucket: string;
    createdat: string;
  }>(
    `
    ${ctes}
    SELECT
      f.feedback_id AS feedbackId,
      f.surface,
      f.review_priority AS reviewPriority,
      COALESCE(f.override_bucket, f.classification_bucket, 'unclassified') AS effectiveBucket,
      f.created_at AS createdAt
    FROM filtered_feedback f
    WHERE f.review_status <> 'resolved'
    ORDER BY
      CASE f.review_priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END ASC,
      f.created_at DESC
    LIMIT 25
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      feedbackId: row.feedbackid,
      surface: row.surface,
      reviewPriority: row.reviewpriority,
      effectiveBucket: row.effectivebucket,
      createdAt: row.createdat,
    })),
  );
}

export async function getAiFilterOptions() {
  const [surfaceKeys, surfaceDetails, providers, models, statuses, buckets, reviewStatuses, rootCauses] = await Promise.all([
    sql<{ surface_key: string }>("SELECT DISTINCT surface_key FROM ai.generation_events ORDER BY surface_key ASC"),
    sql<{ surface_detail: string | null }>(
      "SELECT DISTINCT surface_detail FROM ai.generation_events WHERE surface_detail IS NOT NULL ORDER BY surface_detail ASC",
    ),
    sql<{ provider: string }>("SELECT DISTINCT provider FROM ai.generation_events ORDER BY provider ASC"),
    sql<{ model_name: string }>("SELECT DISTINCT model_name FROM ai.generation_events ORDER BY model_name ASC"),
    sql<{ status: string }>("SELECT DISTINCT status FROM ai.generation_events ORDER BY status ASC"),
    sql<{ bucket: string }>(
      "SELECT DISTINCT COALESCE(override_bucket, classification_bucket, 'unclassified') AS bucket FROM ai.feedback ORDER BY bucket ASC",
    ),
    sql<{ review_status: string }>("SELECT DISTINCT review_status FROM ai.feedback ORDER BY review_status ASC"),
    sql<{ root_cause: string | null }>("SELECT DISTINCT root_cause FROM ai.feedback WHERE root_cause IS NOT NULL ORDER BY root_cause ASC"),
  ]);

  return {
    surfaceKeys: surfaceKeys.map((row) => row.surface_key),
    surfaceDetails: surfaceDetails.map((row) => row.surface_detail).filter(Boolean) as string[],
    providers: providers.map((row) => row.provider),
    models: models.map((row) => row.model_name),
    statuses: statuses.map((row) => row.status),
    buckets: buckets.map((row) => row.bucket),
    reviewStatuses: reviewStatuses.map((row) => row.review_status),
    rootCauses: rootCauses.map((row) => row.root_cause).filter(Boolean) as string[],
  };
}
