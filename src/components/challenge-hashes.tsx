type ChallengeOutcome = 'won' | 'lost' | null;

type ChallengeHashesProps = {
  remaining: number;
  capacity?: number;
  activeColor?: string;
  /** Per-slot outcome. Index matches slot order (0 = first slot). */
  outcomes?: ChallengeOutcome[];
};

export function getChallengeHashSlots(remaining: number, capacity = 2): boolean[] {
  const safeCapacity = Math.max(1, Math.floor(capacity));
  const clampedRemaining = Math.max(0, Math.min(safeCapacity, Number.isFinite(remaining) ? Math.floor(remaining) : 0));
  return Array.from({ length: safeCapacity }, (_, idx) => idx < clampedRemaining);
}

export function getChallengeHashClass(active: boolean, activeColor?: string, outcome?: ChallengeOutcome) {
  const base = "inline-flex items-center justify-center h-2.5 w-2.5 rounded-[2px] border transition-all duration-[var(--motion-fast)] motion-reduce:animate-none motion-reduce:transition-none";

  // Won state: green square with ✓
  if (outcome === 'won') {
    return {
      className: `${base} border-[var(--state-overturned-bs)] bg-[var(--state-overturned-bs)]`,
      style: undefined,
      outcome: 'won' as const,
    };
  }

  // Lost state: gray square with ✕
  if (outcome === 'lost') {
    return {
      className: `${base} border-[var(--ink-3)] bg-[var(--ink-3)]`,
      style: undefined,
      outcome: 'lost' as const,
    };
  }

  // Default: active (amber/gold) or inactive (empty outline)
  const colorStyle = activeColor
    ? { borderColor: activeColor, backgroundColor: activeColor, boxShadow: `0 0 6px ${activeColor}66` }
    : undefined;
  if (active) {
    return {
      className: `${base} animate-pop-in border-[var(--accent-warm)] bg-[var(--accent-warm)] shadow-[0_0_6px_rgba(201,168,76,0.4)]`,
      style: colorStyle,
      outcome: null,
    };
  }
  return {
    className: `${base} border-[var(--border-strong)] bg-transparent`,
    style: undefined,
    outcome: null,
  };
}

export function ChallengeHashes({ remaining, capacity = 2, activeColor, outcomes }: ChallengeHashesProps) {
  const slots = getChallengeHashSlots(remaining, capacity);
  const remainingCount = slots.filter(Boolean).length;
  return (
    <div className="inline-flex items-center gap-1">
      <span className="sr-only">{`Challenges remaining: ${remainingCount}`}</span>
      {slots.map((active, idx) => {
        const outcome = outcomes?.[idx] ?? null;
        const presentation = getChallengeHashClass(active, activeColor, outcome);
        return (
          <span
            key={`abs-hash-${idx}`}
            className={presentation.className}
            style={presentation.style}
            data-active={active ? "1" : "0"}
            data-outcome={outcome ?? "none"}
          >
            {outcome === 'won' && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {outcome === 'lost' && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
