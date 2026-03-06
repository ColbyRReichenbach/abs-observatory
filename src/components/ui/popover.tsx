"use client";

import * as Popover from "@radix-ui/react-popover";

import { cn } from "@/lib/ui";

export const UIPopover = Popover.Root;
export const UIPopoverTrigger = Popover.Trigger;

export function UIPopoverContent({ className, ...props }: Popover.PopoverContentProps) {
  return (
    <Popover.Portal>
      <Popover.Content
        sideOffset={8}
        className={cn("z-50 rounded-xl border border-white/15 bg-[#081427] p-3 text-sm text-white shadow-xl", className)}
        {...props}
      />
    </Popover.Portal>
  );
}
