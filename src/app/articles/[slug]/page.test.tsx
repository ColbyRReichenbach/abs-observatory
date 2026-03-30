import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/server/articles", () => ({
  getArticleBySlug: vi.fn(),
  listPublishedArticles: vi.fn(),
}));

vi.mock("@/components/articles/gazette-article", () => ({
  GazetteArticle: ({ article }: { article: { title: string } }) => <div>gazette:{article.title}</div>,
}));

vi.mock("@/components/articles/weekly-article-section", () => ({
  WeeklyArticleSection: ({ section }: { section: { heading: string } }) => <div>section:{section.heading}</div>,
}));

vi.mock("@/components/ai-feedback", () => ({
  AIFeedback: ({ prompt }: { prompt: string }) => <div>feedback:{prompt}</div>,
}));

import ArticleDetailPage from "@/app/articles/[slug]/page";
import { getArticleBySlug, listPublishedArticles } from "@/lib/server/articles";

describe("article detail page", () => {
  it("renders the authored weekly analysis path with desk label, sections, and feedback", async () => {
    vi.mocked(getArticleBySlug).mockResolvedValueOnce({
      articleId: "article-1",
      slug: "spring-abs",
      title: "Spring ABS",
      authorName: "Colby Reichenbach",
      dek: "Launch feature",
      articleType: "weekly_analysis",
      status: "published",
      publishedAt: "2026-03-24T23:00:00.000Z",
      scheduledPublishAt: null,
      sourceDate: "2026-03-24",
      gamePk: null,
      bodyMd: "Body copy",
      validationState: "passed",
      factsPayload: null,
      derivedMetricsPayload: null,
      hypothesisPayload: null,
      evidencePayload: null,
      sections: [
        {
          sectionId: "section-1",
          sectionKey: "team_identity",
          sectionKind: "derived_metric",
          heading: "Spring Produced Real ABS Identities",
          bodyMd: "Section body",
          sectionOrder: 1,
          evidencePayload: null,
        },
      ],
      evidenceBlobs: [],
      revisions: [],
      contributors: [],
    });
    vi.mocked(listPublishedArticles).mockResolvedValueOnce([
      {
        articleId: "article-1",
        slug: "spring-abs",
        title: "Spring ABS",
        authorName: "Colby Reichenbach",
        dek: "Launch feature",
        articleType: "weekly_analysis",
        status: "published",
        publishedAt: "2026-03-24T23:00:00.000Z",
        scheduledPublishAt: null,
        sourceDate: "2026-03-24",
        gamePk: null,
      },
      {
        articleId: "article-3",
        slug: "opening-day-lookahead",
        title: "Opening Day Lookahead",
        authorName: "Colby Reichenbach",
        dek: "Tomorrow's first watch points",
        articleType: "weekly_analysis",
        status: "published",
        publishedAt: "2026-03-25T02:00:00.000Z",
        scheduledPublishAt: null,
        sourceDate: "2026-03-25",
        gamePk: null,
      },
    ]);

    const page = await ArticleDetailPage({ params: Promise.resolve({ slug: "spring-abs" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Articles");
    expect(html).toContain("The Weekly Rotation");
    expect(html).toContain("By");
    expect(html).toContain("Colby Reichenbach");
    expect(html).toContain("section:Spring Produced Real ABS Identities");
    expect(html).toContain("feedback:Article quality");
    expect(html).toContain("More from The Weekly Rotation");
    expect(html).toContain("Opening Day Lookahead");
  });

  it("routes daily auto articles to the gazette renderer", async () => {
    vi.mocked(getArticleBySlug).mockResolvedValueOnce({
      articleId: "article-2",
      slug: "daily-lead",
      title: "Daily Lead",
      authorName: "AiBS Editorial Desk",
      dek: "Daily recap",
      articleType: "daily_auto",
      status: "published",
      publishedAt: "2026-03-24T23:00:00.000Z",
      scheduledPublishAt: null,
      sourceDate: "2026-03-24",
      gamePk: null,
      bodyMd: "Body copy",
      validationState: "passed",
      factsPayload: null,
      derivedMetricsPayload: null,
      hypothesisPayload: null,
      evidencePayload: null,
      sections: [],
      evidenceBlobs: [],
      revisions: [],
      contributors: [],
    });
    vi.mocked(listPublishedArticles).mockResolvedValueOnce([
      {
        articleId: "article-4",
        slug: "daily-lead",
        title: "Daily Lead",
        authorName: "AiBS Editorial Desk",
        dek: "Daily recap",
        articleType: "daily_auto",
        status: "published",
        publishedAt: "2026-03-24T23:00:00.000Z",
        scheduledPublishAt: null,
        sourceDate: "2026-03-24",
        gamePk: null,
      },
    ]);

    const page = await ArticleDetailPage({ params: Promise.resolve({ slug: "daily-lead" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("gazette:Daily Lead");
  });
});
