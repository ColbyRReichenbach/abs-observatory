"use client";

import { SignOutButton } from "@clerk/nextjs";

export function ProfileSignOutButton({ className = "" }: { className?: string }) {
  return (
    <SignOutButton>
      <button
        type="button"
        className={className}
      >
        Sign Out
      </button>
    </SignOutButton>
  );
}
