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

const resolveMessageReportLink = (msg: MessageRow): string | undefined => {
  if (msg.reportLink) return msg.reportLink;
  const faultId = msg.reportFaultId != null ? +msg.reportFaultId : 0;
  if (faultId > 0) return `/report-faults?faultId=${faultId}`;
  const taskId = msg.userTaskId != null ? +msg.userTaskId : 0;
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
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  actionLoading?: boolean;
}> = ({ msg, myDisplayName, isDeletedTab, onDelete, onRestore, actionLoading }) => {
  const roleLabel = senderRoleLabel(msg.senderType, msg.senderCompanyName);
  const displayName = msg.isMine
    ? myDisplayName || 'You'
    : msg.senderName?.trim() || roleLabel;
  const reportLink = resolveMessageReportLink(msg);
  const attachments = msg.attachFiles || [];
  const timestamp = formatMessageTimestamp(msg.createdAt || msg.created_at);
  const bodyText = (msg.body || '').trim();

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
        <Text strong style={{ fontSize: 13, margin: 0 }}>
          {displayName}
        </Text>
        <Tag color={senderRoleColor(msg.senderType)} style={{ margin: 0, fontSize: 10 }}>
          {roleLabel}
        </Tag>
      </div>
      <div
        style={{
          maxWidth: 'min(520px, 92%)',
          padding: '10px 14px',
          borderRadius: 12,
          background: msg.isMine ? '#1677ff' : '#f5f5f5',
          color: msg.isMine ? '#fff' : 'inherit',
          border: msg.isMine ? 'none' : '1px solid #d9d9d9',
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
  const userTaskIdParam = params.get('userTaskId');
  const hasReportContext = Boolean(reportFaultIdParam || userTaskIdParam);

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

  const showConversationSidebar = isAdmin || isCustomer || isStaff;

  const filteredMessages = useMemo(() => {
    if (messageTab === 'deleted') return messages;
    if (messageTab === 'sent') return messages.filter((m) => m.isMine);
    if (messageTab === 'received') return messages.filter((m) => !m.isMine);
    return messages;
  }, [messages, messageTab]);

  const lastMessageKey = useMemo(() => {
    if (!messages.length) return 'empty';
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id ?? 0}:${last?.createdAt ?? last?.created_at ?? ''}`;
  }, [messages]);

  const loadCompanyCc = useCallback(async (customerId?: number) => {
    // Only needed for ADMIN view; customer/staff use recipients list (no network call).
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
        }
        if (prev && rows.some((t) => conversationMatches(prev, t))) {
          const match = rows.find((t) => conversationMatches(prev, t))!;
          return threadToSelection(match);
        }
        if (isCustomer || isStaff) {
          if (rows.length === 0) return prev;
          const support =
            rows.find((t) => t.conversationKind === 'admin') ?? rows[0];
          return threadToSelection(support);
        }
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
      const rows: MessageRow[] = res?.data?.rows || [];
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

        refreshDashboard();
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
    refreshDashboard,
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
    // Prevent background reloads while the New message modal is open (can cause UI jitter).
    if (newMessageOpen) return;
    if (isAdmin && selectedConversation?.peerType === 'customer') {
      loadCompanyCc(selectedConversation.peerId);
      return;
    }
    if (isCustomer && activeConversation?.conversationKind === 'admin') {
      // Use recipients list for CC options (no API calls).
      const opts = colleagueRecipientOptions.map((c) => ({
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

  useEffect(() => () => refreshDashboard(), [refreshDashboard]);

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
    if (!isAdmin || !hasReportContext) {
      reportContextKeyRef.current = '';
      return;
    }
    const contextKey = `${reportFaultIdParam || ''}|${userTaskIdParam || ''}`;
    if (reportContextKeyRef.current === contextKey) return;

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

      const peerType = res.data.peerType as PeerType;
      const peerId = +res.data.peerId;
      const rowList = threads.length ? threads : (await loadThreads()) || [];
      const existing = findAdminThreadRow(rowList, peerType, peerId);
      reportContextKeyRef.current = contextKey;
      setSelectedConversation({
        threadId: existing?.threadId ?? res.data.threadId ?? 0,
        peerType,
        peerId,
        displayName: existing?.customerName || res.data.displayName,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    hasReportContext,
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
      (isAdmin && selectedConversation?.peerType === 'customer'));

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text && attachUrls.length === 0) return;
    if (isAdmin && !selectedConversation) return;
    if ((isCustomer || isStaff) && !activeConversation) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = { body: text };
      if (attachUrls.length > 0) payload.attachFiles = JSON.stringify(attachUrls);
      if (reportFaultId) payload.reportFaultId = reportFaultId;
      if (userTaskId) payload.userTaskId = userTaskId;
      if (isAdmin && selectedConversation?.peerType === 'customer') {
        payload.customerId = selectedConversation.peerId;
      } else if (isAdmin && selectedConversation?.peerType === 'staff') {
        payload.staffId = selectedConversation.peerId;
      }
      if (isStaff && activeConversation?.peerStaffId) {
        payload.peerStaffId = activeConversation.peerStaffId;
      }
      if (isCustomer && activeConversation?.conversationKind === 'colleague') {
        if (activeConversation.filterSenderId) {
          payload.ccCustomerIds = [activeConversation.filterSenderId];
        }
      } else if (showCcComposer && ccCustomerIds.length > 0) {
        payload.ccCustomerIds = ccCustomerIds;
      }

      await callAPIAsync(serviceType.COMMON, `${endPoint.MESSAGES}/send`, 'POST', payload);
      clearComposer();
      if (hasReportContext) {
        history.replace('/messages');
      }
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
    setNewMessageCustomerId(
      selectedConversation?.peerType === 'customer' ? selectedConversation.peerId : null,
    );
    setNewMessageStaffId(
      selectedConversation?.peerType === 'staff' ? selectedConversation.peerId : null,
    );
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
      setReportFaultId(null);
      setUserTaskId(null);
      window.setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }
    const rowList = threads.length ? threads : (await loadThreads()) || [];

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
    setReportFaultId(null);
    setUserTaskId(null);
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
  const hasOpenConversation = Boolean(
    isAdmin ? selectedConversation : activeConversation,
  );
  const showListPane =
    showConversationSidebar && (!isMobilePortrait || !hasOpenConversation);
  const showChatPane = !isMobilePortrait || hasOpenConversation;

  const goBackToConversationList = () => {
    setSelectedConversation(null);
    setSearchKeyword('');
  };

  return (
    <Layout title="Messages">
      <div
        className="messages-page-root"
        style={{
          display: 'flex',
          flexDirection: isMobilePortrait ? 'column' : 'row',
          height: isMobilePortrait ? 'auto' : 'calc(100vh - 180px)',
          minHeight: isMobilePortrait ? 480 : 480,
          background: '#fff',
          borderRadius: isMobilePortrait ? 0 : 8,
          border: isMobilePortrait ? 'none' : '1px solid #f0f0f0',
          overflow: 'hidden',
          width: '100%',
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
              borderRight: isMobilePortrait ? 'none' : '1px solid #f0f0f0',
              borderBottom: isMobilePortrait ? '1px solid #f0f0f0' : 'none',
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
              <Title level={5} style={{ margin: '0 0 10px' }}>
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
                      setSelectedConversation(threadToSelection(t));
                      setMessageTab('all');
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
                      borderBottom: '1px solid #f0f0f0',
                      background:
                        conversationMatches(selectedConversation, t) ? '#e6f4ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 13 }}>
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
                    <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                      {t.lastMessagePreview || 'No messages'}
                    </Text>
                    {t.updatedAt ? (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                        {formatMessageTimestamp(t.updatedAt)}
                      </Text>
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
            <div style={{ padding: '8px 12px 0', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
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
              borderBottom: '1px solid #f0f0f0',
              background: '#fafafa',
            }}
          >
            <Title level={5} style={{ margin: '0 0 8px', wordBreak: 'break-word' }}>
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
            {isAdmin && (reportFaultId || userTaskId) && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {reportFaultId
                  ? `Linked to fault report #${reportFaultId}`
                  : `Linked to new report #${userTaskId}`}
                {' — messaging '}
                {selectedConversation?.peerType === 'staff'
                  ? selectedConversation.displayName || 'staff'
                  : 'customer'}
                ; reference will be attached when you send.
              </Text>
            )}
            {isCustomer &&
              activeConversation?.conversationKind === 'admin' &&
              (reportFaultId || userTaskId) && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {reportFaultId
                  ? `Linked to fault report #${reportFaultId}`
                  : `Linked to new report #${userTaskId}`}
                {' — reference will be attached when you send.'}
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
                borderTop: '1px solid #f0f0f0',
                background: '#fff',
              }}
            >
              {showCcComposer ? (
                <div
                  style={{
                    marginBottom: 8,
                    padding: '6px 10px',
                    background: '#fafafa',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
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
                {activeConversation?.conversationKind === 'admin' && (reportFaultId || userTaskId) && (
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
