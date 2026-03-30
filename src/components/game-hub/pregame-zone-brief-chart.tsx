"use client";

import type { PregameIntel } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const BUCKET_LABELS = {
  up_glove: "Up / Glove",
  up_arm: "Up / Arm",
  down_glove: "Down / Glove",
  down_arm: "Down / Arm",
} as const;

export function PregameZoneBriefChart({
  intel,
  viewMode,
}: {
  intel: PregameIntel;
  viewMode: ViewMode;
}) {
  const sorted = [...intel.zoneBriefing].sort((left, right) => {
    if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
    return right.challenges - left.challenges;
  });
  const maxChallenges = Math.max(...sorted.map((zone) => zone.challenges), 1);

  return (
    <section className="panel border border-gray-50 bg-white p-6 shadow-2xl shadow-black/[0.02]">
      <div className="mb-5">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
          {viewMode === "org" ? "Zone Vulnerability" : "Zone Watch"}
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Umpire <span className="text-gray-400">Zone Brief</span>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((zone) => (
          <div key={zone.bucket} className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{BUCKET_LABELS[zone.bucket]}</p>
                <p className="mt-2 text-xl font-display text-gray-900">{Math.round(zone.overturnRate * 100)}%</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {zone.challenges} tracked challenges
                </p>
              </div>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                {viewMode === "org" ? "overturn risk" : "watch zone"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500"
                style={{ width: `${Math.max(10, (zone.challenges / maxChallenges) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
