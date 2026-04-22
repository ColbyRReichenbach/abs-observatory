import type { GameChallengeImpactMoment, GamePostgameAudit } from "@/lib/types";
import { buildPostgameAuditPresentation } from "@/lib/postgame-audit-copy";
import type { ViewMode } from "@/lib/view-mode";

export function PostgameAuditSummary({
  audit,
  viewMode = "fan",
}: {
  audit: GamePostgameAudit;
  viewMode?: ViewMode;
}) {
  const presentation = buildPostgameAuditPresentation(audit, viewMode);
  const keyMoments = uniqueMoments([
    audit.impactSummary.biggestSwing,
    audit.impactSummary.highestLeverage,
    audit.valueMode === "win" ? audit.impactSummary.biggestWinValue : audit.impactSummary.biggestRunValue,
  ]);

  return (
    <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Computed Audit</p>
          <h2 className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">
            {audit.awayTeamName} at {audit.homeTeamName}
          </h2>
          <p className="mt-3 text-sm text-[var(--ink-2)]">
            {viewMode === "org"
              ? "Postgame challenge-value audit built from the replay log, modeled value layers, and the existing comparison stack."
              : "Postgame replay read built from the challenge log, game-state swings, and the existing comparison layer."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Chip label={`${audit.overturnedChallenges}/${audit.totalChallenges} overturned`} tone="emerald" />
          <Chip label={`${audit.lateCloseChallenges} late-close`} tone="blue" />
          {audit.totalExpectedValue !== null ? (
            <Chip label={`${audit.lowValueChallengeCount} low-value uses`} tone="amber" />
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-black/10 bg-[var(--surface-infield)] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Audit Read</p>
          <h3 className="mt-3 text-2xl font-display uppercase tracking-tight text-[var(--ink-0)]">{presentation.narrative.headline}</h3>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--ink-2)]">
            <p>{presentation.narrative.summary}</p>
            <p>{presentation.narrative.valueRead}</p>
            <p>{presentation.umpireVerdict.summary}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">Coverage</p>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-2)]">{presentation.coverage.methodologyNote}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label={presentation.coverage.hasExpectedValueLayer ? "expected value present" : "no expected value layer"} tone={presentation.coverage.hasExpectedValueLayer ? "blue" : "amber"} />
            <Chip label={presentation.coverage.hasTrustedActualValueLayer ? "trusted actual value" : "fallback actual value"} tone={presentation.coverage.hasTrustedActualValueLayer ? "emerald" : "amber"} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        <MetricCard label="Total Challenges" value={String(audit.totalChallenges)} />
        <MetricCard label="Overturn Rate" value={formatShare(rate(audit.overturnedChallenges, audit.totalChallenges))} />
        <MetricCard label="Value Mode" value={formatValueModeLabel(audit.valueMode)} />
        <MetricCard
          label={audit.valueMode === "win" ? "Actual Review WE" : audit.valueMode === "run" ? "Actual Review RE" : "Estimated Swing"}
          value={formatValue(audit.totalActualValue, audit.valueMode)}
        />
        <MetricCard
          label={audit.totalValueSurplus !== null ? "Review Surplus" : "Expected Review WE"}
          value={
            audit.totalValueSurplus !== null
              ? formatValue(audit.totalValueSurplus, "win")
              : formatValue(audit.totalExpectedValue, "win")
          }
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <TeamAuditCard side={audit.home} valueMode={audit.valueMode} />
        <TeamAuditCard side={audit.away} valueMode={audit.valueMode} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <VerdictCard eyebrow="Home Verdict" summary={presentation.teamVerdicts.home.summary} />
        <VerdictCard eyebrow="Away Verdict" summary={presentation.teamVerdicts.away.summary} />
      </div>

      {keyMoments.length > 0 ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {keyMoments.map((moment, index) => (
            <MomentCard
              key={`${moment.challengeId}:${index}`}
              eyebrow={index === 0 ? "Biggest Swing" : index === 1 ? "Highest Leverage" : "Top Value Spot"}
              moment={moment}
              valueMode={audit.valueMode}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function VerdictCard({ eyebrow, summary }: { eyebrow: string; summary: string }) {
  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{eyebrow}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-2)]">{summary}</p>
    </div>
  );
}

function TeamAuditCard({
  side,
  valueMode,
}: {
  side: GamePostgameAudit["home"];
  valueMode: GamePostgameAudit["valueMode"];
}) {
  return (
    <div className="rounded-[2rem] border border-black/10 bg-[var(--surface-infield)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {side.abbreviation ?? side.teamName}
          </p>
          <p className="mt-2 text-2xl font-display uppercase tracking-tight text-[var(--ink-0)]">
            {side.teamName}
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white"
          style={{ backgroundColor: side.primaryColor ?? "#111827" }}
        >
          {side.totalChallenges} reviews
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SmallMetric label="Overturn Rate" value={side.overturnRate === null ? "N/A" : formatShare(side.overturnRate)} />
        <SmallMetric label="Late-Close Share" value={side.lateCloseShare === null ? "N/A" : formatShare(side.lateCloseShare)} />
        <SmallMetric label={valueMode === "win" ? "Actual WE" : valueMode === "run" ? "Actual RE" : "Est. Swing"} value={formatValue(side.totalValue, valueMode)} />
        <SmallMetric
          label={side.valueSurplus !== null ? "Surplus" : "Expected WE"}
          value={side.valueSurplus !== null ? formatValue(side.valueSurplus, "win") : formatValue(side.expectedValueSum, "win")}
        />
      </div>
    </div>
  );
}

function MomentCard({
  eyebrow,
  moment,
  valueMode,
}: {
  eyebrow: string;
  moment: GameChallengeImpactMoment;
  valueMode: GamePostgameAudit["valueMode"];
}) {
  const metricValue =
    valueMode === "win" && moment.winExpectancyDelta !== null
      ? formatValue(moment.winExpectancyDelta, "win")
      : valueMode === "run" && moment.runExpectancyDelta !== null
        ? formatValue(moment.runExpectancyDelta, "run")
        : `${moment.estimatedLeverageIndex.toFixed(2)} ELI`;

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{eyebrow}</p>
      <p className="mt-3 text-xl font-display uppercase tracking-tight text-[var(--ink-0)]">
        {moment.challengeTeamName ?? "Unknown team"}
      </p>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        {formatHalfInning(moment)} · {moment.calledDescription ?? "Challenge event"}
      </p>
      <p className="mt-3 text-lg font-display uppercase tracking-tight text-[var(--ink-0)]">{metricValue}</p>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        {moment.impactSummary ?? `${moment.isOverturned ? "Overturned" : "Confirmed"} review in a high-pressure spot.`}
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-[var(--surface-infield)] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-2xl font-display uppercase tracking-tight text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-lg font-display uppercase tracking-tight text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "blue" | "emerald" | "amber" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${toneClass}`}>{label}</span>;
}

function uniqueMoments(moments: Array<GameChallengeImpactMoment | null>) {
  const seen = new Set<string>();
  return moments.filter((moment): moment is GameChallengeImpactMoment => {
    if (!moment) return false;
    if (seen.has(moment.challengeId)) return false;
    seen.add(moment.challengeId);
    return true;
  });
}

function formatHalfInning(moment: GameChallengeImpactMoment) {
  if (!moment.inning || !moment.halfInning) return "Unknown inning";
  return `${moment.halfInning} ${moment.inning}`;
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function formatShare(value: number) {
  const pct = value * 100;
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function formatValue(value: number | null, mode: GamePostgameAudit["valueMode"]) {
  if (value === null) return "N/A";
  if (mode === "estimated") return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ECS`;
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatValueModeLabel(mode: GamePostgameAudit["valueMode"]) {
  if (mode === "win") return "Win Value";
  if (mode === "run") return "Run Value";
  return "Estimated Swing";
}
