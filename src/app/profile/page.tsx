import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfilePlayerCard } from "@/components/community/profile-player-card";
import { ProfileSignOutButton } from "@/components/community/profile-sign-out-button";
import { ProfileSettingsForm } from "@/components/community/profile-settings-form";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getProfileOnboardingState } from "@/lib/profile-onboarding";
import { listViewerAiArtifacts } from "@/lib/server/ai-generations";
import { isClerkConfigured } from "@/lib/server/auth";
import { getViewerProfile } from "@/lib/server/profiles";
import { resolveTeamBranding } from "@/lib/team-branding";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const viewMode = await resolveViewMode();
  const viewer = await getViewerProfile();
  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(withViewModeHref("/profile", viewMode))}`);
  }

  const onboarding = getProfileOnboardingState({
    isVerified: viewer.isVerified,
    username: viewer.username,
    favoriteTeamId: viewer.favoriteTeamId,
    isPublic: viewer.isPublic,
  });
  const teamBrand = viewer.favoriteTeamId
    ? resolveTeamBranding({ teamId: viewer.favoriteTeamId })
    : null;
  const savedArtifacts = viewer.aiHistoryEnabled ? await listViewerAiArtifacts(viewer.userId, 12) : [];
  const publicHref = viewer.isPublic && viewer.username ? `/u/${viewer.username}` : null;
  const memberSince = new Date(viewer.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <ProfilePlayerCard
          eyebrow="Player Card"
          handle={viewer.username}
          displayName={viewer.displayName}
          email={viewer.primaryEmail}
          bio={viewer.bio}
          avatarUrl={viewer.avatarUrl}
          isVerified={viewer.isVerified}
          favoriteTeamName={teamBrand?.teamName ?? null}
          accentSoft={teamBrand?.tokens.teamAccentSoft}
          accentStrong={teamBrand?.tokens.teamAccentStrong}
          stats={[
            { label: "Comments", value: String(viewer.commentCount) },
            { label: "Saved Reads", value: String(viewer.savedArtifactCount) },
            { label: "Member Since", value: memberSince },
            {
              label: "Public Card",
              value: publicHref ? "Live" : onboarding.isComplete ? "Private" : "Setup",
            },
          ]}
        />

        <aside className="space-y-5">
          <section className="panel border-black/10 bg-white p-6 shadow-xl shadow-black/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Account Actions</p>
            <div className="mt-5 space-y-3">
              {publicHref ? (
                <Link
                  href={publicHref}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
                >
                  Open Public Card
                </Link>
              ) : null}
              {!onboarding.isComplete ? (
                <Link
                  href="/welcome"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  Finish Setup
                </Link>
              ) : null}
              {isClerkConfigured() && viewer.authProvider === "clerk" ? (
                <ProfileSignOutButton className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-[var(--surface-infield)]" />
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <ProfileBadge
                label={viewer.postingEnabled ? "Posting Enabled" : "Posting Paused"}
                variant={viewer.postingEnabled ? "blue" : "gray"}
              />
              <ProfileBadge
                label={viewer.aiHistoryEnabled ? "AI History On" : "AI History Off"}
                variant={viewer.aiHistoryEnabled ? "indigo" : "gray"}
              />
            </div>
          </section>

          {!onboarding.isComplete ? (
            <section className="panel border-black/10 bg-white p-6 shadow-xl shadow-black/[0.03]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Complete Setup</p>
              <p className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">
                {onboarding.completedCount}/{onboarding.totalSteps}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-2)]">
                Finish the last few profile details to unlock your public card.
              </p>

              <div className="mt-5 space-y-3">
                {onboarding.steps
                  .filter((step) => !step.complete)
                  .map((step) => (
                    <div key={step.id} className="rounded-3xl border border-black/10 bg-[var(--surface-infield)] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)]">{step.label}</p>
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
                          Next
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--ink-2)]">{step.hint}</p>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>

      <div className="mt-10">
        <ProfileSettingsForm initialProfile={viewer} />
      </div>

      <section className="mt-10 panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Saved AI Work</p>
            <h2 className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">Your Library</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-2)]">
              Keep your saved chart reads and challenge breakdowns in one place.
            </p>
          </div>
          <ProfileBadge label={viewer.aiHistoryEnabled ? "History Enabled" : "History Paused"} variant={viewer.aiHistoryEnabled ? "blue" : "gray"} />
        </div>

        {!viewer.aiHistoryEnabled ? (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-[var(--surface-infield)] px-5 py-4 text-sm text-[var(--ink-2)]">
            Turn on AI history in your profile settings to save reads and summaries here.
          </div>
        ) : savedArtifacts.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-black/10 bg-[var(--surface-infield)] px-5 py-8 text-sm text-[var(--ink-2)]">
            Nothing saved yet. Open a chart read or challenge summary and it will show up here.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedArtifacts.map((artifact) => {
              const href = artifact.routeScope?.startsWith("/") ? artifact.routeScope : null;
              return (
                <article key={artifact.artifactId} className="rounded-3xl border border-black/10 bg-[var(--surface-infield)] p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    <span className="rounded-full border border-black/10 bg-white px-2 py-1">{artifact.surfaceDetail ?? artifact.targetType.replaceAll("_", " ")}</span>
                    <span>{new Date(artifact.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-display uppercase tracking-tight text-[var(--ink-0)]">
                    {artifact.title ?? artifact.targetId}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">
                    {artifact.summary ?? "Saved from one of your AiBS reads."}
                  </p>
                  <div className="mt-4 text-[11px] font-medium text-[var(--ink-3)]">
                    {artifact.targetType.replaceAll("_", " ")} · {artifact.targetId}
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
                    >
                      Open Again
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
