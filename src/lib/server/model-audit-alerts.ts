type AlertStatus = "new" | "triaged" | "resolved";

export async function enqueueModelAuditEvaluation(_input: { auditDate?: string | undefined }) {
  return { queued: false as const };
}

export async function updateModelAuditAlertStatus(_input: { alertId: string; status: AlertStatus }) {
  return { updated: false as const };
}
