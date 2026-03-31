import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import { Suspense } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { ContextualCopilotFAB } from "@/components/contextual-copilot-fab";
import { Nav } from "@/components/nav";
import { ViewModeSync } from "@/components/ui/view-mode-sync";
import { launchConfig } from "@/lib/launch-config";
import { getAuthIdentity } from "@/lib/server/auth";
import { validateServerEnv } from "@/lib/server/env";
import { getViewerProfileFromIdentity } from "@/lib/server/profiles";
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
  const [initialMode, identity] = await Promise.all([
    resolveViewMode(),
    getAuthIdentity(),
  ]);
  let viewer = null;
  if (identity) {
    try {
      viewer = await getViewerProfileFromIdentity(identity);
    } catch {
      viewer = null;
    }
  }
  const adminVisible = Boolean(viewer?.isVerified && viewer.roles.includes("admin"));
  const privateAiVisible = Boolean(viewer?.isVerified && (viewer.aiAccessEnabled || viewer.roles.includes("admin")));

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
          <Nav
            initialMode={initialMode}
            canAccessAdmin={adminVisible}
            isSignedIn={Boolean(identity)}
            profileLabel={viewer?.displayName ?? viewer?.username ?? viewer?.primaryEmail ?? identity?.displayName ?? identity?.email ?? null}
          />
          <main id="main-content">
            {children}
          </main>
          {launchConfig.publicCopilotEnabled || privateAiVisible ? (
            <Suspense fallback={null}>
              <ContextualCopilotFAB />
            </Suspense>
          ) : null}
        </AuthProvider>
      </body>
    </html>
  );
}
