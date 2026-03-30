export type ArticleDeskKey = "daily_ai_recap" | "weekly_analysis";

type DeskMeta = {
  key: ArticleDeskKey;
  label: string;
  deskName: string;
  description: string;
};

const DESKS: Record<ArticleDeskKey, DeskMeta> = {
  daily_ai_recap: {
    key: "daily_ai_recap",
    label: "The Daily Lead",
    deskName: "The Daily Lead",
    description: "AI-generated daily ABS desk recap.",
  },
  weekly_analysis: {
    key: "weekly_analysis",
    label: "The Weekly Rotation",
    deskName: "The Weekly Rotation",
    description: "Authored weekly baseball analysis.",
  },
};

function normalizeArticleType(articleType: string | null | undefined): ArticleDeskKey {
  return articleType === "daily_auto" ? "daily_ai_recap" : "weekly_analysis";
}

export function getArticleDeskMeta(articleType: string | null | undefined): DeskMeta {
  return DESKS[normalizeArticleType(articleType)];
}

export function getArticleDisplayAuthor(articleType: string | null | undefined, authorName: string | null | undefined): string {
  if (normalizeArticleType(articleType) === "daily_ai_recap") {
    return authorName?.trim() || "AiBS Editorial Desk";
  }
  return authorName?.trim() || "Colby Reichenbach";
}
