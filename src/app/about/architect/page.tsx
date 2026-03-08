import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function ArchitectPage() {
    return (
        <div className="min-h-screen bg-[#fcf9f2] text-[#2c2c2c] selection:bg-[#d4b483] selection:text-white pt-36 pb-32">
            <div className="max-w-4xl mx-auto px-6">
                <Link href="/about" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#8b0000] hover:text-black transition-colors mb-12">
                    <ArrowLeft size={16} />
                    Back to About
                </Link>

                <header className="border-b-4 border-double border-[#2c2c2c] pb-8 mb-12">
                    <span className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Profile</span>
                    <h1 className="text-6xl md:text-8xl font-display uppercase tracking-tighter leading-none mb-4">
                        The <span className="text-blue-900 italic">Architect</span>
                    </h1>
                </header>

                <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">
                    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border-8 border-white p-2 bg-[#f4e4bc] rotate-[-2deg]">
                        <Image
                            src="/images/about/architect.png"
                            alt="The Architect"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="prose prose-lg font-serif italic text-gray-800">
                        <p className="text-xl leading-relaxed mb-6">
                            <span className="text-5xl float-left mr-3 mt-1 font-display not-italic text-black">D</span>esigning the future of baseball analytics requires more than just charting data; it demands an intuitive, fan-first approach to complex information architecture. The Architect bridges the gap between raw algorithmic output and digestible insights.
                        </p>
                        <p className="text-xl leading-relaxed">
                            By constructing responsive, dynamic interfaces, The Architect ensures that front-office executives and casual fans alike can parse challenge data in real-time. The emphasis is on frictionless navigation, clear visual hierarchies, and a stunning aesthetic that respects the rich history of the game while pushing it into the modern era.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
