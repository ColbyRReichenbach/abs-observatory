import { describe, expect, it } from "vitest";

import { hasRole, requireRole } from "@/lib/server/roles";

describe("roles", () => {
  it("checks role membership", () => {
    expect(hasRole(["user", "admin"], "admin")).toBe(true);
    expect(hasRole(["user"], "moderator")).toBe(false);
  });

  it("throws when the expected role is missing", () => {
    expect(() => requireRole(["user"], "admin")).toThrowError("Forbidden");
  });
});
