import { describe, expect, it } from "vitest";

import { getProfileOnboardingState } from "@/lib/profile-onboarding";

describe("profile onboarding", () => {
  it("tracks progress and next step from profile completeness", () => {
    const incomplete = getProfileOnboardingState({
      isVerified: false,
      username: null,
      favoriteTeamId: null,
      isPublic: false,
    });

    expect(incomplete.completedCount).toBe(0);
    expect(incomplete.isComplete).toBe(false);
    expect(incomplete.nextStepId).toBe("verify_identity");

    const complete = getProfileOnboardingState({
      isVerified: true,
      username: "marinersfilm",
      favoriteTeamId: 136,
      isPublic: true,
    });

    expect(complete.completedCount).toBe(4);
    expect(complete.isComplete).toBe(true);
    expect(complete.nextStepId).toBeNull();
  });
});
