"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { InningIcon } from "@/components/inning-icon";

import type { HomeChallengeMoment, LiveGameCard } from "@/lib/types";

type BroadcastStripProps = {
  games: LiveGameCard[];
  moments: HomeChallengeMoment[];
};

export function BroadcastStrip({ games, moments }: BroadcastStripProps) {
  const items = useMemo(() => {
    const gameItems = games.slice(0, 8).map((game) => ({
      key: `g-${game.gamePk}`,
      href: `/game/${game.gamePk}`,
      label: `${game.awayTeamAbbreviation} vs ${game.homeTeamAbbreviation}`,
      score: `${game.awayScore ?? 0}-${game.homeScore ?? 0}`,
      tag: game.status,
      inning: game.inning,
      half: game.inningHalf,
      type: "Matchup",
    }));
    const momentItems = moments.slice(0, 8).map((moment) => ({
      key: `m-${moment.challengeId}`,
      href: `/game/${moment.gamePk}`,
      label: `${moment.gameLabel || "ABS Challenge"}`,
      score: `${moment.isOverturned ? "Overturned" : "Confirmed"}`,
      tag: "Challenge",
      inning: moment.inning,
      half: moment.halfInning,
      type: "Moment",
    }));
    return [...gameItems, ...momentItems];
  }, [games, moments]);

  // Double items for seamless loop
  const marqueeItems = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <section className="relative flex items-center bg-white/40 border-b border-gray-100 overflow-hidden h-16 group">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex items-center gap-12 whitespace-nowrap px-12"
        animate={{ x: [0, -items.length * 360] }}
        transition={{
          duration: items.length * 10,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ width: "fit-content" }}
      >
        {marqueeItems.map((item, idx) => (
          <Link
            key={`${item.key}-${idx}`}
            href={item.href}
            className="flex items-center gap-6 group/item"
          >
            <div className="flex items-center gap-3">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${item.tag === 'Live' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {item.tag}
              </span>
              <span className="text-[14px] font-black tracking-tight text-gray-900 group-hover/item:text-blue-600 transition-colors">
                {item.label}
              </span>
            </div>

            <div className="flex items-center gap-4 bg-white/50 px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
              <span className="font-mono text-xs font-bold text-blue-600">{item.score}</span>
              {item.inning && (
                <InningIcon inning={item.inning} half={item.half ?? ""} className="scale-75" />
              )}
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">
              {item.type}
            </span>

            {/* Separator Ball */}
            <div className="w-1 h-1 rounded-full bg-gray-200 ml-6" />
          </Link>
        ))}
      </motion.div>
    </section>
  );
}


