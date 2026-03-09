import { getViewerProfile, type ViewerProfile } from "./profiles";
import { writeAuditLog } from "./audit";
import { isOwnerIdentity } from "./owner-admin";

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
  return Boolean(viewer?.isVerified && viewer.roles.includes("admin") && isOwnerIdentity(viewer));
}

export async function requireOwnerAdmin(request?: Request): Promise<ViewerProfile> {
  const viewer = await getViewerProfile(request);

  if (!viewer?.isVerified || !viewer.roles.includes("admin") || !isOwnerIdentity(viewer)) {
    await logDeniedAdminAccess(viewer, request);
    throw new Error("Forbidden");
  }

  return viewer;
}
