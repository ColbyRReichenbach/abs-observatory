import { AboutArticlesGrid } from "@/components/about/about-articles-grid";
import { ABOUT_ARTICLES } from "@/lib/about-articles";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fcf9f2] px-6 pb-24 pt-24 text-[#2c2c2c]">
      <div className="mx-auto max-w-6xl">
        <header className="border-b-4 border-double border-[#2c2c2c] pb-8 pt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7d6c54]">AiBS Editorial Desk</p>
          <h1 className="mt-3 text-5xl font-display uppercase tracking-tight md:text-7xl">About</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#5a554d]">
            A small editorial desk for the project itself: what AiBS is, how ABS works, why the product exists,
            and the people and systems behind the experience.
          </p>
        </header>

        <main className="mt-10">
          <AboutArticlesGrid articles={ABOUT_ARTICLES} />
        </main>
      </div>
    </div>
  );
}
