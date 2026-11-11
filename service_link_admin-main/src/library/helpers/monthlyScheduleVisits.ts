import {
  isSiteItemFrequencyNa,
  resolveFrequencyPerCount,
  resolveFrequencyTimes,
} from './siteItemFrequency';
import { getSiteItemFrequencyActiveMonthIndices } from './siteItemFrequencyActiveMonths';

/** Visits expected in a calendar month from a detailed schedule cell. */
export function visitsFromScheduleCadence(value: string | null | undefined): number {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'weekly' || v === 'once') return 4;
  if (v === 'fortnight' || v === 'fortnightly') return 2;
  if (v === 'monthly') return 1;
  if (v === 'daily') return 30;
  return 0;
}

/**
 * Visits expected this month from the simple Sites frequency
 * (e.g. 1× / week → 4, 1× / 2 weeks → 2, 1× / month → 1).
 */
export function visitsFromSimpleFrequency(
  row: {
    frequencyTimes?: number | null;
    frequencyCount?: number | null;
    frequencyPeriod?: string | null;
  },
  monthIndex: number,
  daysInMonth = 30,
): number {
  if (isSiteItemFrequencyNa(row)) return 0;
  const times = resolveFrequencyTimes(row);
  const count = resolveFrequencyPerCount(row);
  const period = String(row.frequencyPeriod || '').toLowerCase();
  if (!period || count <= 0) return 0;

  if (period === 'day') {
    return Math.max(0, Math.round((times / count) * daysInMonth));
  }
  if (period === 'week') {
    return Math.max(0, Math.round((times / count) * (daysInMonth / 7)));
  }
  if (period === 'month') {
    const active = getSiteItemFrequencyActiveMonthIndices(row);
    if (active && !active.includes(monthIndex)) return 0;
    if (count <= 1) return Math.max(1, times);
    // e.g. 1 time per 2 months → one visit on active months
    return Math.max(1, Math.round(times));
  }
  if (period === 'year') {
    // Sparse yearly — count only if this month is the first month of the year cycle (Jan)
    // unless times/count imply a monthly share.
    return monthIndex === 0 ? Math.max(1, times) : 0;
  }
  return 0;
}

export function visitsDueThisMonth(
  row: {
    frequencyTimes?: number | null;
    frequencyCount?: number | null;
    frequencyPeriod?: string | null;
    /** Precomputed from detailed month cells (API). */
    scheduleVisits?: number | null;
    monthCadence?: string | null;
  },
  monthIndex: number,
  daysInMonth = 30,
): number {
  const fromApi = row.scheduleVisits != null && Number.isFinite(+row.scheduleVisits)
    ? Math.max(0, Math.floor(+row.scheduleVisits))
    : 0;
  // Prefer a positive API value; ignore 0 so simple/cadence frequency can still apply.
  if (fromApi > 0) return fromApi;
  const fromCadence = visitsFromScheduleCadence(row.monthCadence);
  if (fromCadence > 0) return fromCadence;
  return visitsFromSimpleFrequency(row, monthIndex, daysInMonth);
}
