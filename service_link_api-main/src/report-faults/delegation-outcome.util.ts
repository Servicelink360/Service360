export type DelegationOutcome =
  | 'pending'
  | 'viewed'
  | 'done_on_time'
  | 'done_late'
  | 'not_done';

export function computeDelegationOutcome(fault: {
  delegatedToType?: string | null;
  delegatedUntil?: Date | string | null;
  delegatedActedAt?: Date | string | null;
  delegationViewedAt?: Date | string | null;
}): DelegationOutcome | null {
  if (!fault.delegatedToType || !fault.delegatedUntil) return null;

  const until = new Date(fault.delegatedUntil);
  if (Number.isNaN(until.getTime())) return null;

  const now = Date.now();
  const acted = fault.delegatedActedAt ? new Date(fault.delegatedActedAt) : null;
  const viewed = fault.delegationViewedAt ? new Date(fault.delegationViewedAt) : null;

  if (acted && !Number.isNaN(acted.getTime())) {
    return acted.getTime() <= until.getTime() ? 'done_on_time' : 'done_late';
  }
  if (now > until.getTime()) return 'not_done';
  if (viewed && !Number.isNaN(viewed.getTime())) return 'viewed';
  return 'pending';
}
