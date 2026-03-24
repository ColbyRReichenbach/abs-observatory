"use client";

import { memo } from "react";

type ProfileBadgeProps = {
    label: string;
    variant?: "blue" | "emerald" | "amber" | "red" | "gray" | "indigo";
    className?: string;
};

export const ProfileBadge = memo(({ label, variant = "blue", className = "" }: ProfileBadgeProps) => {
    // Split by common delimiters to handle wrapping gracefully
    const words = label.split(/[\s·-]/).filter(Boolean);

    const variants = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
        red: "bg-red-50 text-red-700 border-red-100",
        gray: "bg-gray-50 text-gray-500 border-gray-200",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };

    return (
        <div
            className={`
        inline-flex flex-col items-center justify-center 
        px-3 py-1.5 rounded-xl border leading-[1.1]
        text-[9px] font-black uppercase tracking-widest
        min-w-[100px] text-center transition-all
        ${variants[variant]} ${className}
      `}
        >
            {words.map((word, i) => (
                <span key={i} className="block w-full">
                    {word}
                </span>
            ))}
        </div>
    );
});

ProfileBadge.displayName = "ProfileBadge";
