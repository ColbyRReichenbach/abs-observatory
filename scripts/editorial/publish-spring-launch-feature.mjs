import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const ARTICLE_TITLE = "What Spring Training Taught Us About ABS";
const ARTICLE_SLUG = "what-spring-training-taught-us-about-abs";
const ARTICLE_DEK =
  "MLB's first full spring of challenge-era ABS showed real team separation, real umpire variance, and early evidence that challenge timing may matter more than raw volume.";
const ARTICLE_SOURCE_DATE = "2026-03-24";
const ARTICLE_AUTHOR = "Colby Reichenbach";

const ARTICLE_FILE = path.resolve(
  process.cwd(),
  "docs/editorial/2026-03-24-what-spring-training-taught-us-about-abs.md",
);

const SECTION_CONFIG = {
  "Spring Produced Real ABS Identities": {
    sectionKey: "team_identity",
    sectionKind: "derived_metric",
  },
  "Timing Appears More Revealing Than Raw Volume": {
    sectionKey: "timing_signal",
    sectionKind: "derived_metric",
  },
  "The Sample Is Big Enough To Matter, But Still Small Enough To Mislead": {
    sectionKey: "sample_size_context",
    sectionKind: "fact",
  },
  "What This May Tell Us About the Regular Season": {
    sectionKey: "regular_season_outlook",
    sectionKind: "hypothesis",
  },
  "Evidence Notes": {
    sectionKey: "evidence_notes",
    sectionKind: "fact",
  },
};

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL is required");
}

