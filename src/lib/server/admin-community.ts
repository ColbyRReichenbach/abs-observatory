import { sql, sqlOne } from "@/lib/db";
import { writeAuditLog } from "@/lib/server/audit";
import { requireOwnerAdmin } from "@/lib/server/admin";

export type AdminCommunityOverview = {
  pendingComments: number;
  hiddenComments: number;
  openReports: number;
  recentActions: number;
};

export type AdminModerationQueueItem = {
  commentId: string;
  body: string;
  moderationStatus: string;
  toxicityScore: number | null;
  createdAt: string;
  threadType: "article" | "challenge";
  articleSlug: string | null;
  articleTitle: string | null;
  challengeId: string | null;
  gamePk: number | null;
  displayName: string | null;
  username: string | null;
  primaryEmail: string | null;
  openReportCount: number;
};

export type AdminCommentReportRow = {
  reportId: string;
  commentId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reportedByDisplayName: string | null;
  reportedByUsername: string | null;
  commentBody: string;
  commentStatus: string;
  commentAuthorDisplayName: string | null;
  commentAuthorUsername: string | null;
  articleSlug: string | null;
  articleTitle: string | null;
  challengeId: string | null;
  gamePk: number | null;
};

export type AdminModerationActionRow = {
  actionId: string;
  actionType: string;
  reason: string | null;
  createdAt: string;
  actorDisplayName: string | null;
  actorUsername: string | null;
  targetDisplayName: string | null;
  targetUsername: string | null;
  commentId: string | null;
};

export async function getAdminCommunityOverview(): Promise<AdminCommunityOverview> {
  await requireOwnerAdmin();

  const row = await sqlOne<{
    pendingcomments: string;
    hiddencomments: string;
    openreports: string;
    recentactions: string;
  }>(
    `
    SELECT
      (SELECT COUNT(*)::text FROM community.comments WHERE moderation_status = 'pending_review' AND deleted_at IS NULL) AS pendingComments,
      (SELECT COUNT(*)::text FROM community.comments WHERE moderation_status = 'hidden' AND deleted_at IS NULL) AS hiddenComments,
      (SELECT COUNT(*)::text FROM community.comment_reports WHERE status = 'open') AS openReports,
      (SELECT COUNT(*)::text FROM community.moderation_actions WHERE created_at >= NOW() - INTERVAL '7 days') AS recentActions
    `,
  );

  return {
    pendingComments: Number(row?.pendingcomments ?? 0),
    hiddenComments: Number(row?.hiddencomments ?? 0),
    openReports: Number(row?.openreports ?? 0),
    recentActions: Number(row?.recentactions ?? 0),
  };
}

