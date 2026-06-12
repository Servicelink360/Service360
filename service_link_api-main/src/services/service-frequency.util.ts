import { ServiceFrequencyType } from './entities/service.entity';

const GM = /^ground\s*maintenance$/i;
const RG = /^roof\s*(and|&)\s*gutter/i;

export function normalizeServiceFrequencyType(
  value: string | null | undefined,
): ServiceFrequencyType {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'detailed') return 'detailed';
  return 'simple';
}

/** Resolve type from DB column, with legacy name fallback when unset. */
export function resolveServiceFrequencyType(service: {
  frequencyType?: string | null;
  name?: string | null;
}): ServiceFrequencyType {
  const raw = service?.frequencyType;
  if (raw != null && String(raw).trim() !== '') {
    return normalizeServiceFrequencyType(raw);
  }
  const name = String(service?.name ?? '').trim();
  if (GM.test(name)) return 'detailed';
  if (RG.test(name)) return 'simple';
  return 'simple';
}

export function isDetailedService(service: {
  frequencyType?: string | null;
  name?: string | null;
}): boolean {
  return resolveServiceFrequencyType(service) === 'detailed';
}
