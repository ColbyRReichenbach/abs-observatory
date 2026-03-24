"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Archive } from "lucide-react";

type Article = {
    articleId: string;
    slug: string;
    title: string;
    dek: string | null;
    articleType: string;
    publishedAt: string | null;
};

export function ArticlesGrid({ articles }: { articles: Article[] }) {
    const [showModal, setShowModal] = useState(() => false);
    const [showArchive, setShowArchive] = useState(false);
    const [archiveMonth, setArchiveMonth] = useState(new Date());

    const latest = articles[0];

    // S6-1: Auto-open modal once per session
    useEffect(() => {
        if (latest && !sessionStorage.getItem("debrief-modal-seen")) {
            sessionStorage.setItem("debrief-modal-seen", "1");
            const frame = window.requestAnimationFrame(() => setShowModal(true));
            return () => window.cancelAnimationFrame(frame);
        }
    }, [latest]);

    // Dismiss on Escape
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") setShowModal(false);
    }, []);

    useEffect(() => {
        if (showModal) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [showModal, handleKeyDown]);

    // S6-2: Fixed grid — limit to 9 cards
    const gridArticles = articles.slice(0, 9);

    // S6-4: Calendar data — group articles by date
    const articlesByDate = new Map<string, Article[]>();
    articles.forEach((a) => {
        if (a.publishedAt) {
            const key = new Date(a.publishedAt).toISOString().split("T")[0];
            const existing = articlesByDate.get(key) || [];
            existing.push(a);
            articlesByDate.set(key, existing);
        }
    });

    // Calendar helpers
    const calendarYear = archiveMonth.getFullYear();
    const calendarMonthNum = archiveMonth.getMonth();
    const daysInMonth = new Date(calendarYear, calendarMonthNum + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonthNum, 1).getDay();
    const monthLabel = archiveMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <>
            {/* S6-1: Auto-open frosted modal */}
            <AnimatePresence>
                {showModal && latest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="panel max-w-2xl w-full mx-auto p-10 bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
                            >
                                <X size={18} />
                            </button>
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600 mb-4">
                                    Latest Debrief
                                </p>
                                <h2 className="text-3xl md:text-4xl font-display uppercase tracking-tight text-gray-900 mb-4 leading-tight">
                                    {latest.title}
                                </h2>
                                {latest.dek && (
                                    <p className="text-sm text-[#5a554d] mb-6 max-w-md mx-auto leading-relaxed">
                                        {latest.dek}
                                    </p>
                                )}
                                <Link
                                    href={`/articles/${latest.slug}`}
                                    className="inline-flex px-6 py-3 rounded-2xl bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Read Full Debrief →
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background grid (blurred behind modal) */}
            <div className={showModal ? "blur-sm pointer-events-none transition-all" : "transition-all"}>
                {/* S6-2: Fixed 3-column grid */}
                <AnimatePresence mode="wait">
                    {!showArchive ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                        >
                            {gridArticles.length === 0 ? (
                                <div className="rounded-[2rem] border border-black/10 bg-white/70 p-10 text-center text-sm text-[#5a554d]">
                                    No published articles yet.
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {gridArticles.map((article, idx) => (
                                        <motion.article
                                            key={article.articleId}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group rounded-[2rem] border border-black/10 bg-white/80 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                                        >
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                                                <span className="px-2 py-0.5 rounded-full bg-[#f5f0e8] border border-[#e8dfd1]">
                                                    {article.articleType.replace("_", " ")}
                                                </span>
                                                <span>
                                                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft"}
                                                </span>
                                            </div>
                                            <h2 className="mt-4 text-2xl font-display uppercase tracking-tight leading-tight">
                                                <Link href={`/articles/${article.slug}`} className="transition-colors hover:text-[#8b0000]">
                                                    {article.title}
                                                </Link>
                                            </h2>
                                            {article.dek && (
                                                <p className="mt-3 text-sm text-[#5a554d] line-clamp-2">{article.dek}</p>
                                            )}
                                        </motion.article>
                                    ))}
                                </div>
                            )}

                            {/* S6-3: Browse Archive button */}
                            {articles.length > 0 && (
                                <div className="mt-12 flex justify-center">
                                    <button
                                        onClick={() => setShowArchive(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-[#2c2c2c] text-[11px] font-black uppercase tracking-widest text-[#2c2c2c] hover:bg-[#2c2c2c] hover:text-[#fcf9f2] transition-all shadow-sm hover:shadow-lg"
                                    >
                                        <Archive size={14} />
                                        Browse Archive →
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* S6-4: Calendar Archive View */
                        <motion.div
                            key="calendar"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <button
                                    onClick={() => setShowArchive(false)}
                                    className="text-[11px] font-black uppercase tracking-widest text-[#7d6c54] hover:text-[#2c2c2c] transition-colors"
                                >
                                    ← Back to Grid
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setArchiveMonth(new Date(calendarYear, calendarMonthNum - 1, 1))}
                                        className="p-2 rounded-xl border border-black/10 hover:bg-white transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-sm font-display uppercase tracking-wide text-[#2c2c2c] min-w-[160px] text-center">
                                        {monthLabel}
                                    </span>
                                    <button
                                        onClick={() => setArchiveMonth(new Date(calendarYear, calendarMonthNum + 1, 1))}
                                        className="p-2 rounded-xl border border-black/10 hover:bg-white transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                                {/* Day headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div key={day} className="text-center text-[9px] font-black uppercase tracking-widest text-[#7d6c54] py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Empty cells for day offset */}
                                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                                        <div key={`empty-${i}`} className="aspect-square" />
                                    ))}
                                    {/* Day cells */}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const dayNum = i + 1;
                                        const dateStr = `${calendarYear}-${String(calendarMonthNum + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                                        const dayArticles = articlesByDate.get(dateStr);
                                        const hasArticle = dayArticles && dayArticles.length > 0;
                                        const isToday = dateStr === new Date().toISOString().split("T")[0];

                                        return (
                                            <div
                                                key={dayNum}
                                                className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-sm ${isToday ? "ring-2 ring-blue-400 ring-offset-1" : ""} ${hasArticle ? "bg-[#f5f0e8] hover:bg-[#e8dfd1] cursor-pointer hover:shadow-md" : "text-gray-300"}`}
                                            >
                                                <span className={`text-xs font-bold ${hasArticle ? "text-[#2c2c2c]" : ""}`}>{dayNum}</span>
                                                {hasArticle && (
                                                    <Link href={`/articles/${dayArticles![0].slug}`}>
                                                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#8b0000] block" />
                                                    </Link>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
