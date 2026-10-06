import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { DeleteOutlined, EditOutlined, PlusOutlined, PrinterOutlined, ReloadOutlined, UndoOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync, callAPIUploadAsync } from '../../library/helpers/api';
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
  signedAt?: string | null;
  signatureName?: string;
  signoffId?: number | null;
  signoffCount?: number;
  minutes?: string;
};

type PrintedPerson = {
  staffId: number;
  name: string;
  signature: string;
  completedAt: moment.Moment | null;
};

type PrintedForm = {
  kind: 'group' | 'single';
  id: number;
  talkTitle: string;
  siteName: string;
  sessionDate: moment.Moment | null;
  ledBy: string;
  minutes: string;
  notes: string;
  people: PrintedPerson[];
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
  assignedNames?: string;
};

function readProfile() {
  try {
    const raw = localStorage.getItem('profile');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readProfileType() {
  return +readProfile().type || 0;
}

function readProfileName() {
  const profile = readProfile();
  return profile.fullName || profile.full_name || '';
}

function formatWhen(value?: string | null) {
  if (!value) return '';
  const m = moment(value);
  return m.isValid() ? m.format('YYYY-MM-DD') : '';
}

function TalkBrief({
  talk,
  showTitle = true,
  showDiscussion = false,
}: {
  talk: Talk;
  showTitle?: boolean;
  showDiscussion?: boolean;
}) {
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
      {showDiscussion && talk.points?.length ? (
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
  const history = useHistory();
  const isAdmin = readProfileType() === 3;
  const [talks, setTalks] = useState<Talk[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [singleSessions, setSingleSessions] = useState<any[]>([]);
  const [deletedRows, setDeletedRows] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [printedForm, setPrintedForm] = useState<PrintedForm | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openTalk, setOpenTalk] = useState<Talk | null>(null);
  const [editTalk, setEditTalk] = useState<Talk | null>(null);
  const [createTalkOpen, setCreateTalkOpen] = useState(false);
  const [talkImageUploading, setTalkImageUploading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [formPreviewUrl, setFormPreviewUrl] = useState<string | null>(null);
  const [staffOptions, setStaffOptions] = useState<{ label: string; value: number }[]>([]);
  const [siteOptions, setSiteOptions] = useState<{ label: string; value: number }[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [signName, setSignName] = useState(readProfileName);
  const [signSession, setSignSession] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const selectedTalkId = Form.useWatch('talkId', form);
  const selectedTalk = talks.find((talk) => talk.id === selectedTalkId) || null;

  useEffect(() => {
    if (!recordOpen || editingSessionId || !selectedTalk) return;
    form.setFieldsValue({ minutes: selectedTalk.brief || '' });
  }, [editingSessionId, form, recordOpen, selectedTalk, selectedTalkId]);

  const loadTalks = useCallback(async () => {
    const path = isAdmin ? `${endPoint.TOOLBOX}/admin/talks` : `${endPoint.TOOLBOX}/talks`;
    const res = await callAPIAsync(serviceType.COMMON, path, 'GET', null);
    if (res?.code === 1) setTalks(res.data || []);
  }, [isAdmin]);

  const loadSessions = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions`, 'GET', null);
    if (res?.code === 1) setSessions(res.data || []);
  }, []);

  const loadSingleSessions = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/signoffs`, 'GET', null);
    if (res?.code === 1) setSingleSessions(res.data || []);
  }, []);

  const loadDeleted = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/deleted`, 'GET', null);
    if (res?.code === 1) setDeletedRows(res.data || []);
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
      await Promise.all([
        loadTalks(),
        isAdmin ? loadSessions() : loadMine(),
        isAdmin ? loadSingleSessions() : Promise.resolve(),
        isAdmin ? loadLookups() : Promise.resolve(),
        loadDeleted(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadDeleted, loadLookups, loadMine, loadSessions, loadSingleSessions, loadTalks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openScheduleEdit = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions/${id}`, 'GET', null);
    if (res?.code !== 1 || !res.data) {
      message.error(res?.message || 'Could not open this schedule');
      return;
    }
    const data = res.data;
    setEditingSessionId(data.id);
    form.setFieldsValue({
      talkId: data.talkId,
      siteId: data.siteId || 0,
      deliveredAt: data.deliveredAt ? moment(data.deliveredAt) : moment(),
      staffIds: (data.attendance || []).map((person: { staffId: number }) => person.staffId),
      minutes: data.minutes || '',
      notes: data.notes || '',
    });
    setRecordOpen(true);
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
      minutes: values.minutes || '',
      staffIds: values.staffIds || [],
    };
    const res = editingSessionId
      ? await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions/${editingSessionId}`, 'PATCH', payload)
      : await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions`, 'POST', payload);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save the session');
      return;
    }
    message.success(editingSessionId ? 'Schedule updated' : 'Talk scheduled and assigned');
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
      imageUrl: String(values.imageUrl || '').trim(),
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

  const uploadTalkImage = async (file: File) => {
    setTalkImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'toolbox-talk.png');
      const res: any = await callAPIUploadAsync(serviceType.COMMON, endPoint.UPLOAD_FILE, 'POST', formData);
      const url =
        typeof res?.data === 'string'
          ? res.data
          : res?.data?.url || res?.data?.Location || res?.data?.fileUrl || null;
      if (res?.code !== 1 || !url) {
        message.error(res?.message || 'Upload failed');
        return;
      }
      editForm.setFieldsValue({ imageUrl: String(url) });
      message.success('Image uploaded');
    } finally {
      setTalkImageUploading(false);
    }
  };

  const loadRecordUrl = async (path: string) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/${path}`, 'GET', null);
    if (res?.code !== 1 || !res.data?.url) {
      message.error(res?.message || 'Could not open the form');
      return '';
    }
    return String(res.data.url);
  };

  const viewRecord = async (path: string) => {
    const url = await loadRecordUrl(path);
    if (url) setFormPreviewUrl(url);
  };

  const printRecord = async (path: string) => {
    const url = await loadRecordUrl(path);
    if (!url) return;
    const res = { data: { url } };
    const win = window.open(res.data.url, '_blank', 'noopener');
    if (!win) {
      message.warning('Allow pop-ups to print the record');
      return;
    }
    win.addEventListener('load', () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* the opened PDF can still be printed from the browser */
      }
    });
  };

  const submitSignoff = async (talk: Talk) => {
    const name = signName.trim();
    if (!name) {
      message.error('Enter your name to sign');
      return;
    }
    setSigning(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TOOLBOX}/talks/${talk.id}/signoff`,
        'POST',
        { signatureName: name },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save the sign-off');
        return;
      }
      const signedAt = res.data?.signedAt || new Date().toISOString();
      const signatureName = res.data?.signatureName || name;
      setTalks((prev) =>
        prev.map((row) => (row.id === talk.id ? { ...row, signedAt, signatureName } : row)),
      );
      setOpenTalk((current) =>
        current && current.id === talk.id ? { ...current, signedAt, signatureName } : current,
      );
      message.success('Sign-off saved');
      loadMine();
    } finally {
      setSigning(false);
    }
  };

  const submitSessionSignoff = async () => {
    if (!signSession) return;
    const name = signName.trim();
    if (!name) {
      message.error('Enter your name to sign');
      return;
    }
    setSigning(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TOOLBOX}/sessions/${signSession.sessionId}/acknowledge`,
        'POST',
        { signatureName: name },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save the sign-off');
        return;
      }
      message.success('Sign-off saved');
      setSignSession(null);
      refresh();
    } finally {
      setSigning(false);
    }
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
              title: 'Sign-offs',
              dataIndex: 'signoffCount',
              width: 110,
              render: (count: number) => count || 0,
            } as ColumnsType<Talk>[number],
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
        : [
            {
              title: 'Sign-off',
              width: 170,
              render: (_: unknown, row: Talk) =>
                row.signedAt ? moment(row.signedAt).format('DD MMM YYYY HH:mm') : 'Not signed',
            } as ColumnsType<Talk>[number],
          ]),
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
                    minutes: row.brief || '',
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
                    imageUrl: row.imageUrl || '',
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
      title: 'Action',
      width: 280,
      align: 'right',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => viewRecord(`sessions/${row.id}/pdf`)}>
            View
          </Button>
          <Button
            type="link"
            icon={<PrinterOutlined />}
            title="Print"
            aria-label="Print"
            onClick={() => printRecord(`sessions/${row.id}/pdf`)}
          >
            Print
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            title="Edit printed form"
            aria-label="Edit printed form"
            onClick={() => openPrintedGroup(row.id)}
          />
          <Popconfirm
            title={
              <span>
                Move this session to Deleted?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                  You can permanently delete it later from the Deleted tab.
                </div>
              </span>
            }
            okText="Move to Deleted"
            okButtonProps={{ danger: true }}
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
              message.success('Session moved to Deleted');
              refresh();
            }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} title="Delete" aria-label="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openPrintedGroup = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/admin/sessions/${id}`, 'GET', null);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not open the form');
      return;
    }
    const data = res.data;
    setPrintedForm({
      kind: 'group',
      id: data.id,
      talkTitle: data.talkTitle || '',
      siteName: data.siteName || '',
      sessionDate: data.deliveredAt ? moment(data.deliveredAt) : null,
      ledBy: data.deliveredByName || '',
      minutes: data.minutes || data.brief || '',
      notes: data.notes || '',
      people: (data.attendance || []).map((person: any) => ({
        staffId: person.staffId,
        name: person.name || '',
        signature: person.signatureName || '',
        completedAt: person.acknowledgedAt ? moment(person.acknowledgedAt) : null,
      })),
    });
  };

  const openPrintedSingle = (row: any) => {
    const signedAt = row.signedAt ? moment(row.signedAt) : null;
    setPrintedForm({
      kind: 'single',
      id: row.signoffId || row.id,
      talkTitle: row.formTitle || row.talkTitle || row.title || '',
      siteName: '',
      sessionDate: signedAt,
      ledBy: '',
      minutes: row.minutes || row.brief || '',
      notes: '',
      people: [
        {
          staffId: row.staffId,
          name: row.printedName || row.staffName || '',
          signature: row.signatureName || '',
          completedAt: signedAt,
        },
      ],
    });
  };

  const updatePrintedPerson = (index: number, patch: Partial<PrintedPerson>) => {
    setPrintedForm((current) => {
      if (!current) return current;
      const people = current.people.map((person, personIndex) =>
        personIndex === index ? { ...person, ...patch } : person,
      );
      return { ...current, people };
    });
  };

  const savePrintedForm = async () => {
    if (!printedForm) return;
    setSavingForm(true);
    try {
      const person = printedForm.people[0];
      const res =
        printedForm.kind === 'group'
          ? await callAPIAsync(
              serviceType.COMMON,
              `${endPoint.TOOLBOX}/admin/sessions/${printedForm.id}/form`,
              'PATCH',
              {
                talkTitle: printedForm.talkTitle,
                siteName: printedForm.siteName,
                deliveredAt: printedForm.sessionDate ? printedForm.sessionDate.toISOString() : undefined,
                ledBy: printedForm.ledBy,
                minutes: printedForm.minutes,
                notes: printedForm.notes,
                people: printedForm.people.map((row) => ({
                  staffId: row.staffId,
                  name: row.name,
                  signature: row.signature,
                  completedAt: row.completedAt ? row.completedAt.toISOString() : null,
                })),
              },
            )
          : await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/signoffs/${printedForm.id}`, 'PATCH', {
              formTitle: printedForm.talkTitle,
              printedName: person?.name || '',
              signatureName: person?.signature || '',
              minutes: printedForm.minutes,
              signedAt: person?.completedAt ? person.completedAt.toISOString() : undefined,
            });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save the form');
        return;
      }
      message.success('Printed form updated');
      setPrintedForm(null);
      refresh();
    } finally {
      setSavingForm(false);
    }
  };

  const moveSignoffToDeleted = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/signoffs/${id}`, 'DELETE', null);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete the sign-off');
      return;
    }
    message.success('Sign-off moved to Deleted');
    refresh();
  };

  const restoreDeleted = async (row: any) => {
    const path =
      row.kind === 'group'
        ? `${endPoint.TOOLBOX}/admin/sessions/${row.id}/restore`
        : `${endPoint.TOOLBOX}/signoffs/${row.id}/restore`;
    const res = await callAPIAsync(serviceType.COMMON, path, 'POST', {});
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore');
      return;
    }
    message.success('Restored');
    refresh();
  };

  const purgeDeleted = async (row: any) => {
    const path =
      row.kind === 'group'
        ? `${endPoint.TOOLBOX}/admin/sessions/${row.id}/permanent`
        : `${endPoint.TOOLBOX}/signoffs/${row.id}/permanent`;
    const res = await callAPIAsync(serviceType.COMMON, path, 'DELETE', null);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete');
      return;
    }
    message.success('Permanently deleted');
    refresh();
  };

  const deletedTab = {
    key: 'deleted',
    label: `Deleted (${deletedRows.length})`,
    children: (
      <Table
        rowKey="key"
        loading={loading}
        dataSource={deletedRows}
        locale={{ emptyText: 'Nothing in Deleted.' }}
        pagination={false}
        columns={[
          {
            title: 'Deleted',
            dataIndex: 'deletedAt',
            width: 170,
            render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
          },
          {
            title: 'Type',
            dataIndex: 'kind',
            width: 100,
            render: (value) => (value === 'group' ? 'Group' : 'Single'),
          },
          { title: 'Talk', dataIndex: 'talkTitle' },
          { title: 'Staff / site', dataIndex: 'who', render: (value) => value || '' },
          {
            title: 'Action',
            width: 160,
            align: 'right' as const,
            render: (_, row) => (
              <Space>
                <Button
                  type="link"
                  icon={<PrinterOutlined />}
                  title="Print"
                  aria-label="Print"
                  onClick={() =>
                    printRecord(row.kind === 'group' ? `sessions/${row.id}/pdf` : `signoffs/${row.id}/pdf`)
                  }
                />
                <Popconfirm title="Restore this record?" okText="Restore" onConfirm={() => restoreDeleted(row)}>
                  <Button type="link" icon={<UndoOutlined />} title="Restore" aria-label="Restore" />
                </Popconfirm>
                {isAdmin ? (
                  <Popconfirm
                    title={
                      <span>
                        Permanently delete this record?
                        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                          This cannot be undone.
                        </div>
                      </span>
                    }
                    okText="Delete permanently"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => purgeDeleted(row)}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} title="Delete permanently" aria-label="Delete permanently" />
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    ),
  };

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
                    editForm.setFieldsValue({ title: '', durationMins: 10, brief: '', points: '', imageUrl: '' });
                  }}
                >
                  New talk
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSessionId(null);
                    form.setFieldsValue({ deliveredAt: moment(), staffIds: [], talkId: undefined, siteId: undefined, notes: '', minutes: '' });
                    setRecordOpen(true);
                  }}
                >
                  Schedule talk
                </Button>
              </>
            ) : null}
          </Space>
          {isAdmin ? (
            <Tabs
              defaultActiveKey="schedule"
              items={[
                {
                  key: 'schedule',
                  label: `Schedule (${sessions.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      loading={loading}
                      dataSource={sessions}
                      locale={{ emptyText: 'No talks scheduled. Use Schedule talk to assign one to staff.' }}
                      columns={[
                        {
                          title: 'When',
                          dataIndex: 'deliveredAt',
                          width: 170,
                          render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                        },
                        { title: 'Talk', dataIndex: 'talkTitle' },
                        { title: 'Site', dataIndex: 'siteName', render: (value) => value || '' },
                        { title: 'Assigned staff', dataIndex: 'assignedNames', render: (value) => value || '' },
                        {
                          title: 'Signed off',
                          width: 110,
                          render: (_, row) => `${row.acknowledged}/${row.present}`,
                        },
                        {
                          title: 'Action',
                          key: 'actions',
                          width: 90,
                          align: 'right',
                          render: (_, row) => (
                            <Space
                              size={4}
                              className="new-reports-row-actions"
                              style={{ width: '100%', justifyContent: 'flex-end' }}
                            >
                              <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                aria-label="Edit"
                                title="Edit"
                                onClick={() => openScheduleEdit(row.id)}
                              />
                              <Popconfirm
                                title={
                                  <span>
                                    Move this scheduled talk to Deleted?
                                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                                      You can permanently delete it later from the Deleted tab.
                                    </div>
                                  </span>
                                }
                                okText="Move to Deleted"
                                okButtonProps={{ danger: true }}
                                cancelText="Cancel"
                                onConfirm={async () => {
                                  const res = await callAPIAsync(
                                    serviceType.COMMON,
                                    `${endPoint.TOOLBOX}/admin/sessions/${row.id}`,
                                    'DELETE',
                                    null,
                                  );
                                  if (res?.code !== 1) {
                                    message.error(res?.message || 'Could not delete the schedule');
                                    return;
                                  }
                                  message.success('Schedule moved to Deleted');
                                  refresh();
                                }}
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
                      ]}
                    />
                  ),
                },
                {
                  key: 'talks',
                  label: 'Talks',
                  children: (
                    <Table rowKey="id" loading={loading} columns={talkColumns} dataSource={talks} pagination={false} />
                  ),
                },
                {
                  key: 'sessions',
                  label: `Group Sessions (${sessions.length})`,
                  children: <Table rowKey="id" loading={loading} columns={sessionColumns} dataSource={sessions} />,
                },
                {
                  key: 'single',
                  label: `Single Sessions (${singleSessions.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      loading={loading}
                      dataSource={singleSessions}
                      locale={{ emptyText: 'No single staff sign-offs yet.' }}
                      columns={[
                        {
                          title: 'Signed',
                          dataIndex: 'signedAt',
                          width: 170,
                          render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                        },
                        { title: 'Staff', dataIndex: 'staffName' },
                        { title: 'Signed as', dataIndex: 'signatureName' },
                        { title: 'Talk', dataIndex: 'talkTitle' },
                        {
                          title: 'Action',
                          width: 180,
                          align: 'right',
                          render: (_, row) => (
                            <Space>
                              <Button type="link" onClick={() => viewRecord(`signoffs/${row.id}/pdf`)}>
                                View
                              </Button>
                              <Button
                                type="link"
                                icon={<PrinterOutlined />}
                                title="Print"
                                aria-label="Print"
                                onClick={() => printRecord(`signoffs/${row.id}/pdf`)}
                              />
                              <Button
                                type="link"
                                icon={<EditOutlined />}
                                title="Edit"
                                aria-label="Edit"
                                onClick={() => openPrintedSingle(row)}
                              />
                              <Popconfirm
                                title={
                                  <span>
                                    Move this sign-off to Deleted?
                                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                                      You can permanently delete it later from the Deleted tab.
                                    </div>
                                  </span>
                                }
                                okText="Move to Deleted"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => moveSignoffToDeleted(row.id)}
                              >
                                <Button type="link" danger icon={<DeleteOutlined />} title="Delete" aria-label="Delete" />
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
                },
                deletedTab,
              ]}
            />
          ) : (
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
                  label: `Group Sessions (${mine.length})`,
                  children: (
                    <Table
                      rowKey="attendanceId"
                      loading={loading}
                      dataSource={mine}
                      locale={{ emptyText: 'No talks have been assigned to you yet.' }}
                      pagination={false}
                      columns={[
                        { title: 'Date', dataIndex: 'deliveredAt', width: 120, render: (v) => formatWhen(v) },
                        { title: 'Talk', dataIndex: 'talkTitle' },
                        { title: 'Site', dataIndex: 'siteName', render: (v) => v || '' },
                        {
                          title: 'Action',
                          width: 180,
                          align: 'right',
                          render: (_, row) => (
                            <Space>
                              {row.acknowledgedAt ? (
                                <span>{formatWhen(row.acknowledgedAt)}</span>
                              ) : (
                                <Button type="link" onClick={() => history.push('/my-tasks')}>
                                  Read and sign
                                </Button>
                              )}
                              <Button type="link" onClick={() => viewRecord(`sessions/${row.sessionId}/pdf`)}>
                                View
                              </Button>
                              <Button
                                type="link"
                                icon={<PrinterOutlined />}
                                title="Print"
                                aria-label="Print"
                                onClick={() => printRecord(`sessions/${row.sessionId}/pdf`)}
                              >
                                Print
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'single',
                  label: `Single Sessions (${talks.filter((talk) => talk.signedAt).length})`,
                  children: (
                    <Table
                      rowKey="id"
                      loading={loading}
                      dataSource={talks.filter((talk) => talk.signedAt)}
                      locale={{ emptyText: 'You have not signed a toolbox talk yet.' }}
                      pagination={false}
                      columns={[
                        {
                          title: 'Signed',
                          dataIndex: 'signedAt',
                          width: 170,
                          render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                        },
                        { title: 'Signed as', dataIndex: 'signatureName' },
                        { title: 'Talk', dataIndex: 'title' },
                        {
                          title: 'Action',
                          width: 180,
                          align: 'right',
                          render: (_, row) => (
                            <Space>
                              <Button
                                type="link"
                                onClick={() => (row.signoffId ? viewRecord(`signoffs/${row.signoffId}/pdf`) : setOpenTalk(row))}
                              >
                                View
                              </Button>
                              {row.signoffId ? (
                                <>
                                  <Button
                                    type="link"
                                    icon={<PrinterOutlined />}
                                    title="Print"
                                    aria-label="Print"
                                    onClick={() => printRecord(`signoffs/${row.signoffId}/pdf`)}
                                  />
                                  <Button
                                    type="link"
                                    icon={<EditOutlined />}
                                    title="Edit"
                                    aria-label="Edit"
                                    onClick={() => openPrintedSingle(row)}
                                  />
                                  <Popconfirm
                                    title={
                                      <span>
                                        Remove this sign-off from your list?
                                        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                                          It moves to Deleted. You can restore it from the Deleted tab.
                                        </div>
                                      </span>
                                    }
                                    okText="Remove"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => moveSignoffToDeleted(row.signoffId)}
                                  >
                                    <Button type="link" danger icon={<DeleteOutlined />} title="Delete" aria-label="Delete" />
                                  </Popconfirm>
                                </>
                              ) : null}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
                },
                deletedTab,
              ]}
            />
          )}
        </div>
        <Modal
          open={!!openTalk}
          title={openTalk?.title}
          footer={null}
          onCancel={() => setOpenTalk(null)}
          width={820}
        >
          {openTalk ? <TalkBrief talk={openTalk} showDiscussion={isAdmin} /> : null}
          {openTalk && !isAdmin ? (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ marginBottom: 8 }}>Digital sign-off</h4>
              {openTalk.signedAt ? (
                <p style={{ margin: 0 }}>
                  Signed by {openTalk.signatureName || 'you'} on{' '}
                  {moment(openTalk.signedAt).format('DD MMM YYYY HH:mm')}.
                </p>
              ) : (
                <>
                  <p style={{ marginTop: 0 }}>
                    Type your name to confirm you have completed this toolbox talk.
                  </p>
                  <Input
                    value={signName}
                    placeholder="Your name"
                    onChange={(e) => setSignName(e.target.value)}
                    style={{ maxWidth: 360, marginBottom: 12 }}
                  />
                  <div>
                    <Button type="primary" loading={signing} onClick={() => submitSignoff(openTalk)}>
                      Submit acknowledgment
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </Modal>
        <Modal
          open={!!printedForm}
          title="Edit printed form"
          okText="Save"
          confirmLoading={savingForm}
          onOk={savePrintedForm}
          onCancel={() => setPrintedForm(null)}
          width={820}
        >
          {printedForm ? (
            <div>
              <p>Toolbox talk</p>
              <Input
                value={printedForm.talkTitle}
                onChange={(e) => setPrintedForm({ ...printedForm, talkTitle: e.target.value })}
              />
              {printedForm.kind === 'group' ? (
                <>
                  <p style={{ marginTop: 16 }}>Site</p>
                  <Input
                    value={printedForm.siteName}
                    onChange={(e) => setPrintedForm({ ...printedForm, siteName: e.target.value })}
                  />
                  <p style={{ marginTop: 16 }}>Session date</p>
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    value={printedForm.sessionDate}
                    onChange={(value) => setPrintedForm({ ...printedForm, sessionDate: value })}
                  />
                  <p style={{ marginTop: 16 }}>Led by</p>
                  <Input
                    value={printedForm.ledBy}
                    onChange={(e) => setPrintedForm({ ...printedForm, ledBy: e.target.value })}
                  />
                </>
              ) : null}
              <p style={{ marginTop: 16 }}>Staff on the form</p>
              {printedForm.people.map((person, index) => (
                <div key={`${person.staffId}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 8, marginBottom: 8 }}>
                  <Input
                    placeholder="Staff"
                    value={person.name}
                    onChange={(e) => updatePrintedPerson(index, { name: e.target.value })}
                  />
                  <Input
                    placeholder="Signature"
                    value={person.signature}
                    onChange={(e) => updatePrintedPerson(index, { signature: e.target.value })}
                  />
                  <DatePicker
                    showTime
                    placeholder="Completed"
                    value={person.completedAt}
                    onChange={(value) => updatePrintedPerson(index, { completedAt: value })}
                  />
                </div>
              ))}
              <p style={{ marginTop: 16 }}>Minutes (what was read or discussed)</p>
              <Input.TextArea
                rows={8}
                value={printedForm.minutes}
                onChange={(e) => setPrintedForm({ ...printedForm, minutes: e.target.value })}
              />
              {printedForm.kind === 'group' ? (
                <>
                  <p style={{ marginTop: 16 }}>Notes</p>
                  <Input.TextArea
                    rows={3}
                    value={printedForm.notes}
                    onChange={(e) => setPrintedForm({ ...printedForm, notes: e.target.value })}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </Modal>
        <Modal
          open={!!signSession}
          title="Digital sign-off"
          okText="Submit acknowledgment"
          confirmLoading={signing}
          onOk={submitSessionSignoff}
          onCancel={() => setSignSession(null)}
        >
          <p>Type your name to confirm you completed {signSession?.talkTitle || 'this toolbox talk'}.</p>
          <Input
            value={signName}
            placeholder="Your name"
            onChange={(e) => setSignName(e.target.value)}
          />
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
            <Form.Item name="imageUrl" hidden>
              <Input />
            </Form.Item>
            <Form.Item label="Picture" extra="Upload a new picture to replace the one shown with this talk.">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item noStyle shouldUpdate={(prev, next) => prev.imageUrl !== next.imageUrl}>
                  {() => {
                    const url = editForm.getFieldValue('imageUrl');
                    const preview = url || (editTalk ? toolboxImageFor({ ...editTalk, imageUrl: '' }) : '');
                    return preview ? (
                      <img
                        src={preview}
                        alt=""
                        style={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          objectFit: 'contain',
                          borderRadius: 8,
                          border: '1px solid #d5e0d8',
                          background: '#fff',
                        }}
                      />
                    ) : (
                      <div style={{ color: '#5a6b62' }}>No picture yet</div>
                    );
                  }}
                </Form.Item>
                <Space wrap>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        await uploadTalkImage(file as File);
                        onSuccess?.({}, new XMLHttpRequest());
                      } catch (err) {
                        onError?.(err as Error);
                      }
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={talkImageUploading}>
                      Upload picture
                    </Button>
                  </Upload>
                  <Button onClick={() => editForm.setFieldsValue({ imageUrl: '' })}>Clear picture</Button>
                </Space>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          open={recordOpen}
          title={editingSessionId ? 'Edit scheduled talk' : 'Schedule toolbox talk'}
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
                <TalkBrief talk={selectedTalk} showTitle={false} showDiscussion />
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
            <Form.Item name="deliveredAt" label="When" rules={[{ required: true, message: 'Choose a date and time' }]}>
              <DatePicker showTime style={{ width: '100%' }} format="DD MMM YYYY HH:mm" />
            </Form.Item>
            <Form.Item
              name="staffIds"
              label="Assign to staff"
              rules={[{ required: true, message: 'Choose at least one person' }]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="Select the staff who must attend"
                options={staffOptions}
              />
            </Form.Item>
            <Form.Item name="minutes" label="Minutes (what was read or discussed)">
              <Input.TextArea rows={6} placeholder="The script read with the crew" />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Optional notes from the talk" />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          open={!!formPreviewUrl}
          title="Toolbox talk record"
          footer={null}
          width={920}
          onCancel={() => setFormPreviewUrl(null)}
          bodyStyle={{ padding: 0 }}
        >
          {formPreviewUrl ? (
            <iframe title="Toolbox talk record" src={formPreviewUrl} style={{ width: '100%', height: '78vh', border: 0 }} />
          ) : null}
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default ToolboxPage;
