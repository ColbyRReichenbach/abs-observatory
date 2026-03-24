type CacheEnvelope<T> = {
  value: T;
  expiresAt: number;
};

type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalScaleState = globalThis as typeof globalThis & {
  __aibs_cache__?: Map<string, CacheEnvelope<unknown>>;
  __aibs_inflight__?: Map<string, Promise<unknown>>;
  __aibs_rate_limits__?: Map<string, LocalRateLimitEntry>;
  __aibs_concurrency__?: Map<string, number>;
};

const cacheStore = globalScaleState.__aibs_cache__ ?? new Map<string, CacheEnvelope<unknown>>();
const inflightStore = globalScaleState.__aibs_inflight__ ?? new Map<string, Promise<unknown>>();
const rateLimitStore = globalScaleState.__aibs_rate_limits__ ?? new Map<string, LocalRateLimitEntry>();
const concurrencyStore = globalScaleState.__aibs_concurrency__ ?? new Map<string, number>();

if (!globalScaleState.__aibs_cache__) {
  globalScaleState.__aibs_cache__ = cacheStore;
}
if (!globalScaleState.__aibs_inflight__) {
  globalScaleState.__aibs_inflight__ = inflightStore;
}
if (!globalScaleState.__aibs_rate_limits__) {
  globalScaleState.__aibs_rate_limits__ = rateLimitStore;
}
if (!globalScaleState.__aibs_concurrency__) {
  globalScaleState.__aibs_concurrency__ = concurrencyStore;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  currentCount: number;
};

export class ConcurrencyLimitError extends Error {
  constructor(readonly gate: string, readonly maxConcurrent: number) {
    super(`Concurrency limit exceeded for ${gate}`);
  }
}

export function getCacheKey(parts: Array<string | number | boolean | null | undefined>): string {
  return parts.map((part) => String(part ?? "null")).join(":");
}

export async function withCachedValue<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = cacheStore.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const inflight = inflightStore.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const pending = loader()
    .then((value) => {
      cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
      inflightStore.delete(key);
      return value;
    })
    .catch((error) => {
      inflightStore.delete(key);
      throw error;
    });

  inflightStore.set(key, pending as Promise<unknown>);
  return pending;
}

export function getCachedValue<T>(key: string): T | null {
  const existing = cacheStore.get(key);
  if (!existing) return null;
  if (existing.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  return existing.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCachedValue(key: string): void {
  cacheStore.delete(key);
}

export async function consumeRateLimit(params: {
  bucket: string;
  subject: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const key = getCacheKey([params.bucket, params.subject]);
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    const next: LocalRateLimitEntry = {
      count: 1,
      resetAt: now + params.windowMs,
    };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      limit: params.limit,
      remaining: Math.max(params.limit - 1, 0),
      resetAt: next.resetAt,
      currentCount: next.count,
    };
  }

  if (current.count >= params.limit) {
    return {
      allowed: false,
      limit: params.limit,
      remaining: 0,
      resetAt: current.resetAt,
      currentCount: current.count,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return {
    allowed: true,
    limit: params.limit,
    remaining: Math.max(params.limit - current.count, 0),
    resetAt: current.resetAt,
    currentCount: current.count,
  };
}

export async function withConcurrencyGate<T>(gate: string, maxConcurrent: number, fn: () => Promise<T>): Promise<T> {
  const current = concurrencyStore.get(gate) ?? 0;
  if (current >= maxConcurrent) {
    throw new ConcurrencyLimitError(gate, maxConcurrent);
  }

  concurrencyStore.set(gate, current + 1);
  try {
    return await fn();
  } finally {
    const next = Math.max((concurrencyStore.get(gate) ?? 1) - 1, 0);
    if (next === 0) {
      concurrencyStore.delete(gate);
    } else {
      concurrencyStore.set(gate, next);
    }
  }
}
