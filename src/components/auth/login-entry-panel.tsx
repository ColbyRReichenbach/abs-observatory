import Link from "next/link";

export function LoginEntryPanel({
  authEnabled,
  nextHref,
}: {
  authEnabled: boolean;
  nextHref?: string | null;
  mode?: string;
}) {
  if (!authEnabled) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-[var(--ink-2)]">
        Authentication is currently unavailable.
      </div>
    );
  }

  const signInHref = nextHref ? `/sign-in?next=${encodeURIComponent(nextHref)}` : "/sign-in";
  const signUpHref = nextHref ? `/sign-up?next=${encodeURIComponent(nextHref)}` : "/sign-up";

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6">
      <h1 className="text-xl font-black text-[var(--ink-1)]">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--ink-2)]">Access saved views, profile features, and gated AI tools.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={signInHref}
          className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white"
        >
          Sign In
        </Link>
        <Link
          href={signUpHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)]"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
