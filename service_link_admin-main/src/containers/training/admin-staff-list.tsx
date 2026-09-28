import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Popconfirm, Progress, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import { TrainingAdminChromeStyles } from './trainingAdminChrome';

type StaffRow = {
  id: number;
  label: string;
  count: number;
  started: number;
  finished: number;
  progressPercent: number;
};

const TrainingAdminStaffListPage: React.FC = () => {
  const history = useHistory();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [filter, setFilter] = useState('');
  const [applied, setApplied] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, assignRes] = await Promise.all([
        callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', { type: 2, limit: 500, page: 1 }),
        callAPIAsync(serviceType.COMMON, `${endPoint.TRAINING}/admin/assignments`, 'GET', null),
      ]);
      const staffRows = staffRes?.data?.rows || staffRes?.data || [];
      const assignments = assignRes?.code === 1 ? assignRes.data || [] : [];
      const nameById = new Map(
        (Array.isArray(staffRows) ? staffRows : []).map((u: any) => [
          +u.id,
          u.fullName || u.full_name || u.email || `Staff #${u.id}`,
        ]),
      );
      const byStaff = new Map<number, StaffRow & { progressSum: number }>();
      for (const assignment of assignments) {
        if (!assignment.staffId) continue;
        const id = +assignment.staffId;
        const started = assignment.startedAt ? 1 : 0;
        const finished = assignment.finishedAt ? 1 : 0;
        const percent = assignment.progressPercent || 0;
        const existing = byStaff.get(id);
        if (existing) {
          existing.count += 1;
          existing.started += started;
          existing.finished += finished;
          existing.progressSum += percent;
        } else {
          byStaff.set(id, {
            id,
            label: nameById.get(id) || assignment.staffName || `Staff #${id}`,
            count: 1,
            started,
            finished,
            progressSum: percent,
            progressPercent: 0,
          });
        }
      }
      setStaff(
        [...byStaff.values()].map((row) => ({
          id: row.id,
          label: row.label,
          count: row.count,
          started: row.started,
          finished: row.finished,
          progressPercent: row.count ? Math.round(row.progressSum / row.count) : 0,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => staff.filter((s) => s.label.toLowerCase().includes(applied.trim().toLowerCase())),
    [staff, applied],
  );

  const removeAllModules = async (row: StaffRow) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/assignments`,
      'GET',
      null,
    );
    const mine = (res?.code === 1 ? res.data || [] : []).filter((a: any) => +a.staffId === row.id);
    if (!mine.length) {
      message.info('No modules assigned');
      return;
    }
    for (const assignment of mine) {
      const deleted = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/assignments/${assignment.id}`,
        'DELETE',
        null,
      );
      if (deleted?.code !== 1) {
        message.error(deleted?.message || 'Could not remove modules');
        return;
      }
    }
    message.success('Modules removed');
    load();
  };

  const columns: ColumnsType<StaffRow> = [
    {
      title: 'Staff',
      dataIndex: 'label',
      render: (label, row) => (
        <span
          className="ta-row-link"
          onClick={() => history.push(`/training-admin/staff/${row.id}`)}
        >
          {label}
        </span>
      ),
    },
    {
      title: 'Modules',
      dataIndex: 'count',
      width: 110,
    },
    {
      title: 'Started',
      dataIndex: 'started',
      width: 110,
    },
    {
      title: 'Finished',
      dataIndex: 'finished',
      width: 110,
    },
    {
      title: 'Progress',
      dataIndex: 'progressPercent',
      width: 220,
      render: (percent) => <Progress percent={percent || 0} size="small" strokeColor="#1677ff" />,
    },
    {
      title: '',
      width: 140,
      render: (_, row) => (
        <Space
          size={4}
          className="new-reports-row-actions"
          style={{ width: '100%', justifyContent: 'space-evenly' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            aria-label="Edit"
            title="Edit"
            onClick={() => history.push(`/training-admin/staff/${row.id}?edit=1`)}
          />
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            aria-label="View"
            title="View"
            onClick={() => history.push(`/training-admin/staff/${row.id}`)}
          />
          <Popconfirm
            title={`Remove all training modules from ${row.label}?`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => removeAllModules(row)}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label="Delete"
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout title="Staff">
      <TrainingAdminChromeStyles />
      <UsersDiv>
        <div className="ta-list-page">
          <div className="ta-list-chrome">
            <div className="ta-list-chrome-top">
              <div>
                <h2 className="ta-list-chrome-title">Staff</h2>
                <p className="ta-list-chrome-sub">People who already have training</p>
              </div>
              <Space>
                <Button
                  className="ta-btn-green"
                  icon={<PlusOutlined />}
                  onClick={() => history.push('/training-admin/staff/new')}
                >
                  New
                </Button>
                <Button
                  className="ta-btn-outline"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => history.push('/training-admin')}
                >
                  Back
                </Button>
              </Space>
            </div>
            <div className="ta-toolbar">
              <div className="ta-field">
                <label>Keyword</label>
                <Input
                  allowClear
                  placeholder="Staff name"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onPressEnter={() => setApplied(filter)}
                />
              </div>
              <Button
                className="ta-btn-green"
                icon={<SearchOutlined />}
                onClick={() => setApplied(filter)}
              >
                Search
              </Button>
            </div>
          </div>
          <div className="ta-table-panel">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={visible}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'No staff have training yet. Use New to assign someone.' }}
              onRow={(row) => ({
                onClick: () => history.push(`/training-admin/staff/${row.id}`),
                style: { cursor: 'pointer' },
              })}
            />
          </div>
        </div>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingAdminStaffListPage;
