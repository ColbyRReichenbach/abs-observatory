import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { getArticleBySlug, listPublishedArticles } from "@/lib/server/articles";
import { GazetteArticle } from "@/components/articles/gazette-article";
import { ArticleRelatedRail } from "@/components/articles/article-related-rail";
import { WeeklyArticleSection } from "@/components/articles/weekly-article-section";
import { AIFeedback } from "@/components/ai-feedback";
import { getArticleDeskMeta, getArticleDisplayAuthor } from "@/lib/articles-desk";
import { BackPill } from "@/components/ui/back-pill";
import { EditorialProse } from "@/components/editorial/editorial-copy";

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const publishedArticles = await listPublishedArticles(12);
  const relatedArticles = [
    ...publishedArticles.filter((candidate) => candidate.slug !== slug && candidate.articleType === article.articleType),
    ...publishedArticles.filter((candidate) => candidate.slug !== slug && candidate.articleType !== article.articleType),
  ].slice(0, 3);

  // Use the premium Newspaper layout for daily automated summaries
  if (article.articleType === "daily_auto") {
    return <GazetteArticle article={article} relatedArticles={relatedArticles} />;
  }

  const deskMeta = getArticleDeskMeta(article.articleType);
  const displayAuthor = getArticleDisplayAuthor(article.articleType, article.authorName);

  return (
    <div className="min-h-screen bg-[#fcf9f2] px-6 pb-24 pt-28 text-[#2c2c2c]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <BackPill label="Articles" href="/articles" />
        </div>

        <article className="rounded-[2.5rem] border border-black/10 bg-white/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] md:p-12">
          <header className="mx-auto max-w-[70ch] border-b border-black/10 pb-8">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
              {deskMeta.deskName} •{" "}
              {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft"}
            </p>
            <h1 className="mt-4 text-4xl font-display uppercase tracking-tight md:text-6xl">{article.title}</h1>
            {article.dek ? <p className="mt-4 text-base text-[#5a554d]">{article.dek}</p> : null}
            <p className="mt-6 text-sm font-serif italic text-[#5a554d]">
              By <span className="font-bold uppercase not-italic tracking-[0.14em] text-[#2c2c2c]">{displayAuthor}</span>
            </p>
          </header>

          <EditorialProse className="mx-auto mt-8 max-w-[70ch]">
            <ReactMarkdown>{article.bodyMd}</ReactMarkdown>
          </EditorialProse>

          {article.sections.length > 0 ? (
            <section className="mt-12 space-y-8 border-t border-black/10 pt-8">
              {article.sections.map((section) => (
                <WeeklyArticleSection key={section.sectionId} section={section} />
              ))}
            </section>
          ) : null}

          <section className="mt-12 border-t border-black/10 pt-8">
            <AIFeedback
              surface="article"
              targetType="article"
              targetId={article.articleId}
              articleId={article.articleId}
              metadata={{ articleType: article.articleType, slug: article.slug }}
              prompt="Article quality"
            />
          </section>

          <div className="mt-12">
            <ArticleRelatedRail articles={relatedArticles} heading={`More from ${deskMeta.deskName}`} />
          </div>
        </article>
      </div>
    </div>
  );
}
