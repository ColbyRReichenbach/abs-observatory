"use client";

import { formatCountTransitionLabel, formatHalfInningLabel } from "@/lib/challenge-context";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { GameChallengeImpactSummary } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

function signedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function signedRun(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function inningLabel(halfInning?: string | null, inning?: number | null) {
  return `${formatHalfInningLabel(halfInning, "short")} ${inning ?? "-"}`;
}

export function GameImpactStoryCards({
  summary,
  viewMode,
}: {
  summary: GameChallengeImpactSummary;
  viewMode: ViewMode;
}) {
  const bestValueMoment =
    viewMode === "org" && summary.biggestWinValue ? summary.biggestWinValue : summary.biggestRunValue ?? summary.biggestSwing;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <StoryCard
        eyebrow={viewMode === "org" ? "Biggest Consequence" : "Loudest Review"}
        title={
          summary.biggestSwing
            ? `${summary.biggestSwing.challengeTeamName ?? "Team"} ${summary.biggestSwing.isOverturned ? "won" : "lost"} the biggest swing`
            : "No challenge moments yet"
        }
        detail={
          summary.biggestSwing
            ? `${inningLabel(summary.biggestSwing.halfInning, summary.biggestSwing.inning)} • ${
                summary.biggestSwing.calledDescription ?? "Pitch challenge"
              } • ${summary.biggestSwing.estimatedChallengeSwing >= 0 ? "+" : ""}${summary.biggestSwing.estimatedChallengeSwing} ECS`
            : "This game will fill in once reviews start."
        }
      />
      <StoryCard
        eyebrow={viewMode === "org" ? "Highest Leverage Spot" : "Tightest Spot"}
        title={
          summary.highestLeverage
            ? `${summary.highestLeverage.challengeTeamName ?? "Team"} hit ${summary.highestLeverage.estimatedLeverageIndex} ELI`
            : "No leverage spike yet"
        }
        detail={
          summary.highestLeverage
            ? `${inningLabel(summary.highestLeverage.halfInning, summary.highestLeverage.inning)} • ${formatCountTransitionLabel(
                summary.highestLeverage.umpireCount ?? summary.highestLeverage.countBefore,
                summary.highestLeverage.countAfter,
              )}`
            : "Live leverage will appear after the first tracked review."
        }
      />
      <StoryCard
        eyebrow={viewMode === "org" ? "Value Lens" : "What It Changed"}
        title={
          bestValueMoment
            ? `${bestValueMoment.challengeTeamName ?? "Team"} ${
                viewMode === "org" && bestValueMoment.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(bestValueMoment.winExpectancyConfidence)
                  ? "moved win value"
                  : "moved run value"
              }`
            : `${summary.overturnedChallenges} overturned • ${summary.confirmedChallenges} confirmed`
        }
        detail={
          bestValueMoment
            ? `${
                viewMode === "org" && bestValueMoment.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(bestValueMoment.winExpectancyConfidence)
                  ? `${signedPercent(bestValueMoment.winExpectancyDelta)} WE`
                  : `${signedRun(bestValueMoment.runExpectancyDelta)} RE`
              } • ${formatCountTransitionLabel(bestValueMoment.umpireCount ?? bestValueMoment.countBefore, bestValueMoment.countAfter)}`
            : `${summary.totalChallenges} reviewed moments in this game sample`
        }
      />
    </section>
  );
}

function StoryCard({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="panel border border-gray-50 bg-white p-5 shadow-2xl shadow-black/[0.02]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">{eyebrow}</p>
      <p className="mt-3 min-h-[3.4rem] text-lg font-display leading-tight text-gray-900">{title}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}
