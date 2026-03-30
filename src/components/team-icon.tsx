import { resolveTeamBranding } from "@/lib/team-branding";

type TeamIconProps = {
    teamId: number;
    name: string;
    size?: number;
    className?: string;
    backgroundColor?: string;
    noShadow?: boolean;
    loading?: 'lazy' | 'eager';
    variant?: "default" | "flat";
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
    noShadow = false,
    loading = 'lazy',
    variant = "default",
}: TeamIconProps) {
    // Resolve branding automatically if color is missing
    const branding = resolveTeamBranding({ teamId });
    const bgColor = backgroundColor ?? branding.tokens.teamPrimary;

    // Use high-res SVG path for perfect 4K clarity, utilizing official alternate logos for solid backgrounds
    const logoUrl = `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${teamId}.svg`;
    const isFlat = variant === "flat";

    return (
        <div
            className={`relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-500 ease-out ${isFlat ? "border border-black/5" : "border border-white/10"} ${noShadow ? '' : isFlat ? 'shadow-sm' : 'shadow-xl'} ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: bgColor,
            }}
        >
            {!isFlat ? (
                <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-40 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] pointer-events-none" />
                </>
            ) : null}

            <div className={`relative flex w-full h-full items-center justify-center ${isFlat ? "p-[10%]" : "p-[12%]"}`}>
                <img
                    src={logoUrl}
                    alt={`${name} Logo`}
                    className={`w-full h-full object-contain transition-all duration-500 ${noShadow ? '' : isFlat ? '' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'}`}
                    loading={loading}
                />
            </div>
        </div>
    );
}
