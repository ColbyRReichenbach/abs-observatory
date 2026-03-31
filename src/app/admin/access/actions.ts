"use server";

import { revalidatePath } from "next/cache";

import { sqlOne } from "@/lib/db";
import { requireOwnerAdmin } from "@/lib/server/admin";

export async function updateAccountAccessAction(formData: FormData) {
  await requireOwnerAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const adminEnabled = formData.get("adminEnabled") === "on";
  const aiAccessEnabled = formData.get("aiAccessEnabled") === "on";

  if (!email) {
    throw new Error("Email is required");
  }

  const user = await sqlOne<{ userid: string }>(
    `
    SELECT user_id AS userId
    FROM product.users
    WHERE LOWER(primary_email) = LOWER($1)
    `,
    [email],
  );

  if (!user?.userid) {
    throw new Error("No user found for that email yet");
  }

  if (adminEnabled) {
    await sqlOne(
      `
      INSERT INTO product.user_roles (user_id, role)
      VALUES ($1, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING
      `,
      [user.userid],
    );
  } else {
    await sqlOne(
      `
      DELETE FROM product.user_roles
      WHERE user_id = $1
        AND role = 'admin'
      `,
      [user.userid],
    );
  }

  await sqlOne(
    `
    UPDATE product.user_profiles
    SET ai_access_enabled = $2
    WHERE user_id = $1
    `,
    [user.userid, aiAccessEnabled],
  );

  revalidatePath("/admin/access");
  revalidatePath("/profile");
  revalidatePath("/query");
}
