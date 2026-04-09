import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const ROOT = process.cwd();
const RUNTIME_DIR = path.join(ROOT, ".runtime", "reconciliation");

function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

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

async function fetchOne(client, query) {
  const { rows } = await client.query(query);
  return rows[0];
}

async function fetchColumnSet(client, query, column) {
  const { rows } = await client.query(query);
  return new Set(rows.map((row) => row[column]).filter(Boolean));
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true") {
    console.log(`Usage: node scripts/reconcile-warehouse-serving.mjs [options]

Options:
  --warehouse-url <url>   Override warehouse connection string
  --serving-url <url>     Override serving connection string
  --fail-on-drift false   Do not exit nonzero when warehouse/serving differ
  --write-artifact false  Print only, do not write .runtime artifact
  --help                  Show this help text`);
    return;
  }
  const warehouseUrl = args["warehouse-url"] || process.env.WAREHOUSE_DATABASE_URL || process.env.SOURCE_DATABASE_URL;
  const servingUrl = args["serving-url"] || process.env.SERVING_DATABASE_URL || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
  const writeArtifact = args["write-artifact"] !== "false";
  const failOnDrift = args["fail-on-drift"] !== "false";

  if (!warehouseUrl) {
    throw new Error("WAREHOUSE_DATABASE_URL or --warehouse-url is required.");
  }
  if (!servingUrl) {
    throw new Error("SERVING_DATABASE_URL, TARGET_DATABASE_URL, DATABASE_URL, or --serving-url is required.");
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
    const warehousePitches = await fetchOne(warehouse, "select count(*)::int as row_count from public.pitches");
    const servingPitches = await fetchOne(serving, "select count(*)::int as row_count from public.pitches");
    const warehouseCounts = await fetchOne(
      warehouse,
      `select
         (select count(*)::int from public.serving_run_expectancy_fallbacks) as run_expectancy_fallbacks,
         (select count(*)::int from public.serving_win_expectancy_fallbacks) as win_expectancy_fallbacks,
         (select count(*)::int from public.serving_count_state_outcome_baselines) as count_state_baselines`,
    );
    const servingCounts = await fetchOne(
      serving,
      `select
         (select count(*)::int from public.serving_run_expectancy_fallbacks) as run_expectancy_fallbacks,
         (select count(*)::int from public.serving_win_expectancy_fallbacks) as win_expectancy_fallbacks,
         (select count(*)::int from public.serving_count_state_outcome_baselines) as count_state_baselines`,
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
        pitches: {
          warehouse: warehousePitches.row_count,
          serving: servingPitches.row_count,
        },
        servingFallbacks: {
          warehouse: warehouseCounts,
          serving: servingCounts,
        },
      },
      cutoffs: {
        warehouse: warehouseDates,
        serving: servingDates,
      },
      driftFlags: {
        gamesOutOfSync: gamesOnlyInServing > 0 || gamesOnlyInWarehouse > 0,
        challengesOutOfSync: challengesOnlyInServing > 0 || challengesOnlyInWarehouse > 0,
        servingFallbacksOutOfSync:
          warehouseCounts.run_expectancy_fallbacks !== servingCounts.run_expectancy_fallbacks ||
          warehouseCounts.win_expectancy_fallbacks !== servingCounts.win_expectancy_fallbacks ||
          warehouseCounts.count_state_baselines !== servingCounts.count_state_baselines,
      },
    };

    if (writeArtifact) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      const fileName = `warehouse-serving-${artifact.generatedAt.replaceAll(":", "-")}.json`;
      fs.writeFileSync(path.join(RUNTIME_DIR, fileName), `${JSON.stringify(artifact, null, 2)}\n`);
    }

    console.log(JSON.stringify(artifact, null, 2));
    if (failOnDrift && (artifact.driftFlags.gamesOutOfSync || artifact.driftFlags.challengesOutOfSync)) {
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
