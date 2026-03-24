#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import pg from "pg";

const { Client } = pg;

function loadEnvValue(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const fileName of [".env.local", ".env"]) {
    try {
      const contents = readFileSync(join(process.cwd(), fileName), "utf8");
      for (const line of contents.split("\n")) {
        if (!line.startsWith(`${name}=`)) continue;
        return line.slice(name.length + 1).trim();
      }
    } catch {
      // Ignore missing env files.
    }
  }

  return undefined;
}

const PORT = Number(process.env.LOAD_TEST_PORT ?? 3025);
const BASE_URL = process.env.LOAD_TEST_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const WORKER_TOKEN = loadEnvValue("INTERNAL_WORKER_TOKEN") ?? "local-worker-token";
const DATABASE_URL = loadEnvValue("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for load testing.");
}

function percentile(values, point) {
  if (values.length === 0) return 0;
  const ordered = values.slice().sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.floor((point / 100) * ordered.length));
  return ordered[index];
}

async function waitForServer(url, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet.
    }
    await delay(500);
  }

  throw new Error(`Server did not become ready at ${url}`);
}

async function runLocalCommand(command, args, envOverrides = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...envOverrides },
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}

async function runScenario(name, requests, concurrency) {
  const latencies = [];
  let failures = 0;
  const pending = [...requests];

  async function worker() {
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task) return;
      const startedAt = performance.now();
      const response = await task();
      latencies.push(performance.now() - startedAt);
      if (!response.ok) {
        failures += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    name,
    total: requests.length,
    failures,
    p95Ms: Math.round(percentile(latencies, 95)),
    averageMs: Math.round(latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1)),
  };
}

function buildDevHeaders(userId, verified = true) {
  return {
    "content-type": "application/json",
    "x-dev-user-id": userId,
    "x-dev-user-email": `${userId}@example.com`,
    "x-dev-user-name": "Load Tester",
    "x-dev-user-verified": verified ? "true" : "false",
  };
}

async function withSeededArticle(fn) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const articleId = randomUUID();
  const slug = `load-test-${articleId}`;
  try {
    await client.query(
      `
      INSERT INTO editorial.articles (article_id, slug, article_type, status, title, body_md)
      VALUES ($1, $2, 'weekly_editorial', 'draft', 'Load Test Article', 'Load test body')
      `,
      [articleId, slug],
    );
    return await fn({ articleId, slug });
  } finally {
    await client.query("DELETE FROM editorial.articles WHERE article_id = $1", [articleId]);
    await client.end();
  }
}

async function main() {
  if (!process.env.LOAD_TEST_BASE_URL) {
    await runLocalCommand("npm", ["run", "build"]);
  }

  const serverProcess =
    process.env.LOAD_TEST_BASE_URL
      ? null
      : spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(PORT)], {
          cwd: process.cwd(),
          env: { ...process.env, PORT: String(PORT), INTERNAL_WORKER_TOKEN: WORKER_TOKEN },
          stdio: "inherit",
        });

  try {
    await waitForServer(`${BASE_URL}/api/games/999001/timeline?limit=5`);

    const liveRequests = Array.from({ length: 24 }, () => async () =>
      fetch(`${BASE_URL}/api/games/999001/timeline?limit=20`),
    );

    const liveResult = await runScenario("live-endpoint", liveRequests, 6);

    const aiUserId = `load-ai-${randomUUID()}`;
    const aiRequests = Array.from({ length: 12 }, (_, index) => async () => {
      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: buildDevHeaders(aiUserId),
        body: JSON.stringify({
          message: index % 2 === 0 ? "Summarize the current live ABS slate." : "What changed in the live challenge picture tonight?",
          context: { scope: "global" },
        }),
      });

      return {
        ok: response.ok || response.status === 429,
      };
    });

    const aiResult = await runScenario("ai-concurrency", aiRequests, 6);

    const commentResult = await withSeededArticle(async ({ articleId }) => {
      const commentRequests = Array.from({ length: 12 }, (_, index) => async () => {
        const response = await fetch(`${BASE_URL}/api/comments`, {
          method: "POST",
          headers: buildDevHeaders(`load-comment-${index}-${randomUUID()}`),
          body: JSON.stringify({
            articleId,
            body: `Load test comment ${index}`,
          }),
        });

        return {
          ok: response.ok || response.status === 429,
        };
      });

      return runScenario("comment-burst", commentRequests, 8);
    });

    const queuedJobs = [];
    for (let index = 0; index < 6; index += 1) {
      const queuedUserId = `queued-ai-${index}-${randomUUID()}`;
      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: buildDevHeaders(queuedUserId),
        body: JSON.stringify({
          message: "Historically since 2023, how have MLB 3-1 and 2-2 counts compared league wide in ABS games?",
          context: { scope: "global", range: "season" },
          delivery: "async",
        }),
      });
      const body = await response.json();
      if (response.status !== 202) {
        throw new Error(`Expected queued AI response, received ${response.status}`);
      }
      queuedJobs.push({ jobRunId: body.jobRunId, userId: queuedUserId });
    }

    const processResponse = await fetch(`${BASE_URL}/api/internal/jobs/process?limit=2`, {
      method: "POST",
      headers: { "x-worker-token": WORKER_TOKEN },
    });
    const processBody = await processResponse.json();
    if (!processResponse.ok) {
      throw new Error(`Worker processing failed: ${JSON.stringify(processBody)}`);
    }

    const statusResponses = await Promise.all(
      queuedJobs.map(async ({ jobRunId, userId }) => {
        const response = await fetch(`${BASE_URL}/api/jobs/${jobRunId}`, {
          headers: buildDevHeaders(userId),
        });
        const body = await response.json();
        return body.job?.status ?? "missing";
      }),
    );

    const queueResult = {
      name: "queue-backlog",
      total: queuedJobs.length,
      failures: statusResponses.filter((status) => !["queued", "running", "success"].includes(status)).length,
      p95Ms: 0,
      averageMs: 0,
    };

    const results = [liveResult, aiResult, commentResult, queueResult];

    for (const result of results) {
      console.log(
        `${result.name}: total=${result.total} failures=${result.failures} avgMs=${result.averageMs} p95Ms=${result.p95Ms}`,
      );
    }

    if (liveResult.failures > 0 || liveResult.p95Ms > 1500) {
      throw new Error("Live endpoint load threshold failed.");
    }
    if (aiResult.failures > 2 || aiResult.p95Ms > 2500) {
      throw new Error("AI concurrency load threshold failed.");
    }
    if (commentResult.failures > 1 || commentResult.p95Ms > 1800) {
      throw new Error("Comment burst threshold failed.");
    }
    if (queueResult.failures > 0 || processBody.claimedCount < 1) {
      throw new Error("Queue backlog degradation threshold failed.");
    }
  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await delay(500);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
