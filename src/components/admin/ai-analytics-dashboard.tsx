"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

type DashboardProps = {
  overview: {
    totalGenerations: number;
    uniqueUsers: number;
    totalTokens: number;
    totalEstimatedCostUsd: number;
    avgLatencyMs: number;
    fallbackRate: number;
    feedbackRate: number;
    positiveFeedbackRate: number;
  };
  dailySeries: Array<{
    day: string;
    generations: number;
    totalTokens: number;
    totalEstimatedCostUsd: number;
    fallbackRate: number;
  }>;
  surfaceBreakdown: Array<{
    surfaceKey: string;
    generations: number;
    totalEstimatedCostUsd: number;
    avgLatencyMs: number;
    fallbackRate: number;
    upCount: number;
    downCount: number;
  }>;
  modelBreakdown: Array<{
    provider: string;
    modelName: string;
    generations: number;
    totalEstimatedCostUsd: number;
    avgLatencyMs: number;
    upCount: number;
    downCount: number;
  }>;
  feedbackBreakdown: Array<{
    surfaceKey: string;
    bucket: string;
    count: number;
  }>;
  failureBreakdown: Array<{
    surfaceKey: string;
    status: string;
    count: number;
  }>;
  recentNegativeFeedback: Array<{
    feedbackId: string;
    createdAt: string;
    surface: string;
    targetType: string;
    targetId: string;
    comment: string | null;
    classificationBucket: string | null;
    modelName: string | null;
    provider: string | null;
    generationId: string | null;
  }>;
};

export function AiAnalyticsDashboard({
  overview,
  dailySeries,
  surfaceBreakdown,
  modelBreakdown,
  feedbackBreakdown,
  failureBreakdown,
  recentNegativeFeedback,
}: DashboardProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Generations" value={overview.totalGenerations.toLocaleString()} />
        <MetricCard label="Unique Users" value={overview.uniqueUsers.toLocaleString()} />
        <MetricCard label="Total Tokens" value={overview.totalTokens.toLocaleString()} />
        <MetricCard label="Estimated Cost" value={money(overview.totalEstimatedCostUsd)} />
        <MetricCard label="Avg Latency" value={`${Math.round(overview.avgLatencyMs)} ms`} />
        <MetricCard label="Fallback Rate" value={percent(overview.fallbackRate)} />
        <MetricCard label="Feedback Rate" value={percent(overview.feedbackRate)} />
        <MetricCard label="Positive Feedback" value={percent(overview.positiveFeedbackRate)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Usage Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailySeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="generations" stroke="#111827" strokeWidth={2.5} dot={false} name="Generations" />
              <Line type="monotone" dataKey="totalTokens" stroke="#2563eb" strokeWidth={2} dot={false} name="Tokens" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Cost and Fallback Rate">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailySeries} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="cost" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="fallback"
                orientation="right"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="cost" dataKey="totalEstimatedCostUsd" fill="#0f766e" radius={[6, 6, 0, 0]} name="Cost (USD)" />
              <Line yAxisId="fallback" type="monotone" dataKey="fallbackRate" stroke="#dc2626" strokeWidth={2} dot={false} name="Fallback Rate" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Surface Breakdown">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={surfaceBreakdown} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="surfaceKey" tick={{ fontSize: 10, fill: "#374151" }} tickLine={false} axisLine={false} width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="generations" fill="#111827" radius={[0, 6, 6, 0]} name="Generations" />
              <Bar dataKey="downCount" fill="#dc2626" radius={[0, 6, 6, 0]} name="Downvotes" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Model Breakdown">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={modelBreakdown.map((row) => ({ ...row, label: `${row.provider}:${row.modelName}` }))} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#374151" }} tickLine={false} axisLine={false} width={140} />
              <Tooltip />
              <Legend />
              <Bar dataKey="generations" fill="#2563eb" radius={[0, 6, 6, 0]} name="Generations" />
              <Bar dataKey="downCount" fill="#dc2626" radius={[0, 6, 6, 0]} name="Downvotes" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataPanel title="Feedback Buckets">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
              <tr>
                <th className="pb-3">Surface</th>
                <th className="pb-3">Bucket</th>
                <th className="pb-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[var(--ink-1)]">
              {feedbackBreakdown.slice(0, 12).map((row) => (
                <tr key={`${row.surfaceKey}-${row.bucket}`}>
                  <td className="py-3 font-semibold">{row.surfaceKey}</td>
                  <td className="py-3">{row.bucket}</td>
                  <td className="py-3 text-right font-mono">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="Fallback and Failure Events">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
              <tr>
                <th className="pb-3">Surface</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-[var(--ink-1)]">
              {failureBreakdown.map((row) => (
                <tr key={`${row.surfaceKey}-${row.status}`}>
                  <td className="py-3 font-semibold">{row.surfaceKey}</td>
                  <td className="py-3 uppercase">{row.status}</td>
                  <td className="py-3 text-right font-mono">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>
      </div>

      <DataPanel title="Recent Negative Feedback">
        <div className="space-y-4">
          {recentNegativeFeedback.length === 0 ? (
            <p className="text-sm text-[var(--ink-3)]">No negative feedback in the selected window.</p>
          ) : (
            recentNegativeFeedback.map((row) => (
              <div key={row.feedbackId} className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">
                  <span>{row.surface}</span>
                  <span>•</span>
                  <span>{row.provider ?? "unknown provider"}</span>
                  <span>•</span>
                  <span>{row.modelName ?? "unknown model"}</span>
                  {row.classificationBucket ? (
                    <>
                      <span>•</span>
                      <span>{row.classificationBucket}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-[var(--ink-1)]">{row.comment ?? "Thumbs down without a written note."}</p>
                <p className="mt-2 text-[10px] font-mono text-[var(--ink-3)]">
                  {new Date(row.createdAt).toLocaleString()} • {row.targetType}:{row.targetId}
                </p>
              </div>
            ))
          )}
        </div>
      </DataPanel>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-3 text-3xl font-display uppercase tracking-[-0.03em] text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
