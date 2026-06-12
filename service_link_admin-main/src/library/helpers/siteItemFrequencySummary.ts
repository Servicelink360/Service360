import {
  formatSiteItemFrequency,
  isSiteItemFrequencyNa,
} from './siteItemFrequency';

type Row = {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
};

export function formatSiteItemFrequencySummary(row: Row): string {
  if (isSiteItemFrequencyNa(row)) {
    return 'Not set';
  }
  return formatSiteItemFrequency(
    row.frequencyTimes,
    row.frequencyCount,
    row.frequencyPeriod,
  );
}
