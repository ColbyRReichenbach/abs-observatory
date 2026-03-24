const URL_PATTERNS = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(?:com|net|org|io|gg|co|tv|app|dev|me|ly|gg)\b/i,
];

const HTML_PATTERN = /<[^>]+>/;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\([^)]+\)/;

const BLOCKED_COMMENT_TERMS = [
  "killyourself",
  "nigger",
  "faggot",
  "kike",
  "chink",
  "spic",
  "rape",
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

export const COMMENT_MAX_LENGTH = 500;

function canonicalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((char) => LEETSPEAK_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeCommentBody(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function validateCommentBody(
  value: string,
): { ok: true; body: string } | { ok: false; error: string } {
  const body = normalizeCommentBody(value);

  if (!body) {
    return { ok: false, error: "Comment body is required" };
  }

  if (body.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `Comment body must be ${COMMENT_MAX_LENGTH} characters or fewer` };
  }

  if (HTML_PATTERN.test(body)) {
    return { ok: false, error: "Comments must be plain text only" };
  }

  if (MARKDOWN_LINK_PATTERN.test(body)) {
    return { ok: false, error: "Comments may not contain links" };
  }

  if (URL_PATTERNS.some((pattern) => pattern.test(body))) {
    return { ok: false, error: "Comments may not contain links" };
  }

  if (BLOCKED_COMMENT_TERMS.some((term) => canonicalize(body).includes(term))) {
    return { ok: false, error: "Comment contains disallowed language" };
  }

  return { ok: true, body };
}
