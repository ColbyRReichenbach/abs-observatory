import Link from "next/link";

import { RANGE_OPTIONS, buildRangeHref } from "@/lib/range";
import type { RangeKey } from "@/lib/types";

export function RangeSelector({
  basePath,
  range,
  searchParams,
}: {
  basePath: string;
  range: RangeKey;
  searchParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {RANGE_OPTIONS.map((option) => (
        <Link
          key={option.key}
          href={buildRangeHref(basePath, option.key, searchParams)}
          className={`rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-[var(--motion-fast)] ${
            range === option.key
              ? "border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
              : "border-[var(--border-medium)] text-[var(--ink-3)] hover:border-[var(--border-strong)] hover:text-[var(--ink-1)] hover:bg-white/[0.03]"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
