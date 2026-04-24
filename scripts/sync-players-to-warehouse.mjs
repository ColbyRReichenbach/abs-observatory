import { Client } from "pg";
import { loadDefaultEnv } from "./lib/env.mjs";

const ROOT = process.cwd();

loadDefaultEnv(ROOT);

const warehouseUrl = process.env.WAREHOUSE_DATABASE_URL;
const servingUrl = process.env.SERVING_DATABASE_URL || process.env.DATABASE_URL;

if (!warehouseUrl) {
  throw new Error("WAREHOUSE_DATABASE_URL is required");
}
if (!servingUrl) {
  throw new Error("SERVING_DATABASE_URL or DATABASE_URL is required");
}

function describeTarget(connectionString, role) {
  const parsed = new URL(connectionString);
  return `${role}=host:${parsed.hostname || "local_socket"} db:${parsed.pathname.replace(/^\//, "") || "postgres"}`;
}

async function main() {
  console.info(`[sync-players-to-warehouse] ${describeTarget(servingUrl, "source")} ${describeTarget(warehouseUrl, "target")}`);

  const source = new Client({ connectionString: servingUrl });
  const target = new Client({ connectionString: warehouseUrl });

  await source.connect();
  await target.connect();

  try {
    const { rows } = await source.query(`
      SELECT
        player_id,
        full_name,
        height_text,
        height_inches,
        abs_strike_zone_top,
        abs_strike_zone_bottom,
        active,
        source_payload,
        source_updated_at
      FROM public.players
    `);

    await target.query("BEGIN");
    await target.query(`
      CREATE TABLE IF NOT EXISTS players (
        player_id BIGINT PRIMARY KEY,
        full_name TEXT NOT NULL,
        height_text TEXT,
        height_inches NUMERIC,
        abs_strike_zone_top NUMERIC,
        abs_strike_zone_bottom NUMERIC,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        source_payload JSONB,
        source_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const text = `
      INSERT INTO players (
        player_id,
        full_name,
        height_text,
        height_inches,
        abs_strike_zone_top,
        abs_strike_zone_bottom,
        active,
        source_payload,
        source_updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (player_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        height_text = COALESCE(EXCLUDED.height_text, players.height_text),
        height_inches = COALESCE(EXCLUDED.height_inches, players.height_inches),
        abs_strike_zone_top = COALESCE(EXCLUDED.abs_strike_zone_top, players.abs_strike_zone_top),
        abs_strike_zone_bottom = COALESCE(EXCLUDED.abs_strike_zone_bottom, players.abs_strike_zone_bottom),
        active = EXCLUDED.active,
        source_payload = COALESCE(EXCLUDED.source_payload, players.source_payload),
        source_updated_at = COALESCE(EXCLUDED.source_updated_at, players.source_updated_at),
        updated_at = NOW()
    `;

    for (const row of rows) {
      await target.query(text, [
        row.player_id,
        row.full_name,
        row.height_text,
        row.height_inches,
        row.abs_strike_zone_top,
        row.abs_strike_zone_bottom,
        row.active,
        row.source_payload,
        row.source_updated_at,
      ]);
    }

    await target.query("COMMIT");
    console.info(`[sync-players-to-warehouse] synced_rows=${rows.length}`);
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
