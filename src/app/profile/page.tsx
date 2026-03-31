import Link from "next/link";

import { LoginEntryPanel } from "@/components/auth/login-entry-panel";
import { getAuthIdentity, isClerkConfigured } from "@/lib/server/auth";
import { getViewerProfileFromIdentity } from "@/lib/server/profiles";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const identity = await getAuthIdentity();
  let viewer = null;
  let provisioningError = false;

  if (identity) {
    try {
      viewer = await getViewerProfileFromIdentity(identity);
    } catch {
      provisioningError = true;
    }
  }

  if (!identity && !viewer) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Account</p>
          <h1 className="mt-3 text-5xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">Profile</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
            Sign in or create an account to unlock profile tools, saved identity, and gated AI access.
          </p>
        </div>
        <LoginEntryPanel authEnabled={isClerkConfigured()} nextHref="/profile" />
      </main>
    );
  }

  if (!viewer && identity) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Account</p>
          <h1 className="mt-3 text-5xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">Profile</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
            You are signed in as <span className="font-semibold text-[var(--ink-1)]">{identity.email ?? identity.displayName ?? "your account"}</span>.
            {" "}
            AiBS is still finalizing your profile record and access flags.
          </p>
        </div>

        <section className="panel max-w-3xl border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Provisioning</p>
          <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            Account Setup In Progress
          </h2>
          <div className="mt-6 space-y-4 text-sm text-[var(--ink-1)]">
            <p>
              Signed-in identity:
              <span className="ml-2 font-semibold">{identity.email ?? identity.displayName ?? identity.externalAuthId}</span>
            </p>
            <p>
              Email verified:
              <span className="ml-2 font-semibold">{identity.isVerified ? "Yes" : "No"}</span>
            </p>
            <p className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] p-4 text-xs leading-6 text-[var(--ink-2)]">
              {provisioningError
                ? "The Clerk session is present, but AiBS could not finish profile provisioning on this request. Refresh once after sign-in; if it still persists, the server-side auth sync still needs attention."
                : "The Clerk session is present, but your profile record has not been materialized in the app database yet. Refresh once after sign-in to re-run the sync."}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/profile"
                className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
              >
                Refresh Profile
              </Link>
              <Link
                href="/query?view=org"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
              >
                Open Query Lab
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!viewer) {
    return null;
  }

  const canUsePrivateAi = viewer.aiAccessEnabled || viewer.roles.includes("admin");

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="mb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Account</p>
        <h1 className="mt-3 text-5xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">Profile</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
          Identity, role, and account-level access for AiBS.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Identity</p>
          <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            Account Summary
          </h2>
          <dl className="mt-6 grid gap-4 text-sm text-[var(--ink-1)] sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Display Name</dt>
              <dd className="mt-1">{viewer.displayName ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Email</dt>
              <dd className="mt-1 break-all">{viewer.primaryEmail ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Username</dt>
              <dd className="mt-1">{viewer.username ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Roles</dt>
              <dd className="mt-1">{viewer.roles.join(", ") || "user"}</dd>
            </div>
          </dl>
        </section>

        <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">AI Access</p>
          <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            Private Tools
          </h2>
          <div className="mt-6 space-y-4 text-sm text-[var(--ink-1)]">
            <p>
              Verified account:
              <span className="ml-2 font-semibold">{viewer.isVerified ? "Yes" : "No"}</span>
            </p>
            <p>
              Private AI enabled:
              <span className="ml-2 font-semibold">{canUsePrivateAi ? "Yes" : "No"}</span>
            </p>
            <p>
              AI history saved:
              <span className="ml-2 font-semibold">{viewer.aiHistoryEnabled ? "Yes" : "No"}</span>
            </p>
            <p className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] p-4 text-xs leading-6 text-[var(--ink-2)]">
              Query Lab and private Copilot stay account-gated. Owner/admin accounts can grant AI access per user for alpha testing.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/query?view=org"
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
              >
                Open Query Lab
              </Link>
              {viewer.roles.includes("admin") ? (
                <Link
                  href="/admin/access"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
                >
                  Manage Access
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
