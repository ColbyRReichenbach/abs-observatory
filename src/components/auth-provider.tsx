import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export function AuthProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return children;
  }

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/profile"
      signUpFallbackRedirectUrl="/profile"
    >
      {children}
    </ClerkProvider>
  );
}
