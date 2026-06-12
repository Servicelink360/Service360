import { formatSiteItemFrequency, isSiteItemFrequencyNa } from './siteItemFrequency';

type Row = {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
  frequencyMode?: string | null;
};

export function siteItemHasStoredInterval(row: Row): boolean {
  return !isSiteItemFrequencyNa(row);
}

/** True when a simple repeat and activity rows both exist. */
export function siteItemHasBothFrequencyLayers(
  row: Row,
  activityScheduleCount: number,
): boolean {
  if (String(row.frequencyMode ?? '').toLowerCase() === 'both') {
    return true;
  }
  return siteItemHasStoredInterval(row) && activityScheduleCount > 0;
}

export function unifiedFrequencyLayersNote(
  row: Row,
  activityScheduleCount: number,
): string {
  const simple = isSiteItemFrequencyNa(row)
    ? null
    : formatSiteItemFrequency(
        row.frequencyTimes,
        row.frequencyCount,
        row.frequencyPeriod,
      );
  const activities =
    activityScheduleCount === 1
      ? '1 activity'
      : `${activityScheduleCount} activities`;
  if (simple) {
    return `${simple}, broken down into ${activities} by month.`;
  }
  return `${activities} by month — add a simple repeat above for the overall target.`;
}
