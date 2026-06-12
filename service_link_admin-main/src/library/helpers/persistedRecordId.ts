/** PostgreSQL signed integer maximum. */
export const PG_INT_MAX = 2_147_483_647;

/** True for real DB primary keys — excludes Date.now() client temp ids. */
export function isPersistedDbId(id: unknown): id is number {
  const n = Number(id);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 && n <= PG_INT_MAX;
}

/** Replace Date.now() temp ids with negative client-only ids. */
export function sanitizeSiteItemClientIds<T extends { id?: unknown }>(items: T[]): T[] {
  let nextTemp = -1;
  return items.map((row) => {
    const id = Number(row?.id);
    if (isPersistedDbId(id)) return row;
    if (!Number.isFinite(id)) return { ...row, id: nextTemp-- as unknown as T['id'] };
    if (id > PG_INT_MAX || id < 0) {
      return { ...row, id: nextTemp-- as unknown as T['id'] };
    }
    return row;
  });
}

const SITE_ITEM_ID_IN_PATH = /\/site-item\/(\d+)(?:\/|$|\?)/;

/** Block API calls that use Date.now() ids in /site-item/:id paths. */
export function rejectInvalidSiteItemApiUrl(endPoint: string): string | null {
  const match = String(endPoint).match(SITE_ITEM_ID_IN_PATH);
  if (!match) return null;
  const id = Number(match[1]);
  if (isPersistedDbId(id)) return null;
  return 'Save the site service first, then edit frequency.';
}
