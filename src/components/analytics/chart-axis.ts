"use client";

type AxisConfig = {
  domain: [number, number];
  ticks: number[];
};

type LinearAxisOptions = {
  step: number;
  padding?: number;
  min?: number;
  max?: number;
  minSpan?: number;
};

function sanitize(value: number) {
  if (Object.is(value, -0)) return 0;
  return Number(value.toFixed(6));
}

function buildTicks(start: number, end: number, step: number) {
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(sanitize(value));
  }
  return ticks;
}

export function buildLinearAxis(values: number[], options: LinearAxisOptions): AxisConfig {
  const { step, padding = 0, min, max, minSpan = step * 4 } = options;
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    const lower = min ?? 0;
    const upper = max ?? lower + minSpan;
    return {
      domain: [sanitize(lower), sanitize(upper)],
      ticks: buildTicks(lower, upper, step),
    };
  }

  let lower = Math.min(...finiteValues) - padding;
  let upper = Math.max(...finiteValues) + padding;

  if (min != null) lower = Math.max(min, lower);
  if (max != null) upper = Math.min(max, upper);

  if (upper - lower < minSpan) {
    const midpoint = (upper + lower) / 2;
    lower = midpoint - minSpan / 2;
    upper = midpoint + minSpan / 2;

    if (min != null && lower < min) {
      upper += min - lower;
      lower = min;
    }

    if (max != null && upper > max) {
      lower -= upper - max;
      upper = max;
    }
  }

  lower = Math.floor(lower / step) * step;
  upper = Math.ceil(upper / step) * step;

  if (min != null) lower = Math.max(min, lower);
  if (max != null) upper = Math.min(max, upper);

  if (upper <= lower) {
    upper = max != null ? Math.min(max, lower + minSpan) : lower + minSpan;
    if (upper <= lower) {
      lower = min ?? 0;
      upper = max ?? lower + minSpan;
    }
  }

  lower = sanitize(lower);
  upper = sanitize(upper);

  return {
    domain: [lower, upper],
    ticks: buildTicks(lower, upper, step),
  };
}

export function formatPercentTick(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function formatRatioPercentTick(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumberTick(value: number, digits = 1) {
  return value.toFixed(digits);
}
