"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ChartTooltipRowProps = {
    label: string;
    value: string | number;
    color?: string;
    mono?: boolean;
};

export function ChartTooltipRow({ label, value, color, mono = true }: ChartTooltipRowProps) {
    return (
        <div className="flex items-center justify-between gap-6">
            <span className="text-[10px] font-black uppercase text-gray-400">
                {label}
            </span>
            <span
                className={`text-xs font-black ${mono ? "font-mono" : ""} text-gray-900`}
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
    subValueLabel?: string;
    extra?: ChartTooltipRowProps[];
    children?: ReactNode;
    usePortal?: boolean;
    portalProps?: { x: number; y: number };
};

export function ChartTooltip({ title, value, subValueLabel, extra, children, usePortal, portalProps }: ChartTooltipProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const content = (
        <div
            className={`bg-white/95 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl shadow-2xl min-w-[180px] ${usePortal ? 'fixed pointer-events-none z-[100000]' : ''}`}
            style={usePortal && portalProps ? {
                left: portalProps.x,
                top: portalProps.y,
                transform: 'translate(-50%, -120%)'
            } : undefined}
        >
            {title && (
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    {title}
                </p>
            )}

            {(value !== undefined || subValueLabel) && (
                <div className="flex items-end gap-3">
                    {value !== undefined && (
                        <span className="text-3xl font-display text-gray-900 leading-none">
                            {value}
                        </span>
                    )}
                    {subValueLabel && (
                        <span className="text-sm font-bold text-blue-600 mb-1">
                            {subValueLabel}
                        </span>
                    )}
                </div>
            )}

            {extra && extra.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-2">
                    {extra.map((row, i) => (
                        <ChartTooltipRow key={i} {...row} />
                    ))}
                </div>
            )}

            {children && <div className="mt-3 pt-3 border-t border-gray-50">{children}</div>}
        </div>
    );

    if (usePortal && mounted) {
        return createPortal(content, document.body);
    }

    return content;
}
