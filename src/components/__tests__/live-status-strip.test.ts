import { describe, expect, it } from "vitest";

import { computeCadenceBuckets, isStaleFeed } from "@/components/live-status-strip";

describe("LiveStatusStrip helpers", () => {
  it("maps events into 10-minute cadence buckets", () => {
    const now = new Date("2026-03-05T12:10:00Z").getTime();
    const buckets = computeCadenceBuckets(
      [
        { challengedAt: "2026-03-05T12:09:40Z", isOverturned: false },
        { challengedAt: "2026-03-05T12:06:10Z", isOverturned: true },
      ],
      now,
    );

    expect(buckets).toHaveLength(10);
    expect(buckets.some((v) => v === 2)).toBe(true);
    expect(buckets.some((v) => v === 1)).toBe(true);
  });

  it("marks stale feed when update age exceeds threshold", () => {
    const now = new Date("2026-03-05T12:10:00Z").getTime();
    expect(isStaleFeed("2026-03-05T12:09:00Z", now)).toBe(false);
    expect(isStaleFeed("2026-03-05T12:05:00Z", now)).toBe(true);
    expect(isStaleFeed(null, now)).toBe(true);
  });
});

