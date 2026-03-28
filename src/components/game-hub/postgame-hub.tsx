import { AIFeedback } from "@/components/ai-feedback";
import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { ChallengeValueTimeline } from "@/components/game-hub/challenge-value-timeline";
import { RegenerateDebriefButton } from "@/components/game-hub/regenerate-debrief-button";
import { getGameReport } from "@/lib/game-reports";
import { normalizeNarrativeMarkdown, REPORT_SECTION_LABELS } from "@/lib/game-report-markdown";
import { assertCanManageGameReports, canManageGameReports, regenerateGameReport } from "@/lib/server/game-reports";
import { getGameChallengeValueTimeline } from "@/lib/data";
import ReactMarkdown from "react-markdown";
import type { ChallengeEvent, GameHubGame } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { revalidatePath } from "next/cache";
import { getGameViewCopy } from "@/lib/view-mode-contract";
import { formatHalfInningLabel } from "@/lib/challenge-context";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";

export async function PostgameAAR({ game, challenges, initialChallengeId = null, viewMode }: { game: GameHubGame, challenges: ChallengeEvent[], initialChallengeId?: string | null, viewMode: ViewMode }) {
    const report = await getGameReport(game.gamepk);
    const canRegenerateDebrief = await canManageGameReports();
    const copy = getGameViewCopy(viewMode, "final");
    const challengeValueTimeline = await getGameChallengeValueTimeline(game.gamepk);
    const rawGame = game as GameHubGame & { hometeamid?: number; awayteamid?: number };
    const homeTeamId = Number(rawGame.homeTeamId ?? rawGame.hometeamid ?? 0);
    const awayTeamId = Number(rawGame.awayTeamId ?? rawGame.awayteamid ?? 0);
    const homeTeamName = String((rawGame as GameHubGame & { homeTeamName?: string; hometeamname?: string }).homeTeamName ?? (rawGame as { hometeamname?: string }).hometeamname ?? "");
    const awayTeamName = String((rawGame as GameHubGame & { awayTeamName?: string; awayteamname?: string }).awayTeamName ?? (rawGame as { awayteamname?: string }).awayteamname ?? "");
    const matchesTeam = (challenge: ChallengeEvent, teamId: number, teamName: string, teamAbbr: string | null | undefined) => {
        if (challenge.challengeTeamId !== null && Number(challenge.challengeTeamId) === teamId) return true;
        const normalizedTeam = challenge.challengeTeamName?.trim().toLowerCase();
        if (!normalizedTeam) return false;
        return [teamName, teamAbbr ?? ""].some((candidate) => candidate.trim().toLowerCase() === normalizedTeam);
    };

    const homeChallenges = challenges.filter((c) => matchesTeam(c, homeTeamId, homeTeamName, game.homeabbreviation));
    const awayChallenges = challenges.filter((c) => matchesTeam(c, awayTeamId, awayTeamName, game.awayabbreviation));

    const scorecard = (team: typeof homeChallenges) => {
        const correct = team.filter((c) => c.isOverturned).length;
        const wrong = team.filter((c) => !c.isOverturned).length;
        const total = correct + wrong;
        const ratio = total > 0 ? correct / total : 0;
        return { correct, wrong, total, overturnRate: ratio };
    };

    const homeScore = scorecard(homeChallenges);
    const awayScore = scorecard(awayChallenges);

    const totalChallenges = challenges.length;
    const totalOverturned = challenges.filter((c) => c.isOverturned).length;
    const reportTimestamp = report
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(report.generatedAt))
        : null;
    const mostConsequentialReview = [...challenges].sort((left, right) => {
        const leftValue =
            left.winExpectancyDelta !== null && left.winExpectancyDelta !== undefined && hasTrustedModelConfidenceBand(left.winExpectancyConfidence)
                ? Math.abs(left.winExpectancyDelta)
                : left.runExpectancyDelta !== null && left.runExpectancyDelta !== undefined && hasTrustedModelConfidenceBand(left.runExpectancyConfidence)
                    ? Math.abs(left.runExpectancyDelta)
                    : Math.abs(left.estimatedChallengeSwing ?? 0);
        const rightValue =
            right.winExpectancyDelta !== null && right.winExpectancyDelta !== undefined && hasTrustedModelConfidenceBand(right.winExpectancyConfidence)
                ? Math.abs(right.winExpectancyDelta)
                : right.runExpectancyDelta !== null && right.runExpectancyDelta !== undefined && hasTrustedModelConfidenceBand(right.runExpectancyConfidence)
                    ? Math.abs(right.runExpectancyDelta)
                    : Math.abs(right.estimatedChallengeSwing ?? 0);
        return rightValue - leftValue;
    })[0] ?? null;

    async function regenerateDebriefAction() {
        "use server";

        try {
            await assertCanManageGameReports();
            const refreshedReport = await regenerateGameReport(game.gamepk);
            revalidatePath(`/game/${game.gamepk}`);
            revalidatePath(`/reports/${game.gamepk}`);

            return {
                status: "success" as const,
                message: `Debrief refreshed ${new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                }).format(new Date(refreshedReport.generatedAt))}.`,
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

                    <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                        <div className="px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center min-w-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Logic</span>
                            <span className="text-xl font-display font-black text-gray-900">{totalChallenges} Plays</span>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex flex-col items-center min-w-[100px]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Reverse</span>
                            <span className="text-xl font-display font-black text-blue-600">{totalOverturned} Calls</span>
                        </div>
                        {challenges.some(c => c.impactType?.toLowerCase().includes("high")) && (
                            <div className="px-4 py-2 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 flex flex-col items-center min-w-[100px]">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Pivotal Swap</span>
                                <span className="text-xl font-display font-black text-emerald-600">High Impact</span>
                            </div>
                        )}
                    </div>
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

    const summarySection = (
        <section className="grid gap-6 md:grid-cols-3 mb-8">
            <SummaryPanel
                teamName={game.homeabbreviation || "HOME"}
                teamColor={game.homeprimarycolor || "#3b82f6"}
                correct={homeScore.correct}
                wrong={homeScore.wrong}
                total={homeScore.total}
                overturnRate={homeScore.overturnRate}
            />
            <SummaryPanel
                teamName={game.awayabbreviation || "AWAY"}
                teamColor={game.awayprimarycolor || "#8b5cf6"}
                correct={awayScore.correct}
                wrong={awayScore.wrong}
                total={awayScore.total}
                overturnRate={awayScore.overturnRate}
            />
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "#0066cc" }} />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Most Consequential Review</h4>
                {mostConsequentialReview ? (
                    <>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-5xl font-display font-bold text-gray-900">
                                {mostConsequentialLabel(mostConsequentialReview, viewMode)}
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[var(--ink-0)]">
                                    {mostConsequentialReview.challengeTeamName ?? "Unknown"} • {formatHalfInningLabel(mostConsequentialReview.halfInning, "short")} {mostConsequentialReview.inning ?? "-"}
                                </p>
                                <p className="text-[10px] text-[var(--ink-3)]">
                                    {mostConsequentialReview.calledDescription || "Pitch challenge"} • {mostConsequentialReview.isOverturned ? "Overturned" : "Confirmed"}
                                </p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[var(--ink-2)] font-medium leading-relaxed">
                            {mostConsequentialDetail(mostConsequentialReview, viewMode)}
                        </p>
                    </>
                ) : (
                    <p className="text-[10px] text-[var(--ink-2)] font-medium leading-relaxed">
                        No reviewed pitch carried a modeled consequence in the available sample.
                    </p>
                )}
            </div>
        </section>
    );

    const waterfallSection = (
        <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <ChallengeValueTimeline entries={challengeValueTimeline} viewMode={viewMode} />
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
                            {reportTimestamp ? (
                                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">
                                    Debrief generated {reportTimestamp}
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
                    if (section === "summary") return <div key={section}>{summarySection}</div>;
                    if (section === "waterfall") return <div key={section}>{waterfallSection}</div>;
                    return <div key={section}>{explorerSection}</div>;
                })}
            </MotionIn>
        </div>
    );
}

