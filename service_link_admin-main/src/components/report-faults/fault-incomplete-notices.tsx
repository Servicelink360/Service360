import { delegateTargetLabel } from './fault-delegation-cell';
import { delegationOutcomeOf, DelegationOutcome, faultListStatusOf } from './delegation-outcome';

const reportFaultIdOf = (record: any) => record?.reportFaultId ?? record?.id;

export type AwaitingAssigneeSummary = {
  assigneeName: string;
  count: number;
};

export type IncompleteFaultSummary = {
  incomplete: number;
  overdue: number;
  awaitingDelegate: number;
  awaitingByAssignee: AwaitingAssigneeSummary[];
  openNoDelegation: number;
  urgentIncomplete: number;
  items: Array<{
    id: number;
    issue: string;
    siteName: string;
    outcome: DelegationOutcome | null;
    isUrgent: boolean;
  }>;
};

export function summarizeIncompleteFaults(
  rows: any[],
  options?: {
    urgentOnly?: boolean;
  },
): IncompleteFaultSummary {
  const urgentOnly = options?.urgentOnly === true;
  const seen = new Set<number>();
  const items: IncompleteFaultSummary['items'] = [];
  const awaitingByAssigneeMap = new Map<string, number>();
  let overdue = 0;
  let awaitingDelegate = 0;
  let openNoDelegation = 0;
  let urgentIncomplete = 0;

  for (const r of rows) {
    const id = reportFaultIdOf(r);
    if (!id || seen.has(id)) continue;
    if (faultListStatusOf(r) === 'completed') continue;
    if (urgentOnly && +r.priority !== 1) continue;
    seen.add(id);

    const outcome = r.delegatedToType ? delegationOutcomeOf(r) : null;
    if (+r.priority === 1) urgentIncomplete += 1;
    if (outcome === 'not_done') overdue += 1;
    else if (outcome === 'pending' || outcome === 'viewed') {
      awaitingDelegate += 1;
      const assigneeName = delegateTargetLabel(r) ?? 'Assignee';
      awaitingByAssigneeMap.set(
        assigneeName,
        (awaitingByAssigneeMap.get(assigneeName) ?? 0) + 1,
      );
    } else if (!r.delegatedToType) openNoDelegation += 1;

    items.push({
      id,
      issue: String(r.issue || r.subject || `Fault #${id}`).trim(),
      siteName: String(r.siteName || '').trim(),
      outcome,
      isUrgent: +r.priority === 1,
    });
  }

  items.sort((a, b) => {
    const rank = (o: DelegationOutcome | null) => {
      if (o === 'not_done') return 0;
      if (o === 'pending') return 1;
      if (o === 'viewed') return 2;
      return 3;
    };
    return rank(a.outcome) - rank(b.outcome);
  });

  const awaitingByAssignee = [...awaitingByAssigneeMap.entries()]
    .map(([assigneeName, count]) => ({ assigneeName, count }))
    .sort((a, b) => b.count - a.count || a.assigneeName.localeCompare(b.assigneeName));

  return {
    incomplete: items.length,
    overdue,
    awaitingDelegate,
    awaitingByAssignee,
    openNoDelegation,
    urgentIncomplete,
    items,
  };
}
