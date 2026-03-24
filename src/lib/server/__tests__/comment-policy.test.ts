import { describe, expect, it } from "vitest";

import { normalizeCommentBody, validateCommentBody } from "@/lib/server/comment-policy";

describe("comment-policy", () => {
  it("normalizes comment whitespace", () => {
    expect(normalizeCommentBody("  Hello\r\nWorld  ")).toBe("Hello\nWorld");
  });

  it("rejects urls and markdown links", () => {
    expect(validateCommentBody("check this out https://example.com")).toEqual({
      ok: false,
      error: "Comments may not contain links",
    });
    expect(validateCommentBody("[box score](https://example.com)")).toEqual({
      ok: false,
      error: "Comments may not contain links",
    });
  });

  it("rejects html and disallowed slurs", () => {
    expect(validateCommentBody("<b>hello</b>")).toEqual({
      ok: false,
      error: "Comments must be plain text only",
    });
    expect(validateCommentBody("n1gg3r")).toEqual({
      ok: false,
      error: "Comment contains disallowed language",
    });
  });

  it("accepts plain text baseball discussion", () => {
    expect(validateCommentBody("I would have challenged that pitch in the 8th.")).toEqual({
      ok: true,
      body: "I would have challenged that pitch in the 8th.",
    });
  });
});
