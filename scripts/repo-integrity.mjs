import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readUtf8(path) {
  return readFileSync(path, "utf8");
}

function checkNodeVersion() {
  const nvmrcPath = join(repoRoot, ".nvmrc");
  if (!existsSync(nvmrcPath)) {
    warn("Missing .nvmrc; skipping runtime pin check.");
    return;
  }

  const expected = readUtf8(nvmrcPath).trim();
  const expectedMajor = Number.parseInt(expected, 10);
  const currentMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

  if (Number.isNaN(expectedMajor)) {
    warn(`Unable to parse .nvmrc value "${expected}".`);
    return;
  }

  if (currentMajor !== expectedMajor) {
    fail(`Node ${process.versions.node} does not match pinned major ${expectedMajor}. Use \`nvm use\` before build/release work.`);
  }
}

function checkGitLocks() {
  const lockPaths = [
    ".git/index.lock",
    ".git/HEAD.lock",
    ".git/packed-refs.lock",
  ];

  for (const relativePath of lockPaths) {
    const absolutePath = join(repoRoot, relativePath);
    if (existsSync(absolutePath)) {
      fail(`Stale git lock present: ${relativePath}`);
    }
  }
}

function checkTrackedFilesNotEmpty() {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  const guardedExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".md",
    ".sql",
    ".py",
    ".sh",
    ".yml",
    ".yaml",
  ]);

  for (const relativePath of tracked) {
    const ext = relativePath.includes(".") ? `.${relativePath.split(".").pop()}` : "";
    if (!guardedExtensions.has(ext)) continue;

    const absolutePath = join(repoRoot, relativePath);
    if (!existsSync(absolutePath)) {
      fail(`Tracked file missing from workspace: ${relativePath}`);
      continue;
    }

    const stats = statSync(absolutePath);
    const size = stats.size;
    if (size === 0) {
      fail(`Tracked file is zero bytes: ${relativePath}`);
    }

    if (size > 0 && stats.blocks === 0) {
      fail(`Tracked file is sparse/corrupt on disk: ${relativePath}`);
    }
  }
}

function checkCriticalRuntimeFiles() {
  const runtimeChecks = [
    {
      path: "node_modules/next/dist/shared/lib/errors/canary-only-config-error.js",
      kind: "text",
    },
    {
      path: "node_modules/next/dist/compiled/@opentelemetry/api/package.json",
      kind: "json",
    },
    {
      path: "node_modules/next/package.json",
      kind: "json",
    },
    {
      path: "node_modules/react/package.json",
      kind: "json",
    },
  ];

  for (const check of runtimeChecks) {
    const absolutePath = join(repoRoot, check.path);
    if (!existsSync(absolutePath)) {
      fail(`Critical runtime file missing: ${check.path}. Reinstall dependencies with \`npm ci\`.`);
      continue;
    }

    const stats = statSync(absolutePath);
    const size = stats.size;
    if (size === 0) {
      fail(`Critical runtime file is empty: ${check.path}. Reinstall dependencies with \`npm ci\`.`);
      continue;
    }

    if (size > 0 && stats.blocks === 0) {
      fail(`Critical runtime file is sparse/corrupt: ${check.path}. Reinstall dependencies with \`npm ci\`.`);
      continue;
    }

    if (check.kind === "json") {
      try {
        JSON.parse(readUtf8(absolutePath));
      } catch (error) {
        fail(`Critical runtime JSON is invalid: ${check.path} (${error instanceof Error ? error.message : "unknown parse error"})`);
      }
      continue;
    }

    const contents = readUtf8(absolutePath);
    if (!contents.trim()) {
      fail(`Critical runtime file is blank: ${check.path}. Reinstall dependencies with \`npm ci\`.`);
    }
  }
}

function run() {
  checkNodeVersion();
  checkGitLocks();
  checkTrackedFilesNotEmpty();
  checkCriticalRuntimeFiles();

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const message of warnings) {
      console.log(`- ${message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Repository integrity check failed:");
    for (const message of failures) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  console.log("Repository integrity check passed.");
}

run();
