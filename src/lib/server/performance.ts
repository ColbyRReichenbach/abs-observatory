export async function withServerTiming<T>(
  label: string,
  work: () => Promise<T> | T,
  options?: { warnAtMs?: number; metadata?: Record<string, unknown> },
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await work();
  } finally {
    const durationMs = Date.now() - startedAt;
    if (process.env.AIBS_TIMING_LOGS === "true") {
      console.info(`[timing] ${label} ${durationMs}ms`);
    }
    if (options?.warnAtMs && durationMs >= options.warnAtMs) {
      console.warn(`[timing:warn] ${label} ${durationMs}ms`);
    }
  }
}
