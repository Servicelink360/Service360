import { isSiteItemFrequencyNa } from './siteItemFrequency';

/** UI editor tab — Simple vs Advanced section focus. */
export type SiteItemFrequencyMode = 'interval' | 'annual';

/** Stored on site_items — both = unified layers coexist. */
export type StoredSiteItemFrequencyMode = SiteItemFrequencyMode | 'both';

export const SITE_ITEM_FREQUENCY_SIMPLE = {
  label: 'Simple',
  hint: 'Even repeat — e.g. 1 time per 2 months',
};

export const SITE_ITEM_FREQUENCY_DETAIL = {
  label: 'More detail',
  hint: 'Optional — by activity and month (W / M / F / D) when the repeat above is not enough',
  openLabel: 'Add more detail by activity & month',
};

export const SITE_ITEM_FREQUENCY_TABS: {
  key: SiteItemFrequencyMode;
  label: string;
  hint: string;
}[] = [
  {
    key: 'interval',
    label: SITE_ITEM_FREQUENCY_SIMPLE.label,
    hint: SITE_ITEM_FREQUENCY_SIMPLE.hint,
  },
  {
    key: 'annual',
    label: SITE_ITEM_FREQUENCY_DETAIL.label,
    hint: SITE_ITEM_FREQUENCY_DETAIL.hint,
  },
];

/** @deprecated use SITE_ITEM_FREQUENCY_TABS */
export const SITE_ITEM_FREQUENCY_MODE_OPTIONS = SITE_ITEM_FREQUENCY_TABS.map((t) => ({
  value: t.key,
  label: t.label,
}));

export function normalizeSiteItemFrequencyMode(
  value: string | StoredSiteItemFrequencyMode | null | undefined,
): StoredSiteItemFrequencyMode | null {
  if (value == null || value === '') return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'interval' || v === 'annual' || v === 'both') return v;
  return null;
}

/** Default editor tab when only one section is shown (legacy). */
export function resolveSiteItemFrequencyMode(row: {
  frequencyMode?: string | null;
  frequencyPeriod?: string | null;
  service?: { name?: string };
  Service?: { name?: string };
}): SiteItemFrequencyMode {
  const explicit = normalizeSiteItemFrequencyMode(row.frequencyMode);
  if (explicit === 'both') {
    const name = row?.service?.name ?? row?.Service?.name ?? '';
    if (/ground\s*maintenance/i.test(String(name))) return 'annual';
    return 'interval';
  }
  if (explicit === 'annual' || explicit === 'interval') return explicit;

  if (!isSiteItemFrequencyNa(row)) return 'interval';

  const name = row?.service?.name ?? row?.Service?.name ?? '';
  if (/ground\s*maintenance/i.test(String(name))) return 'annual';

  return 'interval';
}

export function isSiteItemAnnualFrequencyMode(row: {
  frequencyMode?: string | null;
  frequencyPeriod?: string | null;
  service?: { name?: string };
  Service?: { name?: string };
}): boolean {
  const stored = normalizeSiteItemFrequencyMode(row.frequencyMode);
  if (stored === 'annual' || stored === 'both') return true;
  return resolveSiteItemFrequencyMode(row) === 'annual';
}

export function siteItemFrequencyModeLabel(mode: SiteItemFrequencyMode): string {
  return SITE_ITEM_FREQUENCY_TABS.find((t) => t.key === mode)?.label ?? mode;
}

export function siteItemHasUnifiedBothMode(row: {
  frequencyMode?: string | null;
}): boolean {
  return normalizeSiteItemFrequencyMode(row.frequencyMode) === 'both';
}

/** Pass stored mode through — API syncs both/interval/annual after save. */
export function siteItemFrequencyModeForSave(
  current: string | null | undefined,
): StoredSiteItemFrequencyMode | undefined {
  const m = normalizeSiteItemFrequencyMode(current);
  return m ?? undefined;
}
