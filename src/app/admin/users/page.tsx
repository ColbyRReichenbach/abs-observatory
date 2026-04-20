import Link from "next/link";

import { formatDisplayTime } from "@/lib/display-time";
import { getAdminUsersOverview, listAdminUsers, type AdminUserFilters } from "@/lib/server/admin-users";

function getFilterValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>): AdminUserFilters {
  return {
    q: getFilterValue(searchParams.q) ?? "",
    verification: ((getFilterValue(searchParams.verification) ?? "all") as AdminUserFilters["verification"]) ?? "all",
    profile: ((getFilterValue(searchParams.profile) ?? "all") as AdminUserFilters["profile"]) ?? "all",
    role: ((getFilterValue(searchParams.role) ?? "all") as AdminUserFilters["role"]) ?? "all",
    activity: ((getFilterValue(searchParams.activity) ?? "all") as AdminUserFilters["activity"]) ?? "all",
  };
}

function statusTone(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-gray-200 bg-gray-50 text-gray-600";
}

function riskTone(flagged: boolean) {
  return flagged ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-50 text-gray-600";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return formatDisplayTime(value, { year: "numeric" });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = buildFilters(sp);
  const [overview, users] = await Promise.all([getAdminUsersOverview(filters), listAdminUsers(filters, 120)]);

  return (
    <section className="space-y-8">
      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Users</p>
            <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">Account Roster</h2>
            <p className="mt-3 max-w-3xl text-sm text-[var(--ink-2)]">
              Review signups, public card readiness, comment activity, saved reads, and basic account health in one place.
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="block xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Search</span>
            <input
              type="text"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name, email, or username"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
            />
          </label>

          <SelectField label="Verification" name="verification" value={filters.verification ?? "all"} options={["all", "verified", "unverified"]} />
          <SelectField label="Profile" name="profile" value={filters.profile ?? "all"} options={["all", "public", "private", "setup"]} />
          <SelectField label="Role" name="role" value={filters.role ?? "all"} options={["all", "user", "moderator", "admin"]} />
          <SelectField label="Activity" name="activity" value={filters.activity ?? "all"} options={["all", "recent", "stale"]} />

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
            >
              Apply Filters
            </button>
          </div>
        </form>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <OverviewCard label="Users in View" value={overview.usersInView.toLocaleString()} />
          <OverviewCard label="Verified" value={overview.verifiedUsers.toLocaleString()} />
          <OverviewCard label="Public Cards" value={overview.publicProfiles.toLocaleString()} />
          <OverviewCard label="Setup Done" value={overview.setupCompleteUsers.toLocaleString()} />
          <OverviewCard label="Active 30d" value={overview.activeThirtyDays.toLocaleString()} />
          <OverviewCard label="AI Flags" value={overview.flaggedAiUsers.toLocaleString()} />
        </div>
      </section>

      <section className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Roster</p>
            <h3 className="mt-1 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">Recent Accounts</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{users.length} shown</span>
        </div>

        <div className="space-y-4">
          {users.map((user) => {
            const hasAiFlag = user.aiStrikeCount > 0 || Boolean(user.aiSuspendedUntil) || Boolean(user.aiBannedAt);
            const publicHref = user.isPublic && user.username ? `/u/${user.username}` : null;
            return (
              <article key={user.userId} className="rounded-3xl border border-black/10 bg-[var(--surface-1)] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-semibold text-[var(--ink-0)]">
                        {user.displayName ?? user.username ?? "Unnamed account"}
                      </h4>
                      {user.username ? (
                        <span className="text-sm text-[var(--ink-3)]">@{user.username}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-all text-sm text-[var(--ink-2)]">{user.primaryEmail ?? "No email on file"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill label={user.isVerified ? "Verified" : "Unverified"} tone={statusTone(user.isVerified)} />
                      <StatusPill label={user.onboardingComplete ? "Setup Complete" : "Needs Setup"} tone={statusTone(user.onboardingComplete)} />
                      <StatusPill label={user.isPublic && user.username ? "Public Card Live" : "Private Card"} tone={statusTone(user.isPublic && Boolean(user.username))} />
                      <StatusPill label={user.postingEnabled ? "Comments On" : "Comments Off"} tone={statusTone(user.postingEnabled)} />
                      <StatusPill label={user.aiHistoryEnabled ? "History On" : "History Off"} tone={statusTone(user.aiHistoryEnabled)} />
                      <StatusPill label={hasAiFlag ? "AI Flagged" : "AI Clear"} tone={riskTone(hasAiFlag)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {publicHref ? (
                      <Link
                        href={publicHref}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
                      >
                        Open Public Card
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <MiniStat label="Joined" value={formatDate(user.createdAt)} />
                  <MiniStat label="Last Seen" value={formatDate(user.lastSeenAt)} />
                  <MiniStat label="Roles" value={user.roles.join(", ") || "user"} />
                  <MiniStat label="Favorite Team" value={user.favoriteTeamName ?? "None"} />
                  <MiniStat label="Comments" value={user.commentCount.toLocaleString()} />
                  <MiniStat label="Saved Reads" value={user.savedArtifactCount.toLocaleString()} />
                </div>

                {(user.openReportCount > 0 || hasAiFlag) ? (
                  <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {user.openReportCount > 0 ? <span>{user.openReportCount} open comment reports</span> : null}
                    {user.aiStrikeCount > 0 ? <span>{user.aiStrikeCount} AI strike{user.aiStrikeCount === 1 ? "" : "s"}</span> : null}
                    {user.aiSuspendedUntil ? <span>Suspended until {formatDate(user.aiSuspendedUntil)}</span> : null}
                    {user.aiBannedAt ? <span>Banned {formatDate(user.aiBannedAt)}</span> : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          {users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-[var(--surface-infield)] px-5 py-8 text-sm text-[var(--ink-2)]">
              No users matched the current filters.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-black/10 bg-[var(--surface-infield)] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${tone}`}>{label}</span>;
}
