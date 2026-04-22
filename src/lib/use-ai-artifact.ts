"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CSRF_COOKIE_NAME = "aibs_csrf";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const matched = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : null;
}

async function ensureCsrfToken() {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    const response = await fetch("/api/csrf", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { csrfToken?: string };
    if (!response.ok || !body.csrfToken) {
      return null;
    }
    return body.csrfToken;
  } catch {
    return null;
  }
}

type ArtifactParams = {
  enabled?: boolean;
  surfaceKey: "chart_insight";
  surfaceDetail?: string | null;
  targetType: "chart_insight" | "challenge_summary";
  targetId: string;
  title?: string | null;
  summary?: string | null;
  routeScope?: string | null;
  routeEntityId?: string | null;
  articleId?: string | null;
  gamePk?: number | null;
  artifactPayload?: unknown;
  metadata?: Record<string, unknown> | null;
};

export function useAiArtifactGeneration(params: ArtifactParams) {
  const [generationId, setGenerationId] = useState<string | null>(null);
  const pathname = usePathname();
  const requestBody = JSON.stringify({
    ...params,
    routeScope: params.routeScope ?? pathname ?? null,
  });

  useEffect(() => {
    let active = true;

    async function register() {
      const parsed = JSON.parse(requestBody) as ArtifactParams;
      if (parsed.enabled === false) return;
      if (!parsed.targetId) return;

      const csrfToken = await ensureCsrfToken();
      if (!csrfToken) return;

      try {
        const response = await fetch("/api/ai/artifacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: requestBody,
        });
        const body = (await response.json()) as { generationId?: string | null };
        if (active && response.ok) {
          setGenerationId(body.generationId ?? null);
        }
      } catch {
        // Silent telemetry failure: the surface still renders and feedback still works without generation linkage.
      }
    }

    void register();

    return () => {
      active = false;
    };
  }, [requestBody]);

  return generationId;
}
