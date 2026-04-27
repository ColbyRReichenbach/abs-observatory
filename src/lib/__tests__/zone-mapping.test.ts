import { describe, expect, it } from "vitest";

import { mapZoneX, mapZoneY, STRIKE_ZONE_PLOT } from "@/lib/zone-mapping";

describe("zone mapping", () => {
  it("aligns horizontal strike-zone edges with the rendered box", () => {
    expect(mapZoneX(-STRIKE_ZONE_PLOT.horizontalHalfWidthFt)).toBeCloseTo(STRIKE_ZONE_PLOT.zoneX);
    expect(mapZoneX(0)).toBeCloseTo(STRIKE_ZONE_PLOT.zoneX + STRIKE_ZONE_PLOT.zoneW / 2);
    expect(mapZoneX(STRIKE_ZONE_PLOT.horizontalHalfWidthFt)).toBeCloseTo(
      STRIKE_ZONE_PLOT.zoneX + STRIKE_ZONE_PLOT.zoneW,
    );
  });

  it("maps actual and adjusted modes differently for same pitch", () => {
    const actual = mapZoneY("actual", 3.2, 4, 2);
    const adjusted = mapZoneY("adjusted", 3.2, 4, 2);

    expect(actual).not.toBe(adjusted);
  });

  it("aligns adjusted vertical strike-zone edges with the rendered box", () => {
    expect(mapZoneY("adjusted", 3.5, 3.5, 1.5)).toBeCloseTo(STRIKE_ZONE_PLOT.zoneY);
    expect(mapZoneY("adjusted", 1.5, 3.5, 1.5)).toBeCloseTo(STRIKE_ZONE_PLOT.zoneY + STRIKE_ZONE_PLOT.zoneH);
  });

  it("keeps player-specific low ABS strikes inside the rendered zone", () => {
    const selectedLivePitch = mapZoneY("adjusted", 1.8398051966307403, 3.516, 1.774);
    expect(selectedLivePitch).toBeGreaterThan(STRIKE_ZONE_PLOT.zoneY);
    expect(selectedLivePitch).toBeLessThan(STRIKE_ZONE_PLOT.zoneY + STRIKE_ZONE_PLOT.zoneH);
  });
});
