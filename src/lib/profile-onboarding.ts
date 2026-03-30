export type ProfileOnboardingInput = {
  isVerified: boolean;
  username: string | null;
  favoriteTeamId: number | null;
  isPublic: boolean;
};

export type ProfileOnboardingStep = {
  id: "verify_identity" | "choose_username" | "pick_team" | "publish_profile";
  label: string;
  complete: boolean;
  hint: string;
};

export type ProfileOnboardingState = {
  steps: ProfileOnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  nextStepId: ProfileOnboardingStep["id"] | null;
  nextHref: string;
};

export function getProfileOnboardingSteps(input: ProfileOnboardingInput): ProfileOnboardingStep[] {
  const username = input.username?.trim() ?? "";

  return [
    {
      id: "verify_identity",
      label: "Verify identity",
      complete: input.isVerified,
      hint: input.isVerified
        ? "Verified users can post, comment, and update public profile settings."
        : "Verification is required before profile changes and community posting unlock.",
    },
    {
      id: "choose_username",
      label: "Choose a username",
      complete: username.length > 0,
      hint: username.length > 0
        ? `Public handle set to @${username}.`
        : "Pick the public handle people will use to find you.",
    },
    {
      id: "pick_team",
      label: "Pick a favorite team",
      complete: input.favoriteTeamId !== null,
      hint: input.favoriteTeamId !== null
        ? "Your fandom is set for profile storytelling and team shortcuts."
        : "Choose a club so the app can orient around your fandom.",
    },
    {
      id: "publish_profile",
      label: "Turn on your public profile",
      complete: input.isPublic,
      hint: input.isPublic
        ? "Your public page can be linked and discovered."
        : "Keep this on if you want comments and follows tied to a public identity.",
    },
  ];
}

export function isProfileOnboardingComplete(input: ProfileOnboardingInput) {
  return getProfileOnboardingSteps(input).every((step) => step.complete);
}

export function getProfileOnboardingState(input: ProfileOnboardingInput): ProfileOnboardingState {
  const steps = getProfileOnboardingSteps(input);
  const completedCount = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) ?? null;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    isComplete: nextStep === null,
    nextStepId: nextStep?.id ?? null,
    nextHref: "/profile",
  };
}
