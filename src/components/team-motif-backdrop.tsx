"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const TEAM_BACKDROPS: Record<number, string> = {
    110: "/backdrops/orioles_v2.png",   // Orioles
    111: "/backdrops/redsox_v2.png",    // Red Sox
    112: "/backdrops/cubs_v2.png",      // Cubs
    113: "/backdrops/reds_v2.png",      // Reds
    114: "/backdrops/guardians_v2.png", // Guardians
    115: "/backdrops/rockies_v2.png",   // Rockies
    117: "/backdrops/astros_v2.png",    // Astros
    118: "/backdrops/royals_v2.png",    // Royals
    119: "/backdrops/dodgers_v2.png",   // Dodgers
    120: "/backdrops/nationals_v2.png", // Nationals
    121: "/backdrops/mets_v2.png",      // Mets
    147: "/backdrops/yankees_v2.png",   // Yankees
    141: "/backdrops/bluejays_v2.png",  // Blue Jays
    139: "/backdrops/rays_v2.png",      // Rays
    116: "/backdrops/tigers_v2.png",    // Tigers
    142: "/backdrops/twins_v2.png",     // Twins
    145: "/backdrops/whitesox_v2.png",  // White Sox
    108: "/backdrops/angels_v2.png",    // Angels
    133: "/backdrops/athletics_v2.png", // Athletics
    136: "/backdrops/mariners_v2.png",  // Mariners
    140: "/backdrops/rangers_v2.png",   // Rangers
    144: "/backdrops/braves_v2.png",    // Braves
    143: "/backdrops/phillies_v2.png",  // Phillies
    146: "/backdrops/marlins_v2.png",   // Marlins
    134: "/backdrops/pirates_v2.png",   // Pirates
    138: "/backdrops/cardinals_v2.png", // Cardinals
    158: "/backdrops/brewers_v2.png",   // Brewers
    135: "/backdrops/padres_v2.png",    // Padres
    137: "/backdrops/giants_v2.png",    // Giants
    109: "/backdrops/dbacks_v2.png",    // D-backs
};

export function TeamMotifBackdrop({
    teamId
}: {
    teamId: number
}) {
    const backdropUrl = TEAM_BACKDROPS[teamId];

    if (!backdropUrl) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 -z-30 pointer-events-none overflow-hidden"
        >
            <Image
                src={backdropUrl}
                alt="Team Backdrop"
                fill
                className="object-cover object-center"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/90" />
            <div className="absolute inset-0 backdrop-blur-sm opacity-20" />
        </motion.div>
    );
}
