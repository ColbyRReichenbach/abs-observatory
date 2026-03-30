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
