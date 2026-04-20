import { ProfileAvatar } from "@/components/community/profile-avatar";
import { ProfileBadge } from "@/components/ui/profile-badge";

type ProfilePlayerCardStat = {
  label: string;
  value: string;
};

export function ProfilePlayerCard({
  eyebrow,
  handle,
  displayName,
  email,
  bio,
  avatarUrl,
  isVerified,
  favoriteTeamName,
  accentSoft,
  accentStrong,
  stats,
}: {
  eyebrow: string;
  handle: string | null;
  displayName: string | null;
  email?: string | null;
  bio: string | null;
  avatarUrl?: string | null;
  isVerified: boolean;
  favoriteTeamName?: string | null;
  accentSoft?: string;
  accentStrong?: string;
  stats: ProfilePlayerCardStat[];
}) {
  return (
    <section
      className="panel overflow-hidden border-black/10 bg-white p-0 shadow-2xl shadow-black/[0.04]"
      style={
        accentSoft
          ? {
              backgroundImage: `linear-gradient(145deg, ${accentSoft}, white 38%, white 100%)`,
            }
          : undefined
      }
    >
      <div className="border-b border-black/5 px-7 py-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <ProfileAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              username={handle ?? null}
              email={email}
              size={88}
              className="shadow-lg shadow-black/10"
            />
            <div className="max-w-xl">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: accentStrong ?? "#2563eb" }}
              >
                {eyebrow}
              </p>
              <h1 className="mt-3 text-5xl font-display uppercase tracking-tight text-[var(--ink-0)]">
                {handle ? `@${handle}` : "No Handle Yet"}
              </h1>
              <p className="mt-2 text-lg text-[var(--ink-1)]">{displayName ?? "AiBS Viewer"}</p>
              {bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-2)]">{bio}</p>
              ) : (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-2)]">
                  This card is live, but the profile bio still needs a scouting note.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ProfileBadge
              label={isVerified ? "Verified Identity" : "Verification Pending"}
              variant={isVerified ? "emerald" : "amber"}
            />
            {favoriteTeamName ? <ProfileBadge label={favoriteTeamName} variant="indigo" /> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-7 py-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[1.75rem] border border-black/10 bg-white/80 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
