"use client";

import { useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

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

export function UmpireDistributionHistogram({ data, onBucketClick }: Props) {
    const buckets = useMemo(() => bucketize(data), [data]);
    const avgRate = useMemo(() => {
        if (data.length === 0) return 0;
        return data.reduce((s, u) => s + u.overturnRate, 0) / data.length;
    }, [data]);

    const [activeBucket, setActiveBucket] = useState<number | null>(null);

    if (data.length === 0) return null;

    // Find which bucket index the avg falls in
    const avgBucketIdx = Math.min(Math.floor((avgRate * 100) / BUCKET_SIZE), buckets.length - 1);

    return (
        <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03] p-6 mb-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                    Accuracy Distribution
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Umpire <span className="text-gray-400 italic">Overturn Rates</span>
                </p>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} margin={{ top: 25, right: 10, bottom: 40, left: 0 }}>
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
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload as UmpireBucket;
                                    return (
                                        <ChartTooltip
                                            title={d.rangeLabel}
                                            value={`${d.count} umpire${d.count !== 1 ? "s" : ""}`}
                                            label={d.umpireNames.slice(0, 3).join(", ") + (d.umpireNames.length > 3 ? "…" : "")}
                                        />
                                    );
                                }
                                return null;
                            }}
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
                </ResponsiveContainer>
            </div>
        </div>
    );
}
