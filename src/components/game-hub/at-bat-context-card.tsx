"use client";

import { motion } from "framer-motion";
import { BaseStateDiamond } from "@/components/game-hub/base-state-diamond";
import { formatBasesStateLabel, getChallengeScenarioTags } from "@/lib/challenge-context";
import { summarizeEstimatedLeverage } from "@/lib/estimated-leverage";
import type { ChallengeEvent } from "@/lib/types";

export function AtBatContextCard({ challenge }: { challenge: ChallengeEvent }) {
    const pitchVelocity = challenge.startSpeed ? `${challenge.startSpeed.toFixed(1)} MPH` : "N/A";
    const pitchType = challenge.pitchType || "Unknown";
    const countSnapshot = challenge.countBefore ?? (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : "Unavailable");
    const countChange = challenge.umpireCount && challenge.countAfter
        ? challenge.umpireCount === challenge.countAfter
            ? challenge.countAfter
            : `${challenge.umpireCount} → ${challenge.countAfter}`
        : countSnapshot;
    const location = challenge.px !== null && challenge.pz !== null
        ? `${challenge.px.toFixed(2)} x, ${challenge.pz.toFixed(2)} z`
        : "Location unavailable";
    const leverage = summarizeEstimatedLeverage(challenge);
    const scenarioTags = getChallengeScenarioTags(challenge);
    const scoreState =
        challenge.homeScore === null || challenge.awayScore === null
            ? "Score unavailable"
            : challenge.homeScore === challenge.awayScore
                ? `Tie ${challenge.awayScore}-${challenge.homeScore}`
                : `${challenge.awayScore}-${challenge.homeScore}`;
    const inningLabel = `${challenge.halfInning === "Top" ? "Top" : challenge.halfInning === "Bottom" ? "Bot" : "?"} ${challenge.inning ?? "-"}`;
    const baseStateLabel = formatBasesStateLabel(challenge.basesState);

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full mt-2"
        >
            <div className="bg-gray-100/50 border border-gray-200/50 rounded-xl p-4 ml-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Challenge Context
                </h5>

                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200/50 bg-white/60 px-3 py-3">
                    <BaseStateDiamond basesState={challenge.basesState} size={52} />
                    <div className="min-w-[140px] flex-1">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Base / Score State</p>
                        <p className="mt-1 text-xs font-bold text-slate-900">{baseStateLabel}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-600">
                            {inningLabel} • {scoreState} • {challenge.outs ?? 0} out{(challenge.outs ?? 0) === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div className="min-w-[96px] rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-right">
                        <p className="text-[9px] uppercase tracking-wider text-blue-500 font-bold">Estimated Leverage</p>
                        <p className="mt-1 text-xl font-display text-slate-900">{leverage.estimatedLeverageIndex}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Pitch</span>
                        <span className="text-xs font-bold text-slate-900">{pitchType}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Velocity</span>
                        <span className="text-xs font-bold text-slate-900">{pitchVelocity}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Count Change</span>
                        <span className="text-xs font-bold text-slate-900">{countChange}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Location</span>
                        <span className="text-xs font-bold text-slate-900">{location}</span>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200/50 bg-white/50 p-3">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Review Path</span>
                        <p className="mt-1 text-xs font-bold text-slate-900">
                            {challenge.umpireCount && challenge.countAfter
                                ? challenge.umpireCount === challenge.countAfter
                                    ? challenge.countAfter
                                    : `${challenge.umpireCount} -> ${challenge.countAfter}`
                                : countSnapshot}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200/50 bg-white/50 p-3">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Pressure Band</span>
                        <p className="mt-1 text-xs font-bold text-slate-900">{leverage.leverageBucket.toUpperCase()} pressure</p>
                    </div>
                </div>

                {scenarioTags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {scenarioTags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}

                {challenge.impactSummary ? (
                    <div className="mt-4 border-t border-gray-200/50 pt-3">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Recorded Impact</span>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{challenge.impactSummary}</p>
                    </div>
                ) : null}
            </div>
        </motion.div>
    );
}
