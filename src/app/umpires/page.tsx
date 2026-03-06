import Link from "next/link";

import { RangeSelector } from "@/components/range-selector";
import { getUmpireLeaderboard } from "@/lib/data";
import { parseRange } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function UmpiresPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const umpires = await getUmpireLeaderboard(range);
  return (
    <main className="mx-auto max-w-7xl px-6 py-24 lg:py-40">
      <div className="flex flex-col items-center text-center mb-20">
        <h1 className="text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)] leading-[1.2] mb-8 py-4 overflow-visible">
          Umpire <br />
          <span className="opacity-20 italic px-2">Rankings</span>
        </h1>
        <p className="max-w-xl text-[var(--ink-2)] font-medium text-lg leading-tight tracking-tight text-balance">
          Comprehensive ABS challenge performance rankings across the official MLB umpire roster, measuring accuracy and consistency.
        </p>
      </div>

      <div className="mt-12 flex justify-center">
        <RangeSelector basePath="/umpires" range={range} searchParams={sp} />
      </div>

      <div className="mt-16 panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[180px]">Rank & Name</th>
                <th className="text-center">Challenges</th>
                <th className="text-center">Overturned</th>
                <th className="text-center">Accuracy Rating</th>
                <th className="text-right">Games</th>
              </tr>
            </thead>
            <tbody>
              {umpires.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!py-32 text-center text-gray-400 font-semibold">
                    Discovery in progress. No data points for this selection.
                  </td>
                </tr>
              ) : null}
              {umpires.map((u, idx) => (
                <tr key={u.umpireId} className="group/row transition-colors hover:bg-gray-50/50">
                  <td>
                    <Link
                      href={`/umpires/${u.umpireId}?range=${range}`}
                      className="flex items-center gap-5 py-1"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 group-hover/row:bg-black group-hover/row:text-white transition-all transform group-hover/row:scale-110">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="font-black text-gray-900 tracking-tight group-hover/row:text-blue-600 transition-colors">
                        {u.umpireName}
                      </span>
                    </Link>
                  </td>
                  <td className="text-center font-mono text-gray-500 font-bold">{u.challengedCalls}</td>
                  <td className="text-center font-mono text-gray-500 font-bold">{u.overturnedCalls}</td>
                  <td className="text-center">
                    <RateChip value={u.overturnRate} />
                  </td>
                  <td className="text-right font-mono text-gray-400 font-medium pr-8">{u.gamesWorked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function RateChip({ value }: { value: number }) {
  const pct = value * 100;
  const isHigh = pct >= 60;
  const isMid = pct >= 40;

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${isHigh ? "bg-red-50 text-red-600 border-red-100" :
        isMid ? "bg-amber-50 text-amber-700 border-amber-100" :
          "bg-emerald-50 text-emerald-700 border-emerald-100"
        }`}
    >
      {pct.toFixed(1)}% {pct >= 50 ? "Overturned" : "Precise"}
    </span>
  );
}


