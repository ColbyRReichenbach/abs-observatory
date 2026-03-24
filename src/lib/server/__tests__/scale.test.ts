import { describe, expect, it } from "vitest";

import { ConcurrencyLimitError, consumeRateLimit, getCacheKey, withCachedValue, withConcurrencyGate } from "@/lib/server/scale";

describe("scale primitives", () => {
  it("coalesces inflight cache fetches", async () => {
    let calls = 0;

    const [first, second] = await Promise.all([
      withCachedValue(getCacheKey(["live-games"]), 5_000, async () => {
        calls += 1;
        return { games: 12 };
      }),
      withCachedValue(getCacheKey(["live-games"]), 5_000, async () => {
        calls += 1;
        return { games: 12 };
      }),
    ]);

    expect(first).toEqual({ games: 12 });
    expect(second).toEqual({ games: 12 });
    expect(calls).toBe(1);
  });

  it("enforces local rate limits", async () => {
    const bucket = `comments-${Date.now()}`;

    const first = await consumeRateLimit({
      bucket,
      subject: "user-1",
      limit: 2,
      windowMs: 60_000,
    });
    const second = await consumeRateLimit({
      bucket,
      subject: "user-1",
      limit: 2,
      windowMs: 60_000,
    });
    const third = await consumeRateLimit({
      bucket,
      subject: "user-1",
      limit: 2,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("applies concurrency gates", async () => {
    const gate = `ai-${Date.now()}`;
    let blocked: unknown = null;

    await Promise.all([
      withConcurrencyGate(gate, 1, async () => {
        try {
          await withConcurrencyGate(gate, 1, async () => "blocked");
        } catch (error) {
          blocked = error;
        }
      }),
    ]);

    expect(blocked).toBeInstanceOf(ConcurrencyLimitError);
  });
});
