import Link from "next/link";

import { FlipCard } from "@/components/about/flip-card";
import { BackPill } from "@/components/ui/back-pill";
import { ABOUT_ARTICLES, getAboutIssueMeta, type AboutArticle } from "@/lib/about-articles";

function ArticleTypeLabel({ articleType }: { articleType: AboutArticle["articleType"] }) {
  const labels: Record<AboutArticle["articleType"], string> = {
    project: "Project Page",
    explainer: "Explainer",
    founder: "Founder Page",
    profile: "System Page",
  };

  return <>{labels[articleType]}</>;
}

export function AboutArticleView({ article }: { article: AboutArticle }) {
  const relatedArticles = ABOUT_ARTICLES.filter((candidate) => article.relatedSlugs.includes(candidate.slug));
  const issueMeta = getAboutIssueMeta(article);

  return (
    <div className="min-h-screen bg-[#fcf9f2] px-6 pb-24 pt-32 text-[#2c2c2c]">
      <article className="mx-auto max-w-6xl">
        <BackPill label="About" href="/about" />

        <header className="mt-10 border-b-4 border-double border-[#2c2c2c] pb-8">
          <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${article.accentClass}`}>
            {article.heroEyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl font-display uppercase tracking-tight md:text-7xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#5a554d] md:text-base">{article.dek}</p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px w-12 bg-black/20" />
            <p className="text-sm font-serif italic text-[#3d3d3d]">
              <span>By</span>
              <span className="ml-2 font-bold uppercase not-italic tracking-[0.18em]">{article.authorName}</span>
            </p>
            <div className="h-px w-12 bg-black/20" />
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
            <span>
              <ArticleTypeLabel articleType={article.articleType} />
            </span>
            <span>{issueMeta.volumeLabel}</span>
            <span>{issueMeta.issueLabel}</span>
            <span>{article.publishedLabel}</span>
            <span>{issueMeta.publishedDateLabel}</span>
            <span>{article.readTime}</span>
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:border-r lg:border-black/15 lg:pr-10">
            <section>
              <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${article.accentClass}`}>
                Overview
              </p>
              <h2 className="mt-3 text-3xl font-display uppercase tracking-tight md:text-5xl">
                {article.heroHeading}
              </h2>
              <div className="mt-6 columns-1 gap-8 text-base font-serif leading-8 text-[#3d3d3d] md:columns-2">
                {article.leadParagraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-5 break-inside-avoid">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {article.featureCards?.length ? (
              <section className="mt-12 border-y border-black/15 py-8">
                <h3 className="text-center text-[11px] font-black uppercase tracking-[0.35em] text-[#7d6c54]">
                  Linked Pages
                </h3>
                <div className="mt-8 flex flex-wrap justify-center gap-10">
                  {article.featureCards.map((card) => (
                    <FlipCard key={card.linkHref} {...card} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-12 space-y-10">
              {article.sections.map((section) => (
                <div key={section.heading} className="border-t border-black/10 pt-6">
                  {section.eyebrow ? (
                    <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${article.accentClass}`}>
                      {section.eyebrow}
                    </p>
                  ) : null}
                  <h3 className="mt-3 text-2xl font-display uppercase tracking-tight md:text-4xl">
                    {section.heading}
                  </h3>
                  <div className="mt-5 columns-1 gap-8 text-base font-serif leading-8 text-[#3d3d3d] md:columns-2">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mb-5 break-inside-avoid">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {section.bullets?.length ? (
                    <ul className="mt-6 space-y-3 border-t border-black/10 pt-6 text-sm leading-7 text-[#4b463f]">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className={article.accentClass}>•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.stats?.length ? (
                    <div className="mt-6 grid gap-4 border-t border-black/10 pt-6 md:grid-cols-3">
                      {section.stats.map((stat) => (
                        <div key={stat.label} className="border border-black/10 bg-[#f8f3eb] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">{stat.label}</p>
                          <p className="mt-2 text-xl font-display uppercase tracking-tight text-black">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {section.pullQuote ? (
                    <blockquote className="mt-6 border-l-4 border-black pl-5 font-serif text-lg italic leading-8 text-[#2c2c2c]">
                      {section.pullQuote}
                    </blockquote>
                  ) : null}
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-10 lg:col-span-4">
            <section className="border-t-4 border-double border-[#2c2c2c] pt-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
                Quick Facts
              </h3>
              <div className="mt-5 space-y-4">
                {article.quickFacts.map((fact) => (
                  <div key={fact.label} className="border-b border-black/10 pb-4 last:border-b-0 last:pb-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">{fact.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[#3d3d3d]">{fact.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {article.sources?.length ? (
              <section className="border-t border-black/15 pt-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
                  Source Material
                </h3>
                <div className="mt-5 space-y-3">
                  {article.sources.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm leading-6 text-[#3d3d3d] underline decoration-black/20 underline-offset-4 transition-colors hover:text-black"
                    >
                      {source.label}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="border-t border-black/15 pt-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
                More from the Dossier
              </h3>
              <div className="mt-5 space-y-5">
                {relatedArticles.map((relatedArticle) => (
                  <div key={relatedArticle.slug} className="border-b border-black/10 pb-5 last:border-b-0 last:pb-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7d6c54]">
                      {relatedArticle.publishedLabel}
                    </p>
                    <Link
                      href={`/about/${relatedArticle.slug}`}
                      className="mt-2 block text-xl font-display uppercase tracking-tight leading-tight transition-colors hover:text-[#8b0000]"
                    >
                      {relatedArticle.title}
                    </Link>
                    <p className="mt-2 text-sm leading-6 text-[#5a554d]">{relatedArticle.dek}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </article>
    </div>
  );
}
