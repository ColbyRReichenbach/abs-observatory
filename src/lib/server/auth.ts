import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

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

function getStringClaim(
  claims: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!claims) return null;
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function isVerifiedClerkUser(user: Awaited<ReturnType<typeof currentUser>> | Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>): boolean {
  return Boolean(
    user?.primaryEmailAddress?.verification?.status === "verified" ||
      user?.primaryPhoneNumber?.verification?.status === "verified",
  );
}

export async function getAuthIdentity(request?: Request): Promise<AuthIdentity | null> {
  if (isClerkConfigured()) {
    let session: Awaited<ReturnType<typeof auth>> | null = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }

    if (session?.userId) {
      const claims =
        ((session as unknown as { sessionClaims?: Record<string, unknown> | null }).sessionClaims ?? null) || null;

      let user: Awaited<ReturnType<typeof currentUser>> | null = null;
      try {
        user = await currentUser();
      } catch {
        user = null;
      }

      if (!user) {
        try {
          const client = await clerkClient();
          user = await client.users.getUser(session.userId);
        } catch {
          user = null;
        }
      }

      const email =
        user?.primaryEmailAddress?.emailAddress ??
        getStringClaim(claims, ["email", "email_address"]) ??
        null;
      const displayName =
        user?.fullName ??
        user?.username ??
        getStringClaim(claims, ["name", "full_name", "preferred_username"]) ??
        null;
      const avatarUrl =
        user?.imageUrl ??
        getStringClaim(claims, ["image_url", "picture"]) ??
        null;
      const isVerified =
        user !== null
          ? isVerifiedClerkUser(user)
          : parseBooleanHeader(
              getStringClaim(claims, ["email_verified", "verified"]) ??
                (typeof claims?.email_verified === "boolean" ? String(claims.email_verified) : null),
              false,
            );

      return {
        provider: "clerk",
        externalAuthId: session.userId,
        externalOrgId: session.orgId ?? null,
        email,
        displayName,
        avatarUrl,
        isVerified,
      };
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
