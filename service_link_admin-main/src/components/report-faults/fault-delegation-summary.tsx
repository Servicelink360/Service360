import moment from 'moment';
import React from 'react';
import DelegationOutcomeBadge, { delegationOutcomeOf } from './delegation-outcome';
import { BellOutlined } from '@ant-design/icons';
import {
  canNudgeDelegationAssignee,
  delegateTargetLabel,
  FaultNudgeAssigneeButton,
} from './fault-delegation-cell';

type Props = {
  record: any;
  viewerType?: number;
};

/** Compact delegation summary with act-by deadline and outcome for customers. */
const FaultDelegationSummary: React.FC<Props> = ({ record, viewerType = 0 }) => {
  if (!record?.delegatedToType) return null;

  const targetLabel = delegateTargetLabel(record) ?? '—';

  const outcome = delegationOutcomeOf(record);

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'rgba(0, 0, 0, 0.88)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            padding: '1px 7px',
            borderRadius: 6,
            border: '1px solid #e4e7ec',
            background: '#f4f6f8',
            fontSize: 10,
            fontWeight: 500,
            color: '#5c6670',
          }}
        >
          Assigned to
        </span>
        <strong>{targetLabel}</strong>
        {record.delegatedUntil ? (
          <span style={{ color: '#595959' }}>
            Act by {moment(record.delegatedUntil).format('DD/MM/YYYY HH:mm')}
          </span>
        ) : null}
        <DelegationOutcomeBadge outcome={outcome} />
        {canNudgeDelegationAssignee(record, viewerType) ? (
          <FaultNudgeAssigneeButton record={record} profileType={viewerType} />
        ) : null}
      </div>
      {!record.delegatedActedAt &&
      canNudgeDelegationAssignee(record, viewerType) &&
      (outcome === 'pending' || outcome === 'viewed' || outcome === 'not_done') ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8c4a00' }}>
          <BellOutlined style={{ marginRight: 4 }} />
          Assignee has not confirmed completion yet — send a reminder if needed.
        </p>
      ) : null}
      {record.delegatedActedAt ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#595959' }}>
          Confirmed acted{' '}
          {moment(record.delegatedActedAt).format('DD/MM/YYYY HH:mm')}
        </p>
      ) : record.delegationViewedAt && outcome === 'viewed' ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#595959' }}>
          Link viewed {moment(record.delegationViewedAt).format('DD/MM/YYYY HH:mm')} — awaiting confirmation
        </p>
      ) : null}
      {record.delegationNote ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#595959' }}>
          Note: {record.delegationNote}
        </p>
      ) : null}
    </div>
  );
};

export default FaultDelegationSummary;
