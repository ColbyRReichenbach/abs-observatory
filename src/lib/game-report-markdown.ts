export const REPORT_SECTION_LABELS = [
    "Headline",
    "Challenge Ledger",
    "Turning Points",
    "Key Moments",
    "Umpire Context",
    "Team Strategy Notes",
    "Caveats",
] as const;

const REPORT_SECTION_PATTERN = REPORT_SECTION_LABELS.join("|");

export function normalizeNarrativeMarkdown(markdown: string) {
    const cleanedMarkdown = markdown
        .replace(/\r\n/g, "\n")
        .replace(/^```(?:markdown|md)?\s*\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
    const lines = cleanedMarkdown.split("\n");

    return lines
        .flatMap((line) => {
            const trimmed = line.trim();
            if (!trimmed) return [line];

            const inlineSectionMatch = trimmed.match(
                new RegExp(`^\\**\\s*(${REPORT_SECTION_PATTERN})\\s*:?\\**\\s*(.+)?$`, "i"),
            );

            if (inlineSectionMatch) {
                const heading = REPORT_SECTION_LABELS.find(
                    (label) => label.toLowerCase() === inlineSectionMatch[1].toLowerCase(),
                );
                const rest = inlineSectionMatch[2]?.trim();
                if (!heading) return [line];
                return rest ? [`## ${heading}`, "", rest] : [`## ${heading}`];
            }

            return [line];
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");
}
