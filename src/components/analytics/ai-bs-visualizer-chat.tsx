"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Copy, FileText, Loader2, MessageCircle, Send } from "lucide-react";
import { toBlob } from "html-to-image";

import { AIFeedback } from "@/components/ai-feedback";
import { BaseballSpinner } from "@/components/baseball-spinner";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import { ensureCsrfToken } from "@/lib/client/csrf";
import type { AIChatResponse, AIVisualizerPlan } from "@/lib/types";

const FAN_STARTER_PROMPTS = [
  "Show challenge swings by inning.",
  "Compare overturn rate by count state.",
  "Map offense vs defense challenge results.",
  "Show where the biggest reviews show up late.",
];

const ORG_STARTER_PROMPTS = [
  "Show challenge value by inning.",
  "Compare expected vs realized value by count state.",
  "Map offensive vs defensive challenge results.",
  "Show late-and-close review pressure.",
];

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

type NumericDisplayKind = "number" | "percent";

type PreviewPoint = {
  x: string;
  y: number;
  series: string | null;
};

function niceCeil(value: number) {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function niceFloor(value: number) {
  if (value >= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(value)));
  const normalized = Math.abs(value) / magnitude;
  if (normalized <= 1) return -magnitude;
  if (normalized <= 2) return -2 * magnitude;
  if (normalized <= 5) return -5 * magnitude;
  return -10 * magnitude;
}

function inferDisplayKind(plan: AIVisualizerPlan, values: number[]): NumericDisplayKind {
  const axis = `${plan.yAxis} ${plan.highlight}`.toLowerCase();
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0);
  if (axis.includes("%") || axis.includes("percent") || axis.includes("percentage")) return "percent";
  if ((axis.includes("rate") || axis.includes("share")) && maxAbs <= 1.01) return "percent";
  return "number";
}

function normalizeForDisplay(value: number, kind: NumericDisplayKind, domainMax: number) {
  if (kind === "percent" && domainMax <= 1.01) return value * 100;
  return value;
}

function getNumericScale(values: number[], kind: NumericDisplayKind) {
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const rawMin = minValue < 0 ? niceFloor(minValue) : 0;
  const rawMax = maxValue > 0 ? niceCeil(maxValue) : 0;
  const min = rawMin === rawMax ? rawMin : rawMin;
  const max = rawMin === rawMax ? rawMax + 1 : rawMax;
  const step = (max - min) / 4;
  const ticks = Array.from({ length: 5 }, (_, index) => min + step * index);
  return {
    min,
    max,
    ticks,
    kind,
  };
}