function SummaryPanel({
    teamName,
    teamColor,
    correct,
    wrong,
    total,
    overturnRate,
}: {
    teamName: string;
    teamColor: string;
    correct: number;
    wrong: number;
    total: number;
    overturnRate: number;
}) {
    return (
        <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: teamColor }} />
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {teamName} Challenge Summary
                </h4>
                <span className="text-4xl font-display font-bold text-gray-900">
                    {(overturnRate * 100).toFixed(0)}%
                </span>
            </div>
            <div className="flex gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">
                    {correct} Correct
                </span>
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black border border-red-100">
                    {wrong} Wrong
                </span>
            </div>
            <p className="text-[10px] text-[var(--ink-2)] font-medium leading-relaxed">
                {correct} of {total} challenges overturned for {teamName} in this game.
            </p>
        </div>
    );
}

function mostConsequentialLabel(challenge: ChallengeEvent, viewMode: ViewMode) {
    const winDelta = challenge.winExpectancyDelta;
    if (viewMode === "org" && winDelta !== null && winDelta !== undefined && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence)) {
        return `${winDelta >= 0 ? "+" : ""}${(winDelta * 100).toFixed(2)}%`;
    }
    const runDelta = challenge.runExpectancyDelta;
    if (runDelta !== null && runDelta !== undefined && hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence)) {
        return `${runDelta >= 0 ? "+" : ""}${runDelta.toFixed(3)}`;
    }
    const swing = challenge.estimatedChallengeSwing ?? 0;
    return `${swing >= 0 ? "+" : ""}${swing} ECS`;
}

function mostConsequentialDetail(challenge: ChallengeEvent, viewMode: ViewMode) {
    const scoreState =
        challenge.homeScore === null || challenge.homeScore === undefined || challenge.awayScore === null || challenge.awayScore === undefined
            ? "reviewed"
            : challenge.homeScore === challenge.awayScore
                ? `tied ${challenge.awayScore}-${challenge.homeScore}`
                : `score ${challenge.awayScore}-${challenge.homeScore}`;
    const winDelta = challenge.winExpectancyDelta;
    if (viewMode === "org" && winDelta !== null && winDelta !== undefined && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence)) {
        return `This review moved win expectancy by ${winDelta >= 0 ? "+" : ""}${(winDelta * 100).toFixed(2)} percentage points in a ${scoreState} spot.`;
    }
    const runDelta = challenge.runExpectancyDelta;
    if (runDelta !== null && runDelta !== undefined && hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence)) {
        return `This review shifted run expectancy by ${runDelta >= 0 ? "+" : ""}${runDelta.toFixed(3)} runs, making it the biggest modeled count-state swing in the game.`;
    }
    return challenge.impactSummary ?? "This review produced the largest recorded challenge swing in the available game sample.";
}
