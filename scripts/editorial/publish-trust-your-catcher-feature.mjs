import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const ARTICLE_TITLE = "Trust Your Catcher";
const ARTICLE_SLUG = "trust-your-catcher";
const ARTICLE_DEK =
  "ABS gives every pitch a final answer. The harder question is which player should be trusted to ask for it.";
const ARTICLE_SOURCE_DATE = "2026-04-27";
const ARTICLE_AUTHOR = "Colby Reichenbach";
const ARTICLE_STATUS = process.env.ARTICLE_STATUS === "published" ? "published" : "draft";
const ARTICLE_DATA_END_LOCAL_DATE = "2026-04-28";

const ARTICLE_FILE = path.resolve(process.cwd(), "docs/editorial/2026-04-27-trust-your-catcher.md");

const SECTION_CONFIG = {
  "Start Behind The Plate": {
    sectionKey: "league_split",
    sectionKind: "derived_metric",
    chartKey: "abs_actor_comparison",
    chartTitle: "Who Should Own The Tap?",
    chartDek: "Regular-season ABS challenge overturn rate by initiating player. Catcher includes only fielding-side rows verified by player primary position.",
    analystNote:
      "Successful challenges are kept, failed challenges are gone. That makes overturn rate a pretty good first read on who should be trusted with the tap.",
  },
  "The Count Is Where It Gets Loud": {
    sectionKey: "count_pressure",
    sectionKind: "derived_metric",
    chartKey: "abs_count_pressure_gap",
    chartTitle: "The Two-Strike Batter Problem",
    chartDek: "Catcher and batter overturn rates by pre-pitch count state. Labels above bars show challenge volume.",
    analystNote:
      "The biggest gap is in non-full two-strike counts, which is exactly where the result of the pitch can make conviction feel louder than the view.",
  },
  "It Is Not Just The Fastball": {
    sectionKey: "pitch_family",
    sectionKind: "derived_metric",
    chartKey: "abs_pitch_family_gap",
    chartTitle: "The Edge Survives The Pitch Mix",
    chartDek: "Verified defensive catcher and batter overturn rates by pitch family. Labels above bars show challenge volume.",
    analystNote:
      "Fastballs are the biggest bucket for both groups, but the catcher advantage shows up on fastballs, breaking balls, and offspeed pitches.",
  },
  "My First Guess Was Wrong": {
    sectionKey: "gameflow",
    sectionKind: "hypothesis",
    chartKey: "abs_catcher_gameflow",
    chartTitle: "Catchers Are Not Getting Better Later",
    chartDek: "Catcher overturn rate by inning bucket. The early-game bucket is outperforming the middle and late innings.",
    analystNote:
      "This does not prove fatigue or late-game pressure. It does push back on the easy story that catchers simply learn the umpire and get sharper later.",
  },
  "This Is Receiving, Not Framing": {
    sectionKey: "framing_context",
    sectionKind: "hypothesis",
  },
  "How I Would Coach It": {
    sectionKey: "org_takeaway",
    sectionKind: "hypothesis",
  },
  "Methodology and Math": {
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

function wilsonInterval(successes, total) {
  if (!total) return { low: null, high: null };
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return {
    low: (center - margin) / denominator,
    high: (center + margin) / denominator,
  };
}

function twoProportionZ(aSuccess, aTotal, bSuccess, bTotal) {
  if (!aTotal || !bTotal) return null;
  const pooled = (aSuccess + bSuccess) / (aTotal + bTotal);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / aTotal + 1 / bTotal));
  if (!standardError) return null;
  return (aSuccess / aTotal - bSuccess / bTotal) / standardError;
}

