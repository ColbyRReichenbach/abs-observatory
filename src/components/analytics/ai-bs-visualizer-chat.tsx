"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Zap,
    Activity,
    Share2
} from "lucide-react";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import { BaseballSpinner } from "@/components/baseball-spinner";

function XIcon({ size = 18, className = "" }: { size?: number, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.482 3.239H4.293L17.607 20.65z" />
        </svg>
    );
}

export function AIBSVisualizerChat({
    context,
    teamColor = "#007aff"
}: {
    context: string,
    teamColor?: string
}) {
    const [query, setQuery] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<{ query: string; id: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsGenerating(true);
        setResult(null);

        // Simulate AI visualization generation
        setTimeout(() => {
            setIsGenerating(false);
            setResult({
                query: query,
                id: Math.random().toString(36).substring(7)
            });
            setQuery("");
        }, 2200);
    };

    const handleShare = (platform: string) => {
        const text = `Check out this custom ${context} visualization I generated on ABS Observatory!`;
        const url = window.location.href;

        if (platform === 'x') {
            window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        } else if (platform === 'copy') {
            navigator.clipboard.writeText(url);
            alert("Link copied to clipboard!");
        }
    };

    return (
        <section className="mt-20 pb-32 w-full max-w-5xl mx-auto px-4">
            <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-100" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 whitespace-nowrap">
                        Visualize your own ideas
                    </p>
                    <div className="h-px flex-1 bg-gray-100" />
                </div>

                <div className="relative group">
                    <div className="panel p-2 pl-6 bg-white shadow-xl shadow-black/[0.02] border border-gray-100 rounded-full flex items-center gap-4 transition-all focus-within:border-gray-200 focus-within:shadow-lg focus-within:shadow-black/[0.04]">
                        <div className="shrink-0 -ml-2 text-blue-500">
                            <AiBSIcon size={20} showTextOnHover />
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Ask aiBS to generate a visual for ${context} you're interested in...`}
                                className="w-full bg-transparent border-0 !outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent] text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isGenerating || !query.trim()}
                                className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
                            >
                                {isGenerating ? (
                                    <>
                                        <Zap size={12} className="animate-spin" />
                                        <span>Generating</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={12} />
                                        <span>Visualize</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {isGenerating && (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-12"
                        >
                            <BaseballSpinner />
                        </motion.div>
                    )}

                    {result && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full"
                        >
                            <div className="panel p-0 bg-white shadow-2xl shadow-black/[0.05] border border-gray-100 overflow-hidden rounded-[2.5rem]">
                                {/* Header Area */}
                                <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Generated Visualization</p>
                                        <h4 className="text-xl font-display uppercase tracking-tight text-gray-900">"{result.query}"</h4>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleShare('x')}
                                            className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                                        >
                                            <XIcon size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleShare('copy')}
                                            className="px-6 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all"
                                        >
                                            <Share2 size={14} />
                                            Share Link
                                        </button>
                                    </div>
                                </div>

                                {/* Placeholder Graph Area */}
                                <div className="aspect-[21/9] w-full bg-gray-50 relative flex items-center justify-center p-20">
                                    <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,black_20px,black_21px)]" />
                                    <div className="relative text-center">
                                        <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center mx-auto mb-6">
                                            <Activity className="text-blue-500" size={32} />
                                        </div>
                                        <p className="text-2xl font-display uppercase tracking-tight text-gray-900 mb-2">Visualizing Dataset...</p>
                                        <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto">AI is rendering situational clusters and trend vectors based on the {context} schema.</p>
                                    </div>
                                </div>

                                {/* Metadata/Footer */}
                                <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Model: aiBS-4-Turbo</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Context: {context}</p>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-right">
                                        <p className="text-[10px] font-bold text-gray-400 italic">
                                            Built via <span className="text-blue-600 not-italic font-black">aiBS</span> a creation by <span className="text-gray-900 not-italic font-black">Colby Reichenbach</span>
                                        </p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 mt-1">
                                            ABS Observatory &copy; 2026 • Verified Authenticity
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
