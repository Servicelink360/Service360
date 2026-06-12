import { ServiceFrequencyType } from '../services/entities/service.entity';
import {
  normalizeServiceFrequencyType,
  resolveServiceFrequencyType,
} from '../services/service-frequency.util';

/** Per site+service override; null inherits from service default. */
export function resolveSiteItemFrequencyType(
  siteItem: { frequencyType?: string | null },
  service?: { frequencyType?: string | null; name?: string | null } | null,
): ServiceFrequencyType {
  const raw = siteItem?.frequencyType;
  if (raw != null && String(raw).trim() !== '') {
    return normalizeServiceFrequencyType(raw);
  }
  return resolveServiceFrequencyType(service ?? {});
}

export function isDetailedSiteItem(
  siteItem: { frequencyType?: string | null },
  service?: { frequencyType?: string | null; name?: string | null } | null,
): boolean {
  return resolveSiteItemFrequencyType(siteItem, service) === 'detailed';
}
