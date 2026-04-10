import terminologyCards from "./seeds/terminology-cards.json";
import stylePacks from "./seeds/style-packs.json";
import surfaceRules from "./seeds/surface-rules.json";
import type { TerminologySeedBundle } from "./types";

let cachedSeedBundle: TerminologySeedBundle | null = null;

export function loadTerminologySeedBundle(): TerminologySeedBundle {
  if (cachedSeedBundle) {
    return cachedSeedBundle;
  }

  cachedSeedBundle = {
    cards: terminologyCards,
    stylePacks,
    surfaceRules,
  };

  return cachedSeedBundle;
}
