import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { getArticleBySlug } from "@/lib/server/articles";
import { GazetteArticle } from "@/components/articles/gazette-article";

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Use the premium Newspaper layout for daily automated summaries
  if (article.articleType === "daily_auto") {
    return <GazetteArticle article={article} />;
  }

  return (
    <div className="min-h-screen bg-[#fcf9f2] px-6 pb-24 pt-28 text-[#2c2c2c]">
      <article className="mx-auto max-w-4xl rounded-[2.5rem] border border-black/10 bg-white/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] md:p-12">
        <header className="border-b border-black/10 pb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
            {article.articleType.replace("_", " ")} •{" "}
            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Draft"}
          </p>
          <h1 className="mt-4 text-4xl font-display uppercase tracking-tight md:text-6xl">{article.title}</h1>
          {article.dek ? <p className="mt-4 max-w-3xl text-base text-[#5a554d]">{article.dek}</p> : null}
        </header>

        <div className="prose mt-8 max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight prose-p:text-[#3d3d3d]">
          <ReactMarkdown>{article.bodyMd}</ReactMarkdown>
        </div>

        {article.sections.length > 0 ? (
          <section className="mt-12 space-y-8 border-t border-black/10 pt-8">
            {article.sections.map((section) => (
              <div key={section.sectionId}>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
                  {section.sectionKind.replace("_", " ")}
                </p>
                <h2 className="mt-2 text-2xl font-display uppercase tracking-tight">{section.heading}</h2>
                <div className="prose mt-3 max-w-none prose-p:text-[#3d3d3d]">
                  <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </article>
    </div>
  );
}
