import { describe, expect, it } from "vitest";

import { normalizeAuthNextHref, resolveAuthNextHref } from "./auth-entry";

describe("normalizeAuthNextHref", () => {
  it("keeps internal relative paths only", () => {
    expect(normalizeAuthNextHref("/profile?view=org")).toBe("/profile?view=org");
    expect(normalizeAuthNextHref("https://example.com/profile")).toBe("/profile");
    expect(normalizeAuthNextHref("//example.com/profile")).toBe("/profile");
  });
});

describe("resolveAuthNextHref", () => {
  it("preserves an explicit view mode from the next href", () => {
    expect(resolveAuthNextHref("/profile?view=org", "fan")).toBe("/profile?view=org");
  });

  it("adds the active view mode when next href has no view mode", () => {
    expect(resolveAuthNextHref("/profile", "org")).toBe("/profile?view=org");
  });
});
