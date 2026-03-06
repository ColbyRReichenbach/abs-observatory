import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { WPASwapWaterfall } from "@/components/game-hub/wpa-swap-waterfall";
import { getGameReport } from "@/lib/game-reports";
import ReactMarkdown from "react-markdown";
import type { ChallengeEvent } from "@/lib/types";

export async function PostgameAAR({ game, challenges }: { game: any, challenges: ChallengeEvent[] }) {
    const report = await getGameReport(game.gamepk);
    return (
        <div className="py-8">
            <MotionIn>
                <header className="mb-12">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                        After-Action Report
                    </h2>
                    <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                        ABS Forensic Analysis
                    </h3>
                    <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                        Comprehensive postgame breakdown of critical review events, expected value shifts, and umpire zone consistency throughout the completed matchup.
                    </p>
                </header>

                <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                    <WPASwapWaterfall challenges={challenges} />
                </section>

                {report && (
                    <section className="mb-8 panel p-6 border shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                AI Match Summary
                            </h4>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown>{report.narrativeMd}</ReactMarkdown>
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Forensic Pitch Log
                        </h4>
                    </div>
                    <ChallengeExplorer challenges={challenges} />
                </section>
            </MotionIn>
        </div>
    );
}
