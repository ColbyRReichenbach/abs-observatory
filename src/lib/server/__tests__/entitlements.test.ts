import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const sqlOneMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
}));

describe("entitlements", () => {
  beforeEach(() => {
    delete process.env.AI_DAILY_BUDGET_USD;
    delete process.env.AI_MONTHLY_BUDGET_USD;
    delete process.env.AI_MODEL_MONTHLY_BUDGETS_JSON;
    sqlMock.mockReset();
    sqlOneMock.mockReset();
  });

  it("creates a default free entitlement when none exists", async () => {
    const { getOrCreateAiEntitlement } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "free",
        airequestsperday: 8,
        aitokenspermonth: 25000,
        aicostusdpermonth: "5",
        featureflags: {
          premium_ai_limits: false,
          ai_chart_generation: false,
          ai_editorial_tools: false,
        },
      });

    const entitlement = await getOrCreateAiEntitlement("user-1");

    expect(entitlement).toEqual(
      expect.objectContaining({
        userId: "user-1",
        planCode: "free",
        aiRequestsPerDay: 8,
      }),
    );
  });

  it("blocks free users from editorial tools and enforces monthly token ceilings", async () => {
    const { assertAiUsageAllowed } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "free",
        airequestsperday: 8,
        aitokenspermonth: 100,
        aicostusdpermonth: "5",
        featureflags: {
          premium_ai_limits: false,
          ai_chart_generation: false,
          ai_editorial_tools: false,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "1",
        monthlytokens: "95",
        monthlycostusd: "1",
      })
      .mockResolvedValueOnce({ dailycostusd: "1" })
      .mockResolvedValueOnce({ monthlycostusd: "2" });

    await expect(
      assertAiUsageAllowed({
        userId: "user-1",
        featureKey: "ai_editorial_tools",
        estimatedInputTokens: 5,
        modelName: "gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "AI_PLAN_RESTRICTED", status: 403 });

    sqlOneMock.mockReset();
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "free",
        airequestsperday: 8,
        aitokenspermonth: 100,
        aicostusdpermonth: "5",
        featureflags: {
          premium_ai_limits: false,
          ai_chart_generation: false,
          ai_editorial_tools: false,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "1",
        monthlytokens: "99",
        monthlycostusd: "1",
      })
      .mockResolvedValueOnce({ dailycostusd: "1" })
      .mockResolvedValueOnce({ monthlycostusd: "2" });

    await expect(
      assertAiUsageAllowed({
        userId: "user-1",
        featureKey: "ai_chat_basic",
        estimatedInputTokens: 5,
        modelName: "gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "AI_QUOTA_EXCEEDED", status: 429 });
  });

  it("allows higher tiers more headroom and records usage ledger rows", async () => {
    const { assertAiUsageAllowed, recordAiUsageLedger } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "tier2",
        airequestsperday: 50,
        aitokenspermonth: 250000,
        aicostusdpermonth: "40",
        featureflags: {
          premium_ai_limits: true,
          ai_chart_generation: true,
          ai_editorial_tools: true,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "5",
        monthlytokens: "1000",
        monthlycostusd: "2",
      })
      .mockResolvedValueOnce({ dailycostusd: "3" })
      .mockResolvedValueOnce({ monthlycostusd: "4" })
      .mockResolvedValueOnce({ monthlycostusd: "2" });

    const allowed = await assertAiUsageAllowed({
      userId: "user-1",
      featureKey: "ai_editorial_tools",
      estimatedInputTokens: 500,
      modelName: "gpt-4.1-mini",
    });

    expect(allowed.entitlement.planCode).toBe("tier2");

    await recordAiUsageLedger({
      userId: "user-1",
      conversationId: "conversation-1",
      messageId: "message-1",
      planCode: "tier2",
      featureKey: "ai_editorial_tools",
      modelName: "gpt-4.1-mini",
      inputTokens: 100,
      outputTokens: 200,
      estimatedCostUsd: 0.123,
      metadata: { route: "editorial" },
    });

    expect(sqlMock).toHaveBeenCalledOnce();
  });

  it("honors global AI budget caps", async () => {
    process.env.AI_DAILY_BUDGET_USD = "2";
    const { assertAiUsageAllowed } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "tier1",
        airequestsperday: 20,
        aitokenspermonth: 100000,
        aicostusdpermonth: "15",
        featureflags: {
          premium_ai_limits: true,
          ai_chart_generation: true,
          ai_editorial_tools: false,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "1",
        monthlytokens: "100",
        monthlycostusd: "1",
      })
      .mockResolvedValueOnce({ dailycostusd: "2" })
      .mockResolvedValueOnce({ monthlycostusd: "2" })
      .mockResolvedValueOnce({ monthlycostusd: "1" });

    await expect(
      assertAiUsageAllowed({
        userId: "user-1",
        featureKey: "ai_chat_basic",
        estimatedInputTokens: 10,
        modelName: "gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "AI_OVERLOADED", status: 503 });
  });

  it("allows requests again when the current day/month usage has reset", async () => {
    const { assertAiUsageAllowed } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "free",
        airequestsperday: 8,
        aitokenspermonth: 25000,
        aicostusdpermonth: "5",
        featureflags: {
          premium_ai_limits: false,
          ai_chart_generation: false,
          ai_editorial_tools: false,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "0",
        monthlytokens: "0",
        monthlycostusd: "0",
      })
      .mockResolvedValueOnce({ dailycostusd: "0" })
      .mockResolvedValueOnce({ monthlycostusd: "0" })
      .mockResolvedValueOnce({ monthlycostusd: "0" });

    const allowed = await assertAiUsageAllowed({
      userId: "user-1",
      featureKey: "ai_chat_basic",
      estimatedInputTokens: 100,
      modelName: "gpt-4.1-mini",
    });

    expect(allowed.entitlement.planCode).toBe("free");
  });

  it("honors per-model monthly budget caps", async () => {
    process.env.AI_MODEL_MONTHLY_BUDGETS_JSON = JSON.stringify({ "gpt-4.1-mini": 1 });
    const { assertAiUsageAllowed } = await import("@/lib/server/entitlements");
    sqlOneMock
      .mockResolvedValueOnce({
        userid: "user-1",
        plancode: "tier1",
        airequestsperday: 20,
        aitokenspermonth: 100000,
        aicostusdpermonth: "15",
        featureflags: {
          premium_ai_limits: true,
          ai_chart_generation: true,
          ai_editorial_tools: false,
        },
      })
      .mockResolvedValueOnce({
        dailyrequests: "1",
        monthlytokens: "100",
        monthlycostusd: "1",
      })
      .mockResolvedValueOnce({ dailycostusd: "0.5" })
      .mockResolvedValueOnce({ monthlycostusd: "0.5" })
      .mockResolvedValueOnce({ monthlycostusd: "1" });

    await expect(
      assertAiUsageAllowed({
        userId: "user-1",
        featureKey: "ai_chat_basic",
        estimatedInputTokens: 10,
        modelName: "gpt-4.1-mini",
      }),
    ).rejects.toMatchObject({ code: "AI_OVERLOADED", status: 503 });
  });
});
