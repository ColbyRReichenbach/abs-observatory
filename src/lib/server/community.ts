import { sql, sqlOne, withTransaction } from "@/lib/db";
import { getViewerProfile } from "./profiles";
import { moderateComment } from "./moderation";
import { writeAuditLog } from "./audit";
import { normalizeCommentBody, validateCommentBody } from "./comment-policy";
import { assertValidCsrf } from "./csrf";
import { requireAnyRole } from "./roles";
import { consumeRateLimit } from "./scale";

export type ThreadComment = {
  commentId: string;
  threadId: string;
  userId: string | null;
  parentCommentId: string | null;
  username: string | null;
  displayName: string | null;
  body: string;
  structuredReaction: string | null;
  moderationStatus: string;
  toxicityScore: number | null;
  deletedAt: string | null;
  createdAt: string;
};

export type ModerationAction = "hide" | "restore" | "delete";

type ThreadAnchor =
  | { threadType: "article"; articleId: string }
  | { threadType: "challenge"; challengeId: string };

export async function findThreadId(anchor: ThreadAnchor): Promise<string | null> {
  const existing = await sqlOne<{ threadid: string }>(
    anchor.threadType === "article"
      ? `
        SELECT thread_id AS threadId
        FROM community.threads
        WHERE thread_type = 'article' AND article_id = $1
        LIMIT 1
        `
      : `
        SELECT thread_id AS threadId
        FROM community.threads
        WHERE thread_type = 'challenge' AND challenge_id = $1
        LIMIT 1
        `,
    [anchor.threadType === "article" ? anchor.articleId : anchor.challengeId],
  );

  return existing?.threadid ?? null;
}

export async function ensureThread(anchor: ThreadAnchor): Promise<string> {
  const existingThreadId = await findThreadId(anchor);
  if (existingThreadId) return existingThreadId;

  const created = await sqlOne<{ threadid: string }>(
    anchor.threadType === "article"
      ? `
        INSERT INTO community.threads (thread_type, article_id)
        VALUES ('article', $1)
        RETURNING thread_id AS threadId
        `
      : `
        INSERT INTO community.threads (thread_type, challenge_id)
        VALUES ('challenge', $1)
        RETURNING thread_id AS threadId
        `,
    [anchor.threadType === "article" ? anchor.articleId : anchor.challengeId],
  );

  if (!created) {
    throw new Error("Failed to create thread");
  }

  return created.threadid;
}

export async function listComments(threadId: string): Promise<ThreadComment[]> {
  const rows = await sql<{
    commentid: string;
    threadid: string;
    userid: string | null;
    parentcommentid: string | null;
    username: string | null;
    displayname: string | null;
    body: string;
    structuredreaction: string | null;
    moderationstatus: string;
    toxicityscore: number | null;
    deletedat: string | null;
    createdat: string;
  }>(
    `
    SELECT
      c.comment_id AS commentId,
      c.thread_id AS threadId,
      c.user_id AS userId,
      c.parent_comment_id AS parentCommentId,
      p.username,
      u.display_name AS displayName,
      c.body,
      c.structured_reaction AS structuredReaction,
      c.moderation_status AS moderationStatus,
      c.toxicity_score AS toxicityScore,
      c.deleted_at AS deletedAt,
      c.created_at AS createdAt
    FROM community.comments c
    LEFT JOIN product.users u ON u.user_id = c.user_id
    LEFT JOIN product.user_profiles p ON p.user_id = c.user_id
    WHERE c.thread_id = $1
    ORDER BY c.created_at ASC
    `,
    [threadId],
  );

  return rows.map((row) => ({
    commentId: row.commentid,
    threadId: row.threadid,
    userId: row.userid,
    parentCommentId: row.parentcommentid,
    username: row.username,
    displayName: row.displayname,
    body: row.deletedat || row.userid === null ? "Comment removed" : row.body,
    structuredReaction: row.structuredreaction,
    moderationStatus: row.deletedat || row.userid === null ? "deleted" : row.moderationstatus,
    toxicityScore: row.toxicityscore === null ? null : Number(row.toxicityscore),
    deletedAt: row.deletedat,
    createdAt: row.createdat,
  }));
}

