"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { AIFeedback } from "@/components/ai-feedback";
import { AiBSIcon, ExpandableAiBSButton } from "@/components/ui/aibs-icon";
import { useAiArtifactGeneration } from "@/lib/use-ai-artifact";

export function AIInsightBubble({
    insight,
    title = "AI Insight",
    insightId,
    metadata,
}: {
    insight: string;
    title?: string;
    insightId: string;
    metadata?: Record<string, unknown>;
}) {
    const generationId = useAiArtifactGeneration({
        surfaceKey: "chart_insight",
        surfaceDetail: "insight_bubble",
        targetType: "chart_insight",
        targetId: insightId,
        metadata: metadata ?? null,
    });
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [anchorRect, setAnchorRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    );

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.body.style.overflow = '';
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [isOpen]);

    const handleOpen = () => {
        if (!isOpen && bubbleRef.current) {
            const anchor = bubbleRef.current.closest('.panel') || bubbleRef.current;
            const rect = anchor.getBoundingClientRect();

            const scrollY = window.scrollY;
            setAnchorRect({
                x: rect.left,
                y: rect.top,
                w: rect.width,
                h: rect.height
            });

            let topPos = rect.top + scrollY;
            let leftPos = rect.right + 24 + scrollX; // pop right by default

            // If right space is too small, check left
            if (window.innerWidth - rect.right < 360 && rect.left > 360) {
                leftPos = rect.left - 344 + scrollX;
            }
            // If neither left nor right has enough width, pop above or below
            else if (window.innerWidth - rect.right < 360) {
                leftPos = Math.max(20, rect.left + rect.width / 2 - 160) + scrollX;
                if (window.innerHeight - rect.bottom > 250) {
                    topPos = rect.bottom + 20 + scrollY;
                } else {
                    topPos = Math.max(20, rect.top - 250) + scrollY;
                }
            }

            setPosition({ top: topPos, left: leftPos });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative inline-flex items-center justify-center ml-3 align-middle -translate-y-[2px]" ref={bubbleRef}>
            {/* The Trigger Bubble */}
            <motion.button
                onClick={handleOpen}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className={`h-8 rounded-full bg-black shadow-lg flex items-center justify-center text-white focus:outline-none z-20 shrink-0 overflow-hidden whitespace-nowrap ${isOpen ? 'ring-4 ring-black/10' : ''}`}
                whileTap={{ scale: 0.95 }}
                style={{ originX: 0 }} // Expand rightwards
                animate={{
                    width: (isHovered && !isOpen) ? 102 : 32,
                    paddingLeft: (isHovered && !isOpen) ? 12 : 0,
                    paddingRight: (isHovered && !isOpen) ? 12 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <div className="shrink-0 flex items-center justify-center pointer-events-none w-8 h-8">
                    {isOpen ? <X size={14} strokeWidth={3} /> : <AiBSIcon size={14} color="#ffffff" forceHover={isHovered} />}
                </div>

                <AnimatePresence>
                    {(isHovered && !isOpen) && (
                        <motion.span
                            key="text"
                            className="text-[9.5px] font-black uppercase tracking-widest pointer-events-none pl-1 pr-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            Ask aiBS
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="pointer-events-auto z-[9999]" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[100]"
                                style={{
                                    maskImage: anchorRect ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cmask id='hole'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Crect x='${anchorRect.x - 2}' y='${anchorRect.y - 2}' width='${anchorRect.w + 4}' height='${anchorRect.h + 4}' rx='24' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='black' mask='url(%23hole)'/%3E%3C/svg%3E")` : 'none',
                                    WebkitMaskImage: anchorRect ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cmask id='hole'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Crect x='${anchorRect.x - 2}' y='${anchorRect.y - 2}' width='${anchorRect.w + 4}' height='${anchorRect.h + 4}' rx='24' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='black' mask='url(%23hole)'/%3E%3C/svg%3E")` : 'none',
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute w-80 bg-white border border-gray-100 shadow-2xl rounded-[2rem] p-8 z-[101] overflow-hidden"
                                style={{ top: position.top, left: position.left }}
                            >
                                {/* background decorative element */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600" />

                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <ExpandableAiBSButton
                                            size={14}
                                            color="currentColor"
                                            bgColor="bg-blue-50"
                                            textColor="text-blue-600"
                                            direction="right"
                                            className="h-8 shadow-sm"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</span>
                                    </div>
                                    <motion.button
                                        onClick={() => setIsOpen(false)}
                                        whileTap={{ scale: 0.9 }}
                                        className="text-gray-400 hover:text-black transition-colors"
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>

                                <div className="text-sm font-medium text-gray-700 leading-relaxed text-balance">
                                    <p>{insight}</p>
                                </div>

                                <AIFeedback
                                    surface="chart_insight"
                                    targetType="chart_insight"
                                    targetId={insightId}
                                    generationId={generationId}
                                    metadata={metadata}
                                    prompt="Insight quality"
                                    className="mt-6"
                                />

                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    className="mt-8 flex items-center gap-2 group/btn cursor-pointer"
                                    onClick={() => {
                                        setIsOpen(false);
                                        window.dispatchEvent(
                                            new CustomEvent("open-copilot", {
                                                detail: { prefill: insight },
                                            }),
                                        );
                                    }}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 transition-all group-hover/btn:mr-2">
                                        Ask Follow Up
                                    </span>
                                    <ChevronRight size={12} className="text-blue-600" />
                                </motion.div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
