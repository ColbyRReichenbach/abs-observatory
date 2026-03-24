export type ReplaySpeed = "1x" | "2x" | "4x";

export function replayIntervalMs(speed: ReplaySpeed): number {
  if (speed === "4x") return 450;
  if (speed === "2x") return 800;
  return 1300;
}

export function stepReplayIndex(currentIndex: number, direction: "next" | "prev", total: number): number {
  if (total <= 0) return -1;
  const safeCurrent = currentIndex < 0 ? 0 : currentIndex;
  if (direction === "next") {
    return Math.min(total - 1, safeCurrent + 1);
  }
  return Math.max(0, safeCurrent - 1);
}

