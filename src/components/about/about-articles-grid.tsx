"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getAboutIssueMeta, getAboutMonthOptions, sortAboutArticles, type AboutArticle } from "@/lib/about-articles";

const ARTICLE_TYPE_LABELS: Record<AboutArticle["articleType"], string> = {
  project: "Project",
  explainer: "Explainer",
  founder: "Founder",
  profile: "Profile",
};

export function AboutArticlesGrid({ articles }: { articles: AboutArticle[] }) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const sortedArticles = useMemo(() => sortAboutArticles(articles), [articles]);
  const monthOptions = useMemo(() => getAboutMonthOptions(sortedArticles), [sortedArticles]);
  const filteredArticles = useMemo(() => {
    if (activeMonth === "all") return sortedArticles;
    return sortedArticles.filter((article) => getAboutIssueMeta(article, sortedArticles).monthKey === activeMonth);
  }, [activeMonth, sortedArticles]);
  const visibleArticles = showAll ? filteredArticles : filteredArticles.slice(0, 6);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
            Showing {visibleArticles.length} of {filteredArticles.length} pages
          </p>
          <p className="mt-2 text-sm text-[#5a554d]">
            The newest six dossier pages are shown by default. Expand only when you want the full project record.
          </p>
        </div>

        <label className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54] md:ml-auto md:flex-col md:items-end md:gap-2">
          <span>Month</span>
          <select
            value={activeMonth}
            onChange={(event) => {
              setActiveMonth(event.target.value);
              setShowAll(false);
            }}
            className="min-w-[180px] border border-black/15 bg-white/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#2c2c2c] outline-none transition-colors hover:border-black/30"
          >
            <option value="all">All Months</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {visibleArticles.map((article) => {
          const issueMeta = getAboutIssueMeta(article, sortedArticles);

          return (
            <Link
              key={article.slug}
              href={`/about/${article.slug}`}
              className="group block h-full"
              aria-label={`Open ${article.title}`}
            >
              <article className="flex h-full flex-col rounded-[2rem] border border-black/10 bg-white/80 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                  <span className="rounded-full border border-[#e8dfd1] bg-[#f5f0e8] px-2 py-0.5">
                    {ARTICLE_TYPE_LABELS[article.articleType]}
                  </span>
                  <span>{issueMeta.volumeLabel}</span>
                  <span>{issueMeta.issueLabel}</span>
                </div>

                <h2 className="mt-4 text-2xl font-display uppercase tracking-tight leading-tight transition-colors group-hover:text-[#8b0000]">
                  {article.title}
                </h2>
                <p className="mt-2 text-[11px] font-serif uppercase tracking-[0.22em] text-[#7d6c54]">
                  By {article.authorName}
                </p>

                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[#5a554d]">{article.dek}</p>

                <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#7d6c54]">
                  <span>{article.publishedLabel}</span>
                  <span>{issueMeta.publishedDateLabel}</span>
                </div>

                <div className="mt-6 inline-flex text-[11px] font-black uppercase tracking-[0.24em] text-black transition-colors group-hover:text-[#8b0000]">
                  Open Page
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {filteredArticles.length > 6 ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-2xl border-2 border-[#2c2c2c] px-6 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#2c2c2c] transition-all hover:bg-[#2c2c2c] hover:text-[#fcf9f2]"
          >
            {showAll ? "Show Less" : `View All Pages (${filteredArticles.length})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
