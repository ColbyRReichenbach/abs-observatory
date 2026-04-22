"use server";

import { revalidatePath } from "next/cache";

import { moderateCommentFromAdmin, updateCommentReportStatusFromAdmin } from "@/lib/server/admin-community";

export async function moderateCommentFromAdminAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as "hide" | "restore";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!commentId) {
    throw new Error("Comment id is required");
  }

  if (!["hide", "restore"].includes(action)) {
    throw new Error("Comment action is invalid");
  }

  await moderateCommentFromAdmin({ commentId, action, reason });
  revalidatePath("/admin/community");
  revalidatePath("/admin/users");
}

export async function updateCommentReportStatusAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "reviewed" | "dismissed" | "actioned";

  if (!reportId) {
    throw new Error("Report id is required");
  }

  if (!["reviewed", "dismissed", "actioned"].includes(status)) {
    throw new Error("Report status is invalid");
  }

  await updateCommentReportStatusFromAdmin({ reportId, status });
  revalidatePath("/admin/community");
  revalidatePath("/admin/users");
}
