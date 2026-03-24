import { requireOwnerAdmin } from "@/lib/server/admin";
import { getOwnerClerkUserId, isOwnerIdentity } from "@/lib/server/owner-admin";

export default async function AdminAccessPage() {
  const viewer = await requireOwnerAdmin();
  const ownerClerkUserId = getOwnerClerkUserId();

  return (
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
            Verified account:
            <span className="ml-2 font-semibold">{viewer.isVerified ? "Yes" : "No"}</span>
          </p>
          <p>
            Owner match:
            <span className="ml-2 font-semibold">{isOwnerIdentity(viewer) ? "Locked to this account" : "Mismatch"}</span>
          </p>
          <p className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] p-4 text-xs leading-6 text-[var(--ink-2)]">
            Admin access is enforced by Clerk identity plus DB role. Non-owner users cannot access admin routes even if a
            database role is added manually.
          </p>
        </div>
      </section>
    </div>
  );
}
