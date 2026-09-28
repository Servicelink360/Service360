import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { ArrowLeftOutlined, CloseOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, Popconfirm, Progress, Select, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import { TrainingAdminChromeStyles } from './trainingAdminChrome';

const TrainingAdminStaffPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { staffId } = useParams<{ staffId: string }>();
  const isNew = staffId === 'new';
  const editing = isNew || new URLSearchParams(location.search).get('edit') === '1';
  const staffNum = +staffId;
  const [form] = Form.useForm();
  const seeded = useRef(false);
  const [staffName, setStaffName] = useState('');
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: number }[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!isNew && (!Number.isFinite(staffNum) || staffNum <= 0)) return;
    setLoading(true);
    try {
      const [modRes, assignRes, staffRes] = await Promise.all([
        callAPIAsync(serviceType.COMMON, `${endPoint.TRAINING}/admin/modules`, 'GET', null),
        callAPIAsync(serviceType.COMMON, `${endPoint.TRAINING}/admin/assignments`, 'GET', null),
        callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', { type: 2, limit: 500, page: 1 }),
      ]);
      if (modRes?.code === 1) setModules(modRes.data || []);
      const rows = assignRes?.code === 1 ? assignRes.data || [] : [];
      const assignedIds = new Set(rows.filter((a: any) => a.staffId).map((a: any) => +a.staffId));
      const mine = isNew ? [] : rows.filter((a: any) => +a.staffId === staffNum);
      setAssignments(mine);
      const staffRows = staffRes?.data?.rows || staffRes?.data || [];
      const people = (Array.isArray(staffRows) ? staffRows : [])
        .map((u: any) => ({
          value: +u.id,
          label: u.fullName || u.full_name || u.email || `Staff #${u.id}`,
        }))
        .filter((u) => !isNew || !assignedIds.has(u.value));
      setStaffOptions(people);
      const person = (Array.isArray(staffRows) ? staffRows : []).find((u: any) => +u.id === staffNum);
      const fromAssignment = rows.find((a: any) => +a.staffId === staffNum);
      setStaffName(
        person?.fullName ||
          person?.full_name ||
          person?.email ||
          fromAssignment?.staffName ||
          (isNew ? 'New assignment' : `Staff #${staffNum}`),
      );
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [isNew, staffNum]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editing || !loaded || seeded.current) return;
    seeded.current = true;
    const first = assignments[0];
    form.setFieldsValue({
      moduleIds: isNew ? [] : assignments.map((a) => +a.moduleId).filter((id) => id > 0),
      staffId: isNew ? undefined : staffNum,
      dueAt: !isNew && first?.dueAt ? moment(first.dueAt) : null,
      notes: isNew ? '' : first?.notes || '',
    });
  }, [editing, loaded, assignments, staffNum, form, isNew]);

  const moduleOptions = modules
    .filter(
      (m) =>
        +m.status === 1 && String(m.moduleKind || 'TRAINING').toUpperCase() === 'TRAINING',
    )
    .map((m) => ({ value: +m.id, label: `${m.code} - ${m.title}` }));

  const save = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        moduleIds: v.moduleIds,
        staffId: v.staffId,
        dueAt: v.dueAt ? v.dueAt.toISOString() : null,
        notes: v.notes || null,
      };
      const anchor = assignments[0];
      const res = await callAPIAsync(
        serviceType.COMMON,
        anchor
          ? `${endPoint.TRAINING}/admin/assignments/${anchor.id}`
          : `${endPoint.TRAINING}/admin/assignments`,
        anchor ? 'PATCH' : 'POST',
        payload,
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save assignments');
        return;
      }
      message.success('Assignments updated');
      history.push('/training-admin/staff');
    } finally {
      setSaving(false);
    }
  };

  const resetProgress = async (row: any) => {
    setResettingId(row.id);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/progress/reset`,
        'POST',
        { staffId: staffNum, moduleId: row.moduleId },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not reset progress');
        return;
      }
      message.success('Progress reset');
      await load();
    } finally {
      setResettingId(null);
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Module',
      render: (_, row) =>
        `${row.moduleCode ? `${row.moduleCode} - ` : ''}${row.moduleTitle || 'Module'}`,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      width: 120,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : ''),
    },
    {
      title: 'Finished',
      dataIndex: 'finishedAt',
      width: 120,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : ''),
    },
    {
      title: 'Progress',
      width: 240,
      render: (_, row) => (
        <Progress
          percent={row.progressPercent || 0}
          size="small"
          strokeColor={row.progressStatus === 'passed' ? '#188038' : '#1677ff'}
          status={
            row.progressStatus === 'failed' || row.progressStatus === 'expired'
              ? 'exception'
              : undefined
          }
        />
      ),
    },
    {
      title: '',
      width: 110,
      render: (_, row) => (
        <Popconfirm
          title="Reset progress for this module?"
          okText="Reset"
          cancelText="Cancel"
          onConfirm={() => resetProgress(row)}
        >
          <Button size="small" icon={<UndoOutlined />} loading={resettingId === row.id}>
            Reset
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (editing) {
    return (
      <Layout title={isNew ? 'New assignment' : 'Edit assignments'}>
        <TrainingAdminChromeStyles />
        <UsersDiv>
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 2,
              boxShadow: '0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {isNew ? 'New assignment' : 'Edit assignments'}
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => history.push('/training-admin/staff')}
                aria-label="Close"
              />
            </div>
            <Form form={form} layout="vertical" style={{ padding: '24px 24px 8px' }}>
              <Form.Item
                name="moduleIds"
                label="Modules"
                rules={[{ required: true, message: 'Choose at least one module' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Choose one or more modules"
                  options={moduleOptions}
                  showSearch
                  optionFilterProp="label"
                  loading={loading}
                />
              </Form.Item>
              <Form.Item
                name="staffId"
                label="Staff"
                rules={[{ required: true, message: 'Choose a staff member' }]}
              >
                <Select
                  options={staffOptions}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Choose who must complete this training"
                />
              </Form.Item>
              <Form.Item name="dueAt" label="Due date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '10px 16px',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <Button onClick={() => history.push('/training-admin/staff')}>Cancel</Button>
              <Button type="primary" loading={saving} onClick={save} style={{ background: '#188038', borderColor: '#188038' }}>
                OK
              </Button>
            </div>
          </div>
        </UsersDiv>
      </Layout>
    );
  }

  return (
    <Layout title={staffName || 'Staff training'}>
      <TrainingAdminChromeStyles />
      <UsersDiv>
        <div className="ta-list-page">
          <div className="ta-list-chrome">
            <div className="ta-list-chrome-top">
              <div>
                <h2 className="ta-list-chrome-title">{staffName || 'Staff'}</h2>
                <p className="ta-list-chrome-sub">Assigned training modules</p>
              </div>
              <Button
                className="ta-btn-outline"
                icon={<ArrowLeftOutlined />}
                onClick={() => history.push('/training-admin/staff')}
              >
                Back
              </Button>
            </div>
          </div>
          <div className="ta-table-panel">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={assignments}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'No modules assigned yet' }}
            />
          </div>
        </div>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingAdminStaffPage;
