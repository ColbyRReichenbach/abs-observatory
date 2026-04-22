import { describe, expect, it } from "vitest";

describe("/api/follows/[userId]", () => {
  it("returns a stable disabled contract for follow mutations", async () => {
    const { POST, DELETE } = await import("./route");

    const postResponse = await POST();
    expect(postResponse.status).toBe(501);
    expect(await postResponse.json()).toEqual({
      ok: false,
      disabled: true,
      code: "follows_not_enabled",
      message:
        "Follow relationships remain disabled until public identity, moderation, and ownership rules are broader than the current profile layer.",
    });

    const deleteResponse = await DELETE();
    expect(deleteResponse.status).toBe(501);
    expect(await deleteResponse.json()).toEqual({
      ok: false,
      disabled: true,
      code: "follows_not_enabled",
      message:
        "Follow relationships remain disabled until public identity, moderation, and ownership rules are broader than the current profile layer.",
    });
  });
});
