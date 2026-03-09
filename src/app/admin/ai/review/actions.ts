"use server";

import { revalidatePath } from "next/cache";

import { updateAiFeedbackReview } from "@/lib/server/admin-ai-analytics";

export async function updateAiFeedbackReviewAction(formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const reviewStatus = String(formData.get("reviewStatus") ?? "").trim() as "new" | "triaged" | "resolved";
  const overrideBucketValue = String(formData.get("overrideBucket") ?? "").trim();
  const overrideBucket = overrideBucketValue && overrideBucketValue !== "all" ? overrideBucketValue : null;
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim() || null;

  if (!feedbackId) {
    throw new Error("Feedback id is required");
  }

  if (!["new", "triaged", "resolved"].includes(reviewStatus)) {
    throw new Error("Review status is invalid");
  }

  await updateAiFeedbackReview({
    feedbackId,
    reviewStatus,
    overrideBucket,
    reviewNotes,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/review");
}
