/** Company rows for site/job dropdowns (id = shared company_id, not individual user id). */
export type CustomerCompanyOption = {
  id: number;
  name: string;
  companyName: string;
  primaryUserId?: number;
};

export const sanitizeCompanyDisplayName = (name?: string): string =>
  String(name ?? '')
    .replace(/\s*\[C-\d+\]\s*/gi, ' ')
    .trim();

export function buildCustomerCompanyOptions(users: any[]): CustomerCompanyOption[] {
  const map = new Map<number, CustomerCompanyOption>();
  for (const u of users || []) {
    if (+u.type !== 1) continue;
    const companyId = +(u.customerInfo?.companyId ?? u.customerInfo?.company_id ?? 0);
    const name = sanitizeCompanyDisplayName(u.customerInfo?.companyName) || u.fullName || '';
    if (!companyId || !name) continue;
    if (!map.has(companyId)) {
      map.set(companyId, {
        id: companyId,
        name,
        companyName: name,
        primaryUserId: +u.id,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function companyOptionFromId(
  companies: CustomerCompanyOption[],
  companyId?: number | null,
): CustomerCompanyOption | undefined {
  if (companyId == null) return undefined;
  return companies.find((c) => +c.id === +companyId);
}
