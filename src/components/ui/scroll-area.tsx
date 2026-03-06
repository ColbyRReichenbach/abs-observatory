"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

export function UIScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollArea.Root className={cn("relative overflow-hidden", className)}>
      <ScrollArea.Viewport className="h-full w-full">{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none bg-white/5 p-[1px]">
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/20" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
