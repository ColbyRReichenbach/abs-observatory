import { sql, sqlOne } from "@/lib/db";
import { AI_ERROR_CODES, AiPolicyError } from "./ai-policy";
import { getOwnerClerkUserId } from "./owner-admin";

export const AI_PLAN_CODES = ["free", "tier1", "tier2", "tier3"] as const;
export type AiPlanCode = (typeof AI_PLAN_CODES)[number];

export const AI_FEATURE_FLAGS = ["premium_ai_limits", "ai_chart_generation", "ai_editorial_tools"] as const;
export type AiFeatureFlag = (typeof AI_FEATURE_FLAGS)[number];

export const AI_USAGE_FEATURES = ["ai_chat_basic", "ai_chat_heavy", "ai_chart_generation", "ai_chart_followup", "ai_editorial_tools"] as const;
export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number];

export type AiEntitlement = {
  userId: string;
  planCode: AiPlanCode;
  aiRequestsPerDay: number;
  aiTokensPerMonth: number;
  aiCostUsdPerMonth: number;
  aiChartFollowupsPerWeek: number;
  featureFlags: Record<string, boolean>;
};

type AiUsageRollup = {
  dailyRequests: number;
  monthlyTokens: number;
  monthlyCostUsd: number;
  globalDailyCostUsd: number;
  globalMonthlyCostUsd: number;
  modelMonthlyCostUsd: number;
};

const PLAN_DEFAULTS: Record<AiPlanCode, Omit<AiEntitlement, "userId">> = {
  free: {
    planCode: "free",
    aiRequestsPerDay: 5,
    aiTokensPerMonth: 25_000,
    aiCostUsdPerMonth: 5,
    aiChartFollowupsPerWeek: 1,
    featureFlags: {
      premium_ai_limits: false,
      ai_chart_generation: false,
      ai_editorial_tools: false,
    },
  },
  tier1: {
    planCode: "tier1",
    aiRequestsPerDay: 20,
    aiTokensPerMonth: 100_000,
    aiCostUsdPerMonth: 15,
    aiChartFollowupsPerWeek: 5,
    featureFlags: {
      premium_ai_limits: true,
      ai_chart_generation: true,
      ai_editorial_tools: false,
    },
  },
  tier2: {
    planCode: "tier2",
    aiRequestsPerDay: 50,
    aiTokensPerMonth: 250_000,
    aiCostUsdPerMonth: 40,
    aiChartFollowupsPerWeek: 15,
    featureFlags: {
      premium_ai_limits: true,
      ai_chart_generation: true,
      ai_editorial_tools: true,
    },
  },
  tier3: {
    planCode: "tier3",
    aiRequestsPerDay: 150,
    aiTokensPerMonth: 1_000_000,
    aiCostUsdPerMonth: 120,
    aiChartFollowupsPerWeek: 50,
    featureFlags: {
      premium_ai_limits: true,
      ai_chart_generation: true,
      ai_editorial_tools: true,
    },
  },
};

function parseNumericEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw?.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBudgetMapEnv(name: string): Record<string, number> {
  const raw = process.env[name];
  if (!raw?.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, Number(value)])
        .filter(([, value]) => Number.isFinite(value)),
    );
  } catch {
    return {};
  }
}

function serializeEntitlement(row: {
  userid: string;
  plancode: AiPlanCode;
  airequestsperday: number;
  aitokenspermonth: number;
  aicostusdpermonth: number | string;
  featureflags: Record<string, boolean> | null;
}): AiEntitlement {
  const defaults = PLAN_DEFAULTS[row.plancode] ?? PLAN_DEFAULTS.free;

  return {
    userId: row.userid,
    planCode: row.plancode,
    aiRequestsPerDay: Number(row.airequestsperday),
    aiTokensPerMonth: Number(row.aitokenspermonth),
    aiCostUsdPerMonth: Number(row.aicostusdpermonth),
    aiChartFollowupsPerWeek: defaults.aiChartFollowupsPerWeek,
    featureFlags: {
      ...defaults.featureFlags,
      ...(row.featureflags ?? {}),
    },
  };
}

