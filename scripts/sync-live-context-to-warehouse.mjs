import { Client } from "pg";
import { loadDefaultEnv } from "./lib/env.mjs";

const ROOT = process.cwd();
const DEFAULT_START_DATE = "2026-02-20";
const BATCH_SIZE = 500;
const MLB_GAME_TIME_ZONE = "America/New_York";

loadDefaultEnv(ROOT);

const warehouseUrl = process.env.WAREHOUSE_DATABASE_URL;
const servingUrl = process.env.SERVING_DATABASE_URL || process.env.DATABASE_URL;

if (!warehouseUrl) throw new Error("WAREHOUSE_DATABASE_URL is required");
if (!servingUrl) throw new Error("SERVING_DATABASE_URL or DATABASE_URL is required");

function isLocalConnection(connectionString) {
  const parsed = new URL(connectionString);
  return ["", "localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
}

if (isLocalConnection(warehouseUrl) && process.env.ALLOW_LOCAL_WAREHOUSE_SYNC !== "1") {
  throw new Error(
    "WAREHOUSE_DATABASE_URL resolves to a local database. Set WAREHOUSE_DATABASE_URL to the hosted warehouse, or set ALLOW_LOCAL_WAREHOUSE_SYNC=1 if this local sync is intentional.",
  );
}

function todayInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new Error(`Unable to resolve current date for ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

function gameDateEtWindowClause(dateExpression) {
  return `(${dateExpression} >= ($1::date::timestamp AT TIME ZONE '${MLB_GAME_TIME_ZONE}') AND ${dateExpression} < (($2::date + INTERVAL '1 day')::timestamp AT TIME ZONE '${MLB_GAME_TIME_ZONE}'))`;
}

const gameDateWindow = gameDateEtWindowClause("g.game_date");
const unaliasedGameDateWindow = gameDateEtWindowClause("game_date");

const startDate = process.argv.includes("--start-date")
  ? process.argv[process.argv.indexOf("--start-date") + 1]
  : DEFAULT_START_DATE;
const endDate = process.argv.includes("--end-date")
  ? process.argv[process.argv.indexOf("--end-date") + 1]
  : todayInTimeZone(MLB_GAME_TIME_ZONE);

function describeTarget(connectionString, role) {
  const parsed = new URL(connectionString);
  return `${role}=host:${parsed.hostname || "local_socket"} db:${parsed.pathname.replace(/^\//, "") || "postgres"}`;
}

function chunk(items, size) {
  const out = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function buildInsertQuery(table, columns, conflictTarget, updateColumns, rowCount) {
  const valuePlaceholders = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const start = rowIndex * columns.length;
    valuePlaceholders.push(
      `(${columns.map((_, columnIndex) => `$${start + columnIndex + 1}`).join(", ")})`,
    );
  }

  const updates = updateColumns
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(",\n          ");

  return `
    INSERT INTO ${table} (
      ${columns.join(", ")}
    ) VALUES
      ${valuePlaceholders.join(",\n      ")}
    ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET
          ${updates}
  `;
}

async function fetchRows(source, query, params = []) {
  const { rows } = await source.query(query, params);
  return rows;
}

async function upsertRows(target, config, rows) {
  if (!rows.length) return 0;
  const batches = chunk(rows, BATCH_SIZE);
  for (const batch of batches) {
    const values = batch.flatMap((row) => config.columns.map((column) => row[column]));
    const query = buildInsertQuery(
      config.table,
      config.columns,
      config.conflictTarget,
      config.updateColumns,
      batch.length,
    );
    await target.query(query, values);
  }
  return rows.length;
}

async function deleteMissingAbsChallenges(target, rows) {
  const sourceKeys = rows.map((row) => row.dedupe_key).filter(Boolean);
  const { rowCount } = await target.query(
    `
    DELETE FROM abs_challenges target
    USING games g
    WHERE g.game_pk = target.game_pk
      AND ${gameDateWindow}
      AND NOT (target.dedupe_key = ANY($3::text[]))
    `,
    [startDate, endDate, sourceKeys],
  );
  return rowCount ?? 0;
}

const tableConfigs = [
  {
    name: "games",
    table: "games",
    columns: [
      "game_pk",
      "game_date",
      "game_type",
      "season",
      "status_abstract",
      "status_detailed",
      "home_team_id",
      "away_team_id",
      "home_score",
      "away_score",
      "has_abs",
      "venue_name",
    ],
    conflictTarget: ["game_pk"],
    updateColumns: [
      "game_date",
      "game_type",
      "season",
      "status_abstract",
      "status_detailed",
      "home_team_id",
      "away_team_id",
      "home_score",
      "away_score",
      "has_abs",
      "venue_name",
    ],
    sourceQuery: `
      SELECT
        game_pk, game_date, game_type, season, status_abstract, status_detailed,
        home_team_id, away_team_id, home_score, away_score, has_abs, venue_name
      FROM games
      WHERE ${unaliasedGameDateWindow}
      ORDER BY game_date, game_pk
    `,
  },
  {
    name: "officials",
    table: "officials",
    columns: ["game_pk", "official_id", "official_name", "official_type"],
    conflictTarget: ["game_pk", "official_id", "official_type"],
    updateColumns: ["official_name"],
    sourceQuery: `
      SELECT
        o.game_pk, o.official_id, o.official_name, o.official_type
      FROM officials o
      JOIN games g ON g.game_pk = o.game_pk
      WHERE ${gameDateWindow}
      ORDER BY o.game_pk, o.official_type, o.official_id
    `,
  },
  {
    name: "at_bats",
    table: "at_bats",
    columns: [
      "game_pk",
      "at_bat_index",
      "inning",
      "half_inning",
      "start_time",
      "end_time",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "event_type",
      "event_description",
      "balls",
      "strikes",
      "outs",
      "is_complete",
      "is_scoring_play",
      "bases_state_start",
      "bases_state_end",
      "home_score_start",
      "away_score_start",
      "home_score_end",
      "away_score_end",
    ],
    conflictTarget: ["game_pk", "at_bat_index"],
    updateColumns: [
      "inning",
      "half_inning",
      "start_time",
      "end_time",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "event_type",
      "event_description",
      "balls",
      "strikes",
      "outs",
      "is_complete",
      "is_scoring_play",
      "bases_state_start",
      "bases_state_end",
      "home_score_start",
      "away_score_start",
      "home_score_end",
      "away_score_end",
    ],
    sourceQuery: `
      SELECT
        a.game_pk, a.at_bat_index, a.inning, a.half_inning, a.start_time, a.end_time,
        a.batter_id, a.batter_name, a.pitcher_id, a.pitcher_name, a.event_type, a.event_description,
        a.balls, a.strikes, a.outs, a.is_complete, a.is_scoring_play, a.bases_state_start, a.bases_state_end,
        a.home_score_start, a.away_score_start, a.home_score_end, a.away_score_end
      FROM at_bats a
      JOIN games g ON g.game_pk = a.game_pk
      WHERE ${gameDateWindow}
      ORDER BY a.game_pk, a.at_bat_index
    `,
  },
  {
    name: "pitches",
    table: "pitches",
    columns: [
      "game_pk",
      "at_bat_index",
      "pitch_number",
      "called_code",
      "called_description",
      "is_ball",
      "is_strike",
      "pitch_type_code",
      "pitch_type_description",
      "start_speed",
      "end_speed",
      "spin_rate",
      "px",
      "pz",
      "strike_zone_top",
      "strike_zone_bottom",
      "zone",
      "has_review",
      "play_event_index",
      "inning",
      "half_inning",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "play_description",
      "is_in_play",
      "ended_plate_appearance",
      "balls_before",
      "strikes_before",
      "outs_before",
      "balls_after",
      "strikes_after",
      "outs_after",
      "bases_state_before",
      "bases_state_after",
      "home_score_before",
      "away_score_before",
      "home_score_after",
      "away_score_after",
      "gameday_x",
      "gameday_y",
    ],
    conflictTarget: ["game_pk", "at_bat_index", "pitch_number"],
    updateColumns: [
      "called_code",
      "called_description",
      "is_ball",
      "is_strike",
      "pitch_type_code",
      "pitch_type_description",
      "start_speed",
      "end_speed",
      "spin_rate",
      "px",
      "pz",
      "strike_zone_top",
      "strike_zone_bottom",
      "zone",
      "has_review",
      "play_event_index",
      "inning",
      "half_inning",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "play_description",
      "is_in_play",
      "ended_plate_appearance",
      "balls_before",
      "strikes_before",
      "outs_before",
      "balls_after",
      "strikes_after",
      "outs_after",
      "bases_state_before",
      "bases_state_after",
      "home_score_before",
      "away_score_before",
      "home_score_after",
      "away_score_after",
      "gameday_x",
      "gameday_y",
    ],
    sourceQuery: `
      SELECT
        p.game_pk, p.at_bat_index, p.pitch_number, p.called_code, p.called_description, p.is_ball, p.is_strike,
        p.pitch_type_code, p.pitch_type_description, p.start_speed, p.end_speed, p.spin_rate, p.px, p.pz,
        p.strike_zone_top, p.strike_zone_bottom, p.zone, p.has_review, p.play_event_index, p.inning, p.half_inning,
        p.batter_id, p.batter_name, p.pitcher_id, p.pitcher_name, p.play_description, p.is_in_play,
        p.ended_plate_appearance, p.balls_before, p.strikes_before, p.outs_before, p.balls_after, p.strikes_after,
        p.outs_after, p.bases_state_before, p.bases_state_after, p.home_score_before, p.away_score_before,
        p.home_score_after, p.away_score_after, p.gameday_x, p.gameday_y
      FROM pitches p
      JOIN games g ON g.game_pk = p.game_pk
      WHERE ${gameDateWindow}
      ORDER BY p.game_pk, p.at_bat_index, p.pitch_number
    `,
  },
  {
    name: "abs_challenges",
    table: "abs_challenges",
    columns: [
      "dedupe_key",
      "game_pk",
      "at_bat_index",
      "pitch_number",
      "challenge_level",
      "challenge_team_id",
      "challenge_team_side",
      "challenge_player_id",
      "challenge_player_name",
      "is_overturned",
      "review_type",
      "in_progress",
      "called_code",
      "called_description",
      "inning",
      "half_inning",
      "balls",
      "strikes",
      "outs",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "home_score",
      "away_score",
      "bases_state",
      "px",
      "pz",
      "strike_zone_top",
      "strike_zone_bottom",
      "challenged_at",
      "gameday_x",
      "gameday_y",
      "inferred_pitch_number",
      "inferred_play_event_index",
      "inferred_px",
      "inferred_pz",
      "inferred_strike_zone_top",
      "inferred_strike_zone_bottom",
      "inferred_zone",
      "inferred_gameday_x",
      "inferred_gameday_y",
      "inference_method",
      "inference_confidence",
      "location_source",
    ],
    conflictTarget: ["dedupe_key"],
    updateColumns: [
      "game_pk",
      "at_bat_index",
      "pitch_number",
      "challenge_level",
      "challenge_team_id",
      "challenge_team_side",
      "challenge_player_id",
      "challenge_player_name",
      "is_overturned",
      "review_type",
      "in_progress",
      "called_code",
      "called_description",
      "inning",
      "half_inning",
      "balls",
      "strikes",
      "outs",
      "batter_id",
      "batter_name",
      "pitcher_id",
      "pitcher_name",
      "home_score",
      "away_score",
      "bases_state",
      "px",
      "pz",
      "strike_zone_top",
      "strike_zone_bottom",
      "challenged_at",
      "gameday_x",
      "gameday_y",
      "inferred_pitch_number",
      "inferred_play_event_index",
      "inferred_px",
      "inferred_pz",
      "inferred_strike_zone_top",
      "inferred_strike_zone_bottom",
      "inferred_zone",
      "inferred_gameday_x",
      "inferred_gameday_y",
      "inference_method",
      "inference_confidence",
      "location_source",
    ],
    sourceQuery: `
      SELECT
        c.dedupe_key, c.game_pk, c.at_bat_index, c.pitch_number, c.challenge_level, c.challenge_team_id,
        c.challenge_team_side, c.challenge_player_id, c.challenge_player_name, c.is_overturned, c.review_type,
        c.in_progress, c.called_code, c.called_description, c.inning, c.half_inning, c.balls, c.strikes, c.outs,
        c.batter_id, c.batter_name, c.pitcher_id, c.pitcher_name, c.home_score, c.away_score, c.bases_state, c.px,
        c.pz, c.strike_zone_top, c.strike_zone_bottom, c.challenged_at, c.gameday_x, c.gameday_y,
        c.inferred_pitch_number, c.inferred_play_event_index, c.inferred_px, c.inferred_pz,
        c.inferred_strike_zone_top, c.inferred_strike_zone_bottom, c.inferred_zone, c.inferred_gameday_x,
        c.inferred_gameday_y, c.inference_method, c.inference_confidence, c.location_source
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      WHERE ${gameDateWindow}
      ORDER BY c.game_pk, c.at_bat_index, c.pitch_number NULLS FIRST
    `,
  },
  {
    name: "game_state_snapshots",
    table: "game_state_snapshots",
    columns: [
      "game_pk",
      "snapshot_time",
      "inning",
      "half_inning",
      "balls",
      "strikes",
      "outs",
      "home_score",
      "away_score",
      "abs_away_used_successful",
      "abs_away_used_failed",
      "abs_away_remaining",
      "abs_home_used_successful",
      "abs_home_used_failed",
      "abs_home_remaining",
    ],
    conflictTarget: ["game_pk", "snapshot_time"],
    updateColumns: [
      "inning",
      "half_inning",
      "balls",
      "strikes",
      "outs",
      "home_score",
      "away_score",
      "abs_away_used_successful",
      "abs_away_used_failed",
      "abs_away_remaining",
      "abs_home_used_successful",
      "abs_home_used_failed",
      "abs_home_remaining",
    ],
    sourceQuery: `
      SELECT
        s.game_pk, s.snapshot_time, s.inning, s.half_inning, s.balls, s.strikes, s.outs, s.home_score, s.away_score,
        s.abs_away_used_successful, s.abs_away_used_failed, s.abs_away_remaining,
        s.abs_home_used_successful, s.abs_home_used_failed, s.abs_home_remaining
      FROM game_state_snapshots s
      JOIN games g ON g.game_pk = s.game_pk
      WHERE ${gameDateWindow}
      ORDER BY s.game_pk, s.snapshot_time
    `,
  },
];

async function main() {
  console.info(
    `[sync-live-context-to-warehouse] ${describeTarget(servingUrl, "source")} ${describeTarget(warehouseUrl, "target")} window=${startDate}..${endDate}`,
  );

  const source = new Client({ connectionString: servingUrl });
  const target = new Client({ connectionString: warehouseUrl });

  await source.connect();
  await target.connect();

  try {
    await target.query("BEGIN");
    const results = [];
    for (const config of tableConfigs) {
      const rows = await fetchRows(source, config.sourceQuery, [startDate, endDate]);
      const deleted = config.name === "abs_challenges" ? await deleteMissingAbsChallenges(target, rows) : 0;
      const synced = await upsertRows(target, config, rows);
      results.push({ table: config.table, synced, deleted });
    }
    await target.query("COMMIT");
    for (const result of results) {
      console.info(`[sync-live-context-to-warehouse] ${result.table} synced_rows=${result.synced} deleted_rows=${result.deleted}`);
    }
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
