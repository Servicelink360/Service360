import Layout from '@app/components/layout/Layout';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined,
  MailOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Empty,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { dateTimeFormat } from '@app/config/data.config';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';
import { useColorModeOptional } from '@app/context/ColorModeContext';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';
import dashboardActions from '@app/redux/dashboard/actions';
import { useDispatch } from 'react-redux';

const { TextArea } = Input;
const { Title, Text } = Typography;

type MessageTab = 'all' | 'received' | 'sent' | 'deleted';
type PeerType = 'customer' | 'staff' | 'admin';

type ThreadRow = {
  threadId: number;
  peerType: PeerType;
  peerId: number;
  customerId?: number | null;
  staffId?: number | null;
  peerStaffId?: number | null;
  customerName: string;
  companyName?: string | null;
  lastMessagePreview?: string;
  updatedAt?: string;
  unreadCount: number;
  conversationKind?: 'support' | 'colleague' | 'admin';
  filterSenderId?: number | null;
  filterSenderType?: number | null;
};

type SelectedConversation = {
  threadId: number;
  peerType: PeerType;
  peerId: number;
  conversationKind?: 'support' | 'colleague' | 'admin';
  filterSenderId?: number | null;
  filterSenderType?: number | null;
  peerStaffId?: number | null;
  displayName?: string;
};

const conversationMatches = (sel: SelectedConversation | null, t: ThreadRow) =>
  Boolean(
    sel &&
      sel.threadId === t.threadId &&
      sel.peerType === t.peerType &&
      +sel.peerId === +t.peerId &&
      (sel.conversationKind ?? '') === (t.conversationKind ?? '') &&
      (sel.filterSenderId ?? null) === (t.filterSenderId ?? null),
  );

/** Admin inbox rows are per customer/staff thread, not per admin user. */
const adminPeerMatches = (sel: SelectedConversation | null, t: ThreadRow) =>
  Boolean(sel && sel.peerType === t.peerType && +sel.peerId === +t.peerId);

const findAdminThreadRow = (
  rowList: ThreadRow[],
  peerType: 'customer' | 'staff',
  peerId: number,
) =>
  rowList.find((t) => t.peerType === peerType && +t.peerId === +peerId) ?? null;

const threadToSelection = (t: ThreadRow): SelectedConversation => ({
  threadId: t.threadId,
  peerType: t.peerType,
  peerId: +t.peerId,
  conversationKind: t.conversationKind,
  filterSenderId: t.filterSenderId ?? null,
  filterSenderType: t.filterSenderType ?? null,
  peerStaffId: t.peerStaffId ?? null,
  displayName: t.customerName,
});

type MessageRow = {
  id: number;
  body: string;
  senderId?: number;
  senderType: number;
  senderName?: string | null;
  senderCompanyName?: string | null;
  createdAt?: string;
  created_at?: string;
  isMine: boolean;
  reportFaultId?: number | null;
  userTaskId?: number | null;
  reportReference?: string | null;
  reportLink?: string | null;
  attachFiles?: string[];
  ccCustomerIds?: number[];
  ccRecipients?: string[];
};

const formatMessageTimestamp = (raw?: string) => {
  if (!raw) return '';
  const m = moment(raw);
  if (!m.isValid()) return '';
  return m.utcOffset(600).format(dateTimeFormat);
};

const customerOrgLabel = (companyName?: string | null) => {
  const name = companyName?.trim();
  return name || 'Customer';
};

const SERVICELINK_SUPPORT_LABEL = 'ServiceLink';

const senderRoleLabel = (senderType: number, companyName?: string | null) => {
  if (+senderType === userType.ADMIN) return SERVICELINK_SUPPORT_LABEL;
  if (+senderType === userType.CUSTOMER) return customerOrgLabel(companyName);
  if (+senderType === userType.STAFF) return 'Staff';
  return 'Support';
};

const peerRoleLabel = (peerType: PeerType, companyName?: string | null) => {
  if (peerType === 'admin') return SERVICELINK_SUPPORT_LABEL;
  if (peerType === 'staff') return 'Staff';
  return customerOrgLabel(companyName);
};

const formatCustomerOptionLabel = (fullName: string, companyName?: string | null) => {
  const org = companyName?.trim();
  if (!org) return fullName;
  return `${fullName} — ${org}`;
};

/** Short name for compact Cc checkboxes (drops organisation suffix). */
const ccPeerShortName = (label: string) => label.split(' — ')[0]?.trim() || label;

const senderRoleColor = (senderType: number) => {
  if (+senderType === userType.ADMIN) return 'purple';
  if (+senderType === userType.CUSTOMER) return 'green';
  if (+senderType === userType.STAFF) return 'blue';
  return 'default';
};

type CustomerOption = { id: number; name: string };

const parseReportLink = (body: string): string | undefined => {
  if (!body) return undefined;
  const faultPath = body.match(/\/report-faults\?faultId=(\d+)/i);
  if (faultPath?.[1]) return `/report-faults?faultId=${faultPath[1]}`;
  const newReportPath = body.match(/\/new-reports\?reportId=(\d+)/i);
  if (newReportPath?.[1]) return `/new-reports?reportId=${newReportPath[1]}`;
  return undefined;
};

const reportFaultIdOf = (msg: MessageRow | Record<string, unknown>) => {
  const raw = msg as Record<string, unknown>;
  const v = raw.reportFaultId ?? raw.report_fault_id;
  return v != null && +v > 0 ? +v : 0;
};

const userTaskIdOf = (msg: MessageRow | Record<string, unknown>) => {
  const raw = msg as Record<string, unknown>;
  const v = raw.userTaskId ?? raw.user_task_id;
  return v != null && +v > 0 ? +v : 0;
};

const normalizeMessageRow = (raw: Record<string, unknown>): MessageRow => {
  const row = raw as MessageRow;
  return {
    ...row,
    reportFaultId: reportFaultIdOf(row) || null,
    userTaskId: userTaskIdOf(row) || null,
  };
};

const resolveMessageReportLink = (msg: MessageRow): string | undefined => {
  if (msg.reportLink) return msg.reportLink;
  const faultId = reportFaultIdOf(msg);
  if (faultId > 0) return `/report-faults?faultId=${faultId}`;
  const taskId = userTaskIdOf(msg);
  if (taskId > 0) return `/new-reports?reportId=${taskId}`;
  const fromBody = parseReportLink(msg.body);
  if (fromBody) return fromBody;
  const ref = msg.reportReference || msg.body || '';
  const newReportRef = ref.match(/New report #(\d+)/i);
  if (newReportRef?.[1]) return `/new-reports?reportId=${newReportRef[1]}`;
  const faultRef = ref.match(/Fault report #(\d+)/i);
  if (faultRef?.[1]) return `/report-faults?faultId=${faultRef[1]}`;
  return undefined;
};

const extractLinkedReportFromMessage = (
  m: MessageRow,
): { kind: 'fault' | 'task'; id: number } | null => {
  const faultId = reportFaultIdOf(m);
  if (faultId > 0) return { kind: 'fault', id: faultId };
  const taskId = userTaskIdOf(m);
  if (taskId > 0) return { kind: 'task', id: taskId };
  const link = resolveMessageReportLink(m);
  if (link) {
    const fault = link.match(/faultId=(\d+)/i);
    if (fault?.[1]) return { kind: 'fault', id: +fault[1] };
    const task = link.match(/reportId=(\d+)/i);
    if (task?.[1]) return { kind: 'task', id: +task[1] };
  }
  return null;
};

const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);

const MessageAttachments: React.FC<{ urls: string[]; isMine: boolean }> = ({ urls, isMine }) => {
  if (!urls.length) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {urls.map((url) =>
        isImageUrl(url) ? (
          <Image key={url} src={url} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: isMine ? '#69b1ff' : '#1677ff' }}
          >
            <PaperClipOutlined /> {url.split('/').pop() || 'File'}
          </a>
        ),
      )}
    </div>
  );
};