async function ensureThreadWritable(threadId: string): Promise<void> {
  const thread = await sqlOne<{ status: string }>(
    `
    SELECT status
    FROM community.threads
    WHERE thread_id = $1
    `,
    [threadId],
  );

  if (!thread) {
    throw new Error("Thread not found");
  }

  if (thread.status !== "open") {
    throw new Error("Thread is not open for comments");
  }
}

async function getCommentRecord(commentId: string): Promise<{
  commentid: string;
  threadid: string;
  userid: string | null;
  moderationstatus: string;
  deletedat: string | null;
} | null> {
  return sqlOne<{
    commentid: string;
    threadid: string;
    userid: string | null;
    moderationstatus: string;
    deletedat: string | null;
  }>(
    `
    SELECT
      comment_id AS commentId,
      thread_id AS threadId,
      user_id AS userId,
      moderation_status AS moderationStatus,
      deleted_at AS deletedAt
    FROM community.comments
    WHERE comment_id = $1
    `,
    [commentId],
  );
}

async function requireModerator(request: Request) {
  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);
  requireAnyRole(viewer.roles, ["admin", "moderator"]);
  return viewer;
}

async function writeRateLimitEvent(subjectKey: string, endpoint: string, requestCount: number): Promise<void> {
  await sql(
    `
    INSERT INTO ops.rate_limit_events (subject_key, subject_type, endpoint, window_seconds, request_count)
    VALUES ($1, 'user', $2, 60, $3)
    `,
    [subjectKey, endpoint, requestCount],
  );
}

async function enforceCommentRateLimit(viewer: Awaited<ReturnType<typeof getViewerProfile>>, threadId: string): Promise<void> {
  if (!viewer) return;

  const accountAgeMs = Date.now() - Date.parse(viewer.createdAt);
  const isNewAccount = Number.isFinite(accountAgeMs) && accountAgeMs < 24 * 60 * 60 * 1000;
  const maxPerMinute = isNewAccount ? 3 : 6;

  const [fastUserWindow, fastThreadWindow] = await Promise.all([
    consumeRateLimit({
      bucket: "comments:user",
      subject: viewer.userId,
      limit: maxPerMinute,
      windowMs: 60_000,
    }),
    consumeRateLimit({
      bucket: "comments:thread",
      subject: threadId,
      limit: 20,
      windowMs: 60_000,
    }),
  ]);

  if (!fastUserWindow.allowed) {
    await writeRateLimitEvent(viewer.userId, "comments:user", fastUserWindow.currentCount);
    throw new Error("Comment rate limit exceeded");
  }

  if (!fastThreadWindow.allowed) {
    await writeRateLimitEvent(threadId, "comments:thread", fastThreadWindow.currentCount);
    throw new Error("Thread comment rate limit exceeded");
  }

  const [userWindow, threadWindow] = await Promise.all([
    sqlOne<{ recentcount: string }>(
      `
      SELECT COUNT(*)::text AS recentCount
      FROM community.comments
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 minute'
      `,
      [viewer.userId],
    ),
    sqlOne<{ recentcount: string }>(
      `
      SELECT COUNT(*)::text AS recentCount
      FROM community.comments
      WHERE thread_id = $1
        AND created_at >= NOW() - INTERVAL '1 minute'
      `,
      [threadId],
    ),
  ]);

  const userCount = Number(userWindow?.recentcount ?? 0);
  const threadCount = Number(threadWindow?.recentcount ?? 0);

  if (userCount >= maxPerMinute) {
    await writeRateLimitEvent(viewer.userId, "comments:user", userCount);
    throw new Error("Comment rate limit exceeded");
  }

  if (threadCount >= 20) {
    await writeRateLimitEvent(threadId, "comments:thread", threadCount);
    throw new Error("Thread comment rate limit exceeded");
  }
}

