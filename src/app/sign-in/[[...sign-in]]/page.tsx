import Link from "next/link";

import { normalizeAuthNextHref } from "@/lib/auth-entry";
import { ClerkSignInShell } from "@/components/auth/clerk-auth-shell";
import { isClerkConfigured } from "@/lib/server/auth";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const viewMode = await resolveViewMode(sp);
  const nextHref = withViewModeHref(normalizeAuthNextHref(sp.next), viewMode);

  if (!isClerkConfigured()) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">
          Clerk sign-in is not configured for this environment.{" "}
          <Link href={`/login?next=${encodeURIComponent(nextHref)}`} className="font-semibold text-black underline">
            Return to login
          </Link>
          .
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-5xl items-center justify-center px-6 pb-24 pt-32">
      <ClerkSignInShell nextHref={nextHref} />
    </main>
  );
}
