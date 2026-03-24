"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { InningIcon } from "@/components/inning-icon";
import { LocalTime } from "@/components/local-time";

import type { HomeChallengeMoment, LiveGameCard } from "@/lib/types";

type BroadcastStripProps = {
  moments: HomeChallengeMoment[];
};

export function BroadcastStrip({ moments }: BroadcastStripProps) {
  const items = useMemo(() => {
    return moments.map((moment) => ({
      key: `m-${moment.challengeId}`,
      href: `/game/${moment.gamePk}?challengeId=${moment.challengeId}#abs-explorer`,
      label: `${moment.playerName || "Player"} — (${moment.umpireCount || `${moment.balls ?? 0}-${moment.strikes ?? 0}`}) count in ${moment.halfInning === "Top" ? "Top" : "Bottom"} ${moment.inning || "?"}`,
      subLabel: moment.gameLabel,
      score: `${moment.isOverturned ? "Overturned" : "Confirmed"}`,
      tag: moment.gameStatus,
      dateStr: null,
      inning: moment.inning,
      half: moment.halfInning,
      type: "Challenge",
    }));
  }, [moments]);

  // Double items for seamless loop
  const marqueeItems = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <section className="relative flex items-center bg-white/40 border-b border-gray-100 overflow-hidden h-16 group">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex items-center gap-12 whitespace-nowrap px-12"
        animate={{ x: [0, -items.length * 400] }}
        transition={{
          duration: Math.max(items.length * 6, 20),
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
                {item.tag === 'Live' ? 'Live' : item.tag === 'Final' ? 'Final' : item.tag}
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] font-black tracking-tight text-gray-900 group-hover/item:text-blue-600 transition-colors">
                  {item.label}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  {item.subLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/50 px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
              <span className={`font-mono text-[10px] font-black uppercase tracking-tight ${item.score === 'Overturned' ? 'text-blue-600' : 'text-gray-400'}`}>
                {item.score}
              </span>
              {item.tag === 'Live' && item.inning && (
                <div className="flex items-center gap-1">
                  <div className="w-px h-3 bg-gray-200" />
                  <InningIcon inning={item.inning} half={item.half ?? ""} className="scale-75" />
                </div>
              )}
            </div>

            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--ink-4)] opacity-50">
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


