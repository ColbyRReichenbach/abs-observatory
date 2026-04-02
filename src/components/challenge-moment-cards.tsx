import Link from "next/link";

import { formatLeverageBucketLabel, getEstimatedLeverageBucket } from "@/lib/estimated-leverage";
import { withViewModeHref } from "@/lib/view-mode-href";
import type { HomeChallengeMoment } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function ChallengeMomentCards({ moments, viewMode }: { moments: HomeChallengeMoment[]; viewMode?: ViewMode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-2xl font-display uppercase tracking-[0.06em] text-[var(--ink-0)]">
          Top ABS Moments
        </h2>
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
          Ranked by moment score
        </span>
      </div>
      {moments.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">No recent challenge moments available.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {moments.slice(0, 6).map((moment) => (
          <Link
            key={moment.challengeId}
            href={withViewModeHref(`/game/${moment.gamePk}?challengeId=${moment.challengeId}#abs-explorer`, viewMode)}
            prefetch={false}
            className="panel panel-interactive group relative overflow-hidden p-4 transition-all duration-[var(--motion-mid)]"
          >
            {/* Leverage indicator bar */}
            <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-[var(--radius-lg)]"
              style={{
                background: moment.isOverturned
                  ? "var(--state-overturned-bs)"
                  : "var(--state-confirmed)",
                opacity: 0.6,
              }}
            />

            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                {formatLeverageBucketLabel(getEstimatedLeverageBucket(moment.leverageScore))}
              </span>
              <span className={`status-chip text-[9px] ${moment.isOverturned ? "status-chip-final" : "status-chip-live"}`}>
                {moment.isOverturned ? "Overturned" : "Confirmed"}
              </span>
            </div>

            <p className="mt-3 text-sm font-semibold text-[var(--ink-0)]">{moment.gameLabel}</p>

            <p className="mt-1.5 text-xs text-[var(--ink-2)]">
              {moment.halfInning ?? ""} {moment.inning ?? "-"} | {moment.challengeTeamName ?? "Unknown team"}
              <span className="ml-2 font-mono text-[var(--ink-3)] font-black">
                {moment.umpireCount || `${moment.balls ?? 0}-${moment.strikes ?? 0}`}
              </span>
            </p>

            {moment.calledDescription ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-3)]">
                {moment.calledDescription}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
