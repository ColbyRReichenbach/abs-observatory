import Link from "next/link";
import { format, subDays } from "date-fns";

import {
  getAiFeedbackReviewDetail,
  getAiFeedbackReviewList,
  getAiFilterOptions,
  type AdminAiFeedbackReviewFilters,
} from "@/lib/server/admin-ai-analytics";

import { updateAiFeedbackReviewAction } from "./actions";

function getFilterValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>): AdminAiFeedbackReviewFilters {
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
    bucket: getFilterValue(searchParams.bucket) ?? "all",
    hasComment: ((getFilterValue(searchParams.hasComment) ?? "all") as "all" | "yes" | "no") ?? "all",
    reviewStatus: getFilterValue(searchParams.reviewStatus) ?? "all",
  };
}

function buildDetailHref(filters: AdminAiFeedbackReviewFilters, feedbackId: string) {
  const params = new URLSearchParams();
  params.set("from", filters.from);
  params.set("to", filters.to);
  params.set("surfaceKey", filters.surfaceKey ?? "all");
  params.set("surfaceDetail", filters.surfaceDetail ?? "all");
  params.set("provider", filters.provider ?? "all");
  params.set("model", filters.model ?? "all");
  params.set("status", filters.status ?? "all");
  params.set("sentiment", filters.sentiment ?? "all");
  params.set("bucket", filters.bucket ?? "all");
  params.set("hasComment", filters.hasComment ?? "all");
  params.set("reviewStatus", filters.reviewStatus ?? "all");
  params.set("feedbackId", feedbackId);
  return `/admin/ai/review?${params.toString()}`;
}

function buildTargetHref(detail: {
  targetType: string;
  targetId: string;
  routeScope: string | null;
  routeEntityId: string | null;
  gamePk: string | null;
}) {
  if (detail.gamePk) {
    return `/game/${detail.gamePk}`;
  }

  if (detail.routeScope && detail.routeEntityId) {
    return `/${detail.routeScope}/${detail.routeEntityId}`;
  }

  if (detail.routeScope) {
    return `/${detail.routeScope}`;
  }

  if (detail.targetType === "game_report") {
    return `/game/${detail.targetId}`;
  }

  if (detail.targetType === "article") {
    return `/articles/${detail.targetId}`;
  }

  return null;
}

function SentimentBadge({ sentiment }: { sentiment: "up" | "down" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
        sentiment === "up" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {sentiment === "up" ? "Thumbs Up" : "Thumbs Down"}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const tone =
    status === "resolved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "triaged"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${tone}`}>
      {status}
    </span>
  );
}

