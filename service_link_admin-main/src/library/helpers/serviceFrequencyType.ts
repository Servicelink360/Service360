export type ServiceFrequencyType = 'simple' | 'detailed';

const GM = /^ground\s*maintenance$/i;

export function normalizeServiceFrequencyType(
  value: string | null | undefined,
): ServiceFrequencyType {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'detailed' ? 'detailed' : 'simple';
}

export function resolveServiceFrequencyType(service?: {
  frequencyType?: string | null;
  name?: string | null;
} | null): ServiceFrequencyType {
  if (!service) return 'simple';
  const raw = service.frequencyType;
  if (raw != null && String(raw).trim() !== '') {
    return normalizeServiceFrequencyType(raw);
  }
  if (GM.test(String(service.name ?? ''))) return 'detailed';
  return 'simple';
}

export function resolveSiteItemService(row: {
  service?: { id?: number; name?: string; frequencyType?: string | null };
  Service?: { id?: number; name?: string; frequencyType?: string | null };
}) {
  return row?.service ?? row?.Service ?? null;
}

/** Effective frequency for this site+service row (override or service default). */
export function resolveSiteItemFrequencyType(row: {
  frequencyType?: string | null;
  service?: { id?: number; name?: string; frequencyType?: string | null };
  Service?: { id?: number; name?: string; frequencyType?: string | null };
}): ServiceFrequencyType {
  const raw = row.frequencyType;
  if (raw != null && String(raw).trim() !== '') {
    return normalizeServiceFrequencyType(raw);
  }
  return resolveServiceFrequencyType(resolveSiteItemService(row));
}

export function isDetailedFrequencySiteItem(row: {
  frequencyType?: string | null;
  service?: { id?: number; name?: string; frequencyType?: string | null };
  Service?: { id?: number; name?: string; frequencyType?: string | null };
}): boolean {
  return resolveSiteItemFrequencyType(row) === 'detailed';
}

/** Service catalogue default only — job sites should use isDetailedFrequencySiteItem. */
export function isDetailedFrequencyService(service?: {
  frequencyType?: string | null;
  name?: string | null;
} | null): boolean {
  return resolveServiceFrequencyType(service) === 'detailed';
}

export function serviceFrequencyTypeLabel(type: ServiceFrequencyType): string {
  return type === 'detailed' ? 'Detailed' : 'Simple';
}

export const SERVICE_FREQUENCY_TYPE_OPTIONS: {
  value: ServiceFrequencyType;
  label: string;
  hint: string;
}[] = [
  {
    value: 'simple',
    label: 'Simple',
    hint: 'Even repeat — e.g. 1 time per 3 months',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    hint: 'Activity list and month grid for this site only',
  },
];

export function siteItemFrequencyTypeOverrideLabel(
  row: Parameters<typeof resolveSiteItemFrequencyType>[0],
): string | null {
  const raw = row.frequencyType;
  if (raw == null || String(raw).trim() === '') return null;
  const serviceDefault = resolveServiceFrequencyType(resolveSiteItemService(row));
  const effective = resolveSiteItemFrequencyType(row);
  if (effective === serviceDefault) return null;
  return `Override: ${serviceFrequencyTypeLabel(effective)}`;
}
