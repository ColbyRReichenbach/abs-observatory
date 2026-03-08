import { notFound } from "next/navigation";

import { getGameReport } from "@/lib/data";
import { BackPill } from "@/components/ui/back-pill";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const report = await getGameReport(Number(gamePk));
  if (!report) return notFound();

  return (
    <main className="relative mx-auto max-w-4xl px-6 py-8">
      <BackPill label="Game" href={`/game/${gamePk}`} />
      <h1 className="text-4xl font-display uppercase tracking-[0.08em] text-white">After Action Report</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-cyan-200/80">Game {report.gamePk}</p>
      <article className="prose prose-invert mt-6 rounded-2xl border border-white/15 bg-white/5 p-6">
        <pre className="whitespace-pre-wrap text-sm text-white/90">{report.narrativeMd}</pre>
      </article>
    </main>
  );
}
