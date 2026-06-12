import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Popconfirm, Select, Space, Spin } from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { TableWrapper } from '@app/components/common/Common.styles';
import { notificationComponent } from '@app/components/common/Notification/index';
import endPoint from '@app/constants/endPoint';
import errorCode from '@app/constants/errorCode';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { checkRole } from '@app/library/helpers/utility';
import { isPersistedDbId } from '@app/library/helpers/persistedRecordId';
import {
  GROUND_MAINTENANCE_MONTH_LABELS,
  ScheduleMonthValue,
  getScheduleMonthSelectOptions,
  formatScheduleCell,
  isGroundMaintenanceDailyEnabled,
  normalizeScheduleMonthValue,
  parseScheduleMonthOption,
  scheduleCellClassName,
} from '@app/library/helpers/groundMaintenanceSchedule';
import {
  clampScheduleMonthsToActive,
  isSiteItemMonthActiveForFrequency,
} from '@app/library/helpers/siteItemFrequencyActiveMonths';

type ScheduleRow = {
  id: number;
  activityId: number;
  activityName: string;
  months: ScheduleMonthValue[];
};

type Props = {
  siteId: number;
  siteItemId: number;
  className?: string;
  embedded?: boolean;
  compactLegend?: boolean;
  disabled?: boolean;
  activeMonthIndices?: number[] | null;
  monthRestrictionHint?: string | null;
  onLoaded?: (rowCount: number) => void;
  onMutated?: () => void;
};

function normalizeMonths(months: ScheduleMonthValue[] | undefined): ScheduleMonthValue[] {
  const m = (months ?? []).slice(0, 12).map((v) => normalizeScheduleMonthValue(v));
  while (m.length < 12) m.push(null);
  return m.slice(0, 12);
}

function mapScheduleRows(raw: ScheduleRow[]): ScheduleRow[] {
  return raw.map((r) => ({
    id: r.id,
    activityId: r.activityId,
    activityName: r.activityName,
    months: normalizeMonths(r.months),
  }));
}

function apiErrorMessage(res: { message?: string } | null | undefined, fallback: string): string {
  return res?.message?.trim() || fallback;
}

