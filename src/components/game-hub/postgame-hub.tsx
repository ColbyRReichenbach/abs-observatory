import { AIFeedback } from "@/components/ai-feedback";
import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { ChallengeValueTimeline } from "@/components/game-hub/challenge-value-timeline";
import { GameTeamComparisonChart } from "@/components/game-hub/game-team-comparison-chart";
import { UmpireInGameCard } from "@/components/game-hub/umpire-in-game-card";
import { RegenerateDebriefButton } from "@/components/game-hub/regenerate-debrief-button";
import { LocalTime } from "@/components/local-time";
import { getGameReport } from "@/lib/game-reports";
import { normalizeNarrativeMarkdown, REPORT_SECTION_LABELS } from "@/lib/game-report-markdown";
import { assertCanManageGameReports, canManageGameReports, regenerateGameReport } from "@/lib/server/game-reports";
import { getGameChallengeValueTimeline, getGameTeamChallengeComparison, getGameUmpireInGameSummary } from "@/lib/data";
import ReactMarkdown from "react-markdown";
import type { ChallengeEvent, GameHubGame } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { revalidatePath } from "next/cache";
import { getGameViewCopy } from "@/lib/view-mode-contract";
import { formatDisplayTime } from "@/lib/display-time";

export async function PostgameAAR({ game, challenges, initialChallengeId = null, viewMode }: { game: GameHubGame, challenges: ChallengeEvent[], initialChallengeId?: string | null, viewMode: ViewMode }) {
    const [report, challengeValueTimeline, teamComparison, umpireSummary] = await Promise.all([
        getGameReport(game.gamepk),
        getGameChallengeValueTimeline(game.gamepk),
        getGameTeamChallengeComparison(game.gamepk),
        getGameUmpireInGameSummary(game.gamepk),
    ]);
    const canRegenerateDebrief = await canManageGameReports();
    const copy = getGameViewCopy(viewMode, "final");

    async function regenerateDebriefAction() {
        "use server";

        try {
            await assertCanManageGameReports();
            const refreshedReport = await regenerateGameReport(game.gamepk);
            revalidatePath(`/game/${game.gamepk}`);
            revalidatePath(`/reports/${game.gamepk}`);

            return {
                status: "success" as const,
                message: `Debrief refreshed ${formatDisplayTime(refreshedReport.generatedAt)}.`,
            };
        } catch (error) {
            return {
                status: "error" as const,
                message: error instanceof Error ? error.message : "Unable to refresh debrief.",
            };
        }
    }

    const debriefSection = report ? (
        <section className="mb-16 panel px-8 py-12 shadow-2xl shadow-black/[0.02] border border-gray-100 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-3 flex items-center justify-center gap-2">
                        <span className="w-8 h-[1px] bg-blue-200" />
                        Narrative Intelligence
                        <span className="w-8 h-[1px] bg-blue-200" />
                    </h4>
                    <h3 className="font-display text-4xl uppercase tracking-tighter text-gray-900 mb-4 leading-tight">
                        Game <span className="text-blue-600/40 italic">Debrief</span>
                    </h3>
                    <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-gray-500">
                        Narrative readout of how the review battle unfolded after the charts have established which club actually captured the value.
                    </p>
                </div>

                <div className="prose prose-slate max-w-none min-w-0 overflow-hidden break-words [overflow-wrap:anywhere]
                    prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-gray-900
                    prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-4
                    prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-5 prose-h3:text-gray-900
                    prose-p:text-[17px] prose-p:leading-[1.9] prose-p:text-gray-600 prose-p:mb-8 prose-p:font-medium
                    prose-strong:text-gray-950 prose-strong:font-black
                    prose-li:text-[16px] prose-li:text-gray-600 prose-li:mb-4 prose-li:leading-8
                    prose-ul:pl-0 prose-ul:my-8
                    prose-ol:my-8 prose-ol:pl-6
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-200 prose-blockquote:pl-5 prose-blockquote:text-gray-700 prose-blockquote:italic
                    [&_ul_li]:relative [&_ul_li]:ml-0 [&_ul_li]:pl-9
                    [&_ul_li]:before:content-[''] [&_ul_li]:before:absolute [&_ul_li]:before:left-0 [&_ul_li]:before:top-[12px]
                    [&_ul_li]:before:h-2.5 [&_ul_li]:before:w-2.5 [&_ul_li]:before:rounded-sm [&_ul_li]:before:bg-blue-600
                ">
                    <ReactMarkdown
                        components={{
                            strong: ({ children }) => {
                                const text = children?.toString() || "";
                                if (REPORT_SECTION_LABELS.includes(text as (typeof REPORT_SECTION_LABELS)[number])) {
                                    return (
                                        <h2 className="flex flex-col gap-1 !mt-16 !mb-6">
                                            <span className="text-[11px] font-black tracking-[0.6em] text-blue-600 mb-2">
                                                NARRATIVE DATA POINT
                                            </span>
                                            <span className="flex items-center gap-4 text-3xl font-black tracking-tighter">
                                                {text}
                                            </span>
                                        </h2>
                                    );
                                }
                                return <strong className="font-black text-gray-950">{children}</strong>;
                            },
                            h2: ({ children }) => <h2>{children}</h2>,
                            h3: ({ children }) => <h3>{children}</h3>,
                            p: ({ children }) => <p className="text-pretty break-words [overflow-wrap:anywhere]">{children}</p>,
                            ul: ({ children }) => <ul className="space-y-2 break-words [overflow-wrap:anywhere]">{children}</ul>,
                            li: ({ children }) => <li className="break-words [overflow-wrap:anywhere]">{children}</li>,
                        }}
                    >
                        {normalizeNarrativeMarkdown(report.narrativeMd)}
                    </ReactMarkdown>
                </div>
                <AIFeedback
                    surface="game_debrief"
                    targetType="game_report"
                    targetId={String(game.gamepk)}
                    generationId={report.generationId}
                    gamePk={game.gamepk}
                    metadata={{ viewMode }}
                    prompt="Debrief quality"
                    className="mt-10 border-t border-gray-100 pt-6"
                />
            </div>
        </section>
    ) : null;

    const recapSection = (
        <section className="mb-8 space-y-6">
            {teamComparison ? (
                <GameTeamComparisonChart comparison={teamComparison} state="final" viewMode={viewMode} />
            ) : null}
            <UmpireInGameCard summary={umpireSummary} viewMode={viewMode} />
        </section>
    );

    const waterfallSection = (
        <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <ChallengeValueTimeline entries={challengeValueTimeline} viewMode={viewMode} showSummaryCards={false} />
        </section>
    );

    const explorerSection = (
        <section>
            <div className="mb-6 px-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Forensic Log
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Pitch <span className="text-gray-400">Timeline</span>
                </p>
            </div>
            <ChallengeExplorer challenges={challenges} initialChallengeId={initialChallengeId} viewMode={viewMode} />
        </section>
    );

    return (
        <div className="py-8">
            <MotionIn>
                <header className="mb-12">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                                {copy.eyebrow}
                            </h2>
                            <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                                {copy.title}
                            </h3>
                            <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                                {copy.deck}
                            </p>
                            {report ? (
                                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                                    Debrief generated <LocalTime dateStr={report.generatedAt} showDate={true} />
                                </p>
                            ) : null}
                        </div>

                        {canRegenerateDebrief ? (
                            <RegenerateDebriefButton
                                action={regenerateDebriefAction}
                                label={report ? "Regenerate Debrief" : "Generate Debrief"}
                            />
                        ) : null}
                    </div>
                </header>
                {copy.sectionOrder.map((section) => {
                    if (section === "debrief") return <div key={section}>{debriefSection}</div>;
                    if (section === "summary") return <div key={section}>{recapSection}</div>;
                    if (section === "waterfall") return <div key={section}>{waterfallSection}</div>;
                    return <div key={section}>{explorerSection}</div>;
                })}
            </MotionIn>
        </div>
    );
}
