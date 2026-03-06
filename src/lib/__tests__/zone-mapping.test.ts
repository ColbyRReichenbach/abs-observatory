import { describe, expect, it } from "vitest";

import { mapZoneY } from "@/lib/zone-mapping";

describe("zone mapping", () => {
  it("maps actual and adjusted modes differently for same pitch", () => {
    const actual = mapZoneY("actual", 3.2, 3.5, 1.5);
    const adjusted = mapZoneY("adjusted", 3.2, 3.5, 1.5);

    expect(actual).not.toBe(adjusted);
  });

  it("keeps adjusted mapping within expected vertical range", () => {
    const adjusted = mapZoneY("adjusted", 2.4, 3.5, 1.5);
    expect(adjusted).toBeGreaterThan(100);
    expect(adjusted).toBeLessThan(360);
  });
});

