import { describe, expect, it } from "vitest";

import { buildRangeHref, parseRange } from "@/lib/range";

describe("range helpers", () => {
  it("parses valid and invalid ranges safely", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("season")).toBe("season");
    expect(parseRange("all")).toBe("all");
    expect(parseRange("bad")).toBe("season");
    expect(parseRange(undefined)).toBe("season");
  });

  it("builds range href while preserving other params", () => {
    const href = buildRangeHref("/teams/111", "30d", { metric: "success", range: "all" });
    expect(href).toBe("/teams/111?metric=success&range=30d");
  });
});

