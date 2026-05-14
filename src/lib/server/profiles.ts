import { sqlOne, withTransaction } from "@/lib/db";
import { getAuthIdentity } from "./auth";
import { assertValidCsrf } from "./csrf";
import { syncOwnerAdminRole } from "./owner-admin";
import {
  type ApprovedAvatarPreset,
  isApprovedAvatarPreset,
  normalizeUsername,
  validateUsername,
} from "./identity-policy";

export type ViewerProfile = {
  userId: string;
  authProvider: string;
  externalAuthId: string;
  primaryEmail: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarPreset: ApprovedAvatarPreset | null;
  username: string | null;
  bio: string | null;
  favoriteTeamId: number | null;
  isPublic: boolean;
  postingEnabled: boolean;
  aiHistoryEnabled: boolean;
  aiStrikesExempt: boolean;
  aiStrikeCount: number;
  aiSuspendedUntil: string | null;
  aiBannedAt: string | null;
  lastAiMisuseAt: string | null;
  isVerified: boolean;
  createdAt: string;
  verifiedAt: string | null;
  commentCount: number;
  savedArtifactCount: number;
  roles: string[];
};

export type PublicProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  avatarPreset: ApprovedAvatarPreset | null;
  username: string;
  bio: string | null;
  favoriteTeamId: number | null;
  favoriteTeamName: string | null;
  isVerified: boolean;
  createdAt: string;
  commentCount: number;
  savedArtifactCount: number;
};

function deriveUsername(seed: string | null | undefined): string | null {
  if (!seed) return null;
  const normalized = normalizeUsername(seed);
  const validation = validateUsername(normalized);
  return validation.ok ? validation.username : null;
}

export async function syncUserFromIdentity(identity: NonNullable<Awaited<ReturnType<typeof getAuthIdentity>>>) {
  const existing = await sqlOne<{ userid: string }>(
    `
    SELECT user_id AS userId
    FROM product.users
    WHERE external_auth_provider = $1
      AND external_auth_id = $2
    `,
    [identity.provider, identity.externalAuthId],
  );

  if (!existing && process.env.SIGNUPS_GLOBAL_KILL_SWITCH === "true") {
    throw new Error("New signups are temporarily disabled");
  }

  if (identity.email) {
    const emailOwner = await sqlOne<{
      userid: string;
      authprovider: string;
      externalauthid: string;
    }>(
      `
      SELECT
        user_id AS userId,
        external_auth_provider AS authProvider,
        external_auth_id AS externalAuthId
      FROM product.users
      WHERE LOWER(primary_email) = LOWER($1)
      LIMIT 1
      `,
      [identity.email],
    );

    if (
      emailOwner &&
      (emailOwner.authprovider !== identity.provider || emailOwner.externalauthid !== identity.externalAuthId)
    ) {
      throw new Error("Email is already attached to another account");
    }
  }

  const username = deriveUsername(identity.displayName ?? identity.email ?? identity.externalAuthId);

  const result = await withTransaction(async (query) => {
    const userRows = await query<{
      user_id: string;
    }>(
      `
      INSERT INTO product.users (
        external_auth_provider,
        external_auth_id,
        primary_email,
        display_name,
        avatar_url,
        is_verified,
        verified_at,
        last_seen_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN NOW() ELSE NULL END, NOW())
      ON CONFLICT (external_auth_provider, external_auth_id)
      DO UPDATE SET
        primary_email = COALESCE(EXCLUDED.primary_email, product.users.primary_email),
        display_name = COALESCE(EXCLUDED.display_name, product.users.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, product.users.avatar_url),
        is_verified = EXCLUDED.is_verified,
        verified_at = CASE
          WHEN EXCLUDED.is_verified THEN COALESCE(product.users.verified_at, NOW())
          ELSE NULL
        END,
        last_seen_at = NOW()
      RETURNING user_id
      `,
      [
        identity.provider,
        identity.externalAuthId,
        identity.email,
        identity.displayName,
        identity.avatarUrl,
        identity.isVerified,
      ],
    );

    const userId = userRows[0]?.user_id;
    if (!userId) {
      throw new Error("Failed to provision user");
    }

    await query(
      `
      INSERT INTO product.user_profiles (user_id, username, avatar_preset)
      VALUES (
        $1,
        CASE
          WHEN $2::text IS NULL THEN NULL
          WHEN EXISTS (
            SELECT 1
            FROM product.user_profiles
            WHERE username = $2::text
              AND user_id <> $1
          ) THEN NULL
          ELSE $2::text
        END,
        NULL
      )
      ON CONFLICT (user_id) DO NOTHING
      `,
      [userId, username],
    );

    await query(
      `
      INSERT INTO product.user_roles (user_id, role)
      VALUES ($1, 'user')
      ON CONFLICT (user_id, role) DO NOTHING
      `,
      [userId],
    );

    await syncOwnerAdminRole(query, {
      userId,
      authProvider: identity.provider,
      externalAuthId: identity.externalAuthId,
    });

    return userId;
  });

  return result;
}

