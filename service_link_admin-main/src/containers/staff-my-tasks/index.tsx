import { FaultListStatusBadge } from '@app/components/report-faults/delegation-outcome';
import FaultReportViewModal from '@app/components/report-faults/fault-report-view';
import Layout from '@app/components/layout/Layout';
import { dateFormat, dateTimeFormat } from '@app/config/data.config';
import actionType from '@app/constants/actionType';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { dJobStatus, userType } from '@app/constants/statusUser';
import useMobilePortrait from '@app/library/hooks/useMobilePortrait';
import { callAPIAsync } from '@app/library/helpers/api';
import { beginPhoneLocation, primeShutter, requestPhoneCamera } from '@app/library/helpers/phone-shot';
import actions from '@app/redux/tasks/actions';
import { FaultMedia, isFaultVideoUrl } from '@app/components/report-faults/fault-media';
import UploadImageMultil from '@app/components/common/upload-image-multi';
import PhoneCamera from '@app/containers/field-photos/PhoneCamera';
import urlConfig from '@app/config/site.config';
import {
  CameraOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MailOutlined,
  ReadOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { Button, Image, Input, Modal, Popconfirm, Radio, Spin, Table, Tag, Tooltip, message } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { toolboxImageFor } from '../toolbox/toolboxMedia';
import '../toolbox/toolboxBrief.css';
import './staff-my-tasks.css';

const formatDateTime = (value?: string | null) =>
  value ? moment(value).format(dateTimeFormat) : '—';

const sydneyDay = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

type ListView = 'open' | 'done';

type ToolboxTask = {
  attendanceId: number;
  sessionId: number;
  talkId?: number;
  talkTitle: string;
  brief?: string;
  durationMins?: number;
  imageUrl?: string | null;
  code?: string;
  siteName?: string;
  deliveredAt?: string;
  acknowledgedAt?: string | null;
};

type TaskCategory = 'scheduled' | 'fault' | 'toolbox' | 'training';

type UnifiedRow = {
  key: string;
  category: TaskCategory;
  workType: 'scheduled' | 'assigned';
  assignedKind?: 'fault' | 'toolbox';
  title: string;
  description?: string;
  siteName?: string;
  when?: string;
  sortRank: number;
  statusLabel: React.ReactNode;
  raw: any;
};

const cleanText = (value?: string | null) => String(value || '').trim();

const parseMediaUrls = (task: any): string[] => {
  const urls: string[] = [];
  const push = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string' && item.trim()) urls.push(item.trim());
        else if (item && typeof item === 'object' && (item as any).url) {
          urls.push(String((item as any).url).trim());
        }
      });
      return;
    }
    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        push(parsed);
      } catch {
        if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) urls.push(raw);
      }
    }
  };
  push(task?.images);
  push(task?.attachFiles);
  if (Array.isArray(task?.items)) {
    for (const item of task.items) {
      const type = String(item?.type || '').toUpperCase();
      if (type === 'IMAGE' || type === 'IMAGES' || type === 'PHOTO' || type === 'MEDIA') {
        push(item?.value);
      }
    }
  }
  return [...new Set(urls.filter(Boolean))];
};

/** List view only — a few words of “what to do”, not the full brief. */
const shortTaskDescription = (
  value?: string | null,
  fallback?: string,
  maxWords = 8,
): string => {
  const text = cleanText(value).replace(/\s+/g, ' ');
  if (!text) return cleanText(fallback) || '—';
  const firstChunk =
    text.split(/(?<=[.!?])\s+/)[0] ||
    text.split(/\n/)[0] ||
    text;
  const words = firstChunk.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
};

