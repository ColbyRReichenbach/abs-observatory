import ReactMarkdown from "react-markdown";

import { EditorialProse } from "@/components/editorial/editorial-copy";
import type { ArticleDetail } from "@/lib/server/articles";
import { WeeklyArticleChart, type WeeklyArticleChartEvidence } from "@/components/articles/weekly-article-chart";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWeeklyArticleChartEvidence(value: unknown): value is WeeklyArticleChartEvidence {
  return isRecord(value)
    && typeof value.chartKey === "string"
    && Array.isArray(value.data);
}

export function WeeklyArticleSection({
  section,
}: {
  section: ArticleDetail["sections"][number];
}) {
  const chartEvidence = isWeeklyArticleChartEvidence(section.evidencePayload) ? section.evidencePayload : null;
  const isMethodologySection = section.sectionKey === "evidence_notes";

  if (isMethodologySection) {
    return (
      <details className="mx-auto max-w-[70ch] overflow-hidden rounded-2xl border border-black/10 bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.04)]">
        <summary className="cursor-pointer list-none text-[11px] font-black uppercase tracking-[0.24em] text-[#7d6c54] marker:hidden">
          <span className="inline-flex w-full items-center justify-between gap-4">
            <span>{section.heading}</span>
            <span className="rounded-full border border-black/10 px-2 py-1 text-[9px] text-[#5a554d]">Open</span>
          </span>
        </summary>
        <EditorialProse className="mt-4 min-w-0 max-w-full border-t border-black/10 pt-4">
          <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
        </EditorialProse>
      </details>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[70ch]">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
          {section.sectionKind.replace("_", " ")}
        </p>
        <h2 className="mt-2 text-2xl font-display uppercase tracking-tight">{section.heading}</h2>
        <EditorialProse className="mt-3 max-w-[70ch]">
          <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
        </EditorialProse>
      </div>
      {chartEvidence ? <WeeklyArticleChart evidence={chartEvidence} /> : null}
    </div>
  );
}
