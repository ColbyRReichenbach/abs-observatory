import { withTransaction } from "@/lib/db";
import { writeAuditLog } from "./audit";
import { assertValidCsrf } from "./csrf";
import { getViewerProfile } from "./profiles";

export async function purgeViewerAiHistory(request: Request): Promise<void> {
  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }

  assertValidCsrf(request);

  await withTransaction(async (query) => {
    await query(
      `
      DELETE FROM ai.conversations
      WHERE user_id = $1
      `,
      [viewer.userId],
    );

    await query(
      `
      UPDATE product.user_profiles
      SET ai_history_enabled = FALSE
      WHERE user_id = $1
      `,
      [viewer.userId],
    );
  });

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "viewer_ai_history_purged",
    targetType: "product.user",
    targetId: viewer.userId,
  });
}

export async function deleteViewerAccount(request: Request): Promise<void> {
  const viewer = await getViewerProfile(request);
  if (!viewer) {
    throw new Error("Authentication required");
  }
  if (!viewer.isVerified) {
    throw new Error("Verified identity required");
  }

  assertValidCsrf(request);

  await withTransaction(async (query) => {
    await query(
      `
      UPDATE community.comments
      SET
        body = '[deleted]',
        moderation_status = 'deleted',
        deleted_at = COALESCE(deleted_at, NOW()),
        updated_at = NOW()
      WHERE user_id = $1
      `,
      [viewer.userId],
    );

    await query(
      `
      DELETE FROM ai.conversations
      WHERE user_id = $1
      `,
      [viewer.userId],
    );

    await query(
      `
      DELETE FROM product.users
      WHERE user_id = $1
      `,
      [viewer.userId],
    );
  });

  await writeAuditLog({
    actorUserId: viewer.userId,
    action: "viewer_account_deleted",
    targetType: "product.user",
    targetId: viewer.userId,
  });
}
