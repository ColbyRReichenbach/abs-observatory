import { getArticleDeskMeta } from "@/lib/articles-desk";
import type { ArticleListItem } from "@/lib/server/articles";
import { ModeAwareLink } from "@/components/ui/mode-aware-link";

type ArticleRelatedRailProps = {
  articles: ArticleListItem[];
  heading: string;
  browseHref?: string;
};

export function ArticleRelatedRail({
  articles,
  heading,
  browseHref = "/articles",
}: ArticleRelatedRailProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-black/10 pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">Continue Reading</p>
          <h2 className="mt-2 text-2xl font-display uppercase tracking-tight md:text-3xl">{heading}</h2>
        </div>
        <ModeAwareLink
          href={browseHref}
          className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54] transition-colors hover:text-black"
        >
          See all articles →
        </ModeAwareLink>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {articles.map((article) => {
          const deskMeta = getArticleDeskMeta(article.articleType);

          return (
            <article
              key={article.articleId}
              className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                <span className="rounded-full border border-[#e8dfd1] bg-[#f5f0e8] px-2 py-0.5">{deskMeta.label}</span>
                <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft"}</span>
              </div>

              <ModeAwareLink
                href={`/articles/${article.slug}`}
                className="mt-4 block text-2xl font-display uppercase tracking-tight leading-tight transition-colors hover:text-[#8b0000]"
              >
                {article.title}
              </ModeAwareLink>

              {article.dek ? <p className="mt-3 text-sm leading-6 text-[#5a554d]">{article.dek}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
