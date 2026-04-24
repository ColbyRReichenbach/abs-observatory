import { sqlOne } from "@/lib/db";
import { getCandidateEtDates, getLatestSuccessfulEtlDataVersion, getPollIntervalMinutes } from "@/lib/server/data-version";

type FreshnessRow = {
  status: string;
  finished_at: string | null;
};

type LiveActivityRow = {
  latest_at: string | null;
};

type LiveCountRow = {
  live_count: string;
};

export type DataFreshnessSnapshot = {
  lastFinishedAt: string | null;
  lastStatus: "success" | "failed" | "running" | "unknown";
  liveGameCount: number;
  dataVersion: string;
  pollIntervalMinutes: number;
};

export async function getDataFreshnessSnapshot(): Promise<DataFreshnessSnapshot> {
  const candidateDates = getCandidateEtDates();

  const [latestRun, latestLiveActivity, liveCount, dataVersion] = await Promise.all([
    sqlOne<FreshnessRow>(
      `
        SELECT status, finished_at
        FROM etl_runs
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `,
    ),
    sqlOne<LiveActivityRow>(
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
        SELECT MAX(activity_at)::text AS latest_at
        FROM (
          SELECT MAX(g.updated_at) AS activity_at
          FROM games g
          WHERE g.game_pk IN (SELECT game_pk FROM candidate_games)

          UNION ALL

          SELECT MAX(gl.updated_at) AS activity_at
          FROM ops.game_linescores gl
          WHERE gl.game_pk IN (SELECT game_pk FROM candidate_games)

          UNION ALL

          SELECT MAX(s.snapshot_time) AS activity_at
          FROM game_state_snapshots s
          WHERE s.game_pk IN (SELECT game_pk FROM candidate_games)

          UNION ALL

          SELECT MAX(c.challenged_at) AS activity_at
          FROM mart_abs_pitch_challenges c
          WHERE c.game_pk IN (SELECT game_pk FROM candidate_games)

          UNION ALL

          SELECT MAX(t.updated_at) AS activity_at
          FROM team_abs_game_summary t
          WHERE t.game_pk IN (SELECT game_pk FROM candidate_games)

          UNION ALL

          SELECT MAX(u.updated_at) AS activity_at
          FROM umpire_abs_game_summary u
          WHERE u.game_pk IN (SELECT game_pk FROM candidate_games)
        ) live_activity
      `,
      [candidateDates],
    ),
    sqlOne<LiveCountRow>(
      `
        SELECT COUNT(*)::text AS live_count
        FROM games
        WHERE LOWER(status_abstract) = 'live'
          AND ((game_date AT TIME ZONE 'America/New_York')::date) = ANY($1::date[])
      `,
      [candidateDates],
    ),
    getLatestSuccessfulEtlDataVersion(),
  ]);

  const hasLiveActivity = Boolean(latestLiveActivity?.latest_at);
  const lastFinishedAt = latestLiveActivity?.latest_at ?? latestRun?.finished_at ?? null;
  const lastStatus = hasLiveActivity
    ? "success"
    : latestRun?.status === "success" || latestRun?.status === "failed" || latestRun?.status === "running"
      ? latestRun.status
      : "unknown";

  return {
    lastFinishedAt,
    lastStatus,
    liveGameCount: Number(liveCount?.live_count ?? "0"),
    dataVersion,
    pollIntervalMinutes: getPollIntervalMinutes(),
  };
}
