import path from "node:path";
import { loadDefaultEnv } from "../lib/env.mjs";

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
  loadDefaultEnv(ROOT);
}

export function resolveAuditDatabaseUrl() {
  const databaseUrl =
    process.env.MODEL_AUDIT_DATABASE_URL ||
    process.env.AUDIT_DATABASE_URL ||
    process.env.WAREHOUSE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SERVING_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("MODEL_AUDIT_DATABASE_URL, AUDIT_DATABASE_URL, WAREHOUSE_DATABASE_URL, DATABASE_URL, or SERVING_DATABASE_URL is required");
  }
  return databaseUrl;
}

export function describeAuditDatabaseTarget(connectionString) {
  const parsed = new URL(connectionString);
  const source = process.env.MODEL_AUDIT_DATABASE_URL
    ? "MODEL_AUDIT_DATABASE_URL"
    : process.env.AUDIT_DATABASE_URL
      ? "AUDIT_DATABASE_URL"
      : process.env.WAREHOUSE_DATABASE_URL
        ? "WAREHOUSE_DATABASE_URL"
        : process.env.DATABASE_URL
          ? "DATABASE_URL"
          : "SERVING_DATABASE_URL";
  return {
    role:
      source === "WAREHOUSE_DATABASE_URL"
        ? "warehouse"
        : source === "DATABASE_URL" || source === "SERVING_DATABASE_URL"
          ? "serving"
          : "explicit_audit_target",
    host: parsed.hostname || "local_socket",
    database: parsed.pathname.replace(/^\//, "") || "postgres",
    source,
  };
}
