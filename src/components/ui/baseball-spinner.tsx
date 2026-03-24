"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function BaseballSpinner() {
    const [activeBase, setActiveBase] = useState(-1);

    // Sequence: Wait at home (-1), Home (0) -> 1st (1) -> 2nd (2) -> 3rd (3) -> Wait
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveBase((prev) => (prev + 1) % 5);
        }, 500); // Speed of the baserunning animation
        return () => clearInterval(interval);
    }, []);

    // Coordinates mapping to the photorealistic image's bases
    // (Needs to be relatively positioned over the image)
    const BASES = [
        { id: 0, top: "75%", left: "50%", label: "Home" },
        { id: 1, top: "54%", left: "71.5%", label: "1st" },
        { id: 2, top: "43%", left: "50%", label: "2nd" },
        { id: 3, top: "54%", left: "28.5%", label: "3rd" }
    ];

    return (
        <div className="flex flex-col items-center justify-center py-8 gap-6">
            {/* Baseball Diamond Image Overlay container */}
            <div className="relative h-28 w-28 rounded-full overflow-hidden shadow-xl border border-white/20">
                {/* Background Image */}
                <Image
                    src="/realistic_baseball_field_1772757322636.png"
                    alt="Baseball Diamond"
                    fill
                    className="object-cover object-center"
                    sizes="112px"
                    priority
                />

                {/* Base Glow Overlays */}
                {BASES.map((base) => {
                    const isActive = activeBase === base.id;
                    return (
                        <div
                            key={base.id}
                            className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
                            style={{ top: base.top, left: base.left, opacity: isActive ? 1 : 0 }}
                        >
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-yellow-400 blur-md rounded-full scale-[2.5]" />
                            {/* Glowing Base Core */}
                            <div className="relative w-2 h-2 bg-yellow-200 border border-yellow-100 rounded-[2px] shadow-[0_0_15px_rgba(250,204,21,1)] rotate-45" />
                        </div>
                    );
                })}

                {/* Slight Vignette for contrast */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/30 mix-blend-multiply" />
            </div>

            {/* Animated Text */}
            <div className="h-8 relative w-full flex justify-center mt-2">
                <AnimatePresence mode="popLayout">
                    <motion.p
                        key="rounding"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eab308] absolute flex items-center gap-1 drop-shadow-sm whitespace-nowrap"
                    >
                        Rounding the Bases
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        >
                            ...
                        </motion.span>
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}
