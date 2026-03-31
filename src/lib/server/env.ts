type EnvRequirement = {
  name: string;
  requiredIn: "always" | "production";
};

const ENV_REQUIREMENTS: EnvRequirement[] = [
  { name: "DATABASE_URL", requiredIn: "always" },
  { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", requiredIn: "always" },
  { name: "CLERK_SECRET_KEY", requiredIn: "always" },
  { name: "CLERK_WEBHOOK_SIGNING_SECRET", requiredIn: "production" },
  { name: "OPENAI_API_KEY", requiredIn: "production" },
  { name: "INTERNAL_WORKER_TOKEN", requiredIn: "production" },
] as const;

type EnvValidationIssue = {
  name: string;
  requiredIn: EnvRequirement["requiredIn"];
};

const globalForEnvValidation = globalThis as typeof globalThis & {
  __aibsEnvValidation?: { strict: boolean; issues: EnvValidationIssue[] };
};

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getServerEnv(name: string) {
  return readEnv(name);
}

export function validateServerEnv(strict = process.env.NODE_ENV === "production") {
  const cached = globalForEnvValidation.__aibsEnvValidation;
  if (cached && cached.strict === strict) {
    if (strict && cached.issues.length > 0) {
      throw new Error(`Missing required environment variables: ${cached.issues.map((issue) => issue.name).join(", ")}`);
    }
    return {
      ok: cached.issues.length === 0,
      issues: cached.issues,
    };
  }

  const issues = ENV_REQUIREMENTS.filter((requirement) => {
    if (requirement.requiredIn === "production" && !strict) {
      return false;
    }
    return !readEnv(requirement.name);
  }).map((requirement) => ({
    name: requirement.name,
    requiredIn: requirement.requiredIn,
  }));

  if (strict) {
    const ownerConfigured = readEnv("OWNER_CLERK_USER_ID") || readEnv("OWNER_EMAIL") || readEnv("OWNER_EMAILS");
    if (!ownerConfigured) {
      issues.push({ name: "OWNER_CLERK_USER_ID | OWNER_EMAIL | OWNER_EMAILS", requiredIn: "production" });
    }
  }

  globalForEnvValidation.__aibsEnvValidation = { strict, issues };

  if (strict && issues.length > 0) {
    throw new Error(`Missing required environment variables: ${issues.map((issue) => issue.name).join(", ")}`);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
