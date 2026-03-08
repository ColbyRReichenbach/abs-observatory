"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArticleDetail } from "@/lib/server/articles";
import { FlipCard } from "@/components/about/flip-card";
import { StandingsPulse } from "@/components/articles/standings-pulse";
import { DynamicChart } from "@/components/articles/dynamic-chart";

interface GazetteArticleProps {
    article: ArticleDetail;
}

export function GazetteArticle({ article }: GazetteArticleProps) {
    const publishedDate = article.publishedAt ? new Date(article.publishedAt) : new Date();
    const dateStr = publishedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Sort sections by order
    const sortedSections = [...article.sections].sort((a, b) => a.sectionOrder - b.sectionOrder);

    return (
        <div className="min-h-screen bg-[#fcf9f2] text-[#2c2c2c] selection:bg-[#d4b483] selection:text-white pt-24 pb-32">
            {/* Newspaper Header */}
            <header className="pt-8 pb-12 border-b-4 border-double border-[#2c2c2c] max-w-6xl mx-auto px-6 text-center">
                <div className="flex justify-between items-center mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border-b border-black/10 pb-2">
                    <span>Vol. MMXXVI • No. {publishedDate.getDate()}</span>
                    <span>Cooperstown, NY</span>
                    <span>{dateStr}</span>
                </div>
                <h1 className="text-7xl md:text-9xl font-display uppercase tracking-tighter leading-none mb-4">
                    The Absolute <span className="italic font-serif">Observer</span>
                </h1>
                <div className="h-1 bg-black w-full my-4" />
                <p className="text-lg font-serif italic max-w-2xl mx-auto leading-tight">
                    &ldquo;{article.dek || "Dedicated to the preservation of the strike zone and the advancement of algorithmic precision."}&rdquo;
                </p>

                {article.authorName && (
                    <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="h-px bg-black/20 w-12" />
                        <span className="text-sm font-serif italic">By <span className="font-bold uppercase not-italic tracking-wider">{article.authorName}</span></span>
                        <div className="h-px bg-black/20 w-12" />
                    </div>
                )}
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Content Area */}
                <div className="lg:col-span-8 border-r border-black/10 pr-12">
                    {sortedSections.map((section) => {
                        // Desktop Slot: Lead Story
                        if (section.sectionKey === "lead_recap" || section.sectionKey === "lead_story") {
                            return (
                                <section key={section.sectionId} className="mb-16">
                                    <span className="block text-xs font-black uppercase tracking-widest text-[#8b0000] mb-4">Main Page One</span>
                                    <h2 className="text-5xl font-display uppercase tracking-tight leading-[0.9] mb-8">
                                        {section.heading}
                                    </h2>
                                    <div className="columns-1 md:columns-2 gap-8 text-sm leading-relaxed font-serif text-justify prose prose-sm max-w-none">
                                        <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                                    </div>
                                </section>
                            );
                        }

                        // Desktop Slot: Audit Desk (Umpire Analysis)
                        if (section.sectionKey === "audit_desk") {
                            const evidence = section.evidencePayload as any;
                            return (
                                <section key={section.sectionId} className="mb-16 bg-white/40 p-10 rounded-3xl border border-black/5 shadow-inner">
                                    <span className="block text-xs font-black uppercase tracking-[0.5em] text-gray-400 mb-8 text-center underline underline-offset-8">THE AUDIT DESK</span>
                                    <h2 className="text-4xl font-display uppercase tracking-tight leading-none mb-6 text-center italic">
                                        {section.heading}
                                    </h2>
                                    <div className="prose prose-sm font-serif leading-relaxed italic text-gray-700 max-w-2xl mx-auto text-center mb-10">
                                        <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-8">
                                        <FlipCard
                                            title={evidence?.umpireName || "Umpire Audit"}
                                            subtitle="HIGH-LEVERAGE PERFORMANCE"
                                            imageSrc="/images/stadiums/empty-stadium.png"
                                            imageAlt="Umpire Stats"
                                            subtitleColor="text-red-900"
                                            linkHref="#"
                                            rotateDegree={1}
                                            stats={[
                                                { label: "Stability", value: evidence?.stability || "Audit" },
                                                { label: "WPA Swing", value: evidence?.wpaSwing || "TBD" },
                                                { label: "Success %", value: evidence?.accuracy || "92.1%" },
                                                { label: "Reversed", value: evidence?.reversed || "N/A" }
                                            ]}
                                            description={evidence?.context || "A breakdown of pivotal calls where the human eye was corrected by the machine gaze."}
                                        />
                                    </div>
                                    <div className="mt-8 text-center">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">
                                            Telemetry Source Records: <span className="text-black/80">Atlas Absolute System</span>
                                        </span>
                                    </div>
                                </section>
                            );
                        }

                        // Desktop Slot: Data Lab (Charts / Infographics)
                        if (section.sectionKey === "data_lab") {
                            const evidence = section.evidencePayload as any;
                            return (
                                <section key={section.sectionId} className="mb-16 border-l-8 border-black pl-8">
                                    <span className="block text-xs font-black uppercase tracking-widest text-blue-900 mb-4">The Data Lab</span>
                                    <h2 className="text-4xl font-display uppercase tracking-tight mb-6">
                                        {section.heading}
                                    </h2>
                                    <div className="prose prose-sm font-serif mb-8 text-justify">
                                        <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                                    </div>
                                    <div className="bg-black/5 rounded-xl aspect-[16/9] flex items-center justify-center border border-black/10 overflow-hidden p-6">
                                        {evidence?.chartType ? (
                                            <DynamicChart
                                                type={evidence.chartType}
                                                data={evidence.data || []}
                                                xAxisKey={evidence.xAxisKey}
                                                yAxisKey={evidence.yAxisKey}
                                                title={evidence.chartTitle}
                                            />
                                        ) : (
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                [ Dynamic Data Visualization: {section.heading} ]
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 text-right">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">
                                            Telemetry Research & Calculation: <span className="text-black/80">Theo Telemetry</span>
                                        </span>
                                    </div>
                                </section>
                            );
                        }

                        // Desktop Slot: Stat Recap / Daily Performance
                        if (section.sectionKey === "stat_recap") {
                            return (
                                <section key={section.sectionId} className="mb-16 p-8 border-y-2 border-black/10">
                                    <h3 className="text-center text-[10px] font-black uppercase tracking-[0.5em] mb-8 text-gray-400">
                                        DAILY PERFORMANCE SUMMARY
                                    </h3>
                                    <div className="prose prose-sm font-serif text-sm max-w-none mb-8">
                                        <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                                    </div>
                                </section>
                            );
                        }

                        // Generic Fallback
                        return (
                            <section key={section.sectionId} className="mb-12">
                                <h3 className="text-2xl font-display uppercase tracking-tight mb-4">{section.heading}</h3>
                                <div className="prose prose-sm font-serif">
                                    <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Right Sidebar Area */}
                <div className="lg:col-span-4 space-y-12">
                    <div className="border border-black p-6 bg-yellow-50/30">
                        <h3 className="text-xl font-display uppercase border-b border-black pb-2 mb-4 text-center">
                            Editor&apos;s Note
                        </h3>
                        <p className="text-xs italic leading-tight text-center">
                            &ldquo;Today&apos;s data suggests a league in transition, where the margin of error is narrower than a baseball&apos;s seam.&rdquo;
                        </p>
                    </div>

                    <div className="p-8 border-4 border-double border-black/20 text-center rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#2d5a27] mb-4 block">Official Summary</span>
                        <div className="text-4xl font-display leading-[0.85] mb-4 uppercase">
                            {article.title.replace("ABS Daily Recap: ", "")}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-tighter mb-6">
                            AI-Generated • Deep Analysis <br /> of league-wide telemetry.
                        </p>
                        <div className="h-px bg-black/10 w-12 mx-auto" />
                    </div>

                    {/* Standings Pulse Desk */}
                    {article.sections.filter(s => s.sectionKey === "standings_pulse").map(s => {
                        const evidence = s.evidencePayload as any;
                        if (!evidence?.al || !evidence?.nl) return null;
                        return (
                            <StandingsPulse
                                key={s.sectionId}
                                al={evidence.al}
                                nl={evidence.nl}
                            />
                        );
                    })}

                    {/* Scout Notes Desk (Milestones) */}
                    <section className="bg-white/50 p-6 border-l-4 border-[#8b0000]">
                        <h3 className="text-xs font-black uppercase tracking-widest border-b border-black/10 pb-2 mb-4">SCOUT&apos;S NOTES</h3>
                        <div className="space-y-4">
                            {article.sections.filter(s => s.sectionKey === "scout_notes").map(s => (
                                <div key={s.sectionId} className="prose prose-xs font-serif italic text-gray-700">
                                    <ReactMarkdown>{s.bodyMd}</ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border border-black/15 bg-white/70 p-6 rounded-2xl">
                        <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-black pb-2 mb-4">
                            Telemetry Disclosure
                        </h3>
                        <div className="space-y-4 text-xs leading-relaxed font-serif">
                            <p>
                                Performance data based on Optical Tracking V4. Calculations include Win Probability Added (WPA) as calculated by the ABS Lab.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
