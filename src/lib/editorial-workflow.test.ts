import { describe, expect, it } from "vitest";

import { getEditorialWorkflowSummary } from "@/lib/editorial-workflow";

describe("editorial workflow summary", () => {
  it("marks generated and validated output as ready for the desk", () => {
    expect(
      getEditorialWorkflowSummary({
        articleStatus: "generated",
        validationState: "passed",
        runStatus: "persisted",
      }),
    ).toMatchObject({
      deskState: "ready",
      label: "Ready For Desk",
      canApprove: true,
      canReject: true,
      primaryActionLabel: "Approve + Publish",
    });
  });

  it("marks published articles as live", () => {
    expect(
      getEditorialWorkflowSummary({
        articleStatus: "published",
        validationState: "passed",
        runStatus: "persisted",
      }),
    ).toMatchObject({
      deskState: "live",
      label: "Live",
      canApprove: false,
      canReject: true,
    });
  });

  it("blocks failed or suppressed output", () => {
    expect(
      getEditorialWorkflowSummary({
        articleStatus: "suppressed",
        validationState: "failed",
        runStatus: "failed",
      }),
    ).toMatchObject({
      deskState: "blocked",
      label: "Blocked",
      canApprove: false,
      canReject: false,
    });
  });
});
