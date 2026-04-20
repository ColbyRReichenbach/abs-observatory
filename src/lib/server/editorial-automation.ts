import { timingSafeEqual } from "node:crypto";

import { enqueueJob, type QueuedJob } from "@/lib/server/job-queue";

const EDITORIAL_TIME_ZONE = "America/New_York";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to resolve editorial time-zone date");
  }

  return `${year}-${month}-${day}`;
}

function shiftIsoDate(dateString: string, dayDelta: number) {
  const [year, month, day] = dateString.split("-").map((value) => Number(value));
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + dayDelta);
  return formatIsoDate(shifted);
}

export function resolveEditorialSourceDate(now = new Date()) {
  const currentEtDate = getTimeZoneDateParts(now, EDITORIAL_TIME_ZONE);
  return shiftIsoDate(currentEtDate, -1);
}

export function normalizeEditorialSourceDate(sourceDate?: string | null, now = new Date()) {
  const trimmed = sourceDate?.trim();
  if (!trimmed) {
    return resolveEditorialSourceDate(now);
  }
  if (!DATE_PATTERN.test(trimmed)) {
    throw new Error("sourceDate must be formatted as YYYY-MM-DD");
  }
  return trimmed;
}

export function buildEditorialDailyIdempotencyKey(sourceDate: string) {
  return `editorial-daily-auto:${sourceDate}`;
}

export async function enqueueEditorialDailyAutomation(input: {
  sourceDate?: string | null;
  requestedAt?: Date;
  trigger?: "cron" | "manual" | "api";
} = {}): Promise<{
  sourceDate: string;
  job: QueuedJob<"article_daily_auto">;
}> {
  const sourceDate = normalizeEditorialSourceDate(input.sourceDate, input.requestedAt ?? new Date());
  const requestedAt = (input.requestedAt ?? new Date()).toISOString();
  const trigger = input.trigger ?? "cron";

  const job = await enqueueJob({
    jobName: "editorial_daily_auto",
    jobType: "article_daily_auto",
    payload: { sourceDate },
    idempotencyKey: buildEditorialDailyIdempotencyKey(sourceDate),
    metadata: {
      enqueuedFrom: "editorial.automation",
      trigger,
      sourceDate,
      requestedAt,
      timeZone: EDITORIAL_TIME_ZONE,
    },
  });

  return { sourceDate, job };
}

export function isAuthorizedEditorialCronRequest(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return safeCompare(authorization.slice("Bearer ".length), configuredSecret);
}