/** Short learning blurb from talk/training title — not the full brief. */
const learnAboutDescription = (title?: string | null) => {
  const name = cleanText(title);
  if (!name) return 'Learn about this topic';
  if (/^learn about\b/i.test(name)) return name;
  return `Learn about ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
};

const categoryTag = (category: TaskCategory) => {
  if (category === 'scheduled') return <Tag color="blue">Scheduled</Tag>;
  if (category === 'fault') return <Tag color="purple">Fault</Tag>;
  if (category === 'toolbox') return <Tag color="green">Toolbox talk</Tag>;
  return <Tag color="cyan">Training</Tag>;
};

function TalkToRead({ talk }: { talk: ToolboxTask }) {
  const image = toolboxImageFor({ ...talk, title: talk.talkTitle });
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
    if (!sections.length) sections.push({ paragraphs: [line] });
    else sections[sections.length - 1].paragraphs.push(line);
  }
  return (
    <div className="toolbox-brief">
      {image ? (
        <div className="toolbox-brief__hero">
          <img src={image} alt="" />
        </div>
      ) : null}
      <p className="toolbox-brief__meta">
        Attend {formatDateTime(talk.deliveredAt)}
        {talk.siteName ? ` · ${talk.siteName}` : ''}
        {talk.durationMins ? ` · ${talk.durationMins} minute talk` : ''}
      </p>
      {lead ? <p className="toolbox-brief__lead">{lead}</p> : null}
      {sections.map((section, index) => (
        <div key={`${section.heading || 'body'}-${index}`} className="toolbox-brief__section">
          {section.heading ? <h4>{section.heading}</h4> : null}
          {section.paragraphs.map((paragraph, pIndex) => (
            <p key={`${index}-${pIndex}`}>{paragraph}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function scheduleStatusTag(status: number) {
  if (status === dJobStatus.NEW || status === dJobStatus.PENDING) {
    return <Tag color="#ffc107">Pending</Tag>;
  }
  if (status === dJobStatus.INPROGRESS) return <Tag color="#F44336">In progress</Tag>;
  if (status === dJobStatus.COMPLETED) return <Tag color="#4caf50">Completed</Tag>;
  return <Tag>—</Tag>;
}

function scheduleWhen(task: any) {
  if (!task?.startTime) return formatDateTime(task?.createdAt);
  const day = moment(task.startTime).utcOffset('+10:00').format(dateFormat);
  const from = moment(task.startTime).utcOffset('+10:00').format('HH:mm');
  const to = task.endTime ? moment(task.endTime).utcOffset('+10:00').format('HH:mm') : '';
  return to ? `${day} · ${from}–${to}` : `${day} · ${from}`;
}

/** Lower = higher on the Open list */
function scheduleSortRank(status: number) {
  if (+status === dJobStatus.INPROGRESS) return 1;
  if (+status === dJobStatus.NEW || +status === dJobStatus.PENDING) return 3;
  return 5;
}

const StaffMyTasksPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const isMobilePortrait = useMobilePortrait();
  const { success } = useSelector((state: any) => state?.tasks);

  const [loading, setLoading] = useState(true);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [inProgressRows, setInProgressRows] = useState<any[]>([]);
  const [completedRows, setCompletedRows] = useState<any[]>([]);
  const [faultRows, setFaultRows] = useState<any[]>([]);
  const [toolboxTasks, setToolboxTasks] = useState<ToolboxTask[]>([]);
  const [reading, setReading] = useState<ToolboxTask | null>(null);
  const [justSignedId, setJustSignedId] = useState<number | null>(null);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [viewTask, setViewTask] = useState<any | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneRequest, setPhoneRequest] = useState<Promise<MediaStream> | null>(null);
  const [cameraTaskId, setCameraTaskId] = useState<number | null>(null);

  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;

  const urlParams = new URLSearchParams(location.search);
  const view: ListView = urlParams.get('view') === 'done' ? 'done' : 'open';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'done') {
        const [doneRes] = await Promise.all([
          callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, 'GET', {
            status: 's',
            page: 1,
            limit: 100,
            orderBy: 'id',
            orderValue: 'DESC',
          }),
        ]);
        setCompletedRows(Array.isArray(doneRes?.data?.rows) ? doneRes.data.rows : []);
        setPendingRows([]);
        setInProgressRows([]);
        setFaultRows([]);
        setToolboxTasks([]);
      } else {
        const [pendingRes, inProgressRes, faultRes, toolboxRes] = await Promise.all([
          callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, 'GET', {
            status: 'p',
            page: 1,
            limit: 100,
            orderBy: 'id',
            orderValue: 'DESC',
          }),
          callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, 'GET', {
            status: 'i',
            page: 1,
            limit: 100,
            orderBy: 'id',
            orderValue: 'DESC',
          }),
          callAPIAsync(serviceType.COMMON, `${endPoint.REPORT_FAULTS}/my-tasks`, 'GET', {}),
          callAPIAsync(serviceType.COMMON, `${endPoint.TOOLBOX}/me`, 'GET', null),
        ]);
        setPendingRows(Array.isArray(pendingRes?.data?.rows) ? pendingRes.data.rows : []);
        setInProgressRows(Array.isArray(inProgressRes?.data?.rows) ? inProgressRes.data.rows : []);
        setCompletedRows([]);
        setFaultRows(Array.isArray(faultRes?.data) ? faultRes.data : []);
        const today = sydneyDay(new Date());
        const upcoming = (Array.isArray(toolboxRes?.data) ? toolboxRes.data : [])
          .filter((t: ToolboxTask) => !t.acknowledgedAt && sydneyDay(t.deliveredAt) >= today)
          .sort(
            (a: ToolboxTask, b: ToolboxTask) =>
              +new Date(a.deliveredAt || 0) - +new Date(b.deliveredAt || 0),
          );
        setToolboxTasks(upcoming.slice(0, 1));
      }
    } catch {
      setPendingRows([]);
      setInProgressRows([]);
      setCompletedRows([]);
      setFaultRows([]);
      setToolboxTasks([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    if (profileType !== userType.STAFF) {
      history.replace('/dashboard');
      return;
    }
    // Old status / tab links → Open or Done
    const status = urlParams.get('status');
    const tab = urlParams.get('tab');
    if (status === 's') {
      history.replace('/my-tasks?view=done');
      return;
    }
    if (status || tab) {
      history.replace('/my-tasks');
      return;
    }
    void load();
  }, [load, profileType, history, location.search]);

  useEffect(() => {
    if (success) void load();
  }, [success, load]);

  useEffect(() => {
    // Clear any leftover Report modal from other task screens
    dispatch({ type: actions.MODAL, payload: { modalType: null, row: null } });
    return () => {
      dispatch(actions.clearData());
    };
  }, [dispatch]);

  const openTalk = (talk: ToolboxTask) => {
    setSignName(profile?.fullName || profile?.full_name || '');
    setJustSignedId(null);
    setReading(talk);
  };

  const printTalk = async (sessionId: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TOOLBOX}/sessions/${sessionId}/pdf`,
      'GET',
      null,
    );
    const url = res?.data?.url;
    if (res?.code !== 1 || !url) {
      message.error(res?.message || 'Could not open the form');
      return;
    }
    const win = window.open(url, '_blank', 'noopener');
    if (!win) message.warning('Allow pop-ups to print the record');
  };

  const signTalk = async () => {
    if (!reading || signing) return;
    const name = signName.trim();
    if (!name) {
      message.error('Enter your name to sign');
      return;
    }
    setSigning(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TOOLBOX}/sessions/${reading.sessionId}/acknowledge`,
        'POST',
        { signatureName: name },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save the sign-off');
        return;
      }
      message.success('Toolbox talk signed');
      setJustSignedId(reading.sessionId);
      setToolboxTasks((prev) => prev.filter((t) => t.attendanceId !== reading.attendanceId));
    } finally {
      setSigning(false);
    }
  };

  const openFault = async (fault: any) => {
    const faultId = fault?.reportFaultId ?? fault?.id;
    if (!faultId) return;
    void callAPIAsync(
      serviceType.COMMON,
      `${endPoint.REPORT_FAULTS}/${faultId}/staff-view`,
      'PATCH',
      {},
    );
    setViewRow(fault);
  };

  const onFaultUpdated = useCallback(
    (payload?: Record<string, unknown>) => {
      if (payload?.id == null) {
        void load();
        return;
      }
      const faultId = +payload.id;
      setFaultRows((prev) =>
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
    setFaultRows((prev) =>
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

  const mapSchedule = (task: any): UnifiedRow => ({
    key: `sched-${task.id ?? `${task.taskId}-${task.taskShiftId}`}`,
    category: 'scheduled',
    workType: 'scheduled',
    title: task.taskName || task.serviceName || 'Task',
    description: shortTaskDescription(
      task.description,
      task.serviceName || 'Complete scheduled work',
    ),
    siteName: task.siteName,
    when: scheduleWhen(task),
    sortRank: scheduleSortRank(+task.status),
    statusLabel: scheduleStatusTag(+task.status),
    raw: task,
  });

  const unifiedRows: UnifiedRow[] = useMemo(() => {
    if (view === 'done') {
      return completedRows.map(mapSchedule);
    }

    const scheduled = [...inProgressRows, ...pendingRows].map(mapSchedule);

    const faults: UnifiedRow[] = faultRows.map((fault) => {
      const urgent = +fault.priority === 1;
      const overdue =
        !fault.delegatedActedAt &&
        fault.delegatedUntil &&
        new Date(fault.delegatedUntil).getTime() < Date.now();
      return {
        key: `fault-${fault.reportFaultId ?? fault.id}`,
        category: 'fault' as const,
        workType: 'assigned' as const,
        assignedKind: 'fault' as const,
        title: fault.issue || 'Fault assignment',
        description: shortTaskDescription(
          fault.description || fault.details || fault.delegationNote || fault.notes,
          'Review and confirm acted',
        ),
        siteName: fault.siteName,
        when: fault.delegatedUntil
          ? `Act by ${formatDateTime(fault.delegatedUntil)}`
          : formatDateTime(fault.createdAt),
        sortRank: urgent || overdue ? 0 : 2,
        statusLabel: <FaultListStatusBadge record={fault} />,
        raw: fault,
      };
    });

    const talks: UnifiedRow[] = toolboxTasks.map((talk) => ({
      key: `toolbox-${talk.attendanceId}`,
      category: 'toolbox' as const,
      workType: 'assigned' as const,
      assignedKind: 'toolbox' as const,
      title: talk.talkTitle,
      description: learnAboutDescription(talk.talkTitle),
      siteName: talk.siteName,
      when: formatDateTime(talk.deliveredAt),
      sortRank: 2,
      statusLabel: <Tag color="green">To read</Tag>,
      raw: talk,
    }));

    return [...talks, ...faults, ...scheduled].sort((a, b) => a.sortRank - b.sortRank);
  }, [view, completedRows, pendingRows, inProgressRows, faultRows, toolboxTasks]);

  const taskNeedsMedia = (task: any) => +task?.mediaRequired === 1;

  const patchTaskImagesLocal = (taskId: number, images: string) => {
    const patch = (rows: any[]) =>
      rows.map((r) => (+r.id === +taskId ? { ...r, images } : r));
    setPendingRows((rows) => patch(rows));
    setInProgressRows((rows) => patch(rows));
    setCompletedRows((rows) => patch(rows));
    setViewTask((prev) => (prev && +prev.id === +taskId ? { ...prev, images } : prev));
  };

  const persistTaskImages = async (task: any, files: string[]) => {
    if (!task?.id) return;
    const images = JSON.stringify(files || []);
    patchTaskImagesLocal(+task.id, images);
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.USER_TASKS}/${task.id}`,
      'PATCH',
      { images },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save media');
      throw new Error(res?.message || 'Could not save media');
    }
  };

  const openTaskPdfFromDb = useCallback(async (taskId: number) => {
    if (!taskId) return;
    setPdfBusyId(taskId);
    const hide = message.loading('Generating PDF…', 0);
    try {
      const token = localStorage.getItem('id_token') || '';
      const res = await fetch(`${urlConfig.orderApiURL}${endPoint.USER_TASKS}/${taskId}/pdf`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let msg = 'Could not generate PDF';
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch {
          /* ignore */
        }
        message.error(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      message.error((e as Error)?.message || 'Could not generate PDF');
    } finally {
      hide();
      setPdfBusyId(null);
    }
  }, []);

  const openTaskCamera = (task: any) => {
    if (!task?.id) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      message.error('This phone browser cannot open the camera.');
      return;
    }
    beginPhoneLocation();
    primeShutter();
    setCameraTaskId(+task.id);
    setPhoneRequest(requestPhoneCamera('environment'));
    setPhoneOpen(true);
  };

  const completeScheduleTask = (task: any) => {
    if (taskNeedsMedia(task) && parseMediaUrls(task).length === 0) {
      message.error('Attach media images before completing this task');
      setViewTask(task);
      return;
    }
    dispatch(
      actions.saveInto(
        {
          ...task,
          status: 1,
          images: task.images || JSON.stringify(parseMediaUrls(task)),
        },
        actionType.CHECK_OUT,
        false,
      ),
    );
  };

  const renderScheduleActions = (task: any) => {
    const viewBtn = (
      <Button
        type="link"
        icon={<EyeOutlined />}
        aria-label="View task"
        onClick={() => setViewTask(task)}
      />
    );
    const messageBtn = task?.id ? (
      <Tooltip title="Message about this task">
        <Link to={`/messages?userTaskId=${task.id}`}>
          <Button type="link" icon={<MailOutlined />} aria-label="Message about this task" />
        </Link>
      </Tooltip>
    ) : null;
    const pdfBtn = task?.id ? (
      <Tooltip title="Generate PDF">
        <Button
          type="link"
          icon={<FilePdfOutlined />}
          loading={pdfBusyId === +task.id}
          disabled={pdfBusyId === +task.id}
          onClick={() => void openTaskPdfFromDb(+task.id)}
        />
      </Tooltip>
    ) : null;
    if (+task.status === dJobStatus.COMPLETED) {
      return (
        <div className="staff-my-tasks-actions-row">
          {viewBtn}
          {pdfBtn}
          {messageBtn}
        </div>
      );
    }
    if (!task?.id) {
      return <div className="staff-my-tasks-actions-row">{viewBtn}</div>;
    }
    return (
      <div className="staff-my-tasks-actions-row">
        {viewBtn}
        {pdfBtn}
        {messageBtn}
        <Popconfirm
          title={
            taskNeedsMedia(task)
              ? 'Mark complete? Media images are required for this task.'
              : 'Mark this task completed?'
          }
          okText="Yes"
          cancelText="No"
          placement="topRight"
          onConfirm={() => completeScheduleTask(task)}
        >
          <Button type="primary" size="small">
            Mark complete
          </Button>
        </Popconfirm>
      </div>
    );
  };

  const renderActions = (item: UnifiedRow) => {
    if (item.workType === 'scheduled') return renderScheduleActions(item.raw);
    if (item.assignedKind === 'toolbox') {
      return (
        <Button type="primary" icon={<ReadOutlined />} onClick={() => openTalk(item.raw)}>
          Read talk
        </Button>
      );
    }
    return (
      <Button type="primary" icon={<EyeOutlined />} onClick={() => void openFault(item.raw)}>
        Open
      </Button>
    );
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      width: '14%',
      render: (category: TaskCategory, item: UnifiedRow) => (
        <div className="staff-my-tasks-task-cell__badges">
          {categoryTag(category)}
          {item.category === 'fault' && +item.raw.priority === 1 ? (
            <Tag color="red">
              <ThunderboltFilled /> Urgent
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Task',
      dataIndex: 'title',
      width: '22%',
      render: (title: string, item: UnifiedRow) => (
        <div className="staff-my-tasks-task-cell">
          <div className="staff-my-tasks-task-cell__title">
            <span>{title}</span>
          </div>
          {item.siteName ? (
            <div className="staff-my-tasks-task-cell__site">{item.siteName}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: '28%',
      render: (v: string) => (
        <div className="staff-my-tasks-desc-cell">{v || '—'}</div>
      ),
    },
    {
      title: 'When',
      dataIndex: 'when',
      width: '12%',
      render: (v: string) => <span className="staff-my-tasks-when-cell">{v || '—'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'statusLabel',
      width: '12%',
    },
    {
      title: 'Action',
      key: 'action',
      width: '12%',
      render: (_: unknown, item: UnifiedRow) => (
        <div className="staff-my-tasks-action-cell">{renderActions(item)}</div>
      ),
    },
  ];

  const renderMobileCard = (item: UnifiedRow) => (
    <article key={item.key} className="staff-my-tasks-card">
      <div className="staff-my-tasks-card__head">
        <div className="staff-my-tasks-card__title-wrap">
          <div className="staff-my-tasks-task-cell__badges">
            {categoryTag(item.category)}
            {item.category === 'fault' && +item.raw.priority === 1 ? (
              <Tag color="red">
                <ThunderboltFilled /> Urgent
              </Tag>
            ) : null}
          </div>
          <p className="staff-my-tasks-card__issue">{item.title}</p>
          {item.siteName ? <p className="staff-my-tasks-card__site">{item.siteName}</p> : null}
          {item.description ? (
            <p className="staff-my-tasks-card__desc">{item.description}</p>
          ) : null}
        </div>
        {item.statusLabel}
      </div>
      <dl className="staff-my-tasks-card__meta">
        <div className="staff-my-tasks-card__meta-item">
          <dt>When</dt>
          <dd>{item.when || '—'}</dd>
        </div>
      </dl>
      <div className="staff-my-tasks-card__action">{renderActions(item)}</div>
    </article>
  );

  return (
    <Layout title="sidebar.tasks">
      <div className="staff-my-tasks-toolbar">
        <Radio.Group
          value={view}
          buttonStyle="solid"
          onChange={(e) => {
            const next = e.target.value as ListView;
            history.push(next === 'done' ? '/my-tasks?view=done' : '/my-tasks');
          }}
        >
          <Radio.Button value="open">Current</Radio.Button>
          <Radio.Button value="done">Completed</Radio.Button>
        </Radio.Group>
        <Button onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </div>

      <p className="staff-my-tasks-hint">
        {view === 'open'
          ? 'Current work — scheduled jobs and assigned tasks in one list.'
          : 'Completed scheduled jobs.'}
      </p>

      {loading ? (
        <Spin />
      ) : unifiedRows.length === 0 ? (
        <div className="staff-my-tasks-empty">
          {view === 'open' ? 'Nothing current right now.' : 'No completed tasks yet.'}
        </div>
      ) : isMobilePortrait ? (
        <div className="staff-my-tasks-mobile-list">{unifiedRows.map(renderMobileCard)}</div>
      ) : (
        <div className="staff-my-tasks-table-wrap">
          <Table
            rowKey="key"
            dataSource={unifiedRows}
            pagination={false}
            tableLayout="fixed"
            columns={columns as any}
          />
        </div>
      )}

      <Modal
        open={Boolean(reading)}
        title={reading?.talkTitle || 'Toolbox talk'}
        onCancel={() => {
          setReading(null);
          setJustSignedId(null);
        }}
        okText={justSignedId ? 'Print' : 'Submit'}
        cancelText="Close"
        confirmLoading={signing}
        onOk={() => {
          if (justSignedId) {
            void printTalk(justSignedId);
            return;
          }
          void signTalk();
        }}
        width={760}
      >
        {reading ? (
          <>
            <TalkToRead talk={reading} />
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              {justSignedId ? (
                <p style={{ margin: 0 }}>Signed. Print the record if you want a copy.</p>
              ) : (
                <>
                  <h4 style={{ marginBottom: 8 }}>Sign when you have finished reading</h4>
                  <p style={{ marginTop: 0 }}>
                    Type your name to confirm you have read this toolbox talk.
                  </p>
                  <Input
                    value={signName}
                    placeholder="Your name"
                    onChange={(e) => setSignName(e.target.value)}
                    onPressEnter={signTalk}
                  />
                </>
              )}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(viewTask)}
        title={viewTask?.taskName || viewTask?.serviceName || 'Task'}
        onCancel={() => setViewTask(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            {viewTask?.id ? (
              <>
                <Button
                  icon={<FilePdfOutlined />}
                  loading={pdfBusyId === +viewTask.id}
                  onClick={() => void openTaskPdfFromDb(+viewTask.id)}
                >
                  PDF
                </Button>
                <Link to={`/messages?userTaskId=${viewTask.id}`}>
                  <Button icon={<MailOutlined />}>Message</Button>
                </Link>
              </>
            ) : null}
            <Button type="primary" onClick={() => setViewTask(null)}>
              Close
            </Button>
          </div>
        }
        width={640}
      >
        {viewTask ? (
          <>
            <dl className="staff-my-tasks-view">
              <div>
                <dt>Site</dt>
                <dd>{viewTask.siteName || '—'}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{viewTask.serviceName || '—'}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{cleanText(viewTask.description) || '—'}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{scheduleWhen(viewTask)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{scheduleStatusTag(+viewTask.status)}</dd>
              </div>
              {+viewTask.status === dJobStatus.COMPLETED ? (
                <div>
                  <dt>Completed by</dt>
                  <dd>
                    {cleanText(viewTask?.staff?.fullName) ||
                      cleanText(viewTask?.updatedUser?.fullName) ||
                      '—'}
                    {viewTask?.checkOut || viewTask?.updatedAt
                      ? ` · ${moment(viewTask.checkOut || viewTask.updatedAt)
                          .utcOffset('+10:00')
                          .format(dateTimeFormat)}`
                      : ''}
                  </dd>
                </div>
              ) : null}
              {taskNeedsMedia(viewTask) ? (
                <div>
                  <dt>Media</dt>
                  <dd>
                    <Tooltip title="You must attach media images when completing this task.">
                      <Tag color="orange">Media required</Tag>
                    </Tooltip>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="staff-my-tasks-media">
              <div className="staff-my-tasks-media__label">Media files</div>
              {(() => {
                const mediaUrls = parseMediaUrls(viewTask);
                const pdf = cleanText(viewTask.pdfFile);
                const canUpload = +viewTask.status !== dJobStatus.COMPLETED && !!viewTask.id;
                if (canUpload) {
                  return (
                    <div className="staff-my-tasks-media__upload">
                      <Button
                        type="default"
                        icon={<CameraOutlined />}
                        onClick={() => openTaskCamera(viewTask)}
                        style={{ marginBottom: 10 }}
                      >
                        Take stamped photo
                      </Button>
                      <UploadImageMultil
                        title=""
                        isImage
                        multiple
                        files={mediaUrls}
                        onChange={(files: string[]) => {
                          void persistTaskImages(viewTask, files || []).catch(() => undefined);
                        }}
                      />
                    </div>
                  );
                }
                if (!mediaUrls.length && !pdf) {
                  return <p className="staff-my-tasks-media__empty">No media files</p>;
                }
                return (
                  <>
                    {mediaUrls.length > 0 ? (
                      <Image.PreviewGroup>
                        <div className="staff-my-tasks-media__grid">
                          {mediaUrls.map((url) =>
                            isFaultVideoUrl(url) ? (
                              <FaultMedia key={url} url={url} width={120} height={120} />
                            ) : (
                              <Image
                                key={url}
                                src={url}
                                width={88}
                                height={88}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                              />
                            ),
                          )}
                        </div>
                      </Image.PreviewGroup>
                    ) : null}
                    {pdf ? (
                      <p className="staff-my-tasks-media__pdf">
                        <a href={pdf} target="_blank" rel="noopener noreferrer">
                          Open PDF
                        </a>
                      </p>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </>
        ) : null}
      </Modal>

      {phoneOpen && phoneRequest ? (
        <PhoneCamera
          request={phoneRequest}
          saveTo="app"
          onSaved={(saved) => {
            const taskId = cameraTaskId;
            setPhoneOpen(false);
            setPhoneRequest(null);
            setCameraTaskId(null);
            if (!taskId || !saved?.url) return;
            const current =
              viewTask && +viewTask.id === +taskId
                ? viewTask
                : [...pendingRows, ...inProgressRows].find((r) => +r.id === +taskId);
            const nextUrls = [...parseMediaUrls(current || {}), saved.url];
            void persistTaskImages(current || { id: taskId }, nextUrls)
              .then(() => message.success('Photo attached to task'))
              .catch(() => undefined);
          }}
          onClose={() => {
            setPhoneOpen(false);
            setPhoneRequest(null);
            setCameraTaskId(null);
          }}
        />
      ) : null}

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
