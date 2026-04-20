"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, ChevronLeft, ChevronRight } from "lucide-react";

import { ModeAwareLink } from "@/components/ui/mode-aware-link";
import { getArticleDeskMeta } from "@/lib/articles-desk";

type Article = {
  articleId: string;
  slug: string;
  title: string;
  dek: string | null;
  articleType: string;
  publishedAt: string | null;
};

export function ArticlesGrid({ articles }: { articles: Article[] }) {
  const [showArchive, setShowArchive] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState(new Date());

  const leadArticle = articles[0] ?? null;
  const supportingArticles = articles.slice(1, 9);

  const articlesByDate = new Map<string, Article[]>();
  for (const article of articles) {
    if (!article.publishedAt) continue;
    const key = new Date(article.publishedAt).toISOString().split("T")[0];
    const existing = articlesByDate.get(key) ?? [];
    existing.push(article);
    articlesByDate.set(key, existing);
  }

  const calendarYear = archiveMonth.getFullYear();
  const calendarMonthNum = archiveMonth.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonthNum + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonthNum, 1).getDay();
  const monthLabel = archiveMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <AnimatePresence mode="wait">
      {!showArchive ? (
        <motion.div
          key="desk"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {leadArticle ? (
            <ModeAwareLink
              href={`/articles/${leadArticle.slug}`}
              className="block rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                Featured • {getArticleDeskMeta(leadArticle.articleType).label}
              </p>
              <h2 className="mt-4 text-4xl font-display uppercase tracking-tight leading-[0.95] text-[#2c2c2c] md:text-5xl">
                {leadArticle.title}
              </h2>
              {leadArticle.dek ? (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5a554d]">{leadArticle.dek}</p>
              ) : null}
            </ModeAwareLink>
          ) : (
            <div className="rounded-[2rem] border border-black/10 bg-white/70 p-10 text-center text-sm text-[#5a554d]">
              No published articles yet.
            </div>
          )}

          {supportingArticles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {supportingArticles.map((article) => (
                <article
                  key={article.articleId}
                  className="rounded-[2rem] border border-black/10 bg-white/80 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                    <span className="rounded-full border border-[#e8dfd1] bg-[#f5f0e8] px-2 py-0.5">
                      {getArticleDeskMeta(article.articleType).label}
                    </span>
                    <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft"}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-display uppercase tracking-tight leading-tight">
                    <ModeAwareLink href={`/articles/${article.slug}`} className="transition-colors hover:text-[#8b0000]">
                      {article.title}
                    </ModeAwareLink>
                  </h3>
                  {article.dek ? <p className="mt-3 text-sm text-[#5a554d] line-clamp-3">{article.dek}</p> : null}
                </article>
              ))}
            </div>
          ) : null}

          {articles.length > 0 ? (
            <div className="flex justify-center">
              <button
                onClick={() => setShowArchive(true)}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#2c2c2c] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-[#2c2c2c] transition hover:bg-[#2c2c2c] hover:text-[#fcf9f2]"
              >
                <Archive size={14} />
                Browse Archive
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          key="archive"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setShowArchive(false)}
              className="text-[11px] font-black uppercase tracking-widest text-[#7d6c54] transition hover:text-[#2c2c2c]"
            >
              ← Back to Desk
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setArchiveMonth(new Date(calendarYear, calendarMonthNum - 1, 1))}
                className="rounded-xl border border-black/10 p-2 transition hover:bg-white"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[160px] text-center text-sm font-display uppercase tracking-wide text-[#2c2c2c]">
                {monthLabel}
              </span>
              <button
                onClick={() => setArchiveMonth(new Date(calendarYear, calendarMonthNum + 1, 1))}
                className="rounded-xl border border-black/10 p-2 transition hover:bg-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2 text-center text-[9px] font-black uppercase tracking-widest text-[#7d6c54]">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${calendarYear}-${String(calendarMonthNum + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayArticles = articlesByDate.get(dateStr);
                const hasArticle = Boolean(dayArticles?.length);
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={dayNum}
                    className={`aspect-square rounded-xl text-sm transition-all ${
                      isToday ? "ring-2 ring-blue-400 ring-offset-1" : ""
                    } ${hasArticle ? "bg-[#f5f0e8] hover:bg-[#e8dfd1]" : "text-gray-300"}`}
                  >
                    {hasArticle ? (
                      <ModeAwareLink href={`/articles/${dayArticles![0].slug}`} className="flex h-full w-full flex-col items-center justify-center">
                        <span className="text-xs font-bold text-[#2c2c2c]">{dayNum}</span>
                        <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-[#8b0000]" />
                      </ModeAwareLink>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-xs font-bold">{dayNum}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