async function getOwnerEntitlementOverride(userId: string): Promise<AiEntitlement | null> {
  const ownerClerkUserId = getOwnerClerkUserId();
  if (!ownerClerkUserId) return null;

  const ownerRow = await sqlOne<{
    externalauthprovider: string;
    externalauthid: string;
  }>(
    `
    SELECT
      external_auth_provider AS externalAuthProvider,
      external_auth_id AS externalAuthId
    FROM product.users
    WHERE user_id = $1
    `,
    [userId],
  );

  if (!ownerRow || ownerRow.externalauthprovider !== "clerk" || ownerRow.externalauthid !== ownerClerkUserId) {
    return null;
  }

  const defaults = PLAN_DEFAULTS.tier3;
  return {
    userId,
    planCode: "tier3",
    aiRequestsPerDay: defaults.aiRequestsPerDay,
    aiTokensPerMonth: defaults.aiTokensPerMonth,
    aiCostUsdPerMonth: defaults.aiCostUsdPerMonth,
    aiChartFollowupsPerWeek: defaults.aiChartFollowupsPerWeek,
    featureFlags: {
      ...defaults.featureFlags,
    },
  };
}

export async function getOrCreateAiEntitlement(userId: string): Promise<AiEntitlement> {
  const ownerOverride = await getOwnerEntitlementOverride(userId);
  const existing = await sqlOne<{
    userid: string;
    plancode: AiPlanCode;
    airequestsperday: number;
    aitokenspermonth: number;
    aicostusdpermonth: number | string;
    featureflags: Record<string, boolean> | null;
  }>(
    `
    SELECT
      user_id AS userId,
      plan_code AS planCode,
      ai_requests_per_day AS aiRequestsPerDay,
      ai_tokens_per_month AS aiTokensPerMonth,
      ai_cost_usd_per_month AS aiCostUsdPerMonth,
      feature_flags AS featureFlags
    FROM ai.user_entitlements
    WHERE user_id = $1
    `,
    [userId],
  );

  if (existing) {
    if (!ownerOverride) {
      return serializeEntitlement(existing);
    }

    const current = serializeEntitlement(existing);
    if (
      current.planCode === ownerOverride.planCode &&
      current.aiRequestsPerDay === ownerOverride.aiRequestsPerDay &&
      current.aiTokensPerMonth === ownerOverride.aiTokensPerMonth &&
      current.aiCostUsdPerMonth === ownerOverride.aiCostUsdPerMonth &&
      JSON.stringify(current.featureFlags) === JSON.stringify(ownerOverride.featureFlags)
    ) {
      return current;
    }

    const upgraded = await sqlOne<{
      userid: string;
      plancode: AiPlanCode;
      airequestsperday: number;
      aitokenspermonth: number;
      aicostusdpermonth: number | string;
      featureflags: Record<string, boolean> | null;
    }>(
      `
      UPDATE ai.user_entitlements
      SET
        plan_code = $2,
        ai_requests_per_day = $3,
        ai_tokens_per_month = $4,
        ai_cost_usd_per_month = $5,
        feature_flags = $6
      WHERE user_id = $1
      RETURNING
        user_id AS userId,
        plan_code AS planCode,
        ai_requests_per_day AS aiRequestsPerDay,
        ai_tokens_per_month AS aiTokensPerMonth,
        ai_cost_usd_per_month AS aiCostUsdPerMonth,
        feature_flags AS featureFlags
      `,
      [
        userId,
        ownerOverride.planCode,
        ownerOverride.aiRequestsPerDay,
        ownerOverride.aiTokensPerMonth,
        ownerOverride.aiCostUsdPerMonth,
        JSON.stringify(ownerOverride.featureFlags),
      ],
    );

    if (!upgraded) {
      throw new Error("Failed to upgrade owner AI entitlement");
    }

    return serializeEntitlement(upgraded);
  }

  const defaults = ownerOverride ? PLAN_DEFAULTS.tier3 : PLAN_DEFAULTS.free;
  const inserted = await sqlOne<{
    userid: string;
    plancode: AiPlanCode;
    airequestsperday: number;
    aitokenspermonth: number;
    aicostusdpermonth: number | string;
    featureflags: Record<string, boolean> | null;
  }>(
    `
    INSERT INTO ai.user_entitlements (
      user_id,
      plan_code,
      ai_requests_per_day,
      ai_tokens_per_month,
      ai_cost_usd_per_month,
      feature_flags
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE
    SET user_id = EXCLUDED.user_id
    RETURNING
      user_id AS userId,
      plan_code AS planCode,
      ai_requests_per_day AS aiRequestsPerDay,
      ai_tokens_per_month AS aiTokensPerMonth,
      ai_cost_usd_per_month AS aiCostUsdPerMonth,
      feature_flags AS featureFlags
    `,
    [
      userId,
      defaults.planCode,
      defaults.aiRequestsPerDay,
      defaults.aiTokensPerMonth,
      defaults.aiCostUsdPerMonth,
      JSON.stringify(defaults.featureFlags),
    ],
  );

  if (!inserted) {
    throw new Error("Failed to provision AI entitlement");
  }

  return serializeEntitlement(inserted);
}

