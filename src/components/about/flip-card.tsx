"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type FlipCardProps = {
    title: string;
    subtitle: string;
    imageSrc: string;
    imageAlt: string;
    subtitleColor: string;
    linkHref: string;
    stats: { label: string; value: string }[];
    description: string;
    rotateDegree: number;
};

export function FlipCard({
    title,
    subtitle,
    imageSrc,
    imageAlt,
    subtitleColor,
    linkHref,
    stats,
    description,
    rotateDegree
}: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="relative group w-64 h-80 [perspective:1000px] cursor-pointer"
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className="absolute inset-0 bg-black/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <motion.div
                initial={false}
                animate={{
                    rotateY: isFlipped ? 180 : 0,
                    rotateZ: isFlipped ? 0 : rotateDegree,
                    y: isFlipped ? -10 : 0,
                    scale: isFlipped ? 1.05 : 1
                }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="w-full h-full relative [transform-style:preserve-3d]"
            >
                {/* Front Side */}
                <div className="absolute inset-0 [backface-visibility:hidden]">
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between shadow-black/20 border-8 border-white p-2 bg-[#f4e4bc]">
                        <div className="relative w-full h-[65%] rounded-xl overflow-hidden">
                            <Image
                                src={imageSrc}
                                alt={imageAlt}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="mt-4 text-center pb-2">
                            <h4 className="font-display text-2xl uppercase tracking-tighter leading-none">{title}</h4>
                            <p className={`text-[10px] uppercase font-bold mt-1 ${subtitleColor}`}>{subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border-8 border-white p-5 bg-[#f4e4bc] flex flex-col">
                        <div className="text-center mb-4 border-b border-black/10 pb-2 shrink-0">
                            <h4 className="font-display text-2xl uppercase tracking-tighter leading-none">{title}</h4>
                            <p className="text-[9px] uppercase font-black text-black/50 mt-1">{subtitle}</p>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                                {stats.map((stat, i) => (
                                    <div key={i} className="bg-white/50 p-1.5 rounded-sm border border-black/5 text-center">
                                        <div className="text-[7px] font-black uppercase text-gray-500">{stat.label}</div>
                                        <div className="text-[10px] font-mono font-bold text-gray-900">{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] font-serif italic leading-snug text-black/80 line-clamp-4">
                                &ldquo;{description}&rdquo;
                            </p>
                        </div>

                        <div className="pt-3 shrink-0">
                            <Link
                                href={linkHref}
                                className="w-full bg-[#8b0000] text-[#fcf9f2] py-2 px-4 rounded-lg flex items-center justify-between text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Read Profile
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
