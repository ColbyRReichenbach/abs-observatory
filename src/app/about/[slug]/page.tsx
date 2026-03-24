import { notFound } from "next/navigation";

import { AboutArticleView } from "@/components/about/about-article-view";
import { ABOUT_ARTICLES, getAboutArticleBySlug } from "@/lib/about-articles";

export function generateStaticParams() {
  return ABOUT_ARTICLES.flatMap((article) => [
    { slug: article.slug },
    ...(article.aliases?.map((alias) => ({ slug: alias })) ?? []),
  ]);
}

export default async function AboutArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getAboutArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return <AboutArticleView article={article} />;
}
