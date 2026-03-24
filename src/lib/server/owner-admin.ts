import type { QueryResultRow } from "pg";

import type { AuthIdentity } from "./auth";
import type { ViewerProfile } from "./profiles";

type OwnerIdentityLike =
  | Pick<AuthIdentity, "provider" | "externalAuthId">
  | Pick<ViewerProfile, "authProvider" | "externalAuthId">
  | null
  | undefined;

type QueryFn = <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>;

export function getOwnerClerkUserId(): string | null {
  const value = process.env.OWNER_CLERK_USER_ID?.trim();
  return value ? value : null;
}

export function isOwnerIdentity(identity: OwnerIdentityLike): boolean {
  const ownerClerkUserId = getOwnerClerkUserId();
  if (!ownerClerkUserId || !identity) return false;

  const provider = "authProvider" in identity ? identity.authProvider : identity.provider;
  return provider === "clerk" && identity.externalAuthId === ownerClerkUserId;
}

export async function syncOwnerAdminRole(
  query: QueryFn,
  input: {
    userId: string;
    authProvider: string;
    externalAuthId: string;
  },
) {
  if (input.authProvider !== "clerk") {
    return;
  }

  if (isOwnerIdentity({ provider: input.authProvider, externalAuthId: input.externalAuthId })) {
    await query(
      `
      INSERT INTO product.user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
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
