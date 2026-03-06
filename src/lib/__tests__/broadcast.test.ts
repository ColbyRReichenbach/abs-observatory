import { describe, expect, it } from "vitest";

import { nextTickerIndex, tickerIntervalMs } from "@/lib/broadcast";

describe("broadcast ticker", () => {
  it("rotates index and wraps correctly", () => {
    expect(nextTickerIndex(0, 4)).toBe(1);
    expect(nextTickerIndex(3, 4)).toBe(0);
    expect(nextTickerIndex(0, 0)).toBe(0);
  });

  it("clamps ticker interval to a safe minimum", () => {
    expect(tickerIntervalMs(300)).toBe(900);
    expect(tickerIntervalMs(2400)).toBe(2400);
  });
});

