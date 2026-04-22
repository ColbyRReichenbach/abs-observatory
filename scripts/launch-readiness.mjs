const baseUrl = process.env.APP_URL ?? process.argv[2];
const timeoutMs = Number(process.env.LAUNCH_TIMEOUT_MS ?? 45_000);
const freshnessMaxAgeMinutes = Number(process.env.FRESHNESS_MAX_AGE_MINUTES ?? 90);
const authCookie = process.env.LAUNCH_AUTH_COOKIE ?? "";
const teamPath = process.env.LAUNCH_TEAM_PATH ?? "/teams/138?view=fan";
const visualizerMessage =
  process.env.LAUNCH_VISUALIZER_MESSAGE ?? "Compare overturn rate by count state for this team.";

if (!baseUrl) {
  console.error("Usage: APP_URL=https://your-app.example.com npm run qa:launch");
  process.exit(1);
}

let failures = 0;
let skips = 0;

function logPass(message) {
  console.log(`PASS ${message}`);
}

function logFail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function logSkip(message) {
  skips += 1;
  console.log(`SKIP ${message}`);
}

function extractCookie(setCookieHeaders, name) {
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : setCookieHeaders ? [setCookieHeaders] : [];
  for (const raw of cookies) {
    const [pair] = String(raw).split(";");
    const [cookieName, cookieValue] = pair.split("=");
    if (cookieName?.trim() === name) {
      return cookieValue?.trim() ?? null;
    }
  }
  return null;
}

function getSetCookieHeaders(response) {
  const headers = [];
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  if (single) headers.push(single);
  return headers;
}

async function fetchResponse(path, { method = "GET", headers = {}, body } = {}) {
  const startedAt = Date.now();
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  console.log(`${method} ${path} -> ${response.status} ${Date.now() - startedAt}ms`);
  return response;
}

async function fetchJson(path, options) {
  const response = await fetchResponse(path, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text };
}

async function getCsrfToken(extraCookie = "") {
  const response = await fetchResponse("/", {
    headers: extraCookie ? { cookie: extraCookie } : {},
  });
  const token = extractCookie(getSetCookieHeaders(response), "aibs_csrf");
  if (!token) {
    throw new Error("Unable to obtain aibs_csrf cookie");
  }
  return token;
}

async function runPublicChecks() {
  const health = await fetchJson("/api/health");
  if (health.response.ok && health.json?.ok === true) {
    logPass("/api/health ok");
  } else {
    logFail(`/api/health returned ${health.response.status}`);
  }

  const freshness = await fetchJson("/api/data-freshness");
  if (!freshness.response.ok || !freshness.json) {
    logFail(`/api/data-freshness returned ${freshness.response.status}`);
  } else {
    const snapshot = freshness.json;
    const ageMinutes =
      snapshot.lastFinishedAt ? (Date.now() - Date.parse(snapshot.lastFinishedAt)) / 60_000 : Number.POSITIVE_INFINITY;
    if (snapshot.lastStatus !== "success") {
      logFail(`data freshness status is ${snapshot.lastStatus}`);
    } else if (!Number.isFinite(ageMinutes) || ageMinutes > freshnessMaxAgeMinutes) {
      logFail(`data freshness is stale (${Math.round(ageMinutes)} min old, max ${freshnessMaxAgeMinutes})`);
    } else {
      logPass(`data freshness within threshold (${Math.round(ageMinutes)} min old)`);
    }
  }

  for (const path of ["/", "/login?next=/profile", "/sign-in?next=/profile", "/sign-up?next=/profile", "/teams", "/umpires", teamPath]) {
    const response = await fetchResponse(path);
    if (response.status === 200) {
      logPass(`${path} reachable`);
    } else {
      logFail(`${path} returned ${response.status}`);
    }
  }
}

async function runAuthenticatedChecks() {
  if (!authCookie) {
    logSkip("authenticated launch checks (set LAUNCH_AUTH_COOKIE to enable)");
    return;
  }

  const csrfToken = await getCsrfToken(authCookie);

  const me = await fetchJson("/api/me", {
    headers: {
      cookie: authCookie,
    },
  });

  if (!me.response.ok || !me.json?.authenticated) {
    logFail(`/api/me did not return an authenticated viewer`);
    return;
  }
  logPass(`/api/me authenticated`);

  const entitlementPlan = me.json?.entitlements?.planCode ?? me.json?.entitlements?.plan_code ?? null;
  if (entitlementPlan) {
    logPass(`viewer plan detected (${entitlementPlan})`);
  }

  const visualizer = await fetchJson("/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
      cookie: authCookie,
    },
    body: JSON.stringify({
      message: visualizerMessage,
      surface: "visualizer",
      context: {
        scope: "team",
        entityId: "138",
        range: "season",
      },
    }),
  });

  if (!visualizer.response.ok || !visualizer.json?.structuredPlan) {
    logFail(`visualizer did not return a structured plan`);
    return;
  }

  const plan = visualizer.json.structuredPlan;
  const dataPoints = Array.isArray(plan.dataPoints) ? plan.dataPoints : [];
  if (dataPoints.length === 0) {
    logFail(`visualizer returned no data points`);
    return;
  }
  logPass(`visualizer returned ${dataPoints.length} real data points`);

  const artifact = await fetchJson("/api/ai/artifacts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
      cookie: authCookie,
    },
    body: JSON.stringify({
      surfaceKey: "visualizer",
      surfaceDetail: "team_chart_builder",
      targetType: "visualizer_chart",
      targetId: visualizer.json.generationId ?? crypto.randomUUID(),
      routeScope: "/teams/138",
      routeEntityId: "138",
      title: plan.chartTitle,
      summary: plan.highlight,
      artifactPayload: {
        structuredPlan: plan,
        citations: visualizer.json.citations ?? [],
        query: visualizerMessage,
        contextLabel: "team:138",
      },
      metadata: {
        publicShare: true,
        chartType: plan.chartType,
        sourceRoute: "/teams/138",
      },
    }),
  });

  const artifactId = artifact.json?.artifactId ?? null;
  if (!artifact.response.ok || !artifactId) {
    logFail(`visualizer artifact registration failed`);
    return;
  }
  logPass(`visualizer artifact registered`);

  const shareResponse = await fetchResponse(`/v/${artifactId}`);
  if (shareResponse.status === 200) {
    logPass(`shared chart page reachable`);
  } else {
    logFail(`shared chart page returned ${shareResponse.status}`);
  }

  const ogResponse = await fetchResponse(`/api/viz-og/${artifactId}`);
  if (ogResponse.status === 200 && (ogResponse.headers.get("content-type") ?? "").includes("image/png")) {
    logPass(`shared chart OG image reachable`);
  } else {
    logFail(`shared chart OG image returned ${ogResponse.status}`);
  }
}

async function main() {
  console.log(`Running launch readiness checks against ${baseUrl}`);
  await runPublicChecks();
  await runAuthenticatedChecks();

  if (failures > 0) {
    console.error(`Launch readiness failed with ${failures} failure(s) and ${skips} skipped check(s).`);
    process.exit(1);
  }

  console.log(`Launch readiness passed with ${skips} skipped check(s).`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Launch readiness failed: ${message}`);
  process.exit(1);
});
