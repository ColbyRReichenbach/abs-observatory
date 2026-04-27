function isNonPlaceholder(value: string | undefined): boolean {
  return Boolean(value && !value.toLowerCase().includes("placeholder"));
}

type ClerkKeyMode = "test" | "live";

function parseClerkKeyMode(value: string | undefined, prefix: "pk" | "sk"): ClerkKeyMode | null {
  if (!isNonPlaceholder(value)) return null;
  const match = value?.match(new RegExp(`^${prefix}_(test|live)_[A-Za-z0-9_]+`));
  if (!match) return null;
  return match[1] as ClerkKeyMode;
}

function allowsTestKeys(env: NodeJS.ProcessEnv): boolean {
  if (env.ALLOW_CLERK_TEST_KEYS === "true") return true;
  const vercelEnv = env.VERCEL_ENV?.toLowerCase();
  return !(vercelEnv === "preview" || vercelEnv === "production");
}

export function hasValidClerkCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  const publishableMode = parseClerkKeyMode(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "pk");
  const secretMode = parseClerkKeyMode(env.CLERK_SECRET_KEY, "sk");
  if (!publishableMode || !secretMode || publishableMode !== secretMode) return false;
  if (publishableMode === "live") return true;
  return allowsTestKeys(env);
}
