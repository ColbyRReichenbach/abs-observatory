"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

export const Drawer = Dialog.Root;
export const DrawerTrigger = Dialog.Trigger;
export const DrawerClose = Dialog.Close;

export function DrawerPortal({ children }: { children: ReactNode }) {
  return <Dialog.Portal>{children}</Dialog.Portal>;
}

export function DrawerOverlay({ className }: { className?: string }) {
  return <Dialog.Overlay className={cn("fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]", className)} />;
}

export function DrawerContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <Dialog.Content
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/20 bg-[#081427] p-4 text-white shadow-2xl outline-none",
          className,
        )}
      >
        {children}
      </Dialog.Content>
    </DrawerPortal>
  );
}

export const DrawerTitle = Dialog.Title;
export const DrawerDescription = Dialog.Description;
