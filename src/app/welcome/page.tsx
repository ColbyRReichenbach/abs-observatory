import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileBadge } from "@/components/ui/profile-badge";
import { getProfileOnboardingState } from "@/lib/profile-onboarding";
import { getViewerProfile } from "@/lib/server/profiles";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const viewMode = await resolveViewMode();
  const viewer = await getViewerProfile();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(withViewModeHref("/welcome", viewMode))}`);
  }

  const onboarding = getProfileOnboardingState({
    isVerified: viewer.isVerified,
    username: viewer.username,
    favoriteTeamId: viewer.favoriteTeamId,
    isPublic: viewer.isPublic,
  });

  const favoriteTeamHref = viewer.favoriteTeamId ? `/teams/${viewer.favoriteTeamId}` : "/teams";

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">Welcome Route</p>
            <h1 className="mt-3 text-5xl font-display uppercase tracking-tight text-[var(--ink-0)]">
              {onboarding.isComplete ? "You Are Cleared For First Pitch" : "Finish The Player Card"}
            </h1>
            <p className="mt-4 text-sm text-[var(--ink-2)]">
              This page is the handoff between authentication and real product identity. It should send you to the right next move, not sit empty.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ProfileBadge label={viewer.isVerified ? "Verified" : "Needs Verification"} variant={viewer.isVerified ? "emerald" : "amber"} />
            <ProfileBadge label={`${onboarding.completedCount} Of ${onboarding.totalSteps} Done`} variant={onboarding.isComplete ? "blue" : "gray"} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {onboarding.steps.map((step) => (
            <div
              key={step.id}
              className={`rounded-[2rem] border p-5 ${
                step.complete ? "border-emerald-200 bg-emerald-50/70" : "border-black/10 bg-[var(--surface-infield)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-1)]">{step.label}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                    step.complete ? "bg-emerald-100 text-emerald-700" : "border border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  {step.complete ? "Done" : "Next"}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-2)]">{step.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
          >
            {onboarding.isComplete ? "Open Profile" : "Finish Setup"}
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
          >
            Open Live Feed
          </Link>
          <Link
            href={favoriteTeamHref}
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
          >
            {viewer.favoriteTeamId ? "Open Favorite Team" : "Pick A Team"}
          </Link>
          {viewer.isPublic && viewer.username ? (
            <Link
              href={`/u/${viewer.username}`}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
            >
              Public Page
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
