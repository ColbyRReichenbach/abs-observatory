import { chromium } from "playwright";

const baseUrl = process.env.APP_URL ?? process.argv[2];
const authCookie = process.env.LAUNCH_AUTH_COOKIE ?? "";
const storageStatePath = process.env.LAUNCH_STORAGE_STATE ?? "";
const artifactId = process.env.LAUNCH_ARTIFACT_ID ?? "";
const timeoutMs = Number(process.env.LAUNCH_BROWSER_TIMEOUT_MS ?? 45_000);

if (!baseUrl) {
  console.error("Usage: APP_URL=https://your-app.example.com npm run qa:launch:browser");
  process.exit(1);
}

const routeChecks = [
  {
    path: "/",
    name: "home",
    expectText: ["ABS Observatory", "Live Feed"],
  },
  {
    path: "/login?next=/profile",
    name: "login",
    expectText: [],
  },
  {
    path: "/sign-in?next=/profile",
    name: "sign-in",
    expectText: [],
  },
  {
    path: "/sign-up?next=/profile",
    name: "sign-up",
    expectText: [],
  },
  {
    path: "/teams",
    name: "teams",
    expectText: ["Team Stats"],
  },
  {
    path: "/umpires",
    name: "umpires",
    expectText: ["Umpire Stats"],
  },
  {
    path: "/teams/138?view=fan",
    name: "team-fan",
    expectText: ["St. Louis Cardinals"],
  },
  {
    path: "/teams/138?view=org",
    name: "team-org",
    expectText: ["St. Louis Cardinals"],
  },
  {
    path: "/umpires/690896?view=fan",
    name: "umpire-fan",
    expectText: ["Umpire"],
  },
  {
    path: "/umpires/690896?view=org",
    name: "umpire-org",
    expectText: ["Umpire"],
  },
];

if (artifactId) {
  routeChecks.push({
    path: `/v/${artifactId}`,
    name: "shared-chart",
    expectText: ["Made in AiBS"],
  });
}

let failures = 0;

function logPass(message) {
  console.log(`PASS ${message}`);
}

function logFail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function isIgnorableConsole(message) {
  return (
    message.includes("Clerk has been loaded with development keys") ||
    message.includes("preloaded using link preload but not used") ||
    message.includes("Failed to load resource: the server responded with a status of 404")
  );
}

