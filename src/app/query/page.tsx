
import { QueryExplorerClient } from "@/components/query/query-explorer-client";
import { resolveViewMode } from "@/lib/view-mode";

export default async function QueryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const viewMode = await resolveViewMode(sp);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <QueryExplorerClient mode={viewMode} />
    </main>
  );
}
