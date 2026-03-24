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

  const href = nextHref ? `/sign-in?next=${encodeURIComponent(nextHref)}` : "/sign-in";

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6">
      <h1 className="text-xl font-black text-[var(--ink-1)]">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--ink-2)]">Access saved views, profile features, and gated AI tools.</p>
      <Link
        href={href}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white"
      >
        Continue
      </Link>
    </div>
  );
}
