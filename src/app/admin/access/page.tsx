import { notFound } from "next/navigation";

import { requireOwnerAdmin, getAdminAccessRoster } from "@/lib/server/admin";
import { getOwnerClerkUserId, getOwnerEmails, isOwnerIdentity } from "@/lib/server/owner-admin";

import { updateAccountAccessAction } from "./actions";

export default async function AdminAccessPage() {
  let viewer: Awaited<ReturnType<typeof requireOwnerAdmin>>;
  let roster: Awaited<ReturnType<typeof getAdminAccessRoster>>;

  try {
    [viewer, roster] = await Promise.all([requireOwnerAdmin(), getAdminAccessRoster()]);
  } catch {
    notFound();
  }

  const ownerClerkUserId = getOwnerClerkUserId();
  const ownerEmails = getOwnerEmails();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Owner Identity</p>
          <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            Access Lock
          </h2>
          <dl className="mt-6 space-y-4 text-sm text-[var(--ink-1)]">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Display Name</dt>
              <dd className="mt-1">{viewer.displayName ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Email</dt>
              <dd className="mt-1">{viewer.primaryEmail ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Clerk User ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--ink-2)]">{viewer.externalAuthId}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Roles</dt>
              <dd className="mt-1">{viewer.roles.join(", ")}</dd>
            </div>
          </dl>
        </section>

        <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Configuration</p>
          <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            Owner Guard Status
          </h2>
          <div className="mt-6 space-y-4 text-sm text-[var(--ink-1)]">
            <p>
              Env owner ID:
              <span className="ml-2 break-all font-mono text-xs text-[var(--ink-2)]">{ownerClerkUserId ?? "Not set"}</span>
            </p>
            <p>
              Env owner emails:
              <span className="ml-2 break-all font-mono text-xs text-[var(--ink-2)]">
                {ownerEmails.length > 0 ? ownerEmails.join(", ") : "Not set"}
              </span>
            </p>
            <p>
              Verified account:
              <span className="ml-2 font-semibold">{viewer.isVerified ? "Yes" : "No"}</span>
            </p>
            <p>
              Owner match:
              <span className="ml-2 font-semibold">{isOwnerIdentity(viewer) ? "Locked to this account" : "Mismatch"}</span>
            </p>
            <p className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] p-4 text-xs leading-6 text-[var(--ink-2)]">
              Owner matching can now use either the Clerk user id or a verified owner email. Admin dashboards are role-based, while access management remains owner-only.
            </p>
          </div>
        </section>
      </div>

      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Grant Access</p>
        <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
          Account-Level AI and Admin
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
          Use a verified account email to grant alpha AI access or promote an account into the admin dashboards.
        </p>
        <form action={updateAccountAccessAction} className="mt-6 grid gap-4 rounded-[2rem] border border-black/10 bg-[var(--surface-infield)] p-6 lg:grid-cols-[1.2fr_auto_auto_auto]">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="alpha@example.com"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)]">
            <input type="checkbox" name="adminEnabled" className="h-4 w-4" />
            <span>Admin</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)]">
            <input type="checkbox" name="aiAccessEnabled" className="h-4 w-4" defaultChecked />
            <span>AI Access</span>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
            >
              Update Access
            </button>
          </div>
        </form>
      </section>

      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Recent Accounts</p>
        <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
          Access Roster
        </h2>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[var(--ink-1)]">
            <thead>
              <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">
                <th className="pb-3 pr-4">Account</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Roles</th>
                <th className="pb-3 pr-4">AI Access</th>
                <th className="pb-3">Verified</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.userId} className="border-b border-black/5 align-top">
                  <td className="py-4 pr-4">
                    <div className="font-semibold">{entry.displayName ?? entry.username ?? "Unnamed user"}</div>
                    <div className="text-xs text-[var(--ink-3)]">{entry.username ? `@${entry.username}` : "No username"}</div>
                  </td>
                  <td className="py-4 pr-4 text-[var(--ink-2)]">{entry.primaryEmail ?? "Unavailable"}</td>
                  <td className="py-4 pr-4">{entry.roles.join(", ") || "user"}</td>
                  <td className="py-4 pr-4">{entry.aiAccessEnabled ? "Enabled" : "Disabled"}</td>
                  <td className="py-4">{entry.isVerified ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
