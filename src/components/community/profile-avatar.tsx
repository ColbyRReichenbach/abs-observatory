import Image from "next/image";

function getFallbackInitial(input: { displayName?: string | null; username?: string | null; email?: string | null }) {
  const seed = input.displayName ?? input.username ?? input.email ?? "A";
  return seed.trim().charAt(0).toUpperCase() || "A";
}

export function ProfileAvatar({
  avatarUrl,
  displayName,
  username,
  email,
  size = 72,
  className = "",
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}) {
  const fallback = getFallbackInitial({ displayName, username, email });

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-black/10 bg-[var(--surface-infield)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black text-white">
          <span
            className="font-display uppercase tracking-tight"
            style={{ fontSize: Math.max(18, Math.round(size * 0.42)) }}
          >
            {fallback}
          </span>
        </div>
      )}
    </div>
  );
}
