import { describe, expect, it } from "vitest";

import { isBaseballRelated, validateSql } from "../guardrails";

describe("guardrails", () => {
  it("accepts baseball-related prompts", () => {
    expect(isBaseballRelated("Which MLB teams challenge most in 3-2 counts?")).toBe(true);
  });

  it("rejects unrelated prompts", () => {
    expect(isBaseballRelated("What is the weather in Miami?")).toBe(false);
  });

  it("allows select queries over approved views with limit", () => {
    const result = validateSql("SELECT * FROM mart_team_abs_daily ORDER BY overturn_rate DESC LIMIT 20");
    expect(result.ok).toBe(true);
  });

  it("rejects dangerous SQL", () => {
    const result = validateSql("DROP TABLE games;");
    expect(result.ok).toBe(false);
  });

  it("rejects SQL outside allowlisted views", () => {
    const result = validateSql("SELECT * FROM games LIMIT 20");
    expect(result.ok).toBe(false);
  });
});
