import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import { Suspense } from "react";

import { ContextualCopilotFAB } from "@/components/contextual-copilot-fab";
import { Nav } from "@/components/nav";

import "./globals.css";

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});


export const metadata: Metadata = {
  title: "AiBS | MLB Automated Ball-Strike Analytics",
  description: "High-fidelity live and historical MLB ABS challenge monitoring",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${inter.variable} ${plexMono.variable}`}>
        <Nav />
        <main>
          {children}
        </main>
        <Suspense fallback={null}>
          <ContextualCopilotFAB />
        </Suspense>
      </body>
    </html>
  );
}

