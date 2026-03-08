import { describe, expect, it } from "vitest";

import {
  APPROVED_AVATAR_PRESETS,
  canonicalizeModerationText,
  isApprovedAvatarPreset,
  normalizeUsername,
  validateUsername,
} from "@/lib/server/identity-policy";

describe("identity-policy", () => {
  it("normalizes usernames to lowercase underscores", () => {
    expect(normalizeUsername(" Mookie-Betts ")).toBe("mookie_betts");
  });

  it("rejects reserved names and profanity variants", () => {
    expect(validateUsername("Admin")).toEqual({ ok: false, error: "Username is reserved" });
    expect(validateUsername("n1gg3r")).toEqual({ ok: false, error: "Username is not allowed" });
  });

  it("accepts clean usernames in the allowed format", () => {
    expect(validateUsername("dodger_blue")).toEqual({ ok: true, username: "dodger_blue" });
  });

  it("canonicalizes leetspeak for moderation checks", () => {
    expect(canonicalizeModerationText("n1gg3r!!")).toBe("nigger");
  });

  it("accepts only approved avatar preset ids", () => {
    expect(isApprovedAvatarPreset(APPROVED_AVATAR_PRESETS[0])).toBe(true);
    expect(isApprovedAvatarPreset("custom-upload")).toBe(false);
  });
});
