import { redirect } from "next/navigation";

import { LoginEntryPanel } from "@/components/auth/login-entry-panel";
import { normalizeAuthNextHref } from "@/lib/auth-entry";
import { isClerkConfigured } from "@/lib/server/auth";
import { getViewerProfile } from "@/lib/server/profiles";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewerProfile();
  const viewMode = await resolveViewMode(sp);
  const nextHref = withViewModeHref(normalizeAuthNextHref(sp.next), viewMode);
  const authEnabled = isClerkConfigured();

  if (viewer) {
    redirect(nextHref);
  }

  if (authEnabled) {
    redirect(`/sign-in?next=${encodeURIComponent(nextHref)}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <LoginEntryPanel authEnabled={authEnabled} nextHref={nextHref} mode="login_page" />
    </main>
  );
}
