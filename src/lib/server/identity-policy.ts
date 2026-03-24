const RESERVED_USERNAMES = new Set([
  "aibs",
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "clerk",
  "help",
  "home",
  "mlb",
  "moderator",
  "official",
  "root",
  "staff",
  "support",
  "system",
]);

const BLOCKED_USERNAME_TERMS = [
  "admin",
  "asshole",
  "bitch",
  "dick",
  "faggot",
  "fuck",
  "kike",
  "mlb",
  "moderator",
  "nigger",
  "penis",
  "pussy",
  "slut",
  "support",
];

const LEETSPEAK_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;

export const APPROVED_AVATAR_PRESETS = [
  "default-cap",
  "classic-pinstripe",
  "foam-finger",
  "scoreboard",
  "team-logo",
] as const;

export type ApprovedAvatarPreset = (typeof APPROVED_AVATAR_PRESETS)[number];

function transliterateLeetspeak(value: string): string {
  return value
    .split("")
    .map((char) => LEETSPEAK_MAP[char] ?? char)
    .join("");
}

export function canonicalizeModerationText(value: string): string {
  return transliterateLeetspeak(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  ).replace(/[^a-z0-9]/g, "");
}

export function normalizeUsername(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function validateUsername(value: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} lowercase letters, numbers, or underscores`,
    };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return { ok: false, error: "Username may only contain lowercase letters, numbers, and underscores" };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "Username is reserved" };
  }

  const canonical = canonicalizeModerationText(username);
  if (BLOCKED_USERNAME_TERMS.some((term) => canonical.includes(term))) {
    return { ok: false, error: "Username is not allowed" };
  }

  return { ok: true, username };
}

export function isApprovedAvatarPreset(value: string): value is ApprovedAvatarPreset {
  return APPROVED_AVATAR_PRESETS.includes(value as ApprovedAvatarPreset);
}
