import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("/api/query", () => {
  it("returns 410 because the legacy NL-to-SQL route is disabled", async () => {
    const response = await POST(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "Show me league overturn rate" }),
      }),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "The legacy NL-to-SQL route is disabled.",
      code: "AI_QUERY_DEPRECATED",
      hint: "Use /api/ai/chat with typed tools instead.",
    });
  });
});
