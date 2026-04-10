import { loadTerminologySeedBundle } from "./loader";
import type { SelectedTerminologyBundle, TerminologySelectionInput } from "./types";

export function selectTerminologyBundle(input: TerminologySelectionInput): SelectedTerminologyBundle {
  const seedBundle = loadTerminologySeedBundle();

  const stylePack =
    seedBundle.stylePacks.find(
      (candidate) =>
        candidate.surface_key === input.surfaceKey &&
        candidate.audience_mode === input.audienceMode &&
        candidate.status === "active",
    ) ?? null;

  const matchingRule =
    seedBundle.surfaceRules.find(
      (candidate) =>
        candidate.surface_key === input.surfaceKey &&
        candidate.surface_task_family === input.taskFamily &&
        candidate.audience_mode === input.audienceMode,
    ) ?? null;

  if (!matchingRule) {
    return { stylePack, cards: [] };
  }

  const cardsBySlug = new Map(seedBundle.cards.filter((card) => card.status === "active").map((card) => [card.slug, card]));
  const selected = new Map<string, (typeof seedBundle.cards)[number]>();

  for (const slug of matchingRule.required_card_slugs) {
    const card = cardsBySlug.get(slug);
    if (card) selected.set(slug, card);
  }

  const preferred = matchingRule.preferred_card_slugs
    .map((slug) => cardsBySlug.get(slug))
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
    .filter((card) => {
      if (card.required_semantic_tags.length === 0) return true;
      return card.required_semantic_tags.some((tag) => input.semanticTags.includes(tag));
    })
    .sort((left, right) => right.priority - left.priority || left.slug.localeCompare(right.slug));

  const maxCards = Math.min(7, matchingRule.max_cards);
  for (const card of preferred) {
    if (selected.size >= maxCards) break;
    selected.set(card.slug, card);
  }

  return {
    stylePack,
    cards: [...selected.values()],
  };
}
