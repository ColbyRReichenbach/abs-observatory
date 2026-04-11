import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const terminologyDir = path.join(repoRoot, "src/lib/server/ai/terminology/seeds");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadJson(fileName) {
  const fullPath = path.join(terminologyDir, fileName);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function runAiHealthSuite() {
  console.log("Running AI health checks...");

  const cards = loadJson("terminology-cards.json");
  const stylePacks = loadJson("style-packs.json");
  const surfaceRules = loadJson("surface-rules.json");

  assert(cards.length >= 50, "Terminology seed pack looks incomplete.");
  assert(stylePacks.length >= 3, "Style pack seed file looks incomplete.");
  assert(surfaceRules.length >= 8, "Surface rules seed file looks incomplete.");

  const vitestArgs = [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "src/lib/server/__tests__/ai-prompts.test.ts",
    "src/lib/server/__tests__/ai-telemetry.test.ts",
    "src/lib/server/__tests__/ai-terminology.test.ts",
    "src/lib/server/__tests__/ai-chart-insight.test.ts",
    "src/lib/server/__tests__/ai-visualizer.test.ts",
    "tests/ai-evals/terminology-voice.eval.test.ts",
    "tests/ai-evals/visualizer-structure.eval.test.ts",
  ];

  execFileSync("node", vitestArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  console.log("AI health checks passed.");
}

try {
  runAiHealthSuite();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI health checks failed: ${message}`);
  process.exit(1);
}
