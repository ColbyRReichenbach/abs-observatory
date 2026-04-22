import { describe, expect, it } from "vitest";

import {
  coerceInternalRouteScope,
  getSharedBarChartScale,
  getSharedBarSegment,
  normalizeInternalRouteScope,
} from "./ai-share";

describe("ai-share helpers", () => {
  it("accepts only internal route scopes", () => {
    expect(coerceInternalRouteScope("/teams/138?view=org")).toBe("/teams/138?view=org");
    expect(coerceInternalRouteScope("//evil.example")).toBeNull();
    expect(coerceInternalRouteScope("https://evil.example")).toBeNull();
    expect(normalizeInternalRouteScope(null, "/profile")).toBe("/profile");
    expect(normalizeInternalRouteScope("//evil.example", "/profile")).toBe("/profile");
  });

  it("computes negative-safe bar segments around a zero baseline", () => {
    const scale = getSharedBarChartScale([-2, 3]);

    expect(scale.min).toBe(-2);
    expect(scale.max).toBe(3);
    expect(scale.baselinePct).toBeCloseTo(40, 5);

    const negative = getSharedBarSegment(-2, scale);
    const positive = getSharedBarSegment(3, scale);

    expect(negative.isPositive).toBe(false);
    expect(negative.bottomPct).toBeCloseTo(0, 5);
    expect(negative.heightPct).toBeCloseTo(40, 5);

    expect(positive.isPositive).toBe(true);
    expect(positive.bottomPct).toBeCloseTo(40, 5);
    expect(positive.heightPct).toBeCloseTo(60, 5);
  });
});
