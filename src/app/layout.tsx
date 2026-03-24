import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import { Suspense } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { ContextualCopilotFAB } from "@/components/contextual-copilot-fab";
import { Nav } from "@/components/nav";
import { launchConfig } from "@/lib/launch-config";
import { canAccessAdmin } from "@/lib/server/admin";
import { validateServerEnv } from "@/lib/server/env";
import { resolveViewMode } from "@/lib/view-mode";

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  validateServerEnv(false);
  const [initialMode, adminVisible] = await Promise.all([resolveViewMode(), canAccessAdmin()]);

  return (
    <html lang="en">
      <body className={`${bebas.variable} ${inter.variable} ${plexMono.variable}`}>
        <AuthProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Nav initialMode={initialMode} canAccessAdmin={adminVisible} />
          <main id="main-content">
            {children}
          </main>
          {launchConfig.publicCopilotEnabled ? (
            <Suspense fallback={null}>
              <ContextualCopilotFAB />
            </Suspense>
          ) : null}
        </AuthProvider>
      </body>
    </html>
  );
}
