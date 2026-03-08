"use client";

import { motion } from "framer-motion";

interface StandingTeam {
    rank: number;
    name: string;
    abbreviation: string;
    record: string;
    movement: "up" | "down" | "same";
    movementValue?: number;
}

interface StandingsPulseProps {
    al: StandingTeam[];
    nl: StandingTeam[];
}

export function StandingsPulse({ al, nl }: StandingsPulseProps) {
    const renderLeague = (title: string, teams: StandingTeam[]) => (
        <div className="mb-8 last:mb-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-black border-b border-black/10 pb-1">
                {title} <span className="text-gray-400">Top 3</span>
            </h4>
            <div className="space-y-3">
                {teams.map((team) => (
                    <div key={team.abbreviation} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-gray-400">{team.rank}</span>
                            <span className="text-xs font-bold uppercase tracking-tight group-hover:text-[#8b0000] transition-colors">
                                {team.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-serif italic text-gray-500">{team.record}</span>
                            <span className={`text-[9px] font-black ${team.movement === "up" ? "text-green-600" :
                                    team.movement === "down" ? "text-red-600" :
                                        "text-gray-300"
                                }`}>
                                {team.movement === "up" ? `^${team.movementValue || ""}` :
                                    team.movement === "down" ? `v${team.movementValue || ""}` : "-"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-[#fffdf8] border border-black/5 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Standings Pulse</span>
            </div>

            {renderLeague("American League", al)}
            <div className="h-px bg-black/5 my-6" />
            {renderLeague("National League", nl)}

            <div className="mt-6 pt-6 border-t border-black/5">
                <p className="text-[8px] font-serif italic leading-tight text-gray-400">
                    * Movement calculated relative to the previous 24-hour cycle.
                    Calculations verified by <span className="font-bold uppercase not-italic">Theo Telemetry</span>.
                </p>
            </div>
        </div>
    );
}
