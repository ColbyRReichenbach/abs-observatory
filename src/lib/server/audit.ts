import { sqlExec } from "@/lib/db";

export async function writeAuditLog(params: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: unknown;
}) {
  await sqlExec(
    `
    INSERT INTO ops.audit_log (actor_user_id, action, target_type, target_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [params.actorUserId ?? null, params.action, params.targetType, params.targetId ?? null, params.metadata ?? null],
  );
}
