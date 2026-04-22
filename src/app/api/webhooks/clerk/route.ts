import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { sqlExec, sqlOne } from "@/lib/db";
import { logServerError } from "@/lib/server/logging";
import { syncOwnerAdminRole } from "@/lib/server/owner-admin";

function getString(data: unknown, key: string): string | null {
  if (!data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getPrimaryEmail(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>).email_addresses;
  if (!Array.isArray(value) || value.length === 0) return null;
  const primaryId = getString(data, "primary_email_address_id");
  const first =
    value.find((entry) => entry && typeof entry === "object" && getString(entry, "id") === primaryId) ?? value[0];
  if (!first || typeof first !== "object") return null;
  const email = (first as Record<string, unknown>).email_address;
  return typeof email === "string" ? email : null;
}

function isPrimaryEmailVerified(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const value = (data as Record<string, unknown>).email_addresses;
  if (!Array.isArray(value) || value.length === 0) return false;
  const primaryId = getString(data, "primary_email_address_id");
  const primary =
    value.find((entry) => entry && typeof entry === "object" && getString(entry, "id") === primaryId) ?? value[0];
  if (!primary || typeof primary !== "object") return false;
  const verification = (primary as Record<string, unknown>).verification;
  if (!verification || typeof verification !== "object") return false;
  return getString(verification, "status") === "verified";
}

function getDeliveryId(request: NextRequest, event: unknown): string | null {
  const eventId =
    event && typeof event === "object" && "id" in event && typeof (event as { id?: unknown }).id === "string"
      ? (event as { id: string }).id
      : null;

  return eventId ?? request.headers.get("svix-id") ?? request.headers.get("webhook-id");
}

function payloadHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const evt = await verifyWebhook(request);
    const payload = evt.data as unknown;
    const deliveryId = getDeliveryId(request, evt);

    if (!deliveryId) {
      return NextResponse.json({ error: "Missing webhook delivery id" }, { status: 400 });
    }

    const delivery = await sqlOne<{ webhookdeliveryid: string }>(
      `
      INSERT INTO ops.webhook_deliveries (provider, delivery_id, event_type, payload_hash, metadata)
      VALUES ('clerk', $1, $2, $3, $4)
      ON CONFLICT (provider, delivery_id) DO NOTHING
      RETURNING webhook_delivery_id AS webhookDeliveryId
      `,
      [deliveryId, evt.type, payloadHash(payload), JSON.stringify({ deliveryId })],
    );

    if (!delivery) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const emailAddress = getPrimaryEmail(payload);

      if (emailAddress) {
        const existingByEmail = await sqlOne<{
          userid: string;
          externalauthid: string;
        }>(
          `
          SELECT
            user_id AS userId,
            external_auth_id AS externalAuthId
          FROM product.users
          WHERE LOWER(primary_email) = LOWER($1)
            AND NOT (
              external_auth_provider = 'clerk'
              AND external_auth_id = $2
            )
          LIMIT 1
          `,
          [emailAddress, getString(payload, "id")],
        );

        if (existingByEmail) {
          return NextResponse.json({ error: "Email is already attached to another account" }, { status: 409 });
        }
      }

      const displayName = [getString(payload, "first_name"), getString(payload, "last_name")]
        .filter(Boolean)
        .join(" ")
        .trim() || getString(payload, "username");

      await sqlExec(
        `
        INSERT INTO product.users (
          external_auth_provider,
          external_auth_id,
          primary_email,
          display_name,
          avatar_url,
          is_verified,
          verified_at,
          last_seen_at
        )
        VALUES ('clerk', $1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END, NOW())
        ON CONFLICT (external_auth_provider, external_auth_id)
        DO UPDATE SET
          primary_email = EXCLUDED.primary_email,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          is_verified = EXCLUDED.is_verified,
          verified_at = CASE
            WHEN EXCLUDED.is_verified THEN COALESCE(product.users.verified_at, NOW())
            ELSE NULL
          END,
          last_seen_at = NOW()
        `,
        [
          getString(payload, "id"),
          emailAddress,
          displayName || null,
          getString(payload, "image_url"),
          isPrimaryEmailVerified(payload),
        ],
      );

      await sqlExec(
        `
        INSERT INTO product.user_profiles (user_id)
        SELECT user_id
        FROM product.users
        WHERE external_auth_provider = 'clerk'
          AND external_auth_id = $1
        ON CONFLICT (user_id) DO NOTHING
        `,
        [getString(payload, "id")],
      );

      await sqlExec(
        `
        INSERT INTO product.user_roles (user_id, role)
        SELECT user_id, 'user'
        FROM product.users
        WHERE external_auth_provider = 'clerk'
          AND external_auth_id = $1
        ON CONFLICT (user_id, role) DO NOTHING
        `,
        [getString(payload, "id")],
      );

      const user = await sqlOne<{ userid: string }>(
        `
        SELECT user_id AS userId
        FROM product.users
        WHERE external_auth_provider = 'clerk'
          AND external_auth_id = $1
        `,
        [getString(payload, "id")],
      );

      if (user?.userid) {
        await syncOwnerAdminRole(
          async (statement, values = []) => {
            await sqlExec(statement, values);
            return [];
          },
          {
            userId: user.userid,
            authProvider: "clerk",
            externalAuthId: getString(payload, "id") ?? "",
          },
        );
      }
    }

    if (evt.type === "user.deleted" && getString(payload, "id")) {
      await sqlExec(
        `
        DELETE FROM product.users
        WHERE external_auth_provider = 'clerk'
          AND external_auth_id = $1
        `,
        [getString(payload, "id")],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("api.webhooks.clerk", error, {
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
    });
    const message = error instanceof Error ? error.message : "Webhook verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
