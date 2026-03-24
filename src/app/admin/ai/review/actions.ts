"use server";

import { revalidatePath } from "next/cache";

import { updateAiFeedbackReview } from "@/lib/server/admin-ai-analytics";

export async function updateAiFeedbackReviewAction(formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const reviewStatus = String(formData.get("reviewStatus") ?? "").trim() as "new" | "triaged" | "resolved";
  const reviewPriority = String(formData.get("reviewPriority") ?? "").trim() as "low" | "normal" | "high";
  const overrideBucketValue = String(formData.get("overrideBucket") ?? "").trim();
  const overrideBucket = overrideBucketValue && overrideBucketValue !== "all" ? overrideBucketValue : null;
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim() || null;
  const issueOwner = String(formData.get("issueOwner") ?? "").trim() || null;
  const rootCauseValue = String(formData.get("rootCause") ?? "").trim();
  const rootCause = rootCauseValue && rootCauseValue !== "all" ? rootCauseValue : null;
  const resolutionTypeValue = String(formData.get("resolutionType") ?? "").trim();
  const resolutionType = resolutionTypeValue && resolutionTypeValue !== "all" ? resolutionTypeValue : null;
  const resolutionNotes = String(formData.get("resolutionNotes") ?? "").trim() || null;

  if (!feedbackId) {
    throw new Error("Feedback id is required");
  }

  if (!["new", "triaged", "resolved"].includes(reviewStatus)) {
    throw new Error("Review status is invalid");
  }

  if (!["low", "normal", "high"].includes(reviewPriority)) {
    throw new Error("Review priority is invalid");
  }

  await updateAiFeedbackReview({
    feedbackId,
    reviewStatus,
    reviewPriority,
    overrideBucket,
    reviewNotes,
    issueOwner,
    rootCause: rootCause as "prompt_issue" | "data_issue" | "rendering_issue" | "product_expectation" | "model_limit" | "unknown" | null,
    resolutionType: resolutionType as "prompt_fix" | "data_fix" | "ui_fix" | "no_action" | "needs_follow_up" | null,
    resolutionNotes,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/review");
}
