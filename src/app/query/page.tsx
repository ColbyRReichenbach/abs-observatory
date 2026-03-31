
import { redirect } from "next/navigation";

import { QueryExplorerClient } from "@/components/query/query-explorer-client";
import { launchConfig } from "@/lib/launch-config";
import { canAccessPrivateAi } from "@/lib/server/admin";
import { resolveViewMode } from "@/lib/view-mode";

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const canUsePrivateAi = await canAccessPrivateAi();

  if (!launchConfig.publicQueryLabEnabled && !canUsePrivateAi) {
    redirect("/about/how-aibs-works");
  }

  const viewMode = await resolveViewMode(sp);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
          Extra Innings
        </p>
        <h1 className="text-4xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">
          Ask The Query Lab
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-3)]">
          Step Goal: Run One Question Through The Desk
        </p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Then Open Query Lab and pressure-test one baseball question against the live product state.
        </p>
      </div>
      <QueryExplorerClient mode={viewMode} />
    </main>
  );
}