const MessageBubble: React.FC<{
  msg: MessageRow;
  myDisplayName?: string;
  isDeletedTab?: boolean;
  darkMode?: boolean;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  actionLoading?: boolean;
}> = ({ msg, myDisplayName, isDeletedTab, onDelete, onRestore, actionLoading, darkMode }) => {
  const roleLabel = senderRoleLabel(msg.senderType, msg.senderCompanyName);
  const displayName = msg.isMine
    ? myDisplayName || 'You'
    : msg.senderName?.trim() || roleLabel;
  const reportLink = resolveMessageReportLink(msg);
  const attachments = msg.attachFiles || [];
  const timestamp = formatMessageTimestamp(msg.createdAt || msg.created_at);
  const bodyText = (msg.body || '').trim();
  const ccLabels = (msg.ccRecipients || [])
    .map((label) => ccPeerShortName(label))
    .filter(Boolean);

  return (
    <div
      className="message-bubble-row"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: msg.isMine ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          flexWrap: 'wrap',
          justifyContent: msg.isMine ? 'flex-end' : 'flex-start',
        }}
      >
        <Text strong style={{ fontSize: 13, margin: 0, color: darkMode ? '#f0f0f0' : undefined }}>
          {displayName}
        </Text>
        <Tag color={senderRoleColor(msg.senderType)} style={{ margin: 0, fontSize: 10 }}>
          {roleLabel}
        </Tag>
      </div>
      {ccLabels.length > 0 ? (
        <Text
          type="secondary"
          style={{
            fontSize: 12,
            marginBottom: 4,
            display: 'block',
            textAlign: msg.isMine ? 'right' : 'left',
            maxWidth: 'min(520px, 92%)',
          }}
        >
          Cc: {ccLabels.join(', ')}
        </Text>
      ) : null}
      <div
        style={{
          maxWidth: 'min(520px, 92%)',
          padding: '10px 14px',
          borderRadius: 12,
          background: msg.isMine ? '#1677ff' : darkMode ? '#2a2a2a' : '#f5f5f5',
          color: msg.isMine ? '#fff' : darkMode ? '#f0f0f0' : 'inherit',
          border: msg.isMine ? 'none' : `1px solid ${darkMode ? '#444444' : '#d9d9d9'}`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {bodyText ? <div>{msg.body}</div> : null}
        <MessageAttachments urls={attachments} isMine={msg.isMine} />
      </div>
      {timestamp ? (
        <Text
          type="secondary"
          style={{
            marginTop: 4,
            fontSize: 12,
            display: 'block',
            textAlign: msg.isMine ? 'right' : 'left',
          }}
        >
          {timestamp}
        </Text>
      ) : null}
      {reportLink ? (
        <Link
          to={reportLink}
          style={{ marginTop: 6, fontSize: 13, color: msg.isMine ? '#69b1ff' : '#1677ff' }}
        >
          Open linked report →
        </Link>
      ) : null}
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        {isDeletedTab && onRestore ? (
          <Button
            type="link"
            size="small"
            icon={<UndoOutlined />}
            loading={actionLoading}
            onClick={() => onRestore(msg.id)}
            style={{ padding: 0, height: 'auto', fontSize: 12 }}
          >
            Restore
          </Button>
        ) : null}
        {!isDeletedTab && onDelete ? (
          <Popconfirm
            title="Move this message to Deleted?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete(msg.id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading}
              style={{ padding: 0, height: 'auto', fontSize: 12 }}
            >
              Delete
            </Button>
          </Popconfirm>
        ) : null}
      </div>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const reportContextKeyRef = useRef('');
  /** Report link pinned for this conversation (from URL or send with link) — not global. */
  const pinnedReportByConversationRef = useRef<
    Record<string, { faultId?: number; taskId?: number }>
  >({});

  const scrollToLatestMessage = useCallback(() => {
    const run = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const params = new URLSearchParams(location.search);
  const reportFaultIdParam = params.get('reportFaultId');
  const userTaskIdParam = params.get('userTaskId') || params.get('reportId');

  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const myDisplayName =
    profile?.fullName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    profile?.username ||
    'You';
  const isAdmin = +profile?.type === userType.ADMIN;
  const isCustomer = +profile?.type === userType.CUSTOMER;
  const isStaff = +profile?.type === userType.STAFF;
  // profileId was previously used for CC loading; kept here if needed later.

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messageTab, setMessageTab] = useState<MessageTab>('all');
  const [messageActionId, setMessageActionId] = useState<number | null>(null);
  const [clearingDeleted, setClearingDeleted] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachUrls, setAttachUrls] = useState<string[]>([]);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [reportFaultId, setReportFaultId] = useState<number | null>(
    reportFaultIdParam ? +reportFaultIdParam : null,
  );
  const [userTaskId, setUserTaskId] = useState<number | null>(
    userTaskIdParam ? +userTaskIdParam : null,
  );
  const [reportCustomerId, setReportCustomerId] = useState<number | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageCustomerId, setNewMessageCustomerId] = useState<number | null>(null);
  const [newMessageStaffId, setNewMessageStaffId] = useState<number | null>(null);
  const [newMessageAdminId, setNewMessageAdminId] = useState<number | null>(null);
  const [newMessageColleagueId, setNewMessageColleagueId] = useState<number | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<CustomerOption[]>([]);
  const [adminRecipientOptions, setAdminRecipientOptions] = useState<CustomerOption[]>([]);
  const [colleagueRecipientOptions, setColleagueRecipientOptions] = useState<CustomerOption[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [ccOptions, setCcOptions] = useState<{ value: number; label: string }[]>([]);
  const [ccCustomerIds, setCcCustomerIds] = useState<number[]>([]);
  const [loadingCc, setLoadingCc] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchKeyword), 350);
    return () => window.clearTimeout(t);
  }, [searchKeyword]);

  const refreshDashboard = useCallback(() => {
    dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
  }, [dispatch]);

  const selectedThread = useMemo(
    () => threads.find((t) => conversationMatches(selectedConversation, t)) ?? null,
    [threads, selectedConversation],
  );

  const activeConversation = useMemo(
    () => (selectedThread ? threadToSelection(selectedThread) : selectedConversation),
    [selectedThread, selectedConversation],
  );

  const activeConversationKey = useMemo(() => {
    if (!activeConversation) return 'none';
    return [
      activeConversation.threadId,
      activeConversation.conversationKind ?? '',
      activeConversation.peerType,
      activeConversation.peerId,
      activeConversation.peerStaffId ?? '',
      activeConversation.filterSenderType ?? '',
      activeConversation.filterSenderId ?? '',
    ].join('|');
  }, [activeConversation]);

  const showConversationSidebar = isAdmin || isCustomer || isStaff;

  const filteredMessages = useMemo(() => {
    if (messageTab === 'deleted') return messages;
    if (messageTab === 'sent') return messages.filter((m) => m.isMine);
    if (messageTab === 'received') return messages.filter((m) => !m.isMine);
    return messages;
  }, [messages, messageTab]);

  const pinnedReportForConversation = pinnedReportByConversationRef.current[activeConversationKey];

  const activeReportFaultId = useMemo(() => {
    if (reportFaultIdParam) return +reportFaultIdParam;
    if (reportFaultId != null && reportFaultId > 0) return reportFaultId;
    if (pinnedReportForConversation?.faultId) return pinnedReportForConversation.faultId;
    return null;
  }, [reportFaultIdParam, reportFaultId, pinnedReportForConversation?.faultId, activeConversationKey]);

  const activeUserTaskId = useMemo(() => {
    if (reportFaultIdParam) return null;
    if (reportFaultId != null && reportFaultId > 0) return null;
    if (pinnedReportForConversation?.faultId) return null;
    if (userTaskIdParam) return +userTaskIdParam;
    if (userTaskId != null && userTaskId > 0) return userTaskId;
    if (pinnedReportForConversation?.taskId) return pinnedReportForConversation.taskId;
    return null;
  }, [
    reportFaultIdParam,
    reportFaultId,
    userTaskIdParam,
    userTaskId,
    pinnedReportForConversation?.faultId,
    pinnedReportForConversation?.taskId,
    activeConversationKey,
  ]);

  const hasLinkedReport = activeReportFaultId != null || activeUserTaskId != null;

  const activeReportHref = useMemo(() => {
    if (activeReportFaultId) return `/report-faults?faultId=${activeReportFaultId}`;
    if (activeUserTaskId) return `/new-reports?reportId=${activeUserTaskId}`;
    return null;
  }, [activeReportFaultId, activeUserTaskId]);

  const clearReportLinkContext = useCallback(() => {
    setReportFaultId(null);
    setUserTaskId(null);
    setReportCustomerId(null);
    reportContextKeyRef.current = '';
    if (activeConversationKey !== 'none') {
      delete pinnedReportByConversationRef.current[activeConversationKey];
    }
  }, [activeConversationKey]);

  const lastMessageKey = useMemo(() => {
    if (!messages.length) return 'empty';
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id ?? 0}:${last?.createdAt ?? last?.created_at ?? ''}`;
  }, [messages]);

  const loadCompanyCc = useCallback(async (customerId?: number) => {
    // Admin → customer only; customer/staff use recipients list (no network call).
    if (!isAdmin) return;
    const id = customerId != null ? +customerId : 0;
    if (!id) {
      setCcOptions([]);
      setCcCustomerIds([]);
      return;
    }
    setLoadingCc(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/company-cc?customerId=${id}`,
        'GET',
      );
      const rows: Array<{ id: number; fullName: string; companyName?: string | null }> =
        res?.data?.rows || [];
      const options = rows.map((r) => ({
        value: +r.id,
        label: formatCustomerOptionLabel(r.fullName, r.companyName),
      }));
      setCcOptions(options);
      setCcCustomerIds(options.map((o) => o.value));
    } finally {
      setLoadingCc(false);
    }
  }, [isAdmin]);

  const loadThreads = useCallback(async () => {
    if (!showConversationSidebar) return [];
    setLoadingThreads(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, `${endPoint.MESSAGES}/threads`, 'GET');
      const rows: ThreadRow[] = res?.data?.rows || [];
      setThreads(rows);
      setSelectedConversation((prev) => {
        if (!prev) {
          if (rows.length === 0) return null;
          if (isCustomer || isStaff) {
            const support =
              rows.find((t) => t.conversationKind === 'admin') ?? rows[0];
            return threadToSelection(support);
          }
          return null;
        }
        // Admin: keep explicit customer/staff pick (thread may not exist until first message).
        if (isAdmin && (prev.peerType === 'customer' || prev.peerType === 'staff')) {
          const byPeer = findAdminThreadRow(rows, prev.peerType, prev.peerId);
          if (byPeer) return threadToSelection(byPeer);
          if (prev.threadId === 0) return prev;
          return null;
        }
        if (prev && rows.some((t) => conversationMatches(prev, t))) {
          const match = rows.find((t) => conversationMatches(prev, t))!;
          return threadToSelection(match);
        }
        if (isCustomer || isStaff) {
          if (rows.length === 0) return null;
          const support =
            rows.find((t) => t.conversationKind === 'admin') ?? rows[0];
          return threadToSelection(support);
        }
        if (rows.length === 0) return null;
        return prev;
      });
      return rows;
    } finally {
      setLoadingThreads(false);
    }
  }, [showConversationSidebar]);

  const loadNewMessageRecipients = useCallback(async () => {
    if (!isCustomer && !isStaff) return;
    setLoadingRecipients(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/recipients`,
        'GET',
      );
      const admins: Array<{ id: number; fullName: string }> = res?.data?.admins || [];
      const colleagues: Array<{ id: number; fullName: string; companyName?: string | null }> =
        res?.data?.colleagues || [];
      setAdminRecipientOptions(
        admins.map((a) => ({ id: +a.id, name: a.fullName || `Admin #${a.id}` })),
      );
      setColleagueRecipientOptions(
        colleagues.map((c) => ({
          id: +c.id,
          name: formatCustomerOptionLabel(c.fullName, c.companyName),
        })),
      );
    } finally {
      setLoadingRecipients(false);
    }
  }, [isCustomer, isStaff]);

  const loadRecipientOptions = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingRecipients(true);
    const customerFromThreads = threads
      .filter((t) => t.peerType === 'customer')
      .map((t) => ({
        id: t.peerId,
        name: formatCustomerOptionLabel(t.customerName, t.companyName),
      }));
    const staffFromThreads = threads
      .filter((t) => t.peerType === 'staff')
      .map((t) => ({ id: t.peerId, name: t.customerName }));
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
        limit: 500,
        page: 1,
      });
      const rows = res?.data?.rows || res?.data || [];
      const list = Array.isArray(rows) ? rows : [];
      const customers: CustomerOption[] = [];
      const staff: CustomerOption[] = [];
      list.forEach((u: any) => {
        const fullName =
          u.fullName ||
          [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
          u.username ||
          `User #${u.id}`;
        const company =
          u.customerInfo?.company?.name ||
          u.customerInfo?.companyName ||
          u.companyName ||
          null;
        const opt = {
          id: +u.id,
          name:
            +u.type === userType.CUSTOMER
              ? formatCustomerOptionLabel(fullName, company)
              : fullName,
        };
        if (+u.type === userType.CUSTOMER) customers.push(opt);
        if (+u.type === userType.STAFF) staff.push(opt);
      });
      const merge = (base: CustomerOption[], extra: CustomerOption[]) => {
        const m = new Map<number, CustomerOption>();
        [...base, ...extra].forEach((c) => m.set(c.id, c));
        return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
      };
      setCustomerOptions(merge(customers, customerFromThreads));
      setStaffOptions(merge(staff, staffFromThreads));
    } catch {
      setCustomerOptions(customerFromThreads);
      setStaffOptions(staffFromThreads);
    } finally {
      setLoadingRecipients(false);
    }
  }, [isAdmin, threads]);

  const markConversationRead = useCallback(
    async (conv: SelectedConversation | null, activeThreadId: number | null) => {
      if (!conv && !activeThreadId) return;
      let markQuery = '';
      if (activeThreadId) markQuery = `?threadId=${activeThreadId}`;
      else if (conv?.peerType === 'customer') markQuery = `?customerId=${conv.peerId}`;
      else if (conv?.peerType === 'staff' && !conv.peerStaffId) markQuery = `?staffId=${conv.peerId}`;
      if (!markQuery) return;
      await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/markRead${markQuery}`,
        'PATCH',
        {},
      );
    },
    [],
  );

  const loadMessages = useCallback(async (opts?: { forceTab?: MessageTab }) => {
    if (opts?.forceTab) {
      setMessageTab(opts.forceTab);
    }
    const tab = opts?.forceTab ?? messageTab;
    setLoadingMessages(true);
    try {
      const query: Record<string, string | number> = { page: 1, limit: 200 };
      if (tab === 'deleted') query.deleted = 1;
      const kw = debouncedSearch.trim();
      if (kw) query.keyword = kw;
      if (isAdmin && selectedConversation) {
        if (selectedConversation.peerType === 'customer') {
          query.customerId = selectedConversation.peerId;
        } else query.staffId = selectedConversation.peerId;
      } else if ((isCustomer || isStaff) && activeConversation) {
        query.threadId = activeConversation.threadId;
        if (activeConversation.filterSenderId) {
          query.filterSenderId = activeConversation.filterSenderId;
          if (activeConversation.filterSenderType != null) {
            query.filterSenderType = activeConversation.filterSenderType;
          }
        }
        if (activeConversation.peerStaffId) {
          query.peerStaffId = activeConversation.peerStaffId;
        }
      }

      const res = await callAPIAsync(serviceType.COMMON, endPoint.MESSAGES, 'GET', query);
      const rows: MessageRow[] = (res?.data?.rows || []).map((row: Record<string, unknown>) =>
        normalizeMessageRow(row),
      );
      const resolvedThreadId = res?.data?.threadId ?? null;
      setMessages(rows);
      setActiveCount(res?.data?.activeCount ?? 0);
      setDeletedCount(res?.data?.deletedCount ?? 0);
      setReceivedCount(res?.data?.receivedCount ?? 0);
      setSentCount(res?.data?.sentCount ?? 0);
      setThreadId(resolvedThreadId);

      if (tab !== 'deleted') {
        await markConversationRead(
          isAdmin ? selectedConversation : null,
          resolvedThreadId,
        );

        if (selectedConversation) {
          setThreads((prev) =>
            prev.map((t) =>
              conversationMatches(selectedConversation, t)
                ? { ...t, unreadCount: 0 }
                : t,
            ),
          );
        }

        if (
          activeConversationKey !== 'none' &&
          !reportFaultIdParam &&
          !userTaskIdParam &&
          rows.length
        ) {
          for (let i = rows.length - 1; i >= 0; i--) {
            const linked = extractLinkedReportFromMessage(rows[i]);
            if (linked) {
              pinnedReportByConversationRef.current[activeConversationKey] =
                linked.kind === 'fault'
                  ? { faultId: linked.id }
                  : { taskId: linked.id };
              break;
            }
          }
        }
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [
    isAdmin,
    isCustomer,
    isStaff,
    selectedConversation,
    activeConversationKey,
    markConversationRead,
    loadThreads,
    messageTab,
    debouncedSearch,
    reportFaultIdParam,
    userTaskIdParam,
  ]);

  const filteredThreads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.customerName.toLowerCase().includes(q) ||
        (t.lastMessagePreview || '').toLowerCase().includes(q),
    );
  }, [threads, debouncedSearch]);

  const softDeleteMessage = async (messageId: number) => {
    setMessageActionId(messageId);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/${messageId}/delete`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        message.success('Message moved to Deleted');
        await loadMessages();
        await loadThreads();
      } else {
        message.error(res?.message || 'Could not delete message');
      }
    } finally {
      setMessageActionId(null);
    }
  };

  const restoreMessage = async (messageId: number) => {
    setMessageActionId(messageId);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/${messageId}/restore`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        message.success('Message restored');
        if (messageTab !== 'all') setMessageTab('all');
        else await loadMessages();
        await loadThreads();
      } else {
        message.error(res?.message || 'Could not restore message');
      }
    } finally {
      setMessageActionId(null);
    }
  };

  const clearDeletedTab = async () => {
    setClearingDeleted(true);
    try {
      let markQuery = '';
      if (threadId) {
        markQuery = `?threadId=${threadId}`;
      } else if (isAdmin && selectedConversation?.peerType === 'customer') {
        markQuery = `?customerId=${selectedConversation.peerId}`;
      } else if (isAdmin && selectedConversation?.peerType === 'staff') {
        markQuery = `?staffId=${selectedConversation.peerId}`;
      } else if ((isCustomer || isStaff) && selectedThread?.threadId) {
        markQuery = `?threadId=${selectedThread.threadId}`;
      }
      if (!markQuery) return;

      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/deleted/clear${markQuery}`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        message.success('Deleted messages cleared');
        await loadMessages();
        await loadThreads();
      } else {
        message.error(res?.message || 'Could not clear deleted messages');
      }
    } finally {
      setClearingDeleted(false);
    }
  };

  useEffect(() => {
    if (showConversationSidebar) loadThreads();
  }, [showConversationSidebar, loadThreads]);

  useEffect(() => {
    if (showConversationSidebar && (isCustomer || isStaff)) {
      loadNewMessageRecipients();
    }
  }, [showConversationSidebar, isCustomer, isStaff, loadNewMessageRecipients]);

  useEffect(() => {
    // Prevent background reloads while the New message modal is open (can cause UI jitter).
    if (newMessageOpen) return;
    if (isAdmin && selectedConversation?.peerType === 'customer') {
      loadCompanyCc(selectedConversation.peerId);
      return;
    }
    if (isCustomer && activeConversation?.conversationKind === 'admin') {
      const selfId = profile?.id ? +profile.id : 0;
      const opts = colleagueRecipientOptions
        .filter((c) => +c.id !== selfId)
        .map((c) => ({
          value: c.id,
          label: c.name,
        }));
      setCcOptions(opts);
      setCcCustomerIds(opts.map((o) => o.value));
      return;
    }
    setCcOptions([]);
    setCcCustomerIds([]);
  }, [
    newMessageOpen,
    isCustomer,
    isAdmin,
    activeConversation?.conversationKind,
    colleagueRecipientOptions,
    selectedConversation,
    loadCompanyCc,
    profile?.id,
  ]);

  useEffect(() => {
    // Avoid heavy list reloads while modal is open (dropdown typing/selecting).
    if (newMessageOpen) return;
    if (isAdmin && !selectedConversation) return;
    if ((isCustomer || isStaff) && !activeConversation && threads.length === 0) return;
    if (isCustomer || isStaff || (isAdmin && selectedConversation)) {
      loadMessages();
    }
  }, [
    newMessageOpen,
    isAdmin,
    isCustomer,
    isStaff,
    selectedConversation,
    activeConversationKey,
    threads.length,
    loadMessages,
    messageTab,
    debouncedSearch,
  ]);

  useEffect(() => {
    if (reportFaultIdParam) {
      setReportFaultId(+reportFaultIdParam);
      setUserTaskId(null);
      setDraft((prev) =>
        prev.trim() ? prev : 'Hello, I have a question about this report fault.',
      );
    } else if (userTaskIdParam) {
      setUserTaskId(+userTaskIdParam);
      setReportFaultId(null);
      setDraft((prev) =>
        prev.trim() ? prev : 'Hello, I have a question about this new report.',
      );
    }
  }, [reportFaultIdParam, userTaskIdParam]);

  useEffect(() => {
    if (activeConversationKey === 'none') return;
    if (reportFaultIdParam) {
      pinnedReportByConversationRef.current[activeConversationKey] = {
        faultId: +reportFaultIdParam,
      };
    } else if (userTaskIdParam) {
      pinnedReportByConversationRef.current[activeConversationKey] = {
        taskId: +userTaskIdParam,
      };
    }
  }, [reportFaultIdParam, userTaskIdParam, activeConversationKey]);

  useEffect(() => {
    if (!hasLinkedReport) {
      setReportCustomerId(null);
    }
  }, [hasLinkedReport]);

  useEffect(() => {
    setMessages([]);
  }, [activeConversationKey]);

  useEffect(() => {
    if (!isAdmin || !(reportFaultIdParam || userTaskIdParam)) {
      return;
    }
    const contextKey = `${reportFaultIdParam || ''}|${userTaskIdParam || ''}`;
    if (reportContextKeyRef.current === contextKey && reportCustomerId) return;

    let cancelled = false;
    (async () => {
      const q = reportFaultIdParam
        ? `reportFaultId=${encodeURIComponent(reportFaultIdParam)}`
        : `userTaskId=${encodeURIComponent(userTaskIdParam!)}`;
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/report-conversation?${q}`,
        'GET',
      );
      if (cancelled || res?.code !== 1 || !res?.data?.peerId) return;

      const peerType = res.data.peerType as 'customer' | 'staff';
      const peerId = +res.data.peerId;
      const customerId = res.data.customerId ? +res.data.customerId : null;
      const rowList = threads.length ? threads : (await loadThreads()) || [];
      const existing = findAdminThreadRow(rowList, peerType, peerId);
      reportContextKeyRef.current = contextKey;
      setReportCustomerId(customerId);
      const sel: SelectedConversation = {
        threadId: existing?.threadId ?? res.data.threadId ?? 0,
        peerType,
        peerId,
        displayName: existing?.customerName || res.data.displayName,
      };
      setSelectedConversation(sel);
      const pinKey = [
        sel.threadId,
        sel.conversationKind ?? '',
        sel.peerType,
        sel.peerId,
        sel.peerStaffId ?? '',
        sel.filterSenderType ?? '',
        sel.filterSenderId ?? '',
      ].join('|');
      if (reportFaultIdParam) {
        pinnedReportByConversationRef.current[pinKey] = { faultId: +reportFaultIdParam };
      } else if (userTaskIdParam) {
        pinnedReportByConversationRef.current[pinKey] = { taskId: +userTaskIdParam };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    reportFaultIdParam,
    userTaskIdParam,
    threads.length,
    loadThreads,
  ]);

  useEffect(() => {
    if (loadingMessages) return;
    scrollToLatestMessage();
  }, [lastMessageKey, messageTab, loadingMessages, scrollToLatestMessage]);

  const clearComposer = () => {
    setDraft('');
    setAttachUrls([]);
    setUploadFileList([]);
  };

  const handleUpload = async (options: any) => {
    const { onSuccess, onError, onProgress, file } = options;
    const raw = file.originFileObj ?? file;
    try {
      const response: any = await callAPIAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        'POST',
        { file: raw },
        {
          onUploadProgress: (pct: number) => {
            onProgress?.({ percent: pct });
          },
        },
        true,
      );
      if (response?.code === 1) {
        const url = response.data as string;
        setAttachUrls((prev) => [...prev, url]);
        // eslint-disable-next-line no-param-reassign
        file.url = url;
        onSuccess?.(response, file);
      } else {
        onError?.(new Error(response?.message || 'Upload failed'));
      }
    } catch (err: any) {
      onError?.(err);
    }
  };

  const showCcComposer =
    ccOptions.length > 0 &&
    ((isCustomer && activeConversation?.conversationKind === 'admin') ||
      (isAdmin && selectedConversation?.peerType === 'customer') ||
      (hasLinkedReport && (isCustomer || isAdmin)));

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text && attachUrls.length === 0) return;
    if (isAdmin && !selectedConversation) return;
    if ((isCustomer || isStaff) && !activeConversation) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = { body: text };
      if (attachUrls.length > 0) payload.attachFiles = JSON.stringify(attachUrls);
      if (activeReportFaultId) {
        payload.reportFaultId = activeReportFaultId;
      } else if (activeUserTaskId) {
        payload.userTaskId = activeUserTaskId;
      }
      if (isAdmin && selectedConversation?.peerType === 'customer') {
        payload.customerId = selectedConversation.peerId;
      } else if (isAdmin && selectedConversation?.peerType === 'staff') {
        payload.staffId = selectedConversation.peerId;
      }
      if (isStaff && activeConversation?.peerStaffId) {
        payload.peerStaffId = activeConversation.peerStaffId;
      }
      if (isCustomer && activeConversation?.conversationKind === 'colleague') {
        const peerId = activeConversation.filterSenderId;
        if (peerId && +peerId !== +profile?.id) {
          payload.ccCustomerIds = [peerId];
        }
      } else if (hasLinkedReport && ccCustomerIds.length > 0) {
        const selfId = profile?.id ? +profile.id : 0;
        payload.ccCustomerIds = ccCustomerIds.filter((id) => +id !== selfId);
      } else if (showCcComposer && ccCustomerIds.length > 0) {
        payload.ccCustomerIds = ccCustomerIds;
      }

      await callAPIAsync(serviceType.COMMON, `${endPoint.MESSAGES}/send`, 'POST', payload);
      if (activeConversationKey !== 'none' && (activeReportFaultId || activeUserTaskId)) {
        pinnedReportByConversationRef.current[activeConversationKey] = activeReportFaultId
          ? { faultId: activeReportFaultId }
          : { taskId: activeUserTaskId! };
      }
      clearComposer();
      const nextTab: MessageTab = messageTab === 'sent' ? 'sent' : 'all';
      if (showConversationSidebar) await loadThreads();
      await loadMessages({ forceTab: nextTab });
      scrollToLatestMessage();
      window.setTimeout(scrollToLatestMessage, 100);
    } finally {
      setSending(false);
    }
  };

  const openNewMessage = async () => {
    if (isCustomer || isStaff) {
      setNewMessageAdminId(null);
      setNewMessageColleagueId(null);
      setNewMessageOpen(true);
      await loadNewMessageRecipients();
      if (!threads.length) await loadThreads();
      return;
    }
    clearReportLinkContext();
    if (reportFaultIdParam || userTaskIdParam) {
      history.replace('/messages');
    }
    setNewMessageCustomerId(null);
    setNewMessageStaffId(null);
    setNewMessageOpen(true);
    loadRecipientOptions();
  };

  const startNewConversation = async () => {
    if (isCustomer || isStaff) {
      if (!newMessageAdminId && !newMessageColleagueId) return;
      const rowList = (await loadThreads()) || threads;

      if (newMessageAdminId) {
        const existing = rowList.find(
          (t) => t.conversationKind === 'admin' && +t.filterSenderId === +newMessageAdminId,
        );
        if (existing) {
          setSelectedConversation(threadToSelection(existing));
        } else {
          const adminName =
            adminRecipientOptions.find((a) => a.id === newMessageAdminId)?.name ||
            `Admin #${newMessageAdminId}`;
          const supportThread = rowList.find((t) => t.conversationKind === 'admin');
          setSelectedConversation({
            threadId: supportThread?.threadId ?? rowList[0]?.threadId ?? 0,
            peerType: 'admin',
            peerId: newMessageAdminId,
            conversationKind: 'admin',
            filterSenderId: newMessageAdminId,
            filterSenderType: userType.ADMIN,
            displayName: adminName,
          });
        }
      } else if (newMessageColleagueId) {
        if (isStaff) {
          const existing = rowList.find(
            (t) =>
              t.conversationKind === 'colleague' &&
              (+t.peerStaffId === +newMessageColleagueId || +t.peerId === +newMessageColleagueId),
          );
          if (existing) {
            setSelectedConversation(threadToSelection(existing));
          } else {
            const colName =
              colleagueRecipientOptions.find((c) => c.id === newMessageColleagueId)?.name ||
              `Staff #${newMessageColleagueId}`;
            setSelectedConversation({
              threadId: 0,
              peerType: 'staff',
              peerId: newMessageColleagueId,
              conversationKind: 'colleague',
              peerStaffId: newMessageColleagueId,
              displayName: colName.split(' — ')[0],
            });
          }
        } else {
          const existing = rowList.find(
            (t) =>
              t.conversationKind === 'colleague' && +t.filterSenderId === +newMessageColleagueId,
          );
          if (existing) {
            setSelectedConversation(threadToSelection(existing));
          } else {
            const colName =
              colleagueRecipientOptions.find((c) => c.id === newMessageColleagueId)?.name ||
              `Colleague #${newMessageColleagueId}`;
            const adminRow = rowList.find((t) => t.conversationKind === 'admin');
            setSelectedConversation({
              threadId: adminRow?.threadId ?? rowList[0]?.threadId ?? 0,
              peerType: 'customer',
              peerId: newMessageColleagueId,
              conversationKind: 'colleague',
              filterSenderId: newMessageColleagueId,
              filterSenderType: userType.CUSTOMER,
              displayName: colName.split(' — ')[0],
            });
          }
        }
      }
      setMessageTab('all');
      setNewMessageOpen(false);
      clearComposer();
      clearReportLinkContext();
      window.setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }
    const rowList = threads.length ? threads : (await loadThreads()) || [];

    clearReportLinkContext();
    if (reportFaultIdParam || userTaskIdParam) {
      history.replace('/messages');
    }

    if (newMessageStaffId) {
      const peerId = +newMessageStaffId;
      const existing = findAdminThreadRow(rowList, 'staff', peerId);
      const displayName =
        staffOptions.find((s) => s.id === peerId)?.name ??
        existing?.customerName ??
        `Staff #${peerId}`;
      setSelectedConversation(
        existing
          ? threadToSelection(existing)
          : {
              threadId: 0,
              peerType: 'staff',
              peerId,
              displayName,
            },
      );
    } else if (newMessageCustomerId) {
      const peerId = +newMessageCustomerId;
      const existing = findAdminThreadRow(rowList, 'customer', peerId);
      const displayName =
        customerOptions.find((c) => c.id === peerId)?.name ??
        existing?.customerName ??
        `Customer #${peerId}`;
      setSelectedConversation(
        existing
          ? threadToSelection(existing)
          : {
              threadId: 0,
              peerType: 'customer',
              peerId,
              displayName,
            },
      );
    } else {
      return;
    }
    setMessageTab('all');
    setNewMessageOpen(false);
    clearComposer();
  };

  const canUseMessageTabs = Boolean(
    isAdmin ? selectedConversation : activeConversation || isCustomer || isStaff,
  );
  const canCompose = Boolean(
    isAdmin ? selectedConversation : (isCustomer || isStaff) && activeConversation,
  );
  const canSend = Boolean(draft.trim() || attachUrls.length > 0);
  const canStartConversation = Boolean(
    isAdmin
      ? newMessageCustomerId || newMessageStaffId
      : newMessageAdminId || newMessageColleagueId,
  );

  const isMobilePortrait = useMobilePortrait();
  const { isDark } = useColorModeOptional();
  const messagesPageDark = isDark && isMobilePortrait;

  useEffect(() => {
    const cls = 'messages-page-body-dark';
    if (messagesPageDark) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [messagesPageDark]);

  const ui = messagesPageDark
    ? {
        rootBg: '#121212',
        panelBg: '#1a1a1a',
        border: '#333333',
        text: '#f0f0f0',
        textMuted: '#a3a3a3',
        threadSelected: '#1f3a5f',
      }
    : {
        rootBg: '#ffffff',
        panelBg: '#fafafa',
        border: '#f0f0f0',
        text: undefined as string | undefined,
        textMuted: undefined as string | undefined,
        threadSelected: '#e6f4ff',
      };

  const hasOpenConversation = Boolean(
    isAdmin ? selectedConversation : activeConversation,
  );
  const showListPane =
    showConversationSidebar && (!isMobilePortrait || !hasOpenConversation);
  const showChatPane = !isMobilePortrait || hasOpenConversation;

  const goBackToConversationList = () => {
    setSelectedConversation(null);
    setSearchKeyword('');
    clearReportLinkContext();
    if (reportFaultIdParam || userTaskIdParam) {
      history.replace('/messages');
    }
  };

  const selectConversation = (t: ThreadRow) => {
    if (reportFaultIdParam || userTaskIdParam) {
      history.replace('/messages');
    }
    clearReportLinkContext();
    setSelectedConversation(threadToSelection(t));
    setMessageTab('all');
  };

  return (
    <Layout title="Messages">
      <div
        className={`messages-page-root${messagesPageDark ? ' messages-page-dark messages-theme-dark' : ''}`}
        style={{
          display: 'flex',
          flexDirection: isMobilePortrait ? 'column' : 'row',
          height: isMobilePortrait ? 'auto' : 'calc(100vh - 180px)',
          minHeight: isMobilePortrait ? 480 : 480,
          background: ui.rootBg,
          borderRadius: isMobilePortrait ? 0 : 8,
          border: isMobilePortrait ? 'none' : `1px solid ${ui.border}`,
          overflow: 'hidden',
          width: '100%',
          color: ui.text,
        }}
      >
        {showListPane ? (
          <div
            className="messages-page-sidebar"
            style={{
              width: isMobilePortrait ? '100%' : 280,
              flexShrink: 0,
              flex: isMobilePortrait && !hasOpenConversation ? 1 : undefined,
              minHeight: isMobilePortrait ? 420 : undefined,
              borderRight: isMobilePortrait ? 'none' : `1px solid ${ui.border}`,
              borderBottom: isMobilePortrait ? `1px solid ${ui.border}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              background: ui.panelBg,
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${ui.border}` }}>
              <Title level={5} style={{ margin: '0 0 10px', color: ui.text }}>
                <MailOutlined style={{ marginRight: 8 }} />
                Conversations
              </Title>
              <Button type="primary" block icon={<PlusOutlined />} onClick={openNewMessage}>
                New message
              </Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingThreads ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : filteredThreads.length === 0 ? (
                <Empty
                  description={debouncedSearch.trim() ? 'No conversations match your search' : 'No conversations yet'}
                  style={{ marginTop: 24 }}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={`${t.threadId}-${t.peerId}-${t.conversationKind ?? 'thread'}`}
                    type="button"
                    onClick={() => {
                      selectConversation(t);
                      if (t.unreadCount > 0) {
                        setThreads((prev) =>
                          prev.map((row) =>
                            conversationMatches(threadToSelection(t), row)
                              ? { ...row, unreadCount: 0 }
                              : row,
                          ),
                        );
                      }
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      border: 'none',
                      borderBottom: `1px solid ${ui.border}`,
                      background:
                        conversationMatches(selectedConversation, t) ? ui.threadSelected : 'transparent',
                      cursor: 'pointer',
                      color: ui.text,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 13, color: ui.text }}>
                        {t.customerName}
                      </Text>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag
                          color={
                            t.conversationKind === 'admin'
                              ? 'purple'
                              : t.conversationKind === 'colleague'
                                ? 'green'
                                : t.peerType === 'staff'
                                  ? 'blue'
                                  : 'green'
                          }
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          {t.conversationKind === 'admin'
                            ? SERVICELINK_SUPPORT_LABEL
                            : t.conversationKind === 'colleague'
                              ? 'Colleague'
                              : peerRoleLabel(t.peerType, t.companyName)}
                        </Tag>
                        {t.unreadCount > 0 ? (
                          <Badge count={t.unreadCount} style={{ flexShrink: 0 }} />
                        ) : null}
                      </span>
                    </div>
                    {t.lastMessagePreview ? (
                      <>
                        <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                          {t.lastMessagePreview}
                        </Text>
                        {t.updatedAt ? (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                            {formatMessageTimestamp(t.updatedAt)}
                          </Text>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        {showChatPane ? (
        <div
          className="messages-page-chat"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}
        >
          {isMobilePortrait && hasOpenConversation ? (
            <div style={{ padding: '8px 12px 0', background: ui.panelBg, borderBottom: `1px solid ${ui.border}` }}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={goBackToConversationList}
                style={{ padding: 0, height: 'auto' }}
              >
                Back to conversations
              </Button>
            </div>
          ) : null}
          <div
            className="messages-page-chat-header"
            style={{
              padding: isMobilePortrait ? '12px 12px 0' : '12px 20px 0',
              borderBottom: `1px solid ${ui.border}`,
              background: ui.panelBg,
            }}
          >
            <Title level={5} style={{ margin: '0 0 8px', wordBreak: 'break-word', color: ui.text }}>
              {isAdmin
                ? selectedThread
                  ? (
                    <>
                      {selectedThread.customerName}
                      {' '}
                      <Tag color={selectedThread.peerType === 'staff' ? 'blue' : 'green'} style={{ verticalAlign: 'middle' }}>
                        {peerRoleLabel(selectedThread.peerType, selectedThread.companyName)}
                      </Tag>
                    </>
                  )
                  : 'Select a conversation or start a new message'
                : activeConversation
                  ? (
                    <>
                      {activeConversation.displayName || selectedThread?.customerName}
                      {' '}
                      <Tag
                        color={
                          activeConversation.conversationKind === 'colleague'
                            ? 'green'
                            : 'purple'
                        }
                        style={{ verticalAlign: 'middle' }}
                      >
                        {activeConversation.conversationKind === 'colleague'
                          ? 'Colleague'
                          : SERVICELINK_SUPPORT_LABEL}
                      </Tag>
                    </>
                  )
                  : 'Select a conversation or click New message'}
            </Title>
            {canUseMessageTabs ? (
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Search messages or conversations…"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  marginBottom: 10,
                  maxWidth: isMobilePortrait ? '100%' : 420,
                  width: '100%',
                }}
              />
            ) : null}
            {isAdmin && hasLinkedReport && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {activeReportFaultId
                  ? `Replying about fault report #${activeReportFaultId}`
                  : `Replying about new report #${activeUserTaskId}`}
                {activeReportHref ? (
                  <>
                    {' — '}
                    <Link to={activeReportHref}>Open report</Link>
                  </>
                ) : null}
                {' — messaging '}
                {selectedConversation?.peerType === 'staff'
                  ? selectedConversation.displayName || 'staff'
                  : 'customer'}
                . Replies stay linked to this report. Colleagues are Cc&apos;d automatically.
              </Text>
            )}
            {isCustomer &&
              activeConversation?.conversationKind === 'admin' &&
              hasLinkedReport && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {activeReportFaultId
                  ? `Replying about fault report #${activeReportFaultId}`
                  : `Replying about new report #${activeUserTaskId}`}
                {activeReportHref ? (
                  <>
                    {' — '}
                    <Link to={activeReportHref}>Open report</Link>
                  </>
                ) : null}
                . Replies stay linked to this report. Colleagues are Cc&apos;d automatically.
              </Text>
            )}
            {canUseMessageTabs ? (
              <Tabs
                activeKey={messageTab}
                onChange={(k) => setMessageTab(k as MessageTab)}
                size="small"
                items={[
                  {
                    key: 'all',
                    label: (
                      <span>
                        <InboxOutlined /> All ({activeCount})
                      </span>
                    ),
                  },
                  { key: 'received', label: `Received (${receivedCount})` },
                  { key: 'sent', label: `Sent (${sentCount})` },
                  { key: 'deleted', label: `Deleted (${deletedCount})` },
                ]}
              />
            ) : null}
            {canUseMessageTabs && messageTab === 'deleted' && deletedCount > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Popconfirm
                  title={
                    <span>
                      Permanently clear all deleted messages in this conversation?
                      <br />
                      <span style={{ fontWeight: 'normal', color: 'rgba(0,0,0,0.45)' }}>
                        They will be removed from Deleted and will not return to your inbox.
                      </span>
                    </span>
                  }
                  okText="Empty deleted"
                  cancelText="Cancel"
                  onConfirm={clearDeletedTab}
                >
                  <Button danger loading={clearingDeleted} icon={<DeleteOutlined />}>
                    Empty deleted
                  </Button>
                </Popconfirm>
              </div>
            ) : null}
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobilePortrait ? '12px' : '16px 20px',
              minHeight: isMobilePortrait ? 240 : undefined,
            }}
          >
            {isAdmin && !selectedConversation ? (
              <Empty
                description="Select a conversation from the list"
                style={{ marginTop: 48 }}
              />
            ) : isAdmin && !canCompose ? (
              <Empty
                description="Select a customer or staff member, or click New message to start"
                style={{ marginTop: 48 }}
              />
            ) : loadingMessages ? (
              <div style={{ textAlign: 'center', paddingTop: 48 }}>
                <Spin />
              </div>
            ) : filteredMessages.length === 0 ? (
              <Empty
                description={
                  debouncedSearch.trim()
                    ? 'No messages match your search'
                    : messageTab === 'deleted'
                      ? 'No deleted messages in this conversation'
                      : messageTab === 'sent'
                        ? 'No sent messages in this conversation'
                        : messageTab === 'received'
                          ? 'No received messages in this conversation'
                          : isCustomer || isStaff
                            ? 'Send your first message below. Attach files or link a report from New Reports / Fault Reports.'
                            : 'No messages yet — type below to send'
                }
              />
            ) : (
              filteredMessages.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  myDisplayName={myDisplayName}
                  darkMode={messagesPageDark}
                  isDeletedTab={messageTab === 'deleted'}
                  onDelete={messageTab === 'deleted' ? undefined : softDeleteMessage}
                  onRestore={messageTab === 'deleted' ? restoreMessage : undefined}
                  actionLoading={messageActionId === m.id}
                />
              ))
            )}
          </div>

          {canCompose && messageTab !== 'deleted' ? (
            <div
              className="messages-page-composer"
              style={{
                padding: isMobilePortrait ? '10px 12px' : '12px 16px',
                borderTop: `1px solid ${ui.border}`,
                background: ui.rootBg,
              }}
            >
              {showCcComposer ? (
                <div
                  style={{
                    marginBottom: 8,
                    padding: '6px 10px',
                    background: ui.panelBg,
                    borderRadius: 6,
                    border: `1px solid ${ui.border}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '2px 10px',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12, margin: 0, flexShrink: 0 }}>
                      Cc
                    </Text>
                    {loadingCc ? (
                      <Spin size="small" />
                    ) : (
                      ccOptions.map((opt) => (
                        <Checkbox
                          key={opt.value}
                          checked={ccCustomerIds.includes(opt.value)}
                          onChange={(e) => {
                            setCcCustomerIds((prev) =>
                              e.target.checked
                                ? [...prev, opt.value]
                                : prev.filter((id) => id !== opt.value),
                            );
                          }}
                          style={{ fontSize: 12, margin: 0 }}
                        >
                          {ccPeerShortName(opt.label)}
                        </Checkbox>
                      ))
                    )}
                    {!loadingCc && ccOptions.length > 1 ? (
                      <>
                        <Button
                          type="link"
                          size="small"
                          style={{ fontSize: 12, height: 22, padding: '0 4px' }}
                          onClick={() => setCcCustomerIds(ccOptions.map((o) => o.value))}
                        >
                          All
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          style={{ fontSize: 12, height: 22, padding: '0 4px' }}
                          onClick={() => setCcCustomerIds([])}
                        >
                          None
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <TextArea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a new message…"
                autoSize={{ minRows: 2, maxRows: 6 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    if (canSend) sendMessage();
                  }
                }}
              />
              <Upload
                fileList={uploadFileList}
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/*"
                customRequest={handleUpload}
                onChange={({ fileList }) => setUploadFileList(fileList)}
                onRemove={(file) => {
                  const url = file.url || (file.response as any)?.data;
                  if (url) setAttachUrls((prev) => prev.filter((u) => u !== url));
                }}
                showUploadList={{ showPreviewIcon: true }}
              >
                <Button icon={<PaperClipOutlined />} style={{ marginTop: 8 }}>
                  Attach files
                </Button>
              </Upload>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: isMobilePortrait ? 'stretch' : 'flex-end',
                  gap: 8,
                }}
              >
                {activeConversation?.conversationKind === 'admin' && hasLinkedReport && (
                  <Button
                    block={isMobilePortrait}
                    onClick={() => {
                      setReportFaultId(null);
                      setUserTaskId(null);
                      history.replace('/messages');
                    }}
                  >
                    Clear report link
                  </Button>
                )}
                <Button
                  block={isMobilePortrait}
                  onClick={clearComposer}
                  disabled={!draft && attachUrls.length === 0}
                >
                  Clear
                </Button>
                <Button
                  type="primary"
                  block={isMobilePortrait}
                  icon={<SendOutlined />}
                  loading={sending}
                  disabled={!canSend}
                  onClick={sendMessage}
                  style={isMobilePortrait ? { flex: 1 } : undefined}
                >
                  Send
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        ) : null}
      </div>

      <Modal
        title="New message"
        open={newMessageOpen}
        onCancel={() => setNewMessageOpen(false)}
        onOk={startNewConversation}
        okText="Start conversation"
        okButtonProps={{ disabled: !canStartConversation }}
        style={isMobilePortrait ? { top: 16, maxWidth: 'calc(100vw - 16px)' } : undefined}
        width={isMobilePortrait ? '100%' : 520}
      >
        {isCustomer || isStaff ? (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Choose a Servicelink admin or a colleague. You can attach files after opening the
              conversation.
            </Text>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Admin
            </Text>
            <Select
              showSearch
              allowClear
              placeholder="Select admin"
              style={{ width: '100%' }}
              loading={loadingRecipients}
              value={newMessageAdminId ?? undefined}
              onChange={(v) => {
                setNewMessageAdminId(v ?? null);
                if (v) setNewMessageColleagueId(null);
              }}
              optionFilterProp="label"
              options={adminRecipientOptions.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
            <Divider style={{ margin: '16px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Colleague
            </Text>
            <Select
              showSearch
              allowClear
              placeholder={isStaff ? 'Select staff colleague' : 'Select customer colleague'}
              style={{ width: '100%' }}
              loading={loadingRecipients}
              value={newMessageColleagueId ?? undefined}
              onChange={(v) => {
                setNewMessageColleagueId(v ?? null);
                if (v) setNewMessageAdminId(null);
              }}
              optionFilterProp="label"
              options={colleagueRecipientOptions.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </>
        ) : (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Choose a customer or staff member. You can attach files after opening the conversation.
            </Text>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Customer
            </Text>
            <Select
              showSearch
              allowClear
              placeholder="Select customer"
              style={{ width: '100%' }}
              loading={loadingRecipients}
              value={newMessageCustomerId ?? undefined}
              onChange={(v) => {
                setNewMessageCustomerId(v ?? null);
                if (v) setNewMessageStaffId(null);
              }}
              optionFilterProp="label"
              options={customerOptions.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <Divider style={{ margin: '16px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Staff
            </Text>
            <Select
              showSearch
              allowClear
              placeholder="Select staff"
              style={{ width: '100%' }}
              loading={loadingRecipients}
          value={newMessageStaffId ?? undefined}
          onChange={(v) => {
            setNewMessageStaffId(v ?? null);
            if (v) setNewMessageCustomerId(null);
          }}
          optionFilterProp="label"
          options={staffOptions.map((s) => ({
            value: s.id,
            label: s.name,
          }))}
        />
          </>
        )}
      </Modal>
    </Layout>
  );
};

export default MessagesPage;
