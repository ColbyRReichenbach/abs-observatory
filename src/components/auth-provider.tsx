import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

const hasClerkCredentials =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!hasClerkCredentials) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
