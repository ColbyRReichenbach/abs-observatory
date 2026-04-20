import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban } from "lucide-react";
import { BackPill } from "@/components/ui/back-pill";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ vizId: string }> }): Promise<Metadata> {
    const { vizId } = await params;
    return {
        title: `Visualization ${vizId} — ABS Observatory`,
        description: "Public visualization sharing remains deferred until private visualization persistence is real.",
        openGraph: {
            title: `ABS Visualization — ABS Observatory`,
            description: "Public visualization sharing remains deferred until private visualization persistence is real.",
            type: "website",
        },
        twitter: {
            card: "summary",
            title: `ABS Visualization — ABS Observatory`,
            description: "Public visualization sharing remains deferred until private visualization persistence is real.",
        },
    };
}

export default async function VizPage({ params }: { params: Promise<{ vizId: string }> }) {
    const { vizId } = await params;

    if (!vizId || vizId.length < 3) return notFound();

    return (
        <main className="mx-auto max-w-5xl px-6 py-12 lg:py-24 min-h-screen">
            <BackPill label="Back" useHistory />

            <header className="mb-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">
                    Visual Lab Decision Gate
                </p>
                <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tight text-gray-900 mb-4">
                    ABS Observatory
                </h1>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    AiBS now saves private AI artifacts in the signed-in workspace, but public visualization links remain intentionally off.
                </p>
            </header>

            <div className="panel p-0 bg-white shadow-2xl shadow-black/[0.05] border border-gray-100 overflow-hidden rounded-[2.5rem]">
                <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center gap-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Unavailable Link</p>
                        <h4 className="text-xl font-display uppercase tracking-tight text-gray-900">
                            Viz #{vizId}
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/profile"
                            className="px-6 py-3 rounded-2xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black/20 transition-all"
                        >
                            Open Workspace
                        </Link>
                        <Link
                            href="/"
                            className="px-6 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                            Return Home →
                        </Link>
                    </div>
                </div>

                <div className="aspect-[21/9] w-full bg-gray-50 relative flex items-center justify-center p-20">
                    <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,black_20px,black_21px)]" />
                    <div className="relative text-center">
                        <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center mx-auto mb-6">
                            <Ban className="text-amber-500" size={32} />
                        </div>
                        <p className="text-2xl font-display uppercase tracking-tight text-gray-900 mb-2">No Stored Visualization</p>
                        <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto">
                            Public chart pages stay disabled until owned visualization persistence and moderation rules are real.
                        </p>
                    </div>
                </div>

                <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Public Viz Disabled</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Private AI Workspace Live</p>
                        </div>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold text-gray-400 italic">
                            The next acceptable step is private saved visualizations, not a gallery, like-counts, or public remix links.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
