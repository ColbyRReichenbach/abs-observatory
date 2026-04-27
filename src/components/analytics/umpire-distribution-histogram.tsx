"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Cell,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { ClientOnly } from "@/components/ui/client-only";

type UmpireBucket = {
    rangeLabel: string;
    rangeMin: number;
    rangeMax: number;
    count: number;
    umpireNames: string[];
};

type Props = {
    data: Array<{ umpireName: string; overturnRate: number }>;
    onBucketClick?: (rangeMin: number, rangeMax: number) => void;
};

const BUCKET_SIZE = 10; // 10% increments
const FEATURED_UMPIRE_LIMIT = 4;

type UmpireDistributionTooltipProps = TooltipContentProps<number, string>;

function bucketize(data: Props["data"]): UmpireBucket[] {
    const buckets: UmpireBucket[] = [];
    for (let i = 0; i <= 90; i += BUCKET_SIZE) {
        buckets.push({
            rangeLabel: `${i}–${i + BUCKET_SIZE}%`,
            rangeMin: i / 100,
            rangeMax: (i + BUCKET_SIZE) / 100,
            count: 0,
            umpireNames: [],
        });
    }
    data.forEach((u) => {
        const pct = u.overturnRate * 100;
        const idx = Math.min(Math.floor(pct / BUCKET_SIZE), buckets.length - 1);
        buckets[idx].count++;
        buckets[idx].umpireNames.push(u.umpireName);
    });
    return buckets;
}

function UmpireDistributionTooltip({ active, payload, coordinate }: UmpireDistributionTooltipProps) {
    if (!active || !payload?.length || !coordinate) return null;

    const bucket = payload[0]?.payload as UmpireBucket | undefined;
    if (!bucket) return null;

    const featuredUmpires = bucket.umpireNames.slice(0, FEATURED_UMPIRE_LIMIT);
    const remainingUmpires = Math.max(0, bucket.umpireNames.length - featuredUmpires.length);

    return (
        <div
            className="transition-transform duration-200 ease-out"
            style={{
                transform: "translateX(-50%) translateY(-100%) translateY(-16px)",
                pointerEvents: "none",
            }}
        >
            <ChartTooltip
                title={bucket.rangeLabel}
                value={bucket.count}
                subValueLabel={`Umpire${bucket.count !== 1 ? "s" : ""}`}
            >
                <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-black uppercase leading-4 tracking-[0.14em] text-gray-400">
                        Featured Umpires
                    </p>
                    <div className="flex min-w-0 flex-col gap-1.5">
                        {featuredUmpires.map((name) => (
                            <p key={name} className="break-words text-xs font-black leading-4 text-gray-900">
                                {name}
                            </p>
                        ))}
                        {remainingUmpires > 0 ? (
                            <p className="pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                                +{remainingUmpires} more
                            </p>
                        ) : null}
                    </div>
                </div>
            </ChartTooltip>
        </div>
    );
}

export function UmpireDistributionHistogram({ data, onBucketClick }: Props) {
    const buckets = useMemo(() => bucketize(data), [data]);
    const avgRate = useMemo(() => {
        if (data.length === 0) return 0;
        return data.reduce((s, u) => s + u.overturnRate, 0) / data.length;
    }, [data]);

    const [activeBucket, setActiveBucket] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const measure = () => setContainerWidth(containerRef.current?.clientWidth ?? 0);
        measure();
        const observer = new ResizeObserver(() => measure());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    if (data.length === 0) return null;

    // Find which bucket index the avg falls in
    const avgBucketIdx = Math.min(Math.floor((avgRate * 100) / BUCKET_SIZE), buckets.length - 1);

    return (
        <div className="panel overflow-visible border-gray-100 bg-white shadow-2xl shadow-black/[0.03] p-6 mb-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                    Accuracy Distribution
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Umpire <span className="text-gray-400 italic">Overturn Rates</span>
                </p>
            </div>

            <div ref={containerRef} className="h-[250px] w-full min-h-[250px]">
                <ClientOnly fallback={<div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />}>
                    {containerWidth > 0 ? (
                        <BarChart width={containerWidth} height={250} data={buckets} margin={{ top: 25, right: 10, bottom: 40, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                dataKey="rangeLabel"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 9, fill: "#86868b", fontWeight: 700, dy: 10, dx: -5 }}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#86868b" }}
                                allowDecimals={false}
                            />
                            <ReferenceLine
                                x={buckets[avgBucketIdx]?.rangeLabel}
                                stroke="rgba(0,0,0,0.5)"
                                strokeDasharray="4 4"
                                label={{
                                    value: `Umpire Avg ${(avgRate * 100).toFixed(1)}%`,
                                    position: "top",
                                    style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
                                }}
                            />
                            <Tooltip
                                wrapperStyle={{ pointerEvents: "none" }}
                                allowEscapeViewBox={{ x: true, y: true }}
                                content={(props) => <UmpireDistributionTooltip {...(props as UmpireDistributionTooltipProps)} />}
                                cursor={{ fill: "rgba(0,0,0,0.02)" }}
                            />
                            <Bar
                                dataKey="count"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                                animationDuration={800}
                                animationEasing="ease-out"
                                onClick={(entry) => {
                                    const bucket = entry as unknown as UmpireBucket;
                                    if (onBucketClick) {
                                        onBucketClick(bucket.rangeMin, bucket.rangeMax);
                                    }
                                }}
                                style={{ cursor: onBucketClick ? "pointer" : "default" }}
                            >
                                {buckets.map((b, i) => (
                                    <Cell
                                        key={i}
                                        fill={i === activeBucket ? "#0066cc" : "#0066cc80"}
                                        onMouseEnter={() => setActiveBucket(i)}
                                        onMouseLeave={() => setActiveBucket(null)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />
                    )}
                </ClientOnly>
            </div>
        </div>
    );
}
