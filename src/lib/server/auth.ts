import { auth, currentUser } from "@clerk/nextjs/server";

export type AuthIdentity = {
  provider: string;
  externalAuthId: string;
  externalOrgId: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY);
}

function parseBooleanHeader(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return !["0", "false", "no"].includes(value.trim().toLowerCase());
}

function isVerifiedClerkUser(user: Awaited<ReturnType<typeof currentUser>>): boolean {
  return Boolean(
    user?.primaryEmailAddress?.verification?.status === "verified" ||
      user?.primaryPhoneNumber?.verification?.status === "verified",
  );
}

export async function getAuthIdentity(request?: Request): Promise<AuthIdentity | null> {
  if (isClerkConfigured()) {
    try {
      const session = await auth();
      if (session.userId) {
        const user = await currentUser();
        return {
          provider: "clerk",
          externalAuthId: session.userId,
          externalOrgId: session.orgId ?? null,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
          displayName: user?.fullName ?? user?.username ?? null,
          avatarUrl: user?.imageUrl ?? null,
          isVerified: isVerifiedClerkUser(user),
        };
      }
    } catch {
      // Fall back to explicit dev headers when middleware or Clerk is not active.
    }
  }

  if (!request) return null;

  const externalAuthId = request.headers.get("x-dev-user-id") ?? request.headers.get("x-user-id");
  if (!externalAuthId) return null;

  return {
    provider: request.headers.get("x-dev-auth-provider") ?? "dev",
    externalAuthId,
    externalOrgId: request.headers.get("x-dev-org-id"),
    email: request.headers.get("x-dev-user-email"),
    displayName: request.headers.get("x-dev-user-name"),
    avatarUrl: request.headers.get("x-dev-user-avatar"),
    isVerified: parseBooleanHeader(request.headers.get("x-dev-user-verified"), true),
  };
}
