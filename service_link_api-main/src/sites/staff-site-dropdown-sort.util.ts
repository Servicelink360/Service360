export type StaffDropdownSite = {
  id: number;
  name: string;
  /** Lower = higher in list. Null/undefined = after pinned sites, A–Z. */
  dropdownSortOrder?: number | null;
};

function normalizeSiteLabel(name: string): string {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sortKey(site: StaffDropdownSite): [number, string] {
  const order = site.dropdownSortOrder;
  const pinned =
    order != null && Number.isFinite(+order) ? Math.floor(+order) : Number.MAX_SAFE_INTEGER;
  return [pinned, normalizeSiteLabel(String(site.name ?? ''))];
}

/**
 * Staff new-report / fault-report site dropdown:
 * sites with dropdown_sort_order first (ascending), then the rest A–Z.
 * Pin order is data (per company DB), not hardcoded client names.
 */
export function sortStaffDropdownSites<T extends StaffDropdownSite>(sites: T[]): T[] {
  return [...sites].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1].localeCompare(kb[1], undefined, { sensitivity: 'base' });
  });
}
