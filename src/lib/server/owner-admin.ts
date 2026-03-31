import type { QueryResultRow } from "pg";

import type { AuthIdentity } from "./auth";
import type { ViewerProfile } from "./profiles";

type OwnerIdentityLike =
  | (Pick<AuthIdentity, "provider" | "externalAuthId"> & { email?: string | null; primaryEmail?: string | null })
  | (Pick<ViewerProfile, "authProvider" | "externalAuthId"> & {
      email?: string | null;
      primaryEmail?: string | null;
    })
  | null
  | undefined;

type QueryFn = <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>;

export function getOwnerClerkUserId(): string | null {
  const value = process.env.OWNER_CLERK_USER_ID?.trim();
  return value ? value : null;
}

export function getOwnerEmails(): string[] {
  const raw = [process.env.OWNER_EMAIL, process.env.OWNER_EMAILS].filter(Boolean).join(",");
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerIdentity(identity: OwnerIdentityLike): boolean {
  if (!identity) return false;

  const provider = "authProvider" in identity ? identity.authProvider : identity.provider;
  const ownerClerkUserId = getOwnerClerkUserId();
  if (provider === "clerk" && ownerClerkUserId && identity.externalAuthId === ownerClerkUserId) {
    return true;
  }

  const email = "primaryEmail" in identity ? identity.primaryEmail : identity.email;
  return Boolean(email && getOwnerEmails().includes(email.trim().toLowerCase()));
}

export async function syncOwnerAdminRole(
  query: QueryFn,
  input: {
    userId: string;
    authProvider: string;
    externalAuthId: string;
    primaryEmail: string | null;
  },
) {
  if (input.authProvider !== "clerk") {
    return;
  }

  if (
    isOwnerIdentity({
      provider: input.authProvider,
      externalAuthId: input.externalAuthId,
      email: input.primaryEmail,
    })
  ) {
    await query(
      `
      INSERT INTO product.user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
      `,
      [input.userId],
    );
    await query(
      `
      UPDATE product.user_profiles
      SET ai_access_enabled = TRUE
      WHERE user_id = $1
      `,
      [input.userId],
    );
    return;
  }

  await query(
    `
    DELETE FROM product.user_roles
    WHERE user_id = $1
      AND role = 'admin'
    `,
    [input.userId],
  );
}
