import { Tag, Tooltip } from 'antd';
import React from 'react';
import { reportFaultStatus } from '../../constants/statusUser';

export type DelegationOutcome =
  | 'pending'
  | 'viewed'
  | 'done_on_time'
  | 'done_late'
  | 'not_done';

const OUTCOME_META: Record<
  DelegationOutcome,
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'default' },
  viewed: { label: 'Viewed — awaiting action', color: 'processing' },
  done_on_time: { label: 'Done on time', color: 'success' },
  done_late: { label: 'Done late', color: 'warning' },
  not_done: { label: 'Not done — overdue', color: 'error' },
};

export type FaultListStatus = 'completed' | 'pending' | 'overdue';

const LIST_STATUS_META: Record<
  FaultListStatus,
  { label: string; color: string }
> = {
  completed: { label: 'Completed', color: 'success' },
  pending: { label: 'Pending', color: 'processing' },
  overdue: { label: 'Overdue', color: 'error' },
};

export function faultListStatusOf(record: {
  status?: number;
  delegatedToType?: string | null;
  delegatedUntil?: string | null;
  delegatedActedAt?: string | null;
  delegationViewedAt?: string | null;
}): FaultListStatus {
  const outcome = record.delegatedToType ? delegationOutcomeOf(record) : null;

  if (outcome === 'not_done') return 'overdue';
  if (outcome === 'done_on_time' || outcome === 'done_late') return 'completed';
  if (+record.status === reportFaultStatus.COMPLETED) return 'completed';
  if (!record.delegatedToType) return 'pending';
  return 'pending';
}

export function faultListStatusDetailLabel(record: {
  status?: number;
  delegatedToType?: string | null;
  delegatedUntil?: string | null;
  delegatedActedAt?: string | null;
  delegationViewedAt?: string | null;
}): string {
  const outcome = record.delegatedToType ? delegationOutcomeOf(record) : null;
  if (outcome) return OUTCOME_META[outcome].label;
  if (+record.status === reportFaultStatus.COMPLETED) return 'Completed';
  return 'Pending';
}

export function computeDelegationOutcomeClient(record: {
  delegatedToType?: string | null;
  delegatedUntil?: string | null;
  delegatedActedAt?: string | null;
  delegationViewedAt?: string | null;
}): DelegationOutcome | null {
  if (!record.delegatedToType || !record.delegatedUntil) return null;

  const until = new Date(record.delegatedUntil);
  if (Number.isNaN(until.getTime())) return null;

  const now = Date.now();
  const acted = record.delegatedActedAt ? new Date(record.delegatedActedAt) : null;
  const viewed = record.delegationViewedAt ? new Date(record.delegationViewedAt) : null;

  if (acted && !Number.isNaN(acted.getTime())) {
    return acted.getTime() <= until.getTime() ? 'done_on_time' : 'done_late';
  }
  if (now > until.getTime()) return 'not_done';
  if (viewed && !Number.isNaN(viewed.getTime())) return 'viewed';
  return 'pending';
}

export function delegationOutcomeOf(record: {
  delegationOutcome?: DelegationOutcome | null;
  delegatedToType?: string | null;
  delegatedUntil?: string | null;
  delegatedActedAt?: string | null;
  delegationViewedAt?: string | null;
}): DelegationOutcome | null {
  if (!record.delegatedToType) return null;
  return computeDelegationOutcomeClient(record);
}

type BadgeProps = {
  outcome: DelegationOutcome | null | undefined;
  style?: React.CSSProperties;
};

export const DelegationOutcomeBadge: React.FC<BadgeProps> = ({ outcome, style }) => {
  if (!outcome) return null;
  const meta = OUTCOME_META[outcome];
  return (
    <Tag color={meta.color} style={style}>
      {meta.label}
    </Tag>
  );
};

type ListStatusBadgeProps = {
  record: {
    status?: number;
    delegatedToType?: string | null;
    delegatedUntil?: string | null;
    delegatedActedAt?: string | null;
    delegationViewedAt?: string | null;
  };
  style?: React.CSSProperties;
};

export const FaultListStatusBadge: React.FC<ListStatusBadgeProps> = ({ record, style }) => {
  const listStatus = faultListStatusOf(record);
  const meta = LIST_STATUS_META[listStatus];
  const detail = faultListStatusDetailLabel(record);
  const tag = (
    <Tag color={meta.color} style={style}>
      {meta.label}
    </Tag>
  );
  if (detail === meta.label) return tag;
  return <Tooltip title={detail}>{tag}</Tooltip>;
};

export default DelegationOutcomeBadge;
