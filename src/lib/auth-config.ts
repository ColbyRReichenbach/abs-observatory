function isNonPlaceholder(value: string | undefined): value is string {
  return Boolean(value && !value.toLowerCase().includes("placeholder"));
}

type ClerkKeyMode = "test" | "live";

function parseClerkKeyMode(value: string | undefined, prefix: "pk" | "sk"): ClerkKeyMode | null {
  const key = value?.trim();
  if (!isNonPlaceholder(key)) return null;
  const match = key.match(new RegExp(`^${prefix}_(test|live)_[A-Za-z0-9_-]+$`));
  if (!match) return null;
  return match[1] as ClerkKeyMode;
}

export function hasValidClerkCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  const publishableMode = parseClerkKeyMode(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "pk");
  const secretMode = parseClerkKeyMode(env.CLERK_SECRET_KEY, "sk");
  return Boolean(publishableMode && secretMode && publishableMode === secretMode);
}