async function verifyRoute(context, check) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleMessages.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    const response = await page.goto(new URL(check.path, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});

    if (!response || response.status() >= 400) {
      logFail(`${check.name} returned ${response?.status() ?? "no response"}`);
      return;
    }

    for (const expected of check.expectText) {
      const bodyText = await page.textContent("body");
      if (!bodyText?.includes(expected)) {
        logFail(`${check.name} missing text "${expected}"`);
        return;
      }
    }

    const blockingConsole = consoleMessages.filter((message) => !isIgnorableConsole(message));
    if (blockingConsole.length > 0) {
      logFail(`${check.name} console errors: ${blockingConsole.join(" | ")}`);
      return;
    }

    if (pageErrors.length > 0) {
      logFail(`${check.name} page errors: ${pageErrors.join(" | ")}`);
      return;
    }

    logPass(`${check.name}`);
  } catch (error) {
    logFail(`${check.name} threw ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

async function verifyAuthedTeamPage(context) {
  if (!authCookie && !storageStatePath) {
    console.log("SKIP authenticated browser checks (set LAUNCH_STORAGE_STATE or LAUNCH_AUTH_COOKIE to enable)");
    return;
  }

  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleMessages.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    const response = await page.goto(new URL("/profile", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});

    if (!response || response.status() >= 400) {
      logFail(`authenticated profile page returned ${response?.status() ?? "no response"}`);
      return;
    }

    if (page.url().includes("/sign-in")) {
      logFail("authenticated profile page redirected to sign-in");
      return;
    }

    const bodyText = await page.textContent("body");
    if (!bodyText?.includes("Your Library")) {
      logFail("authenticated profile page missing profile library");
      return;
    }

    const me = await page.evaluate(async () => {
      const response = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      return {
        status: response.status,
        json: await response.json(),
      };
    });

    if (me.status !== 200 || !me.json?.authenticated) {
      logFail(`/api/me not authenticated in browser session`);
      return;
    }

    const teamPage = await context.newPage();
    const teamConsoleMessages = [];
    const teamPageErrors = [];

    teamPage.on("console", (msg) => {
      if (msg.type() === "error") {
        teamConsoleMessages.push(msg.text());
      }
    });
    teamPage.on("pageerror", (error) => {
      teamPageErrors.push(error.message);
    });

    try {
      const teamResponse = await teamPage.goto(new URL("/teams/138?view=fan", baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await teamPage.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});

      if (!teamResponse || teamResponse.status() >= 400) {
        logFail(`authenticated team page returned ${teamResponse?.status() ?? "no response"}`);
        return;
      }

      const teamBodyText = await teamPage.textContent("body");
      const hasVisualizer =
        teamBodyText?.includes("Build a custom chart from AiBS data") ||
        teamBodyText?.includes("Build a strategy chart from AiBS data");

      if (!hasVisualizer) {
        logFail("authenticated team page missing visualizer");
        return;
      }

      const visualizerInput = teamPage.getByPlaceholder(/Ask AiBS to build a chart/i);
      await visualizerInput.fill("Compare overturn rate by count state.");
      await teamPage.getByRole("button", { name: /Build Chart/i }).click();

      await teamPage.waitForFunction(
        () => {
          const bodyText = document.body.textContent?.toLowerCase() ?? "";
          return bodyText.includes("preview") && bodyText.includes("made in aibs");
        },
        { timeout: timeoutMs },
      );

      const visualizer = await teamPage.evaluate(() => {
        const previewText = document.body.innerText;
        const csrfToken =
          document.cookie
            .split("; ")
            .find((entry) => entry.startsWith("aibs_csrf="))
            ?.split("=")[1] ?? "";
        return {
          previewText,
          csrfToken,
        };
      });

      const normalizedPreviewText = visualizer.previewText.toLowerCase();
      if (!normalizedPreviewText.includes("preview") || !normalizedPreviewText.includes("made in aibs")) {
        logFail("authenticated visualizer preview missing");
        return;
      }

      const artifact = await teamPage.evaluate(async ({ csrfToken }) => {
        const chartTitle =
          [...document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span")]
            .map((node) => node.textContent?.trim() ?? "")
            .find((text) => text && text !== "Preview" && /Cardinals|Challenge|Overturn|Chart/i.test(text)) ?? "AiBS Chart";

        const shareText = document.body.innerText;
        const shareResponse = await fetch("/api/ai/artifacts", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({
            surfaceKey: "visualizer",
            surfaceDetail: "team_chart_builder",
            targetType: "visualizer_chart",
            targetId: crypto.randomUUID(),
            routeScope: "/teams/138?view=fan",
            routeEntityId: "138",
            title: chartTitle,
            summary: shareText.slice(0, 280),
            artifactPayload: {
              previewText: shareText,
              query: "Compare overturn rate by count state.",
              contextLabel: "team:138",
            },
            metadata: {
              publicShare: true,
              sourceRoute: "/teams/138?view=fan",
            },
          }),
        });

        return {
          status: shareResponse.status,
          json: await shareResponse.json(),
        };
      }, {
        csrfToken: visualizer.csrfToken,
      });

      if (artifact.status !== 200 || !artifact.json?.artifactId) {
        logFail("authenticated artifact registration failed");
        return;
      }

      const shareChecks = await teamPage.evaluate(async ({ artifactId }) => {
        const shareResponse = await fetch(`/v/${artifactId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const ogResponse = await fetch(`/api/viz-og/${artifactId}`, {
          credentials: "include",
          cache: "no-store",
        });
        return {
          shareStatus: shareResponse.status,
          ogStatus: ogResponse.status,
          ogContentType: ogResponse.headers.get("content-type") ?? "",
        };
      }, { artifactId: artifact.json.artifactId });

      if (shareChecks.shareStatus !== 200) {
        logFail("authenticated shared chart page failed");
        return;
      }

      if (shareChecks.ogStatus !== 200 || !shareChecks.ogContentType.includes("image/png")) {
        logFail("authenticated shared chart OG failed");
        return;
      }

      const blockingConsole = [...consoleMessages, ...teamConsoleMessages].filter((message) => !isIgnorableConsole(message));
      if (blockingConsole.length > 0) {
        logFail(`authenticated browser console errors: ${blockingConsole.join(" | ")}`);
        return;
      }

      const combinedPageErrors = [...pageErrors, ...teamPageErrors];
      if (combinedPageErrors.length > 0) {
        logFail(`authenticated browser page errors: ${combinedPageErrors.join(" | ")}`);
        return;
      }

      logPass("authenticated profile page");
      logPass("authenticated /api/me");
      logPass("authenticated team page");
      logPass("authenticated visualizer");
      logPass("authenticated artifact share");
    } finally {
      await teamPage.close();
    }
  } catch (error) {
    logFail(`authenticated browser flow threw ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    storageState: storageStatePath || undefined,
    extraHTTPHeaders: authCookie ? { cookie: authCookie } : undefined,
    viewport: { width: 1440, height: 900 },
  });

  try {
    for (const check of routeChecks) {
      await verifyRoute(context, check);
    }
    await verifyAuthedTeamPage(context);
  } finally {
    await context.close();
    await browser.close();
  }

  if (failures > 0) {
    console.error(`Browser launch check failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log("Browser launch check passed.");
}

main().catch((error) => {
  console.error(`Browser launch check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
