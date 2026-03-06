"use client";

import * as Select from "@radix-ui/react-select";

import { cn } from "@/lib/ui";

export const UISelect = Select.Root;
export const UISelectValue = Select.Value;

export function UISelectTrigger({ className, ...props }: Select.SelectTriggerProps) {
  return (
    <Select.Trigger
      className={cn("inline-flex h-9 items-center justify-between rounded-md border border-white/20 bg-[#081427] px-3 text-sm text-white", className)}
      {...props}
    />
  );
}

export const UISelectGroup = Select.Group;
export const UISelectItem = Select.Item;

export function UISelectContent({ className, ...props }: Select.SelectContentProps) {
  return (
    <Select.Portal>
      <Select.Content className={cn("z-50 rounded-md border border-white/20 bg-[#061224] p-1 text-sm text-white shadow-xl", className)} {...props}>
        <Select.Viewport>{props.children}</Select.Viewport>
      </Select.Content>
    </Select.Portal>
  );
}

export function UISelectLabel({ className, ...props }: Select.SelectLabelProps) {
  return <Select.Label className={cn("px-2 py-1 text-xs text-white/60", className)} {...props} />;
}

export function UISelectItemText({ className, ...props }: Select.SelectItemTextProps) {
  return <Select.ItemText className={cn(className)} {...props} />;
}
