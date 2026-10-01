import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync, callAPIUploadAsync } from '../../library/helpers/api';
import { formatTrainingBody } from './formatTrainingBody';
import './training.css';
import { resolveReportPdfHref } from '../reports/new-reports-display-utils';

const TrainingAdminPage: React.FC = () => {
  const history = useHistory();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<any>({});
  const [siteOptions, setSiteOptions] = useState<{ label: string; value: number }[]>([]);

  const [qModuleId, setQModuleId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qSummary, setQSummary] = useState<any>({});
  const [activeTab, setActiveTab] = useState('modules');

  const [createOpen, setCreateOpen] = useState(false);
  const [editModule, setEditModule] = useState<any>(null);
  const [contentModule, setContentModule] = useState<any>(null);
  const [contentTopics, setContentTopics] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [editTopic, setEditTopic] = useState<any>(null);
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicImageUploading, setTopicImageUploading] = useState(false);
  const [createForm] = Form.useForm();
  const [modForm] = Form.useForm();
  const [topicForm] = Form.useForm();
  const [newTopicForm] = Form.useForm();

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

  const loadStaffSites = useCallback(async () => {
    const sitesRes = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES, 'GET', {
      limit: 500,
      page: 1,
    });
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
      await Promise.all([loadModules(), loadProgress(), loadStaffSites()]);
    } finally {
      setLoading(false);
    }
  }, [loadModules, loadProgress, loadStaffSites]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openQuestions = async (moduleId: number) => {
    setQModuleId(moduleId);
    setActiveTab('modules');
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

  const setReviewed = async (row: any, reviewed: boolean) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/questions/${row.id}`,
      'PATCH',
      { answerReviewed: reviewed },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Save failed');
      return;
    }
    message.success(reviewed ? 'Marked reviewed' : 'Marked not reviewed');
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

  const openContent = async (moduleRow: any) => {
    setContentModule(moduleRow);
    setContentLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/modules/${moduleRow.id}/topics`,
        'GET',
        null,
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not load topics');
        setContentModule(null);
        return;
      }
      setContentTopics(res.data?.topics || []);
    } finally {
      setContentLoading(false);
    }
  };

  const openTopicEditor = (topic: any) => {
    setEditTopic(topic);
    topicForm.setFieldsValue({
      title: topic.title || '',
      body: topic.body || '',
      imageUrl: topic.imageUrl || '',
    });
  };

  const uploadTopicImage = async (file: File) => {
    setTopicImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'topic-image.png');
      const res: any = await callAPIUploadAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        'POST',
        formData,
      );
      const url =
        typeof res?.data === 'string'
          ? res.data
          : res?.data?.url || res?.data?.Location || res?.data?.fileUrl || null;
      if (res?.code !== 1 || !url) {
        message.error(res?.message || 'Upload failed');
        return;
      }
      topicForm.setFieldsValue({ imageUrl: String(url) });
      message.success('Image uploaded');
    } finally {
      setTopicImageUploading(false);
    }
  };

  const saveTopic = async () => {
    if (!editTopic) return;
    const v = await topicForm.validateFields();
    setTopicSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/topics/${editTopic.id}`,
        'PATCH',
        {
          title: String(v.title || '').trim(),
          body: String(v.body || ''),
          imageUrl: String(v.imageUrl || '').trim() || null,
        },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save topic');
        return;
      }
      message.success('Topic saved');
      setContentTopics((prev) =>
        prev.map((t) => (t.id === editTopic.id ? { ...t, ...res.data } : t)),
      );
      setEditTopic(null);
      topicForm.resetFields();
    } finally {
      setTopicSaving(false);
    }
  };

  const reloadTopics = async (moduleId: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/modules/${moduleId}/topics`,
      'GET',
      null,
    );
    if (res?.code === 1) setContentTopics(res.data?.topics || []);
  };

  const createTopic = async () => {
    if (!contentModule) return;
    const v = await newTopicForm.validateFields();
    setTopicSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/modules/${contentModule.id}/topics`,
        'POST',
        {
          title: String(v.title || '').trim(),
          body: String(v.body || ''),
        },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not add topic');
        return;
      }
      message.success('Topic added');
      setNewTopicOpen(false);
      newTopicForm.resetFields();
      await reloadTopics(contentModule.id);
    } finally {
      setTopicSaving(false);
    }
  };

  const moveTopic = async (topicId: number, direction: 'up' | 'down') => {
    if (!contentModule) return;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/topics/${topicId}/move`,
      'POST',
      { direction },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not reorder topic');
      return;
    }
    await reloadTopics(contentModule.id);
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
      render: (v) => v || '—',
    },
    {
      title: 'Validity',
      dataIndex: 'validityDays',
      width: 100,
      render: (v) => (v ? `${v}d` : 'Never'),
    },
    {
      title: 'Length',
      dataIndex: 'durationMins',
      width: 90,
      render: (v) => (v ? `${v} min` : '—'),
    },
    {
      title: 'Questions',
      width: 120,
      render: (_, r) => {
        const total = +r.questionTotal || 0;
        const reviewed = +r.questionReviewed || 0;
        const withAnswer = +r.questionWithAnswer || 0;
        const thin = total > 0 && total < 8;
        const gaps = withAnswer < total || reviewed < total;
        return (
          <Tag color={thin || gaps ? 'orange' : 'green'}>
            {reviewed}/{total} reviewed
          </Tag>
        );
      },
    },
    {
      title: '',
      width: 280,
      fixed: 'right' as const,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => void openContent(r)}>
            Edit
          </Button>
          <Button
            size="small"
            icon={<SettingOutlined />}
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
          <Button size="small" icon={<CheckOutlined />} onClick={() => openQuestions(r.id)}>
            Answers
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
      width: 110,
      render: (_, r) => (
        <Switch
          size="small"
          checked={!!r.answerReviewed}
          checkedChildren="Yes"
          unCheckedChildren="No"
          onChange={(checked) => setReviewed(r, checked)}
        />
      ),
    },
  ];

  const progressCols: ColumnsType<any> = [
    {
      title: 'Staff',
      dataIndex: 'staffName',
      width: 160,
      render: (name, r) =>
        r.staffId ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto', fontWeight: 600, color: '#166534' }}
            onClick={() => history.push(`/training-admin/staff/${r.staffId}`)}
          >
            {name}
          </Button>
        ) : (
          name
        ),
    },
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
        r.bestScore != null ? `${r.bestScore}/${r.bestTotal}` : '—',
    },
    {
      title: 'Due',
      dataIndex: 'dueAt',
      width: 110,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      width: 110,
      render: (v) => (v ? moment(v).format('YYYY-MM-DD') : '—'),
    },
    {
      title: 'Certificate',
      width: 120,
      render: (_, r) => {
        const href = r.status === 'passed' ? resolveReportPdfHref(r.certificateUrl) : '';
        if (!href) return '';
        return (
          <a href={href} target="_blank" rel="noreferrer">
            Certificate
          </a>
        );
      },
    },
  ];

  return (
    <Layout title="Training admin">
      <UsersDiv>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%' }}>
          <div>
            <strong>Training</strong>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              Modules are the courses. Staff is where you assign them.
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.setFieldsValue({
                  moduleKind: 'TRAINING',
                  validityDays: 365,
                  passPercent: 80,
                });
                setCreateOpen(true);
              }}
            >
              New
            </Button>
          </Space>
        </div>

        <Tabs
          style={{ width: '100%' }}
          activeKey={activeTab}
          onChange={(key) => {
            if (key === 'staff') {
              history.push('/training-admin/staff');
              return;
            }
            if (key === 'certificates') {
              history.push('/training-admin/certificates');
              return;
            }
            setActiveTab(key);
          }}
          items={[
            {
              key: 'modules',
              label: 'Modules',
              children: qModuleId ? (
                <>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Button onClick={() => setQModuleId(null)}>Back to modules</Button>
                    <strong>
                      {modules.find((m) => +m.id === +qModuleId)?.title || 'Answers'}
                    </strong>
                    <Button onClick={markAllReviewed}>Mark all reviewed</Button>
                    {qSummary?.total != null ? (
                      <Tag>
                        {qSummary.reviewed}/{qSummary.withAnswer} reviewed
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
              ) : (
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={moduleCols}
                  dataSource={modules}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                  scroll={{ x: 1180 }}
                />
              ),
            },
            {
              key: 'staff',
              label: 'Staff',
              children: null,
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
              key: 'certificates',
              label: 'Certificates',
              children: null,
            },
          ]}
        />

        <Modal
          title="New module"
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onOk={async () => {
            const v = await createForm.validateFields();
            const site = siteOptions.find((s) => s.value === v.siteId);
            const res = await callAPIAsync(
              serviceType.COMMON,
              `${endPoint.TRAINING}/admin/modules`,
              'POST',
              {
                code: v.code,
                title: v.title,
                moduleKind: v.moduleKind,
                siteId: v.siteId || null,
                siteName: site?.label || null,
                validityDays: v.validityDays ?? null,
                passPercent: v.passPercent,
              },
            );
            if (res?.code !== 1) {
              message.error(res?.message || 'Could not create module');
              return;
            }
            message.success('Module created');
            setCreateOpen(false);
            createForm.resetFields();
            loadModules();
          }}
          okText="Create"
          destroyOnClose
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Enter a short code' }]}>
              <Input placeholder="e.g. M7" maxLength={40} />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
              <Input maxLength={255} />
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

        <Modal
          title={
            contentModule
              ? `Edit content · ${contentModule.code} · ${contentModule.title}`
              : 'Edit content'
          }
          open={!!contentModule}
          onCancel={() => {
            setContentModule(null);
            setContentTopics([]);
            setEditTopic(null);
          }}
          footer={
            <Button
              onClick={() => {
                setContentModule(null);
                setContentTopics([]);
                setEditTopic(null);
              }}
            >
              Close
            </Button>
          }
          width={860}
          destroyOnClose
        >
          <div style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                newTopicForm.resetFields();
                setNewTopicOpen(true);
              }}
            >
              Add topic
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={contentLoading}
            dataSource={contentTopics}
            pagination={false}
            size="small"
            columns={[
              { title: '#', dataIndex: 'order', width: 50 },
              {
                title: 'Image',
                width: 90,
                render: (_, t) =>
                  t.imageUrl ? (
                    <img
                      src={t.imageUrl}
                      alt={t.title || 'Topic image'}
                      style={{
                        width: 64,
                        height: 40,
                        objectFit: 'contain',
                        borderRadius: 6,
                        border: '1px solid #e8e8e8',
                        background: '#fff',
                      }}
                    />
                  ) : (
                    <span style={{ color: '#999' }}>—</span>
                  ),
              },
              { title: 'Title', dataIndex: 'title', ellipsis: true },
              {
                title: '',
                width: 210,
                render: (_, t, index) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => void moveTopic(t.id, 'up')}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === contentTopics.length - 1}
                      onClick={() => void moveTopic(t.id, 'down')}
                    />
                    <Button size="small" icon={<EditOutlined />} onClick={() => openTopicEditor(t)}>
                      Edit
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Modal>

        <Modal
          title={editTopic ? `Edit topic #${editTopic.order}` : 'Edit topic'}
          open={!!editTopic}
          onCancel={() => {
            setEditTopic(null);
            topicForm.resetFields();
          }}
          onOk={() => void saveTopic()}
          confirmLoading={topicSaving}
          okText="Save topic"
          width={720}
          destroyOnClose
        >
          <Form form={topicForm} layout="vertical">
            <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="body" label="Topic text" rules={[{ required: true, message: 'Enter text' }]}>
              <Input.TextArea rows={12} placeholder="Learning content for this topic" />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, next) =>
                prev.body !== next.body || prev.title !== next.title || prev.imageUrl !== next.imageUrl
              }
            >
              {() => (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview</div>
                  <div
                    style={{
                      maxHeight: 280,
                      overflow: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 12,
                      background: '#fafafa',
                    }}
                  >
                    {formatTrainingBody(topicForm.getFieldValue('body') || '', {
                      title: topicForm.getFieldValue('title'),
                      imagesAfterIntro: topicForm.getFieldValue('imageUrl')
                        ? [topicForm.getFieldValue('imageUrl')]
                        : [],
                    })}
                  </div>
                </div>
              )}
            </Form.Item>
            <Form.Item name="imageUrl" label="Image URL" hidden>
              <Input />
            </Form.Item>
            <Form.Item label="Topic image" extra="Upload a cartoon/illustration or clear to remove.">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.imageUrl !== next.imageUrl}>
                  {() => {
                    const url = topicForm.getFieldValue('imageUrl');
                    return url ? (
                      <img
                        src={url}
                        alt={editTopic?.title || 'Topic image'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          objectFit: 'contain',
                          borderRadius: 8,
                          border: '1px solid #eee',
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <div style={{ color: '#999' }}>No image</div>
                    );
                  }}
                </Form.Item>
                <Space wrap>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        await uploadTopicImage(file as File);
                        onSuccess?.({}, new XMLHttpRequest());
                      } catch (e) {
                        onError?.(e as Error);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={topicImageUploading}>
                      Upload image
                    </Button>
                  </Upload>
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev.imageUrl !== next.imageUrl}>
                    {() => (
                      <Button
                        danger
                        disabled={!topicForm.getFieldValue('imageUrl')}
                        onClick={() => topicForm.setFieldsValue({ imageUrl: '' })}
                      >
                        Remove image
                      </Button>
                    )}
                  </Form.Item>
                </Space>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Add topic"
          open={newTopicOpen}
          onCancel={() => setNewTopicOpen(false)}
          onOk={() => void createTopic()}
          confirmLoading={topicSaving}
          okText="Add topic"
          destroyOnClose
        >
          <Form form={newTopicForm} layout="vertical">
            <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item
              name="body"
              label="Topic text"
              rules={[{ required: true, message: 'Enter topic text' }]}
            >
              <Input.TextArea rows={8} />
            </Form.Item>
          </Form>
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingAdminPage;
