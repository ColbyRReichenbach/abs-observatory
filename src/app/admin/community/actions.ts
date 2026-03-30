"use server";

export async function noopAdminCommunityAction() {
  return { ok: false as const };
}
