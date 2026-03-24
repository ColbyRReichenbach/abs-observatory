import Image from "next/image";
import { motion } from "framer-motion";

import { MatchupBackdropOverlay } from "@/components/game-hub/matchup-backdrop-overlays";
import { TeamMotifHero } from "@/components/team-motif-hero";
import { LocalTime } from "@/components/local-time";
import { TeamIcon } from "@/components/team-icon";
import { resolveMatchupBackdrop, type MatchupBackdropState } from "@/lib/team-backdrops";

type MatchupBackdropProps = {
  gamePk: number;
  state: MatchupBackdropState;
  status: string;
  homeTeamId: number;
  homeTeamName: string;
  homeAbbreviation?: string | null;
  homePrimaryColor?: string | null;
  homeSecondaryColor?: string | null;
  homeLogoSvgUrl?: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayAbbreviation?: string | null;
  awayLogoSvgUrl?: string | null;
  title: string;
  subtitle?: string | null;
  eyebrow?: string;
  dateStr?: string | null;
  winnerTeamId?: number | null;
};

export function MatchupBackdrop({
  gamePk,
  state,
  status,
  homeTeamId,
  homeTeamName,
  homeAbbreviation,
  homePrimaryColor,
  homeSecondaryColor,
  homeLogoSvgUrl,
  awayTeamId,
  awayTeamName,
  awayAbbreviation,
  awayLogoSvgUrl,
  title,
  subtitle,
  eyebrow,
  dateStr,
  winnerTeamId,
}: MatchupBackdropProps) {
  const backdrop = resolveMatchupBackdrop({
    gamePk,
    state,
    homeTeamId,
    awayTeamId,
    winnerTeamId,
  });

  if (!backdrop) {
    return (
      <TeamMotifHero
        teamId={homeTeamId}
        teamName={homeTeamName}
        abbreviation={homeAbbreviation}
        primaryColor={homePrimaryColor}
        secondaryColor={homeSecondaryColor}
        logoSvgUrl={homeLogoSvgUrl}
        awayTeamId={awayTeamId}
        awayTeamName={awayTeamName}
        awayLogoSvgUrl={awayLogoSvgUrl}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        dateStr={dateStr}
      />
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-black shadow-2xl shadow-black/[0.08]">
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 1.04, opacity: 0.92 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 w-1/2"
        >
          <Image src={backdrop.homeImage} alt={homeTeamName} fill className="object-cover object-center" priority />
        </motion.div>
        <motion.div
          initial={{ scale: 1.04, opacity: 0.92 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
          className="absolute inset-y-0 right-0 w-1/2"
        >
          <Image src={backdrop.awayImage} alt={awayTeamName} fill className="object-cover object-center" priority />
        </motion.div>

        <div className="absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_0%,rgba(0,0,0,0.5)_55%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.28)_38%,rgba(0,0,0,0.22)_62%,rgba(0,0,0,0.72)_100%)]" />
      </div>

      <MatchupBackdropOverlay state={state} status={status} />

      <div className="relative z-10 flex min-h-[420px] flex-wrap items-end justify-between gap-12 px-10 pb-12 pt-28 md:px-16">
        <div className="min-w-0 max-w-3xl flex-1">
          {eyebrow ? (
            <p className="mb-6 text-[10px] font-black uppercase tracking-[0.4em] text-white/60">{eyebrow}</p>
          ) : null}

          <h1 className="text-5xl font-display uppercase tracking-[-0.04em] text-white md:text-7xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-4 max-w-2xl text-lg font-medium leading-tight text-white/78 md:text-xl">{subtitle}</p>
          ) : null}

          {dateStr ? (
            <p className="mt-4 text-sm font-mono font-bold text-white/60">
              <LocalTime dateStr={dateStr} showDate={true} />
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <TeamIcon teamId={homeTeamId} name={homeTeamName} size={56} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Home</p>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                {homeAbbreviation || homeTeamName}
              </p>
            </div>
          </div>

          <div className="px-2 text-sm font-black uppercase tracking-[0.3em] text-white/40">vs</div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Away</p>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                {awayAbbreviation || awayTeamName}
              </p>
            </div>
            <TeamIcon teamId={awayTeamId} name={awayTeamName} size={56} />
          </div>
        </div>
      </div>
    </section>
  );
}
