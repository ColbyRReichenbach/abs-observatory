type ChallengeHashesProps = {
  remaining: number;
  capacity?: number;
  activeColor?: string;
};

export function getChallengeHashSlots(remaining: number, capacity = 2): boolean[] {
  const safeCapacity = Math.max(1, Math.floor(capacity));
  const clampedRemaining = Math.max(0, Math.min(safeCapacity, Number.isFinite(remaining) ? Math.floor(remaining) : 0));
  return Array.from({ length: safeCapacity }, (_, idx) => idx < clampedRemaining);
}

export function getChallengeHashClass(active: boolean, activeColor?: string) {
  const base = "inline-block h-2.5 w-2.5 rounded-[2px] border transition-all duration-[var(--motion-fast)] motion-reduce:animate-none motion-reduce:transition-none";
  const colorStyle = activeColor
    ? { borderColor: activeColor, backgroundColor: activeColor, boxShadow: `0 0 6px ${activeColor}66` }
    : undefined;
  if (active) {
    return { className: `${base} animate-pop-in border-[var(--accent-warm)] bg-[var(--accent-warm)] shadow-[0_0_6px_rgba(201,168,76,0.4)]`, style: colorStyle };
  }
  return { className: `${base} border-[var(--border-strong)] bg-transparent`, style: undefined };
}

export function ChallengeHashes({ remaining, capacity = 2, activeColor }: ChallengeHashesProps) {
  const slots = getChallengeHashSlots(remaining, capacity);
  const remainingCount = slots.filter(Boolean).length;
  return (
    <div className="inline-flex items-center gap-1">
      <span className="sr-only">{`Challenges remaining: ${remainingCount}`}</span>
      {slots.map((active, idx) => {
        const presentation = getChallengeHashClass(active, activeColor);
        return <span key={`abs-hash-${idx}`} className={presentation.className} style={presentation.style} data-active={active ? "1" : "0"} />;
      })}
    </div>
  );
}
