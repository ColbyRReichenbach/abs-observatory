"use server";

import { revalidatePath } from "next/cache";

import { enqueueModelAuditEvaluation, updateModelAuditAlertStatus } from "@/lib/server/model-audit-alerts";

export async function enqueueModelAuditEvaluationAction(formData: FormData) {
  const auditDate = String(formData.get("auditDate") ?? "").trim() || undefined;
  await enqueueModelAuditEvaluation({ auditDate });
  revalidatePath("/admin/ai");
}

export async function updateModelAuditAlertStatusAction(formData: FormData) {
  const alertId = String(formData.get("alertId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "new" | "triaged" | "resolved";

  if (!alertId) {
    throw new Error("Alert id is required");
  }

  if (!["new", "triaged", "resolved"].includes(status)) {
    throw new Error("Alert status is invalid");
  }

  await updateModelAuditAlertStatus({ alertId, status });
  revalidatePath("/admin/ai");
}
