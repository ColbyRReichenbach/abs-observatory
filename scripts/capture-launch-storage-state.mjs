import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.APP_URL ?? process.argv[2] ?? "http://localhost:3000";
const outputPath = process.env.LAUNCH_STORAGE_STATE_OUTPUT ?? path.join(".tmp", "launch-auth.json");
const browserChannel = process.env.LAUNCH_BROWSER_CHANNEL ?? "chrome";

const rl = readline.createInterface({ input, output });

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: false, channel: browserChannel });
  } catch {
    console.warn(
      `Unable to launch channel "${browserChannel}", falling back to bundled Chromium. ` +
        `If Google sign-in is blocked there, set LAUNCH_BROWSER_CHANNEL=chrome and ensure Chrome is installed.`,
    );
    browser = await chromium.launch({ headless: false });
  }
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  await page.goto(new URL("/sign-in?next=/profile", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });

  console.log(`Opened sign-in at ${baseUrl} using browser channel "${browserChannel}".`);
  console.log("Complete sign-in in the browser window, wait until /profile is visible, then press Enter here.");
  await rl.question("");

  await context.storageState({ path: outputPath });
  console.log(`Saved storage state to ${outputPath}`);

  await rl.close();
  await browser.close();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await rl.close();
  process.exit(1);
});
