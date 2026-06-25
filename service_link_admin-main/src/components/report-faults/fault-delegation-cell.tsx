import {
  delegationOutcomeOf,
  faultListStatusOf,
  FaultListStatusBadge,
} from '@app/components/report-faults/delegation-outcome';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { reportFaultStatus, userType } from '@app/constants/statusUser';
import { callAPIAsync } from '@app/lib/helpers/api';
import { Button, Popconfirm, Spin, message } from 'antd';
import React, { useCallback, useState } from 'react';

const reportFaultIdOf = (record: any) => record?.reportFaultId ?? record?.id;

function contactWho(name: string, role?: string | null): string {
  const n = String(name || '').trim();
  const r = String(role || '').trim();
  return r ? `${n} - ${r.toLowerCase()}` : n;
}

export function formatStaffAssigneeLabel(
  name: string,
  role?: string | null,
): string {
  const who = contactWho(name, role);
  return who ? `My staff: ${who}` : 'My staff';
}

export function formatCustomerPersonnelAssigneeLabel(
  name: string,
  role?: string | null,
): string {
  const who = contactWho(name, role);
  return who ? `Customer personnel: ${who}` : 'Customer personnel';
}

export function formatPersonnelAssigneeLabel(
  name: string,
  role?: string | null,
): string {
  const who = contactWho(name, role);
  return who;
}

/** Shown to customers when the assignee is the service provider or admin-side staff. */
export const CUSTOMER_SERVICE_PROVIDER_LABEL = 'Servicelink';

/** Returned by API when admin/staff view a fault delegated to customer personnel. */
export const CUSTOMER_PERSONNEL_MASK_LABEL = 'Customer personnel';

export function isCustomerOwnedDelegationType(type: string | null | undefined): boolean {
  const t = String(type ?? '').trim().toLowerCase();
  return t === 'personnel' || t === 'admin';
}

export function isAdminOwnedDelegationType(type: string | null | undefined): boolean {
  const t = String(type ?? '').trim().toLowerCase();
  return t === 'staff' || t === 'admin_personnel';
}

/** Assign / change when unassigned, or assigned by the same party. Hide cross-party reassignment. */
export function canManageFaultDelegation(record: any, profileType: number): boolean {
  if (profileType !== userType.CUSTOMER && profileType !== userType.ADMIN) return false;

  const delegatedType = String(record?.delegatedToType ?? '').trim().toLowerCase();
  if (!delegatedType) return true;

  if (profileType === userType.ADMIN && isCustomerOwnedDelegationType(delegatedType)) {
    return false;
  }
  if (profileType === userType.CUSTOMER && isAdminOwnedDelegationType(delegatedType)) {
    return false;
  }

  if (faultListStatusOf(record) === 'completed') return false;

  return true;
}

/** Send email reminder when assignee has not confirmed action. */
export function canNudgeDelegationAssignee(record: any, profileType: number): boolean {
  if (profileType !== userType.CUSTOMER && profileType !== userType.ADMIN) return false;
  if (faultListStatusOf(record) === 'completed') return false;
  if (!record?.delegatedToType || record?.delegatedActedAt) return false;

  const delegatedType = String(record.delegatedToType).trim().toLowerCase();
  const outcome = delegationOutcomeOf(record);
  if (outcome !== 'pending' && outcome !== 'viewed' && outcome !== 'not_done') return false;

  if (profileType === userType.CUSTOMER) {
    return delegatedType === 'personnel';
  }
  return delegatedType === 'staff' || delegatedType === 'admin_personnel';
}

type NudgeProps = {
  record: any;
  profileType: number;
  size?: 'small' | 'middle' | 'large';
};

