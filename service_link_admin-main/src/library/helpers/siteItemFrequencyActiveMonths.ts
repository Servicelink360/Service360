import {
  GROUND_MAINTENANCE_MONTH_LABELS,
} from './groundMaintenanceSchedule';
import {
  formatSiteItemFrequency,
  isSiteItemFrequencyNa,
  resolveFrequencyPerCount,
  resolveFrequencyTimes,
} from './siteItemFrequency';

export type FrequencyLike = {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
};

export type MonthlyDetailScope = {
  /** null = all 12 months can be scheduled */
  activeMonthIndices: number[] | null;
  allowed: boolean;
  blockedReason: string | null;
  monthHint: string | null;
};

function activeMonthLabels(indices: number[]): string {
  return indices.map((i) => GROUND_MAINTENANCE_MONTH_LABELS[i]).join(', ');
}

/** Which calendar months match the simple repeat (Jan = 0). */
export function getSiteItemFrequencyActiveMonthIndices(
  row: FrequencyLike,
): number[] | null {
  if (isSiteItemFrequencyNa(row)) return null;

  const times = resolveFrequencyTimes(row);
  const count = resolveFrequencyPerCount(row);
  const period = String(row.frequencyPeriod ?? '').toLowerCase();

  if (period === 'day' || period === 'week') return null;
  if (period === 'year') return [];

  if (period === 'month') {
    if (count <= 1 || times > 1) return null;
    const indices: number[] = [];
    for (let i = 0; i < 12; i += count) {
      indices.push(i);
    }
    return indices;
  }

  return null;
}

export function resolveSiteItemMonthlyDetailScope(
  row: FrequencyLike,
): MonthlyDetailScope {
  if (isSiteItemFrequencyNa(row)) {
    return {
      activeMonthIndices: null,
      allowed: true,
      blockedReason: null,
      monthHint: null,
    };
  }

  const simple = formatSiteItemFrequency(
    row.frequencyTimes,
    row.frequencyCount,
    row.frequencyPeriod,
  );
  const period = String(row.frequencyPeriod ?? '').toLowerCase();

  if (period === 'year') {
    return {
      activeMonthIndices: [],
      allowed: false,
      blockedReason: `${simple} — yearly repeat does not use a month-by-month grid. Use Simple only, or set repeat by month.`,
      monthHint: null,
    };
  }

  const indices = getSiteItemFrequencyActiveMonthIndices(row);

  if (indices == null) {
    return {
      activeMonthIndices: null,
      allowed: true,
      blockedReason: null,
      monthHint: null,
    };
  }

  if (indices.length === 0) {
    return {
      activeMonthIndices: [],
      allowed: false,
      blockedReason: `${simple} — no months match this repeat.`,
      monthHint: null,
    };
  }

  if (indices.length === 12) {
    return {
      activeMonthIndices: null,
      allowed: true,
      blockedReason: null,
      monthHint: null,
    };
  }

  return {
    activeMonthIndices: indices,
    allowed: true,
    blockedReason: null,
    monthHint: `Matches ${simple}: schedule only ${activeMonthLabels(indices)}.`,
  };
}

export function isSiteItemMonthActiveForFrequency(
  monthIndex: number,
  activeMonthIndices: number[] | null,
): boolean {
  if (activeMonthIndices == null) return true;
  return activeMonthIndices.includes(monthIndex);
}

export function clampScheduleMonthsToActive(
  months: (string | null)[],
  activeMonthIndices: number[] | null,
): (string | null)[] {
  if (activeMonthIndices == null) return months.slice(0, 12);
  return months.slice(0, 12).map((value, idx) =>
    activeMonthIndices.includes(idx) ? value : null,
  );
}
