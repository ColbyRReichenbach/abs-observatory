"use client";

import { motion } from "framer-motion";

export function BaseballSpinner() {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
                className="relative w-16 h-16 bg-white rounded-full shadow-[inset_-4px_-4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.2)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
                {/* Synthetic Red Seams */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-[120%] h-[120%] border-[2px] border-dashed border-red-500 rounded-full opacity-40 rotate-[30deg]" />
                    <div className="absolute w-[120%] h-[120%] border-[2px] border-dashed border-red-500 rounded-full opacity-40 rotate-[-30deg]" />
                </div>
                {/* Stitching effect */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                    <div className="w-full h-[1px] bg-gray-100 opacity-20 rotate-45" />
                    <div className="w-full h-[1px] bg-gray-100 opacity-20 -rotate-45" />
                </div>
            </motion.div>
            <span className="text-xs font-medium tracking-widest uppercase text-ink-3 animate-pulse">
                Polling Data...
            </span>
        </div>
    );
}

export function BatLoader() {
    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative w-24 h-12 flex items-center justify-center">
                {/* The Bat */}
                <motion.div
                    className="absolute w-20 h-2 bg-gradient-to-r from-amber-700 to-amber-900 rounded-full origin-left"
                    animate={{
                        rotate: [-20, 45, -20],
                        scaleX: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                {/* The Ball */}
                <motion.div
                    className="absolute w-4 h-4 bg-white rounded-full shadow-md"
                    animate={{
                        x: [60, -20, 60],
                        y: [-10, 0, -10],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>
            <span className="text-xs font-medium tracking-widest uppercase text-inter-blue animate-pulse">
                Preparing Game
            </span>
        </div>
    );
}