async function queryChartData(client) {
  const actorComparison = await client.query(`
    WITH base AS (
      SELECT
        CASE
          WHEN c.challenge_side_role = 'fielding'
            AND c.challenge_actor_role = 'unknown'
            AND p.source_payload->'primaryPosition'->>'abbreviation' = 'C'
            THEN 'catcher'
          ELSE c.challenge_actor_role
        END AS actor,
        c.is_overturned
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN players p ON p.player_id = c.challenge_player_id
      WHERE g.season = 2026
        AND g.game_type = 'R'
        AND c.is_abs_pitch_challenge IS TRUE
        AND (g.game_date AT TIME ZONE 'America/New_York')::date < DATE '${ARTICLE_DATA_END_LOCAL_DATE}'
    )
    SELECT
      actor,
      COUNT(*)::int AS challenges,
      COUNT(*) FILTER (WHERE is_overturned)::int AS overturned,
      AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::float8 AS "overturnRate"
    FROM base
    WHERE actor IN ('catcher', 'batter', 'pitcher')
    GROUP BY actor
    ORDER BY CASE actor WHEN 'catcher' THEN 1 WHEN 'batter' THEN 2 ELSE 3 END
  `);

  const countPressureRaw = await client.query(`
    WITH base AS (
      SELECT
        CASE
          WHEN c.challenge_side_role = 'fielding'
            AND c.challenge_actor_role = 'unknown'
            AND p.source_payload->'primaryPosition'->>'abbreviation' = 'C'
            THEN 'catcher'
          ELSE c.challenge_actor_role
        END AS actor,
        CASE
          WHEN COALESCE(c.balls_before, c.balls) = 0 AND COALESCE(c.strikes_before, c.strikes) = 0 THEN 'first'
          WHEN COALESCE(c.balls_before, c.balls) = 3 AND COALESCE(c.strikes_before, c.strikes) = 2 THEN 'full'
          WHEN COALESCE(c.strikes_before, c.strikes) = 2 THEN 'two_strike'
          WHEN COALESCE(c.balls_before, c.balls) = 3 THEN 'walk'
          ELSE 'middle'
        END AS bucket,
        c.is_overturned
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN players p ON p.player_id = c.challenge_player_id
      WHERE g.season = 2026
        AND g.game_type = 'R'
        AND c.is_abs_pitch_challenge IS TRUE
        AND (g.game_date AT TIME ZONE 'America/New_York')::date < DATE '${ARTICLE_DATA_END_LOCAL_DATE}'
    )
    SELECT
      bucket,
      actor,
      COUNT(*)::int AS challenges,
      COUNT(*) FILTER (WHERE is_overturned)::int AS overturned,
      AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::float8 AS "overturnRate"
    FROM base
    WHERE actor IN ('catcher', 'batter')
    GROUP BY bucket, actor
    ORDER BY array_position(ARRAY['first', 'middle', 'two_strike', 'walk', 'full'], bucket), actor
  `);

  const gameflow = await client.query(`
    WITH base AS (
      SELECT
        CASE
          WHEN c.challenge_side_role = 'fielding'
            AND c.challenge_actor_role = 'unknown'
            AND p.source_payload->'primaryPosition'->>'abbreviation' = 'C'
            THEN 'catcher'
          ELSE c.challenge_actor_role
        END AS actor,
        CASE
          WHEN c.inning BETWEEN 1 AND 3 THEN '1-3'
          WHEN c.inning BETWEEN 4 AND 6 THEN '4-6'
          WHEN c.inning BETWEEN 7 AND 9 THEN '7-9'
          ELSE 'extras'
        END AS bucket,
        c.is_overturned
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN players p ON p.player_id = c.challenge_player_id
      WHERE g.season = 2026
        AND g.game_type = 'R'
        AND c.is_abs_pitch_challenge IS TRUE
        AND (g.game_date AT TIME ZONE 'America/New_York')::date < DATE '${ARTICLE_DATA_END_LOCAL_DATE}'
    )
    SELECT
      bucket,
      COUNT(*)::int AS challenges,
      COUNT(*) FILTER (WHERE is_overturned)::int AS overturned,
      AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::float8 AS "overturnRate"
    FROM base
    WHERE actor = 'catcher'
    GROUP BY bucket
    ORDER BY CASE bucket WHEN '1-3' THEN 1 WHEN '4-6' THEN 2 WHEN '7-9' THEN 3 ELSE 4 END
  `);

  const pitchFamilyRaw = await client.query(`
    WITH base AS (
      SELECT
        c.game_pk,
        c.at_bat_index,
        COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitch_number,
        CASE
          WHEN c.challenge_side_role = 'fielding'
            AND c.challenge_actor_role = 'unknown'
            AND pl.source_payload->'primaryPosition'->>'abbreviation' = 'C'
            THEN 'catcher'
          WHEN c.challenge_actor_role = 'batter' THEN 'batter'
          ELSE NULL
        END AS actor,
        c.is_overturned
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN players pl ON pl.player_id = c.challenge_player_id
      WHERE g.season = 2026
        AND g.game_type = 'R'
        AND c.is_abs_pitch_challenge IS TRUE
        AND (g.game_date AT TIME ZONE 'America/New_York')::date < DATE '${ARTICLE_DATA_END_LOCAL_DATE}'
    ),
    joined AS (
      SELECT
        b.actor,
        b.is_overturned,
        p.pitch_type_code
      FROM base b
      LEFT JOIN pitches p
        ON p.game_pk = b.game_pk
       AND p.at_bat_index = b.at_bat_index
       AND p.pitch_number = b.pitch_number
      WHERE b.actor IN ('catcher', 'batter')
    ),
    families AS (
      SELECT
        actor,
        CASE
          WHEN UPPER(COALESCE(pitch_type_code, '')) IN ('FF', 'FA', 'FT', 'SI', 'FC', 'FSI') THEN 'fastball'
          WHEN UPPER(COALESCE(pitch_type_code, '')) IN ('SL', 'ST', 'CU', 'KC', 'KN', 'SV', 'SC') THEN 'breaking'
          WHEN UPPER(COALESCE(pitch_type_code, '')) IN ('CH', 'FS', 'FO', 'EP') THEN 'offspeed'
          ELSE 'unknown'
        END AS family,
        is_overturned
      FROM joined
    )
    SELECT
      family,
      actor,
      COUNT(*)::int AS challenges,
      COUNT(*) FILTER (WHERE is_overturned)::int AS overturned,
      AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::float8 AS "overturnRate"
    FROM families
    WHERE family IN ('fastball', 'breaking', 'offspeed')
    GROUP BY family, actor
    ORDER BY array_position(ARRAY['fastball', 'breaking', 'offspeed'], family), actor
  `);

  const actorRows = actorComparison.rows.map((row) => {
    const interval = wilsonInterval(row.overturned, row.challenges);
    return {
      actor: row.actor,
      label: row.actor === "catcher" ? "Catcher" : row.actor === "batter" ? "Batter" : "Pitcher",
      challenges: row.challenges,
      overturned: row.overturned,
      overturnRate: row.overturnRate,
      ciLow: interval.low,
      ciHigh: interval.high,
    };
  });

  const countByBucket = new Map();
  for (const row of countPressureRaw.rows) {
    const existing = countByBucket.get(row.bucket) ?? {};
    existing[row.actor] = row;
    countByBucket.set(row.bucket, existing);
  }

  const bucketLabels = {
    first: "First Pitch",
    middle: "Middle Counts",
    two_strike: "Two Strikes, Not Full",
    walk: "Three Balls, Not Full",
    full: "Full Count",
  };
  const countPressure = ["first", "middle", "two_strike", "walk", "full"]
    .map((bucket) => {
      const pair = countByBucket.get(bucket);
      if (!pair?.catcher || !pair?.batter) return null;
      const zScore = twoProportionZ(
        pair.catcher.overturned,
        pair.catcher.challenges,
        pair.batter.overturned,
        pair.batter.challenges,
      );
      return {
        bucket,
        label: bucketLabels[bucket],
        catcherChallenges: pair.catcher.challenges,
        catcherOverturned: pair.catcher.overturned,
        catcherRate: pair.catcher.overturnRate,
        batterChallenges: pair.batter.challenges,
        batterOverturned: pair.batter.overturned,
        batterRate: pair.batter.overturnRate,
        gap: pair.catcher.overturnRate - pair.batter.overturnRate,
        zScore,
      };
    })
    .filter(Boolean);

  const gameflowRows = gameflow.rows.map((row) => ({
    bucket: row.bucket,
    label: row.bucket === "extras" ? "Extras" : `Inn. ${row.bucket}`,
    challenges: row.challenges,
    overturned: row.overturned,
    overturnRate: row.overturnRate,
  }));

  const pitchByFamily = new Map();
  for (const row of pitchFamilyRaw.rows) {
    const existing = pitchByFamily.get(row.family) ?? {};
    existing[row.actor] = row;
    pitchByFamily.set(row.family, existing);
  }
  const pitchFamilyLabels = {
    fastball: "Fastball",
    breaking: "Breaking",
    offspeed: "Offspeed",
  };
  const pitchFamily = ["fastball", "breaking", "offspeed"]
    .map((family) => {
      const pair = pitchByFamily.get(family);
      if (!pair?.catcher || !pair?.batter) return null;
      return {
        family,
        label: pitchFamilyLabels[family],
        catcherChallenges: pair.catcher.challenges,
        catcherOverturned: pair.catcher.overturned,
        catcherRate: pair.catcher.overturnRate,
        batterChallenges: pair.batter.challenges,
        batterOverturned: pair.batter.overturned,
        batterRate: pair.batter.overturnRate,
        gap: pair.catcher.overturnRate - pair.batter.overturnRate,
      };
    })
    .filter(Boolean);

  const catcher = actorRows.find((row) => row.actor === "catcher");
  const batter = actorRows.find((row) => row.actor === "batter");

  return {
    actorComparison: actorRows,
    countPressure,
    pitchFamily,
    gameflow: gameflowRows,
    facts: {
      sourceDate: ARTICLE_SOURCE_DATE,
      dataEndLocalDateExclusive: ARTICLE_DATA_END_LOCAL_DATE,
      regularSeasonChallenges: actorRows.reduce((sum, row) => sum + row.challenges, 0),
      catcherBatterGap:
        catcher && batter ? catcher.overturnRate - batter.overturnRate : null,
      catcherBatterZ:
        catcher && batter ? twoProportionZ(catcher.overturned, catcher.challenges, batter.overturned, batter.challenges) : null,
      actorClassification:
        "Catcher rows are fielding-side unknown challenger rows whose challenge_player_id maps to MLB primary position C; unverified fielding rows are excluded.",
    },
  };
}

