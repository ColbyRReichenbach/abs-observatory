"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SituationalFilters } from "@/lib/types";
import { motion } from "framer-motion";

export function FilterStrip({ filters }: { filters: SituationalFilters }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateFilter = (key: keyof SituationalFilters, value: string | undefined) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        ["inningRange", "leverage", "side", "result"].forEach(k => params.delete(k));
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const hasFilters = Object.values(filters).some(v => v !== undefined);

    return (
        <div className="flex flex-wrap items-center gap-4 py-4 px-6 bg-white border border-gray-100 rounded-3xl shadow-sm mb-8 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Context:</span>
                <select
                    value={filters.inningRange || ""}
                    onChange={(e) => updateFilter("inningRange", e.target.value || undefined)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">All Innings</option>
                    <option value="early">Early (1-3)</option>
                    <option value="middle">Middle (4-6)</option>
                    <option value="late">Late (7-9)</option>
                    <option value="extras">Extras (10+)</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <select
                    value={filters.side || ""}
                    onChange={(e) => updateFilter("side", e.target.value || undefined)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">All Sides</option>
                    <option value="offense">Offense</option>
                    <option value="defense">Defense</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <select
                    value={filters.result || ""}
                    onChange={(e) => updateFilter("result", e.target.value || undefined)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">All Results</option>
                    <option value="overturned">Overturned</option>
                    <option value="confirmed">Confirmed</option>
                </select>
            </div>

            {hasFilters && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={clearFilters}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 px-4 py-1.5 rounded-xl transition-colors"
                >
                    Clear Filters
                </motion.button>
            )}
        </div>
    );
}