function normalizeWhitespace(value) {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseFeatureMarkdown(markdown) {
  const normalized = normalizeWhitespace(markdown);
  const titleMatch = normalized.match(/^#\s+(.+)$/m);
  const dekMatch = normalized.match(/^\*\*Dek:\*\*\s+(.+)$/m);
  if (!titleMatch || !dekMatch) {
    throw new Error("Failed to parse article title or dek from markdown");
  }

  const startIndex = normalized.indexOf(`**Dek:** ${dekMatch[1]}`);
  const afterDek = normalized.slice(startIndex + `**Dek:** ${dekMatch[1]}`.length).trim();
  const parts = afterDek.split(/^##\s+/m);
  const intro = parts.shift()?.trim() ?? "";

  const sections = parts
    .map((part) => {
      const newlineIndex = part.indexOf("\n");
      if (newlineIndex === -1) return null;
      const heading = part.slice(0, newlineIndex).trim();
      const bodyMd = part.slice(newlineIndex + 1).trim();
      if (!heading || !bodyMd) return null;
      return { heading, bodyMd };
    })
    .filter(Boolean);

  return {
    title: titleMatch[1].trim(),
    dek: dekMatch[1].trim(),
    intro,
    sections,
  };
}

async function queryChartData(client) {
  const teamIdentity = await client.query(`
      WITH spring_games AS (
        SELECT game_pk
        FROM games
        WHERE season = 2026
          AND game_type = 'S'
          AND status_abstract IN ('Final', 'Game Over')
      ),
      spring_challenges AS (
        SELECT
          c.challenge_team_id AS team_id,
          c.inning,
          c.is_overturned
        FROM abs_challenges c
        JOIN spring_games g ON g.game_pk = c.game_pk
        WHERE c.challenge_team_id IS NOT NULL
      )
      SELECT
        sc.team_id AS "teamId",
        t.name AS "teamName",
        COUNT(*)::int AS "challenges",
        ROUND(AVG(CASE WHEN sc.is_overturned THEN 1 ELSE 0 END)::numeric, 4)::float8 AS "overturnRate",
        ROUND(AVG(CASE WHEN sc.inning >= 7 THEN 1 ELSE 0 END)::numeric, 4)::float8 AS "lateShare"
      FROM spring_challenges sc
      JOIN teams t ON t.team_id = sc.team_id
      GROUP BY sc.team_id, t.name
      ORDER BY COUNT(*) DESC, t.name ASC
    `);
  const timingConversion = await client.query(`
      WITH spring_games AS (
        SELECT game_pk
        FROM games
        WHERE season = 2026
          AND game_type = 'S'
          AND status_abstract IN ('Final', 'Game Over')
      ),
      spring_challenges AS (
        SELECT
          c.inning,
          ABS(c.home_score - c.away_score) AS score_diff,
          c.is_overturned
        FROM abs_challenges c
        JOIN spring_games g ON g.game_pk = c.game_pk
      )
      SELECT
        state_bucket AS "stateBucket",
        label,
        COUNT(*)::int AS "challenges",
        ROUND(AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::numeric, 4)::float8 AS "overturnRate"
      FROM (
        SELECT
          CASE
            WHEN inning >= 7 AND score_diff <= 1 THEN 'late_close'
            WHEN inning >= 7 THEN 'late_not_close'
            WHEN inning <= 3 THEN 'early'
            ELSE 'middle'
          END AS state_bucket,
          CASE
            WHEN inning >= 7 AND score_diff <= 1 THEN 'Late, close'
            WHEN inning >= 7 THEN 'Late, not close'
            WHEN inning <= 3 THEN 'Early'
            ELSE 'Middle'
          END AS label,
          is_overturned
        FROM spring_challenges
      ) buckets
      GROUP BY state_bucket, label
      ORDER BY CASE state_bucket
        WHEN 'early' THEN 1
        WHEN 'middle' THEN 2
        WHEN 'late_not_close' THEN 3
        WHEN 'late_close' THEN 4
        ELSE 5
      END
    `);
  const umpireExposure = await client.query(`
      WITH umps AS (
        SELECT
          umpire_id,
          umpire_name,
          SUM(challenged_calls)::int AS challenged_calls,
          SUM(overturned_calls)::int AS overturned_calls,
          ROUND(SUM(overturned_calls)::numeric / NULLIF(SUM(challenged_calls), 0), 4)::float8 AS overturn_rate
        FROM mart_umpire_abs_daily
        WHERE game_day BETWEEN DATE '2026-02-20' AND DATE '2026-03-24'
        GROUP BY umpire_id, umpire_name
      )
      SELECT
        umpire_id AS "umpireId",
        umpire_name AS "umpireName",
        challenged_calls AS "challengedCalls",
        overturn_rate AS "overturnRate"
      FROM umps
      WHERE challenged_calls >= 25
      ORDER BY challenged_calls DESC, overturn_rate DESC
    `);
  const facts = await client.query(`
      WITH spring_games AS (
        SELECT game_pk
        FROM games
        WHERE season = 2026
          AND game_type = 'S'
          AND status_abstract IN ('Final', 'Game Over')
      ),
      spring_challenges AS (
        SELECT
          c.inning,
          ABS(c.home_score - c.away_score) AS score_diff,
          c.is_overturned
        FROM abs_challenges c
        JOIN spring_games g ON g.game_pk = c.game_pk
      )
      SELECT
        (SELECT COUNT(*)::int FROM games WHERE season = 2026 AND game_type = 'S' AND status_abstract IN ('Final', 'Game Over')) AS final_games,
        (SELECT COUNT(DISTINCT g.game_pk)::int
         FROM spring_games g
         JOIN abs_challenges c ON c.game_pk = g.game_pk) AS games_with_challenge,
        COUNT(*)::int AS total_challenges,
        SUM(CASE WHEN is_overturned THEN 1 ELSE 0 END)::int AS total_overturns,
        ROUND(AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::numeric, 4)::float8 AS overturn_rate
      FROM spring_challenges
    `);

  return {
    teamIdentity: teamIdentity.rows,
    timingConversion: timingConversion.rows,
    umpireExposure: umpireExposure.rows,
    facts: facts.rows[0] ?? null,
  };
}

function buildSections(parsed, chartData) {
  let sectionOrder = 1;

  return parsed.sections.map((section) => {
    const config = SECTION_CONFIG[section.heading];
    if (!config) {
      throw new Error(`No section config found for heading: ${section.heading}`);
    }

    let evidencePayload = null;

    if (config.sectionKey === "team_identity") {
      evidencePayload = {
        chartKey: "spring_team_identity_scatter",
        chartTitle: "Team ABS Identity Map",
        chartDek: "Spring challenge volume and overturn rate already suggest that clubs entered ABS with different operational defaults.",
        analystNote:
          "Volume alone is not the point here. The analytical signal is that clubs were not behaving uniformly even before Opening Day, which is consistent with different organizational priors about challenge use.",
        data: chartData.teamIdentity,
      };
    } else if (config.sectionKey === "timing_signal") {
      evidencePayload = {
        chartKey: "spring_timing_conversion",
        chartTitle: "Challenge Timing And Conversion",
        chartDek: "Overturn rates fell as challenges moved into later, tighter game states, which suggests that timing changes the challenge environment itself.",
        analystNote:
          "Lower late-and-close conversion should not be read as a simple process failure. It is more plausibly evidence that clubs are challenging in tougher, more marginal environments once pressure rises.",
        data: chartData.timingConversion,
      };
    } else if (config.sectionKey === "regular_season_outlook") {
      evidencePayload = {
        chartKey: "spring_umpire_exposure_scatter",
        chartTitle: "Umpire Exposure And Review Variance",
        chartDek: "The spring sample was large enough to show that some umpire environments absorbed more challenge pressure than others.",
        analystNote:
          "This chart should be read directionally, not reputationally. The signal is that umpire review environments were not flat, and that uneven exposure will matter if similar patterns hold into April.",
        data: chartData.umpireExposure,
      };
    }

    return {
      sectionKey: config.sectionKey,
      sectionKind: config.sectionKind,
      heading: section.heading,
      bodyMd: section.bodyMd,
      sectionOrder: sectionOrder++,
      evidencePayload,
    };
  });
}

async function upsertArticle(client, article) {
  const existing = await client.query(
    `SELECT article_id AS "articleId" FROM editorial.articles WHERE slug = $1 LIMIT 1`,
    [ARTICLE_SLUG],
  );

  let articleId = existing.rows[0]?.articleId ?? null;

  if (!articleId) {
    const inserted = await client.query(
      `
        INSERT INTO editorial.articles (
          slug,
          article_type,
          status,
          source_date,
          title,
          dek,
          body_md,
          published_at,
          validation_state,
          author_name,
          facts_payload
        )
        VALUES ($1, 'weekly_editorial', 'published', $2, $3, $4, $5, NOW(), 'passed', $6, $7)
        RETURNING article_id AS "articleId"
      `,
      [ARTICLE_SLUG, ARTICLE_SOURCE_DATE, ARTICLE_TITLE, ARTICLE_DEK, article.bodyMd, ARTICLE_AUTHOR, article.factsPayload],
    );
    articleId = inserted.rows[0]?.articleId ?? null;
  } else {
    await client.query(
      `
        UPDATE editorial.articles
        SET
          article_type = 'weekly_editorial',
          status = 'published',
          source_date = $2,
          title = $3,
          dek = $4,
          body_md = $5,
          published_at = COALESCE(published_at, NOW()),
          validation_state = 'passed',
          author_name = $6,
          facts_payload = $7,
          updated_at = NOW()
        WHERE article_id = $1
      `,
      [articleId, ARTICLE_SOURCE_DATE, ARTICLE_TITLE, ARTICLE_DEK, article.bodyMd, ARTICLE_AUTHOR, article.factsPayload],
    );
  }

  await client.query(`DELETE FROM editorial.article_sections WHERE article_id = $1`, [articleId]);
  await client.query(`DELETE FROM editorial.article_contributors WHERE article_id = $1`, [articleId]);
  await client.query(`DELETE FROM editorial.article_evidence_blobs WHERE article_id = $1`, [articleId]);

  for (const section of article.sections) {
    await client.query(
      `
        INSERT INTO editorial.article_sections (
          article_id,
          section_key,
          heading,
          body_md,
          section_order,
          evidence_payload,
          section_kind
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        articleId,
        section.sectionKey,
        section.heading,
        section.bodyMd,
        section.sectionOrder,
        section.evidencePayload ? JSON.stringify(section.evidencePayload) : null,
        section.sectionKind,
      ],
    );
  }

  await client.query(
    `
      INSERT INTO editorial.article_contributors (
        article_id,
        display_name,
        role,
        contributor_type,
        sort_order,
        metadata
      )
      VALUES ($1, $2, 'Author', 'author', 1, $3)
    `,
    [articleId, ARTICLE_AUTHOR, JSON.stringify({ desk: "The Weekly Rotation" })],
  );

  const revisionNumberResult = await client.query(
    `SELECT COALESCE(MAX(revision_number), 0) + 1 AS "nextRevision" FROM editorial.article_revisions WHERE article_id = $1`,
    [articleId],
  );
  const nextRevision = revisionNumberResult.rows[0]?.nextRevision ?? 1;

  await client.query(
    `
      INSERT INTO editorial.article_revisions (
        article_id,
        revision_number,
        title,
        dek,
        body_md,
        facts_payload,
        revision_note,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
    `,
    [
      articleId,
      nextRevision,
      ARTICLE_TITLE,
      ARTICLE_DEK,
      article.bodyMd,
      article.factsPayload ? JSON.stringify(article.factsPayload) : null,
      "Spring ABS launch feature seeded from final dataset",
    ],
  );

  return articleId;
}

async function main() {
  const markdown = await fs.readFile(ARTICLE_FILE, "utf8");
  const parsed = parseFeatureMarkdown(markdown);
  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  try {
    const chartData = await queryChartData(client);
    const sections = buildSections(parsed, chartData);

    await client.query("BEGIN");
    const articleId = await upsertArticle(client, {
      bodyMd: parsed.intro,
      sections,
      factsPayload: chartData.facts,
    });
    await client.query("COMMIT");

    console.log(JSON.stringify({ articleId, slug: ARTICLE_SLUG, title: ARTICLE_TITLE }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
