"use client";

import { AlertTriangle } from "lucide-react";

import { UITooltip, UITooltipContent, UITooltipProvider, UITooltipTrigger } from "@/components/ui/tooltip";

export function DirectionalCaution({
  title = "Directional only",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <UITooltipProvider delayDuration={120}>
      <UITooltip>
        <UITooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
            aria-label={title}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </UITooltipTrigger>
        <UITooltipContent className="max-w-[280px] rounded-2xl border border-amber-200/70 bg-[#2d1807] px-3 py-2 text-[11px] leading-5 text-amber-50 shadow-2xl">
          <p className="font-black uppercase tracking-[0.14em] text-amber-200">{title}</p>
          <p className="mt-1">{message}</p>
        </UITooltipContent>
      </UITooltip>
    </UITooltipProvider>
  );
}
