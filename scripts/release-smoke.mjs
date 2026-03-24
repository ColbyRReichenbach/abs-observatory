const baseUrl = process.env.APP_URL ?? process.argv[2];
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000);

if (!baseUrl) {
  console.error("Usage: APP_URL=https://your-app.example.com npm run smoke:release");
  process.exit(1);
}

async function fetchResponse(path, headers) {
  const startedAt = Date.now();
  console.log(`CHECK ${path}`);
  const response = await fetch(new URL(path, baseUrl), {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  console.log(`DONE ${path} ${response.status} ${Date.now() - startedAt}ms`);
  return response;
}

async function discoverRepresentativePaths() {
  const articlesResponse = await fetchResponse("/api/articles?limit=1");
  const articlesPayload = articlesResponse.ok ? await articlesResponse.json() : { articles: [] };
  const hasPublishedArticles = Array.isArray(articlesPayload.articles) && articlesPayload.articles.length > 0;
  const firstArticleSlug = hasPublishedArticles ? articlesPayload.articles[0]?.slug ?? null : null;

  const paths = {
    teamPath: process.env.SMOKE_TEAM_PATH ?? "/teams/138?range=season",
    umpirePath: process.env.SMOKE_UMPIRE_PATH ?? "/umpires/690896?range=season",
    gamePath: process.env.SMOKE_GAME_PATH ?? "/game/831945",
    articlePath:
      process.env.SMOKE_ARTICLE_PATH ??
      (firstArticleSlug ? `/articles/${firstArticleSlug}` : null),
    aboutPath: process.env.SMOKE_ABOUT_PATH ?? "/about/about-aibs",
  };

  console.log("Representative paths", { ...paths, hasPublishedArticles });
  return { ...paths, hasPublishedArticles };
}

function createChecks(representativePaths) {
  const checks = [
    { path: "/api/health", expected: [200] },
    { path: "/", expected: [200] },
    { path: "/teams", expected: [200] },
    { path: "/umpires", expected: [200] },
    { path: "/articles", expected: [200] },
    { path: "/about", expected: [200] },
  ];

  for (const [label, path] of Object.entries(representativePaths)) {
    if (label === "hasPublishedArticles") continue;
    if (!path) {
      const optional = label === "articlePath" && !representativePaths.hasPublishedArticles;
      checks.push({ path: `__missing__:${label}`, expected: [], optional });
      continue;
    }
    checks.push({ path, expected: [200] });
  }

  if (process.env.SMOKE_ADMIN_PATH && process.env.SMOKE_ADMIN_COOKIE) {
    checks.push({
      path: process.env.SMOKE_ADMIN_PATH,
      expected: [200],
      headers: { cookie: process.env.SMOKE_ADMIN_COOKIE },
    });
  }

  return checks;
}

const representativePaths = await discoverRepresentativePaths();
const checks = createChecks(representativePaths);

let failures = 0;

for (const check of checks) {
  if (check.path.startsWith("__missing__:")) {
    const label = check.path.replace("__missing__:", "");
    if (check.optional) {
      console.log(`SKIP missing representative path for ${label}`);
      continue;
    }
    failures += 1;
    console.error(`FAIL missing representative path for ${label}`);
    continue;
  }

  const response = await fetchResponse(check.path, check.headers);
  const pass = check.expected.includes(response.status);
  const label = `${response.status} ${check.path}`;
  if (pass) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label} (expected ${check.expected.join(", ")})`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log("Release smoke checks passed.");
