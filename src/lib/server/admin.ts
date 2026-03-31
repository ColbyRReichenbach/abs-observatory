import { sql } from "@/lib/db";

import { writeAuditLog } from "./audit";
import { isOwnerIdentity } from "./owner-admin";
import { getViewerProfile, type ViewerProfile } from "./profiles";

async function logDeniedAdminAccess(viewer: ViewerProfile | null, request?: Request) {
  await writeAuditLog({
    actorUserId: viewer?.userId ?? null,
    action: "admin_access_denied",
    targetType: "admin.route",
    targetId: request ? new URL(request.url).pathname : null,
    metadata: viewer
      ? {
          authProvider: viewer.authProvider,
          externalAuthId: viewer.externalAuthId,
          roles: viewer.roles,
          isVerified: viewer.isVerified,
        }
      : { reason: "viewer_missing" },
  });
}

export async function canAccessAdmin(request?: Request): Promise<boolean> {
  const viewer = await getViewerProfile(request);
  return Boolean(viewer?.isVerified && viewer.roles.includes("admin"));
}

export async function requireAdmin(request?: Request): Promise<ViewerProfile> {
  const viewer = await getViewerProfile(request);

  if (!viewer?.isVerified || !viewer.roles.includes("admin")) {
    await logDeniedAdminAccess(viewer, request);
    throw new Error("Forbidden");
  }

  return viewer;
}

export function canUsePrivateAi(viewer: Pick<ViewerProfile, "isVerified" | "roles" | "aiAccessEnabled"> | null): boolean {
  return Boolean(viewer?.isVerified && (viewer.aiAccessEnabled || viewer.roles.includes("admin")));
}

export async function canAccessPrivateAi(request?: Request): Promise<boolean> {
  const viewer = await getViewerProfile(request);
  return canUsePrivateAi(viewer);
}

export async function requireOwnerAdmin(request?: Request): Promise<ViewerProfile> {
  const viewer = await getViewerProfile(request);

  if (!viewer?.isVerified || !viewer.roles.includes("admin") || !isOwnerIdentity(viewer)) {
    await logDeniedAdminAccess(viewer, request);
    throw new Error("Forbidden");
  }

  return viewer;
}

export type AccessRosterEntry = {
  userId: string;
  displayName: string | null;
  primaryEmail: string | null;
  username: string | null;
  isVerified: boolean;
  roles: string[];
  aiAccessEnabled: boolean;
  createdAt: string;
};

export async function getAdminAccessRoster(): Promise<AccessRosterEntry[]> {
  await requireOwnerAdmin();

  const rows = await sql<{
    userid: string;
    displayname: string | null;
    primaryemail: string | null;
    username: string | null;
    isverified: boolean;
    roles: string[] | null;
    aiaccessenabled: boolean;
    createdat: string;
  }>(
    `
    SELECT
      u.user_id AS userId,
      u.display_name AS displayName,
      u.primary_email AS primaryEmail,
      p.username,
      u.is_verified AS isVerified,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.role), NULL) AS roles,
      COALESCE(p.ai_access_enabled, FALSE) AS aiAccessEnabled,
      u.created_at AS createdAt
    FROM product.users u
    LEFT JOIN product.user_profiles p ON p.user_id = u.user_id
    LEFT JOIN product.user_roles r ON r.user_id = u.user_id
    GROUP BY
      u.user_id,
      u.display_name,
      u.primary_email,
      p.username,
      u.is_verified,
      p.ai_access_enabled,
      u.created_at
    ORDER BY u.created_at DESC
    LIMIT 25
    `,
  );

  return rows.map((row) => ({
    userId: row.userid,
    displayName: row.displayname,
    primaryEmail: row.primaryemail,
    username: row.username,
    isVerified: row.isverified,
    roles: row.roles ?? [],
    aiAccessEnabled: row.aiaccessenabled,
    createdAt: row.createdat,
  }));
}
