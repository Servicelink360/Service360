export const SITE_ITEM_FREQUENCY_NA = 'na';

export const SITE_ITEM_FREQUENCY_UNITS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

export function isSiteItemFrequencyNa(row: {
  frequencyPeriod?: string | null;
  frequencyCount?: number | null;
  frequencyTimes?: number | null;
}): boolean {
  const p = row.frequencyPeriod;
  return p == null || p === '' || p === SITE_ITEM_FREQUENCY_NA;
}

/** e.g. "5 times, per 5 months" */
export function formatSiteItemFrequency(
  times?: number | null,
  perCount?: number | null,
  period?: string | null,
): string {
  if (isSiteItemFrequencyNa({ frequencyPeriod: period, frequencyCount: perCount, frequencyTimes: times })) {
    return 'N/A';
  }
  const t = Math.max(1, Math.floor(+(times ?? 1)));
  const n = Math.max(1, Math.floor(+(perCount ?? 1)));
  const unitKey = String(period).toLowerCase();
  const singular: Record<string, string> = {
    day: 'day',
    week: 'week',
    month: 'month',
    year: 'year',
  };
  const unit = singular[unitKey] ?? unitKey;
  const unitLabel = n === 1 ? unit : `${unit}s`;
  const timesLabel = t === 1 ? 'time' : 'times';
  return `${t} ${timesLabel}, per ${n} ${unitLabel}`;
}

export function frequencyCountOptions(max = 30) {
  return Array.from({ length: max }, (_, i) => {
    const v = i + 1;
    return { value: v, label: String(v) };
  });
}

/** Times dropdown: N/A first, then 1…max. */
export function frequencyTimesSelectOptions(max = 30) {
  return [
    { value: SITE_ITEM_FREQUENCY_NA, label: 'N/A' },
    ...frequencyCountOptions(max),
  ];
}

/** Legacy rows: only frequency_count set — treat as per-interval, times = 1. */
export function resolveFrequencyTimes(row: {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
}): number {
  if (row.frequencyTimes != null && Number.isFinite(+row.frequencyTimes)) {
    return Math.max(1, Math.floor(+row.frequencyTimes));
  }
  return 1;
}

export function resolveFrequencyPerCount(row: {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
}): number {
  if (row.frequencyCount != null && Number.isFinite(+row.frequencyCount)) {
    return Math.max(1, Math.floor(+row.frequencyCount));
  }
  return 1;
}
