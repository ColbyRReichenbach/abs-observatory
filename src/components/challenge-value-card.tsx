"use client";

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
  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
      <h2 className="text-2xl font-display uppercase tracking-[0.07em] text-white">Challenge Leverage</h2>
      <p className="mt-1 text-sm text-white/75">
        This surface stays disabled until the real CLS and win-probability backend is implemented.
      </p>

        <div className="mt-4 rounded-xl border border-white/15 bg-[#081427] p-4 text-sm text-white/80">
        <p className="font-semibold text-white">Current game state</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <p>Inning: {initial.inning}</p>
          <p>Count: {initial.balls}-{initial.strikes}</p>
          <p>Outs: {initial.outs}</p>
          <p>Runners on: {initial.runnersOnBase}</p>
          <p>Score diff (batting team): {initial.scoreDiffBattingTeam}</p>
          <p>Challenges remaining: {initial.challengesRemaining}</p>
        </div>
        <p className="mt-4 text-xs text-white/65">
          No challenge recommendation is shown here because the earlier prototype estimate was removed.
        </p>
      </div>
    </section>
  );
}
