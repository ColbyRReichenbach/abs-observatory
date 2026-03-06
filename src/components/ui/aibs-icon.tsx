"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface AiBSIconProps {
    size?: number;
    className?: string;
    color?: string;
    showTextOnHover?: boolean;
    forceHover?: boolean;
}

export function AiBSIcon({
    size = 24,
    className = "",
    color = "currentColor",
    showTextOnHover = false,
    forceHover = false,
}: AiBSIconProps) {
    const [internalHover, setInternalHover] = useState(false);
    const isHovered = forceHover || internalHover;

    return (
        <div
            className={`relative flex items-center group cursor-pointer ${className}`}
            onMouseEnter={() => setInternalHover(true)}
            onMouseLeave={() => setInternalHover(false)}
        >
            <div
                className="relative z-10 flex items-center justify-center transition-transform"
                style={{ width: size, height: size }}
            >
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Shift the entire drawing to visually perfectly center it within the circle since it lacks a right arm */}
                    <g transform="translate(1.5, 2)">
                        {/* Head / Visor */}
                        <rect x="7" y="5" width="10" height="8" rx="2" />
                        <line x1="12" y1="2" x2="12" y2="5" />
                        <circle cx="12" cy="2" r="1" fill={color} />

                        {/* Futuristic Robot Eyes (Glowing visor look) */}
                        <motion.line
                            x1="9" y1="9" x2="15" y2="9"
                            strokeWidth="3"
                            stroke="#3b82f6" // Always glowing blue
                            animate={{ opacity: isHovered ? [1, 0.5, 1] : 1 }}
                            transition={{ repeat: isHovered ? Infinity : 0, duration: 0.5 }}
                        />

                        {/* Body */}
                        <path d="M9 13v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4" />

                        {/* Windup Arm -> Throwing Follow-through */}
                        <motion.path
                            d="M 7 13 L 2 13 L 2 8"  // Windup Position (L arm raised)
                            animate={{
                                d: isHovered
                                    ? "M 7 13 L 2 15 L 6 19" // Follow-through position
                                    : "M 7 13 L 2 13 L 2 8"  // Windup position
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />

                        {/* Baseball */}
                        <motion.circle
                            r="1.5"
                            fill="currentColor"
                            stroke="none"
                            initial={{ cx: 2, cy: 8, opacity: 1 }}
                            animate={isHovered ? {
                                cx: [2, 12, 22],
                                cy: [8, 12, 15],
                                opacity: [1, 1, 0],
                            } : {
                                cx: 2,
                                cy: 8,
                                opacity: 1
                            }}
                            transition={{
                                duration: 0.4,
                                times: [0, 0.5, 1],
                                ease: "easeOut"
                            }}
                        />
                    </g>
                </svg>
            </div>

            {/* Removed standalone tooltip to support expanding inline buttons instead */}
        </div>
    );
}

export function ExpandableAiBSButton({
    size = 24,
    color = "currentColor",
    bgColor = "bg-blue-600",
    textColor = "text-white",
    direction = "right",
    className = "",
    onClick = undefined
}: {
    size?: number;
    color?: string;
    bgColor?: string;
    textColor?: string;
    direction?: "left" | "right";
    className?: string;
    onClick?: () => void;
}) {
    const [isHovered, setIsHovered] = useState(false);

    const baseWidth = size + 16;
    const expandedWidth = baseWidth + 70;

    return (
        <motion.button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) onClick();
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center rounded-full ${bgColor} ${textColor} shadow-md overflow-hidden whitespace-nowrap shrink-0 ${direction === 'left' ? 'flex-row-reverse' : 'flex-row'} ${className}`}
            style={{ originX: direction === 'left' ? 1 : 0 }}
            animate={{
                width: isHovered ? expandedWidth : baseWidth,
                paddingLeft: isHovered ? 12 : 8,
                paddingRight: isHovered ? 12 : 8,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <div className="shrink-0 flex items-center justify-center pointer-events-none">
                <AiBSIcon size={size} forceHover={isHovered} showTextOnHover={false} color={color} />
            </div>

            <AnimatePresence>
                {isHovered && (
                    <motion.span
                        key="text"
                        className={`text-[9.5px] font-black uppercase tracking-widest pointer-events-none ${direction === 'left' ? 'pr-2' : 'pl-2'}`}
                        initial={{ opacity: 0, x: direction === 'left' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction === 'left' ? 10 : -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        Ask aiBS
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
