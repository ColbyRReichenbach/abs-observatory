"use client";

import Link from "next/link";

import { ProfileAvatar } from "@/components/community/profile-avatar";
import { getProfileOnboardingState } from "@/lib/profile-onboarding";
import type { ViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

type NavViewer = {
  authProvider: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  favoriteTeamId: number | null;
  isPublic: boolean;
  isVerified: boolean;
};

export function NavAuthControls({
  viewer,
  activeMode,
}: {
  viewer: NavViewer | null;
  activeMode?: ViewMode;
}) {
  if (!viewer) {
    const nextHref = withViewModeHref("/profile", activeMode);
    return (
      <Link
        href={`/login?next=${encodeURIComponent(nextHref)}`}
        className="inline-flex h-9 items-center justify-center rounded-full bg-black px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-gray-900"
      >
        Sign In
      </Link>
    );
  }

  const onboarding = getProfileOnboardingState({
    isVerified: viewer.isVerified,
    username: viewer.username,
    favoriteTeamId: viewer.favoriteTeamId,
    isPublic: viewer.isPublic,
  });

  const primaryHref = onboarding.isComplete ? "/profile" : "/welcome";
  const resolvedHref = withViewModeHref(primaryHref, activeMode);
  const label = onboarding.isComplete ? "Profile" : "Finish setup";

  return (
    <div className="relative">
      <Link
        href={resolvedHref}
        title={label}
        aria-label={label}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:border-black/20 hover:bg-[var(--surface-infield)]"
      >
        <ProfileAvatar
          avatarUrl={viewer.avatarUrl}
          displayName={viewer.displayName}
          username={viewer.username}
          size={32}
        />
        {!onboarding.isComplete ? (
          <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-amber-500" />
        ) : null}
      </Link>
    </div>
  );
}
