export type EditorialArticleStatus = "draft" | "generated" | "published" | "suppressed" | "failed" | null | undefined;
export type EditorialValidationState = "pending" | "passed" | "failed" | null | undefined;
export type EditorialRunStatus = "queued" | "running" | "failed" | "validated" | "persisted" | string | null | undefined;

export type EditorialDeskState = "running" | "ready" | "blocked" | "live" | "draft";

export type EditorialWorkflowSummary = {
  deskState: EditorialDeskState;
  label: string;
  detail: string;
  canApprove: boolean;
  canReject: boolean;
  primaryActionLabel: string | null;
  secondaryActionLabel: string | null;
};

export function getEditorialWorkflowSummary(input: {
  articleStatus: EditorialArticleStatus;
  validationState: EditorialValidationState;
  runStatus?: EditorialRunStatus;
}): EditorialWorkflowSummary {
  const articleStatus = input.articleStatus ?? null;
  const validationState = input.validationState ?? null;
  const runStatus = input.runStatus ?? null;

  if (runStatus === "running" || runStatus === "queued") {
    return {
      deskState: "running",
      label: "In Flight",
      detail: "Generation is still running. The desk should wait for validation before making a call.",
      canApprove: false,
      canReject: false,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  if (articleStatus === "published") {
    return {
      deskState: "live",
      label: "Live",
      detail: "This article is already published on the public surface.",
      canApprove: false,
      canReject: true,
      primaryActionLabel: null,
      secondaryActionLabel: "Suppress Article",
    };
  }

  if (articleStatus === "generated" && validationState === "passed") {
    return {
      deskState: "ready",
      label: "Ready For Desk",
      detail: "Validation passed and the article is being held for an editorial approval decision.",
      canApprove: true,
      canReject: true,
      primaryActionLabel: "Approve + Publish",
      secondaryActionLabel: "Reject Output",
    };
  }

  if (articleStatus === "suppressed" || articleStatus === "failed" || validationState === "failed" || runStatus === "failed") {
    return {
      deskState: "blocked",
      label: "Blocked",
      detail: "The output failed validation or has already been suppressed. It should not be published as-is.",
      canApprove: false,
      canReject: false,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  return {
    deskState: "draft",
    label: "Draft",
    detail: "This article is still in draft territory and is not yet in a clear desk-approval state.",
    canApprove: validationState === "passed",
    canReject: articleStatus !== null,
    primaryActionLabel: validationState === "passed" ? "Publish Article" : null,
    secondaryActionLabel: articleStatus ? "Suppress Article" : null,
  };
}
