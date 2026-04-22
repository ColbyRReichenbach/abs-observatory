import { readFileSync } from "node:fs";
import { join } from "node:path";

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isUsableEnvValue(name: string, value: string | undefined): boolean {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return false;

  if (name === "DATABASE_URL") {
    return normalized.startsWith("postgres://") || normalized.startsWith("postgresql://");
  }

  return true;
}

export function loadTestEnvValue(name: string): string | undefined {
  if (isUsableEnvValue(name, process.env[name])) {
    return normalizeEnvValue(process.env[name]);
  }

  for (const fileName of [".env.production.local", ".env.local", ".env"]) {
    try {
      const contents = readFileSync(join(process.cwd(), fileName), "utf8");
      for (const line of contents.split("\n")) {
        if (!line.startsWith(`${name}=`)) continue;
        const value = line.slice(name.length + 1);
        if (isUsableEnvValue(name, value)) {
          return normalizeEnvValue(value);
        }
      }
    } catch {
      // Ignore missing env files in tests.
    }
  }

  return undefined;
}
