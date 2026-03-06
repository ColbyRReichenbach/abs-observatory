"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

import { cn } from "@/lib/ui";

export const UITooltipProvider = Tooltip.Provider;
export const UITooltip = Tooltip.Root;
export const UITooltipTrigger = Tooltip.Trigger;

export function UITooltipContent({ className, ...props }: Tooltip.TooltipContentProps) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        sideOffset={6}
        className={cn("z-50 rounded-md border border-white/20 bg-[#061224] px-2 py-1 text-xs text-white shadow-lg", className)}
        {...props}
      />
    </Tooltip.Portal>
  );
}
