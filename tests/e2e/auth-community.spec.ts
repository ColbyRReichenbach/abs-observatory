import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { loadTestEnvValue } from "./env";

const articleId = randomUUID();
const articleSlug = `e2e-${articleId}`;
const userId = `dev-e2e-${articleId}`;
const adminUserId = `admin-e2e-${articleId}`;
const username = `e2e_${articleId.replace(/-/g, "").slice(0, 10)}`;
const databaseUrl = loadTestEnvValue("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for e2e fixtures");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: loadTestEnvValue("DATABASE_SSL") === "true" ? { rejectUnauthorized: false } : undefined,
});

test.beforeAll(async () => {
  await pool.query(
    `
    INSERT INTO editorial.articles (
      article_id,
      slug,
      article_type,
      status,
      title,
      body_md,
      published_at
    )
    VALUES ($1, $2, 'analysis', 'published', 'E2E Fixture', 'Fixture body', NOW())
    ON CONFLICT (article_id) DO NOTHING
    `,
    [articleId, articleSlug],
  );
});

test.afterAll(async () => {
  await pool.query("DELETE FROM product.users WHERE external_auth_provider = 'dev' AND external_auth_id = $1", [userId]);
  await pool.query("DELETE FROM product.users WHERE external_auth_provider = 'dev' AND external_auth_id = $1", [adminUserId]);
  await pool.query("DELETE FROM editorial.articles WHERE article_id = $1", [articleId]);
  await pool.end();
});

test("verified dev auth can fetch me, update profile, and comment on an article", async ({ playwright }) => {
  const authed = await playwright.request.newContext({
    extraHTTPHeaders: {
      "x-dev-user-id": userId,
      "x-dev-user-email": `${userId}@example.com`,
      "x-dev-user-name": "E2E Tester",
      "x-dev-user-verified": "true",
    },
  });

  const meResponse = await authed.get("/api/me");
  expect(meResponse.ok()).toBeTruthy();
  expect(await meResponse.json()).toEqual(
    expect.objectContaining({
      authenticated: true,
    }),
  );

  const profileResponse = await authed.put("/api/profile", {
    data: {
      username,
      avatarPreset: "team-logo",
      bio: "Watching the zone.",
    },
  });
  expect(profileResponse.ok()).toBeTruthy();
  const profileBody = await profileResponse.json();
  expect(profileBody.profile).toEqual(
    expect.objectContaining({
      username,
      avatarPreset: "team-logo",
      isVerified: true,
    }),
  );

  const commentResponse = await authed.post("/api/comments", {
    data: {
      articleId,
      body: "That challenge changed the inning.",
    },
  });
  expect(commentResponse.status()).toBe(201);
  expect(await commentResponse.json()).toEqual(
    expect.objectContaining({
      comment: expect.objectContaining({
        moderationStatus: "published",
        body: "That challenge changed the inning.",
      }),
    }),
  );

  await authed.dispose();
});

test("full auth -> comment -> AI -> article -> moderation flow enforces admin-only moderation", async ({
  playwright,
  page,
}) => {
  const commenterId = `${userId}-moderation`;
  const authed = await playwright.request.newContext({
    extraHTTPHeaders: {
      "x-dev-user-id": commenterId,
      "x-dev-user-email": `${commenterId}@example.com`,
      "x-dev-user-name": "Moderation Tester",
      "x-dev-user-verified": "true",
    },
  });

  const commentResponse = await authed.post("/api/comments", {
    data: {
      articleId,
      body: "That call looked like hate speech from the zone room.",
    },
  });
  expect(commentResponse.status()).toBe(201);
  const commentBody = await commentResponse.json();
  expect(commentBody.comment).toEqual(
    expect.objectContaining({
      moderationStatus: "pending_review",
    }),
  );

  const aiResponse = await authed.post("/api/ai/chat", {
    data: {
      message: "Summarize the latest ABS challenges in baseball.",
      context: { scope: "global" },
    },
  });
  expect(aiResponse.status()).toBe(200);

  await page.goto(`/articles/${articleSlug}`);
  await expect(page.getByRole("heading", { name: "E2E Fixture" }).first()).toBeVisible();

  const forbiddenModeration = await authed.patch(`/api/comments/${commentBody.comment.commentId}`, {
    data: {
      action: "hide",
      reason: "Trying without privileges",
    },
  });
  expect(forbiddenModeration.status()).toBe(403);

  const admin = await playwright.request.newContext({
    extraHTTPHeaders: {
      "x-dev-user-id": adminUserId,
      "x-dev-user-email": `${adminUserId}@example.com`,
      "x-dev-user-name": "Admin Tester",
      "x-dev-user-verified": "true",
    },
  });

  const adminMe = await admin.get("/api/me");
  expect(adminMe.ok()).toBeTruthy();

  await pool.query(
    `
    INSERT INTO product.user_roles (user_id, role)
    SELECT user_id, 'admin'
    FROM product.users
    WHERE external_auth_provider = 'dev' AND external_auth_id = $1
    ON CONFLICT (user_id, role) DO NOTHING
    `,
    [adminUserId],
  );

  const moderationResponse = await admin.patch(`/api/comments/${commentBody.comment.commentId}`, {
    data: {
      action: "hide",
      reason: "Escalated abuse review",
    },
  });
  expect(moderationResponse.status()).toBe(200);
  expect(await moderationResponse.json()).toEqual(
    expect.objectContaining({
      comment: expect.objectContaining({
        commentId: commentBody.comment.commentId,
        moderationStatus: "hidden",
      }),
    }),
  );

  const commentsResponse = await admin.get(`/api/comments?articleId=${articleId}`);
  expect(commentsResponse.ok()).toBeTruthy();
  const commentsBody = await commentsResponse.json();
  expect(commentsBody.comments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        commentId: commentBody.comment.commentId,
        moderationStatus: "hidden",
      }),
    ]),
  );

  await authed.dispose();
  await admin.dispose();
});

test("blocked comment payload is rejected and unauthenticated users cannot write", async ({ playwright, request }) => {
  const unauthenticated = await request.post("/api/comments", {
    data: {
      articleId,
      body: "hello",
    },
  });
  expect(unauthenticated.status()).toBe(401);

  const authed = await playwright.request.newContext({
    extraHTTPHeaders: {
      "x-dev-user-id": `${userId}-2`,
      "x-dev-user-email": `${userId}-2@example.com`,
      "x-dev-user-name": "E2E Tester 2",
      "x-dev-user-verified": "true",
    },
  });

  const blocked = await authed.post("/api/comments", {
    data: {
      articleId,
      body: "Read this https://example.com",
    },
  });
  expect(blocked.status()).toBe(400);
  expect(await blocked.json()).toEqual({ error: "Comments may not contain links" });

  await authed.dispose();
});