export async function getViewerProfile(request?: Request): Promise<ViewerProfile | null> {
  const identity = await getAuthIdentity(request);
  if (!identity) return null;

  const userId = await syncUserFromIdentity(identity);

  return sqlOne<{
    userid: string;
    authprovider: string;
    externalauthid: string;
    primaryemail: string | null;
    displayname: string | null;
    avatarurl: string | null;
    avatarpreset: ApprovedAvatarPreset | null;
    username: string | null;
    bio: string | null;
    favoriteteamid: number | null;
    ispublic: boolean;
    postingenabled: boolean;
    aihistoryenabled: boolean;
    aistrikesexempt: boolean;
    aistrikecount: number;
    aisuspendeduntil: string | null;
    aibannedat: string | null;
    lastaimisuseat: string | null;
    isverified: boolean;
    createdat: string;
    verifiedat: string | null;
    commentcount: number;
    savedartifactcount: number;
    roles: string[] | null;
  }>(
    `
    SELECT
      u.user_id AS userId,
      u.external_auth_provider AS authProvider,
      u.external_auth_id AS externalAuthId,
      u.primary_email AS primaryEmail,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      p.avatar_preset AS avatarPreset,
      p.username,
      p.bio,
      p.favorite_team_id AS favoriteTeamId,
      p.is_public AS isPublic,
      p.posting_enabled AS postingEnabled,
      p.ai_history_enabled AS aiHistoryEnabled,
      COALESCE(p.ai_strikes_exempt, FALSE) AS aiStrikesExempt,
      p.ai_strike_count AS aiStrikeCount,
      p.ai_suspended_until AS aiSuspendedUntil,
      p.ai_banned_at AS aiBannedAt,
      p.last_ai_misuse_at AS lastAiMisuseAt,
      u.is_verified AS isVerified,
      u.created_at AS createdAt,
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
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.role), NULL) AS roles
    FROM product.users u
    LEFT JOIN product.user_profiles p ON p.user_id = u.user_id
    LEFT JOIN product.user_roles r ON r.user_id = u.user_id
    WHERE u.user_id = $1
    GROUP BY
      u.user_id,
      u.external_auth_provider,
      u.external_auth_id,
      u.primary_email,
      u.display_name,
      u.avatar_url,
      u.is_verified,
      u.created_at,
      u.verified_at,
      p.avatar_preset,
      p.username,
      p.bio,
      p.favorite_team_id,
      p.is_public,
      p.posting_enabled,
      p.ai_history_enabled,
      p.ai_strikes_exempt,
      p.ai_strike_count,
      p.ai_suspended_until,
      p.ai_banned_at,
      p.last_ai_misuse_at
    `,
    [userId],
  ).then((row) =>
    row
      ? {
          userId: row.userid,
          authProvider: row.authprovider,
          externalAuthId: row.externalauthid,
          primaryEmail: row.primaryemail,
          displayName: row.displayname,
          avatarUrl: row.avatarurl,
          avatarPreset: row.avatarpreset,
          username: row.username,
          bio: row.bio,
          favoriteTeamId: row.favoriteteamid,
          isPublic: row.ispublic,
          postingEnabled: row.postingenabled,
          aiHistoryEnabled: row.aihistoryenabled,
          aiStrikesExempt: row.aistrikesexempt,
          aiStrikeCount: Number(row.aistrikecount),
          aiSuspendedUntil: row.aisuspendeduntil,
          aiBannedAt: row.aibannedat,
          lastAiMisuseAt: row.lastaimisuseat,
          isVerified: row.isverified,
          createdAt: row.createdat,
          verifiedAt: row.verifiedat,
          commentCount: row.commentcount,
          savedArtifactCount: row.savedartifactcount,
          roles: row.roles ?? [],
        }
      : null,
  );
}

