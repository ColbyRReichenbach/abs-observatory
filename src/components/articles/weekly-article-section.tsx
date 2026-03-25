import ReactMarkdown from "react-markdown";

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

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">
        {section.sectionKind.replace("_", " ")}
      </p>
      <h2 className="mt-2 text-2xl font-display uppercase tracking-tight">{section.heading}</h2>
      <div className="prose mt-3 max-w-none prose-p:text-[#3d3d3d]">
        <ReactMarkdown>{section.bodyMd}</ReactMarkdown>
      </div>
      {chartEvidence ? <WeeklyArticleChart evidence={chartEvidence} /> : null}
    </div>
  );
}
