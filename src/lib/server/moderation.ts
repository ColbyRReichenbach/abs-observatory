const FLAGGED_TERMS = ["kill yourself", "racial slur", "hate speech"];

export type ModerationResult = {
  moderationStatus: "published" | "pending_review";
  toxicityScore: number;
  flags: string[];
};

export function moderateComment(body: string): ModerationResult {
  const normalized = body.toLowerCase();
  const flags = FLAGGED_TERMS.filter((term) => normalized.includes(term));
  const exclamationWeight = Math.min((body.match(/!/g) ?? []).length * 0.03, 0.12);
  const toxicityScore = Math.min(0.08 + exclamationWeight + flags.length * 0.35, 0.99);

  return {
    moderationStatus: flags.length > 0 ? "pending_review" : "published",
    toxicityScore,
    flags,
  };
}
