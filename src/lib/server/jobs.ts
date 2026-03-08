export type QueueClass =
  | "live_read"
  | "comment_write"
  | "ai_interactive"
  | "article_generation"
  | "enrichment"
  | "backfill";

export const JOB_PRIORITY: Record<QueueClass, number> = {
  live_read: 100,
  comment_write: 90,
  ai_interactive: 80,
  article_generation: 60,
  enrichment: 40,
  backfill: 20,
};

export function getJobPriority(queueClass: QueueClass): number {
  return JOB_PRIORITY[queueClass];
}

export function sortJobsByPriority<T extends { queueClass: QueueClass }>(jobs: T[]): T[] {
  return jobs.slice().sort((left, right) => JOB_PRIORITY[right.queueClass] - JOB_PRIORITY[left.queueClass]);
}
