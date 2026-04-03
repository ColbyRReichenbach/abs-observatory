import { sqlOne } from "@/lib/db";
import { getCacheKey, getCachedValue, setCachedValue } from "@/lib/server/scale";

const DATA_VERSION_CACHE_TTL_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MINUTES = 5;

type VersionRow = {
  version: string | null;
};

function shiftIsoDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function easternDateParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  const normalizedHour = Number(part("hour") || "0") % 24;

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: normalizedHour,
  };
}

export function getPollIntervalMinutes() {
  const configured = Number(process.env.POLL_INTERVAL_MINUTES ?? String(DEFAULT_POLL_INTERVAL_MINUTES));
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_POLL_INTERVAL_MINUTES;
  }
  return Math.max(1, Math.floor(configured));
}

export function getCandidateEtDates(now = new Date()) {
  const { date, hour } = easternDateParts(now);
  if (hour >= 4) {
    return [date];
  }

  return [shiftIsoDate(date, -1), date];
}

export async function getLatestSuccessfulEtlDataVersion() {
  const cacheKey = getCacheKey(["data-version", "latest-successful-etl"]);
  const cached = getCachedValue<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await sqlOne<VersionRow>(
    `
    SELECT MAX(finished_at)::text AS version
    FROM etl_runs
    WHERE status = 'success'
      AND finished_at IS NOT NULL
    `,
  );

  const version = row?.version ?? "no-etl-success";
  setCachedValue(cacheKey, version, DATA_VERSION_CACHE_TTL_MS);
  return version;
}

export async function getGameDataVersion(gamePk: number) {
  const cacheKey = getCacheKey(["data-version", "game", gamePk]);
  const cached = getCachedValue<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await sqlOne<VersionRow>(
    `
    SELECT COALESCE(MAX(version_at)::text, 'no-game-data') AS version
    FROM (
      SELECT g.updated_at AS version_at
      FROM games g
      WHERE g.game_pk = $1

      UNION ALL

      SELECT MAX(gl.updated_at) AS version_at
      FROM ops.game_linescores gl
      WHERE gl.game_pk = $1

      UNION ALL

      SELECT MAX(s.snapshot_time) AS version_at
      FROM game_state_snapshots s
      WHERE s.game_pk = $1

      UNION ALL

      SELECT MAX(c.challenged_at) AS version_at
      FROM abs_challenges c
      WHERE c.game_pk = $1

      UNION ALL

      SELECT MAX(t.updated_at) AS version_at
      FROM team_abs_game_summary t
      WHERE t.game_pk = $1
    ) versions
    `,
    [gamePk],
  );

  const version = row?.version ?? "no-game-data";
  setCachedValue(cacheKey, version, DATA_VERSION_CACHE_TTL_MS);
  return version;
}

export async function getGlobalLiveDataVersion() {
  const cacheKey = getCacheKey(["data-version", "global-live"]);
  const cached = getCachedValue<string>(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await sqlOne<VersionRow>(
    `
    WITH candidate_dates AS (
      SELECT UNNEST($1::date[]) AS et_date
    ),
    candidate_games AS (
      SELECT DISTINCT g.game_pk
      FROM games g
      JOIN candidate_dates d
        ON (g.game_date AT TIME ZONE 'America/New_York')::date = d.et_date
    )
    SELECT COALESCE(MAX(version_at)::text, 'no-live-data') AS version
    FROM (
      SELECT MAX(g.updated_at) AS version_at
      FROM games g
      WHERE g.game_pk IN (SELECT game_pk FROM candidate_games)

      UNION ALL

      SELECT MAX(gl.updated_at) AS version_at
      FROM ops.game_linescores gl
      WHERE gl.game_pk IN (SELECT game_pk FROM candidate_games)

      UNION ALL

      SELECT MAX(s.snapshot_time) AS version_at
      FROM game_state_snapshots s
      WHERE s.game_pk IN (SELECT game_pk FROM candidate_games)

      UNION ALL

      SELECT MAX(t.updated_at) AS version_at
      FROM team_abs_game_summary t
      WHERE t.game_pk IN (SELECT game_pk FROM candidate_games)

      UNION ALL

      SELECT MAX(c.challenged_at) AS version_at
      FROM abs_challenges c
      WHERE c.game_pk IN (SELECT game_pk FROM candidate_games)

      UNION ALL

      SELECT MAX(finished_at) AS version_at
      FROM etl_runs
      WHERE status = 'success'
        AND finished_at IS NOT NULL
    ) versions
    `,
    [getCandidateEtDates()],
  );

  const version = row?.version ?? "no-live-data";
  setCachedValue(cacheKey, version, DATA_VERSION_CACHE_TTL_MS);
  return version;
}
