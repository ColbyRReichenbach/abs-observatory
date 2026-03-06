import { format } from "date-fns";

import type { ChallengeEvent } from "@/lib/types";

export function ChallengeTimeline({ challenges }: { challenges: ChallengeEvent[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/80">Challenge Timeline</h3>
      <div className="space-y-2">
        {challenges.length === 0 ? <p className="text-sm text-white/65">No ABS challenges logged.</p> : null}
        {challenges.map((c) => (
          <div
            key={c.challengeId}
            className={`rounded-lg border px-3 py-2 text-sm ${
              c.isOverturned ? "border-emerald-300/50 bg-emerald-400/10" : "border-rose-300/50 bg-rose-400/10"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-white">
                {c.challengeTeamName ?? "Team"} {c.isOverturned ? "won" : "lost"} challenge
              </strong>
              <span className="text-xs text-white/70">
                {c.challengedAt ? format(new Date(c.challengedAt), "MMM d HH:mm") : "time n/a"}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/80">
              {c.halfInning} {c.inning} | Count {c.balls}-{c.strikes}, {c.outs} outs | {c.batterName} vs {c.pitcherName}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
