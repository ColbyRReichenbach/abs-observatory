"use client";

const CSRF_COOKIE_NAME = "aibs_csrf";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const matched = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : null;
}

export async function ensureCsrfToken() {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    const response = await fetch("/api/csrf", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { csrfToken?: string };
    if (!response.ok || !body.csrfToken) {
      return null;
    }
    return body.csrfToken;
  } catch {
    return null;
  }
}
