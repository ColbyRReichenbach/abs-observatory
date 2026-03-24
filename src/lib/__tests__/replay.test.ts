import { describe, expect, it } from "vitest";

import { replayIntervalMs, stepReplayIndex } from "@/lib/replay";

describe("replay utils", () => {
  it("returns expected interval per speed", () => {
    expect(replayIntervalMs("1x")).toBe(1300);
    expect(replayIntervalMs("2x")).toBe(800);
    expect(replayIntervalMs("4x")).toBe(450);
  });

  it("steps replay index within bounds", () => {
    expect(stepReplayIndex(0, "next", 5)).toBe(1);
    expect(stepReplayIndex(4, "next", 5)).toBe(4);
    expect(stepReplayIndex(3, "prev", 5)).toBe(2);
    expect(stepReplayIndex(0, "prev", 5)).toBe(0);
  });
});

