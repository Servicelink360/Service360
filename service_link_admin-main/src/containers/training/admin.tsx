import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';

const TrainingAdminPage: React.FC = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: number }[]>([]);
  const [siteOptions, setSiteOptions] = useState<{ label: string; value: number }[]>([]);

  const [qModuleId, setQModuleId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qSummary, setQSummary] = useState<any>({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [inductionOpen, setInductionOpen] = useState(false);
  const [editModule, setEditModule] = useState<any>(null);
  const [form] = Form.useForm();
  const [indForm] = Form.useForm();
  const [modForm] = Form.useForm();

  const loadModules = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/modules`,
      'GET',
      null,
    );
    if (res?.code === 1) setModules(res.data || []);
  }, []);

  const loadProgress = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/progress`,
      'GET',
      null,
    );
    if (res?.code === 1) {
      setProgressRows(res.data?.rows || []);
      setProgressSummary(res.data?.summary || {});
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/assignments`,
      'GET',
      null,
    );
    if (res?.code === 1) setAssignments(res.data || []);
  }, []);

  const loadStaffSites = useCallback(async () => {
    const [staffRes, sitesRes] = await Promise.all([
      callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
        type: 2,
        limit: 500,
        page: 1,
      }),
      callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES, 'GET', {
        limit: 500,
        page: 1,
      }),
    ]);
    const staffRows = staffRes?.data?.rows || staffRes?.data || [];
    setStaffOptions(
      (Array.isArray(staffRows) ? staffRows : []).map((u: any) => ({
        value: +u.id,
        label: u.fullName || u.full_name || u.email || `Staff #${u.id}`,
      })),
    );
    const siteRows = sitesRes?.data?.rows || sitesRes?.data || [];
    setSiteOptions(
      (Array.isArray(siteRows) ? siteRows : []).map((s: any) => ({
        value: +s.id,
        label: s.name || s.siteName || `Site #${s.id}`,
      })),
    );
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadModules(), loadProgress(), loadAssignments(), loadStaffSites()]);
    } finally {
      setLoading(false);
    }
  }, [loadModules, loadProgress, loadAssignments, loadStaffSites]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openQuestions = async (moduleId: number) => {
    setQModuleId(moduleId);
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/modules/${moduleId}/questions`,
      'GET',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not load questions');
      return;
    }
    setQuestions(res.data?.questions || []);
    setQSummary(res.data?.summary || {});
  };

  const saveAnswer = async (row: any, correctKey: string) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/questions/${row.id}`,
      'PATCH',
      { correctKey, answerReviewed: true },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Save failed');
      return;
    }
    message.success('Answer saved & marked reviewed');
    if (qModuleId) openQuestions(qModuleId);
    loadModules();
  };

  const markAllReviewed = async () => {
    if (!qModuleId) return;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/modules/${qModuleId}/questions/mark-reviewed`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Failed');
      return;
    }
    message.success('Marked reviewed');
    setQuestions(res.data?.questions || []);
    setQSummary(res.data?.summary || {});
    loadModules();
  };

  const moduleCols: ColumnsType<any> = [
    { title: 'Code', dataIndex: 'code', width: 110 },
    { title: 'Title', dataIndex: 'title' },
    {
      title: 'Kind',
      dataIndex: 'moduleKind',
      width: 110,
      render: (v) => (
        <Tag color={String(v).toUpperCase() === 'INDUCTION' ? 'blue' : 'green'}>
          {v || 'TRAINING'}
        </Tag>
      ),
    },
    {
      title: 'Site',
      dataIndex: 'siteName',
      width: 160,
      render: (v) => v || '�',
    },
    {
      title: 'Validity',
      dataIndex: 'validityDays',
      width: 100,
      render: (v) => (v ? `${v}d` : 'Never'),
    },
    {
      title: 'Answers',
      width: 130,
      render: (_, r) => (
        <span>
          {r.questionReviewed}/{r.questionWithAnswer}
          {r.questionWithAnswer > r.questionReviewed ? (
            <Tag color="orange" style={{ marginLeft: 6 }}>
              review
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: '',
      width: 220,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openQuestions(r.id)}>
            Answers
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditModule(r);
              modForm.setFieldsValue({
                title: r.title,
                validityDays: r.validityDays,
                passPercent: r.passPercent || 80,
                moduleKind: r.moduleKind || 'TRAINING',
                siteId: r.siteId || undefined,
                siteName: r.siteName || undefined,
              });
            }}
          >
            Settings
          </Button>
        </Space>
      ),
    },
  ];

  const questionCols: ColumnsType<any> = [
    {
      title: '#',
      dataIndex: 'sortOrder',
      width: 50,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
    },
    {
      title: 'Question',
      dataIndex: 'prompt',
      ellipsis: true,
    },
    {
      title: 'Correct',
      width: 160,
      render: (_, r) => (
        <Select
          size="small"
          style={{ width: 140 }}
          value={r.correctKey || undefined}
          placeholder="Set answer"
          onChange={(v) => saveAnswer(r, v)}
          options={(r.options || []).map((o: any) => ({
            value: o.key,
            label: `${o.key}: ${String(o.text).slice(0, 40)}`,
          }))}
        />
      ),
    },
    {
      title: 'Reviewed',
      width: 90,
      render: (_, r) =>
        r.answerReviewed ? (
          <Tag icon={<CheckOutlined />} color="success">
            Yes
          </Tag>
        ) : (
          <Tag color="default">No</Tag>
        ),
    },
  ];

  const progressCols: ColumnsType<any> = [
    { title: 'Staff', dataIndex: 'staffName', width: 160 },
    { title: 'Module', dataIndex: 'moduleTitle' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v, r) => (
        <Space>
          <Tag
            color={
              v === 'passed'
                ? 'green'
                : v === 'expired' || r.overdue
                  ? 'red'
                  : 'orange'
            }
          >
            {v}
          </Tag>
          {r.overdue ? <Tag color="volcano">Overdue</Tag> : null}
        </Space>
      ),
    },
    {
      title: 'Score',
      width: 90,
      render: (_, r) =>
        r.bestScore != null ? `${r.bestScore}/${r.bestTotal}` : '�',
    },
    {
      title: 'Due',
      dataIndex: 'dueAt',
      width: 110,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : '�'),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      width: 110,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : '�'),
    },
    {
      title: 'Certificate',
      width: 110,
      render: (_, r) =>
        r.certificateUrl ? (
          <a href={r.certificateUrl} target="_blank" rel="noreferrer">
            PDF
          </a>
        ) : (
          '�'
        ),
    },
  ];

  return (
    <Layout title="Training admin">
      <UsersDiv>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <strong>Training management</strong>
            <div style={{ color: '#666', fontSize: 13 }}>
              Answer keys � progress � assignments � expiry � site inductions
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)}>
              Assign module
            </Button>
            <Button onClick={() => setInductionOpen(true)}>Create site induction</Button>
          </Space>
        </div>

        <Tabs
          items={[
            {
              key: 'modules',
              label: 'Modules',
              children: (
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={moduleCols}
                  dataSource={modules}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                />
              ),
            },
            {
              key: 'answers',
              label: 'Answer keys',
              children: (
                <>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Select
                      style={{ minWidth: 320 }}
                      placeholder="Select module"
                      value={qModuleId || undefined}
                      onChange={(v) => openQuestions(v)}
                      options={modules.map((m) => ({
                        value: m.id,
                        label: `${m.code} � ${m.title}`,
                      }))}
                    />
                    <Button disabled={!qModuleId} onClick={markAllReviewed}>
                      Mark all reviewed
                    </Button>
                    {qSummary?.total != null ? (
                      <Tag>
                        {qSummary.reviewed}/{qSummary.withAnswer} reviewed �{' '}
                        {qSummary.needsReview} need review
                      </Tag>
                    ) : null}
                  </Space>
                  <Table
                    rowKey="id"
                    columns={questionCols}
                    dataSource={questions}
                    pagination={{ pageSize: 15 }}
                    size="small"
                  />
                </>
              ),
            },
            {
              key: 'progress',
              label: `Progress (${progressSummary.learners || 0})`,
              children: (
                <>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Tag color="green">Passed {progressSummary.passed || 0}</Tag>
                    <Tag color="orange">In progress {progressSummary.inProgress || 0}</Tag>
                    <Tag color="red">Overdue {progressSummary.overdue || 0}</Tag>
                    <Tag color="magenta">Expired {progressSummary.expired || 0}</Tag>
                  </Space>
                  <Table
                    rowKey={(r) => `${r.moduleId}-${r.staffId}`}
                    columns={progressCols}
                    dataSource={progressRows}
                    loading={loading}
                    pagination={{ pageSize: 25 }}
                    size="middle"
                  />
                </>
              ),
            },
            {
              key: 'assignments',
              label: `Assignments (${assignments.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={assignments}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: 'Module', dataIndex: 'moduleTitle' },
                    { title: 'Assigned to', dataIndex: 'staffName', width: 160 },
                    {
                      title: 'Site filter',
                      dataIndex: 'siteName',
                      width: 160,
                      render: (v) => v || '�',
                    },
                    {
                      title: 'Due',
                      dataIndex: 'dueAt',
                      width: 120,
                      render: (v, r) =>
                        v ? (
                          <span style={{ color: r.overdue ? '#b42318' : undefined }}>
                            {moment(v).format('YYYY-MM-DD')}
                          </span>
                        ) : (
                          '�'
                        ),
                    },
                    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
                    {
                      title: '',
                      width: 80,
                      render: (_, r) => (
                        <Popconfirm
                          title="Delete assignment?"
                          onConfirm={async () => {
                            const res = await callAPIAsync(
                              serviceType.COMMON,
                              `${endPoint.TRAINING}/admin/assignments/${r.id}`,
                              'DELETE',
                              null,
                            );
                            if (res?.code === 1) {
                              message.success('Deleted');
                              loadAssignments();
                            }
                          }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />

        <Modal
          title="Assign module"
          open={assignOpen}
          onCancel={() => setAssignOpen(false)}
          onOk={async () => {
            const v = await form.validateFields();
            const site = siteOptions.find((s) => s.value === v.siteId);
            const res = await callAPIAsync(
              serviceType.COMMON,
              `${endPoint.TRAINING}/admin/assignments`,
              'POST',
              {
                moduleId: v.moduleId,
                staffId: v.staffId || null,
                siteId: v.siteId || null,
                siteName: site?.label || null,
                dueAt: v.dueAt ? v.dueAt.toISOString() : null,
                notes: v.notes || null,
              },
            );
            if (res?.code !== 1) {
              message.error(res?.message || 'Failed');
              return;
            }
            message.success('Assigned');
            setAssignOpen(false);
            form.resetFields();
            loadAssignments();
          }}
          destroyOnClose
        >
          <Form form={form} layout="vertical">
            <Form.Item name="moduleId" label="Module" rules={[{ required: true }]}>
              <Select
                options={modules.map((m) => ({
                  value: m.id,
                  label: `${m.code} � ${m.title}`,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="staffId" label="Staff (blank = all staff)">
              <Select
                allowClear
                options={staffOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="siteId" label="Or all staff on site">
              <Select
                allowClear
                options={siteOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="dueAt" label="Due date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Create site induction"
          open={inductionOpen}
          onCancel={() => setInductionOpen(false)}
          onOk={async () => {
            const v = await indForm.validateFields();
            const site = siteOptions.find((s) => s.value === v.siteId);
            const res = await callAPIAsync(
              serviceType.COMMON,
              `${endPoint.TRAINING}/admin/site-inductions`,
              'POST',
              {
                siteId: v.siteId,
                siteName: site?.label || v.siteName,
                title: v.title,
                sourceModuleId: v.sourceModuleId,
              },
            );
            if (res?.code !== 1) {
              message.error(res?.message || 'Failed');
              return;
            }
            message.success('Site induction ready');
            setInductionOpen(false);
            indForm.resetFields();
            loadModules();
          }}
          destroyOnClose
        >
          <Form form={indForm} layout="vertical">
            <Form.Item name="siteId" label="Job site" rules={[{ required: true }]}>
              <Select options={siteOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="title" label="Title (optional)">
              <Input placeholder="e.g. Ador Avenue Reserve � Site Induction" />
            </Form.Item>
            <Form.Item
              name="sourceModuleId"
              label="Copy content from module (default Gateway)"
            >
              <Select
                allowClear
                options={modules
                  .filter((m) => String(m.moduleKind).toUpperCase() !== 'INDUCTION')
                  .map((m) => ({
                    value: m.id,
                    label: `${m.code} � ${m.title}`,
                  }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Module settings"
          open={!!editModule}
          onCancel={() => setEditModule(null)}
          onOk={async () => {
            const v = await modForm.validateFields();
            const site = siteOptions.find((s) => s.value === v.siteId);
            const res = await callAPIAsync(
              serviceType.COMMON,
              `${endPoint.TRAINING}/admin/modules/${editModule.id}`,
              'PATCH',
              {
                title: v.title,
                validityDays: v.validityDays ?? null,
                passPercent: v.passPercent,
                moduleKind: v.moduleKind,
                siteId: v.siteId || null,
                siteName: site?.label || v.siteName || null,
              },
            );
            if (res?.code !== 1) {
              message.error(res?.message || 'Failed');
              return;
            }
            message.success('Updated');
            setEditModule(null);
            loadModules();
          }}
          destroyOnClose
        >
          <Form form={modForm} layout="vertical">
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="moduleKind" label="Kind" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'TRAINING', label: 'Training' },
                  { value: 'INDUCTION', label: 'Site induction' },
                ]}
              />
            </Form.Item>
            <Form.Item name="siteId" label="Site (inductions)">
              <Select allowClear options={siteOptions} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item
              name="validityDays"
              label="Validity days after pass (blank = never expires)"
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="365" />
            </Form.Item>
            <Form.Item name="passPercent" label="Pass mark %" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingAdminPage;
