import { sql, sqlOne } from "@/lib/db";

export type AdminUserFilters = {
  q?: string | null;
  verification?: "all" | "verified" | "unverified";
  profile?: "all" | "public" | "private" | "setup";
  role?: "all" | "user" | "moderator" | "admin";
  activity?: "all" | "recent" | "stale";
};

export type AdminUserRow = {
  userId: string;
  displayName: string | null;
  primaryEmail: string | null;
  username: string | null;
  favoriteTeamName: string | null;
  isVerified: boolean;
  isPublic: boolean;
  postingEnabled: boolean;
  aiHistoryEnabled: boolean;
  aiStrikesExempt: boolean;
  aiStrikeCount: number;
  aiSuspendedUntil: string | null;
  aiBannedAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  verifiedAt: string | null;
  commentCount: number;
  savedArtifactCount: number;
  openReportCount: number;
  roles: string[];
  onboardingComplete: boolean;
};

export type AdminUsersOverview = {
  usersInView: number;
  verifiedUsers: number;
  publicProfiles: number;
  setupCompleteUsers: number;
  activeThirtyDays: number;
  flaggedAiUsers: number;
};

function normalizeFilters(filters: AdminUserFilters): Required<AdminUserFilters> {
  return {
    q: filters.q?.trim() ?? "",
    verification: filters.verification ?? "all",
    profile: filters.profile ?? "all",
    role: filters.role ?? "all",
    activity: filters.activity ?? "all",
  };
}

function buildFilteredUsersCte(filters: AdminUserFilters) {
  const normalized = normalizeFilters(filters);
  const values: unknown[] = [];
  const where: string[] = [];

  if (normalized.q) {
    values.push(`%${normalized.q.toLowerCase()}%`);
    const idx = values.length;
    where.push(`(
      LOWER(COALESCE(u.display_name, '')) LIKE $${idx}
      OR LOWER(COALESCE(u.primary_email, '')) LIKE $${idx}
      OR LOWER(COALESCE(p.username, '')) LIKE $${idx}
    )`);
  }

  if (normalized.verification === "verified") {
    where.push("u.is_verified = TRUE");
  } else if (normalized.verification === "unverified") {
    where.push("u.is_verified = FALSE");
  }

  if (normalized.profile === "public") {
    where.push("p.is_public = TRUE AND p.username IS NOT NULL");
  } else if (normalized.profile === "private") {
    where.push("(p.is_public = FALSE OR p.username IS NULL)");
  } else if (normalized.profile === "setup") {
    where.push("NOT (u.is_verified = TRUE AND p.username IS NOT NULL AND p.favorite_team_id IS NOT NULL AND p.is_public = TRUE)");
  }

  if (normalized.role !== "all") {
    values.push(normalized.role);
    const idx = values.length;
    where.push(`EXISTS (
      SELECT 1
      FROM product.user_roles r2
      WHERE r2.user_id = u.user_id
        AND r2.role = $${idx}
    )`);
  }

  if (normalized.activity === "recent") {
    where.push("u.last_seen_at >= NOW() - INTERVAL '30 days'");
  } else if (normalized.activity === "stale") {
    where.push("(u.last_seen_at IS NULL OR u.last_seen_at < NOW() - INTERVAL '30 days')");
  }

  return {
    values,
    sql: `
      WITH filtered_users AS (
        SELECT
          u.user_id AS userId,
          u.display_name AS displayName,
          u.primary_email AS primaryEmail,
          p.username,
          t.name AS favoriteTeamName,
          u.is_verified AS isVerified,
          p.is_public AS isPublic,
          p.posting_enabled AS postingEnabled,
          p.ai_history_enabled AS aiHistoryEnabled,
          COALESCE(p.ai_strikes_exempt, FALSE) AS aiStrikesExempt,
          p.ai_strike_count AS aiStrikeCount,
          p.ai_suspended_until AS aiSuspendedUntil,
          p.ai_banned_at AS aiBannedAt,
          u.created_at AS createdAt,
          u.last_seen_at AS lastSeenAt,
          u.verified_at AS verifiedAt,
          (
            SELECT COUNT(*)::int
            FROM community.comments c
            WHERE c.user_id = u.user_id
              AND c.deleted_at IS NULL
              AND c.moderation_status = 'published'
          ) AS commentCount,
          (
            SELECT COUNT(*)::int
            FROM ai.saved_artifacts sa
            WHERE sa.user_id = u.user_id
          ) AS savedArtifactCount,
          (
            SELECT COUNT(*)::int
            FROM community.comment_reports cr
            JOIN community.comments c ON c.comment_id = cr.comment_id
            WHERE c.user_id = u.user_id
              AND cr.status = 'open'
          ) AS openReportCount,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.role), NULL) AS roles,
          (u.is_verified = TRUE AND p.username IS NOT NULL AND p.favorite_team_id IS NOT NULL AND p.is_public = TRUE) AS onboardingComplete
        FROM product.users u
        LEFT JOIN product.user_profiles p ON p.user_id = u.user_id
        LEFT JOIN teams t ON t.team_id = p.favorite_team_id
        LEFT JOIN product.user_roles r ON r.user_id = u.user_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY
          u.user_id,
          u.display_name,
          u.primary_email,
          p.username,
          t.name,
          u.is_verified,
          p.is_public,
          p.posting_enabled,
          p.ai_history_enabled,
          p.ai_strikes_exempt,
          p.ai_strike_count,
          p.ai_suspended_until,
          p.ai_banned_at,
          u.created_at,
          u.last_seen_at,
          u.verified_at,
          p.favorite_team_id
      )
    `,
  };
}

