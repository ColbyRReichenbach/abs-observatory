export function tickerIntervalMs(speedMs = 2400) {
  return Math.max(900, speedMs);
}

export function nextTickerIndex(current: number, total: number) {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