export async function createComment(
  request: Request,
  input: {
    threadId?: string;
    articleId?: string;
    challengeId?: string;
    parentCommentId?: string;
    body: string;
    structuredReaction?: string | null;
  },
): Promise<ThreadComment> {
  if (process.env.COMMENTS_GLOBAL_KILL_SWITCH === "true") {
    throw new Error("Comments are temporarily disabled");
  }

  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);
  if (!viewer.postingEnabled) {
    throw new Error("Posting is disabled for this account");
  }

  const bodyValidation = validateCommentBody(input.body);
  if (!bodyValidation.ok) {
    throw new Error(bodyValidation.error);
  }
  const threadId =
    input.threadId ??
    (input.articleId ? await ensureThread({ threadType: "article", articleId: input.articleId }) : null) ??
    (input.challengeId ? await ensureThread({ threadType: "challenge", challengeId: input.challengeId }) : null);

  if (!threadId) {
    throw new Error("A threadId, articleId, or challengeId is required");
  }

  await ensureThreadWritable(threadId);
  let parentCommentId: string | null = null;
  if (input.parentCommentId) {
    const parent = await getCommentRecord(input.parentCommentId);
    if (!parent) {
      throw new Error("Parent comment not found");
    }
    if (parent.threadid !== threadId) {
      throw new Error("Parent comment does not belong to this thread");
    }
    parentCommentId = parent.commentid;
  }
  await enforceCommentRateLimit(viewer, threadId);

  const normalizedBody = normalizeCommentBody(bodyValidation.body);
  const moderation = moderateComment(normalizedBody);
  const created = await withTransaction(async (query) => {
    const rows = await query<{
      commentid: string;
      createdat: string;
    }>(
      `
      INSERT INTO community.comments (
        thread_id,
        parent_comment_id,
        user_id,
        body,
        structured_reaction,
        moderation_status,
        toxicity_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING comment_id AS commentId, created_at AS createdAt
      `,
      [
        threadId,
        parentCommentId,
        viewer.userId,
        normalizedBody,
        input.structuredReaction ?? null,
        moderation.moderationStatus,
        moderation.toxicityScore,
      ],
    );

    await query(
      `
      UPDATE community.threads
      SET updated_at = NOW()
      WHERE thread_id = $1
      `,
      [threadId],
    );

    return rows[0];
  });

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "create_comment",
    targetType: "community.comment",
    targetId: created.commentid,
    metadata: { moderation },
  });

  return {
    commentId: created.commentid,
    threadId,
    userId: viewer.userId,
    parentCommentId,
    username: viewer.username,
    displayName: viewer.displayName,
    body: normalizedBody,
    structuredReaction: input.structuredReaction ?? null,
    moderationStatus: moderation.moderationStatus,
    toxicityScore: moderation.toxicityScore,
    deletedAt: null,
    createdAt: created.createdat,
  };
}

export async function deleteOwnComment(request: Request, commentId: string): Promise<ThreadComment> {
  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);

  const existing = await getCommentRecord(commentId);
  if (!existing) {
    throw new Error("Comment not found");
  }
  if (existing.userid !== viewer.userId) {
    throw new Error("Forbidden");
  }

  const updated = await sqlOne<{
    commentid: string;
    threadid: string;
    userid: string | null;
    createdat: string;
  }>(
    `
    UPDATE community.comments
    SET
      body = '[deleted]',
      moderation_status = 'deleted',
      deleted_at = COALESCE(deleted_at, NOW()),
      updated_at = NOW()
    WHERE comment_id = $1
    RETURNING
      comment_id AS commentId,
      thread_id AS threadId,
      user_id AS userId,
      created_at AS createdAt
    `,
    [commentId],
  );

  if (!updated) {
    throw new Error("Comment not found");
  }

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "delete_own_comment",
    targetType: "community.comment",
    targetId: commentId,
  });

  return {
    commentId: updated.commentid,
    threadId: updated.threadid,
    userId: updated.userid,
    parentCommentId: null,
    username: viewer.username,
    displayName: viewer.displayName,
    body: "Comment removed",
    structuredReaction: null,
    moderationStatus: "deleted",
    toxicityScore: null,
    deletedAt: new Date().toISOString(),
    createdAt: updated.createdat,
  };
}

