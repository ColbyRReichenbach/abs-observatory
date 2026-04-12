import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import { Suspense } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { ContextualCopilotFAB } from "@/components/contextual-copilot-fab";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { Nav } from "@/components/nav";
import { ViewModeSync } from "@/components/ui/view-mode-sync";
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
  metadataBase: new URL("https://abs-observatory.vercel.app"),
  title: "AiBS | MLB Automated Ball-Strike Analytics",
  description:
    "Live and historical MLB ABS challenge analysis, team and umpire breakdowns, and challenge-era modeling.",
  openGraph: {
    title: "AiBS | MLB Automated Ball-Strike Analytics",
    description:
      "Live and historical MLB ABS challenge analysis, team and umpire breakdowns, and challenge-era modeling.",
    url: "https://abs-observatory.vercel.app",
    siteName: "AiBS",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "AiBS MLB ABS analytics preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AiBS | MLB Automated Ball-Strike Analytics",
    description:
      "Live and historical MLB ABS challenge analysis, team and umpire breakdowns, and challenge-era modeling.",
    images: ["/twitter-image.png"],
    creator: "@aicolby",
    site: "@aicolby",
  },
};

async function getSafeAdminVisibility() {
  try {
    return await canAccessAdmin();
  } catch {
    return false;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  validateServerEnv(false);
  const [initialMode, adminVisible] = await Promise.all([resolveViewMode(), getSafeAdminVisibility()]);

  return (
    <html lang="en">
      <body className={`${bebas.variable} ${inter.variable} ${plexMono.variable}`}>
        <AuthProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Suspense fallback={null}>
            <ViewModeSync />
          </Suspense>
          <Nav initialMode={initialMode} canAccessAdmin={adminVisible} />
          <DataFreshnessBadge />
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
