"use client";

import type { ReactNode } from "react";

type ChartTooltipRowProps = {
    label: string;
    value: string | number;
    color?: string;
    mono?: boolean;
};

export function ChartTooltipRow({ label, value, color, mono = true }: ChartTooltipRowProps) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span
                className="text-[10px] font-normal text-[var(--ink-3)]"
                style={{ letterSpacing: "0.08em" }}
            >
                {label}
            </span>
            <span
                className={`text-[13px] font-semibold text-[var(--ink-1)] ${mono ? "font-mono" : ""}`}
                style={color ? { color } : undefined}
            >
                {value}
            </span>
        </div>
    );
}

type ChartTooltipProps = {
    title?: string;
    value?: string | number;
    label?: string;
    extra?: ChartTooltipRowProps[];
    teamColor?: string;
    children?: ReactNode;
};

/**
 * Shared recharts tooltip content component.
 * Use as: <Tooltip content={<ChartTooltip title="..." value="..." />} />
 *
 * Styling matches the mandatory design spec:
 * - White bg, var(--border-subtle) border, var(--radius-md) radius
 * - Title: --ink-0, 11px, bold, uppercase, tracking-widest
 * - Value: --ink-1, 13px, semibold, mono
 * - Label: --ink-3, 10px
 */
export function ChartTooltip({ title, value, label, extra, teamColor, children }: ChartTooltipProps) {
    return (
        <div
            className="pointer-events-none rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] relative z-[9999]"
            style={{ minWidth: 120 }}
        >
            {title && (
                <p
                    className="mb-1 text-[11px] font-bold uppercase text-[var(--ink-0)]"
                    style={{ letterSpacing: "0.1em" }}
                >
                    {title}
                </p>
            )}

            {value !== undefined && (
                <p
                    className="text-[13px] font-semibold font-mono text-[var(--ink-1)]"
                    style={teamColor ? { color: teamColor } : undefined}
                >
                    {value}
                </p>
            )}

            {label && (
                <p className="mt-0.5 text-[10px] font-normal text-[var(--ink-3)]">
                    {label}
                </p>
            )}

            {extra && extra.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-0.5 border-t border-[var(--border-subtle)] pt-1.5">
                    {extra.map((row, i) => (
                        <ChartTooltipRow key={i} {...row} />
                    ))}
                </div>
            )}

            {children}
        </div>
    );
}
