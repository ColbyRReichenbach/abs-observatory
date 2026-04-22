import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { loadTestEnvValue } from "./env";
const databaseUrl = loadTestEnvValue("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for article e2e fixtures");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: loadTestEnvValue("DATABASE_SSL") === "true" ? { rejectUnauthorized: false } : undefined,
});

const baseId = randomUUID();
const dailySlug = `e2e-articles-daily-${baseId}`;
const weeklySlug = `e2e-articles-weekly-${baseId}`;
const draftSlug = `e2e-articles-draft-${baseId}`;

test.beforeAll(async () => {
  await pool.query(
    `
    DELETE FROM editorial.articles
    WHERE slug LIKE 'e2e-articles-%'
    `,
  );

  await pool.query(
    `
    INSERT INTO editorial.articles (
      article_id,
      slug,
      article_type,
      status,
      source_date,
      title,
      dek,
      body_md,
      published_at,
      validation_state
    )
    VALUES
      ($1, $2, 'daily_auto', 'published', '2026-03-05', 'Daily Auto Fixture', 'Daily dek', '# Daily Auto Fixture', NOW(), 'passed'),
      ($3, $4, 'weekly_editorial', 'published', '2026-03-02', 'Weekly Editorial Fixture', 'Weekly dek', '# Weekly Editorial Fixture', NOW(), 'passed'),
      ($5, $6, 'weekly_editorial', 'draft', '2026-03-02', 'Draft Fixture', 'Draft dek', '# Draft Fixture', NULL, 'pending')
    ON CONFLICT (article_id) DO NOTHING
    `,
    [randomUUID(), dailySlug, randomUUID(), weeklySlug, randomUUID(), draftSlug],
  );
});

test.afterAll(async () => {
  await pool.query("DELETE FROM editorial.articles WHERE slug IN ($1, $2, $3)", [dailySlug, weeklySlug, draftSlug]);
  await pool.end();
});

test("published daily and weekly article pages render, but drafts stay private", async ({ page }) => {
  await page.goto("/articles");
  await expect(page.getByRole("link", { name: "Daily Auto Fixture" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekly Editorial Fixture" })).toBeVisible();

  await page.goto(`/articles/${dailySlug}`);
  await expect(page.getByRole("heading", { name: "Daily Auto Fixture" }).first()).toBeVisible();

  await page.goto(`/articles/${weeklySlug}`);
  await expect(page.getByRole("heading", { name: "Weekly Editorial Fixture" }).first()).toBeVisible();

  await page.goto(`/articles/${draftSlug}`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This page could not be found." })).toBeVisible();
});
