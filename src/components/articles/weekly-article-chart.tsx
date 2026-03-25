"use client";

import { SpringTeamIdentityScatter, type SpringTeamIdentityPoint } from "@/components/articles/spring-team-identity-scatter";
import { SpringTimingConversionChart, type SpringTimingConversionPoint } from "@/components/articles/spring-timing-conversion-chart";
import { SpringUmpireExposureScatter, type SpringUmpireExposurePoint } from "@/components/articles/spring-umpire-exposure-scatter";

type SupportedChartKey =
  | "spring_team_identity_scatter"
  | "spring_timing_conversion"
  | "spring_umpire_exposure_scatter";

export type WeeklyArticleChartEvidence = {
  chartKey: SupportedChartKey;
  chartTitle?: string;
  chartDek?: string;
  analystNote?: string;
  data: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSpringTeamIdentityPoint(value: unknown): value is SpringTeamIdentityPoint {
  return isRecord(value)
    && typeof value.teamId === "number"
    && typeof value.teamName === "string"
    && typeof value.challenges === "number"
    && typeof value.overturnRate === "number";
}

function isSpringTimingConversionPoint(value: unknown): value is SpringTimingConversionPoint {
  return isRecord(value)
    && typeof value.stateBucket === "string"
    && typeof value.label === "string"
    && typeof value.challenges === "number"
    && typeof value.overturnRate === "number";
}

function isSpringUmpireExposurePoint(value: unknown): value is SpringUmpireExposurePoint {
  return isRecord(value)
    && typeof value.umpireId === "number"
    && typeof value.umpireName === "string"
    && typeof value.challengedCalls === "number"
    && typeof value.overturnRate === "number";
}

function renderChart(evidence: WeeklyArticleChartEvidence) {
  switch (evidence.chartKey) {
    case "spring_team_identity_scatter":
      return evidence.data.every(isSpringTeamIdentityPoint)
        ? <SpringTeamIdentityScatter data={evidence.data} />
        : null;
    case "spring_timing_conversion":
      return evidence.data.every(isSpringTimingConversionPoint)
        ? <SpringTimingConversionChart data={evidence.data} />
        : null;
    case "spring_umpire_exposure_scatter":
      return evidence.data.every(isSpringUmpireExposurePoint)
        ? <SpringUmpireExposureScatter data={evidence.data} />
        : null;
    default:
      return null;
  }
}

export function WeeklyArticleChart({ evidence }: { evidence: WeeklyArticleChartEvidence }) {
  const chart = renderChart(evidence);
  if (!chart) return null;

  return (
    <section className="mt-6 rounded-[2rem] border border-black/10 bg-[#fffdf8] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.05)] md:p-8">
      {evidence.chartTitle ? (
        <header className="mb-5 border-b border-black/10 pb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">Data View</p>
          <h3 className="mt-3 text-2xl font-display uppercase tracking-tight text-[#231f1a] md:text-3xl">
            {evidence.chartTitle}
          </h3>
          {evidence.chartDek ? <p className="mt-3 max-w-3xl text-sm text-[#5a554d]">{evidence.chartDek}</p> : null}
        </header>
      ) : null}
      {chart}
      {evidence.analystNote ? (
        <p className="mt-5 border-t border-black/10 pt-4 text-sm leading-relaxed text-[#4f473d]">
          <span className="font-black uppercase tracking-[0.18em] text-[#7d6c54]">Analyst note</span>{" "}
          {evidence.analystNote}
        </p>
      ) : null}
    </section>
  );
}
