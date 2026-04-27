import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

const baseUrl = process.env.APP_URL ?? process.argv[2];
const storageStatePath = process.env.LAUNCH_STORAGE_STATE ?? ".tmp/launch-auth.json";
const outputPath =
  process.env.AI_SWEEP_OUTPUT ??
  path.join(process.cwd(), ".tmp", `ai-prompt-sweep-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const timeoutMs = Number(process.env.AI_SWEEP_TIMEOUT_MS ?? 60_000);
const maxRequestsPerMinute = Number(process.env.AI_SWEEP_MAX_REQUESTS_PER_MINUTE ?? 7);

if (!baseUrl) {
  console.error("Usage: APP_URL=https://your-app.example.com npm run qa:ai-sweep");
  process.exit(1);
}

if (!fs.existsSync(storageStatePath)) {
  console.error(`Missing storage state file: ${storageStatePath}`);
  console.error("Run npm run qa:launch:capture-auth first.");
  process.exit(1);
}

const TEAM_TOOLS = new Set([
  "get_team_summary",
  "get_team_trend",
  "get_team_inning_efficiency",
  "get_team_side_splits",
  "get_team_aggression",
  "get_team_challenge_scenario_matrix",
  "get_team_challenge_value_summary",
  "get_team_decision_value_report",
]);

const UMPIRE_TOOLS = new Set(["get_umpire_summary", "get_umpire_profile"]);
const GLOBAL_TOOLS = new Set(["get_live_games", "get_home_challenge_moments"]);

const VISUALIZER_CASES = [
  {
    id: "visualizer-team-count-state-bar-specified",
    prompt: "Build a bar chart of overturn rate by count state.",
    context: { scope: "team", entityId: "138", range: "season" },
    expectedChartType: "bar_chart",
    minDataPoints: 3,
    allowedTools: TEAM_TOOLS,
    forbiddenTools: GLOBAL_TOOLS,
  },
  {
    id: "visualizer-team-count-state-unspecified",
    prompt: "Compare overturn rate by count state.",
    context: { scope: "team", entityId: "138", range: "season" },
    expectedChartType: "bar_chart",
    minDataPoints: 3,
    allowedTools: TEAM_TOOLS,
    forbiddenTools: GLOBAL_TOOLS,
  },
  {
    id: "visualizer-team-offense-defense-heatmap",
    prompt: "Show a heatmap of offense vs defense challenge results by inning.",
    context: { scope: "team", entityId: "138", range: "season" },
    expectedChartType: "heatmap",
    minDataPoints: 4,
    allowedTools: TEAM_TOOLS,
    forbiddenTools: GLOBAL_TOOLS,
  },
  {
    id: "visualizer-team-inning-traffic-unspecified",
    prompt: "How does challenge traffic move across innings?",
    context: { scope: "team", entityId: "138", range: "season" },
    expectedChartType: "line_chart",
    minDataPoints: 3,
    allowedTools: TEAM_TOOLS,
    forbiddenTools: GLOBAL_TOOLS,
  },
];

const COPILOT_CASES = [
  {
    id: "copilot-team-fan-current-story",
    prompt: "What matters most about the Cardinals' challenge profile right now?",
    context: { scope: "team", entityId: "138", range: "season" },
    allowedTools: TEAM_TOOLS,
  },
  {
    id: "copilot-team-org-decision-value",
    prompt: "Where is modeled challenge value leaking for this club?",
    context: { scope: "team", entityId: "138", range: "season" },
    allowedTools: TEAM_TOOLS,
  },
  {
    id: "copilot-umpire-org-risk",
    prompt: "Where is this umpire creating the biggest review risk?",
    context: { scope: "umpire", entityId: "690896", range: "season" },
    allowedTools: UMPIRE_TOOLS,
  },
  {
    id: "copilot-global-moments",
    prompt: "Which live games or recent challenge moments matter most right now?",
    context: { scope: "global", range: "7d" },
    allowedTools: GLOBAL_TOOLS,
  },
];

const CHART_CONTEXTS = {
  inventory: {
    chartType: "team_inventory_deployment",
    chartKey: "team-inventory-deployment",
    chartTitle: "Usage vs Modeled Value Share",
    baseballQuestion: "Where is challenge value showing up by inning phase?",
    chartSummary: "Late innings are carrying a disproportionate share of modeled challenge value.",
    payload: {
      buckets: [
        { inningBucket: "1-3", reviewShare: 0.18, valueShare: 0.1 },
        { inningBucket: "4-6", reviewShare: 0.24, valueShare: 0.19 },
        { inningBucket: "7-9", reviewShare: 0.31, valueShare: 0.47 },
      ],
    },
  },
  heatmap: {
    chartType: "team_efficiency_heatmap",
    chartKey: "team-efficiency-heatmap",
    chartTitle: "Offensive vs Defensive Review Results by Inning",
    baseballQuestion: "Where are offensive and defensive challenges converting by inning?",
    chartSummary: "Offensive challenges are converting best early, while defensive challenges carry more volatility late.",
    payload: {
      buckets: [
        { inning: 1, side: "offense", overturnRate: 1.0 },
        { inning: 1, side: "defense", overturnRate: 0.83 },
        { inning: 7, side: "offense", overturnRate: 0.67 },
        { inning: 7, side: "defense", overturnRate: 0.71 },
      ],
    },
  },
};

const CHART_INSIGHT_CASES = [
  {
    id: "chart-insight-org-inventory-initial",
    prompt: "What does this say about deployment discipline?",
    chartContext: CHART_CONTEXTS.inventory,
  },
  {
    id: "chart-insight-fan-heatmap-initial",
    prompt: "What jumps out here for a fan?",
    chartContext: CHART_CONTEXTS.heatmap,
  },
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function normalizeAnswer(answer) {
  return String(answer ?? "").trim().toLowerCase();
}

function ensureStructuredSuccess(result, surface) {
  assert(result.status === 200, `${surface} returned ${result.status}`);
  assert(result.json?.safetyDisposition !== "blocked", `${surface} was safety-blocked`);
  assert(!result.json?.error, `${surface} returned error: ${result.json.error}`);
}

async function callAi(page, body) {
  return page.evaluate(async (requestBody) => {
    let csrfToken =
      document.cookie
        .split("; ")
        .find((entry) => entry.startsWith("aibs_csrf="))
        ?.split("=")[1] ?? "";
    if (!csrfToken) {
      const csrfResponse = await fetch("/api/csrf", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const csrfBody = await csrfResponse.json().catch(() => null);
      csrfToken = csrfBody?.csrfToken ?? "";
    }
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(requestBody),
    });
    return {
      status: response.status,
      json: await response.json(),
    };
  }, body);
}

const requestTimestamps = [];

async function respectRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] >= 60_000) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length < maxRequestsPerMinute) {
    return;
  }

  const waitMs = Math.max(60_000 - (now - requestTimestamps[0]) + 250, 250);
  console.log(`Rate-limit pause: waiting ${Math.ceil(waitMs / 1000)}s before next AI request...`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const refreshedNow = Date.now();
  while (requestTimestamps.length > 0 && refreshedNow - requestTimestamps[0] >= 60_000) {
    requestTimestamps.shift();
  }
}

async function callAiWithPacing(page, body) {
  await respectRateLimit();
  const result = await callAi(page, body);
  requestTimestamps.push(Date.now());
  return result;
}

function summarizeResponse(result) {
  return {
    status: result.status,
    conversationId: result.json?.conversationId ?? null,
    citations: result.json?.citations ?? [],
    toolNames: (result.json?.toolResults ?? []).map((tool) => tool.toolName),
    chartType: result.json?.structuredPlan?.chartType ?? null,
    dataPoints: result.json?.structuredPlan?.dataPoints?.length ?? 0,
    headline: result.json?.structuredInsight?.headline ?? null,
    answerPreview: String(result.json?.answer ?? "").slice(0, 220),
  };
}

async function runSweep() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    storageState: storageStatePath,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const results = [];
  let failures = 0;
  let followUpConversationId = null;

  try {
    await page.goto(new URL("/profile", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});

    if (page.url().includes("/sign-in")) {
      fail("Authenticated sweep redirected to sign-in. Refresh auth storage state.");
    }

    for (const testCase of VISUALIZER_CASES) {
      try {
        const result = await callAiWithPacing(page, {
          message: testCase.prompt,
          delivery: "sync",
          surface: "visualizer",
          context: testCase.context,
        });
        ensureStructuredSuccess(result, testCase.id);
        assert(result.json?.structuredPlan, `${testCase.id} missing structuredPlan`);
        assert(result.json.structuredPlan.chartType === testCase.expectedChartType, `${testCase.id} returned ${result.json.structuredPlan.chartType} instead of ${testCase.expectedChartType}`);
        assert((result.json.structuredPlan.dataPoints ?? []).length >= testCase.minDataPoints, `${testCase.id} returned too few data points`);
        assert((result.json.citations ?? []).length > 0, `${testCase.id} returned no citations`);
        assert((result.json.toolResults ?? []).length > 0, `${testCase.id} returned no tool results`);
        for (const citation of result.json.citations ?? []) {
          assert(testCase.allowedTools.has(citation), `${testCase.id} cited unexpected tool ${citation}`);
        }
        for (const forbidden of testCase.forbiddenTools) {
          assert(!(result.json.citations ?? []).includes(forbidden), `${testCase.id} leaked forbidden tool ${forbidden}`);
        }
        results.push({ id: testCase.id, ok: true, surface: "visualizer", ...summarizeResponse(result) });
      } catch (error) {
        failures += 1;
        results.push({ id: testCase.id, ok: false, surface: "visualizer", error: error instanceof Error ? error.message : String(error) });
      }
    }

    for (const testCase of COPILOT_CASES) {
      try {
        const result = await callAiWithPacing(page, {
          message: testCase.prompt,
          delivery: "sync",
          surface: "copilot",
          context: testCase.context,
        });
        ensureStructuredSuccess(result, testCase.id);
        assert(normalizeAnswer(result.json?.answer).length >= 40, `${testCase.id} answer too short`);
        assert(!normalizeAnswer(result.json?.answer).includes("unavailable"), `${testCase.id} fell back to unavailable response`);
        assert((result.json.citations ?? []).length > 0, `${testCase.id} returned no citations`);
        assert((result.json.toolResults ?? []).length > 0, `${testCase.id} returned no tool results`);
        for (const citation of result.json.citations ?? []) {
          assert(testCase.allowedTools.has(citation), `${testCase.id} cited unexpected tool ${citation}`);
        }
        results.push({ id: testCase.id, ok: true, surface: "copilot", ...summarizeResponse(result) });
      } catch (error) {
        failures += 1;
        results.push({ id: testCase.id, ok: false, surface: "copilot", error: error instanceof Error ? error.message : String(error) });
      }
    }

    for (const testCase of CHART_INSIGHT_CASES) {
      try {
        const result = await callAiWithPacing(page, {
          message: testCase.prompt,
          delivery: "sync",
          surface: "chart_insight",
          chartContext: testCase.chartContext,
        });
        ensureStructuredSuccess(result, testCase.id);
        assert(result.json?.structuredInsight, `${testCase.id} missing structuredInsight`);
        assert((result.json.structuredInsight.sections ?? []).length >= 2, `${testCase.id} returned too few chart insight sections`);
        assert((result.json.citations ?? []).length === 1, `${testCase.id} returned unexpected citations`);
        assert(result.json.citations?.[0] === testCase.chartContext.chartType, `${testCase.id} cited wrong chart type`);
        assert((result.json.toolResults ?? []).length === 1, `${testCase.id} returned unexpected tool result count`);
        results.push({ id: testCase.id, ok: true, surface: "chart_insight", ...summarizeResponse(result) });
        if (testCase.id === "chart-insight-org-inventory-initial") {
          followUpConversationId = result.json?.conversationId ?? null;
        }
      } catch (error) {
        failures += 1;
        results.push({ id: testCase.id, ok: false, surface: "chart_insight", error: error instanceof Error ? error.message : String(error) });
      }
    }

    try {
      assert(followUpConversationId, "chart-insight follow-up missing conversationId");
      const followUp = await callAiWithPacing(page, {
        message: "What should a coaching staff do next?",
        delivery: "sync",
        surface: "chart_insight",
        conversationId: followUpConversationId,
        chartContext: CHART_CONTEXTS.inventory,
      });
      ensureStructuredSuccess(followUp, "chart-insight-org-follow-up");
      assert(followUp.json?.conversationId === followUpConversationId, "chart-insight follow-up changed conversationId");
      assert(followUp.json?.structuredInsight, "chart-insight follow-up missing structuredInsight");
      assert((followUp.json.structuredInsight.sections ?? []).length >= 2, "chart-insight follow-up returned too few sections");
      results.push({ id: "chart-insight-org-follow-up", ok: true, surface: "chart_insight", ...summarizeResponse(followUp) });
    } catch (error) {
      failures += 1;
      results.push({ id: "chart-insight-org-follow-up", ok: false, surface: "chart_insight", error: error instanceof Error ? error.message : String(error) });
    }
  } finally {
    await page.close();
    await browser.close();
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        appUrl: baseUrl,
        storageStatePath,
        generatedAt: new Date().toISOString(),
        total: results.length,
        failures,
        results,
      },
      null,
      2,
    ),
  );

  for (const result of results) {
    if (result.ok) {
      console.log(`PASS ${result.id}`);
    } else {
      console.error(`FAIL ${result.id}: ${result.error}`);
    }
  }

  console.log(`Saved AI prompt sweep results to ${outputPath}`);

  if (failures > 0) {
    console.error(`AI prompt sweep failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log(`AI prompt sweep passed (${results.length} cases).`);
}

runSweep().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
