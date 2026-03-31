import { notFound } from "next/navigation";

import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 pt-32 pb-24 lg:pt-40">
      <div className="mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Owner Console</p>
        <h1 className="mt-3 text-5xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)]">
          Admin Hub
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ink-2)]">
          Internal analytics, editorial operations, and owner access controls for AiBS.
        </p>
      </div>
      <AdminTabs />
      <div className="mt-8">{children}</div>
    </main>
  );
}
