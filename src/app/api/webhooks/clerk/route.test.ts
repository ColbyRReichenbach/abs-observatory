import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyWebhookMock = vi.fn();
const sqlExecMock = vi.fn();
const sqlOneMock = vi.fn();

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: verifyWebhookMock,
}));

vi.mock("@/lib/db", () => ({
  sqlExec: sqlExecMock,
  sqlOne: sqlOneMock,
}));

describe("/api/webhooks/clerk", () => {
  beforeEach(() => {
    verifyWebhookMock.mockReset();
    sqlExecMock.mockReset();
    sqlOneMock.mockReset();
  });

  it("upserts the user, profile, and role for verified user events", async () => {
    const { POST } = await import("./route");

    const event = {
      id: "evt_123",
      type: "user.created",
      data: {
        id: "user_123",
        first_name: "Mookie",
        last_name: "Betts",
        image_url: "https://example.com/avatar.png",
        primary_email_address_id: "email_123",
        email_addresses: [
          {
            id: "email_123",
            email_address: "mookie@example.com",
            verification: { status: "verified" },
          },
        ],
      },
    };
    verifyWebhookMock.mockResolvedValueOnce(event).mockResolvedValueOnce(event);
    sqlOneMock.mockResolvedValueOnce({ webhookdeliveryid: "delivery-1" }).mockResolvedValueOnce(null);

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));
    const secondResponse = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toEqual({ ok: true, duplicate: true });
    expect(sqlExecMock).toHaveBeenCalledTimes(3);
  });

  it("deletes the user row on user.deleted", async () => {
    const { POST } = await import("./route");

    verifyWebhookMock.mockResolvedValueOnce({
      id: "evt_456",
      type: "user.deleted",
      data: { id: "user_123" },
    });
    sqlOneMock.mockResolvedValueOnce({ webhookdeliveryid: "delivery-2" });

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(sqlExecMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid webhook signatures", async () => {
    const { POST } = await import("./route");
    verifyWebhookMock.mockRejectedValueOnce(new Error("invalid signature"));

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid signature" });
  });
});
