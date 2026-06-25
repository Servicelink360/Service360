import { FlagOutlined, ThunderboltFilled } from '@ant-design/icons';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { reportFaultStatus, userType } from '@app/constants/statusUser';
import { callAPIAsync } from '@app/lib/helpers/api';
import { Popconfirm, Spin, Tooltip, message } from 'antd';
import React, { useCallback, useState } from 'react';

type PillTone = { bg: string; border: string; color: string };

const BADGE_PALETTE = {
  urgent: { bg: '#fff1f0', border: '#ff4d4f', color: '#cf1322' } satisfies PillTone,
  normal: { bg: '#f0f5ff', border: '#adc6ff', color: '#1d39c4' } satisfies PillTone,
} as const;

const pillBadge = (
  icon: React.ReactNode,
  label: string,
  tone: PillTone,
  title?: string,
  large?: boolean,
  small?: boolean,
) => {
  const textSize = small ? 9.6 : large ? 14.4 : 12;
  const iconSize = small ? 11.2 : large ? 16.8 : 14;
  const pad = small ? '3px 8px' : large ? '5px 12px' : '4px 10px';
  const gap = small ? 4 : 6;
  const inner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        padding: pad,
        borderRadius: 16,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.color,
        fontSize: textSize,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', fontSize: iconSize, color: tone.color }}>
        {icon}
      </span>
      {label}
    </span>
  );
  return <Tooltip title={title ?? label}>{inner}</Tooltip>;
};

export const renderFaultPriority = (
  priority: number | undefined,
  large?: boolean,
  small?: boolean,
) => {
  if (+priority === 1) {
    return pillBadge(
      <ThunderboltFilled />,
      'Urgent',
      BADGE_PALETTE.urgent,
      undefined,
      large,
      small,
    );
  }
  if (+priority === 2 || priority == null) {
    return pillBadge(
      <FlagOutlined />,
      'Normal',
      BADGE_PALETTE.normal,
      undefined,
      large,
      small,
    );
  }
  return '—';
};

const reportFaultIdOf = (record: any) => record?.reportFaultId ?? record?.id;

export function canManageFaultPriority(
  record: any,
  profileType: number,
  options?: { isDeletedTab?: boolean; staffUserId?: number },
): boolean {
  if (options?.isDeletedTab || +record?.status === reportFaultStatus.DELETED) return false;
  if (profileType === userType.ADMIN || profileType === userType.CUSTOMER) return true;
  if (profileType === userType.STAFF && options?.staffUserId) {
    return +record?.staffId === +options.staffUserId;
  }
  return false;
};

type CellProps = {
  record: any;
  profileType: number;
  isDeletedTab?: boolean;
  staffUserId?: number;
  large?: boolean;
  small?: boolean;
  onUpdated?: (payload?: { id?: number; priority?: number }) => void;
};

export const FaultPriorityCell: React.FC<CellProps> = ({
  record,
  profileType,
  isDeletedTab = false,
  staffUserId,
  large,
  small,
  onUpdated,
}) => {
  const [saving, setSaving] = useState(false);
  const faultId = reportFaultIdOf(record);
  const currentPriority = +record?.priority === 1 ? 1 : 2;
  const nextPriority = currentPriority === 1 ? 2 : 1;
  const canManage = canManageFaultPriority(record, profileType, { isDeletedTab, staffUserId });

  const applyPriority = useCallback(async () => {
    if (!faultId) return;
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/priority`,
        'PATCH',
        { priority: nextPriority },
      );
      if (res?.code === 1) {
        onUpdated?.({ id: faultId, priority: nextPriority });
        message.success(
          nextPriority === 1 ? 'Priority set to Urgent' : 'Priority set to Normal',
        );
      } else {
        message.error(res?.message || 'Could not update priority');
      }
    } finally {
      setSaving(false);
    }
  }, [faultId, nextPriority, onUpdated]);

  const badge = renderFaultPriority(currentPriority, large, small);

  if (!canManage || !faultId) {
    return <>{badge}</>;
  }

  if (saving) {
    return <Spin size="small" />;
  }

  const confirmTitle =
    nextPriority === 1 ? (
      <span>
        Change priority to <strong>Urgent</strong>?
        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
          This fault will appear in Urgent reports.
        </div>
      </span>
    ) : (
      <span>
        Change priority to <strong>Normal</strong>?
        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
          This fault will no longer appear in Urgent reports.
        </div>
      </span>
    );

  return (
    <Popconfirm
      title={confirmTitle}
      okText={nextPriority === 1 ? 'Set Urgent' : 'Set Normal'}
      cancelText="Cancel"
      onConfirm={() => void applyPriority()}
    >
      <span
        role="button"
        tabIndex={0}
        title="Click to change priority"
        style={{ cursor: 'pointer', display: 'inline-flex' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
      >
        {badge}
      </span>
    </Popconfirm>
  );
};
