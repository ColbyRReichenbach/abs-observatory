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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-6 gap-y-1">
            <span className="pr-2 text-[10px] font-black uppercase leading-4 tracking-[0.14em] text-gray-400">
                {label}
            </span>
            <span
                className={`text-right text-xs font-black leading-5 tabular-nums ${mono ? "font-mono" : ""} text-gray-900`}
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
    const portalSignature = usePortal ? `${portalProps?.x ?? "na"}:${portalProps?.y ?? "na"}` : null;
    const [dismissedPortalSignature, setDismissedPortalSignature] = useState<string | null>(null);
    const hiddenWhileScrolling = usePortal && dismissedPortalSignature === portalSignature;

    useEffect(() => {
        if (!usePortal || typeof window === "undefined") return;

        const dismiss = () => setDismissedPortalSignature(portalSignature);

        window.addEventListener("scroll", dismiss, true);
        window.addEventListener("wheel", dismiss, { passive: true });
        window.addEventListener("touchmove", dismiss, { passive: true });
        window.addEventListener("resize", dismiss);

        return () => {
            window.removeEventListener("scroll", dismiss, true);
            window.removeEventListener("wheel", dismiss);
            window.removeEventListener("touchmove", dismiss);
            window.removeEventListener("resize", dismiss);
        };
    }, [portalSignature, usePortal]);

    if (usePortal && hiddenWhileScrolling) {
        return null;
    }

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
        return createPortal(content, document.body);
    }

    return content;
}
