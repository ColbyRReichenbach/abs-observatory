"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type UmpireMatchup = {
    umpireId: number;
    umpireName: string;
    challengesTotal: number;
    usedSuccessful: number;
    overturnRate: number;
};

export function UmpireMatchupMatrix({
    data,
    teamColor = "#007aff",
}: {
    data: UmpireMatchup[];
    teamColor?: string;
}) {
    const [expanded, setExpanded] = useState(false);

    // Find the max challenges for scaling
    const maxChallenges = Math.max(...data.map(d => d.challengesTotal), 1);

    if (data.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-[10px] font-black uppercase tracking-widest text-[var(--ink-4)]">
                No Matchups Found
            </div>
        );
    }

    const displayData = expanded ? data : data.slice(0, 3);

    return (
        <div className="flex flex-col gap-3">
            {displayData.map((ump, i) => {
                const totalPct = (ump.challengesTotal / maxChallenges) * 100;
                const successPct = ump.challengesTotal > 0 ? (ump.usedSuccessful / ump.challengesTotal) * 100 : 0;

                return (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        key={ump.umpireId}
                        className="group relative flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-gray-200"
                    >
                        {/* Underlay Bar for Total Challenges */}
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-gray-50 rounded-2xl -z-10 transition-all duration-1000 ease-out opacity-50 group-hover:opacity-100"
                            style={{ width: `${totalPct}%` }}
                        />
                        {/* Underlay Bar for Successes */}
                        <div
                            className="absolute left-0 top-0 bottom-0 rounded-2xl -z-10 transition-all duration-1000 ease-out opacity-10 group-hover:opacity-20"
                            style={{
                                width: `${(ump.usedSuccessful / maxChallenges) * 100}%`,
                                backgroundColor: teamColor
                            }}
                        />

                        <div className="flex items-center gap-4">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black text-gray-500 group-hover:bg-black group-hover:text-white transition-colors">
                                {i + 1}
                            </span>
                            <div className="flex flex-col">
                                <Link href={`/umpires/${ump.umpireId}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1">
                                    {ump.umpireName}
                                </Link>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                                    {ump.challengesTotal} Challenges
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Overturned</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-gray-900">{ump.usedSuccessful}</span>
                                    <span className="text-gray-300">/</span>
                                    <span className="font-mono font-semibold text-gray-400">{ump.challengesTotal}</span>
                                </div>
                            </div>

                            <div className="w-[100px] flex justify-end">
                                <span
                                    className="inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all group-hover:-translate-y-0.5"
                                    style={{
                                        backgroundColor: `${teamColor}08`,
                                        color: teamColor,
                                        borderColor: `${teamColor}20`
                                    }}
                                >
                                    {successPct.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {data.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
                >
                    {expanded ? 'Show Less' : `View All ${data.length} Umpires`}
                    <ChevronRight size={14} className={`transition-transform duration-300 ${expanded ? '-rotate-90' : 'rotate-90'}`} />
                </button>
            )}
        </div>
    );
}
