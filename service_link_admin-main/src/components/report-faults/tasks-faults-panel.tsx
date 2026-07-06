import {
  FaultDelegateToCell,
  FaultNudgeAssigneeButton,
  FaultStatusCell,
} from '@app/components/report-faults/fault-delegation-cell';
import FaultReportViewModal from '@app/components/report-faults/fault-report-view';
import FaultDelegationModal from '@app/components/report-faults/fault-delegation-modal';
import { dateTimeFormat } from '@app/config/data.config';
import { Alert, Button, Spin, Table, Tag, Tooltip, message } from 'antd';
import { EyeOutlined, ThunderboltFilled } from '@ant-design/icons';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import dashboardActions from '@app/redux/dashboard/actions';
import {
  summarizeIncompleteFaults,
  IncompleteFaultSummary,
} from '@app/components/report-faults/fault-incomplete-notices';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { reportFaultStatus, userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';
import { reportFaultIdOf } from './report-fault-id';

const formatFaultDate = (value: string | Date | null | undefined) =>
  value ? moment(value).utcOffset(600).format(dateTimeFormat) : '—';

const buildUrgentTableRows = (rows: any[], rowByFaultId: Record<number, any>) => {
  const seen = new Set<number>();
  const result: Array<{
    key: number;
    id: number;
    issue: string;
    siteName: string;
    isUrgent: boolean;
    record: any;
  }> = [];
  for (const r of rows) {
    const id = reportFaultIdOf(r);
    if (!id || seen.has(id) || +r.priority !== 1) continue;
    seen.add(id);
    const record = rowByFaultId[id] ?? r;
    result.push({
      key: id,
      id,
      issue: String(record.issue || record.subject || `Fault #${id}`).trim(),
      siteName: String(record.siteName || '').trim(),
      isUrgent: true,
      record,
    });
  }
  return result;
};

const TasksFaultsPanel: React.FC<{ tabsAboveTable?: React.ReactNode }> = ({ tabsAboveTable }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [rowByFaultId, setRowByFaultId] = useState<Record<number, any>>({});
  const [viewFaultOpen, setViewFaultOpen] = useState(false);
  const [viewFaultRow, setViewFaultRow] = useState<any | null>(null);
  const [delegateRecord, setDelegateRecord] = useState<any | null>(null);

  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;
  const isAdmin = profileType === userType.ADMIN;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const faultsRes = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/findAllGroupByDate`,
        'GET',
        {
          keyword: '',
          page: 1,
          limit: 0,
          orderBy: 'createdAt',
          orderValue: 'DESC',
          status: 0,
          priority: 1,
          startDate: '',
          endDate: '',
        },
      );
      if (faultsRes?.code !== 1) {
        message.error(faultsRes?.message || 'Could not load urgent fault reports');
        setRows([]);
        setRowByFaultId({});
        return;
      }
      const list = Array.isArray(faultsRes?.data?.rows) ? faultsRes.data.rows : [];
      setRows(list);
      const map: Record<number, any> = {};
      for (const r of list) {
        const id = reportFaultIdOf(r);
        if (id && !map[id]) map[id] = r;
      }
      setRowByFaultId(map);
    } catch {
      setRows([]);
      setRowByFaultId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchFaultRow = useCallback((faultId: number, patch: Record<string, unknown>) => {
    setRows((prev) =>
      prev.map((r) => (reportFaultIdOf(r) === faultId ? { ...r, ...patch } : r)),
    );
    setRowByFaultId((prev) => {
      const existing = prev[faultId];
      if (!existing) return prev;
      return { ...prev, [faultId]: { ...existing, ...patch } };
    });
    setViewFaultRow((prev) =>
      prev && reportFaultIdOf(prev) === faultId ? { ...prev, ...patch } : prev,
    );
  }, []);

  const onDelegationUpdated = useCallback(
    (payload?: Record<string, unknown>) => {
      if (payload?.id == null) {
        void load();
        return;
      }
      const faultId = +payload.id;
      const patch = {
        status: payload.status,
        delegatedActedAt: payload.delegatedActedAt,
        delegationViewedAt: payload.delegationViewedAt,
        delegationOutcome: payload.delegationOutcome,
      };
      if (+patch.status === reportFaultStatus.COMPLETED) {
        patchFaultRow(faultId, patch);
        return;
      }
      patchFaultRow(faultId, patch);
    },
    [load, patchFaultRow],
  );

  const onDelegationSaved = useCallback(
    (delegation?: Record<string, unknown>) => {
      if (delegation?.id == null) return;
      const faultId = +delegation.id;
      patchFaultRow(faultId, {
        delegatedToType: delegation.delegatedToType,
        delegatedToPersonnelId: delegation.delegatedToPersonnelId,
        delegatedToStaffId: delegation.delegatedToStaffId,
        delegatedUntil: delegation.delegatedUntil,
        delegationNote: delegation.delegationNote,
        delegatedAt: delegation.delegatedAt,
        delegatedBy: delegation.delegatedBy,
        delegatedActedAt: delegation.delegatedActedAt,
        delegationViewedAt: delegation.delegationViewedAt,
        delegationOutcome: delegation.delegationOutcome,
        delegatedAssigneeName: delegation.delegatedAssigneeName,
        delegatedAssigneeRole: delegation.delegatedAssigneeRole,
      });
    },
    [patchFaultRow],
  );

  const onFaultCompleted = useCallback(
    (payload?: Record<string, unknown>) => {
      if (payload?.id == null) return;
      const faultId = +payload.id;
      const patch = {
        status: payload.status,
        delegatedActedAt: payload.delegatedActedAt,
        delegationViewedAt: payload.delegationViewedAt,
        delegationOutcome: payload.delegationOutcome,
      };
      if (+patch.status === reportFaultStatus.COMPLETED) {
        setViewFaultOpen(false);
        setViewFaultRow(null);
        patchFaultRow(faultId, patch);
        return;
      }
      patchFaultRow(faultId, patch);
    },
    [patchFaultRow],
  );

  const onPriorityUpdated = useCallback(
    (payload?: { id?: number; priority?: number }) => {
      if (payload?.id == null || payload.priority == null) return;
      const faultId = +payload.id;
      if (+payload.priority !== 1) {
        setRows((prev) => prev.filter((r) => reportFaultIdOf(r) !== faultId));
        setRowByFaultId((prev) => {
          const next = { ...prev };
          delete next[faultId];
          return next;
        });
        setViewFaultOpen(false);
        setViewFaultRow(null);
        return;
      }
      patchFaultRow(faultId, { priority: payload.priority });
    },
    [patchFaultRow],
  );

  const openFaultView = useCallback((record: any) => {
    setViewFaultRow(record);
    setViewFaultOpen(true);
    const faultId = reportFaultIdOf(record);
    if (!faultId) return;
    const markPath =
      profileType === userType.ADMIN
        ? `${endPoint.REPORT_FAULTS}/markAdminOpened/${faultId}`
        : profileType === userType.CUSTOMER
          ? `${endPoint.REPORT_FAULTS}/markCustomerOpened/${faultId}`
          : null;
    if (!markPath) return;
    void (async () => {
      const res = await callAPIAsync(serviceType.COMMON, markPath, 'PATCH', {});
      if (res?.code === 1) {
        dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
      }
    })();
  }, [profileType, dispatch]);

  const closeFaultView = useCallback(() => {
    setViewFaultOpen(false);
    setViewFaultRow(null);
  }, []);

  const summary: IncompleteFaultSummary = useMemo(
    () => summarizeIncompleteFaults(rows, { urgentOnly: true }),
    [rows],
  );

  const tableRows = useMemo(
    () => buildUrgentTableRows(rows, rowByFaultId),
    [rows, rowByFaultId],
  );

  const alertType =
    summary.overdue > 0 ? 'error' : summary.awaitingDelegate > 0 ? 'warning' : 'info';

  return (
    <div style={{ padding: '0 4px' }}>
      <p style={{ margin: '0 0 16px', color: '#595959', maxWidth: 720 }}>
        All urgent fault reports — delegate, track delegation, or mark completed. New urgent
        reports appear here automatically.
      </p>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : tableRows.length === 0 ? (
        <>
          {tabsAboveTable}
          <Alert
            type="success"
            showIcon
            message="No urgent fault reports"
            description="When a report is marked urgent, it will appear in this list."
          />
        </>
      ) : (
        <>
          {summary.incomplete === 0 ? (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 20 }}
              message="All urgent fault reports are completed"
              description="Completed urgent reports remain listed below for reference."
            />
          ) : (
            <Alert
              type={alertType}
              showIcon
              style={{ marginBottom: 20 }}
              message={
                summary.incomplete === 1
                  ? '1 urgent fault report not completed'
                  : `${summary.incomplete} urgent fault reports not completed`
              }
              description={
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                  {summary.overdue > 0 ? (
                    <li>
                      <strong>{summary.overdue}</strong> overdue — act-by deadline passed
                    </li>
                  ) : null}
                  {summary.awaitingByAssignee.map(({ count, assigneeName }) => (
                    <li key={assigneeName}>
                      <strong>{count}</strong> awaiting action from {assigneeName}
                    </li>
                  ))}
                  {summary.openNoDelegation > 0 ? (
                    <li>
                      <strong>{summary.openNoDelegation}</strong> open — not assigned yet
                    </li>
                  ) : null}
                </ul>
              }
            />
          )}

          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#595959', maxWidth: 720 }}>
            In the <strong>Assigned to</strong> column, click to assign{' '}
            {isAdmin ? 'my personnel or directory staff' : 'personnel or your service provider'}.
            In <strong>Status</strong>, click <strong>Pending</strong> to mark completed, or{' '}
            <strong>Done on time</strong> to set back to pending.
          </p>

          {tabsAboveTable}

          <Table
            rowKey="key"
            dataSource={tableRows}
            pagination={false}
            columns={[
              {
                title: 'Reported',
                key: 'createdAt',
                width: 160,
                render: (_: unknown, r: any) => {
                  const t = r.record?.createdAt;
                  return t ? moment(t).utcOffset(600).format(dateTimeFormat) : '—';
                },
              },
              { title: 'Site', dataIndex: 'siteName', render: (v) => v || '—' },
              {
                title: 'Issue',
                dataIndex: 'issue',
                render: (v: string, r: any) => (
                  <>
                    {r.isUrgent ? (
                      <Tag color="red" style={{ marginRight: 6 }}>
                        <ThunderboltFilled /> Urgent
                      </Tag>
                    ) : null}
                    {v}
                  </>
                ),
              },
              {
                title: 'Assigned to',
                key: 'delegateTo',
                width: 160,
                render: (_: unknown, r: any) => {
                  if (!r.record) return '—';
                  return (
                    <FaultDelegateToCell
                      record={r.record}
                      profileType={profileType}
                      onDelegate={() => setDelegateRecord(r.record)}
                    />
                  );
                },
              },
              {
                title: 'Assigned',
                key: 'delegatedAt',
                width: 150,
                render: (_: unknown, r: any) =>
                  r.record?.delegatedToType && r.record?.delegatedAt
                    ? formatFaultDate(r.record.delegatedAt)
                    : '—',
              },
              {
                title: 'Complete by',
                key: 'delegatedUntil',
                width: 150,
                render: (_: unknown, r: any) => {
                  const until = r.record?.delegatedUntil;
                  if (!r.record?.delegatedToType || !until) return '—';
                  const overdue =
                    r.record?.delegatedToType &&
                    !r.record?.delegatedActedAt &&
                    new Date(until).getTime() < Date.now();
                  return (
                    <span style={overdue ? { color: '#cf1322', fontWeight: 500 } : undefined}>
                      {formatFaultDate(until)}
                    </span>
                  );
                },
              },
              {
                title: 'Status',
                key: 'status',
                width: 200,
                render: (_: unknown, r: any) =>
                  r.record ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <FaultStatusCell
                        record={r.record}
                        profileType={profileType}
                        onUpdated={onDelegationUpdated}
                      />
                      <FaultNudgeAssigneeButton record={r.record} profileType={profileType} />
                    </div>
                  ) : (
                    '—'
                  ),
              },
              {
                title: 'Action',
                key: 'action',
                width: 72,
                align: 'center' as const,
                render: (_: unknown, r: any) => (
                  <Tooltip title="View fault">
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      aria-label="View fault"
                      disabled={!r.record}
                      onClick={() => r.record && openFaultView(r.record)}
                    />
                  </Tooltip>
                ),
              },
            ]}
          />
        </>
      )}

      <FaultReportViewModal
        open={viewFaultOpen}
        onClose={closeFaultView}
        record={viewFaultRow}
        viewerType={profileType}
        onPriorityUpdated={onPriorityUpdated}
        staffUserId={profile?.id}
        onDelegationSaved={onDelegationSaved}
        onFaultCompleted={onFaultCompleted}
      />

      {delegateRecord && reportFaultIdOf(delegateRecord) ? (
        <FaultDelegationModal
          open
          onClose={() => setDelegateRecord(null)}
          faultId={reportFaultIdOf(delegateRecord)!}
          record={delegateRecord}
          viewerType={profileType}
          onSaved={(delegation) => {
            onDelegationSaved(delegation);
            setDelegateRecord(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default TasksFaultsPanel;
