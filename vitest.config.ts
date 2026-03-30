import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "vitest/config";

function collectEmptyTestFiles(rootDir: string): string[] {
  const emptyFiles: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !/\.test\.tsx?$/.test(entry.name)) {
        continue;
      }

      if (fs.statSync(fullPath).size === 0) {
        emptyFiles.push(path.relative(__dirname, fullPath));
      }
    }
  }

  return emptyFiles;
}

const emptyTestFiles = collectEmptyTestFiles(path.resolve(__dirname, "src"));

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "tests/visual/**", "node_modules/**", ...emptyTestFiles],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
