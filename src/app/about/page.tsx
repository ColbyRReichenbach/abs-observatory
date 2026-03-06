"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#fcf9f2] text-[#2c2c2c] selection:bg-[#d4b483] selection:text-white pb-32">
            {/* Newspaper Header */}
            <header className="pt-20 pb-12 border-b-4 border-double border-[#2c2c2c] max-w-6xl mx-auto px-6 text-center">
                <div className="flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border-b border-black/10 pb-2">
                    <span>Vol. MMXXVI • No. 01</span>
                    <span>Cooperstown, NY</span>
                    <span>Spring 2026</span>
                </div>
                <h1 className="text-7xl md:text-9xl font-display uppercase tracking-tighter leading-none mb-4">
                    The ABS <span className="italic">Gazette</span>
                </h1>
                <div className="h-1 bg-black w-full my-4" />
                <p className="text-lg font-serif italic max-w-2xl mx-auto leading-tight">
                    "Dedicated to the preservation of the strike zone and the advancement of algorithmic precision in the Great American Pastime."
                </p>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Lead Story */}
                <div className="lg:col-span-8 border-r border-black/10 pr-12">
                    <section className="mb-16">
                        <span className="block text-xs font-black uppercase tracking-widest text-[#8b0000] mb-4">Special Report</span>
                        <h2 className="text-5xl font-display uppercase tracking-tight leading-[0.9] mb-8">
                            The Dawn of the <br />
                            <span className="text-6xl text-blue-900 italic">Automated Era</span>
                        </h2>

                        <div className="columns-1 md:columns-2 gap-8 text-sm leading-relaxed font-serif text-justify">
                            <p className="mb-4">
                                <span className="text-5xl float-left mr-3 mt-1 font-display">I</span>t was inevitable, yet revolutionary.
                                The year 2026 marked a turning point where the human eye, as sharp as it may be, was supplemented by the
                                unwavering gaze of the machine. AiBS (Automated Intelligence Ball-Strike) was born not to replace the
                                drama of the diamond, but to ensure its integrity.
                            </p>
                            <p className="mb-4">
                                Our mission is simple: transparency. Every pitch, every challenge, and every decision is logged,
                                analyzed, and presented here in the Observatory. We believe that the beauty of baseball lies in its
                                numbers, and those numbers deserve to be accurate.
                            </p>
                            <p>
                                From the depths of the data lakes to the high-leverage moments of the World Series, we are there.
                                Monitoring the zones, auditing the calls, and providing the fans with the clarity they crave.
                                Welcome to the future of gameday analytics.
                            </p>
                        </div>
                    </section>

                    {/* Baseball Cards Section */}
                    <section className="bg-white/50 p-12 rounded-[3rem] border border-black/5 shadow-inner">
                        <h3 className="text-center text-[10px] font-black uppercase tracking-[0.5em] mb-12 text-gray-400">
                            The Starting Battery
                        </h3>
                        <div className="flex flex-wrap justify-center gap-12">
                            <motion.div
                                whileHover={{ rotate: -2, y: -10, scale: 1.05 }}
                                className="relative group cursor-help"
                            >
                                <div className="absolute inset-0 bg-black/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-64 h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border-8 border-white p-2 bg-[#f4e4bc]">
                                    <Image
                                        src="/images/about/architect.png"
                                        alt="The Architect"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="mt-4 text-center">
                                    <h4 className="font-display text-2xl uppercase">The Architect</h4>
                                    <p className="text-[10px] uppercase font-bold text-blue-800">UI / UX / STRATEGY</p>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ rotate: 2, y: -10, scale: 1.05 }}
                                className="relative group cursor-help"
                            >
                                <div className="absolute inset-0 bg-black/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-64 h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border-8 border-white p-2 bg-[#f4e4bc]">
                                    <Image
                                        src="/images/about/brain.png"
                                        alt="The Brain"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="mt-4 text-center">
                                    <h4 className="font-display text-2xl uppercase">The Brain</h4>
                                    <p className="text-[10px] uppercase font-bold text-red-800">AI / DATA / CORE</p>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar / Ads */}
                <div className="lg:col-span-4 space-y-12">
                    <div className="border border-black p-6 bg-yellow-50/30">
                        <h3 className="text-xl font-display uppercase border-b border-black pb-2 mb-4 text-center">
                            By Local Recommendation
                        </h3>
                        <p className="text-xs italic leading-tight text-center">
                            "We highly recommend users engage with the <b>AiBS Copilot</b> for any queries regarding zone infractions or umpire efficiency metrics."
                        </p>
                    </div>

                    <div className="p-8 border-4 border-double border-black/20 text-center rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#2d5a27] mb-4 block">Gameday Official</span>
                        <div className="text-4xl font-display leading-[0.85] mb-4">
                            STADIUM <br /> SILENCE?
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tighter mb-6">
                            Never. Our live feed persists <br /> through the dark.
                        </p>
                        <div className="h-px bg-black/10 w-12 mx-auto" />
                    </div>

                    <section>
                        <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-6">Latest Box Score</h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center text-xs font-mono border-b border-black/5 pb-2">
                                    <span className="font-bold opacity-60">UMPIRE AUDIT #00{i}</span>
                                    <span className="text-[#8b0000] font-black">98.4% ACC</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
