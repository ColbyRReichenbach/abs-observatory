"use client";

import * as Tabs from "@radix-ui/react-tabs";

import { cn } from "@/lib/ui";

export const UITabs = Tabs.Root;

export function UITabsList({ className, ...props }: Tabs.TabsListProps) {
  return <Tabs.List className={cn("inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-1", className)} {...props} />;
}

export function UITabsTrigger({ className, ...props }: Tabs.TabsTriggerProps) {
  return (
    <Tabs.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/75 data-[state=active]:bg-cyan-300/25 data-[state=active]:text-cyan-100",
        className,
      )}
      {...props}
    />
  );
}

export const UITabsContent = Tabs.Content;
