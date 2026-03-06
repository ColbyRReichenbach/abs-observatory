import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/teams", name: "teams-list" },
  { path: "/umpires", name: "umpires-list" },
  { path: "/query", name: "query" },
];

for (const route of ROUTES) {
  test(`visual baseline: ${route.name}`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({ content: "* { animation: none !important; transition: none !important; }" });
    await expect(page).toHaveScreenshot(`${route.name}-${testInfo.project.name}.png`, {
      fullPage: false,
      animations: "disabled",
      timeout: 10_000,
    });
  });
}
