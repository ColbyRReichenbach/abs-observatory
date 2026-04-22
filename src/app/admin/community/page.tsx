import Link from "next/link";

import { formatDisplayTime } from "@/lib/display-time";
import {
  getAdminCommunityOverview,
  listAdminCommentReports,
  listAdminModerationQueue,
  listRecentModerationActions,
} from "@/lib/server/admin-community";
import { moderateCommentFromAdminAction, updateCommentReportStatusAction } from "./actions";

function statusTone(status: string) {
  if (status === "pending_review" || status === "open") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "hidden" || status === "actioned") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "published" || status === "reviewed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function formatWhen(value: string) {
  return formatDisplayTime(value, { year: "numeric" });
}

function commentTargetHref(item: {
  threadType: "article" | "challenge";
  articleSlug: string | null;
  gamePk: number | null;
}) {
  if (item.threadType === "article" && item.articleSlug) {
    return `/articles/${item.articleSlug}`;
  }
  if (item.gamePk) {
    return `/game/${item.gamePk}`;
  }
  return null;
}

export default async function AdminCommunityPage() {
  const [overview, queue, reports, actions] = await Promise.all([
    getAdminCommunityOverview(),
    listAdminModerationQueue(36),
    listAdminCommentReports(24),
    listRecentModerationActions(20),
  ]);

  return (
    <section className="space-y-8">
      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Community Ops</p>
            <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">Moderation Queue</h2>
            <p className="mt-3 max-w-3xl text-sm text-[var(--ink-2)]">
              Review flagged comments, work open reports, and keep a clear read on recent moderation activity.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard label="Pending Review" value={overview.pendingComments.toLocaleString()} />
          <OverviewCard label="Hidden Comments" value={overview.hiddenComments.toLocaleString()} />
          <OverviewCard label="Open Reports" value={overview.openReports.toLocaleString()} />
          <OverviewCard label="Actions 7d" value={overview.recentActions.toLocaleString()} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Queue</p>
              <h3 className="mt-1 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">Comments Needing Attention</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{queue.length} shown</span>
          </div>

          <div className="space-y-4">
            {queue.map((item) => {
              const targetHref = commentTargetHref(item);
              return (
                <article key={item.commentId} className="rounded-3xl border border-black/10 bg-[var(--surface-1)] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${statusTone(item.moderationStatus)}`}>
                          {item.moderationStatus.replaceAll("_", " ")}
                        </span>
                        {item.openReportCount > 0 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                            {item.openReportCount} open report{item.openReportCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        {item.toxicityScore !== null ? (
                          <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                            toxicity {Math.round(item.toxicityScore * 100)}%
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-base leading-7 text-[var(--ink-1)]">{item.body}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-3)]">
                        <span>{item.displayName ?? item.username ?? "Unknown author"}</span>
                        {item.username ? <span>@{item.username}</span> : null}
                        {item.primaryEmail ? <span>{item.primaryEmail}</span> : null}
                        <span>{formatWhen(item.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-3)]">
                        {item.threadType === "article"
                          ? item.articleTitle ?? item.articleSlug ?? "Article thread"
                          : `Challenge thread${item.gamePk ? ` · game ${item.gamePk}` : ""}`}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {targetHref ? (
                        <Link
                          href={targetHref}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
                        >
                          Open Thread
                        </Link>
                      ) : null}

                      {item.moderationStatus !== "hidden" ? (
                        <form action={moderateCommentFromAdminAction}>
                          <input type="hidden" name="commentId" value={item.commentId} />
                          <input type="hidden" name="action" value="hide" />
                          <input type="hidden" name="reason" value="Hidden from admin moderation queue" />
                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-red-700 transition hover:scale-105 active:scale-95"
                          >
                            Hide Comment
                          </button>
                        </form>
                      ) : (
                        <form action={moderateCommentFromAdminAction}>
                          <input type="hidden" name="commentId" value={item.commentId} />
                          <input type="hidden" name="action" value="restore" />
                          <input type="hidden" name="reason" value="Restored from admin moderation queue" />
                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 transition hover:scale-105 active:scale-95"
                          >
                            Restore Comment
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {queue.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 bg-[var(--surface-infield)] px-5 py-8 text-sm text-[var(--ink-2)]">
                Nothing is waiting in the moderation queue right now.
              </div>
            ) : null}
          </div>
        </section>

        <div className="space-y-8">
          <section className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Open Reports</p>
              <h3 className="mt-1 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">Report Inbox</h3>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <article key={report.reportId} className="rounded-3xl border border-black/10 bg-[var(--surface-1)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${statusTone(report.status)}`}>
                      {report.reason}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{formatWhen(report.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-1)]">{report.commentBody}</p>
                  {report.details ? <p className="mt-2 text-sm text-[var(--ink-2)]">Reporter note: {report.details}</p> : null}
                  <div className="mt-3 text-xs text-[var(--ink-3)]">
                    Reported by {report.reportedByDisplayName ?? report.reportedByUsername ?? "Unknown"} · Comment by{" "}
                    {report.commentAuthorDisplayName ?? report.commentAuthorUsername ?? "Unknown"}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={updateCommentReportStatusAction}>
                      <input type="hidden" name="reportId" value={report.reportId} />
                      <input type="hidden" name="status" value="reviewed" />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
                      >
                        Mark Reviewed
                      </button>
                    </form>
                    <form action={updateCommentReportStatusAction}>
                      <input type="hidden" name="reportId" value={report.reportId} />
                      <input type="hidden" name="status" value="dismissed" />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20"
                      >
                        Dismiss
                      </button>
                    </form>
                    <form action={updateCommentReportStatusAction}>
                      <input type="hidden" name="reportId" value={report.reportId} />
                      <input type="hidden" name="status" value="actioned" />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-red-700 transition hover:scale-105 active:scale-95"
                      >
                        Mark Actioned
                      </button>
                    </form>
                  </div>
                </article>
              ))}

              {reports.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-black/10 bg-[var(--surface-infield)] px-5 py-8 text-sm text-[var(--ink-2)]">
                  No open comment reports right now.
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Recent Actions</p>
              <h3 className="mt-1 text-2xl font-display uppercase tracking-[0.03em] text-[var(--ink-0)]">Moderation Log</h3>
            </div>

            <div className="space-y-3">
              {actions.map((action) => (
                <div key={action.actionId} className="rounded-2xl border border-black/10 bg-[var(--surface-1)] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)]">
                      {action.actionType.replaceAll("_", " ")}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{formatWhen(action.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink-2)]">
                    {action.actorDisplayName ?? action.actorUsername ?? "Unknown"} on{" "}
                    {action.targetDisplayName ?? action.targetUsername ?? "unknown user"}
                  </p>
                  {action.reason ? <p className="mt-2 text-sm text-[var(--ink-2)]">Reason: {action.reason}</p> : null}
                </div>
              ))}

              {actions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-black/10 bg-[var(--surface-infield)] px-5 py-8 text-sm text-[var(--ink-2)]">
                  No recent moderation actions yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-black/10 bg-[var(--surface-infield)] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">{value}</p>
    </div>
  );
}
