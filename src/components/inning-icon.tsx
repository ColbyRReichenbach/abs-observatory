"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

type InningIconProps = {
    inning: number | string | null;
    half: "Top" | "Bottom" | "top" | "bottom" | string | null;
    className?: string;
};

export function InningIcon({ inning, half, className = "" }: InningIconProps) {
    if (inning === null || inning === undefined) return null;
    const isTop = half?.toLowerCase() === "top";
    return (
        <div className={`flex flex-col items-center leading-none ${className}`}>
            {isTop ? (
                <ChevronUp size={10} className="text-blue-600 mb-[-2px]" strokeWidth={3} />
            ) : (
                <div className="h-2.5" />
            )}
            <span className="text-[11px] font-black font-mono">{inning}</span>
            {!isTop ? (
                <ChevronDown size={10} className="text-blue-600 mt-[-2px]" strokeWidth={3} />
            ) : (
                <div className="h-2.5" />
            )}
        </div>
    );
}
