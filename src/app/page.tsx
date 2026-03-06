import Link from "next/link";
import { BroadcastStrip } from "@/components/broadcast-strip";
import { ChallengeMomentCards } from "@/components/challenge-moment-cards";
import { GameStrip } from "@/components/game-strip";
import { HomeExpandableGrid } from "@/components/home-expandable-grid";
import { getHomeChallengeMoments, getLiveGames } from "@/lib/data";

export default async function HomePage() {
  const games = await getLiveGames();
  const moments = await getHomeChallengeMoments(12);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)] pt-24">
      {/* Absolute Ticker at Top */}
      <div className="relative z-40 bg-white/50 border-b border-gray-100">
        <BroadcastStrip games={games} moments={moments} />
      </div>

      <GameStrip games={games} />

      <main className="mx-auto max-w-7xl px-6 pt-4 pb-40">
        <HomeExpandableGrid games={games} />

        {/* Global High-Leverage Moments */}
        <section className="mt-32">
          <div className="mb-20 flex flex-col items-center text-center">
            <div className="h-12 w-px bg-blue-200 mb-8" />
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tight text-gray-900 mb-6 leading-[1.2] py-4 overflow-visible">
              Top <span className="opacity-20 italic px-2">Leverage</span> Calls
            </h2>
            <p className="text-gray-500 text-lg max-w-xl font-medium text-balance">
              Review history-defining overturned calls and critical zone assessments from the last 24 hours.
            </p>
          </div>
          <ChallengeMomentCards moments={moments} />
        </section>
      </main>
    </div>
  );
}




