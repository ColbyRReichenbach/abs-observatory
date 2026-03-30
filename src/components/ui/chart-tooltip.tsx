"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
    const [suppressedPortalKey, setSuppressedPortalKey] = useState<string | null>(null);
    const portalKey =
        usePortal && portalProps ? `${Math.round(portalProps.x)}:${Math.round(portalProps.y)}` : null;
    const suppressed = portalKey !== null && suppressedPortalKey === portalKey;

    useEffect(() => {
        if (!usePortal || !mounted) return;

        const suppress = () => {
            if (portalKey) {
                setSuppressedPortalKey(portalKey);
            }
        };

        window.addEventListener("scroll", suppress, true);
        window.addEventListener("wheel", suppress, { passive: true });
        window.addEventListener("touchmove", suppress, { passive: true });

        return () => {
            window.removeEventListener("scroll", suppress, true);
            window.removeEventListener("wheel", suppress);
            window.removeEventListener("touchmove", suppress);
        };
    }, [mounted, portalKey, usePortal]);

    let portalStyle: React.CSSProperties | undefined;
    if (usePortal && portalProps && typeof window !== "undefined") {
        const margin = 12;
        const gap = 16;
        const estimatedWidth = 260;
        const estimatedHeight = children ? 240 : extra && extra.length > 2 ? 220 : 180;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = portalProps.x - estimatedWidth / 2;
        left = Math.max(margin, Math.min(left, viewportWidth - estimatedWidth - margin));

        const aboveTop = portalProps.y - estimatedHeight - gap;
        const belowTop = portalProps.y + gap;
        const top = aboveTop >= margin
            ? aboveTop
            : Math.min(belowTop, viewportHeight - estimatedHeight - margin);

        portalStyle = {
            left,
            top,
            maxWidth: `min(${estimatedWidth}px, calc(100vw - ${margin * 2}px))`,
        };
    }

    const content = (
        <div
            className={`bg-white/95 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl shadow-2xl min-w-[180px] ${usePortal ? 'fixed pointer-events-none z-[100000]' : ''}`}
            style={portalStyle}
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
        if (suppressed) return null;
        return createPortal(content, document.body);
    }

    return content;
}
