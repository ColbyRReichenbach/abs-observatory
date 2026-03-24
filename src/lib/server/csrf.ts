const CSRF_COOKIE_NAME = "aibs_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

function parseCookies(value: string | null): Record<string, string> {
  if (!value) return {};

  return Object.fromEntries(
    value
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) {
          return [part, ""];
        }
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

export function getCsrfCookieName() {
  return CSRF_COOKIE_NAME;
}

export function issueCsrfToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function shouldBypassCsrf(request: Request): boolean {
  return Boolean(
    request.headers.get("x-dev-user-id") ??
      request.headers.get("x-user-id") ??
      request.headers.get("x-worker-token"),
  );
}

export function assertValidCsrf(request: Request) {
  if (shouldBypassCsrf(request)) {
    return;
  }

  const csrfCookie = parseCookies(request.headers.get("cookie"))[CSRF_COOKIE_NAME];
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new Error("CSRF validation failed");
  }

  if (origin && origin !== requestOrigin) {
    throw new Error("CSRF origin mismatch");
  }
}
