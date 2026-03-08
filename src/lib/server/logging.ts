const SENSITIVE_KEY_PATTERN = /(authorization|cookie|secret|token|signature|api[-_]?key|password|prompt|email)/i;

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") {
    if (value.length <= 8) {
      return "[REDACTED]";
    }
    return `${value.slice(0, 2)}…[REDACTED]`;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => redactValue(item));
  }
  if (typeof value === "object") {
    return redactForLogs(value);
  }
  return value;
}

export function redactForLogs(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return redactValue(value);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactValue(entry),
    ]),
  );
}

export function logServerError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      level: "error",
      context,
      message,
      metadata: metadata ? redactForLogs(metadata) : undefined,
    }),
  );
}
