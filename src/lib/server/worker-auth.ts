import { timingSafeEqual } from "node:crypto";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthorizedWorkerRequest(request: Request): boolean {
  const configuredToken = process.env.INTERNAL_WORKER_TOKEN;
  if (!configuredToken) {
    return process.env.NODE_ENV !== "production";
  }

  const providedToken = request.headers.get("x-worker-token");
  if (!providedToken) {
    return false;
  }

  return safeCompare(providedToken, configuredToken);
}