function buildSections(parsed, chartData) {
  return parsed.sections.map((section, index) => {
    const config = SECTION_CONFIG[section.heading] ?? {
      sectionKey: section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      sectionKind: "fact",
    };

    let data = null;
    if (config.chartKey === "abs_actor_comparison") data = chartData.actorComparison;
    if (config.chartKey === "abs_count_pressure_gap") data = chartData.countPressure;
    if (config.chartKey === "abs_pitch_family_gap") data = chartData.pitchFamily;
    if (config.chartKey === "abs_catcher_gameflow") data = chartData.gameflow;

    return {
      sectionKey: config.sectionKey,
      sectionKind: config.sectionKind,
      heading: section.heading,
      bodyMd: section.bodyMd,
      sectionOrder: index + 1,
      evidencePayload: data
        ? {
            chartKey: config.chartKey,
            chartTitle: config.chartTitle,
            chartDek: config.chartDek,
            analystNote: config.analystNote,
            data,
          }
        : null,
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
        VALUES ($1, 'weekly_editorial', $8, $2, $3, $4, $5, CASE WHEN $8 = 'published' THEN NOW() ELSE NULL END, 'passed', $6, $7::jsonb)
        RETURNING article_id AS "articleId"
      `,
      [ARTICLE_SLUG, ARTICLE_SOURCE_DATE, ARTICLE_TITLE, ARTICLE_DEK, article.bodyMd, ARTICLE_AUTHOR, JSON.stringify(article.factsPayload), ARTICLE_STATUS],
    );
    articleId = inserted.rows[0]?.articleId ?? null;
  } else {
    await client.query(
      `
        UPDATE editorial.articles
        SET
          article_type = 'weekly_editorial',
          status = $8,
          source_date = $2,
          title = $3,
          dek = $4,
          body_md = $5,
          published_at = CASE WHEN $8 = 'published' THEN COALESCE(published_at, NOW()) ELSE NULL END,
          validation_state = 'passed',
          author_name = $6,
          facts_payload = $7::jsonb,
          updated_at = NOW()
        WHERE article_id = $1
      `,
      [articleId, ARTICLE_SOURCE_DATE, ARTICLE_TITLE, ARTICLE_DEK, article.bodyMd, ARTICLE_AUTHOR, JSON.stringify(article.factsPayload), ARTICLE_STATUS],
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
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
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
      VALUES ($1, $2, 'Author', 'author', 1, $3::jsonb)
    `,
    [articleId, ARTICLE_AUTHOR, JSON.stringify({ desk: "ABS Observatory" })],
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
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NULL)
    `,
    [
      articleId,
      nextRevision,
      ARTICLE_TITLE,
      ARTICLE_DEK,
      article.bodyMd,
      JSON.stringify(article.factsPayload),
      "Trust Your Catcher feature seeded from regular-season ABS challenge dataset",
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
