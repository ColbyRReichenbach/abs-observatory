import { redirect } from "next/navigation";

import { LoginEntryPanel } from "@/components/auth/login-entry-panel";
import { isClerkConfigured } from "@/lib/server/auth";
import { getViewerProfile } from "@/lib/server/profiles";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewerProfile();
  const nextHref = sp.next && sp.next.startsWith("/") ? sp.next : "/profile";

  if (viewer) {
    redirect(nextHref);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <LoginEntryPanel authEnabled={isClerkConfigured()} nextHref={nextHref} mode="login_page" />
    </main>
  );
}