async function getUsageRollup(userId: string, modelName: string): Promise<AiUsageRollup> {
  const [userUsage, globalDaily, globalMonthly, modelMonthly] = await Promise.all([
    sqlOne<{
      dailyrequests: string;
      monthlytokens: string;
      monthlycostusd: string;
    }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN usage_day = CURRENT_DATE THEN request_count ELSE 0 END), 0)::text AS dailyRequests,
        COALESCE(SUM(CASE WHEN usage_month = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date THEN total_tokens ELSE 0 END), 0)::text AS monthlyTokens,
        COALESCE(SUM(CASE WHEN usage_month = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date THEN estimated_cost_usd ELSE 0 END), 0)::text AS monthlyCostUsd
      FROM ai.usage_ledger
      WHERE user_id = $1
      `,
      [userId],
    ),
    sqlOne<{ dailycostusd: string }>(
      `
      SELECT COALESCE(SUM(estimated_cost_usd), 0)::text AS dailyCostUsd
      FROM ai.usage_ledger
      WHERE usage_day = CURRENT_DATE
      `,
    ),
    sqlOne<{ monthlycostusd: string }>(
      `
      SELECT COALESCE(SUM(estimated_cost_usd), 0)::text AS monthlyCostUsd
      FROM ai.usage_ledger
      WHERE usage_month = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      `,
    ),
    sqlOne<{ monthlycostusd: string }>(
      `
      SELECT COALESCE(SUM(estimated_cost_usd), 0)::text AS monthlyCostUsd
      FROM ai.usage_ledger
      WHERE usage_month = DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
        AND model_name = $1
      `,
      [modelName],
    ),
  ]);

  return {
    dailyRequests: Number(userUsage?.dailyrequests ?? 0),
    monthlyTokens: Number(userUsage?.monthlytokens ?? 0),
    monthlyCostUsd: Number(userUsage?.monthlycostusd ?? 0),
    globalDailyCostUsd: Number(globalDaily?.dailycostusd ?? 0),
    globalMonthlyCostUsd: Number(globalMonthly?.monthlycostusd ?? 0),
    modelMonthlyCostUsd: Number(modelMonthly?.monthlycostusd ?? 0),
  };
}

async function getFeatureUsageCount(params: {
  userId: string;
  featureKey: AiUsageFeature;
  windowDays: number;
}): Promise<number> {
  const row = await sqlOne<{ requestcount: string }>(
    `
    SELECT COALESCE(SUM(request_count), 0)::text AS requestCount
    FROM ai.usage_ledger
    WHERE user_id = $1
      AND feature_key = $2
      AND created_at >= NOW() - ($3::text || ' days')::interval
    `,
    [params.userId, params.featureKey, params.windowDays],
  );

  return Number(row?.requestcount ?? 0);
}

export function isFeatureEnabled(entitlement: AiEntitlement, flag: AiFeatureFlag): boolean {
  return Boolean(entitlement.featureFlags[flag]);
}

export async function assertAiUsageAllowed(params: {
  userId: string;
  featureKey: AiUsageFeature;
  estimatedInputTokens: number;
  modelName: string;
}) {
  const entitlement = await getOrCreateAiEntitlement(params.userId);
  const usage = await getUsageRollup(params.userId, params.modelName);

  if (params.featureKey === "ai_chart_generation" && !isFeatureEnabled(entitlement, "ai_chart_generation")) {
    throw new AiPolicyError("Current plan does not allow chart generation", AI_ERROR_CODES.PLAN_RESTRICTED, 403);
  }

  if (params.featureKey === "ai_editorial_tools" && !isFeatureEnabled(entitlement, "ai_editorial_tools")) {
    throw new AiPolicyError("Current plan does not allow editorial tools", AI_ERROR_CODES.PLAN_RESTRICTED, 403);
  }

  if (params.featureKey === "ai_chart_followup") {
    const weeklyChartFollowups = await getFeatureUsageCount({
      userId: params.userId,
      featureKey: "ai_chart_followup",
      windowDays: 7,
    });

    if (weeklyChartFollowups >= entitlement.aiChartFollowupsPerWeek) {
      throw new AiPolicyError("Weekly chart insight follow-up allowance exceeded", AI_ERROR_CODES.QUOTA_EXCEEDED, 429);
    }
  }

  if (usage.dailyRequests >= entitlement.aiRequestsPerDay) {
    throw new AiPolicyError("Daily copilot allowance exceeded", AI_ERROR_CODES.QUOTA_EXCEEDED, 429);
  }

  if (usage.monthlyTokens + params.estimatedInputTokens > entitlement.aiTokensPerMonth) {
    throw new AiPolicyError("Monthly AI token allowance exceeded", AI_ERROR_CODES.QUOTA_EXCEEDED, 429);
  }

  if (usage.monthlyCostUsd >= entitlement.aiCostUsdPerMonth) {
    throw new AiPolicyError("Monthly AI budget exceeded", AI_ERROR_CODES.QUOTA_EXCEEDED, 429);
  }

  const globalDailyBudget = parseNumericEnv("AI_DAILY_BUDGET_USD");
  if (globalDailyBudget !== null && usage.globalDailyCostUsd >= globalDailyBudget) {
    throw new AiPolicyError("Global AI daily budget exceeded", AI_ERROR_CODES.OVERLOADED, 503);
  }

  const globalMonthlyBudget = parseNumericEnv("AI_MONTHLY_BUDGET_USD");
  if (globalMonthlyBudget !== null && usage.globalMonthlyCostUsd >= globalMonthlyBudget) {
    throw new AiPolicyError("Global AI monthly budget exceeded", AI_ERROR_CODES.OVERLOADED, 503);
  }

  const modelBudgets = parseBudgetMapEnv("AI_MODEL_MONTHLY_BUDGETS_JSON");
  const modelMonthlyBudget = modelBudgets[params.modelName];
  if (modelMonthlyBudget !== undefined && usage.modelMonthlyCostUsd >= modelMonthlyBudget) {
    throw new AiPolicyError("Model-specific AI budget exceeded", AI_ERROR_CODES.OVERLOADED, 503);
  }

  return { entitlement, usage };
}

export async function recordAiUsageLedger(params: {
  userId: string;
  conversationId: string;
  messageId: string | null;
  planCode: AiPlanCode;
  featureKey: AiUsageFeature;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  metadata?: unknown;
}) {
  await sql(
    `
    INSERT INTO ai.usage_ledger (
      user_id,
      conversation_id,
      message_id,
      plan_code,
      feature_key,
      model_name,
      request_count,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost_usd,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11)
    `,
    [
      params.userId,
      params.conversationId,
      params.messageId,
      params.planCode,
      params.featureKey,
      params.modelName,
      params.inputTokens,
      params.outputTokens,
      params.inputTokens + params.outputTokens,
      params.estimatedCostUsd,
      params.metadata === undefined ? null : JSON.stringify(params.metadata),
    ],
  );
}