export async function getAdminUsersOverview(filters: AdminUserFilters): Promise<AdminUsersOverview> {
  const { sql: cteSql, values } = buildFilteredUsersCte(filters);

  return sqlOne<{
    usersinview: string;
    verifiedusers: string;
    publicprofiles: string;
    setupcompleteusers: string;
    activethirtydays: string;
    flaggedaiusers: string;
  }>(
    `
    ${cteSql}
    SELECT
      COUNT(*)::text AS usersInView,
      COUNT(*) FILTER (WHERE isVerified)::text AS verifiedUsers,
      COUNT(*) FILTER (WHERE isPublic AND username IS NOT NULL)::text AS publicProfiles,
      COUNT(*) FILTER (WHERE onboardingComplete)::text AS setupCompleteUsers,
      COUNT(*) FILTER (WHERE lastSeenAt >= NOW() - INTERVAL '30 days')::text AS activeThirtyDays,
      COUNT(*) FILTER (WHERE aiStrikeCount > 0 OR aiSuspendedUntil IS NOT NULL OR aiBannedAt IS NOT NULL)::text AS flaggedAiUsers
    FROM filtered_users
    `,
    values,
  ).then((row) => ({
    usersInView: Number(row?.usersinview ?? 0),
    verifiedUsers: Number(row?.verifiedusers ?? 0),
    publicProfiles: Number(row?.publicprofiles ?? 0),
    setupCompleteUsers: Number(row?.setupcompleteusers ?? 0),
    activeThirtyDays: Number(row?.activethirtydays ?? 0),
    flaggedAiUsers: Number(row?.flaggedaiusers ?? 0),
  }));
}

export async function listAdminUsers(filters: AdminUserFilters, limit = 100): Promise<AdminUserRow[]> {
  const { sql: cteSql, values } = buildFilteredUsersCte(filters);
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  values.push(boundedLimit);

  return sql<{
    userid: string;
    displayname: string | null;
    primaryemail: string | null;
    username: string | null;
    favoriteteamname: string | null;
    isverified: boolean;
    ispublic: boolean;
    postingenabled: boolean;
    aihistoryenabled: boolean;
    aistrikesexempt: boolean;
    aistrikecount: number;
    aisuspendeduntil: string | null;
    aibannedat: string | null;
    createdat: string;
    lastseenat: string | null;
    verifiedat: string | null;
    commentcount: number;
    savedartifactcount: number;
    openreportcount: number;
    roles: string[] | null;
    onboardingcomplete: boolean;
  }>(
    `
    ${cteSql}
    SELECT *
    FROM filtered_users
    ORDER BY createdAt DESC
    LIMIT $${values.length}
    `,
    values,
  ).then((rows) =>
    rows.map((row) => ({
      userId: row.userid,
      displayName: row.displayname,
      primaryEmail: row.primaryemail,
      username: row.username,
      favoriteTeamName: row.favoriteteamname,
      isVerified: row.isverified,
      isPublic: row.ispublic,
      postingEnabled: row.postingenabled,
      aiHistoryEnabled: row.aihistoryenabled,
      aiStrikesExempt: row.aistrikesexempt,
      aiStrikeCount: Number(row.aistrikecount ?? 0),
      aiSuspendedUntil: row.aisuspendeduntil,
      aiBannedAt: row.aibannedat,
      createdAt: row.createdat,
      lastSeenAt: row.lastseenat,
      verifiedAt: row.verifiedat,
      commentCount: Number(row.commentcount ?? 0),
      savedArtifactCount: Number(row.savedartifactcount ?? 0),
      openReportCount: Number(row.openreportcount ?? 0),
      roles: row.roles ?? [],
      onboardingComplete: row.onboardingcomplete,
    })),
  );
}
