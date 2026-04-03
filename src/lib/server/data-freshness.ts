import { sqlOne } from "@/lib/db";
import { getCandidateEtDates, getLatestSuccessfulEtlDataVersion, getPollIntervalMinutes } from "@/lib/server/data-version";

type FreshnessRow = {
  status: string;
  finished_at: string | null;
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
  const [latestRun, liveCount, dataVersion] = await Promise.all([
    sqlOne<FreshnessRow>(
      `
        SELECT status, finished_at
        FROM etl_runs
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `,
    ),
    sqlOne<LiveCountRow>(
      `
        SELECT COUNT(*)::text AS live_count
        FROM games
        WHERE LOWER(status_abstract) = 'live'
          AND ((game_date AT TIME ZONE 'America/New_York')::date) = ANY($1::date[])
      `,
      [getCandidateEtDates()],
    ),
    getLatestSuccessfulEtlDataVersion(),
  ]);

  return {
    lastFinishedAt: latestRun?.finished_at ?? null,
    lastStatus:
      latestRun?.status === "success" || latestRun?.status === "failed" || latestRun?.status === "running"
        ? latestRun.status
        : "unknown",
    liveGameCount: Number(liveCount?.live_count ?? "0"),
    dataVersion,
    pollIntervalMinutes: getPollIntervalMinutes(),
  };
}
