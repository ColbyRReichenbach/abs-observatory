export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <div className="p-6 text-sm text-[var(--ink-2)]">Public profile for {username} is temporarily unavailable.</div>;
}
