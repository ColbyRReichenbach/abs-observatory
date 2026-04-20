export type ArticleDeskKey =
  | "daily_observer"
  | "weekly_editorial"
  | "game_audit"
  | "feature_story"
  | "analysis_notebook";

type DeskMeta = {
  key: ArticleDeskKey;
  label: string;
  deskName: string;
  description: string;
};

const DESKS: Record<ArticleDeskKey, DeskMeta> = {
  daily_observer: {
    key: "daily_observer",
    label: "Daily Observer",
    deskName: "The Absolute Observer",
    description: "Daily same-day ABS recap built from the editorial serving layer.",
  },
  weekly_editorial: {
    key: "weekly_editorial",
    label: "Weekly Editorial",
    deskName: "The Weekly Rotation",
    description: "Longer-form editorial analysis and weekly desk framing.",
  },
  game_audit: {
    key: "game_audit",
    label: "Game Audit",
    deskName: "The Postgame Desk",
    description: "Single-game ABS recap and postgame challenge review.",
  },
  feature_story: {
    key: "feature_story",
    label: "Feature Story",
    deskName: "The Feature Desk",
    description: "Narrative feature work built around AiBS reporting and baseball context.",
  },
  analysis_notebook: {
    key: "analysis_notebook",
    label: "Analysis Notebook",
    deskName: "The Analysis Notebook",
    description: "Model-backed analysis, breakdowns, and evidence-first baseball notes.",
  },
};

function normalizeArticleType(articleType: string | null | undefined): ArticleDeskKey {
  switch (articleType) {
    case "daily_auto":
      return "daily_observer";
    case "weekly_editorial":
      return "weekly_editorial";
    case "game_daily":
      return "game_audit";
    case "feature":
      return "feature_story";
    case "analysis":
      return "analysis_notebook";
    default:
      return "analysis_notebook";
  }
}

export function getArticleDeskMeta(articleType: string | null | undefined): DeskMeta {
  return DESKS[normalizeArticleType(articleType)];
}

export function getArticleDisplayAuthor(articleType: string | null | undefined, authorName: string | null | undefined): string {
  if (articleType === "daily_auto") {
    return authorName?.trim() || "AiBS Editorial Desk";
  }
  if (articleType === "game_daily") {
    return authorName?.trim() || "AiBS Postgame Desk";
  }
  return authorName?.trim() || "Colby Reichenbach";
}
