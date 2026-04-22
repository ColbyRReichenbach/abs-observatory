import { ImageResponse } from "next/og";

import type { AIVisualizerPlan } from "@/lib/types";
import { getPublicAiArtifactById } from "@/lib/server/ai-generations";

export const runtime = "nodejs";

type SharedVisualizerPayload = {
  structuredPlan?: AIVisualizerPlan | null;
};

function isVisualizerPayload(value: unknown): value is SharedVisualizerPayload {
  return typeof value === "object" && value !== null;
}

function formatPointValue(value: number) {
  if (Math.abs(value) >= 10) return value.toFixed(0);
  if (Math.abs(value) >= 1) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function BarChart({ plan }: { plan: AIVisualizerPlan }) {
  const points = plan.dataPoints
    .filter((point) => typeof point.y === "number")
    .map((point) => ({ x: String(point.x), y: Number(point.y) }));
  const maxValue = Math.max(...points.map((point) => point.y), 1);

  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "flex-end",
        width: "100%",
        height: 270,
        padding: "24px 28px 18px",
        borderRadius: 28,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      {points.map((point) => (
        <div key={point.x} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#6b7280" }}>{formatPointValue(point.y)}</div>
          <div
            style={{
              width: "100%",
              height: `${(point.y / maxValue) * 170}px`,
              minHeight: 18,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              background: "#2563eb",
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", textAlign: "center" }}>{point.x}</div>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ plan }: { plan: AIVisualizerPlan }) {
  const xValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.x))));
  const yValues = Array.from(new Set(plan.dataPoints.map((point) => String(point.y))));
  const maxValue = Math.max(...plan.dataPoints.map((point) => Number(point.value ?? 0)), 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        padding: 22,
        borderRadius: 28,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", marginLeft: 100, gap: 10 }}>
        {xValues.map((value) => (
          <div key={value} style={{ width: 120, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#6b7280" }}>
            {value}
          </div>
        ))}
      </div>
      {yValues.map((yValue) => (
        <div key={yValue} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 90, fontSize: 13, fontWeight: 700, color: "#6b7280" }}>{yValue}</div>
          {xValues.map((xValue) => {
            const point = plan.dataPoints.find((entry) => String(entry.x) === xValue && String(entry.y) === yValue);
            const value = Number(point?.value ?? 0);
            const alpha = 0.14 + (value / maxValue) * 0.72;
            return (
              <div
                key={`${xValue}-${yValue}`}
                style={{
                  width: 120,
                  height: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  background: `rgba(37,99,235,${alpha})`,
                  color: "#111827",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {formatPointValue(value)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TableChart({ plan }: { plan: AIVisualizerPlan }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
        padding: 22,
        borderRadius: 28,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      {plan.dataPoints.slice(0, 6).map((point, index) => (
        <div
          key={`${point.x}-${point.y}-${index}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr 0.9fr",
            gap: 12,
            alignItems: "center",
            padding: "14px 16px",
            borderRadius: 18,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{String(point.x)}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{String(point.y)}</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{point.series ?? point.label ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

function SharedOgChart({ plan }: { plan: AIVisualizerPlan }) {
  if (plan.chartType === "heatmap") return <Heatmap plan={plan} />;
  if (plan.chartType === "table") return <TableChart plan={plan} />;
  return <BarChart plan={plan} />;
}

export async function GET(_req: Request, { params }: { params: Promise<{ vizId: string }> }) {
  const { vizId } = await params;
  const artifact = await getPublicAiArtifactById(vizId);
  const payload = artifact && isVisualizerPayload(artifact.artifactPayload) ? artifact.artifactPayload : null;
  const plan = payload?.structuredPlan ?? null;

  const title = plan?.chartTitle ?? "AiBS Shared Chart";
  const summary = artifact?.summary ?? plan?.highlight ?? "Custom ABS challenge data analysis.";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#f8fafc",
          color: "#111827",
          fontFamily: "system-ui, sans-serif",
          padding: 48,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#2563eb", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Shared Chart
            </div>
            <div style={{ marginTop: 14, fontSize: 42, fontWeight: 900, lineHeight: 1.05, maxWidth: 820, textTransform: "uppercase" }}>
              {title}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#6b7280", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            AiBS
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#6b7280", marginBottom: 28, maxWidth: 920 }}>{summary}</div>

        {plan ? <SharedOgChart plan={plan} /> : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid #e5e7eb",
            fontSize: 14,
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          <div>Made in AiBS</div>
          <div>@aicolby</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
