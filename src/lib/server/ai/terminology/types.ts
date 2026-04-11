export type TerminologyCard = {
  slug: string;
  canonical_term: string;
  card_type: string;
  status: string;
  baseball_domain: string;
  definition_md: string;
  when_to_use_md: string;
  when_not_to_use_md: string;
  preferred_phrasing_md: string;
  banned_phrasing_md: string;
  aliases: string[];
  examples: string[];
  allowed_surfaces: string[];
  allowed_audiences: string[];
  required_semantic_tags: string[];
  forbidden_semantic_tags: string[];
  priority: number;
};

export type StylePack = {
  slug: string;
  surface_key: string;
  audience_mode: "fan" | "org";
  status: string;
  description_md: string;
  voice_rules_md: string;
  format_rules_md: string;
  banned_patterns_md: string;
};

export type SurfaceRule = {
  surface_key: string;
  surface_task_family: string;
  audience_mode: "fan" | "org";
  required_card_slugs: string[];
  preferred_card_slugs: string[];
  max_cards: number;
};

export type TerminologySeedBundle = {
  cards: TerminologyCard[];
  stylePacks: StylePack[];
  surfaceRules: SurfaceRule[];
};

export type TerminologySelectionInput = {
  surfaceKey: string;
  audienceMode: "fan" | "org";
  taskFamily: string;
  semanticTags: string[];
};

export type SelectedTerminologyBundle = {
  stylePack: StylePack | null;
  cards: TerminologyCard[];
};
