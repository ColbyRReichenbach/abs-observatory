import Link from "next/link";

import { getEditorialOpsOverview, getEditorialRunDetail, listEditorialRuns } from "@/lib/server/admin-editorial";
import { publishArticleAction, rerunDailyAutoAction, suppressArticleAction } from "./actions";

function formatDateTime(value: string | null) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function statusTone(status: string) {
  if (status === "published" || status === "persisted" || status === "passed" || status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "generated" || status === "running") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "suppressed" || status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-600";
}

export default async function AdminEditorialPage({
  searchParams,
}: {
  searchParams?: Promise<{ run?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const overview = await getEditorialOpsOverview();
  const runs = await listEditorialRuns(14);
  const selectedRunId = sp.run ?? runs[0]?.generationRunId ?? null;
  const selectedRun = selectedRunId ? await getEditorialRunDetail(selectedRunId) : null;

  return (
    <section className="space-y-8">
      <div className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Editorial Ops</p>
            <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
              Gazette Operations
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
              Track daily Gazette runs, inspect the author step by provider and model, and publish or suppress output
              without leaving the app.
            </p>
          </div>

          <form action={rerunDailyAutoAction} className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-[var(--surface-1)] p-5">
            <label htmlFor="sourceDate" className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ink-2)]">
              Rerun Daily Auto
            </label>
            <input
              id="sourceDate"
              name="sourceDate"
              type="date"
              defaultValue={overview.latestSourceDate ?? undefined}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-0)] outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-transform hover:scale-105 active:scale-95"
            >
              Rerun Gazette
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard label="Generation Runs" value={String(overview.totalRuns)} detail={`${overview.persistedRuns} persisted`} />
          <OverviewCard label="Published Articles" value={String(overview.publishedArticles)} detail={`${overview.generatedArticles} held · ${overview.suppressedArticles} suppressed`} />
          <OverviewCard label="Tracked Tokens" value={overview.totalTokens.toLocaleString()} detail="Across Gazette generation steps" />
          <OverviewCard label="Estimated Cost" value={formatCost(overview.totalEstimatedCostUsd)} detail="Author telemetry and step ledger" />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Recent Runs</p>
              <h3 className="mt-1 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">
                Run History
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{runs.length} shown</span>
          </div>

          <div className="space-y-3">
            {runs.map((run) => {
              const active = run.generationRunId === selectedRun?.generationRunId;
              return (
                <Link
                  key={run.generationRunId}
                  href={`/admin/editorial?run=${run.generationRunId}`}
                  className={`block rounded-3xl border p-4 transition ${
                    active
                      ? "border-black bg-black text-white shadow-xl shadow-black/10"
                      : "border-black/10 bg-[var(--surface-1)] text-[var(--ink-0)] hover:border-black/20 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${active ? "text-white/70" : "text-blue-500"}`}>
                        {run.sourceDate ?? "No source date"}
                      </p>
                      <p className="mt-2 text-sm font-semibold">{run.articleTitle ?? "Awaiting persisted article"}</p>
                      <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-[var(--ink-3)]"}`}>
                        {run.selectedAuthor ?? "No author"} · {run.authorProvider ?? "deterministic"}
                        {run.authorModelName ? ` / ${run.authorModelName}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${active ? "border-white/20 bg-white/10 text-white" : statusTone(run.status)}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className={`mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] ${active ? "text-white/60" : "text-[var(--ink-3)]"}`}>
                    <span>{run.totalTokens.toLocaleString()} tok</span>
                    <span>{formatCost(run.estimatedCostUsd)}</span>
                    <span>{formatDateTime(run.startedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          {selectedRun ? (
            <>
              <div className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Run Detail</p>
                    <h3 className="mt-2 text-3xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">
                      {selectedRun.articleTitle ?? selectedRun.sourceDate ?? "Gazette Run"}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm text-[var(--ink-2)]">
                      {selectedRun.storyTheme
                        ? `Story theme: ${selectedRun.storyTheme.replaceAll("_", " ")}.`
                        : "Story theme has not been resolved yet."}{" "}
                      Validation is currently <strong>{selectedRun.validationState}</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusTone(selectedRun.status)}`}>
                      Run {selectedRun.status}
                    </span>
                    {selectedRun.articleStatus ? (
                      <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusTone(selectedRun.articleStatus)}`}>
                        Article {selectedRun.articleStatus}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <OverviewCard label="Author Step" value={selectedRun.selectedAuthor ?? "Unassigned"} detail={`${selectedRun.authorProvider ?? "deterministic"}${selectedRun.authorModelName ? ` · ${selectedRun.authorModelName}` : ""}`} />
                  <OverviewCard label="Telemetry" value={selectedRun.totalTokens.toLocaleString()} detail={`${selectedRun.inputTokens.toLocaleString()} in · ${selectedRun.outputTokens.toLocaleString()} out`} />
                  <OverviewCard label="Estimated Cost" value={formatCost(selectedRun.estimatedCostUsd)} detail={selectedRun.latencyMs ? `${selectedRun.latencyMs} ms author latency` : "No latency captured"} />
                  <OverviewCard label="Lifecycle" value={formatDateTime(selectedRun.finishedAt ?? selectedRun.startedAt)} detail={selectedRun.articlePublishedAt ? `Published ${formatDateTime(selectedRun.articlePublishedAt)}` : "Not published yet"} />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedRun.sourceDate ? (
                    <form action={rerunDailyAutoAction}>
                      <input type="hidden" name="sourceDate" value={selectedRun.sourceDate} />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-transform hover:scale-105 active:scale-95"
                      >
                        Regenerate This Date
                      </button>
                    </form>
                  ) : null}

                  {selectedRun.articleSlug && selectedRun.articleStatus !== "published" ? (
                    <form action={publishArticleAction}>
                      <input type="hidden" name="slug" value={selectedRun.articleSlug} />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 transition-transform hover:scale-105 active:scale-95"
                      >
                        Publish Article
                      </button>
                    </form>
                  ) : null}

                  {selectedRun.articleId && selectedRun.articleStatus !== "suppressed" ? (
                    <form action={suppressArticleAction}>
                      <input type="hidden" name="articleId" value={selectedRun.articleId} />
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-700 transition-transform hover:scale-105 active:scale-95"
                      >
                        Suppress Article
                      </button>
                    </form>
                  ) : null}

                  {selectedRun.articleSlug ? (
                    <Link
                      href={`/articles/${selectedRun.articleSlug}`}
                      className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ink-2)] transition hover:border-black/20 hover:text-black"
                    >
                      View Public Article
                    </Link>
                  ) : null}
                </div>

                {selectedRun.errorMessage ? (
                  <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {selectedRun.errorMessage}
                  </div>
                ) : null}
              </div>

              <div className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
                <div className="mb-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Generation Steps</p>
                  <h3 className="mt-2 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">
                    Step Ledger
                  </h3>
                </div>

                <div className="space-y-5">
                  {selectedRun.steps.map((step) => (
                    <div key={step.generationStepId} className="rounded-3xl border border-black/10 bg-[var(--surface-1)] p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{step.stepKey.replaceAll("_", " ")}</p>
                          <h4 className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{step.agentName}</h4>
                          <p className="mt-1 text-xs text-[var(--ink-3)]">
                            {step.provider ?? "deterministic"}
                            {step.modelName ? ` · ${step.modelName}` : ""}
                            {step.generationId ? ` · ${step.generationId}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${statusTone(step.status)}`}>
                          {step.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <MiniStat label="Tokens In" value={step.inputTokens.toLocaleString()} />
                        <MiniStat label="Tokens Out" value={step.outputTokens.toLocaleString()} />
                        <MiniStat label="Cost" value={formatCost(step.estimatedCostUsd)} />
                        <MiniStat label="Latency" value={step.latencyMs ? `${step.latencyMs} ms` : "n/a"} />
                      </div>

                      {step.errorMessage ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {step.errorMessage}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <PayloadBlock title="Input Payload" payload={step.inputPayload} />
                        <PayloadBlock title="Output Payload" payload={step.outputPayload} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
              <p className="text-sm text-[var(--ink-2)]">No Gazette runs are available yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OverviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-[var(--surface-1)] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-3 text-3xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">{value}</p>
      <p className="mt-2 text-xs text-[var(--ink-3)]">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function PayloadBlock({ title, payload }: { title: string; payload: unknown }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">{title}</p>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[var(--surface-1)] p-4 text-[11px] leading-relaxed text-[var(--ink-2)]">
        {JSON.stringify(payload ?? null, null, 2)}
      </pre>
    </div>
  );
}
