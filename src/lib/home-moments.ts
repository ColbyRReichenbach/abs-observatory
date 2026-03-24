import type { HomeChallengeMoment } from "@/lib/types";

export function computeChallengeLeverageScore(input: {
  inning: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isOverturned: boolean;
}) {
  const margin = Math.abs((input.homeScore ?? 0) - (input.awayScore ?? 0));
  const inningWeight = input.inning ? Math.min(2.5, 0.25 * input.inning) : 0.8;
  const closeWeight = margin <= 1 ? 2.2 : margin <= 3 ? 1.4 : 0.8;
  const overturnWeight = input.isOverturned ? 1.3 : 1.0;
  return Number((inningWeight * closeWeight * overturnWeight).toFixed(3));
}

export function rankChallengeMoments(moments: HomeChallengeMoment[]) {
  return [...moments].sort((a, b) => {
    if (b.leverageScore !== a.leverageScore) return b.leverageScore - a.leverageScore;
    const aTs = a.challengedAt ? new Date(a.challengedAt).getTime() : 0;
    const bTs = b.challengedAt ? new Date(b.challengedAt).getTime() : 0;
    return bTs - aTs;
  });
}