const GroundMaintenanceScheduleGrid: React.FC<Props> = ({
  siteId,
  siteItemId,
  className = 'job-sites-schedule-table',
  embedded = false,
  compactLegend = false,
  disabled: disabledProp = false,
  activeMonthIndices = null,
  monthRestrictionHint = null,
  onLoaded,
  onMutated,
}) => {
  const mountedRef = useRef(true);
  const canEdit = (checkRole('ADMIN') || checkRole('EDIT')) && !disabledProp;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyScheduleResponse = useCallback((data: { rows?: ScheduleRow[] }) => {
    if (!mountedRef.current) return;
    const mapped = mapScheduleRows(data?.rows ?? []);
    setRows(mapped);
    setDirty(false);
    onLoaded?.(mapped.length);
  }, [onLoaded]);

  const loadSchedules = useCallback(async () => {
    if (!siteId || !isPersistedDbId(siteItemId)) {
      if (mountedRef.current) {
        setRows([]);
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/getGroundMaintenanceSchedules`,
        'GET',
        { siteId, siteItemId },
      );
      if (!mountedRef.current) return;
      if (res?.code === errorCode.SUCCESS) {
        applyScheduleResponse(res.data ?? {});
      } else {
        setRows([]);
        setError(apiErrorMessage(res, 'Could not load schedule'));
      }
    } catch {
      if (mountedRef.current) {
        setRows([]);
        setError('Could not load schedule');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [siteId, siteItemId, applyScheduleResponse]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const updateCell = useCallback((rowId: number, monthIdx: number, value: ScheduleMonthValue) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const months = normalizeMonths(r.months);
        months[monthIdx] = value;
        return { ...r, months };
      }),
    );
    setDirty(true);
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const payloadRows = rows.map((r) => {
        const months = normalizeMonths(r.months);
        const clamped = clampScheduleMonthsToActive(
          months,
          activeMonthIndices ?? null,
        ) as ScheduleMonthValue[];
        return { id: r.id, months: normalizeMonths(clamped) };
      });
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/updateGroundMaintenanceSchedules`,
        'PUT',
        {
          siteId,
          siteItemId,
          rows: payloadRows,
        },
      );
      if (!mountedRef.current) return;
      if (res?.code === errorCode.SUCCESS) {
        applyScheduleResponse(res.data ?? {});
        onMutated?.();
        notificationComponent('success', 3, 'Schedule saved', '');
      } else {
        notificationComponent('error', 3, apiErrorMessage(res, 'Save failed'), '');
      }
    } catch {
      if (mountedRef.current) {
        notificationComponent('error', 3, 'Save failed', '');
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const onAddActivity = async (activityName: string) => {
    if (!isPersistedDbId(siteItemId) || !siteId) {
      notificationComponent('error', 3, 'Save the site first, then add activities', '');
      return;
    }
    const name = activityName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/addGroundMaintenanceScheduleRow`,
        'POST',
        {
          siteId,
          siteItemId,
          activityName: name,
        },
      );
      if (!mountedRef.current) return;
      if (res?.code === errorCode.SUCCESS) {
        applyScheduleResponse(res.data ?? {});
        onMutated?.();
        setNewActivityName('');
        notificationComponent('success', 3, 'Activity added to this site', '');
      } else {
        notificationComponent('error', 3, apiErrorMessage(res, 'Could not add activity'), '');
      }
    } catch {
      if (mountedRef.current) {
        notificationComponent('error', 3, 'Could not add activity', '');
      }
    } finally {
      if (mountedRef.current) setAdding(false);
    }
  };

  const onRemoveActivity = useCallback(async (scheduleId: number) => {
    setRemovingId(scheduleId);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/removeGroundMaintenanceScheduleRow`,
        'DELETE',
        { siteId, siteItemId, scheduleId },
      );
      if (!mountedRef.current) return;
      if (res?.code === errorCode.SUCCESS) {
        applyScheduleResponse(res.data ?? {});
        onMutated?.();
        notificationComponent('success', 3, 'Activity removed', '');
      } else {
        notificationComponent('error', 3, apiErrorMessage(res, 'Could not remove activity'), '');
      }
    } catch {
      if (mountedRef.current) {
        notificationComponent('error', 3, 'Could not remove activity', '');
      }
    } finally {
      if (mountedRef.current) setRemovingId(null);
    }
  }, [siteId, siteItemId, applyScheduleResponse, onMutated]);

  const columns = useMemo(() => {
    const monthSelectOptions = getScheduleMonthSelectOptions();
    const monthCols = GROUND_MAINTENANCE_MONTH_LABELS.map((label, idx) => {
      const monthActive = isSiteItemMonthActiveForFrequency(idx, activeMonthIndices ?? null);
      return {
      title: label,
      dataIndex: `month_${idx}`,
      width: canEdit ? 72 : 44,
      align: 'center' as const,
      className: monthActive ? undefined : 'gm-schedule-month--inactive',
      onHeaderCell: () =>
        monthActive ? {} : { className: 'gm-schedule-month--inactive' },
      onCell: () =>
        monthActive ? {} : { className: 'gm-schedule-month--inactive' },
      render: (_: unknown, row: ScheduleRow) => {
        const months = normalizeMonths(row.months);
        const value = months[idx] ?? null;
        if (!monthActive) {
          return (
            <span className="gm-schedule-month-off" title="Outside simple repeat">
              —
            </span>
          );
        }
        if (canEdit) {
          return (
            <Select
              size="small"
              className="gm-schedule-select"
              value={value ?? ''}
              placeholder="—"
              options={monthSelectOptions}
              onChange={(v) => updateCell(row.id, idx, parseScheduleMonthOption(v))}
              dropdownMatchSelectWidth={false}
              aria-label={`${row.activityName} ${label}`}
            />
          );
        }
        return (
          <span className={scheduleCellClassName(value)}>
            {formatScheduleCell(value)}
          </span>
        );
      },
    };
    });

    const cols: any[] = [
      {
        title: 'Activity',
        dataIndex: 'activityName',
        width: 220,
        fixed: 'left' as const,
        render: (text: string) => <span className="gm-schedule-activity">{text}</span>,
      },
      ...monthCols,
    ];

    if (canEdit) {
      cols.push({
        title: 'Remove',
        key: 'actions',
        width: 56,
        fixed: 'right' as const,
        align: 'center' as const,
        render: (_: unknown, row: ScheduleRow) => (
          <Popconfirm
            title={`Remove "${row.activityName}" from this site only?`}
            okText="Remove"
            cancelText="Cancel"
            onConfirm={() => onRemoveActivity(row.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={removingId === row.id}
              aria-label={`Remove ${row.activityName} from this site`}
            />
          </Popconfirm>
        ),
      });
    }

    return cols;
  }, [canEdit, updateCell, removingId, onRemoveActivity, activeMonthIndices]);

  const addActivityBar = canEdit ? (
    <div className="gm-schedule-add-bar">
      <Space wrap size={8} className="gm-schedule-add-bar__controls">
        <Input
          placeholder="Activity name"
          style={{ width: 220 }}
          value={newActivityName}
          onChange={(e) => setNewActivityName(e.target.value)}
          onPressEnter={() => void onAddActivity(newActivityName)}
          disabled={adding}
        />
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          loading={adding}
          disabled={!newActivityName.trim() || adding}
          onClick={() => void onAddActivity(newActivityName)}
        >
          Add
        </Button>
      </Space>
      <p className="gm-schedule-add-bar__hint">
        Activities are per site — names on this site do not affect other sites.
      </p>
    </div>
  ) : null;

  const saveButton = canEdit ? (
    <Button
      type="default"
      size="small"
      icon={<SaveOutlined />}
      loading={saving}
      disabled={!dirty || saving || !rows.length}
      onClick={onSave}
    >
      Save schedule
    </Button>
  ) : null;

  if (loading) {
    return (
      <div className="gm-schedule-wrap">
        <Spin size="small" />
      </div>
    );
  }

  if (error) {
    return <div className="gm-schedule-wrap gm-schedule-wrap--error">{error}</div>;
  }

  return (
    <div className={`gm-schedule-wrap${embedded ? ' gm-schedule-wrap--embedded' : ''}`}>
      {!embedded ? (
        <div className="gm-schedule-wrap__header">
          <p className="gm-schedule-wrap__title">Annual maintenance schedule</p>
          {canEdit ? (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!dirty || saving || !rows.length}
              onClick={onSave}
            >
              Save schedule
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="gm-schedule-wrap__header gm-schedule-wrap__header--embedded">
          <Space wrap size={8} className="gm-schedule-wrap__toolbar">
            {addActivityBar}
            {saveButton}
          </Space>
        </div>
      )}

      {!embedded ? addActivityBar : null}

      {monthRestrictionHint ? (
        <p className="gm-schedule-month-hint">{monthRestrictionHint}</p>
      ) : null}

      {!rows.length ? (
        <div className="gm-schedule-wrap--empty">
          No activities on this site yet. Type a name and click <strong>Add</strong>.
        </div>
      ) : (
        <TableWrapper
          className={className}
          columns={columns}
          dataSource={rows.map((r) => ({ ...r, key: r.id ?? r.activityId }))}
          pagination={false}
          scroll={{ x: canEdit ? 1180 : 860 }}
          size="small"
        />
      )}

      <p className={`gm-schedule-legend${compactLegend ? ' gm-schedule-legend--compact' : ''}`}>
        <span><strong>W</strong> weekly</span>
        <span><strong>M</strong> monthly</span>
        <span><strong>F</strong> fortnightly</span>
        {isGroundMaintenanceDailyEnabled() ? (
          <span><strong>D</strong> daily</span>
        ) : null}
        <span><strong>—</strong> not scheduled</span>
      </p>
    </div>
  );
};

export default GroundMaintenanceScheduleGrid;