export const FaultNudgeAssigneeButton: React.FC<NudgeProps> = ({
  record,
  profileType,
  size = 'small',
}) => {
  const [loading, setLoading] = useState(false);

  const nudge = useCallback(async () => {
    const faultId = reportFaultIdOf(record);
    if (!faultId) return;
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/nudge-assignee`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        message.success('Reminder email sent');
      } else {
        message.error(res?.message || 'Could not send reminder');
      }
    } finally {
      setLoading(false);
    }
  }, [record]);

  if (!canNudgeDelegationAssignee(record, profileType)) return null;

  return (
    <Popconfirm
      title="Send a reminder email to the assignee?"
      okText="Send reminder"
      cancelText="Cancel"
      onConfirm={() => void nudge()}
    >
      <Button type="link" size={size} loading={loading} style={{ padding: 0, height: 'auto' }}>
        Send reminder
      </Button>
    </Popconfirm>
  );
};

export function delegateTargetLabel(record: any): string | null {
  if (!record?.delegatedToType) return null;

  const dbName =
    record.delegatedAssigneeName != null
      ? String(record.delegatedAssigneeName).trim()
      : '';
  if (!dbName) return null;

  if (record.delegatedToType === 'admin') return dbName;
  if (dbName === CUSTOMER_PERSONNEL_MASK_LABEL) return dbName;
  return formatPersonnelAssigneeLabel(dbName, record.delegatedAssigneeRole);
}

type CellProps = {
  record: any;
  profileType: number;
  onUpdated?: (payload?: Record<string, unknown>) => void;
  onDelegate?: () => void;
};

export const FaultDelegateToCell: React.FC<CellProps> = ({
  record,
  profileType,
  onDelegate,
}) => {
  const faultId = reportFaultIdOf(record);
  const canDelegate =
    canManageFaultDelegation(record, profileType) && Boolean(faultId);

  const label = delegateTargetLabel(record);

  if (!label) {
    if (canDelegate && onDelegate) {
      return (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto' }}
          onClick={onDelegate}
        >
          Assign to
        </Button>
      );
    }
    return <span style={{ color: '#8c8c8c' }}>Not assigned</span>;
  }

  if (canDelegate && onDelegate) {
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto' }}
          onClick={onDelegate}
        >
          Change
        </Button>
      </span>
    );
  }

  return <span>{label}</span>;
};

export const FaultStatusCell: React.FC<CellProps> = ({
  record,
  profileType,
  onUpdated,
}) => {
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const markCompleted = useCallback(async () => {
    const faultId = reportFaultIdOf(record);
    if (!faultId) return;
    setCompleting(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/complete`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        onUpdated?.(res.data);
        message.success('Fault report marked as completed');
      } else {
        message.error(res?.message || 'Could not mark as completed');
      }
    } finally {
      setCompleting(false);
    }
  }, [record, onUpdated]);

  const markReopened = useCallback(async () => {
    const faultId = reportFaultIdOf(record);
    if (!faultId) return;
    setReopening(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/reopen`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        onUpdated?.(res.data);
        message.success('Fault report set back to pending');
      } else {
        message.error(res?.message || 'Could not reopen fault');
      }
    } finally {
      setReopening(false);
    }
  }, [record, onUpdated]);

  if (completing || reopening) {
    return <Spin size="small" />;
  }

  const outcome = record?.delegatedToType ? delegationOutcomeOf(record) : null;
  const listStatus = faultListStatusOf(record);
  const isFaultCompleted = listStatus === 'completed';
  const canManageFaultStatus =
    profileType === userType.CUSTOMER || profileType === userType.ADMIN;
  const canMarkFromList =
    canManageFaultStatus &&
    !isFaultCompleted &&
    (outcome === 'pending' || outcome === 'viewed' || outcome === 'not_done' || !record?.delegatedToType);
  const canReopenFromList =
    canManageFaultStatus &&
    (isFaultCompleted || outcome === 'done_on_time' || outcome === 'done_late');

  const confirmTitle = (
    <span>
      Mark this fault report as completed?
      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
        Confirm the issue is resolved. Delegation status will update if applicable.
      </div>
    </span>
  );
  const reopenTitle = (
    <span>
      Set back to pending?
      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
        The fault will show as pending again. Use this if it was marked completed by mistake.
      </div>
    </span>
  );

  if (!record?.delegatedToType) {
    if (canMarkFromList) {
      return (
        <Popconfirm
          title={confirmTitle}
          okText="Mark completed"
          cancelText="Cancel"
          onConfirm={() => void markCompleted()}
        >
          <span
            role="button"
            tabIndex={0}
            title="Click to mark as completed"
            style={{ cursor: 'pointer', display: 'inline-flex' }}
          >
            <FaultListStatusBadge record={record} style={{ cursor: 'pointer' }} />
          </span>
        </Popconfirm>
      );
    }
    if (canManageFaultStatus && +record.status === reportFaultStatus.COMPLETED) {
      return (
        <Popconfirm
          title={reopenTitle}
          okText="Back to pending"
          cancelText="Cancel"
          onConfirm={() => void markReopened()}
        >
          <span
            role="button"
            tabIndex={0}
            title="Click to set back to pending"
            style={{ cursor: 'pointer', display: 'inline-flex' }}
          >
            <FaultListStatusBadge record={record} style={{ cursor: 'pointer' }} />
          </span>
        </Popconfirm>
      );
    }
    return <FaultListStatusBadge record={record} />;
  }

  if (!outcome) return <FaultListStatusBadge record={record} />;

  if (canReopenFromList) {
    return (
      <Popconfirm
        title={reopenTitle}
        okText="Back to pending"
        cancelText="Cancel"
        onConfirm={() => void markReopened()}
      >
        <span
          role="button"
          tabIndex={0}
          title="Click to set back to pending"
          style={{ cursor: 'pointer', display: 'inline-flex' }}
        >
          <FaultListStatusBadge record={record} style={{ cursor: 'pointer' }} />
        </span>
      </Popconfirm>
    );
  }

  if (canMarkFromList) {
    return (
      <Popconfirm
        title={confirmTitle}
        okText="Mark completed"
        cancelText="Cancel"
        onConfirm={() => void markCompleted()}
      >
        <span
          role="button"
          tabIndex={0}
          title="Click to mark as completed"
          style={{ cursor: 'pointer', display: 'inline-flex' }}
        >
          <FaultListStatusBadge record={record} style={{ cursor: 'pointer' }} />
        </span>
      </Popconfirm>
    );
  }

  return <FaultListStatusBadge record={record} />;
};
