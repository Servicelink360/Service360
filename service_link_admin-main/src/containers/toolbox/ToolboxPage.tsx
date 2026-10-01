import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import { toolboxImageFor } from './toolboxMedia';
import './toolboxBrief.css';

type Talk = {
  id: number;
  code?: string;
  title: string;
  brief: string;
  points: string[];
  durationMins: number;
  imageUrl?: string | null;
  status?: number;
};

type SessionRow = {
  id: number;
  talkTitle: string;
  siteName: string;
  deliveredAt: string;
  deliveredByName: string;
  present: number;
  acknowledged: number;
  notes: string;
};

function readProfileType() {
  try {
    const raw = localStorage.getItem('profile');
    if (!raw) return 0;
    return +JSON.parse(raw).type || 0;
  } catch {
    return 0;
  }
}

function formatWhen(value?: string | null) {
  if (!value) return '';
  const m = moment(value);
  return m.isValid() ? m.format('YYYY-MM-DD') : '';
}

function TalkBrief({ talk, showTitle = true }: { talk: Talk; showTitle?: boolean }) {
  const image = toolboxImageFor(talk);
  const lines = String(talk.brief || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: { heading?: string; paragraphs: string[] }[] = [];
  let lead: string | null = null;

  for (const line of lines) {
    const heading = line.length < 72 && !/[.?!]$/.test(line);
    if (heading) {
      sections.push({ heading: line, paragraphs: [] });
      continue;
    }
    if (!lead && sections.length === 0) {
      lead = line;
      continue;
    }
    if (!sections.length) {
      sections.push({ paragraphs: [line] });
    } else {
      sections[sections.length - 1].paragraphs.push(line);
    }
  }

  return (
    <div className="toolbox-brief">
      {image ? (
        <div className="toolbox-brief__hero">
          <img src={image} alt="" />
          {showTitle ? <span className="toolbox-brief__hero-label">{talk.title}</span> : null}
        </div>
      ) : null}
      {showTitle ? (
        <>
          <h3 className="toolbox-brief__title">{talk.title}</h3>
          {talk.durationMins ? (
            <p className="toolbox-brief__meta">{talk.durationMins} minute talk</p>
          ) : null}
        </>
      ) : null}
      {lead ? <p className="toolbox-brief__lead">{lead}</p> : null}
      {sections.map((section, index) => (
        <div key={`${section.heading || 'body'}-${index}`} className="toolbox-brief__section">
          {section.heading ? <h4>{section.heading}</h4> : null}
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={`${index}-${pIndex}`}>{paragraph}</p>
          ))}
        </div>
      ))}
      {talk.points?.length ? (
        <div className="toolbox-brief__discussion">
          <h4>Discussion with the crew</h4>
          <ol>
            {talk.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

const ToolboxPage: React.FC = () => {
  const isAdmin = readProfileType() === 3;
  const [talks, setTalks] = useState<Talk[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTalk, setOpenTalk] = useState<Talk | null>(null);
  const [editTalk, setEditTalk] = useState<Talk | null>(null);
  const [createTalkOpen, setCreateTalkOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: number }[]>([]);
  const [siteOptions, setSiteOptions] = useState<{ label: string; value: number }[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const selectedTalkId = Form.useWatch('talkId', form);
  const selectedTalk = talks.find((talk) => talk.id === selectedTalkId) || null;

  const loadTalks = useCallback(async () => {
    const path = isAdmin ? `${endPoint.TOOLBOX}/admin/talks` : `${endPoint.TOOLBOX}/talks`;
    const res = await callAPIAsync(serviceType.COMMON, path, 'GET', null);
    if (res?.code === 1) setTalks(res.data || []);
  }, [isAdmin]);

  const loadSessions = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions`, 'GET', null);
    if (res?.code === 1) setSessions(res.data || []);
  }, []);

  const loadMine = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/me`, 'GET', null);
    if (res?.code === 1) setMine(res.data || []);
  }, []);

  const loadLookups = useCallback(async () => {
    const [staffRes, sitesRes] = await Promise.all([
      callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', { type: 2, limit: 500, page: 1 }),
      callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES, 'GET', { limit: 500, page: 1 }),
    ]);
    const staffRows = staffRes?.data?.rows || staffRes?.data || [];
    setStaffOptions(
      (Array.isArray(staffRows) ? staffRows : []).map((u: any) => ({
        value: +u.id,
        label: u.fullName || u.full_name || u.email || `Staff #${u.id}`,
      })),
    );
    const siteRows = sitesRes?.data?.rows || sitesRes?.data || [];
    setSiteOptions([
      { value: 0, label: 'All sites' },
      ...(Array.isArray(siteRows) ? siteRows : []).map((s: any) => ({
        value: +s.id,
        label: s.name || s.siteName || `Site #${s.id}`,
      })),
    ]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadTalks(), isAdmin ? loadSessions() : loadMine(), isAdmin ? loadLookups() : Promise.resolve()]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadLookups, loadMine, loadSessions, loadTalks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSession = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions/${id}`, 'GET', null);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not open the session');
      return;
    }
    setDetail(res.data);
  };

  const saveSession = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const siteId = values.siteId != null && values.siteId !== '' ? +values.siteId : null;
    const site = siteOptions.find((s) => s.value === siteId);
    const payload = {
      talkId: values.talkId,
      siteId: siteId && siteId > 0 ? siteId : null,
      siteName: siteId === 0 ? 'All sites' : site?.label || '',
      deliveredAt: values.deliveredAt ? values.deliveredAt.toISOString() : new Date().toISOString(),
      notes: values.notes || '',
      staffIds: values.staffIds || [],
    };
    const res = editingSessionId
      ? await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions/${editingSessionId}`, 'PATCH', payload)
      : await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions`, 'POST', payload);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save the session');
      return;
    }
    message.success(editingSessionId ? 'Session updated' : 'Session recorded');
    setRecordOpen(false);
    setEditingSessionId(null);
    form.resetFields();
    refresh();
  };

  const saveTalk = async () => {
    if (!createTalkOpen && !editTalk) return;
    let values: any;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }
    const points = String(values.points || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const payload = {
      title: values.title,
      brief: values.brief,
      durationMins: values.durationMins || 10,
      points,
    };
    const res = createTalkOpen
      ? await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/talks`, 'POST', payload)
      : await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/talks/${editTalk.id}`, 'PATCH', payload);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save the talk');
      return;
    }
    message.success(createTalkOpen ? 'Talk created' : 'Talk updated');
    setEditTalk(null);
    setCreateTalkOpen(false);
    loadTalks();
  };

  const acknowledge = async (sessionId: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TOOLBOX}/sessions/${sessionId}/acknowledge`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not confirm attendance');
      return;
    }
    message.success('Attendance confirmed');
    loadMine();
  };

  const talkColumns: ColumnsType<Talk> = useMemo(
    () => [
      {
        title: '',
        width: 72,
        render: (_, row) => (
          <img
            src={toolboxImageFor(row)}
            alt=""
            style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, display: 'block' }}
          />
        ),
      },
      { title: 'Talk', dataIndex: 'title' },
      { title: 'Minutes', dataIndex: 'durationMins', width: 100 },
      ...(isAdmin
        ? [
            {
              title: 'Active',
              dataIndex: 'status',
              width: 90,
              render: (status: number, row: Talk) => (
                <Switch
                  checked={status !== 0}
                  onChange={async (checked) => {
                    const res = await callAPIAsync(
                      serviceType.COMMON,
                      `${endPoint.TOOLBOX}/admin/talks/${row.id}`,
                      'PATCH',
                      { status: checked ? 1 : 0 },
                    );
                    if (res?.code !== 1) {
                      message.error(res?.message || 'Could not update the talk');
                      return;
                    }
                    loadTalks();
                  }}
                />
              ),
            } as ColumnsType<Talk>[number],
          ]
        : []),
      {
        title: '',
        width: 280,
        render: (_, row) =>
          isAdmin ? (
            <Space>
              <Button type="link" onClick={() => setOpenTalk(row)}>
                Read
              </Button>
              <Button
                type="link"
                onClick={() => {
                  setEditingSessionId(null);
                  form.setFieldsValue({
                    talkId: row.id,
                    deliveredAt: moment(),
                    staffIds: [],
                    siteId: undefined,
                    notes: '',
                  });
                  setRecordOpen(true);
                }}
              >
                Present
              </Button>
              <Button
                type="link"
                onClick={() => {
                  setCreateTalkOpen(false);
                  setEditTalk(row);
                  editForm.setFieldsValue({
                    title: row.title,
                    durationMins: row.durationMins,
                    brief: row.brief,
                    points: (row.points || []).join('\n'),
                  });
                }}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete this talk?"
                onConfirm={async () => {
                  const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.TOOLBOX}/admin/talks/${row.id}`,
                    'DELETE',
                    null,
                  );
                  if (res?.code !== 1) {
                    message.error(res?.message || 'Could not delete the talk');
                    return;
                  }
                  message.success('Talk deleted');
                  loadTalks();
                }}
              >
                <Button type="link">Delete</Button>
              </Popconfirm>
            </Space>
          ) : (
            <Button type="link" onClick={() => setOpenTalk(row)}>
              Read
            </Button>
          ),
      },
    ],
    [editForm, form, isAdmin, loadTalks],
  );

  const sessionColumns: ColumnsType<SessionRow> = [
    { title: 'Date', dataIndex: 'deliveredAt', width: 120, render: (v) => formatWhen(v) },
    { title: 'Talk', dataIndex: 'talkTitle' },
    { title: 'Site', dataIndex: 'siteName', render: (v) => v || '' },
    { title: 'Led by', dataIndex: 'deliveredByName', render: (v) => v || '' },
    { title: 'Present', dataIndex: 'present', width: 90 },
    { title: 'Confirmed', dataIndex: 'acknowledged', width: 110 },
    {
      title: '',
      width: 200,
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openSession(row.id)}>
            View
          </Button>
          <Button
            type="link"
            onClick={async () => {
              const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.TOOLBOX}/admin/sessions/${row.id}`,
                'GET',
                null,
              );
              if (res?.code !== 1) {
                message.error(res?.message || 'Could not open the session');
                return;
              }
              const data = res.data;
              setEditingSessionId(data.id);
              form.setFieldsValue({
                talkId: data.talkId,
                siteId: data.siteId ? data.siteId : data.siteName === 'All sites' ? 0 : undefined,
                deliveredAt: data.deliveredAt ? moment(data.deliveredAt) : moment(),
                staffIds: (data.attendance || []).map((person: any) => person.staffId),
                notes: data.notes || '',
              });
              setRecordOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this session?"
            onConfirm={async () => {
              const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.TOOLBOX}/admin/sessions/${row.id}`,
                'DELETE',
                null,
              );
              if (res?.code !== 1) {
                message.error(res?.message || 'Could not delete the session');
                return;
              }
              message.success('Session deleted');
              loadSessions();
            }}
          >
            <Button type="link">Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <UsersDiv style={{ width: '100%', alignItems: 'stretch' }}>
        <div style={{ width: '100%', padding: '8px 16px 32px' }}>
          <Space style={{ marginBottom: 16 }}>
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
              Refresh
            </Button>
            {isAdmin ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditTalk(null);
                    setCreateTalkOpen(true);
                    editForm.setFieldsValue({ title: '', durationMins: 10, brief: '', points: '' });
                  }}
                >
                  New talk
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSessionId(null);
                    form.setFieldsValue({ deliveredAt: moment(), staffIds: [], talkId: undefined, siteId: undefined, notes: '' });
                    setRecordOpen(true);
                  }}
                >
                  Present talk
                </Button>
              </>
            ) : null}
          </Space>
          {isAdmin ? (
            <Tabs
              defaultActiveKey="talks"
              items={[
                {
                  key: 'talks',
                  label: 'Talks',
                  children: (
                    <Table rowKey="id" loading={loading} columns={talkColumns} dataSource={talks} pagination={false} />
                  ),
                },
                {
                  key: 'sessions',
                  label: 'Sessions',
                  children: <Table rowKey="id" loading={loading} columns={sessionColumns} dataSource={sessions} />,
                },
              ]}
            />
          ) : (
            <>
              <h3>Talks</h3>
              <Table rowKey="id" loading={loading} columns={talkColumns} dataSource={talks} pagination={false} />
              <h3 style={{ marginTop: 24 }}>My attendance</h3>
              <Table
                rowKey="attendanceId"
                loading={loading}
                dataSource={mine}
                pagination={false}
                columns={[
                  { title: 'Date', dataIndex: 'deliveredAt', width: 120, render: (v) => formatWhen(v) },
                  { title: 'Talk', dataIndex: 'talkTitle' },
                  { title: 'Site', dataIndex: 'siteName', render: (v) => v || '' },
                  {
                    title: 'Confirmed',
                    width: 140,
                    render: (_, row) =>
                      row.acknowledgedAt ? (
                        formatWhen(row.acknowledgedAt)
                      ) : (
                        <Button type="link" onClick={() => acknowledge(row.sessionId)}>
                          I was there
                        </Button>
                      ),
                  },
                ]}
              />
            </>
          )}
        </div>
        <Modal
          open={!!openTalk}
          title={openTalk?.title}
          footer={null}
          onCancel={() => setOpenTalk(null)}
          width={820}
        >
          {openTalk ? <TalkBrief talk={openTalk} /> : null}
        </Modal>
        <Modal
          open={createTalkOpen || !!editTalk}
          title={createTalkOpen ? 'New talk' : 'Edit talk'}
          onCancel={() => {
            setEditTalk(null);
            setCreateTalkOpen(false);
          }}
          onOk={saveTalk}
          okText="Save"
          width={720}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="durationMins" label="Minutes">
              <InputNumber min={1} max={120} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="brief" label="Brief" rules={[{ required: true, message: 'Enter the brief' }]}>
              <Input.TextArea rows={8} />
            </Form.Item>
            <Form.Item name="points" label="Discussion points, one per line">
              <Input.TextArea rows={4} />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          open={recordOpen}
          title={editingSessionId ? 'Edit session' : 'Present toolbox talk'}
          onCancel={() => {
            setRecordOpen(false);
            setEditingSessionId(null);
          }}
          onOk={saveSession}
          okText="Save"
          width={820}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="talkId" label="Talk" rules={[{ required: true, message: 'Choose a talk' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={talks
                  .filter((t) => t.status !== 0)
                  .map((t) => ({ value: t.id, label: t.title }))}
              />
            </Form.Item>
            {selectedTalk ? (
              <div
                style={{
                  background: '#f7faf8',
                  border: '1px solid #d5e0d8',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  maxHeight: 520,
                  overflow: 'auto',
                }}
              >
                <TalkBrief talk={selectedTalk} showTitle={false} />
              </div>
            ) : (
              <p style={{ color: '#5a6b62' }}>Choose a talk to open the script and picture for the crew.</p>
            )}
            <Form.Item name="siteId" label="Site">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Optional - choose a site or All sites"
                options={siteOptions}
              />
            </Form.Item>
            <Form.Item name="deliveredAt" label="Date" rules={[{ required: true, message: 'Choose a date' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="staffIds"
              label="People present"
              rules={[{ required: true, message: 'Choose at least one person' }]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="Select the crew who attended"
                options={staffOptions}
              />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Optional notes from the talk" />
            </Form.Item>
          </Form>
        </Modal>
        <Modal open={!!detail} title={detail?.talkTitle} footer={null} onCancel={() => setDetail(null)} width={820}>
          {detail ? (
            <div>
              <p>
                {formatWhen(detail.deliveredAt)}
                {detail.siteName ? ` - ${detail.siteName}` : ''}
                {detail.deliveredByName ? ` - ${detail.deliveredByName}` : ''}
              </p>
              {detail.notes ? <p>{detail.notes}</p> : null}
              {detail.brief || detail.points?.length ? (
                <TalkBrief
                  talk={{
                    id: detail.talkId,
                    code: detail.talkCode,
                    title: detail.talkTitle,
                    brief: detail.brief,
                    points: detail.points,
                    durationMins: 0,
                    imageUrl: detail.imageUrl,
                  }}
                />
              ) : null}
              <Table
                rowKey="staffId"
                pagination={false}
                dataSource={detail.attendance || []}
                columns={[
                  { title: 'Person', dataIndex: 'name' },
                  {
                    title: 'Confirmed',
                    dataIndex: 'acknowledgedAt',
                    render: (v) => formatWhen(v),
                  },
                ]}
              />
            </div>
          ) : null}
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default ToolboxPage;
