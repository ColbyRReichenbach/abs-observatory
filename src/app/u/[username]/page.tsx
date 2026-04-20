import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProfilePlayerCard } from "@/components/community/profile-player-card";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { resolveTeamBranding } from "@/lib/team-branding";
import { getPublicProfileByUsername } from "@/lib/server/profiles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  return {
    title: profile ? `@${profile.username} - AiBS Profile` : "Profile not found - AiBS",
    description: profile?.bio ?? "AiBS public profile",
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const teamBrand = profile.favoriteTeamId
    ? resolveTeamBranding({
        teamId: profile.favoriteTeamId,
        teamName: profile.favoriteTeamName,
      })
    : null;

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <ProfilePlayerCard
          eyebrow="Player Card"
          handle={profile.username}
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          isVerified={profile.isVerified}
          favoriteTeamName={profile.favoriteTeamName}
          accentSoft={teamBrand?.tokens.teamAccentSoft}
          accentStrong={teamBrand?.tokens.teamAccentStrong}
          stats={[
            { label: "Comments", value: String(profile.commentCount) },
            { label: "Saved Reads", value: String(profile.savedArtifactCount) },
            {
              label: "Member Since",
              value: new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            },
            { label: "Favorite Team", value: profile.favoriteTeamName ?? "League" },
          ]}
        />

        <aside className="space-y-6">
          <section className="panel border-black/10 bg-white p-6 shadow-xl shadow-black/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Fan Snapshot</p>
            <p className="mt-4 text-2xl font-display uppercase tracking-tight text-[var(--ink-0)]">
              {profile.favoriteTeamName ? `${profile.favoriteTeamName} Fan` : "League-Wide Fan"}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">
              {profile.bio
                ? "A quick look at who they follow, how active they are, and where they spend time around the challenge game."
                : "A quick look at their favorite club and activity around the challenge game."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ProfileBadge label={`${profile.commentCount} Comments`} variant="blue" />
              <ProfileBadge label={`${profile.savedArtifactCount} Saved Reads`} variant="indigo" />
            </div>
          </section>

          <section className="panel border-black/10 bg-[var(--surface-infield)] p-6 shadow-xl shadow-black/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">Watch Next</p>
            <p className="mt-4 text-2xl font-display uppercase tracking-tight text-[var(--ink-0)]">
              {profile.favoriteTeamName ? `${profile.favoriteTeamName} Hub` : "League Feed"}
            </p>
            <p className="mt-3 text-sm text-[var(--ink-2)]">
              {profile.favoriteTeamName
                ? `Jump into ${profile.favoriteTeamName} coverage, challenge trends, and recent game reads.`
                : "Jump back into the live feed and follow the latest challenge moments around the league."}
            </p>
            <Link
              href={profile.favoriteTeamId ? `/teams/${profile.favoriteTeamId}` : "/"}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
            >
              {profile.favoriteTeamId ? "Open Team Hub" : "Open Live Feed"}
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}