function formatTick(value: number, kind: NumericDisplayKind, domainMax: number) {
  const displayValue = normalizeForDisplay(value, kind, domainMax);
  if (kind === "percent") {
    if (Math.abs(displayValue) >= 10) return `${displayValue.toFixed(0)}%`;
    if (Math.abs(displayValue) >= 1) return `${displayValue.toFixed(1).replace(/\.0$/, "")}%`;
    return `${displayValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  }
  if (Math.abs(displayValue) >= 100) return String(Math.round(displayValue));
  if (Math.abs(displayValue) >= 10) return displayValue.toFixed(0);
  if (Math.abs(displayValue) >= 1) return displayValue.toFixed(1).replace(/\.0$/, "");
  return displayValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function slugifyChartTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "aibs-chart";
}

export function getBarPreviewLayout(plan: AIVisualizerPlan) {
  const points: PreviewPoint[] = plan.dataPoints
    .filter((point) => typeof point.y === "number")
    .map((point) => ({ x: String(point.x), y: Number(point.y), series: point.series ?? null }));
  const scale = getNumericScale(points.map((point) => point.y), inferDisplayKind(plan, points.map((point) => point.y)));
  const range = Math.max(scale.max - scale.min, 1);
  const zeroPosition = ((0 - scale.min) / range) * 100;
  const categories = Array.from(new Set(points.map((point) => point.x)));
  const seriesNames = Array.from(new Set(points.map((point) => point.series).filter(Boolean))) as string[];
  const resolvedSeries: Array<string | null> = seriesNames.length ? seriesNames : [null];
  const categoryWidthPercent = categories.length > 0 ? 100 / categories.length : 100;
  const groupWidthPercent = categoryWidthPercent * 0.74;
  const seriesWidthPercent = groupWidthPercent / Math.max(resolvedSeries.length, 1);

  return {
    points,
    scale,
    zeroPosition,
    categories,
    seriesNames,
    bars: points.map((point) => ({
      ...point,
      heightPercent: (Math.abs(point.y) / range) * 100,
      bottomPercent: point.y >= 0 ? zeroPosition : null,
      topPercent: point.y < 0 ? 100 - zeroPosition : null,
      xPercent:
        categories.indexOf(point.x) * categoryWidthPercent +
        (categoryWidthPercent - groupWidthPercent) / 2 +
        resolvedSeries.indexOf(point.series) * seriesWidthPercent,
      widthPercent: seriesWidthPercent * 0.78,
    })),
  };
}

function PreviewShell({
  children,
  xAxis,
  yAxis,
}: {
  children: ReactNode;
  xAxis: string;
  yAxis: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-[var(--surface-infield)] p-5">
      <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
        {children}
      </div>
      <div className="mt-3 flex items-end justify-between gap-4 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
        <div className="min-w-0">
          <p>X-Axis</p>
          <p className="mt-1 text-sm font-semibold normal-case tracking-normal text-gray-900">{xAxis}</p>
        </div>
        <div className="min-w-0 text-right">
          <p>Y-Axis</p>
          <p className="mt-1 text-sm font-semibold normal-case tracking-normal text-gray-900">{yAxis}</p>
        </div>
      </div>
    </div>
  );
}

function BrandStamp() {
  return (
    <div className="mt-3 text-right text-[10px] font-medium text-gray-400">
      <span className="font-black uppercase tracking-[0.14em] text-gray-500">Made in AiBS</span>
      <span className="ml-2">@aicolby</span>
    </div>
  );
}

const SERIES_COLORS = ["#2563eb", "#ef4444", "#10b981", "#8b5cf6"];

function getSeriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function BarPreview({ plan }: { plan: AIVisualizerPlan }) {
  const { scale, bars, seriesNames, categories } = getBarPreviewLayout(plan);
  const width = 520;
  const height = 240;
  const left = 44;
  const bottom = 30;
  const innerW = width - left - 12;
  const innerH = height - bottom - 12;
  const range = Math.max(scale.max - scale.min, 1);
  const zeroY = 12 + innerH - ((0 - scale.min) / range) * innerH;

  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      {seriesNames.length ? (
        <div className="mb-3 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
          {seriesNames.map((series, index) => (
            <div key={series} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSeriesColor(index) }} />
              <span>{series}</span>
            </div>
          ))}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        {scale.ticks.map((tick) => {
          const y = 12 + innerH - ((tick - scale.min) / range) * innerH;
          return (
            <g key={tick}>
              <line x1={left} x2={width - 12} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[11px] font-semibold">
                {formatTick(tick, scale.kind, scale.max)}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={left} y1={12} y2={height - bottom} stroke="#d1d5db" />
        <line x1={left} x2={width - 12} y1={height - bottom} y2={height - bottom} stroke="#d1d5db" />
        {scale.min < 0 && scale.max > 0 ? (
          <line x1={left} x2={width - 12} y1={zeroY} y2={zeroY} stroke="#9ca3af" />
        ) : null}
        {bars.map((point, index) => {
          const x = left + (point.xPercent / 100) * innerW;
          const barWidth = Math.max((point.widthPercent / 100) * innerW, 8);
          const targetY = 12 + innerH - ((point.y - scale.min) / range) * innerH;
          const barHeight = point.y === 0 ? 0 : Math.max(Math.abs(zeroY - targetY), 3);
          const y = point.y >= 0 ? zeroY - barHeight : zeroY;
          const seriesIndex = point.series ? seriesNames.indexOf(point.series) : 0;
          const fill = getSeriesColor(seriesIndex >= 0 ? seriesIndex : index);
          return (
            <g key={`${point.x}-${point.series ?? "base"}-${index}`}>
              {barHeight > 0 ? (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={10}
                    ry={10}
                    fill={fill}
                    fillOpacity={0.82}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={point.y >= 0 ? y - 8 : y + barHeight + 14}
                    textAnchor="middle"
                    className="fill-gray-500 text-[11px] font-bold"
                  >
                    {formatTick(point.y, scale.kind, scale.max)}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
        {categories.map((label, index) => {
          const centerX = left + ((index + 0.5) / Math.max(categories.length, 1)) * innerW;
          return (
            <text key={label} x={centerX} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[11px] font-semibold">
              {label}
            </text>
          );
        })}
      </svg>
      <BrandStamp />
    </PreviewShell>
  );
}

function LinePreview({ plan }: { plan: AIVisualizerPlan }) {
  const points = plan.dataPoints
    .filter((point) => typeof point.y === "number")
    .map((point) => ({ x: String(point.x), y: Number(point.y) }));
  const scale = getNumericScale(points.map((point) => point.y), inferDisplayKind(plan, points.map((point) => point.y)));
  const width = 520;
  const height = 240;
  const left = 36;
  const bottom = 28;
  const innerW = width - left - 12;
  const innerH = height - bottom - 12;
  const path = points
    .map((point, index) => {
      const x = left + (index / Math.max(points.length - 1, 1)) * innerW;
      const y = 12 + innerH - ((point.y - scale.min) / Math.max(scale.max - scale.min, 1)) * innerH;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        {scale.ticks.map((tick) => {
          const y = 12 + innerH - ((tick - scale.min) / Math.max(scale.max - scale.min, 1)) * innerH;
          return (
            <g key={tick}>
              <line x1={left} x2={width - 12} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[11px] font-semibold">
                {formatTick(tick, scale.kind, scale.max)}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={left} y1={12} y2={height - bottom} stroke="#d1d5db" />
        <line x1={left} x2={width - 12} y1={height - bottom} y2={height - bottom} stroke="#d1d5db" />
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = left + (index / Math.max(points.length - 1, 1)) * innerW;
          const y = 12 + innerH - ((point.y - scale.min) / Math.max(scale.max - scale.min, 1)) * innerH;
          return (
            <g key={point.x}>
              <circle cx={x} cy={y} r="6" fill="#fff" stroke="#2563eb" strokeWidth="3" />
              <text x={x} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[11px] font-semibold">
                {point.x}
              </text>
            </g>
          );
        })}
      </svg>
      <BrandStamp />
    </PreviewShell>
  );
}

function ScatterPreview({ plan }: { plan: AIVisualizerPlan }) {
  const points = plan.dataPoints
    .filter((point) => typeof point.x === "number" && typeof point.y === "number")
    .map((point) => ({ x: Number(point.x), y: Number(point.y), label: point.label ?? null }));
  const xScale = getNumericScale(points.map((point) => point.x), "number");
  const yScale = getNumericScale(points.map((point) => point.y), inferDisplayKind(plan, points.map((point) => point.y)));
  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      <svg viewBox="0 0 520 240" className="h-64 w-full">
        {yScale.ticks.map((tick) => {
          const y = 12 + 200 - ((tick - yScale.min) / Math.max(yScale.max - yScale.min, 1)) * 200;
          return <line key={`y-${tick}`} x1={44} x2={500} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />;
        })}
        {xScale.ticks.map((tick) => {
          const x = 44 + ((tick - xScale.min) / Math.max(xScale.max - xScale.min, 1)) * 456;
          return <line key={`x-${tick}`} x1={x} x2={x} y1={12} y2={212} stroke="#f3f4f6" />;
        })}
        <line x1={44} x2={44} y1={12} y2={212} stroke="#d1d5db" />
        <line x1={44} x2={500} y1={212} y2={212} stroke="#d1d5db" />
        {points.map((point, index) => {
          const x = 44 + ((point.x - xScale.min) / Math.max(xScale.max - xScale.min, 1)) * 456;
          const y = 12 + 200 - ((point.y - yScale.min) / Math.max(yScale.max - yScale.min, 1)) * 200;
          return (
            <g key={`${point.x}-${point.y}-${index}`}>
              <circle cx={x} cy={y} r="8" fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth="3" />
              {point.label ? (
                <text x={x + 10} y={y - 10} className="fill-gray-500 text-[10px] font-semibold">
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {yScale.ticks.map((tick) => {
          const y = 12 + 200 - ((tick - yScale.min) / Math.max(yScale.max - yScale.min, 1)) * 200;
          return (
            <text key={`yl-${tick}`} x={34} y={y + 4} textAnchor="end" className="fill-gray-400 text-[11px] font-semibold">
              {formatTick(tick, yScale.kind, yScale.max)}
            </text>
          );
        })}
        {xScale.ticks.map((tick) => {
          const x = 44 + ((tick - xScale.min) / Math.max(xScale.max - xScale.min, 1)) * 456;
          return (
            <text key={`xl-${tick}`} x={x} y={232} textAnchor="middle" className="fill-gray-400 text-[11px] font-semibold">
              {formatTick(tick, xScale.kind, xScale.max)}
            </text>
          );
        })}
      </svg>
      <BrandStamp />
    </PreviewShell>
  );
}

function HeatmapPreview({ plan }: { plan: AIVisualizerPlan }) {
  const xValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.x))));
  const yValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.y))));
  const maxValue = Math.max(...plan.dataPoints.map((point) => Number(point.value ?? 0)), 1);
  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      <div className="grid grid-cols-[96px_1fr] gap-4">
        <div className="grid gap-3 pt-10 text-right text-[11px] font-semibold text-gray-500">
          {yValues.map((value) => (
            <div key={value} className="flex h-14 items-center justify-end">{value}</div>
          ))}
        </div>
        <div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${xValues.length}, minmax(0, 1fr))` }}>
            {xValues.map((value) => (
              <div key={value} className="text-center text-[11px] font-semibold text-gray-500">{value}</div>
            ))}
            {yValues.flatMap((yValue) =>
              xValues.map((xValue) => {
                const point = plan.dataPoints.find((entry) => String(entry.x) === xValue && String(entry.y) === yValue);
                const value = Number(point?.value ?? 0);
                const alpha = 0.14 + (value / maxValue) * 0.72;
                return (
                  <div
                    key={`${xValue}-${yValue}`}
                    className="flex h-14 items-center justify-center rounded-2xl border border-white/50 text-sm font-black text-gray-900"
                    style={{ backgroundColor: `rgba(37,99,235,${alpha})` }}
                  >
                    {formatTick(value, inferDisplayKind(plan, [value]), maxValue)}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
      <BrandStamp />
    </PreviewShell>
  );
}

function TimelinePreview({ plan }: { plan: AIVisualizerPlan }) {
  const points = plan.dataPoints
    .filter((point) => typeof point.y === "number")
    .map((point) => ({ x: String(point.x), y: Number(point.y) }));
  const scale = getNumericScale(points.map((point) => point.y), inferDisplayKind(plan, points.map((point) => point.y)));
  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      <div className="relative h-56 px-8">
        <div className="absolute left-8 right-8 top-28 h-1 rounded-full bg-gray-200" />
        {points.map((point, index) => (
          <div
            key={point.x}
            className="absolute top-24 -translate-x-1/2"
            style={{ left: `calc(2rem + ${(index / Math.max(points.length - 1, 1)) * (100 - 4)}%)` }}
          >
            <div className="mb-3 text-center text-xs font-bold text-gray-500">{formatTick(point.y, scale.kind, scale.max)}</div>
            <div className="h-8 w-8 rounded-full border-4 border-white bg-blue-500 shadow" />
            <div className="mt-3 whitespace-nowrap text-[11px] font-semibold text-gray-500">{point.x}</div>
          </div>
        ))}
      </div>
      <BrandStamp />
    </PreviewShell>
  );
}

function TablePreview({ plan }: { plan: AIVisualizerPlan }) {
  return (
    <PreviewShell xAxis={plan.xAxis} yAxis={plan.yAxis}>
      <table className="w-full border-separate border-spacing-y-2 text-left">
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
            <th className="px-3">X</th>
            <th className="px-3">Y</th>
            <th className="px-3">Series</th>
          </tr>
        </thead>
        <tbody>
          {plan.dataPoints.map((point, index) => (
            <tr key={`${point.x}-${point.y}-${index}`} className="rounded-2xl border border-gray-100 bg-white">
              <td className="rounded-l-2xl border-y border-l border-gray-100 px-3 py-3 text-sm font-semibold text-gray-900">{point.x}</td>
              <td className="border-y border-gray-100 px-3 py-3 text-sm font-semibold text-gray-900">{point.y}</td>
              <td className="rounded-r-2xl border-y border-r border-gray-100 px-3 py-3 text-sm text-gray-600">{point.series ?? point.label ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <BrandStamp />
    </PreviewShell>
  );
}

function VisualizerPreview({
  plan,
  captureRef,
}: {
  plan: AIVisualizerPlan;
  captureRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={captureRef} className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Preview</p>
          <p className="mt-2 text-2xl font-display uppercase tracking-tight text-gray-900">{plan.chartTitle}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
          {formatChartType(plan.chartType)}
        </span>
      </div>

      {plan.chartType === "bar_chart" ? <BarPreview plan={plan} /> : null}
      {plan.chartType === "line_chart" ? <LinePreview plan={plan} /> : null}
      {plan.chartType === "scatter_plot" ? <ScatterPreview plan={plan} /> : null}
      {plan.chartType === "heatmap" ? <HeatmapPreview plan={plan} /> : null}
      {plan.chartType === "timeline" ? <TimelinePreview plan={plan} /> : null}
      {plan.chartType === "table" ? <TablePreview plan={plan} /> : null}
    </div>
  );
}
export function AIBSVisualizerChat({
  context,
  teamColor = "#007aff",
  audience = "fan",
  aiContext,
}: {
  context: string;
  teamColor?: string;
  audience?: "fan" | "org";
  aiContext?: {
    scope: "global" | "game" | "team" | "umpire";
    entityId?: string;
    range?: "24h" | "7d" | "30d" | "season";
    gameStatus?: string;
  };
}) {
  const starterPrompts = audience === "org" ? ORG_STARTER_PROMPTS : FAN_STARTER_PROMPTS;
  const heading =
    audience === "org" ? "Build an org-style chart from AiBS data" : "Build a custom chart from AiBS data";
  const subtitle =
    audience === "org"
      ? "Ask for the exact workflow view you need, or describe the baseball question and AiBS will choose the strongest chart form."
      : "Ask for the exact chart you want, or describe the baseball question and AiBS will choose the best chart form.";
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    query: string;
    answer: string;
    structuredPlan: AIVisualizerPlan | null;
    citations: string[];
    toolResults: Array<{ toolName: string; payload: unknown }>;
    conversationId: string;
    assistantMessageId: string | null;
    generationId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [sharedArtifact, setSharedArtifact] = useState<{ artifactId: string; url: string } | null>(null);
  const chartCaptureRef = useRef<HTMLDivElement | null>(null);

  function setTransientNotice(message: string) {
    setShareNotice(message);
    window.setTimeout(() => setShareNotice(null), 2600);
  }

  function buildShareText(plan: AIVisualizerPlan, prompt: string) {
    return [plan.chartTitle, prompt, "Built in AiBS via @aicolby", sharedArtifact?.url].filter(Boolean).join("\n");
  }

  async function renderChartBlob() {
    if (!chartCaptureRef.current) return null;
    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        await document.fonts.ready;
      } catch {
        // noop
      }
    }
    return toBlob(chartCaptureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  }

  async function copyChart(plan: AIVisualizerPlan, prompt: string) {
    try {
      await ensureShareArtifact(plan, prompt);
      const blob = await renderChartBlob();
      if (
        blob &&
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        navigator.clipboard &&
        typeof navigator.clipboard.write === "function"
      ) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        setTransientNotice("Chart image copied.");
        return;
      }

      await navigator.clipboard.writeText(buildShareText(plan, prompt));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      setTransientNotice("Chart text copied.");
    } catch {
      setTransientNotice("Unable to prepare share right now.");
    }
  }

  function downloadBlob(blob: Blob, title: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyChartTitle(title)}.png`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function ensureShareArtifact(plan: AIVisualizerPlan, prompt: string) {
    if (sharedArtifact) return sharedArtifact;

    const csrfToken = await ensureCsrfToken();
    if (!csrfToken || !result?.generationId) return null;

    const response = await fetch("/api/ai/artifacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        surfaceKey: "visualizer",
        surfaceDetail: "team_chart_builder",
        targetType: "visualizer_chart",
        targetId: result.generationId,
        routeScope: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : null,
        routeEntityId: aiContext?.entityId ?? null,
        title: plan.chartTitle,
        summary: plan.highlight,
        artifactPayload: {
          structuredPlan: plan,
          citations: result.citations,
          query: prompt,
          contextLabel: context,
        },
        metadata: {
          publicShare: true,
          chartType: plan.chartType,
          sourceRoute: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : null,
        },
      }),
    });
    const body = (await response.json()) as { artifactId?: string | null; error?: string };
    if (!response.ok || !body.artifactId) {
      throw new Error(body.error || "Unable to publish chart share");
    }

    const url = `${window.location.origin}/v/${body.artifactId}`;
    const artifact = { artifactId: body.artifactId, url };
    setSharedArtifact(artifact);
    return artifact;
  }

  async function openTweet(plan: AIVisualizerPlan) {
    try {
      const artifact = await ensureShareArtifact(plan, result?.query ?? "");
      const blob = await renderChartBlob();
      let preparedImage = false;
      if (
        blob &&
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        navigator.clipboard &&
        typeof navigator.clipboard.write === "function"
      ) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        preparedImage = true;
      } else if (blob) {
        downloadBlob(blob, plan.chartTitle);
      }

      const text = `${plan.chartTitle} — Built in AiBS via @aicolby`;
      const url = artifact?.url
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(artifact.url)}`
        : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setTransientNotice(preparedImage ? "Chart image copied. Paste it into X." : "Chart PNG downloaded. Attach it in X.");
    } catch {
      setTransientNotice("Unable to prepare share right now.");
    }
  }

  async function openMessage(plan: AIVisualizerPlan, prompt: string) {
    try {
      await ensureShareArtifact(plan, prompt);
      const blob = await renderChartBlob();
      const shareText = buildShareText(plan, prompt);
      if (blob && navigator.share && typeof File !== "undefined") {
        const file = new File([blob], `${slugifyChartTitle(plan.chartTitle)}.png`, { type: "image/png" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: plan.chartTitle,
            text: shareText,
            files: [file],
          });
          return;
        }
      }

      const text = shareText;
      window.location.href = `sms:&body=${encodeURIComponent(text)}`;
    } catch {
      setTransientNotice("Unable to prepare share right now.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setIsGenerating(true);
    setResult(null);
    setError(null);
    setSharedArtifact(null);

    try {
      const csrfToken = await ensureCsrfToken();
      if (!csrfToken) {
        setError("Sign in and verify your email to use AiBS AI.");
        return;
      }
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ message: query.trim(), delivery: "sync", surface: "visualizer", context: aiContext }),
      });
      const payload = (await response.json()) as AIChatResponse;

      if (!response.ok || payload.safetyDisposition === "blocked") {
        setError(payload.error || payload.answer || "Unable to generate a chart right now.");
        return;
      }

      setResult({
        query,
        answer: payload.answer,
        structuredPlan: payload.structuredPlan ?? null,
        citations: payload.citations,
        toolResults: payload.toolResults,
        conversationId: payload.conversationId,
        assistantMessageId: payload.assistantMessageId ?? null,
        generationId: payload.generationId ?? null,
      });
      setQuery("");
    } catch {
      setError("Unable to generate a chart right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-16 mx-auto w-full max-w-6xl px-4 pb-10">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-100" />
          <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
            Visualize your own ideas
          </p>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
            {heading}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {subtitle}
          </p>
        </div>

        <div className="relative group">
          <div className="panel flex items-center gap-4 rounded-full border border-gray-100 bg-white p-2 pl-6 shadow-xl shadow-black/[0.02] transition-all focus-within:border-gray-200 focus-within:shadow-lg focus-within:shadow-black/[0.04]">
            <div className="shrink-0 -ml-2 text-blue-500">
              <AiBSIcon size={20} showTextOnHover />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-1 items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Ask AiBS to build a chart for ${context}...`}
                className="w-full bg-transparent border-0 !outline-none text-sm font-medium text-gray-900 placeholder:text-gray-600 focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent]"
              />
              <motion.button
                type="submit"
                disabled={isGenerating || !query.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-black disabled:pointer-events-none disabled:opacity-30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Building Chart</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Build Chart</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {!result && !isGenerating ? (
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuery(prompt)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="panel flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12"
            >
              <BaseballSpinner />
            </motion.div>
          ) : null}

          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              {(() => {
                const hasMetaRail = result.toolResults.length > 0 || result.citations.length > 0;
                return (
              <div className="panel overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-0 shadow-2xl shadow-black/[0.05]">
                <div className="flex items-center justify-between gap-6 border-b border-gray-50 px-10 py-8">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                      Chart Output
                    </p>
                    <h4 className="text-xl font-display uppercase tracking-tight text-gray-900">
                      &ldquo;{result.query}&rdquo;
                    </h4>
                  </div>
                  <div className="max-w-xs rounded-2xl bg-gray-50 px-4 py-3 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Context</p>
                    <p className="text-xs font-bold text-gray-700">{context}</p>
                  </div>
                </div>

                <div className={`grid gap-8 bg-gray-50 px-10 py-10 ${hasMetaRail ? "lg:grid-cols-[1.2fr_0.8fr]" : ""}`}>
                  <div>
                    {result.structuredPlan ? (
                      <VisualizerPreview plan={result.structuredPlan} captureRef={chartCaptureRef} />
                    ) : null}
                    {!result.structuredPlan ? (
                      <p className="text-sm leading-relaxed text-gray-700">{result.answer}</p>
                    ) : null}
                    {result.structuredPlan ? (
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openTweet(result.structuredPlan!)}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          Tweet Chart
                        </button>
                        <button
                          type="button"
                          onClick={() => openMessage(result.structuredPlan!, result.query)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <MessageCircle size={12} />
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() => copyChart(result.structuredPlan!, result.query)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <Copy size={12} />
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ) : null}
                    {shareNotice ? <p className="mt-3 text-xs font-semibold text-gray-500">{shareNotice}</p> : null}
                  </div>

                  {hasMetaRail ? <div className="space-y-4">
                    {result.toolResults.length ? (
                      <div className="rounded-3xl border border-gray-200 bg-white p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText size={14} className="text-gray-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Data Sources
                          </p>
                        </div>
                        <ul className="space-y-2 text-xs font-semibold text-gray-700">
                          {result.toolResults.map((tool) => (
                            <li
                              key={tool.toolName}
                              className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                            >
                              <span>{tool.toolName}</span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white"
                                style={{ backgroundColor: teamColor }}
                              >
                                Live
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {result.citations.length ? (
                      <div className="rounded-3xl border border-gray-200 bg-white p-5">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Citations
                        </p>
                        <ul className="space-y-2 text-xs text-gray-600">
                          {result.citations.map((citation) => (
                            <li key={citation}>{citation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div> : null}
                </div>

                {result.assistantMessageId ? (
                  <div className="border-t border-gray-100 bg-white px-10 py-6">
                    <AIFeedback
                      surface="visualizer"
                      targetType="ai_message"
                      targetId={result.assistantMessageId}
                      generationId={result.generationId}
                      conversationId={result.conversationId}
                      messageId={result.assistantMessageId}
                      prompt="Visualizer brief quality"
                    />
                  </div>
                ) : null}
              </div>
                );
              })()}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
