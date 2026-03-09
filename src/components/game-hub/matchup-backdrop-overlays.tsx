import type { ReactNode } from "react";
import { Activity, Ticket, Trophy } from "lucide-react";

import type { MatchupBackdropState } from "@/lib/team-backdrops";

function OverlayHeader({
  icon,
  eyebrow,
  label,
}: {
  icon: ReactNode;
  eyebrow: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/65">{eyebrow}</p>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{label}</p>
      </div>
    </div>
  );
}

export function MatchupBackdropOverlay({
  state,
  status,
}: {
  state: MatchupBackdropState;
  status: string;
}) {
  if (state === "pregame") {
    return (
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 py-8 md:px-12">
        <OverlayHeader icon={<Ticket size={14} />} eyebrow="On Deck" label={status} />
        <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur-sm">
          Lineups Pending
        </div>
      </div>
    );
  }

  if (state === "live") {
    return (
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 py-8 md:px-12">
        <OverlayHeader icon={<Activity size={14} />} eyebrow="Live View" label={status} />
        <div className="rounded-full border border-red-400/30 bg-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white backdrop-blur-sm">
          In Progress
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 py-8 md:px-12">
      <OverlayHeader icon={<Trophy size={14} />} eyebrow="Final Word" label={status} />
      <div className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur-sm">
        Closed Book
      </div>
    </div>
  );
}
