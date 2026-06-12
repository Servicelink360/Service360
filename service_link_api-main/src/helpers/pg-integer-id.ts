export const PG_INT_MAX = 2_147_483_647;

export function isValidPgIntegerId(id: unknown): id is number {
  const n = Number(id);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 && n <= PG_INT_MAX;
}

export const INVALID_PG_INTEGER_ID_MESSAGE =
  'Save the site service first, then edit frequency.';
