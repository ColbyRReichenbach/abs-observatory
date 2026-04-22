import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { coerceInternalRouteScope, getSharedBarChartScale, getSharedBarSegment, normalizeInternalRouteScope } from "@/lib/ai-share";
import type { AIVisualizerPlan } from "@/lib/types";
import { getPublicAiArtifactById } from "@/lib/server/ai-generations";

export const dynamic = "force-dynamic";

type SharedVisualizerPayload = {
  structuredPlan?: AIVisualizerPlan | null;
  citations?: string[] | null;
  query?: string | null;
  contextLabel?: string | null;
};

function isVisualizerPayload(value: unknown): value is SharedVisualizerPayload {
  return typeof value === "object" && value !== null;
}

function formatChartType(chartType: AIVisualizerPlan["chartType"]) {
  switch (chartType) {
    case "bar_chart":
      return "Bar Chart";
    case "line_chart":
      return "Line Chart";
    case "scatter_plot":
      return "Scatter Plot";
    case "heatmap":
      return "Heatmap";
    case "timeline":
      return "Timeline";
    case "table":
      return "Table";
    default:
      return chartType;
  }
}

async function loadSharedVisualizer(vizId: string) {
  const artifact = await getPublicAiArtifactById(vizId);
  if (!artifact) return null;

  const payload = isVisualizerPayload(artifact.artifactPayload) ? artifact.artifactPayload : null;
  const plan = payload?.structuredPlan ?? null;
  if (!plan) return null;

  return {
    artifact,
    payload,
    plan,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ vizId: string }> }): Promise<Metadata> {
  const { vizId } = await params;
  const shared = await loadSharedVisualizer(vizId);

  if (!shared) {
    return {
      title: "Visualization Not Found — ABS Observatory",
      description: "This shared AiBS chart is unavailable.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${shared.plan.chartTitle} — AiBS`;
  const description = shared.artifact.summary ?? shared.plan.highlight;
  const imageUrl = `/api/viz-og/${vizId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

function SharedBarChart({ plan }: { plan: AIVisualizerPlan }) {
  const points = plan.dataPoints
    .filter((point) => typeof point.y === "number")
    .map((point) => ({ x: String(point.x), y: Number(point.y) }));
  const scale = getSharedBarChartScale(points.map((point) => point.y));
  const segments = points.map((point) => ({
    ...point,
    segment: getSharedBarSegment(point.y, scale),
  }));

  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-6">
      <div className="relative flex h-72 gap-4 rounded-[1.5rem] border border-gray-100 bg-white px-6 pb-6 pt-10">
        <div
          className="pointer-events-none absolute left-6 right-6 border-t border-dashed border-gray-200"
          style={{ bottom: `calc(1.5rem + ${scale.baselinePct}%)` }}
        />
        {segments.map((point) => (
          <div key={point.x} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="text-xs font-bold text-gray-500">{point.y.toFixed(2).replace(/\.00$/, "")}</div>
            <div className="relative h-full w-full">
              <div
                className={`absolute w-full ${point.segment.isPositive ? "rounded-t-3xl bg-blue-500" : "rounded-b-3xl bg-blue-300"}`}
                style={{
                  bottom: `${point.segment.bottomPct}%`,
                  height: `${point.segment.heightPct}%`,
                }}
              />
            </div>
            <div className="truncate text-center text-[11px] font-semibold text-gray-500">{point.x}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SharedTableChart({ plan }: { plan: AIVisualizerPlan }) {
  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
            <th className="px-3">X</th>
            <th className="px-3">Y</th>
            <th className="px-3">Series</th>
          </tr>
        </thead>
        <tbody>
          {plan.dataPoints.map((point, index) => (
            <tr key={`${point.x}-${point.y}-${index}`}>
              <td className="rounded-l-2xl border border-r-0 border-gray-100 px-3 py-3 text-sm font-semibold text-gray-900">
                {point.x}
              </td>
              <td className="border-y border-gray-100 px-3 py-3 text-sm font-semibold text-gray-900">{point.y}</td>
              <td className="rounded-r-2xl border border-l-0 border-gray-100 px-3 py-3 text-sm text-gray-600">
                {point.series ?? point.label ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SharedHeatmapChart({ plan }: { plan: AIVisualizerPlan }) {
  const xValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.x))));
  const yValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.y))));
  const maxValue = Math.max(...plan.dataPoints.map((point) => Number(point.value ?? 0)), 1);

  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
      <div className="grid gap-3" style={{ gridTemplateColumns: `120px repeat(${xValues.length}, minmax(0, 1fr))` }}>
        <div />
        {xValues.map((xValue) => (
          <div key={xValue} className="text-center text-[11px] font-semibold text-gray-500">
            {xValue}
          </div>
        ))}
        {yValues.flatMap((yValue) => [
          <div key={`row-${yValue}`} className="flex items-center text-[11px] font-semibold text-gray-500">
            {yValue}
          </div>,
          ...xValues.map((xValue) => {
            const point = plan.dataPoints.find((entry) => String(entry.x) === xValue && String(entry.y) === yValue);
            const value = Number(point?.value ?? 0);
            const alpha = 0.14 + (value / maxValue) * 0.72;
            return (
              <div
                key={`${xValue}-${yValue}`}
                className="flex h-14 items-center justify-center rounded-2xl border border-white/50 text-sm font-black text-gray-900"
                style={{ backgroundColor: `rgba(37,99,235,${alpha})` }}
              >
                {value.toFixed(2).replace(/\.00$/, "")}
              </div>
            );
          }),
        ])}
      </div>
    </div>
  );
}

function SharedChart({ plan }: { plan: AIVisualizerPlan }) {
  if (plan.chartType === "heatmap") return <SharedHeatmapChart plan={plan} />;
  if (plan.chartType === "table") return <SharedTableChart plan={plan} />;
  return <SharedBarChart plan={plan} />;
}

export default async function VizPage({ params }: { params: Promise<{ vizId: string }> }) {
  const { vizId } = await params;
  if (!vizId || vizId.length < 3) return notFound();

  const shared = await loadSharedVisualizer(vizId);
  if (!shared) return notFound();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 lg:py-20">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Shared Chart</p>
          <h1 className="mt-2 text-4xl font-display uppercase tracking-tight text-gray-900">{shared.plan.chartTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            {shared.artifact.summary ?? shared.plan.highlight}
          </p>
        </div>
        <Link
          href={normalizeInternalRouteScope(shared.artifact.routeScope, "/profile")}
          className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          Open in AiBS
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.04]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Preview</p>
              <p className="mt-2 text-2xl font-display uppercase tracking-tight text-gray-900">{shared.plan.chartTitle}</p>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
              {formatChartType(shared.plan.chartType)}
            </span>
          </div>

          <SharedChart plan={shared.plan} />

          <div className="mt-4 text-right text-[10px] font-medium text-gray-400">
            <span className="font-black uppercase tracking-[0.14em] text-gray-500">Made in AiBS</span>
            <span className="ml-2">@aicolby</span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Request</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">{shared.payload?.query ?? "Custom AiBS chart request"}</p>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Axes</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">X-Axis</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{shared.plan.xAxis}</p>
              </div>
              <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Y-Axis</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{shared.plan.yAxis}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data Sources</p>
            <ul className="mt-4 space-y-2 text-xs font-semibold text-gray-700">
              {(shared.payload?.citations ?? []).map((citation) => (
                <li key={citation} className="rounded-full border border-gray-100 bg-gray-50 px-3 py-2">
                  {citation}
                </li>
              ))}
            </ul>
            {coerceInternalRouteScope(shared.artifact.routeScope) ? (
              <p className="mt-4 text-[11px] text-gray-500">Shared from {shared.artifact.routeScope}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
