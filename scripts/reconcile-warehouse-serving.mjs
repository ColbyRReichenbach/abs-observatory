import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { loadDefaultEnv } from "./lib/env.mjs";

const ROOT = process.cwd();
const RUNTIME_DIR = path.join(ROOT, ".runtime", "reconciliation");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function describeConnection(connectionString) {
  const parsed = new URL(connectionString);
  return {
    host: parsed.hostname || "local_socket",
    database: parsed.pathname.replace(/^\//, "") || "postgres",
  };
}

function isLocalConnection(connectionString) {
  const parsed = new URL(connectionString);
  return ["", "localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
}

async function fetchOne(client, query) {
  const { rows } = await client.query(query);
  return rows[0];
}

async function fetchColumnSet(client, query, column) {
  const { rows } = await client.query(query);
  return new Set(rows.map((row) => row[column]).filter(Boolean));
}

async function main() {
  loadDefaultEnv(ROOT);

  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    console.log(`Usage: node scripts/reconcile-warehouse-serving.mjs [options]

Options:
  --warehouse-url <url>   Override warehouse connection string
  --serving-url <url>     Override serving connection string
  --fail-on-drift false   Do not exit nonzero when warehouse/serving differ
  --fail-on-fallback-drift true
                         Also exit nonzero when serving fallback lookup tables differ from warehouse source marts
  --fail-on-savant-drift true
                         Also exit nonzero when serving Savant ABS rows differ from warehouse
  --write-artifact false  Print only, do not write .runtime artifact
  --help                  Show this help text`);
    return;
  }
  const warehouseUrl = args["warehouse-url"] || process.env.WAREHOUSE_DATABASE_URL || process.env.SOURCE_DATABASE_URL;
  const servingUrl = args["serving-url"] || process.env.SERVING_DATABASE_URL || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
  const writeArtifact = args["write-artifact"] !== "false";
  const failOnDrift = args["fail-on-drift"] !== "false";
  const failOnFallbackDrift = args["fail-on-fallback-drift"] === "true";
  const failOnSavantDrift = args["fail-on-savant-drift"] === "true";

  if (!warehouseUrl) {
    throw new Error("WAREHOUSE_DATABASE_URL or --warehouse-url is required.");
  }
  if (!servingUrl) {
    throw new Error("SERVING_DATABASE_URL, TARGET_DATABASE_URL, DATABASE_URL, or --serving-url is required.");
  }
  if (
    isLocalConnection(warehouseUrl) &&
    args["allow-local-warehouse"] !== "true" &&
    process.env.ALLOW_LOCAL_WAREHOUSE_RECONCILE !== "1"
  ) {
    throw new Error(
      "WAREHOUSE_DATABASE_URL resolves to a local database. Pass --warehouse-url for the hosted warehouse, or set ALLOW_LOCAL_WAREHOUSE_RECONCILE=1 if this local comparison is intentional.",
    );
  }

  const warehouse = new Client({ connectionString: warehouseUrl });
  const serving = new Client({ connectionString: servingUrl });
  await warehouse.connect();
  await serving.connect();

  try {
    const warehouseGames = await fetchOne(warehouse, "select count(*)::int as row_count from public.games");
    const servingGames = await fetchOne(serving, "select count(*)::int as row_count from public.games");
    const warehouseChallenges = await fetchOne(warehouse, "select count(*)::int as row_count from public.abs_challenges");
    const servingChallenges = await fetchOne(serving, "select count(*)::int as row_count from public.abs_challenges");
    const warehouseCanonicalChallenges = await fetchOne(warehouse, "select count(*)::int as row_count from public.mart_abs_pitch_challenges");
    const servingCanonicalChallenges = await fetchOne(serving, "select count(*)::int as row_count from public.mart_abs_pitch_challenges");
    const warehousePitches = await fetchOne(warehouse, "select count(*)::int as row_count from public.pitches");
    const servingPitches = await fetchOne(serving, "select count(*)::int as row_count from public.pitches");
    const warehouseFallbackCounts = await fetchOne(
      warehouse,
      `select
         (select count(*)::int from public.mart_run_expectancy_fallbacks) as run_expectancy_fallbacks,
         (select count(*)::int from public.mart_win_expectancy_fallbacks) as win_expectancy_fallbacks,
         (select count(*)::int from public.mart_count_state_outcome_baselines_train_validation) as count_state_baselines,
         (select count(*)::int from public.mart_modeled_abs_overturn_probability_fallbacks) as overturn_probability_fallbacks`,
    );
    const servingFallbackCounts = await fetchOne(
      serving,
      `select
         (select count(*)::int from public.serving_run_expectancy_fallbacks) as run_expectancy_fallbacks,
         (select count(*)::int from public.serving_win_expectancy_fallbacks) as win_expectancy_fallbacks,
         (select count(*)::int from public.serving_count_state_outcome_baselines) as count_state_baselines,
         (select count(*)::int from public.serving_abs_overturn_probability_fallbacks) as overturn_probability_fallbacks`,
    );
    const warehouseSavant = await fetchOne(
      warehouse,
      `select
         count(*)::int as row_count,
         max(game_date)::text as max_game_date,
         max(imported_at)::text as max_imported_at
       from raw.savant_abs_events`,
    );
    const servingSavant = await fetchOne(
      serving,
      `select
         count(*)::int as row_count,
         max(game_date)::text as max_game_date,
         max(imported_at)::text as max_imported_at
       from raw.savant_abs_events`,
    );
    const warehouseDates = await fetchOne(
      warehouse,
      `select
         min(game_date)::text as min_game_date,
         max(game_date)::text as max_game_date,
         (select max(challenged_at)::text from public.abs_challenges) as max_challenge_ts,
         (select max(created_at)::text from public.pitches) as max_pitch_ts
       from public.games`,
    );
    const servingDates = await fetchOne(
      serving,
      `select
         min(game_date)::text as min_game_date,
         max(game_date)::text as max_game_date,
         (select max(challenged_at)::text from public.abs_challenges) as max_challenge_ts,
         (select max(created_at)::text from public.pitches) as max_pitch_ts
       from public.games`,
    );
    const warehouseGameKeys = await fetchColumnSet(warehouse, "select game_pk from public.games", "game_pk");
    const servingGameKeys = await fetchColumnSet(serving, "select game_pk from public.games", "game_pk");
    const warehouseChallengeKeys = await fetchColumnSet(
      warehouse,
      "select dedupe_key from public.abs_challenges where dedupe_key is not null",
      "dedupe_key",
    );
    const servingChallengeKeys = await fetchColumnSet(
      serving,
      "select dedupe_key from public.abs_challenges where dedupe_key is not null",
      "dedupe_key",
    );

    const gamesOnlyInServing = [...servingGameKeys].filter((key) => !warehouseGameKeys.has(key)).length;
    const gamesOnlyInWarehouse = [...warehouseGameKeys].filter((key) => !servingGameKeys.has(key)).length;
    const challengeMatches = [...warehouseChallengeKeys].filter((key) => servingChallengeKeys.has(key)).length;
    const challengesOnlyInServing = [...servingChallengeKeys].filter((key) => !warehouseChallengeKeys.has(key)).length;
    const challengesOnlyInWarehouse = [...warehouseChallengeKeys].filter((key) => !servingChallengeKeys.has(key)).length;

    const artifact = {
      generatedAt: new Date().toISOString(),
      warehouse: describeConnection(warehouseUrl),
      serving: describeConnection(servingUrl),
      tables: {
        games: {
          warehouse: warehouseGames.row_count,
          serving: servingGames.row_count,
          onlyInServing: gamesOnlyInServing,
          onlyInWarehouse: gamesOnlyInWarehouse,
        },
        absChallenges: {
          warehouse: warehouseChallenges.row_count,
          serving: servingChallenges.row_count,
          matchingDedupeKeys: challengeMatches,
          onlyInServingByDedupeKey: challengesOnlyInServing,
          onlyInWarehouseByDedupeKey: challengesOnlyInWarehouse,
        },
        canonicalAbsPitchChallenges: {
          warehouse: warehouseCanonicalChallenges.row_count,
          serving: servingCanonicalChallenges.row_count,
        },
        pitches: {
          warehouse: warehousePitches.row_count,
          serving: servingPitches.row_count,
        },
        fallbackLookups: {
          warehouseSourceMarts: warehouseFallbackCounts,
          servingTables: servingFallbackCounts,
        },
        rawSavantAbsEvents: {
          warehouse: warehouseSavant,
          serving: servingSavant,
        },
      },
      cutoffs: {
        warehouse: warehouseDates,
        serving: servingDates,
      },
      driftFlags: {
        gamesOutOfSync: gamesOnlyInServing > 0 || gamesOnlyInWarehouse > 0,
        challengesOutOfSync: challengesOnlyInServing > 0 || challengesOnlyInWarehouse > 0,
        fallbackLookupsOutOfSync:
          warehouseFallbackCounts.run_expectancy_fallbacks !== servingFallbackCounts.run_expectancy_fallbacks ||
          warehouseFallbackCounts.win_expectancy_fallbacks !== servingFallbackCounts.win_expectancy_fallbacks ||
          warehouseFallbackCounts.count_state_baselines !== servingFallbackCounts.count_state_baselines ||
          warehouseFallbackCounts.overturn_probability_fallbacks !== servingFallbackCounts.overturn_probability_fallbacks,
        rawSavantAbsEventsOutOfSync:
          warehouseSavant.row_count !== servingSavant.row_count ||
          warehouseSavant.max_game_date !== servingSavant.max_game_date,
      },
    };

    if (writeArtifact) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      const fileName = `warehouse-serving-${artifact.generatedAt.replaceAll(":", "-")}.json`;
      fs.writeFileSync(path.join(RUNTIME_DIR, fileName), `${JSON.stringify(artifact, null, 2)}\n`);
    }

    console.log(JSON.stringify(artifact, null, 2));
    if (
      failOnDrift &&
      (artifact.driftFlags.gamesOutOfSync ||
        artifact.driftFlags.challengesOutOfSync ||
        (failOnFallbackDrift && artifact.driftFlags.fallbackLookupsOutOfSync) ||
        (failOnSavantDrift && artifact.driftFlags.rawSavantAbsEventsOutOfSync))
    ) {
      process.exitCode = 2;
    }
  } finally {
    await Promise.allSettled([warehouse.end(), serving.end()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
