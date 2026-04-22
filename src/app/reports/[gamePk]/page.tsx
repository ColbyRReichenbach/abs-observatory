import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { AIFeedback } from "@/components/ai-feedback";
import { PostgameAuditSummary } from "@/components/game-hub/postgame-audit-summary";
import { getGamePostgameAudit, getGameReport } from "@/lib/data";
import { BackPill } from "@/components/ui/back-pill";
import { normalizeNarrativeMarkdown, REPORT_SECTION_LABELS } from "@/lib/game-report-markdown";
import { resolveViewMode } from "@/lib/view-mode";

export const dynamic = "force-dynamic";

export default async function ReportPage({
    params,
    searchParams,
}: {
    params: Promise<{ gamePk: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { gamePk } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const viewMode = await resolveViewMode(resolvedSearchParams);
    const gameId = Number(gamePk);
    const [report, audit] = await Promise.all([getGameReport(gameId), getGamePostgameAudit(gameId)]);
    if (!report && !audit) return notFound();

    const reportBody = report ? (
      <>
        <article
            className="prose prose-invert mt-6 max-w-none min-w-0 overflow-hidden break-words [overflow-wrap:anywhere] rounded-2xl border border-white/15 bg-white/5 p-8
            prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight
            prose-h2:mt-12 prose-h2:mb-5 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-3 prose-h2:text-3xl
            prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-2xl
            prose-p:text-base prose-p:leading-8 prose-p:text-white/90
            prose-strong:text-white prose-strong:font-black
            prose-ul:my-6 prose-ul:pl-6 prose-li:my-2 prose-li:text-white/90 prose-li:leading-7"
        >
            <ReactMarkdown
                components={{
                    strong: ({ children }) => {
                        const text = children?.toString() || "";
                        if (REPORT_SECTION_LABELS.includes(text as (typeof REPORT_SECTION_LABELS)[number])) {
                            return <h2>{text}</h2>;
                        }
                        return <strong>{children}</strong>;
                    },
                }}
            >
                {normalizeNarrativeMarkdown(report.narrativeMd)}
            </ReactMarkdown>
        </article>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <AIFeedback
                surface="game_debrief"
                targetType="game_report"
                targetId={String(report.gamePk)}
                generationId={report.generationId}
                gamePk={report.gamePk}
                metadata={{ surface: "report_page" }}
                prompt="Debrief quality"
            />
        </div>
      </>
    ) : (
      <div className="mt-6 rounded-2xl border border-amber-200/30 bg-amber-50/10 p-6 text-sm text-amber-100">
        No saved narrative debrief exists for this game yet. The computed audit below is live, but the longform markdown recap has not been generated.
      </div>
    );

    return (
        <main className="relative mx-auto max-w-4xl px-6 py-8">
            <BackPill label="Game" href={`/game/${gamePk}?view=${viewMode}`} />
            <h1 className="text-4xl font-display uppercase tracking-[0.08em] text-white">After Action Report</h1>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-cyan-200/80">Game {report?.gamePk ?? audit?.gamePk ?? gameId}</p>
            {audit ? (
              <div className="mt-6">
                <PostgameAuditSummary audit={audit} viewMode={viewMode} />
              </div>
            ) : null}
            {reportBody}
        </main>
    );
}
