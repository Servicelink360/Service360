import { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { userType } from '../constants/user';
import { IUserInfo } from '../interfaces/IUserInfo';
import { Customer } from '../users/entities/customer.entity';

export const CUSTOMER_SCOPE_USER_PARAM = 'customerScopeUserId';

/**
 * Customers see rows for their organisation (customers.company_id), plus own user_id.
 * Same UI for every customer login; list is shared within the company, hide/badge per login.
 */
export function customerScopeSql(customerIdColumn: string): string {
  return `(
    ${customerIdColumn} = :${CUSTOMER_SCOPE_USER_PARAM}
    OR ${customerIdColumn} IN (
      SELECT c.user_id FROM customers c
      INNER JOIN customers me ON me.user_id = :${CUSTOMER_SCOPE_USER_PARAM}
      WHERE me.company_id IS NOT NULL AND c.company_id = me.company_id
    )
    OR ${customerIdColumn} IN (
      SELECT c.user_id FROM customers c
      INNER JOIN customers me ON me.user_id = :${CUSTOMER_SCOPE_USER_PARAM}
      WHERE me.company_id IS NULL
        AND TRIM(COALESCE(me.company_name, '')) <> ''
        AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(me.company_name))
    )
  )`;
}

export function customerScopeParams(userInfo: IUserInfo): Record<string, number> {
  return { [CUSTOMER_SCOPE_USER_PARAM]: +userInfo.userId };
}

export function applyCustomerScopeToQuery(
  query: SelectQueryBuilder<unknown>,
  userInfo: IUserInfo,
  customerIdColumn: string,
): void {
  if (+userInfo.type !== userType.CUSTOMER) {
    return;
  }
  query.andWhere(customerScopeSql(customerIdColumn), customerScopeParams(userInfo));
}

export async function customerCanAccessCustomerId(
  customerRepo: Repository<Customer>,
  userId: number,
  targetCustomerId: number,
): Promise<boolean> {
  if (+userId === +targetCustomerId) {
    return true;
  }
  const me = await customerRepo.findOne({
    where: { userId },
    select: ['companyId', 'companyName'],
  });
  if (!me) {
    return false;
  }
  if (me.companyId != null) {
    const peer = await customerRepo.count({
      where: { userId: targetCustomerId, companyId: me.companyId },
    });
    return peer > 0;
  }
  const companyName = String(me.companyName || '').trim();
  if (!companyName) {
    return false;
  }
  const peer = await customerRepo
    .createQueryBuilder('c')
    .where('c.user_id = :targetCustomerId', { targetCustomerId })
    .andWhere('LOWER(TRIM(c.company_name)) = LOWER(TRIM(:companyName))', {
      companyName,
    })
    .getCount();
  return peer > 0;
}

/** @deprecated Use customerCanAccessCustomerId (same company peer check). */
export const customerCanAccessPeerCustomerId = customerCanAccessCustomerId;
