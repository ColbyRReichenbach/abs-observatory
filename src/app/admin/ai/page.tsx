import { subDays, format } from "date-fns";
import Link from "next/link";

import { AiAnalyticsDashboard } from "@/components/admin/ai-analytics-dashboard";
import {
  getAiDailySeries,
  getAiFailureBreakdown,
  getAiFeedbackBreakdown,
  getAiFilterOptions,
  getAiModelBreakdown,
  getAiOverview,
  getAiSurfaceBreakdown,
  getRecentNegativeFeedback,
  type AdminAiAnalyticsFilters,
} from "@/lib/server/admin-ai-analytics";

function getFilterValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>): AdminAiAnalyticsFilters {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 29), "yyyy-MM-dd");

  return {
    from: getFilterValue(searchParams.from) ?? defaultFrom,
    to: getFilterValue(searchParams.to) ?? today,
    surfaceKey: getFilterValue(searchParams.surfaceKey) ?? "all",
    surfaceDetail: getFilterValue(searchParams.surfaceDetail) ?? "all",
    provider: getFilterValue(searchParams.provider) ?? "all",
    model: getFilterValue(searchParams.model) ?? "all",
    status: getFilterValue(searchParams.status) ?? "all",
    sentiment: ((getFilterValue(searchParams.sentiment) ?? "all") === "all"
      ? null
      : getFilterValue(searchParams.sentiment)) as "up" | "down" | null,
  };
}

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = buildFilters(sp);

  const [overview, dailySeries, surfaceBreakdown, modelBreakdown, feedbackBreakdown, failureBreakdown, recentNegativeFeedback, options] =
    await Promise.all([
      getAiOverview(filters),
      getAiDailySeries(filters),
      getAiSurfaceBreakdown(filters),
      getAiModelBreakdown(filters),
      getAiFeedbackBreakdown(filters),
      getAiFailureBreakdown(filters),
      getRecentNegativeFeedback(filters),
      getAiFilterOptions(),
    ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Filters</p>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-2)]">
              Track generation volume, cost, quality, and model behavior across every AI surface.
            </p>
          </div>
          <Link
            href="/admin/ai/review"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
          >
            Open Feedback Review
          </Link>
        </div>
        <form className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="From" name="from" type="date" defaultValue={filters.from} />
          <FilterField label="To" name="to" type="date" defaultValue={filters.to} />
          <SelectField label="Surface" name="surfaceKey" value={filters.surfaceKey ?? "all"} options={["all", ...options.surfaceKeys]} />
          <SelectField label="Surface Detail" name="surfaceDetail" value={filters.surfaceDetail ?? "all"} options={["all", ...options.surfaceDetails]} />
          <SelectField label="Provider" name="provider" value={filters.provider ?? "all"} options={["all", ...options.providers]} />
          <SelectField label="Model" name="model" value={filters.model ?? "all"} options={["all", ...options.models]} />
          <SelectField label="Status" name="status" value={filters.status ?? "all"} options={["all", ...options.statuses]} />
          <SelectField label="Sentiment" name="sentiment" value={filters.sentiment ?? "all"} options={["all", "up", "down"]} />
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <AiAnalyticsDashboard
        overview={overview}
        dailySeries={dailySeries}
        surfaceBreakdown={surfaceBreakdown}
        modelBreakdown={modelBreakdown}
        feedbackBreakdown={feedbackBreakdown}
        failureBreakdown={failureBreakdown}
        recentNegativeFeedback={recentNegativeFeedback}
      />
    </div>
  );
}

function FilterField({
  label,
  name,
  type,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