export async function moderateCommentAction(
  request: Request,
  params: {
    commentId: string;
    action: Exclude<ModerationAction, "delete">;
    reason?: string | null;
  },
): Promise<ThreadComment> {
  const viewer = await requireModerator(request);
  const existing = await getCommentRecord(params.commentId);

  if (!existing) {
    throw new Error("Comment not found");
  }

  const nextStatus = params.action === "hide" ? "hidden" : "published";
  const updated = await sqlOne<{
    commentid: string;
    threadid: string;
    userid: string | null;
    moderationstatus: string;
    deletedat: string | null;
    createdat: string;
  }>(
    `
    UPDATE community.comments
    SET
      moderation_status = $2,
      updated_at = NOW()
    WHERE comment_id = $1
    RETURNING
      comment_id AS commentId,
      thread_id AS threadId,
      user_id AS userId,
      moderation_status AS moderationStatus,
      deleted_at AS deletedAt,
      created_at AS createdAt
    `,
    [params.commentId, nextStatus],
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
      params.commentId,
      updated.userid,
      params.action === "hide" ? "hide_comment" : "restore_comment",
      params.reason ?? null,
      JSON.stringify({ threadId: updated.threadid }),
    ],
  );

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: params.action === "hide" ? "hide_comment" : "restore_comment",
    targetType: "community.comment",
    targetId: params.commentId,
    metadata: { reason: params.reason ?? null },
  });

  const comments = await listComments(updated.threadid);
  const comment = comments.find((entry) => entry.commentId === params.commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }
  return comment;
}

async function requireVerifiedViewer(request: Request) {
  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);
  return viewer;
}

async function requireAvailableComment(commentId: string) {
  const existing = await getCommentRecord(commentId);
  if (!existing) {
    throw new Error("Comment not found");
  }
  if (existing.deletedat || existing.moderationstatus !== "published") {
    throw new Error("Comment is not available");
  }
  return existing;
}

export async function likeComment(request: Request, commentId: string): Promise<void> {
  const viewer = await requireVerifiedViewer(request);
  const likeWindow = await consumeRateLimit({
    bucket: "comments:likes",
    subject: viewer.userId,
    limit: 30,
    windowMs: 60_000,
  });

  if (!likeWindow.allowed) {
    throw new Error("Comment like rate limit exceeded");
  }

  await requireAvailableComment(commentId);
  await sql(
    `
    INSERT INTO community.comment_likes (comment_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [commentId, viewer.userId],
  );
}

export async function unlikeComment(request: Request, commentId: string): Promise<void> {
  const viewer = await requireVerifiedViewer(request);
  await requireAvailableComment(commentId);
  await sql(
    `
    DELETE FROM community.comment_likes
    WHERE comment_id = $1 AND user_id = $2
    `,
    [commentId, viewer.userId],
  );
}

export async function reportComment(
  request: Request,
  params: {
    commentId: string;
    reason: string;
    details?: string | null;
  },
): Promise<void> {
  const viewer = await requireVerifiedViewer(request);
  const existing = await getCommentRecord(params.commentId);
  if (!existing) {
    throw new Error("Comment not found");
  }

  await sql(
    `
    INSERT INTO community.comment_reports (comment_id, reported_by_user_id, reason, details)
    VALUES ($1, $2, $3, $4)
    `,
    [params.commentId, viewer.userId, params.reason, params.details ?? null],
  );
}
