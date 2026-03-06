"use client";

import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { DynamicLeverageMeter } from "@/components/game-hub/dynamic-leverage-meter";
import { motion } from "framer-motion";
import type { ChallengeEvent } from "@/lib/types";

export function LiveWarRoom({ game, challenges, liveStatus, counters }: {
    game: any,
    challenges: ChallengeEvent[],
    liveStatus: any,
    counters: any
}) {
    return (
        <div className="py-6">
            <MotionIn>
                <div className="grid gap-6 lg:grid-cols-[1fr_300px] mb-6">
                    {/* Primary live visualization area */}
                    <div className="panel p-6 shadow-2xl border border-blue-100 bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                        <h4 className="absolute z-10 top-6 left-6 text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Live War Room • {game.statusabstract}
                        </h4>
                        <div className="h-80 w-full relative pt-12">
                            <DynamicLeverageMeter
                                homeScore={game.homescore ?? 0}
                                awayScore={game.awayscore ?? 0}
                                inning={liveStatus?.inning ?? 1}
                                homeColor={game.homeprimarycolor || "#3b82f6"}
                                awayColor={game.awayprimarycolor || "#8b5cf6"}
                            />
                        </div>
                    </div>

                    {/* Ammo Counters */}
                    <div className="flex flex-col gap-4 w-full">
                        <div className="panel relative p-6 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.homeprimarycolor || "#3b82f6" }} />
                            <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.homeabbreviation || "HOME"} AMMO</span>
                            <motion.span
                                key={counters?.homeRemaining}
                                initial={{ scale: 1.5, opacity: 0, color: game.homeprimarycolor || "#3b82f6" }}
                                animate={{ scale: 1, opacity: 1, color: "#111827" }}
                                className="relative z-10 text-6xl font-display mt-2"
                            >
                                {counters?.homeRemaining ?? 0}
                            </motion.span>
                        </div>
                        <div className="panel relative p-6 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.awayprimarycolor || "#8b5cf6" }} />
                            <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.awayabbreviation || "AWAY"} AMMO</span>
                            <motion.span
                                key={counters?.awayRemaining}
                                initial={{ scale: 1.5, opacity: 0, color: game.awayprimarycolor || "#8b5cf6" }}
                                animate={{ scale: 1, opacity: 1, color: "#111827" }}
                                className="relative z-10 text-6xl font-display mt-2"
                            >
                                {counters?.awayRemaining ?? 0}
                            </motion.span>
                        </div>
                    </div>
                </div>

                <section>
                    <ChallengeExplorer challenges={challenges} />
                </section>
            </MotionIn>
        </div>
    );
}
