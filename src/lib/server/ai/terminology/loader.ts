import { z } from "zod";

import terminologyCards from "./seeds/terminology-cards.json";
import stylePacks from "./seeds/style-packs.json";
import surfaceRules from "./seeds/surface-rules.json";
import type { TerminologySeedBundle } from "./types";

let cachedSeedBundle: TerminologySeedBundle | null = null;

const terminologyCardSchema = z.object({
  slug: z.string().min(1),
  canonical_term: z.string().min(1),
  card_type: z.string().min(1),
  status: z.string().min(1),
  baseball_domain: z.string().min(1),
  definition_md: z.string(),
  when_to_use_md: z.string(),
  when_not_to_use_md: z.string(),
  preferred_phrasing_md: z.string(),
  banned_phrasing_md: z.string(),
  aliases: z.array(z.string()),
  examples: z.array(z.string()),
  allowed_surfaces: z.array(z.string()),
  allowed_audiences: z.array(z.string()),
  required_semantic_tags: z.array(z.string()),
  forbidden_semantic_tags: z.array(z.string()),
  priority: z.number(),
});

const stylePackSchema = z.object({
  slug: z.string().min(1),
  surface_key: z.string().min(1),
  audience_mode: z.enum(["fan", "org"]),
  status: z.string().min(1),
  description_md: z.string(),
  voice_rules_md: z.string(),
  format_rules_md: z.string(),
  banned_patterns_md: z.string(),
});

const surfaceRuleSchema = z.object({
  surface_key: z.string().min(1),
  surface_task_family: z.string().min(1),
  audience_mode: z.enum(["fan", "org"]),
  required_card_slugs: z.array(z.string()),
  preferred_card_slugs: z.array(z.string()),
  max_cards: z.number().int().positive(),
});

export function loadTerminologySeedBundle(): TerminologySeedBundle {
  if (cachedSeedBundle) {
    return cachedSeedBundle;
  }

  cachedSeedBundle = {
    cards: z.array(terminologyCardSchema).parse(terminologyCards),
    stylePacks: z.array(stylePackSchema).parse(stylePacks),
    surfaceRules: z.array(surfaceRuleSchema).parse(surfaceRules),
  };

  return cachedSeedBundle;
}