export default async function AdminAiReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = buildFilters(sp);
  const feedbackId = getFilterValue(sp.feedbackId) ?? null;
  const options = await getAiFilterOptions();
  const feedback = await getAiFeedbackReviewList(filters);
  const activeFeedbackId = feedbackId ?? feedback[0]?.feedbackId ?? null;
  const detail = activeFeedbackId ? await getAiFeedbackReviewDetail(activeFeedbackId) : null;
  const selectedTargetHref = detail ? buildTargetHref(detail) : null;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Feedback Review</p>
            <h2 className="mt-2 text-3xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">
              AI Output Triage
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-2)]">
              Review per-surface thumbs signals, isolate failure buckets, and mark prompt, data, or rendering issues as they are resolved.
            </p>
          </div>
          <Link
            href="/admin/ai"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
          >
            Back To Analytics
          </Link>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="From" name="from" type="date" defaultValue={filters.from} />
          <FilterField label="To" name="to" type="date" defaultValue={filters.to} />
          <SelectField label="Surface" name="surfaceKey" value={filters.surfaceKey ?? "all"} options={["all", ...options.surfaceKeys]} />
          <SelectField label="Provider" name="provider" value={filters.provider ?? "all"} options={["all", ...options.providers]} />
          <SelectField label="Model" name="model" value={filters.model ?? "all"} options={["all", ...options.models]} />
          <SelectField label="Generation Status" name="status" value={filters.status ?? "all"} options={["all", ...options.statuses]} />
          <SelectField label="Sentiment" name="sentiment" value={filters.sentiment ?? "all"} options={["all", "up", "down"]} />
          <SelectField label="Bucket" name="bucket" value={filters.bucket ?? "all"} options={["all", ...options.buckets]} />
          <SelectField label="Has Comment" name="hasComment" value={filters.hasComment ?? "all"} options={["all", "yes", "no"]} />
          <SelectField label="Review Status" name="reviewStatus" value={filters.reviewStatus ?? "all"} options={["all", ...options.reviewStatuses]} />
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

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Queue</p>
              <h3 className="mt-2 text-2xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">
                Feedback Signals
              </h3>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {feedback.length} rows
            </p>
          </div>

          <div className="space-y-3">
            {feedback.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 px-5 py-12 text-center text-sm text-[var(--ink-3)]">
                No feedback rows match the current filters.
              </div>
            ) : null}
            {feedback.map((row) => {
              const href = buildDetailHref(filters, row.feedbackId);
              const isActive = row.feedbackId === activeFeedbackId;
              return (
                <Link
                  key={row.feedbackId}
                  href={href}
                  className={`block rounded-[1.5rem] border px-5 py-4 transition ${
                    isActive
                      ? "border-black bg-[var(--ink-0)] text-white shadow-lg shadow-black/10"
                      : "border-black/10 bg-[var(--surface-infield)] hover:border-black/20 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <SentimentBadge sentiment={row.sentiment} />
                    <ReviewStatusBadge status={row.reviewStatus} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${isActive ? "text-white/70" : "text-[var(--ink-3)]"}`}>
                      {row.surface}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
                    <span>{row.provider ?? "deterministic"} / {row.modelName ?? "artifact"}</span>
                    <span className={isActive ? "text-white/40" : "text-[var(--ink-3)]"}>•</span>
                    <span>{row.effectiveBucket}</span>
                    <span className={isActive ? "text-white/40" : "text-[var(--ink-3)]"}>•</span>
                    <span>{new Date(row.createdAt).toLocaleString()}</span>
                  </div>
                  <p className={`mt-3 line-clamp-2 text-sm leading-6 ${isActive ? "text-white/90" : "text-[var(--ink-2)]"}`}>
                    {row.comment ?? "No freeform note. Review based on thumbs signal only."}
                  </p>
                  <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black uppercase tracking-[0.16em] ${isActive ? "text-white/60" : "text-[var(--ink-3)]"}`}>
                    <span>{row.targetType}</span>
                    {row.generationStatus ? <span>{row.generationStatus}</span> : null}
                    {row.totalTokens > 0 ? <span>{row.totalTokens.toLocaleString()} tokens</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
          {detail ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Selected Feedback</p>
                  <h3 className="mt-2 text-2xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">
                    {detail.surface.replace(/_/g, " ")}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--ink-2)]">
                    {detail.provider ?? "deterministic"} / {detail.modelName ?? "artifact"} · {detail.targetType} · {detail.targetId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SentimentBadge sentiment={detail.sentiment} />
                  <ReviewStatusBadge status={detail.reviewStatus} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Bucket" value={detail.effectiveBucket} />
                <InfoCard label="Generation" value={detail.generationStatus ?? "unlinked"} />
                <InfoCard label="Latency" value={detail.latencyMs ? `${detail.latencyMs} ms` : "—"} />
                <InfoCard label="Estimated Cost" value={detail.totalEstimatedCostUsd ? `$${detail.totalEstimatedCostUsd.toFixed(4)}` : "$0.0000"} />
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[var(--surface-infield)] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">User Comment</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-1)]">
                  {detail.comment ?? "No comment provided. This signal came from a bare thumbs interaction."}
                </p>
              </div>

              <div className="mt-6 grid gap-5">
                <div className="rounded-[1.5rem] border border-black/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Classifier Notes</p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--ink-2)]">
                    <p>Status: <strong className="text-[var(--ink-0)]">{detail.classificationStatus}</strong></p>
                    <p>Bucket: <strong className="text-[var(--ink-0)]">{detail.classificationBucket ?? "unclassified"}</strong></p>
                    <p>Confidence: <strong className="text-[var(--ink-0)]">{detail.classificationConfidence ? `${Math.round(detail.classificationConfidence * 100)}%` : "—"}</strong></p>
                    <p>{detail.classificationNotes ?? "No classifier note saved for this row."}</p>
                  </div>
                </div>

                <form action={updateAiFeedbackReviewAction} className="rounded-[1.5rem] border border-black/10 p-5">
                  <input type="hidden" name="feedbackId" value={detail.feedbackId} />
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Review Status"
                        name="reviewStatus"
                        value={detail.reviewStatus}
                        options={["new", "triaged", "resolved"]}
                      />
                      <SelectField
                        label="Override Bucket"
                        name="overrideBucket"
                        value={detail.overrideBucket ?? "all"}
                        options={["all", ...options.buckets]}
                      />
                    </div>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">Review Notes</span>
                      <textarea
                        name="reviewNotes"
                        defaultValue={detail.reviewNotes ?? ""}
                        rows={6}
                        className="mt-2 w-full rounded-[1.25rem] border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/25"
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">
                        Reviewed {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString() : "never"}
                      </div>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:scale-105 active:scale-95"
                      >
                        Save Review
                      </button>
                    </div>
                  </div>
                </form>

                <div className="rounded-[1.5rem] border border-black/10 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Source Route</p>
                      <p className="mt-2 text-sm text-[var(--ink-1)]">
                        {detail.routeScope ?? "unknown"} {detail.routeEntityId ? `· ${detail.routeEntityId}` : ""}
                      </p>
                    </div>
                    {selectedTargetHref ? (
                      <Link
                        href={selectedTargetHref}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
                      >
                        Open Source Surface
                      </Link>
                    ) : null}
                  </div>
                </div>

                <details className="rounded-[1.5rem] border border-black/10 p-5">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Raw Metadata
                  </summary>
                  <pre className="mt-4 overflow-x-auto rounded-[1rem] bg-[var(--surface-infield)] p-4 text-xs leading-6 text-[var(--ink-2)]">
                    {JSON.stringify(
                      {
                        feedbackMetadata: detail.metadata,
                        generationMetadata: detail.generationMetadata,
                        promptVersion: detail.promptVersion,
                        generationId: detail.generationId,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 px-5 py-12 text-center text-sm text-[var(--ink-3)]">
              Select a feedback row to inspect the linked model, bucket, and review notes.
            </div>
          )}
        </section>
      </div>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[var(--surface-infield)] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--ink-0)]">{value}</p>
    </div>
  );
}