export async function listAdminModerationQueue(limit = 40): Promise<AdminModerationQueueItem[]> {
  await requireOwnerAdmin();

  const boundedLimit = Math.max(1, Math.min(limit, 100));

  return sql<{
    commentid: string;
    body: string;
    moderationstatus: string;
    toxicityscore: number | null;
    createdat: string;
    threadtype: "article" | "challenge";
    articleslug: string | null;
    articletitle: string | null;
    challengeid: string | null;
    gamepk: number | null;
    displayname: string | null;
    username: string | null;
    primaryemail: string | null;
    openreportcount: number;
  }>(
    `
    SELECT
      c.comment_id AS commentId,
      c.body,
      c.moderation_status AS moderationStatus,
      c.toxicity_score AS toxicityScore,
      c.created_at AS createdAt,
      t.thread_type AS threadType,
      a.slug AS articleSlug,
      a.title AS articleTitle,
      t.challenge_id AS challengeId,
      t.game_pk AS gamePk,
      u.display_name AS displayName,
      p.username,
      u.primary_email AS primaryEmail,
      COUNT(cr.report_id) FILTER (WHERE cr.status = 'open')::int AS openReportCount
    FROM community.comments c
    JOIN community.threads t ON t.thread_id = c.thread_id
    LEFT JOIN editorial.articles a ON a.article_id = t.article_id
    LEFT JOIN product.users u ON u.user_id = c.user_id
    LEFT JOIN product.user_profiles p ON p.user_id = c.user_id
    LEFT JOIN community.comment_reports cr ON cr.comment_id = c.comment_id
    WHERE c.deleted_at IS NULL
      AND (
        c.moderation_status IN ('pending_review', 'hidden')
        OR EXISTS (
          SELECT 1
          FROM community.comment_reports cr2
          WHERE cr2.comment_id = c.comment_id
            AND cr2.status = 'open'
        )
      )
    GROUP BY
      c.comment_id,
      c.body,
      c.moderation_status,
      c.toxicity_score,
      c.created_at,
      t.thread_type,
      a.slug,
      a.title,
      t.challenge_id,
      t.game_pk,
      u.display_name,
      p.username,
      u.primary_email
    ORDER BY
      CASE
        WHEN c.moderation_status = 'pending_review' THEN 0
        WHEN COUNT(cr.report_id) FILTER (WHERE cr.status = 'open') > 0 THEN 1
        WHEN c.moderation_status = 'hidden' THEN 2
        ELSE 3
      END,
      c.created_at DESC
    LIMIT $1
    `,
    [boundedLimit],
  ).then((rows) =>
    rows.map((row) => ({
      commentId: row.commentid,
      body: row.body,
      moderationStatus: row.moderationstatus,
      toxicityScore: row.toxicityscore === null ? null : Number(row.toxicityscore),
      createdAt: row.createdat,
      threadType: row.threadtype,
      articleSlug: row.articleslug,
      articleTitle: row.articletitle,
      challengeId: row.challengeid,
      gamePk: row.gamepk === null ? null : Number(row.gamepk),
      displayName: row.displayname,
      username: row.username,
      primaryEmail: row.primaryemail,
      openReportCount: Number(row.openreportcount ?? 0),
    })),
  );
}

export async function listAdminCommentReports(limit = 30): Promise<AdminCommentReportRow[]> {
  await requireOwnerAdmin();

  const boundedLimit = Math.max(1, Math.min(limit, 100));

  return sql<{
    reportid: string;
    commentid: string;
    reason: string;
    details: string | null;
    status: string;
    createdat: string;
    reportedbydisplayname: string | null;
    reportedbyusername: string | null;
    commentbody: string;
    commentstatus: string;
    commentauthordisplayname: string | null;
    commentauthorusername: string | null;
    articleslug: string | null;
    articletitle: string | null;
    challengeid: string | null;
    gamepk: number | null;
  }>(
    `
    SELECT
      cr.report_id AS reportId,
      cr.comment_id AS commentId,
      cr.reason,
      cr.details,
      cr.status,
      cr.created_at AS createdAt,
      reporter.display_name AS reportedByDisplayName,
      reporter_profile.username AS reportedByUsername,
      c.body AS commentBody,
      c.moderation_status AS commentStatus,
      author.display_name AS commentAuthorDisplayName,
      author_profile.username AS commentAuthorUsername,
      a.slug AS articleSlug,
      a.title AS articleTitle,
      t.challenge_id AS challengeId,
      t.game_pk AS gamePk
    FROM community.comment_reports cr
    JOIN community.comments c ON c.comment_id = cr.comment_id
    JOIN community.threads t ON t.thread_id = c.thread_id
    LEFT JOIN editorial.articles a ON a.article_id = t.article_id
    LEFT JOIN product.users reporter ON reporter.user_id = cr.reported_by_user_id
    LEFT JOIN product.user_profiles reporter_profile ON reporter_profile.user_id = cr.reported_by_user_id
    LEFT JOIN product.users author ON author.user_id = c.user_id
    LEFT JOIN product.user_profiles author_profile ON author_profile.user_id = c.user_id
    WHERE cr.status = 'open'
    ORDER BY cr.created_at DESC
    LIMIT $1
    `,
    [boundedLimit],
  ).then((rows) =>
    rows.map((row) => ({
      reportId: row.reportid,
      commentId: row.commentid,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdat,
      reportedByDisplayName: row.reportedbydisplayname,
      reportedByUsername: row.reportedbyusername,
      commentBody: row.commentbody,
      commentStatus: row.commentstatus,
      commentAuthorDisplayName: row.commentauthordisplayname,
      commentAuthorUsername: row.commentauthorusername,
      articleSlug: row.articleslug,
      articleTitle: row.articletitle,
      challengeId: row.challengeid,
      gamePk: row.gamepk === null ? null : Number(row.gamepk),
    })),
  );
}

