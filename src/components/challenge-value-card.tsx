"use client";

import { useMemo, useState } from "react";

type ChallengeValueResponse = {
  leverageIndexApprox: number;
  wpDeltaIfSuccess: number;
  wpDeltaIfFail: number;
  expectedWpDelta: number;
  recommendation: "challenge" | "hold" | "cannot_challenge";
  rationale: string;
};

type Props = {
  initial: {
    inning: number;
    balls: number;
    strikes: number;
    outs: number;
    scoreDiffBattingTeam: number;
    runnersOnBase: number;
    estimatedOverturnProbability: number;
    challengesRemaining: number;
  };
};

export function ChallengeValueCard({ initial }: Props) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChallengeValueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recommendationTone = useMemo(() => {
    if (!result) return "text-white";
    if (result.recommendation === "challenge") return "text-emerald-300";
    if (result.recommendation === "hold") return "text-amber-300";
    return "text-rose-300";
  }, [result]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/challenge-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Unable to estimate challenge value.");
        setResult(null);
        return;
      }
      setResult(payload as ChallengeValueResponse);
    } catch {
      setError("Network error while calling challenge value API.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
      <h2 className="text-2xl font-display uppercase tracking-[0.07em] text-white">V2 Challenge Value Stub</h2>
      <p className="mt-1 text-sm text-white/75">Heuristic win-probability delta estimate for challenge decisioning.</p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="Inning">
          <input type="number" min={1} max={20} value={form.inning} onChange={(e) => set("inning", Number(e.target.value))} className="input" />
        </Field>
        <Field label="Balls">
          <input type="number" min={0} max={3} value={form.balls} onChange={(e) => set("balls", Number(e.target.value))} className="input" />
        </Field>
        <Field label="Strikes">
          <input type="number" min={0} max={2} value={form.strikes} onChange={(e) => set("strikes", Number(e.target.value))} className="input" />
        </Field>
        <Field label="Outs">
          <input type="number" min={0} max={2} value={form.outs} onChange={(e) => set("outs", Number(e.target.value))} className="input" />
        </Field>
        <Field label="Score Diff (batting)">
          <input
            type="number"
            min={-15}
            max={15}
            value={form.scoreDiffBattingTeam}
            onChange={(e) => set("scoreDiffBattingTeam", Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Runners On Base">
          <input
            type="number"
            min={0}
            max={3}
            value={form.runnersOnBase}
            onChange={(e) => set("runnersOnBase", Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Overturn Probability">
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={form.estimatedOverturnProbability}
            onChange={(e) => set("estimatedOverturnProbability", Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Challenges Remaining">
          <input
            type="number"
            min={0}
            max={2}
            value={form.challengesRemaining}
            onChange={(e) => set("challengesRemaining", Number(e.target.value))}
            className="input"
          />
        </Field>
        <div className="md:col-span-4">
          <button
            disabled={loading}
            className="rounded-full border border-cyan-300 bg-cyan-300/20 px-5 py-2 text-sm font-semibold text-cyan-100"
          >
            {loading ? "Estimating..." : "Estimate Decision Value"}
          </button>
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {result ? (
        <div className="mt-4 rounded-xl border border-white/15 bg-[#081427] p-4">
          <p className={`text-lg font-semibold uppercase tracking-[0.08em] ${recommendationTone}`}>{result.recommendation}</p>
          <p className="mt-2 text-sm text-white/85">{result.rationale}</p>
          <div className="mt-3 grid gap-2 text-sm text-white/80 md:grid-cols-2">
            <p>Leverage Index (approx): {result.leverageIndexApprox.toFixed(3)}</p>
            <p>Expected WP Delta: {(result.expectedWpDelta * 100).toFixed(2)}%</p>
            <p>WP Delta if Success: {(result.wpDeltaIfSuccess * 100).toFixed(2)}%</p>
            <p>WP Delta if Fail: {(result.wpDeltaIfFail * 100).toFixed(2)}%</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs uppercase tracking-[0.08em] text-white/75">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
