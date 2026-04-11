import type { SelectedTerminologyBundle } from "./types";

export type CompiledTerminologyAppendix = {
  appendix: string;
  stylePackSlug: string | null;
  selectedCardSlugs: string[];
  appendixChars: number;
};

export function compileTerminologyAppendix(bundle: SelectedTerminologyBundle): CompiledTerminologyAppendix {
  const lines: string[] = [];

  if (bundle.stylePack) {
    lines.push("Voice Pack:");
    lines.push(`- ${bundle.stylePack.description_md}`);
    lines.push(`- ${bundle.stylePack.voice_rules_md}`);
    lines.push(`- ${bundle.stylePack.format_rules_md}`);
    lines.push(`- Avoid: ${bundle.stylePack.banned_patterns_md}`);
  }

  if (bundle.cards.length > 0) {
    lines.push("Preferred Terms:");
    for (const card of bundle.cards) {
      lines.push(`- ${card.canonical_term}: ${card.preferred_phrasing_md}`);
    }

    const banned = bundle.cards
      .map((card) => card.banned_phrasing_md.trim())
      .filter((value) => value.length > 0)
      .slice(0, 6);

    if (banned.length > 0) {
      lines.push("Avoid:");
      for (const item of banned) {
        lines.push(`- ${item}`);
      }
    }
  }

  const appendix = lines.join("\n").trim();
  return {
    appendix,
    stylePackSlug: bundle.stylePack?.slug ?? null,
    selectedCardSlugs: bundle.cards.map((card) => card.slug),
    appendixChars: appendix.length,
  };
}