export async function listRecentModerationActions(limit = 20): Promise<AdminModerationActionRow[]> {
  await requireOwnerAdmin();

  const boundedLimit = Math.max(1, Math.min(limit, 100));

  return sql<{
    actionid: string;
    actiontype: string;
    reason: string | null;
    createdat: string;
    actordisplayname: string | null;
    actorusername: string | null;
    targetdisplayname: string | null;
    targetusername: string | null;
    commentid: string | null;
  }>(
    `
    SELECT
      ma.action_id AS actionId,
      ma.action_type AS actionType,
      ma.reason,
      ma.created_at AS createdAt,
      actor.display_name AS actorDisplayName,
      actor_profile.username AS actorUsername,
      target.display_name AS targetDisplayName,
      target_profile.username AS targetUsername,
      ma.comment_id AS commentId
    FROM community.moderation_actions ma
    LEFT JOIN product.users actor ON actor.user_id = ma.actor_user_id
    LEFT JOIN product.user_profiles actor_profile ON actor_profile.user_id = ma.actor_user_id
    LEFT JOIN product.users target ON target.user_id = ma.target_user_id
    LEFT JOIN product.user_profiles target_profile ON target_profile.user_id = ma.target_user_id
    ORDER BY ma.created_at DESC
    LIMIT $1
    `,
    [boundedLimit],
  ).then((rows) =>
    rows.map((row) => ({
      actionId: row.actionid,
      actionType: row.actiontype,
      reason: row.reason,
      createdAt: row.createdat,
      actorDisplayName: row.actordisplayname,
      actorUsername: row.actorusername,
      targetDisplayName: row.targetdisplayname,
      targetUsername: row.targetusername,
      commentId: row.commentid,
    })),
  );
}

export async function moderateCommentFromAdmin(input: {
  commentId: string;
  action: "hide" | "restore";
  reason?: string | null;
}) {
  const viewer = await requireOwnerAdmin();

  const nextStatus = input.action === "hide" ? "hidden" : "published";
  const updated = await sqlOne<{ userid: string | null }>(
    `
    UPDATE community.comments
    SET
      moderation_status = $2,
      updated_at = NOW()
    WHERE comment_id = $1
    RETURNING user_id AS userId
    `,
    [input.commentId, nextStatus],
  );

  if (!updated) {
    throw new Error("Comment not found");
  }

  await sql(
    `
    INSERT INTO community.moderation_actions (
      actor_user_id,
      comment_id,
      target_user_id,
      action_type,
      reason,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      viewer.userId,
      input.commentId,
      updated.userid,
      input.action === "hide" ? "hide_comment" : "restore_comment",
      input.reason ?? null,
      JSON.stringify({ source: "admin.community" }),
    ],
  );

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: input.action === "hide" ? "hide_comment" : "restore_comment",
    targetType: "community.comment",
    targetId: input.commentId,
    metadata: { reason: input.reason ?? null, source: "admin.community" },
  });
}

export async function updateCommentReportStatusFromAdmin(input: {
  reportId: string;
  status: "reviewed" | "dismissed" | "actioned";
}) {
  const viewer = await requireOwnerAdmin();

  const updated = await sqlOne<{ reportid: string }>(
    `
    UPDATE community.comment_reports
    SET
      status = $2,
      updated_at = NOW()
    WHERE report_id = $1
    RETURNING report_id AS reportId
    `,
    [input.reportId, input.status],
  );

  if (!updated) {
    throw new Error("Report not found");
  }

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "update_comment_report_status",
    targetType: "community.comment_report",
    targetId: input.reportId,
    metadata: { status: input.status, source: "admin.community" },
  });
}
