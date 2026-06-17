export const BAYSIDE_PUBLIC_AMENITIES_SITE = 'Bayside Public Amenities';
export const MASCOT_PUBLIC_AMENITIES_SITE = 'Mascot Public Amenities';
export const BAYSIDE_COUNCIL_COMPANY = 'Bayside Council';

export type StaffDropdownSite = {
  id: number;
  name: string;
};

function normalizeSiteLabel(name: string): string {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function staffSiteSortKey(site: StaffDropdownSite, baysideSiteIds: Set<number>): [number, string] {
  const label = String(site.name ?? '').trim();
  const norm = normalizeSiteLabel(label);

  if (norm === normalizeSiteLabel(BAYSIDE_PUBLIC_AMENITIES_SITE)) {
    return [0, norm];
  }
  if (norm === normalizeSiteLabel(MASCOT_PUBLIC_AMENITIES_SITE)) {
    return [1, norm];
  }
  if (baysideSiteIds.has(+site.id)) {
    return [2, norm];
  }
  return [3, norm];
}

/** Staff new-report / fault-report site dropdown: Bayside Public Amenities, Mascot Public Amenities, other Bayside A–Z, then rest A–Z. */
export function sortStaffDropdownSites<T extends StaffDropdownSite>(
  sites: T[],
  baysideSiteIds: Set<number>,
): T[] {
  return [...sites].sort((a, b) => {
    const ka = staffSiteSortKey(a, baysideSiteIds);
    const kb = staffSiteSortKey(b, baysideSiteIds);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1].localeCompare(kb[1], undefined, { sensitivity: 'base' });
  });
}
