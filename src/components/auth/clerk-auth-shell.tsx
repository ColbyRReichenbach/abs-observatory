"use client";

import { useSyncExternalStore } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ClerkSignInShell({ nextHref }: { nextHref: string }) {
  const mounted = useHasMounted();

  if (!mounted) {
    return <div className="text-sm text-[var(--ink-2)]">Loading sign-in...</div>;
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      fallbackRedirectUrl={nextHref}
      signUpFallbackRedirectUrl={nextHref}
    />
  );
}

export function ClerkSignUpShell({ nextHref }: { nextHref: string }) {
  const mounted = useHasMounted();

  if (!mounted) {
    return <div className="text-sm text-[var(--ink-2)]">Loading sign-up...</div>;
  }

  return (
    <SignUp
      routing="path"
      path="/sign-up"
      fallbackRedirectUrl={nextHref}
      signInFallbackRedirectUrl={nextHref}
    />
  );
}
