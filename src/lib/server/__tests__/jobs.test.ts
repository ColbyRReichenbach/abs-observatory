import { describe, expect, it } from "vitest";

import { getJobPriority, sortJobsByPriority } from "@/lib/server/jobs";

describe("job priority helpers", () => {
  it("assigns higher priority to live and interactive work", () => {
    expect(getJobPriority("live_read")).toBeGreaterThan(getJobPriority("backfill"));
    expect(getJobPriority("comment_write")).toBeGreaterThan(getJobPriority("enrichment"));
  });

  it("sorts queue items by descending priority", () => {
    const jobs = sortJobsByPriority([
      { queueClass: "backfill" as const, id: "backfill" },
      { queueClass: "ai_interactive" as const, id: "ai" },
      { queueClass: "live_read" as const, id: "live" },
    ]);

    expect(jobs.map((job) => job.id)).toEqual(["live", "ai", "backfill"]);
  });
});
