import fs from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const SPRING_START = "2026-02-20";
const AUDIT_TIME_ZONE = "America/New_York";

function todayInAuditTimeZone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AUDIT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const AUDIT_DATE = process.env.MODEL_AUDIT_DATE?.trim() || todayInAuditTimeZone();
export const AUDIT_END = process.env.MODEL_AUDIT_END?.trim() || AUDIT_DATE;

export function formatAuditDateLabel(date = AUDIT_DATE) {
  const [year, month, day] = String(date).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: AUDIT_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

export function auditDocPath(slug, root = ROOT, auditDate = AUDIT_DATE) {
  return path.join(root, "docs", "models", "audits", `${auditDate}-${slug}.md`);
}

export function auditArtifactPath(slug, root = ROOT, auditDate = AUDIT_DATE) {
  return path.join(root, "docs", "models", "audits", "artifacts", `${auditDate}-${slug}.json`);
}

export function loadAuditEnv() {
  for (const filename of [".env", ".env.local"]) {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export function resolveAuditDatabaseUrl() {
  const databaseUrl = process.env.WAREHOUSE_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("WAREHOUSE_DATABASE_URL or DATABASE_URL is required");
  }
  return databaseUrl;
}

export function describeAuditDatabaseTarget(connectionString) {
  const parsed = new URL(connectionString);
  return {
    role: process.env.WAREHOUSE_DATABASE_URL ? "warehouse" : "fallback_database_url",
    host: parsed.hostname || "local_socket",
    database: parsed.pathname.replace(/^\//, "") || "postgres",
  };
}
