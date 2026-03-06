import type { CSSProperties } from "react";

import { resolveTeamBranding } from "@/lib/team-branding";

type TeamIconProps = {
    teamId: number;
    name: string;
    size?: number;
    className?: string;
    backgroundColor?: string;
};

/**
 * High-resolution, crisp team icon component designed for high contrast and "4K" clarity.
 * Renderes logo using MLB standard SVGs on a dynamic team-color circular badge backdrop.
 */
export function TeamIcon({
    teamId,
    name,
    size = 32,
    className = "",
    backgroundColor,
}: TeamIconProps) {
    // Resolve branding automatically if color is missing
    const branding = resolveTeamBranding({ teamId });
    const bgColor = backgroundColor ?? branding.tokens.teamPrimary;

    // Use high-res SVG path for perfect 4K clarity, utilizing official alternate logos for solid backgrounds
    const logoUrl = `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg`;

    return (
        <div
            className={`relative flex items-center justify-center rounded-full overflow-hidden shadow-xl transition-all duration-500 ease-out border border-white/10 ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: bgColor,
            }}
        >
            {/* Subtle depth gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-40 pointer-events-none" />

            {/* Inner glow to ensure dark parts of logo contrast with dark backgrounds */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative flex w-full h-full items-center justify-center p-[12%]">
                <img
                    src={logoUrl}
                    alt={`${name} Logo`}
                    className="w-full h-full object-contain transition-all duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
