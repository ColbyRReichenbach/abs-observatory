import Image from "next/image";
import type { CSSProperties } from "react";

import { resolveTeamBranding } from "@/lib/team-branding";
import { TeamIcon } from "@/components/team-icon";

type TeamMotifHeroProps = {
  teamId: number;
  teamName: string;
  abbreviation?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoSvgUrl?: string | null;
  eyebrow?: string;
  title?: string;
  subtitle?: string | null;
  // Optional away team for matchups
  awayTeamId?: number;
  awayTeamName?: string;
  awayLogoSvgUrl?: string | null;
};

export function TeamMotifHero({
  teamId,
  teamName,
  abbreviation,
  primaryColor,
  secondaryColor,
  logoSvgUrl,
  eyebrow,
  title,
  subtitle,
  awayTeamId,
  awayTeamName,
  awayLogoSvgUrl,
}: TeamMotifHeroProps) {
  const branding = resolveTeamBranding({
    teamId,
    teamName,
    abbreviation,
    primaryColor,
    secondaryColor,
    logoSvgUrl,
  });

  const isVerified = branding.motif.isVerified;

  return (
    <section
      className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-black/[0.03]"
      style={
        {
          "--hero-primary": branding.tokens.teamPrimary,
          "--hero-secondary": branding.tokens.teamSecondary,
          "--hero-soft": branding.tokens.teamAccentSoft,
        } as CSSProperties
      }
    >
      {/* Background layers */}
      <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-[var(--hero-soft)] via-[var(--hero-soft)]/20 to-transparent opacity-40" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,var(--hero-soft)_0%,transparent_70%)] opacity-60 -translate-y-1/2 translate-x-1/2" />

      <MotifPattern verified={isVerified} />

      {/* Content */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-12 px-10 py-16 md:px-16 md:py-24">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="flex items-center gap-3 mb-10">
              <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: branding.tokens.teamPrimary }} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                {eyebrow}
              </p>
            </div>
          )}

          <h1 className="text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-gray-900 leading-[1.2] mb-10 py-4 overflow-visible">
            {title ?? teamName}
          </h1>

          {subtitle ? (
            <p className="text-xl md:text-2xl font-medium text-gray-500 max-w-xl leading-tight tracking-tight text-balance">{subtitle}</p>
          ) : null}
        </div>


        <div className="relative group">
          <div className="flex items-center -space-x-12 md:-space-x-20">
            {awayTeamId && awayTeamName && (
              <div className="relative z-10 transition-all duration-700 group-hover:-translate-x-4 group-hover:-translate-y-2">
                <TeamIcon
                  teamId={awayTeamId}
                  name={awayTeamName}
                  size={awayTeamId ? 180 : 220}
                  className="shadow-2xl border-[3px] border-white/40 ring-8 ring-white/5"
                />
              </div>
            )}
            <div className={`relative z-20 transition-all duration-700 group-hover:-translate-y-4 ${awayTeamId ? "scale-90 group-hover:scale-100" : ""}`}>
              <TeamIcon
                teamId={teamId}
                name={teamName}
                size={awayTeamId ? 180 : 220}
                className="shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] group-hover:shadow-black/60 border-[3px] border-white/40 ring-8 ring-white/5"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MotifPattern({ verified }: { verified: boolean }) {
  if (!verified) {
    return (
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent_0,transparent_40px,black_40px,black_41px)]" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute left-10 top-10 h-64 w-64 rounded-full border-[1px] border-black/[0.03]" />
      <div className="absolute right-40 bottom-10 h-96 w-96 rounded-[4rem] border border-black/[0.03] rotate-45" />
      <div className="absolute top-1/2 left-1/4 h-px w-[600px] bg-gradient-to-r from-transparent via-black/[0.03] to-transparent" />
    </div>
  );
}