export async function getPublicProfileByUsername(rawUsername: string): Promise<PublicProfile | null> {
  const validation = validateUsername(rawUsername);
  if (!validation.ok) {
    return null;
  }

  const row = await sqlOne<{
    displayname: string | null;
    avatarurl: string | null;
    avatarpreset: ApprovedAvatarPreset | null;
    username: string;
    bio: string | null;
    favoriteteamid: number | null;
    favoriteteamname: string | null;
    isverified: boolean;
    createdat: string;
    commentcount: number;
    savedartifactcount: number;
  }>(
    `
    SELECT
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      p.avatar_preset AS avatarPreset,
      p.username,
      p.bio,
      p.favorite_team_id AS favoriteTeamId,
      t.name AS favoriteTeamName,
      u.is_verified AS isVerified,
      u.created_at AS createdAt,
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
      ) AS savedArtifactCount
    FROM product.users u
    JOIN product.user_profiles p ON p.user_id = u.user_id
    LEFT JOIN teams t ON t.team_id = p.favorite_team_id
    WHERE p.username = $1
      AND p.is_public = TRUE
    `,
    [validation.username],
  );

  return row
    ? {
        displayName: row.displayname,
        avatarUrl: row.avatarurl,
        avatarPreset: row.avatarpreset,
        username: row.username,
        bio: row.bio,
        favoriteTeamId: row.favoriteteamid,
        favoriteTeamName: row.favoriteteamname,
        isVerified: row.isverified,
        createdAt: row.createdat,
        commentCount: row.commentcount,
        savedArtifactCount: row.savedartifactcount,
      }
    : null;
}

export async function updateViewerProfile(
  request: Request,
  input: {
    username?: string | null;
    bio?: string | null;
    avatarPreset?: ApprovedAvatarPreset | null;
    favoriteTeamId?: number | null;
    isPublic?: boolean;
    postingEnabled?: boolean;
    aiHistoryEnabled?: boolean;
  },
): Promise<ViewerProfile | null> {
  const profile = await getViewerProfile(request);
  if (!profile) return null;
  if (!profile.isVerified) {
    throw new Error("Verified identity required");
  }
  assertValidCsrf(request);

  const username =
    input.username === undefined
      ? profile.username
      : input.username === null
        ? null
        : (() => {
            const validation = validateUsername(input.username);
            if (!validation.ok) {
              throw new Error(validation.error);
            }
            return validation.username;
          })();

  if (input.avatarPreset !== undefined && input.avatarPreset !== null && !isApprovedAvatarPreset(input.avatarPreset)) {
    throw new Error("Avatar preset is not allowed");
  }

  await withTransaction(async (query) => {
    if (username !== null) {
      const existing = await query<{ user_id: string }>(
        `
        SELECT user_id
        FROM product.user_profiles
        WHERE username = $1
          AND user_id <> $2
        LIMIT 1
        `,
        [username, profile.userId],
      );

      if (existing.length > 0) {
        throw new Error("Username is already taken");
      }
    }

    await query(
      `
      UPDATE product.user_profiles
      SET
        username = $2,
        bio = $3,
        avatar_preset = $4,
        favorite_team_id = $5,
        is_public = $6,
        posting_enabled = $7,
        ai_history_enabled = $8
      WHERE user_id = $1
      `,
      [
        profile.userId,
        username,
        input.bio === undefined ? profile.bio : input.bio,
        input.avatarPreset === undefined ? profile.avatarPreset : input.avatarPreset,
        input.favoriteTeamId === undefined ? profile.favoriteTeamId : input.favoriteTeamId,
        input.isPublic === undefined ? profile.isPublic : input.isPublic,
        input.postingEnabled === undefined ? profile.postingEnabled : input.postingEnabled,
        input.aiHistoryEnabled === undefined ? profile.aiHistoryEnabled : input.aiHistoryEnabled,
      ],
    );
  });

  return getViewerProfile(request);
}
