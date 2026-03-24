import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("a11y foundations", () => {
  it("defines reduced-motion media query and skip-link styles", () => {
    const cssPath = path.join(process.cwd(), "src/app/globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".skip-link");
    expect(css).toContain(":focus-visible");
  });

  it("layout includes skip-to-content anchor", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const layout = fs.readFileSync(layoutPath, "utf8");

    expect(layout).toContain("Skip to main content");
    expect(layout).toContain("id=\"main-content\"");
  });
});

