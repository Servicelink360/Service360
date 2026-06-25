import { FaultListStatusBadge } from '@app/components/report-faults/delegation-outcome';
import FaultReportViewModal from '@app/components/report-faults/fault-report-view';
import Layout from '@app/components/layout/Layout';
import { dateTimeFormat } from '@app/config/data.config';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { userType } from '@app/constants/statusUser';
import useMobilePortrait from '@app/library/hooks/useMobilePortrait';
import { callAPIAsync } from '@app/library/helpers/api';
import { EyeOutlined, ThunderboltFilled } from '@ant-design/icons';
import { Alert, Button, Spin, Table, Tag, Tooltip } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './staff-my-tasks.css';

const formatDateTime = (value?: string | null) =>
  value ? moment(value).format(dateTimeFormat) : '—';

const StaffMyTasksPage: React.FC = () => {
  const history = useHistory();
  const isMobilePortrait = useMobilePortrait();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [viewRow, setViewRow] = useState<any | null>(null);

  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/my-tasks`,
        'GET',
        {},
      );
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileType !== userType.STAFF) {
      history.replace('/dashboard');
      return;
    }
    void load();
  }, [load, profileType, history]);

  const openFault = async (row: any) => {
    const faultId = row?.reportFaultId ?? row?.id;
    if (!faultId) return;
    void callAPIAsync(
      serviceType.COMMON,
      `${endPoint.REPORT_FAULTS}/${faultId}/staff-view`,
      'PATCH',
      {},
    );
    setViewRow(row);
  };

  const onFaultUpdated = useCallback(
    (payload?: Record<string, unknown>) => {
      if (payload?.id == null) {
        void load();
        return;
      }
      const faultId = +payload.id;
      setRows((prev) =>
        prev.map((r) =>
          (r.reportFaultId ?? r.id) === faultId
            ? {
                ...r,
                delegatedActedAt: payload.delegatedActedAt ?? r.delegatedActedAt,
                delegationViewedAt: payload.delegationViewedAt ?? r.delegationViewedAt,
                delegationOutcome: payload.delegationOutcome ?? r.delegationOutcome,
              }
            : r,
        ),
      );
      setViewRow((prev) =>
        prev && (prev.reportFaultId ?? prev.id) === faultId
          ? {
              ...prev,
              delegatedActedAt: payload.delegatedActedAt ?? prev.delegatedActedAt,
              delegationViewedAt: payload.delegationViewedAt ?? prev.delegationViewedAt,
              delegationOutcome: payload.delegationOutcome ?? prev.delegationOutcome,
            }
          : prev,
      );
    },
    [load],
  );

  const onPriorityUpdated = useCallback((payload?: { id?: number; priority?: number }) => {
    if (payload?.id == null || payload.priority == null) return;
    const faultId = +payload.id;
    setRows((prev) =>
      prev.map((r) =>
        (r.reportFaultId ?? r.id) === faultId ? { ...r, priority: payload.priority } : r,
      ),
    );
    setViewRow((prev) =>
      prev && (prev.reportFaultId ?? prev.id) === faultId
        ? { ...prev, priority: payload.priority }
        : prev,
    );
  }, []);

  const pendingCount = rows.filter((r) => !r.delegatedActedAt).length;
  const overdueCount = rows.filter((r) => {
    if (r.delegatedActedAt || !r.delegatedUntil) return false;
    return new Date(r.delegatedUntil).getTime() < Date.now();
  }).length;

  const columns = useMemo(
    () => [
      {
        title: 'Reported',
        dataIndex: 'createdAt',
        width: 150,
        render: (v: string) => formatDateTime(v),
      },
      {
        title: 'Site',
        dataIndex: 'siteName',
        ellipsis: true,
      },
      {
        title: 'Issue',
        dataIndex: 'issue',
        render: (v: string, r: any) => (
          <>
            {+r.priority === 1 ? (
              <Tag color="red" style={{ marginRight: 6 }}>
                <ThunderboltFilled /> Urgent
              </Tag>
            ) : null}
            {v || '—'}
          </>
        ),
      },
      {
        title: 'Act by',
        dataIndex: 'delegatedUntil',
        width: 150,
        render: (v: string) => formatDateTime(v),
      },
      {
        title: 'Status',
        key: 'status',
        width: 160,
        render: (_: unknown, r: any) => <FaultListStatusBadge record={r} />,
      },
      {
        title: 'Action',
        key: 'action',
        width: 72,
        align: 'center' as const,
        render: (_: unknown, r: any) => (
          <Tooltip title="View task">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              aria-label="View task"
              onClick={() => void openFault(r)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const renderMobileCard = (row: any) => {
    const rowKey = String(row.reportFaultId ?? row.id);
    const issue = row.issue || '—';
    const siteName = row.siteName || '';

    return (
      <article
        key={rowKey}
        className="staff-my-tasks-card"
        onClick={() => void openFault(row)}
      >
        <div className="staff-my-tasks-card__head">
          <div className="staff-my-tasks-card__title-wrap">
            {+row.priority === 1 ? (
              <Tag color="red">
                <ThunderboltFilled /> Urgent
              </Tag>
            ) : null}
            <p className="staff-my-tasks-card__issue">{issue}</p>
            {siteName ? <p className="staff-my-tasks-card__site">{siteName}</p> : null}
          </div>
          <FaultListStatusBadge record={row} />
        </div>

        <dl className="staff-my-tasks-card__meta">
          <div className="staff-my-tasks-card__meta-item">
            <dt>Reported</dt>
            <dd>{formatDateTime(row.createdAt)}</dd>
          </div>
          <div className="staff-my-tasks-card__meta-item">
            <dt>Act by</dt>
            <dd>{formatDateTime(row.delegatedUntil)}</dd>
          </div>
        </dl>

        <div className="staff-my-tasks-card__action">
          <Button
            type="primary"
            block
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              void openFault(row);
            }}
          >
            View task
          </Button>
        </div>
      </article>
    );
  };

  return (
    <Layout title="sidebar.myTasks">
      {loading ? (
        <Spin />
      ) : (
        <>
          <Alert
            type={overdueCount > 0 ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              overdueCount > 0
                ? `${overdueCount} assignment${overdueCount === 1 ? '' : 's'} overdue — open each task and click Confirm acted when complete.`
                : pendingCount > 0
                  ? `${pendingCount} assignment${pendingCount === 1 ? '' : 's'} awaiting your confirmation. Open each task and click Confirm acted when complete.`
                  : 'Fault assignments from your admin appear here. Open a task to view details and confirm when you have acted.'
            }
          />

          {rows.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#8c8c8c' }}>
              No assigned tasks right now.
            </div>
          ) : isMobilePortrait ? (
            <div className="staff-my-tasks-mobile-list">{rows.map(renderMobileCard)}</div>
          ) : (
            <div className="staff-my-tasks-table-wrap">
              <Table
                rowKey={(r) => String(r.reportFaultId ?? r.id)}
                dataSource={rows}
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'No assigned tasks right now.' }}
                columns={columns}
              />
            </div>
          )}
        </>
      )}

      <FaultReportViewModal
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        record={viewRow}
        viewerType={userType.STAFF}
        onPriorityUpdated={onPriorityUpdated}
        staffUserId={profile?.id}
        onFaultCompleted={onFaultUpdated}
      />
    </Layout>
  );
};

export default StaffMyTasksPage;
