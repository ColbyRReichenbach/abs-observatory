import { listPublishedArticles } from "@/lib/server/articles";
import { ArticlesGrid } from "@/components/articles/articles-grid";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await listPublishedArticles(24);

  return (
    <div className="min-h-screen bg-[#fcf9f2] px-6 pb-24 pt-24 text-[#2c2c2c]">
      <div className="mx-auto max-w-5xl">
        <header className="border-b-4 border-double border-[#2c2c2c] pb-8 pt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">AiBS Editorial Desk</p>
          <h1 className="mt-3 text-5xl font-display uppercase tracking-tight md:text-7xl">Articles</h1>
          <p className="mt-4 max-w-2xl text-sm text-[#5a554d]">
            Daily automated recaps and weekly human-written breakdowns of ABS trends, challenge decisions, and
            league-wide context.
          </p>
        </header>

        <main className="mt-10">
          <ArticlesGrid articles={articles} />
        </main>
      </div>
    </div>
  );
}
