"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const TEAM_BACKDROPS: Record<number, string> = {
    112: "/backdrops/cubs.png", // Cubs
    147: "/backdrops/yankees.png", // Yankees
    121: "/backdrops/mets.png", // Mets
    111: "/backdrops/redsox.png", // Red Sox
    119: "/backdrops/dodgers.png", // Dodgers
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
