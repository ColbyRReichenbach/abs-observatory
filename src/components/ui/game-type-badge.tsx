"use client";

import { getGameTypeLabel, shouldShowGameTypeBadge } from "@/lib/game-type";

export function GameTypeBadge({
  gameType,
  compact = false,
}: {
  gameType: string | null | undefined;
  compact?: boolean;
}) {
  if (!shouldShowGameTypeBadge(gameType)) {
    return null;
  }

  const label = getGameTypeLabel(gameType);

  const toneClass =
    label.tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : label.tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : label.tone === "amber"
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : "border-gray-200 bg-gray-50 text-gray-500";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-black uppercase tracking-[0.14em] ${compact ? "text-[8px]" : "text-[9px]"} ${toneClass}`}
      title={label.fullLabel}
    >
      {compact ? label.shortLabel : label.fullLabel}
    </span>
  );
}
