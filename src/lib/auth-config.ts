function isNonPlaceholder(value: string | undefined): boolean {
  return Boolean(value && !value.toLowerCase().includes("placeholder"));
}

function looksLikeClerkPublishableKey(value: string | undefined): boolean {
  return Boolean(value && /^(pk_(test|live)_[A-Za-z0-9_]+)/.test(value) && isNonPlaceholder(value));
}

function looksLikeClerkSecretKey(value: string | undefined): boolean {
  return Boolean(value && /^(sk_(test|live)_[A-Za-z0-9_]+)/.test(value) && isNonPlaceholder(value));
}

export function hasValidClerkCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return looksLikeClerkPublishableKey(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && looksLikeClerkSecretKey(env.CLERK_SECRET_KEY);
}
