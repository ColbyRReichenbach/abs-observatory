"use client";

import { motion } from "framer-motion";
import { MessageCircle, Share2, Sparkles, TrendingUp, AlertTriangle, Users } from "lucide-react";

export default function ArticlesPage() {
    return (
        <div className="min-h-screen bg-[#fcf9f2] text-[#2c2c2c] selection:bg-[#d4b483] selection:text-white pb-32">
            {/* Newspaper Header */}
            <header className="pt-32 pb-12 border-b-4 border-double border-[#2c2c2c] max-w-6xl mx-auto px-6 text-center">
                <div className="flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border-b border-black/10 pb-2">
                    <span>Vol. MMXXVI • No. 42</span>
                    <span>Observatory Park</span>
                    <span>March 05, 2026</span>
                </div>
                <h1 className="text-7xl md:text-9xl font-display uppercase tracking-tighter leading-none mb-4">
                    The Daily <span className="italic">Debrief</span>
                </h1>
                <div className="h-1 bg-black w-full my-4" />
                <p className="text-lg font-serif italic max-w-2xl mx-auto leading-tight">
                    "Algorithmic auditing of the day's high-leverage events, delivered fresh from the ABS analytical engine."
                </p>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: AI Summary */}
                <div className="lg:col-span-8 border-r border-black/10 pr-12">
                    <section className="mb-16">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="text-blue-600" size={16} />
                            <span className="text-xs font-black uppercase tracking-widest text-blue-900">AI Narrative Summary</span>
                        </div>
                        <h2 className="text-5xl font-display uppercase tracking-tight leading-[1.1] mb-8 py-2">
                            Tipping the Scales: <br />
                            <span className="text-6xl text-[#8b0000] italic px-1">The Umpire's Ghost</span>
                        </h2>

                        <div className="columns-1 md:columns-2 gap-8 text-sm leading-relaxed font-serif text-justify border-b border-black/5 pb-12">
                            <p className="mb-4">
                                <span className="text-5xl float-left mr-3 mt-1 font-display">T</span>oday's matches revealed a fascinating divergence in algorithmic alignment. As the league pivots further into the automated era, the friction between traditional zone calling and the cold, hard logic of the ABS system has reached a crescendo.
                            </p>
                            <p className="mb-4">
                                The Cubs-Mets series, in particular, showcased how a single pixel-width variance can fundamentally alter a game's momentum. Our internal models suggest that while human umpires are adapting, the "directional bias" we've been tracking in the low-away quadrant is becoming a critical strategic exploit for savvy pitching staffs.
                            </p>
                            <p>
                                Overall, the league saw a 1.2% uptick in successful challenges today, suggesting that teams are becoming more surgical with their red flags. The era of guessing is over; the era of precision has taken its seat in the dugout.
                            </p>
                        </div>
                    </section>

                    {/* ABS Breakdown */}
                    <section className="mb-16">
                        <h3 className="text-2xl font-display uppercase mb-8 pb-4 border-b border-black flex items-center gap-3">
                            <AlertTriangle size={24} className="text-[#8b0000]" />
                            Notable Infractions & ABS Highlights
                        </h3>

                        <div className="space-y-8">
                            <div className="group">
                                <div className="flex justify-between items-end mb-4">
                                    <h4 className="text-xl font-display uppercase group-hover:text-blue-700 transition-colors">The 7th Inning Squeeze @ Wrigley</h4>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">High Leverage (1.45)</span>
                                </div>
                                <p className="text-sm font-serif italic leading-relaxed text-gray-600 mb-4 ps-4 border-s-2 border-gray-200">
                                    "It doesn't look like it impacted the game too much on paper, but the mental tax on the batter after that missed strike-to-ball correction was palpable. What are your thoughts?"
                                </p>
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 hover:text-blue-600 transition-colors">
                                        <MessageCircle size={14} /> 24 Comments
                                    </button>
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 hover:text-blue-600 transition-colors">
                                        <Share2 size={14} /> Share Audit
                                    </button>
                                </div>
                            </div>

                            <div className="group pt-8 border-t border-black/5">
                                <div className="flex justify-between items-end mb-4">
                                    <h4 className="text-xl font-display uppercase group-hover:text-blue-700 transition-colors">Umpire Bias: Consistent Variance?</h4>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Trend Alert</span>
                                </div>
                                <p className="text-sm font-serif italic leading-relaxed text-gray-600 mb-4 ps-4 border-s-2 border-gray-200">
                                    "Umpire seemed very biased today for the Cubs in the early innings. Our heatmaps show a distinct widening of the zone whenever the count went to 2-2. Is this human error or a subtle push-back against the system?"
                                </p>
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 hover:text-blue-600 transition-colors">
                                        <MessageCircle size={14} /> 12 Comments
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Standings & Quick Stats */}
                <div className="lg:col-span-4 space-y-12">
                    <div className="border-4 border-double border-black p-6 bg-blue-50/30">
                        <h3 className="text-xl font-display uppercase border-b border-black pb-2 mb-4 text-center flex items-center justify-center gap-2">
                            <TrendingUp size={20} />
                            Standings Impact
                        </h3>
                        <p className="text-xs italic leading-tight text-center mb-6">
                            AI Context: "The Yankees' efficiency in the challenge window today moved them into the 98th percentile for strategic ABS utilization, effectively gaining them 0.4 wins in projected value."
                        </p>
                        <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                <span>1. NY YANKEES</span>
                                <span className="text-emerald-600">+1.2% Efficiency</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest opacity-60">
                                <span>2. LA DODGERS</span>
                                <span>-0.4% Efficiency</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-2 border-dashed border-black/20 text-center rounded-lg bg-white/50">
                        <Users className="mx-auto mb-4 text-gray-400" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">Crowd Commentary</span>
                        <div className="space-y-4 text-left">
                            <div className="text-[10px] font-serif border-b border-black/5 pb-2">
                                <span className="font-bold">@ZoneWatcher:</span> "The logic at Wrigley was definitely flawed. ABS missed the clipping on the corner."
                            </div>
                            <div className="text-[10px] font-serif border-b border-black/5 pb-2">
                                <span className="font-bold">@StatCastFan:</span> "Actually, the POV from the umpire cam confirms the correction was justified."
                            </div>
                        </div>
                        <button className="mt-6 w-full py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded transition-all hover:bg-blue-900">
                            Join the Conversation
                        </button>
                    </div>

                    <section className="p-6 bg-[#2c2c2c] text-[#fcf9f2] rounded-3xl">
                        <h3 className="text-xs font-black uppercase tracking-widest border-b border-white/20 pb-2 mb-6">Midnight Audit Log</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
                                <span>GAMES TRACKED</span>
                                <span>15/15</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
                                <span>CHALLENGES LOGGED</span>
                                <span>42</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
                                <span>ANOMALIES DETECTED</span>
                                <span className="text-yellow-400">03</span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
