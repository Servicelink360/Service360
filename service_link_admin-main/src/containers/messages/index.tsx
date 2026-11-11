import Layout from '@app/components/layout/Layout';
import {
  ArrowLeftOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  MailOutlined,
  PaperClipOutlined,
  SearchOutlined,
  SendOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Checkbox,
  Empty,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tooltip,
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
import './messages-outlook.css';

const { TextArea } = Input;
const { Text } = Typography;

type MessageTab = 'all' | 'received' | 'sent' | 'deleted';
type MailFolder = 'inbox' | 'unread' | 'sent' | 'deleted' | 'all';
type PeerType = 'customer' | 'staff' | 'admin';

const folderToMessageTab = (folder: MailFolder): MessageTab => {
  // Inbox / Unread = received only; Sent = mine; All = full thread; Deleted = trash.
  if (folder === 'sent') return 'sent';
  if (folder === 'deleted') return 'deleted';
  if (folder === 'all') return 'all';
  return 'received';
};

const formatListDate = (raw?: string) => {
  if (!raw) return '';
  const m = moment(raw);
  if (!m.isValid()) return '';
  return m.utcOffset(600).format('D MMM');
};

const messageCreatedMs = (m: { createdAt?: string; created_at?: string; id?: number }) => {
  const raw = m.createdAt || m.created_at;
  const t = raw ? moment(raw).valueOf() : NaN;
  if (Number.isFinite(t)) return t;
  return Number(m.id) || 0;
};

const threadUpdatedMs = (t: {
  updatedAt?: string | Date | null;
  updated_at?: string | Date | null;
  threadId?: number;
}) => {
  const raw = t.updatedAt ?? t.updated_at;
  if (raw != null && raw !== '') {
    const tMs = moment(raw).valueOf();
    if (Number.isFinite(tMs)) return tMs;
  }
  return 0;
};

type ListSortMode = 'newest' | 'oldest' | 'az' | 'za';

const toggleDateSort = (prev: ListSortMode): ListSortMode => {
  if (prev === 'newest') return 'oldest';
  if (prev === 'oldest') return 'newest';
  return 'newest';
};

const toggleAlphaSort = (prev: ListSortMode): ListSortMode => {
  if (prev === 'az') return 'za';
  if (prev === 'za') return 'az';
  return 'az';
};

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
  /** Visible messages I sent / received in this conversation (for Inbox vs Sent). */
  sentCount?: number;
  receivedCount?: number;
  /** Soft-deleted messages in this conversation (for Deleted folder). */
  deletedCount?: number;
  conversationKind?: 'support' | 'colleague' | 'admin' | 'personnel';
  /** Click-tooltip / role copy from API (e.g. Service provider, My colleague). */
  roleLabel?: string | null;
  filterSenderId?: number | null;
  filterSenderType?: number | null;
};

type SelectedConversation = {
  threadId: number;
  peerType: PeerType;
  peerId: number;
  conversationKind?: 'support' | 'colleague' | 'admin' | 'personnel';
  filterSenderId?: number | null;
  filterSenderType?: number | null;
  peerStaffId?: number | null;
  displayName?: string;
  /** Customer → own personnel: email To address. */
  toEmail?: string | null;
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
  consumableDeliveryId?: number | null;
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
const COLLEAGUE_BADGE_LABEL = 'Colleague';
/** Role labels for badge click-tooltips (same wording as New message cards). */
const SERVICE_PROVIDER_ROLE = 'Service provider';
const COLLEAGUE_ROLE = 'My colleague';
const PERSONNEL_ROLE = 'Personnel';
const PERSONNEL_BADGE_LABEL = 'Personnel';
const NEW_MESSAGE_TO_LABEL = 'New message to';

/** Service-provider badge/Cc label from brand/org (API), with safe fallback. */
const serviceProviderLabel = (companyName?: string | null) =>
  companyName?.trim() || SERVICELINK_SUPPORT_LABEL;

/**
 * Click-tooltip from API `roleLabel` when present; otherwise from conversation kind.
 */
const conversationRoleTooltip = (
  kind: ThreadRow['conversationKind'] | undefined,
  peer?: {
    customerName?: string | null;
    companyName?: string | null;
    roleLabel?: string | null;
  },
): string | undefined => {
  const fromApi = peer?.roleLabel?.trim();
  if (fromApi) return fromApi;
  if (kind === 'colleague') return COLLEAGUE_ROLE;
  if (kind === 'admin') return SERVICE_PROVIDER_ROLE;
  if (kind === 'personnel') return PERSONNEL_ROLE;
  return undefined;
};

const NewMessageToHeading: React.FC<{ color?: string }> = ({ color }) => (
  <span
    style={{
      fontWeight: 600,
      fontSize: 16,
      display: 'inline-flex',
      alignItems: 'center',
      color,
    }}
  >
    <MailOutlined style={{ marginRight: 8 }} />
    {NEW_MESSAGE_TO_LABEL}
  </span>
);

const senderRoleLabel = (senderType: number, companyName?: string | null) => {
  if (+senderType === userType.ADMIN) return serviceProviderLabel(companyName);
  if (+senderType === userType.CUSTOMER) return customerOrgLabel(companyName);
  if (+senderType === userType.STAFF) return 'Staff';
  return 'Support';
};

const peerRoleLabel = (peerType: PeerType, companyName?: string | null) => {
  if (peerType === 'admin') return serviceProviderLabel(companyName);
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

type CcOptionGroup = 'provider' | 'colleague' | 'personnel' | 'staff';

type CcPickOption = {
  /** User id (number) or email (string) for personnel / free-typed. */
  value: number | string;
  label: string;
  group: CcOptionGroup;
};

const CC_GROUP_LABEL: Record<CcOptionGroup, string> = {
  provider: 'Service providers',
  colleague: 'Colleagues',
  personnel: 'My personnel',
  staff: 'Staff',
};

type CustomerOption = {
  id: number;
  name: string;
  companyName?: string | null;
  email?: string | null;
};

const sortOptionsAz = (opts: CustomerOption[]) =>
  [...opts].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
  );

const firstOptionIdAz = (opts: CustomerOption[]) => sortOptionsAz(opts)[0]?.id ?? null;

const withFromMessages = (href?: string): string | undefined => {
  if (!href) return href;
  if (/[?&]from=messages(?:&|$)/i.test(href)) return href;
  return href.includes('?') ? `${href}&from=messages` : `${href}?from=messages`;
};

const parseReportLink = (body: string): string | undefined => {
  if (!body) return undefined;
  const faultPath = body.match(/\/report-faults\?faultId=(\d+)/i);
  if (faultPath?.[1]) return withFromMessages(`/report-faults?faultId=${faultPath[1]}`);
  const newReportPath = body.match(/\/new-reports\?reportId=(\d+)/i);
  if (newReportPath?.[1]) return withFromMessages(`/new-reports?reportId=${newReportPath[1]}`);
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

const consumableDeliveryIdOf = (msg: MessageRow | Record<string, unknown>) => {
  const raw = msg as Record<string, unknown>;
  const v = raw.consumableDeliveryId ?? raw.consumable_delivery_id;
  return v != null && +v > 0 ? +v : 0;
};

const normalizeMessageRow = (raw: Record<string, unknown>): MessageRow => {
  const row = raw as MessageRow;
  return {
    ...row,
    reportFaultId: reportFaultIdOf(row) || null,
    userTaskId: userTaskIdOf(row) || null,
    consumableDeliveryId: consumableDeliveryIdOf(row) || null,
  };
};

const resolveMessageReportLink = (msg: MessageRow): string | undefined => {
  if (msg.reportLink) return withFromMessages(msg.reportLink);
  const faultId = reportFaultIdOf(msg);
  if (faultId > 0) return withFromMessages(`/report-faults?faultId=${faultId}`);
  const taskId = userTaskIdOf(msg);
  if (taskId > 0) return withFromMessages(`/new-reports?reportId=${taskId}`);
  const deliveryId = consumableDeliveryIdOf(msg);
  if (deliveryId > 0) return withFromMessages(`/consumables?deliveryId=${deliveryId}`);
  const fromBody = parseReportLink(msg.body);
  if (fromBody) return fromBody;
  const ref = msg.reportReference || msg.body || '';
  const newReportRef = ref.match(/New report #(\d+)/i);
  if (newReportRef?.[1]) return withFromMessages(`/new-reports?reportId=${newReportRef[1]}`);
  const faultRef = ref.match(/Fault report #(\d+)/i);
  if (faultRef?.[1]) return withFromMessages(`/report-faults?faultId=${faultRef[1]}`);
  const consumableRef = ref.match(/Consumables delivery #(\d+)/i);
  if (consumableRef?.[1]) {
    return withFromMessages(`/consumables?deliveryId=${consumableRef[1]}`);
  }
  return undefined;
};

const extractLinkedReportFromMessage = (
  m: MessageRow,
): { kind: 'fault' | 'task' | 'consumable'; id: number } | null => {
  const faultId = reportFaultIdOf(m);
  if (faultId > 0) return { kind: 'fault', id: faultId };
  const taskId = userTaskIdOf(m);
  if (taskId > 0) return { kind: 'task', id: taskId };
  const deliveryId = consumableDeliveryIdOf(m);
  if (deliveryId > 0) return { kind: 'consumable', id: deliveryId };
  const link = resolveMessageReportLink(m);
  if (link) {
    const fault = link.match(/faultId=(\d+)/i);
    if (fault?.[1]) return { kind: 'fault', id: +fault[1] };
    const task = link.match(/reportId=(\d+)/i);
    if (task?.[1]) return { kind: 'task', id: +task[1] };
    const delivery = link.match(/deliveryId=(\d+)/i);
    if (delivery?.[1]) return { kind: 'consumable', id: +delivery[1] };
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
  peerDisplayName?: string;
  supportOrgLabel?: string | null;
  isDeletedTab?: boolean;
  darkMode?: boolean;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  actionLoading?: boolean;
}> = ({
  msg,
  myDisplayName,
  peerDisplayName,
  supportOrgLabel,
  isDeletedTab,
  onDelete,
  onRestore,
  actionLoading,
}) => {
  const supportBadge = serviceProviderLabel(
    msg.senderType === userType.ADMIN
      ? msg.senderCompanyName || supportOrgLabel
      : supportOrgLabel,
  );
  const roleLabel = senderRoleLabel(
    msg.senderType,
    msg.senderCompanyName ||
      (+msg.senderType === userType.ADMIN ? supportOrgLabel : null),
  );
  const displayName = msg.isMine
    ? myDisplayName || 'You'
    : msg.senderName?.trim() || roleLabel;
  const reportLink = resolveMessageReportLink(msg);
  const attachments = msg.attachFiles || [];
  const timestamp = formatMessageTimestamp(msg.createdAt || msg.created_at);
  const bodyText = (msg.body || '').trim();
  const toLabel = msg.isMine
    ? peerDisplayName || 'Recipient'
    : myDisplayName || 'You';
  // Colleague delivery stores the To peer in ccCustomerIds — don't also list them under Cc.
  const toShort = ccPeerShortName(toLabel).toLowerCase();
  const peerShort = ccPeerShortName(peerDisplayName || '').toLowerCase();
  const ccLabels = (msg.ccRecipients || [])
    .map((label) => ccPeerShortName(label))
    .filter(Boolean)
    .filter((label) => {
      const short = label.toLowerCase();
      if (toShort && short === toShort) return false;
      if (peerShort && short === peerShort) return false;
      return true;
    });
  const subjectHint = msg.reportReference?.trim()
    ? msg.reportReference.trim().slice(0, 120)
    : bodyText
      ? bodyText.split(/\n/)[0].replace(/^📋\s*/, '').slice(0, 80) || 'Message'
      : attachments.length
        ? 'Attachment'
        : 'Message';

  const isSupportParty = (label?: string | null) => {
    if (!label) return false;
    const s = String(label).trim().toLowerCase();
    if (/servicelink/i.test(s)) return true;
    const brand = supportBadge.trim().toLowerCase();
    return Boolean(brand && (s === brand || s.startsWith(`${brand} (`)));
  };

  const partyRoleClass = (label: string) => {
    if (isSupportParty(label)) return 'outlook-thread-role--support';
    if (/colleague/i.test(label)) return 'outlook-thread-role--colleague';
    if (/staff/i.test(label)) return 'outlook-thread-role--staff';
    return 'outlook-thread-role--customer';
  };

  const renderParty = (label: string, opts?: { youSuffix?: boolean }) => {
    // Always show the real name; keep the role pill as a tag beside it.
    if (isSupportParty(label)) {
      return (
        <>
          <strong>{label}</strong>
          {opts?.youSuffix ? ' (you)' : ''}
          <span className="outlook-thread-role outlook-thread-role--support outlook-mail-party">
            {supportBadge}
          </span>
        </>
      );
    }
    return (
      <>
        <strong>{label}</strong>
        {opts?.youSuffix ? ' (you)' : ''}
      </>
    );
  };

  const rolePillClass =
    +msg.senderType === userType.ADMIN
      ? 'outlook-thread-role--support'
      : +msg.senderType === userType.STAFF
        ? 'outlook-thread-role--staff'
        : +msg.senderType === userType.CUSTOMER
          ? 'outlook-thread-role--customer'
          : partyRoleClass(roleLabel);

  return (
    <article className={`outlook-mail${msg.isMine ? ' is-mine' : ''}`}>
      <header className="outlook-mail-header">
        <div className="outlook-mail-subject-row">
          <h3 className="outlook-mail-subject">{subjectHint}</h3>
          <span className={`outlook-thread-role outlook-mail-role-pill ${rolePillClass}`}>
            {roleLabel}
          </span>
        </div>
        <dl className="outlook-mail-grid">
          <dt>From</dt>
          <dd>{renderParty(displayName, { youSuffix: msg.isMine })}</dd>
          <dt>To</dt>
          <dd>{renderParty(toLabel)}</dd>
          {ccLabels.length ? (
            <>
              <dt>Cc</dt>
              <dd className="outlook-mail-cc">
                {ccLabels.map((label) =>
                  isSupportParty(label) ? (
                    <span key={label} className="outlook-mail-cc-name">
                      <strong>{label}</strong>{' '}
                      <span className="outlook-thread-role outlook-thread-role--support outlook-mail-party">
                        {supportBadge}
                      </span>
                    </span>
                  ) : (
                    <span key={label} className="outlook-mail-cc-name">
                      {label}
                    </span>
                  ),
                )}
              </dd>
            </>
          ) : null}
          {timestamp ? (
            <>
              <dt>Sent</dt>
              <dd>{timestamp}</dd>
            </>
          ) : null}
        </dl>
      </header>
      <div className="outlook-mail-body">
        {bodyText ? <div>{msg.body}</div> : null}
        <MessageAttachments urls={attachments} isMine={false} />
      </div>
      <footer className="outlook-mail-actions">
        {reportLink ? (
          <Link to={reportLink} className="outlook-open-report">
            Linked report
          </Link>
        ) : null}
        <span style={{ flex: 1 }} />
        {isDeletedTab && onRestore ? (
          <Button
            type="link"
            size="small"
            icon={<UndoOutlined />}
            loading={actionLoading}
            onClick={() => onRestore(msg.id)}
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
            >
              Delete
            </Button>
          </Popconfirm>
        ) : null}
      </footer>
    </article>
  );
};

const MessagesPage: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const isMobilePortrait = useMobilePortrait();
  const { isDark } = useColorModeOptional();
  const messagesPageDark = isDark && isMobilePortrait;
  useEffect(() => {
    const cls = 'messages-page-body-dark';
    if (messagesPageDark) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [messagesPageDark]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<any>(null);
  const suppressMarkReadRef = useRef(false);
  /** After New email, keep a blank compose (no thread history) until first send. */
  const freshComposeRef = useRef(false);
  const [composingNew, setComposingNew] = useState(false);
  /** Mobile portrait: Conversations → Messages list → Reading (composer + card). */
  const [mobileReadingOpen, setMobileReadingOpen] = useState(false);
  /** Conversations + Messages lists: sort by date or A–Z. */
  const [conversationListSort, setConversationListSort] =
    useState<ListSortMode>('newest');
  const [messageListSort, setMessageListSort] = useState<ListSortMode>('newest');
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const reportContextKeyRef = useRef('');
  /** Report link pinned for this conversation (from URL or send with link) — not global. */
  const pinnedReportByConversationRef = useRef<
    Record<string, { faultId?: number; taskId?: number; deliveryId?: number }>
  >({});

  const scrollToLatestMessage = useCallback(() => {
    // Newest messages render at the top (under the compose box).
    const run = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const params = new URLSearchParams(location.search);
  const reportFaultIdParam = params.get('reportFaultId');
  const userTaskIdParam = params.get('userTaskId') || params.get('reportId');
  const consumableDeliveryIdParam = params.get('consumableDeliveryId');

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
  const [mailFolder, setMailFolder] = useState<MailFolder>('inbox');
  const [messageTab, setMessageTab] = useState<MessageTab>('received');
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
  const [consumableDeliveryId, setConsumableDeliveryId] = useState<number | null>(
    consumableDeliveryIdParam ? +consumableDeliveryIdParam : null,
  );
  const [consumableDeliverySubject, setConsumableDeliverySubject] = useState<string | null>(null);
  const [reportCustomerId, setReportCustomerId] = useState<number | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  /** Which recipient lane is active in the new-message modal. */
  const [newMessageTarget, setNewMessageTarget] = useState<
    'provider' | 'colleague' | 'personnel' | 'customer' | 'staff' | null
  >(null);
  const [newMessageCustomerId, setNewMessageCustomerId] = useState<number | null>(null);
  const [newMessageStaffId, setNewMessageStaffId] = useState<number | null>(null);
  const [newMessageAdminId, setNewMessageAdminId] = useState<number | null>(null);
  const [newMessageColleagueId, setNewMessageColleagueId] = useState<number | null>(null);
  const [newMessagePersonnelEmail, setNewMessagePersonnelEmail] = useState<string | null>(
    null,
  );
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<CustomerOption[]>([]);
  const [adminRecipientOptions, setAdminRecipientOptions] = useState<CustomerOption[]>([]);
  const [colleagueRecipientOptions, setColleagueRecipientOptions] = useState<CustomerOption[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [ccOptions, setCcOptions] = useState<CcPickOption[]>([]);
  const [ccCustomerIds, setCcCustomerIds] = useState<number[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [loadingCc, setLoadingCc] = useState(false);
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);
  const [ccDropdownSearch, setCcDropdownSearch] = useState('');
  const [personnelCcOptions, setPersonnelCcOptions] = useState<
    Array<{ email: string; name: string }>
  >([]);
  /** Admin Cc group title: customer org name (e.g. Bayside Council), not "Colleagues". */
  const [ccCustomerOrgLabel, setCcCustomerOrgLabel] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchKeyword), 350);
    return () => window.clearTimeout(t);
  }, [searchKeyword]);

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

  const messageListSubject = useCallback((m: MessageRow) => {
    const ref = String(m.reportReference || '').trim();
    if (ref) return ref.slice(0, 120);
    const bodyText = (m.body || '').trim();
    const firstLine = bodyText.split(/\n/)[0].replace(/^📋\s*/, '').trim();
    if (firstLine) return firstLine.slice(0, 90);
    if ((m.attachFiles || []).length) return 'Attachment';
    return 'Message';
  }, []);

  const messageListFromLabel = useCallback(
    (m: MessageRow) => {
      if (m.isMine) return myDisplayName || 'You';
      return (
        m.senderName?.trim() ||
        senderRoleLabel(m.senderType, m.senderCompanyName) ||
        ''
      );
    },
    [myDisplayName],
  );

  const filteredMessages = useMemo(() => {
    let rows = messages;
    if (messageTab === 'sent') rows = messages.filter((m) => m.isMine);
    else if (messageTab === 'received') rows = messages.filter((m) => !m.isMine);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) => {
        const from = messageListFromLabel(m).toLowerCase();
        return (
          from.includes(q) ||
          (m.body || '').toLowerCase().includes(q) ||
          messageListSubject(m).toLowerCase().includes(q) ||
          (m.senderCompanyName || '').toLowerCase().includes(q)
        );
      });
    }
    return [...rows].sort((a, b) => {
      if (messageListSort === 'newest' || messageListSort === 'oldest') {
        const dir = messageListSort === 'newest' ? -1 : 1;
        const byDate = messageCreatedMs(a) - messageCreatedMs(b);
        if (byDate !== 0) return dir * byDate;
        return dir * ((+a.id || 0) - (+b.id || 0));
      }
      const aKey = `${messageListFromLabel(a)}\0${messageListSubject(a)}`.toLocaleLowerCase();
      const bKey = `${messageListFromLabel(b)}\0${messageListSubject(b)}`.toLocaleLowerCase();
      const cmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return messageListSort === 'az' ? cmp : -cmp;
      return messageCreatedMs(b) - messageCreatedMs(a);
    });
  }, [
    messages,
    messageTab,
    debouncedSearch,
    messageListFromLabel,
    messageListSubject,
    messageListSort,
  ]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((m) => +m.id === +selectedMessageId!) ?? null,
    [filteredMessages, selectedMessageId],
  );

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedMessageId(null);
      return;
    }
    // Deep-link / New email about a report: keep composer focused on that report,
    // don't auto-pick an older message that would steal the linked report id.
    if (composingNew || reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam) {
      return;
    }
    if (
      selectedMessageId != null &&
      filteredMessages.some((m) => +m.id === +selectedMessageId)
    ) {
      return;
    }
    setSelectedMessageId(+filteredMessages[0].id);
  }, [
    filteredMessages,
    selectedMessageId,
    composingNew,
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
  ]);

  const pinnedReportForConversation = pinnedReportByConversationRef.current[activeConversationKey];

  /** Linked report on the message currently open in the reading pane. */
  const selectedLinkedReport = useMemo(
    () => (selectedMessage ? extractLinkedReportFromMessage(selectedMessage) : null),
    [selectedMessage],
  );

  /**
   * Report attached to the next Send.
   * Deep-link / explicit composer ids win (Message about this report from new-reports
   * or report-faults). Otherwise match the open message, then any pinned context.
   */
  const activeReportFaultId = useMemo(() => {
    if (reportFaultIdParam) return +reportFaultIdParam;
    if (userTaskIdParam || consumableDeliveryIdParam) return null;
    if (reportFaultId != null && reportFaultId > 0) return reportFaultId;
    if (userTaskId != null && userTaskId > 0) return null;
    if (consumableDeliveryId != null && consumableDeliveryId > 0) return null;
    if (selectedLinkedReport?.kind === 'fault') return selectedLinkedReport.id;
    if (pinnedReportForConversation?.faultId) return pinnedReportForConversation.faultId;
    return null;
  }, [
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
    reportFaultId,
    userTaskId,
    consumableDeliveryId,
    selectedLinkedReport,
    pinnedReportForConversation?.faultId,
    activeConversationKey,
  ]);

  const activeUserTaskId = useMemo(() => {
    if (reportFaultIdParam || consumableDeliveryIdParam) return null;
    if (userTaskIdParam) return +userTaskIdParam;
    if (reportFaultId != null && reportFaultId > 0) return null;
    if (consumableDeliveryId != null && consumableDeliveryId > 0) return null;
    if (userTaskId != null && userTaskId > 0) return userTaskId;
    if (selectedLinkedReport?.kind === 'fault') return null;
    if (selectedLinkedReport?.kind === 'consumable') return null;
    if (selectedLinkedReport?.kind === 'task') return selectedLinkedReport.id;
    if (pinnedReportForConversation?.faultId || pinnedReportForConversation?.deliveryId) {
      return null;
    }
    if (pinnedReportForConversation?.taskId) return pinnedReportForConversation.taskId;
    return null;
  }, [
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
    reportFaultId,
    userTaskId,
    consumableDeliveryId,
    selectedLinkedReport,
    pinnedReportForConversation?.faultId,
    pinnedReportForConversation?.taskId,
    pinnedReportForConversation?.deliveryId,
    activeConversationKey,
  ]);

  const activeConsumableDeliveryId = useMemo(() => {
    if (consumableDeliveryIdParam) return +consumableDeliveryIdParam;
    if (reportFaultIdParam || userTaskIdParam) return null;
    if (consumableDeliveryId != null && consumableDeliveryId > 0) return consumableDeliveryId;
    if (reportFaultId != null && reportFaultId > 0) return null;
    if (userTaskId != null && userTaskId > 0) return null;
    if (selectedLinkedReport?.kind === 'consumable') return selectedLinkedReport.id;
    if (pinnedReportForConversation?.deliveryId) return pinnedReportForConversation.deliveryId;
    return null;
  }, [
    consumableDeliveryIdParam,
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryId,
    reportFaultId,
    userTaskId,
    selectedLinkedReport,
    pinnedReportForConversation?.deliveryId,
    activeConversationKey,
  ]);

  const hasLinkedReport =
    activeReportFaultId != null ||
    activeUserTaskId != null ||
    activeConsumableDeliveryId != null;

  /**
   * Admin linked task/fault/delivery: To is choosable among company contacts.
   * Customer To stays plain text (like Colleague: name + role badge) — not a Select.
   */
  const canEditToRecipient =
    isAdmin && composingNew && hasLinkedReport && messageTab !== 'deleted';

  const toRecipientOptions = useMemo(() => {
    if (isCustomer) {
      const brandFallback =
        adminRecipientOptions.find((a) => a.companyName?.trim())?.companyName ||
        threads.find((t) => t.conversationKind === 'admin')?.companyName ||
        null;
      const providerOpts = sortOptionsAz(adminRecipientOptions).map((a) => {
        const brand = serviceProviderLabel(a.companyName || brandFallback);
        return {
          value: `provider:${a.id}`,
          label:
            adminRecipientOptions.length > 1 ? `${brand} (${ccPeerShortName(a.name)})` : brand,
          search: `${brand} ${a.name} ${a.companyName || ''}`.toLowerCase(),
        };
      });
      const selfId = profile?.id ? +profile.id : 0;
      const colleagueOpts = sortOptionsAz(
        colleagueRecipientOptions.filter((c) => +c.id !== selfId),
      ).map((c) => ({
        value: `colleague:${c.id}`,
        label: ccPeerShortName(c.name),
        search: `${c.name} ${c.companyName || ''}`.toLowerCase(),
      }));
      return [...providerOpts, ...colleagueOpts];
    }

    // Admin: only contacts from that company (not every customer/staff).
    const anchorId =
      reportCustomerId ||
      (selectedConversation?.peerType === 'customer'
        ? +selectedConversation.peerId
        : 0);
    const anchor = customerOptions.find((c) => +c.id === +anchorId);
    const orgKey = String(anchor?.companyName || ccCustomerOrgLabel || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const companyContacts = sortOptionsAz(
      customerOptions.filter((c) => {
        if (anchorId && +c.id === +anchorId) return true;
        if (!orgKey) return false;
        const cOrg = String(c.companyName || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');
        return cOrg === orgKey;
      }),
    );
    // Prefer entries that have an email address for the To picker.
    const withEmail = companyContacts.filter((c) => !!c.email);
    const list = withEmail.length ? withEmail : companyContacts;
    const opts = list.map((c) => ({
      value: `customer:${c.id}`,
      label: c.email
        ? `${ccPeerShortName(c.name)} <${c.email}>`
        : ccPeerShortName(c.name),
      search: `${c.name} ${c.email || ''} ${c.companyName || ''}`.toLowerCase(),
    }));
    // Deep-link peer may resolve before customerOptions load — keep To visible.
    if (
      selectedConversation?.peerType === 'customer' &&
      +selectedConversation.peerId > 0 &&
      !opts.some((o) => o.value === `customer:${selectedConversation.peerId}`)
    ) {
      const name =
        selectedConversation.displayName || `Customer #${selectedConversation.peerId}`;
      opts.unshift({
        value: `customer:${selectedConversation.peerId}`,
        label: ccPeerShortName(name),
        search: name.toLowerCase(),
      });
    }
    return opts;
  }, [
    isCustomer,
    adminRecipientOptions,
    colleagueRecipientOptions,
    threads,
    profile?.id,
    customerOptions,
    reportCustomerId,
    selectedConversation?.peerType,
    selectedConversation?.peerId,
    selectedConversation?.displayName,
    ccCustomerOrgLabel,
  ]);

  const toSelectValue = useMemo(() => {
    if (!selectedConversation) return undefined;
    if (isCustomer) {
      const id =
        selectedConversation.filterSenderId ||
        selectedConversation.peerId ||
        0;
      if (!id) return undefined;
      if (selectedConversation.conversationKind === 'colleague') {
        return `colleague:${id}`;
      }
      if (
        selectedConversation.conversationKind === 'admin' ||
        selectedConversation.peerType === 'admin'
      ) {
        return `provider:${id}`;
      }
      return undefined;
    }
    if (
      selectedConversation.peerType === 'customer' ||
      selectedConversation.peerType === 'staff'
    ) {
      return `${selectedConversation.peerType}:${selectedConversation.peerId}`;
    }
    return undefined;
  }, [selectedConversation, isCustomer]);

  const activeReportHref = useMemo(() => {
    if (activeReportFaultId) {
      return withFromMessages(`/report-faults?faultId=${activeReportFaultId}`) || null;
    }
    if (activeUserTaskId) {
      // Message-about-report deep links use userTaskId = user_tasks.id (New Reports row).
      return withFromMessages(`/new-reports?reportId=${activeUserTaskId}`) || null;
    }
    if (activeConsumableDeliveryId) {
      return (
        withFromMessages(`/consumables?deliveryId=${activeConsumableDeliveryId}`) || null
      );
    }
    return null;
  }, [activeReportFaultId, activeUserTaskId, activeConsumableDeliveryId]);

  const linkedItemLabel = useMemo(() => {
    if (activeReportFaultId) return `fault report #${activeReportFaultId}`;
    if (activeUserTaskId) return `task #${activeUserTaskId}`;
    if (activeConsumableDeliveryId) {
      const subject = consumableDeliverySubject?.trim();
      return subject
        ? `consumables: ${subject}`
        : `consumables delivery #${activeConsumableDeliveryId}`;
    }
    return null;
  }, [
    activeReportFaultId,
    activeUserTaskId,
    activeConsumableDeliveryId,
    consumableDeliverySubject,
  ]);

  const clearReportLinkContext = useCallback(() => {
    setReportFaultId(null);
    setUserTaskId(null);
    setConsumableDeliveryId(null);
    setConsumableDeliverySubject(null);
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

  const loadPersonnelForCc = useCallback(async () => {
    if (!isCustomer && !(isAdmin && (activeReportFaultId || activeUserTaskId))) {
      setPersonnelCcOptions([]);
      return;
    }
    try {
      const path =
        isAdmin && activeReportFaultId
          ? `${endPoint.CUSTOMER_PERSONNEL}?faultId=${activeReportFaultId}`
          : endPoint.CUSTOMER_PERSONNEL;
      const res = await callAPIAsync(serviceType.COMMON, path, 'GET', {});
      const rows: Array<{ name?: string; email?: string; isActive?: boolean }> = Array.isArray(
        res?.data,
      )
        ? res.data
        : [];
      const opts = rows
        .filter((r) => r?.isActive !== false && String(r?.email || '').includes('@'))
        .map((r) => ({
          email: String(r.email).trim().toLowerCase(),
          name: String(r.name || r.email).trim(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setPersonnelCcOptions(opts);
    } catch {
      setPersonnelCcOptions([]);
    }
  }, [isCustomer, isAdmin, activeReportFaultId, activeUserTaskId]);

  const loadCompanyCc = useCallback(async (customerId?: number, orgHint?: string | null) => {
    // Admin → customer: same-org people + staff (+ personnel when available).
    if (!isAdmin) return;
    const id = customerId != null ? +customerId : 0;
    if (!id) {
      setCcOptions([]);
      setCcCustomerIds([]);
      setCcCustomerOrgLabel(null);
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
      const orgFromApi =
        (typeof res?.data?.companyName === 'string' && res.data.companyName.trim()) ||
        rows.map((r) => r.companyName?.trim()).find(Boolean) ||
        orgHint?.trim() ||
        null;
      setCcCustomerOrgLabel(orgFromApi);
      const colleagueOpts: CcPickOption[] = rows.map((r) => ({
        value: +r.id,
        // Group header is the org; keep person names clean.
        label: r.fullName || `User #${r.id}`,
        group: 'colleague',
      }));
      const staffOpts: CcPickOption[] = sortOptionsAz(staffOptions).map((s) => ({
        value: s.id,
        label: s.name,
        group: 'staff',
      }));
      const personnelOpts: CcPickOption[] = personnelCcOptions.map((p) => ({
        value: p.email,
        label: p.name,
        group: 'personnel',
      }));
      setCcOptions([...colleagueOpts, ...staffOpts, ...personnelOpts]);
      setCcCustomerIds(colleagueOpts.map((o) => +o.value));
    } finally {
      setLoadingCc(false);
    }
  }, [isAdmin, staffOptions, personnelCcOptions]);

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
            return {
              ...threadToSelection(support),
              displayName:
                support.conversationKind === 'admin'
                  ? serviceProviderLabel(support.companyName)
                  : support.customerName,
            };
          }
          return null;
        }
        // Admin: keep explicit customer/staff pick (thread may not exist / not listed
        // until the first message — empty threads are filtered from the sidebar).
        if (isAdmin && (prev.peerType === 'customer' || prev.peerType === 'staff')) {
          const byPeer = findAdminThreadRow(rows, prev.peerType, prev.peerId);
          if (byPeer) {
            return {
              ...threadToSelection(byPeer),
              // Keep deep-link person name (e.g. Jessica) over any stale thread label.
              displayName: prev.displayName || byPeer.customerName,
            };
          }
          return prev;
        }
        if (prev && rows.some((t) => conversationMatches(prev, t))) {
          const match = rows.find((t) => conversationMatches(prev, t))!;
          return {
            ...threadToSelection(match),
            displayName:
              prev.displayName ||
              (match.conversationKind === 'admin'
                ? serviceProviderLabel(match.companyName)
                : match.customerName),
          };
        }
        if (isCustomer || isStaff) {
          if (rows.length === 0) return null;
          // Keep deep-link To (provider / colleague / personnel email) even when not listed.
          if (prev?.conversationKind === 'personnel' && prev.toEmail) {
            return prev;
          }
          if (
            prev &&
            (prev.conversationKind === 'admin' || prev.conversationKind === 'colleague') &&
            (prev.filterSenderId || prev.peerId)
          ) {
            const peerId = +(prev.filterSenderId || prev.peerId);
            const match = rows.find(
              (t) =>
                t.conversationKind === prev.conversationKind &&
                +t.filterSenderId === peerId,
            );
            if (match) {
              return {
                ...threadToSelection(match),
                displayName:
                  prev.displayName ||
                  (match.conversationKind === 'admin'
                    ? serviceProviderLabel(match.companyName)
                    : match.customerName),
              };
            }
            return prev;
          }
          const support =
            rows.find((t) => t.conversationKind === 'admin') ?? rows[0];
          return {
            ...threadToSelection(support),
            displayName:
              support.conversationKind === 'admin'
                ? serviceProviderLabel(support.companyName)
                : support.customerName,
          };
        }
        if (rows.length === 0) return null;
        return prev;
      });
      return rows;
    } finally {
      setLoadingThreads(false);
    }
  }, [showConversationSidebar]);

  const applyToRecipient = useCallback(
    async (raw: string | null) => {
      if (!raw) return;
      const token = String(raw).trim();
      if (!token) return;

      // Customer linked compose: provider (ServiceLink) or company colleague.
      if (isCustomer && token.startsWith('provider:')) {
        const adminId = +token.slice('provider:'.length);
        if (!adminId) return;
        const admin = adminRecipientOptions.find((a) => +a.id === adminId);
        const brand = serviceProviderLabel(
          admin?.companyName ||
            threads.find((t) => t.conversationKind === 'admin')?.companyName,
        );
        const rowList = threads.length ? threads : (await loadThreads()) || [];
        const existing = rowList.find(
          (t) => t.conversationKind === 'admin' && +t.filterSenderId === adminId,
        );
        setSelectedConversation(
          existing
            ? { ...threadToSelection(existing), displayName: brand }
            : {
                threadId: 0,
                peerType: 'admin',
                peerId: adminId,
                conversationKind: 'admin',
                filterSenderId: adminId,
                filterSenderType: userType.ADMIN,
                displayName: brand,
              },
        );
        return;
      }
      if (isCustomer && token.startsWith('colleague:')) {
        const colleagueId = +token.slice('colleague:'.length);
        if (!colleagueId) return;
        const col = colleagueRecipientOptions.find((c) => +c.id === colleagueId);
        const colName = col?.name || `Colleague #${colleagueId}`;
        const rowList = threads.length ? threads : (await loadThreads()) || [];
        const existing = rowList.find(
          (t) =>
            t.conversationKind === 'colleague' && +t.filterSenderId === colleagueId,
        );
        setSelectedConversation(
          existing
            ? {
                ...threadToSelection(existing),
                displayName: colName.split(' — ')[0],
              }
            : {
                threadId: 0,
                peerType: 'customer',
                peerId: colleagueId,
                conversationKind: 'colleague',
                filterSenderId: colleagueId,
                filterSenderType: userType.CUSTOMER,
                displayName: colName.split(' — ')[0],
              },
        );
        return;
      }

      let peerType: 'customer' | 'staff' | null = null;
      let peerId = 0;
      let displayName = '';
      let externalEmail: string | null = null;

      if (token.startsWith('customer:')) {
        peerType = 'customer';
        peerId = +token.slice('customer:'.length);
        displayName =
          customerOptions.find((c) => c.id === peerId)?.name ||
          `Customer #${peerId}`;
      } else if (token.startsWith('staff:')) {
        peerType = 'staff';
        peerId = +token.slice('staff:'.length);
        displayName =
          staffOptions.find((s) => s.id === peerId)?.name || `Staff #${peerId}`;
      } else if (token.startsWith('email:')) {
        externalEmail = token.slice('email:'.length).trim().toLowerCase();
      } else if (token.includes('@')) {
        externalEmail = token.trim().toLowerCase();
      } else {
        return;
      }

      if (externalEmail) {
        const customerMatch = customerOptions.find((c) => c.email === externalEmail);
        const staffMatch = staffOptions.find((s) => s.email === externalEmail);
        if (customerMatch) {
          peerType = 'customer';
          peerId = customerMatch.id;
          displayName = customerMatch.name;
          externalEmail = null;
        } else if (staffMatch) {
          peerType = 'staff';
          peerId = staffMatch.id;
          displayName = staffMatch.name;
          externalEmail = null;
        } else {
          // Unknown email: deliver by email; keep a company thread anchor for the linked task.
          const fallbackPeerId = reportCustomerId || selectedConversation?.peerId || 0;
          if (!fallbackPeerId) {
            message.error(
              'Choose a customer or staff contact, or an email already in Service360.',
            );
            return;
          }
          setCcEmails((prev) =>
            prev.includes(externalEmail!) ? prev : [...prev, externalEmail!],
          );
          setSelectedConversation({
            threadId: 0,
            peerType: 'customer',
            peerId: fallbackPeerId,
            displayName: externalEmail!,
          });
          return;
        }
      }

      if (!peerType || !peerId) return;

      const rowList = threads.length ? threads : (await loadThreads()) || [];
      const existing = findAdminThreadRow(rowList, peerType, peerId);
      setSelectedConversation(
        existing
          ? { ...threadToSelection(existing), displayName: displayName.split(' — ')[0] }
          : {
              threadId: 0,
              peerType,
              peerId,
              displayName: displayName.split(' — ')[0],
            },
      );
      // Refresh company Cc for the new customer To; staff To clears colleague prefill via effect.
      if (peerType === 'customer') {
        setReportCustomerId(peerId);
      }
    },
    [
      isCustomer,
      adminRecipientOptions,
      colleagueRecipientOptions,
      customerOptions,
      staffOptions,
      reportCustomerId,
      selectedConversation?.peerId,
      threads,
      loadThreads,
    ],
  );

  const loadNewMessageRecipients = useCallback(async () => {
    if (!isCustomer && !isStaff) return;
    setLoadingRecipients(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.MESSAGES}/recipients`,
        'GET',
      );
      const admins: Array<{
        id: number;
        fullName: string;
        companyName?: string | null;
      }> = res?.data?.admins || [];
      const colleagues: Array<{ id: number; fullName: string; companyName?: string | null }> =
        res?.data?.colleagues || [];
      const adminOpts = sortOptionsAz(
        admins.map((a) => ({
          id: +a.id,
          name: a.fullName || `Admin #${a.id}`,
          companyName: a.companyName || null,
        })),
      );
      const colleagueOpts = sortOptionsAz(
        colleagues.map((c) => ({
          id: +c.id,
          name: formatCustomerOptionLabel(c.fullName, c.companyName),
        })),
      );
      setAdminRecipientOptions(adminOpts);
      setColleagueRecipientOptions(colleagueOpts);
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
        const emailRaw = String(u.email || u.username || '').trim().toLowerCase();
        const email = emailRaw.includes('@') ? emailRaw : null;
        const opt: CustomerOption = {
          id: +u.id,
          name:
            +u.type === userType.CUSTOMER
              ? formatCustomerOptionLabel(fullName, company)
              : fullName,
          companyName: company,
          email,
        };
        if (+u.type === userType.CUSTOMER) customers.push(opt);
        if (+u.type === userType.STAFF) staff.push(opt);
      });
      const merge = (base: CustomerOption[], extra: CustomerOption[]) => {
        const m = new Map<number, CustomerOption>();
        [...base, ...extra].forEach((c) => {
          const prev = m.get(c.id);
          m.set(c.id, prev ? { ...prev, ...c, email: c.email || prev.email } : c);
        });
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

  const buildConversationMarkQuery = useCallback(() => {
    if (threadId) return `?threadId=${threadId}`;
    if (isAdmin && selectedConversation?.peerType === 'customer') {
      return `?customerId=${selectedConversation.peerId}`;
    }
    if (isAdmin && selectedConversation?.peerType === 'staff' && !selectedConversation.peerStaffId) {
      return `?staffId=${selectedConversation.peerId}`;
    }
    if ((isCustomer || isStaff) && selectedThread?.threadId) {
      return `?threadId=${selectedThread.threadId}`;
    }
    return '';
  }, [
    threadId,
    isAdmin,
    isCustomer,
    isStaff,
    selectedConversation,
    selectedThread?.threadId,
  ]);

  const markConversationUnread = useCallback(async () => {
    const markQuery = buildConversationMarkQuery();
    if (!markQuery) {
      message.warning('Select a conversation first');
      return;
    }
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.MESSAGES}/markUnread${markQuery}`,
      'PATCH',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not mark as unread');
      return;
    }
    suppressMarkReadRef.current = true;
    const bump = (prev: ThreadRow[]) =>
      prev.map((t) => {
        if (selectedConversation && conversationMatches(selectedConversation, t)) {
          return { ...t, unreadCount: Math.max(1, t.unreadCount || 0) };
        }
        if (
          !selectedConversation &&
          selectedThread &&
          t.threadId === selectedThread.threadId
        ) {
          return { ...t, unreadCount: Math.max(1, t.unreadCount || 0) };
        }
        return t;
      });
    setThreads(bump);
    message.success('Marked as unread');
  }, [buildConversationMarkQuery, selectedConversation, selectedThread]);

  const loadMessages = useCallback(async (opts?: { forceTab?: MessageTab }) => {
    if (opts?.forceTab) {
      setMessageTab(opts.forceTab);
    }
    // New email: don't pull prior thread history into the reading pane.
    if (freshComposeRef.current) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    const tab = opts?.forceTab ?? messageTab;
    setLoadingMessages(true);
    try {
      const query: Record<string, string | number> = { page: 1, limit: 200 };
      if (tab === 'deleted') query.deleted = 1;
      // List search filters conversations only — do not hide messages inside an open thread.
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

      if (tab !== 'deleted' && !suppressMarkReadRef.current) {
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
          !freshComposeRef.current &&
          !reportFaultIdParam &&
          !userTaskIdParam &&
          !consumableDeliveryIdParam &&
          rows.length
        ) {
          for (let i = rows.length - 1; i >= 0; i--) {
            const linked = extractLinkedReportFromMessage(rows[i]);
            if (linked) {
              pinnedReportByConversationRef.current[activeConversationKey] =
                linked.kind === 'fault'
                  ? { faultId: linked.id }
                  : linked.kind === 'task'
                    ? { taskId: linked.id }
                    : { deliveryId: linked.id };
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
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
  ]);

  const filteredThreads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = threads;
    if (mailFolder === 'unread') {
      rows = rows.filter((t) => t.unreadCount > 0);
    } else if (mailFolder === 'inbox') {
      rows = rows.filter((t) => (t.receivedCount ?? 0) > 0);
    } else if (mailFolder === 'sent') {
      rows = rows.filter((t) => (t.sentCount ?? 0) > 0);
    } else if (mailFolder === 'deleted') {
      rows = rows.filter((t) => (t.deletedCount ?? 0) > 0);
    }
    // all: keep full conversation list
    if (q) {
      rows = rows.filter((t) => {
        const role =
          t.conversationKind === 'admin'
            ? serviceProviderLabel(t.companyName)
            : t.conversationKind === 'colleague'
              ? COLLEAGUE_BADGE_LABEL
              : peerRoleLabel(t.peerType, t.companyName);
        return (
          (t.customerName || '').toLowerCase().includes(q) ||
          (t.lastMessagePreview || '').toLowerCase().includes(q) ||
          (t.companyName || '').toLowerCase().includes(q) ||
          role.toLowerCase().includes(q) ||
          String(t.peerType || '').toLowerCase().includes(q)
        );
      });
    }
    const sorted = [...rows].sort((a, b) => {
      if (conversationListSort === 'newest' || conversationListSort === 'oldest') {
        const dir = conversationListSort === 'newest' ? -1 : 1;
        const byDate = threadUpdatedMs(a) - threadUpdatedMs(b);
        if (byDate !== 0) return dir * byDate;
        // Flip ties too so repeated Date clicks always reorder the list.
        const byPeer = (+a.peerId || 0) - (+b.peerId || 0);
        if (byPeer !== 0) return dir * byPeer;
        return dir * String(a.customerName || '').localeCompare(String(b.customerName || ''));
      }
      const aKey = `${a.customerName || ''}\0${a.companyName || ''}`.toLocaleLowerCase();
      const bKey = `${b.customerName || ''}\0${b.companyName || ''}`.toLocaleLowerCase();
      const cmp = aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return conversationListSort === 'az' ? cmp : -cmp;
      return threadUpdatedMs(b) - threadUpdatedMs(a);
    });
    return sorted;
  }, [threads, debouncedSearch, mailFolder, conversationListSort]);

  const unreadThreadCount = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unreadCount > 0 ? 1 : 0), 0),
    [threads],
  );

  const inboxThreadCount = useMemo(
    () => threads.filter((t) => (t.receivedCount ?? 0) > 0).length,
    [threads],
  );

  const sentThreadCount = useMemo(
    () => threads.filter((t) => (t.sentCount ?? 0) > 0).length,
    [threads],
  );

  const deletedThreadCount = useMemo(
    () => threads.filter((t) => (t.deletedCount ?? 0) > 0).length,
    [threads],
  );

  const selectMailFolder = (folder: MailFolder) => {
    // Leave compose mode so folder filters + deleted/sent lists actually refresh.
    if (composingNew || freshComposeRef.current) {
      freshComposeRef.current = false;
      setComposingNew(false);
      clearComposer();
    }
    if (reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam) {
      history.replace('/messages');
      clearReportLinkContext();
    }
    setMailFolder(folder);
    setMessageTab(folderToMessageTab(folder));
    setSelectedMessageId(null);
    setMobileReadingOpen(false);
  };

  // When Inbox/Sent hides the open conversation, move selection to the first visible one.
  // Do not run while composing a new email — the chosen recipient often has no thread yet
  // (or is not in Inbox), and this effect was wiping the To: selection.
  useEffect(() => {
    if (!showConversationSidebar) return;
    if (composingNew || freshComposeRef.current) return;
    if (!selectedConversation && !(isCustomer || isStaff)) return;
    const current = isAdmin
      ? selectedConversation
      : activeConversation
        ? {
            threadId: activeConversation.threadId,
            peerType: activeConversation.peerType,
            peerId: activeConversation.peerId,
            conversationKind: activeConversation.conversationKind,
            filterSenderId: activeConversation.filterSenderId,
            filterSenderType: activeConversation.filterSenderType,
            peerStaffId: activeConversation.peerStaffId,
          }
        : null;
    if (!current) return;
    const stillVisible = filteredThreads.some((t) => conversationMatches(current, t));
    if (stillVisible) return;
    if (filteredThreads.length) {
      setSelectedConversation(threadToSelection(filteredThreads[0]));
      setSelectedMessageId(null);
      setMobileReadingOpen(false);
      return;
    }
    setSelectedConversation(null);
    setSelectedMessageId(null);
  }, [
    mailFolder,
    filteredThreads,
    showConversationSidebar,
    isAdmin,
    isCustomer,
    isStaff,
    selectedConversation,
    activeConversation,
    composingNew,
  ]);

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

  const deleteLatestMessage = async () => {
    const latest =
      [...filteredMessages].sort(
        (a, b) => messageCreatedMs(b) - messageCreatedMs(a),
      )[0];
    if (!latest?.id) {
      message.warning('No message to delete');
      return;
    }
    await softDeleteMessage(latest.id);
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
        setMailFolder('inbox');
        await loadMessages({ forceTab: 'received' });
        await loadThreads();
      } else {
        message.error(res?.message || 'Could not restore message');
      }
    } finally {
      setMessageActionId(null);
    }
  };

  const restoreSelectedDeletedMessage = async () => {
    const target =
      selectedMessage ||
      filteredMessages[0] ||
      null;
    if (!target?.id) {
      message.warning('No deleted message to restore');
      return;
    }
    await restoreMessage(target.id);
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
    if (showConversationSidebar && isAdmin) {
      loadRecipientOptions();
    }
  }, [showConversationSidebar, isAdmin, loadRecipientOptions]);

  /** When a New message lane is chosen, pre-select the first A–Z person in that list. */
  useEffect(() => {
    if (!newMessageOpen || !newMessageTarget) return;
    if (newMessageTarget === 'provider' && newMessageAdminId == null) {
      const id = firstOptionIdAz(adminRecipientOptions);
      if (id != null) setNewMessageAdminId(id);
    }
    if (newMessageTarget === 'colleague' && newMessageColleagueId == null) {
      const id = firstOptionIdAz(colleagueRecipientOptions);
      if (id != null) setNewMessageColleagueId(id);
    }
    if (newMessageTarget === 'personnel' && newMessagePersonnelEmail == null) {
      const first = [...personnelCcOptions].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )[0];
      if (first?.email) setNewMessagePersonnelEmail(first.email);
    }
    if (newMessageTarget === 'customer' && newMessageCustomerId == null) {
      const id = firstOptionIdAz(customerOptions);
      if (id != null) setNewMessageCustomerId(id);
    }
    if (newMessageTarget === 'staff' && newMessageStaffId == null) {
      const id = firstOptionIdAz(staffOptions);
      if (id != null) setNewMessageStaffId(id);
    }
  }, [
    newMessageOpen,
    newMessageTarget,
    newMessageAdminId,
    newMessageColleagueId,
    newMessagePersonnelEmail,
    newMessageCustomerId,
    newMessageStaffId,
    adminRecipientOptions,
    colleagueRecipientOptions,
    personnelCcOptions,
    customerOptions,
    staffOptions,
  ]);

  const serviceProviderOrgName = useMemo(() => {
    const fromAdminOpt = adminRecipientOptions.find((a) => a.companyName?.trim())
      ?.companyName;
    if (fromAdminOpt?.trim()) return fromAdminOpt.trim();
    const fromThread = threads.find((t) => t.conversationKind === 'admin')?.companyName;
    return fromThread?.trim() || null;
  }, [adminRecipientOptions, threads]);

  const ccContextKey = useMemo(() => {
    if (isAdmin && selectedConversation?.peerType === 'customer') {
      return `admin-cust:${selectedConversation.peerId}`;
    }
    // Task/report linked to a company while To: is staff — still prefill company Cc.
    if (
      isAdmin &&
      selectedConversation?.peerType === 'staff' &&
      reportCustomerId
    ) {
      return `admin-staff-co:${selectedConversation.peerId}:${reportCustomerId}`;
    }
    if (isAdmin && selectedConversation?.peerType === 'staff') {
      return `admin-staff:${selectedConversation.peerId}`;
    }
    if (isCustomer && activeConversation?.conversationKind === 'admin') {
      return `cust-admin:${activeConversation.peerId || ''}`;
    }
    if (isCustomer && activeConversation?.conversationKind === 'colleague') {
      return `cust-col:${activeConversation.filterSenderId || activeConversation.peerId || ''}`;
    }
    return 'none';
  }, [
    isAdmin,
    isCustomer,
    selectedConversation?.peerType,
    selectedConversation?.peerId,
    reportCustomerId,
    activeConversation?.conversationKind,
    activeConversation?.peerId,
    activeConversation?.filterSenderId,
  ]);
  const ccContextKeyRef = useRef('none');
  const ccPrefillKeyRef = useRef('');

  useEffect(() => {
    void loadPersonnelForCc();
  }, [loadPersonnelForCc]);

  useEffect(() => {
    // Prevent background reloads while the New message modal is open (can cause UI jitter).
    if (newMessageOpen) return;
    const contextChanged = ccContextKeyRef.current !== ccContextKey;
    if (contextChanged) {
      ccContextKeyRef.current = ccContextKey;
      ccPrefillKeyRef.current = '';
    }

    const personnelOpts: CcPickOption[] = personnelCcOptions.map((p) => ({
      value: p.email,
      label: p.name,
      group: 'personnel',
    }));

    if (isAdmin && selectedConversation?.peerType === 'customer') {
      if (contextChanged) {
        void loadCompanyCc(
          selectedConversation.peerId,
          selectedThread?.companyName || selectedConversation.displayName,
        );
      } else {
        // Refresh dropdown list when staff/personnel load without resetting prefill.
        if (selectedThread?.companyName?.trim()) {
          setCcCustomerOrgLabel(selectedThread.companyName.trim());
        }
        setCcOptions((prev) => {
          const colleagues = prev.filter((o) => o.group === 'colleague');
          const staffOpts: CcPickOption[] = sortOptionsAz(staffOptions).map((s) => ({
            value: s.id,
            label: s.name,
            group: 'staff',
          }));
          return [...colleagues, ...staffOpts, ...personnelOpts];
        });
      }
      return;
    }

    if (isAdmin && selectedConversation?.peerType === 'staff') {
      const peerId = +selectedConversation.peerId;
      const staffOpts: CcPickOption[] = sortOptionsAz(
        staffOptions.filter((s) => +s.id !== peerId),
      ).map((s) => ({
        value: s.id,
        label: s.name,
        group: 'staff',
      }));
      // Linked task/report with a company: Cc company colleagues (same as customer To:).
      if (reportCustomerId) {
        if (contextChanged) {
          void loadCompanyCc(reportCustomerId);
          setCcEmails([]);
        } else {
          setCcOptions((prev) => {
            const colleagues = prev.filter((o) => o.group === 'colleague');
            return [...colleagues, ...staffOpts, ...personnelOpts];
          });
        }
        return;
      }
      setCcCustomerOrgLabel(null);
      setCcOptions([...staffOpts, ...personnelOpts]);
      if (contextChanged) {
        setCcCustomerIds([]);
        setCcEmails([]);
      }
      return;
    }

    if (isCustomer && activeConversation?.conversationKind === 'admin') {
      setCcCustomerOrgLabel(null);
      const selfId = profile?.id ? +profile.id : 0;
      const peerOpts = sortOptionsAz(
        colleagueRecipientOptions.filter((c) => +c.id !== selfId),
      ).map((c) => ({
        value: c.id,
        label: c.name,
        group: 'colleague' as const,
      }));
      const otherProviders = sortOptionsAz(
        adminRecipientOptions.filter(
          (a) => +a.id !== +(activeConversation.peerId || 0),
        ),
      ).map((a) => {
        const org = serviceProviderLabel(a.companyName || serviceProviderOrgName);
        return {
          value: a.id,
          label: adminRecipientOptions.length > 1 ? `${org} (${a.name})` : org,
          group: 'provider' as const,
        };
      });
      setCcOptions([...peerOpts, ...otherProviders, ...personnelOpts]);
      if (contextChanged) setCcEmails([]);
      // Auto-select colleagues when opening ServiceLink — tags stay removable.
      if (
        peerOpts.length &&
        (contextChanged || ccPrefillKeyRef.current !== ccContextKey)
      ) {
        ccPrefillKeyRef.current = ccContextKey;
        setCcCustomerIds(peerOpts.map((o) => +o.value));
      }
      return;
    }

    // Colleague chat: list providers + other peers + personnel; preselect providers.
    if (isCustomer && activeConversation?.conversationKind === 'colleague') {
      setCcCustomerOrgLabel(null);
      const selfId = profile?.id ? +profile.id : 0;
      const peerId = +(
        activeConversation.filterSenderId ||
        activeConversation.peerId ||
        0
      );
      const providerOpts = sortOptionsAz(adminRecipientOptions).map((a) => {
        const org = serviceProviderLabel(a.companyName || serviceProviderOrgName);
        return {
          value: a.id,
          label: adminRecipientOptions.length > 1 ? `${org} (${a.name})` : org,
          group: 'provider' as const,
        };
      });
      const peerOpts = sortOptionsAz(
        colleagueRecipientOptions.filter(
          (c) => +c.id !== selfId && +c.id !== peerId,
        ),
      ).map((c) => ({
        value: c.id,
        label: c.name,
        group: 'colleague' as const,
      }));
      setCcOptions([...providerOpts, ...peerOpts, ...personnelOpts]);
      if (contextChanged) setCcEmails([]);
      if (
        providerOpts.length &&
        (contextChanged || ccPrefillKeyRef.current !== ccContextKey)
      ) {
        ccPrefillKeyRef.current = ccContextKey;
        setCcCustomerIds(providerOpts.map((o) => +o.value));
      }
      return;
    }
    if (contextChanged) {
      setCcOptions([]);
      setCcCustomerIds([]);
      setCcEmails([]);
      setCcCustomerOrgLabel(null);
    }
  }, [
    newMessageOpen,
    ccContextKey,
    isCustomer,
    isAdmin,
    activeConversation?.conversationKind,
    activeConversation?.filterSenderId,
    activeConversation?.peerId,
    colleagueRecipientOptions,
    adminRecipientOptions,
    serviceProviderOrgName,
    selectedConversation,
    selectedThread?.companyName,
    reportCustomerId,
    loadCompanyCc,
    loadPersonnelForCc,
    personnelCcOptions,
    staffOptions,
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
  ]);

  useEffect(() => {
    if (reportFaultIdParam) {
      setReportFaultId(+reportFaultIdParam);
      setUserTaskId(null);
      setConsumableDeliveryId(null);
      setComposingNew(true);
      setSelectedMessageId(null);
      setMobileReadingOpen(true);
      setDraft((prev) =>
        prev.trim() ? prev : 'Hello, I have a question about this report fault.',
      );
    } else if (userTaskIdParam) {
      setUserTaskId(+userTaskIdParam);
      setReportFaultId(null);
      setConsumableDeliveryId(null);
      setComposingNew(true);
      setSelectedMessageId(null);
      setMobileReadingOpen(true);
      setDraft((prev) =>
        prev.trim() ? prev : 'Hello, I have a question about this task.',
      );
    } else if (consumableDeliveryIdParam) {
      setReportFaultId(null);
      setUserTaskId(null);
      setConsumableDeliveryId(+consumableDeliveryIdParam);
      setComposingNew(true);
      setSelectedMessageId(null);
      setMobileReadingOpen(true);
      setDraft((prev) =>
        prev.trim()
          ? prev
          : 'Hello, I have a question about this consumables delivery.',
      );
      void (async () => {
        try {
          const res = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.CONSUMABLES}/deliveries/${consumableDeliveryIdParam}`,
            'GET',
            {},
          );
          const subject = String(res?.data?.subject || '').trim();
          if (subject) setConsumableDeliverySubject(subject);
        } catch {
          setConsumableDeliverySubject(null);
        }
      })();
    }
  }, [reportFaultIdParam, userTaskIdParam, consumableDeliveryIdParam]);

  // Customer delivery/task/fault deep-link: To = brand provider (choosable), not admin full name.
  useEffect(() => {
    if (!isCustomer) return;
    if (!(reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam)) return;
    if (!composingNew) return;
    const contextKey = `cust|${reportFaultIdParam || ''}|${userTaskIdParam || ''}|${
      consumableDeliveryIdParam || ''
    }`;
    if (reportContextKeyRef.current === contextKey) return;

    let cancelled = false;
    void (async () => {
      if (!adminRecipientOptions.length) {
        await loadNewMessageRecipients();
      }
      if (cancelled) return;
      const rowList = threads.length ? threads : (await loadThreads()) || [];
      if (cancelled) return;
      const support =
        rowList.find((t) => t.conversationKind === 'admin') ?? null;
      const adminId =
        support?.filterSenderId ||
        adminRecipientOptions[0]?.id ||
        support?.peerId ||
        0;
      if (!adminId) return;
      const admin = adminRecipientOptions.find((a) => +a.id === +adminId);
      const brand = serviceProviderLabel(
        admin?.companyName || support?.companyName || serviceProviderOrgName,
      );
      const existing = rowList.find(
        (t) => t.conversationKind === 'admin' && +t.filterSenderId === +adminId,
      );
      reportContextKeyRef.current = contextKey;
      setSelectedConversation(
        existing
          ? { ...threadToSelection(existing), displayName: brand }
          : {
              threadId: 0,
              peerType: 'admin',
              peerId: +adminId,
              conversationKind: 'admin',
              filterSenderId: +adminId,
              filterSenderType: userType.ADMIN,
              displayName: brand,
            },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isCustomer,
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
    composingNew,
    threads.length,
    adminRecipientOptions,
    serviceProviderOrgName,
    loadNewMessageRecipients,
    loadThreads,
  ]);

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
    } else if (consumableDeliveryIdParam) {
      pinnedReportByConversationRef.current[activeConversationKey] = {
        deliveryId: +consumableDeliveryIdParam,
      };
    }
  }, [
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
    activeConversationKey,
  ]);

  useEffect(() => {
    if (!hasLinkedReport) {
      setReportCustomerId(null);
    }
  }, [hasLinkedReport]);

  useEffect(() => {
    setMessages([]);
  }, [activeConversationKey]);

  useEffect(() => {
    if (
      !isAdmin ||
      !(reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam)
    ) {
      return;
    }
    const contextKey = `${reportFaultIdParam || ''}|${userTaskIdParam || ''}|${
      consumableDeliveryIdParam || ''
    }`;
    const alreadyApplied =
      reportContextKeyRef.current === contextKey &&
      reportCustomerId &&
      selectedConversation &&
      (selectedConversation.peerType === 'customer' ||
        selectedConversation.peerType === 'staff') &&
      +selectedConversation.peerId > 0;
    if (alreadyApplied) return;

    let cancelled = false;
    (async () => {
      const q = reportFaultIdParam
        ? `reportFaultId=${encodeURIComponent(reportFaultIdParam)}`
        : userTaskIdParam
          ? `userTaskId=${encodeURIComponent(userTaskIdParam)}`
          : `consumableDeliveryId=${encodeURIComponent(consumableDeliveryIdParam!)}`;
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
        // Prefer 0 when the peer isn't in the sidebar yet so loadThreads won't drop To.
        threadId: existing?.threadId ?? 0,
        peerType,
        peerId,
        // Prefer API person name (e.g. Jessica Bosevska) — never ServiceLink brand.
        displayName: res.data.displayName || existing?.customerName,
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
      } else if (consumableDeliveryIdParam) {
        pinnedReportByConversationRef.current[pinKey] = {
          deliveryId: +consumableDeliveryIdParam,
        };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAdmin,
    reportFaultIdParam,
    userTaskIdParam,
    consumableDeliveryIdParam,
    reportCustomerId,
    selectedConversation?.peerType,
    selectedConversation?.peerId,
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
    setCcEmails([]);
  };

  const isCcEmailToken = (raw: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || '').trim());

  /** Tag values: numeric user id strings + free-typed / personnel emails. */
  const ccSelectValue = useMemo(
    () => [...ccCustomerIds.map(String), ...ccEmails],
    [ccCustomerIds, ccEmails],
  );

  const ccSelectOptions = useMemo(() => {
    const order: CcOptionGroup[] = ['provider', 'colleague', 'staff', 'personnel'];
    const q = ccDropdownSearch.trim().toLowerCase();
    return order
      .map((group) => {
        const options = ccOptions
          .filter((o) => o.group === group)
          .map((o) => ({
            value: String(o.value),
            label: ccPeerShortName(o.label),
            raw: o,
          }))
          .filter(
            (o) =>
              !q ||
              o.label.toLowerCase().includes(q) ||
              o.value.toLowerCase().includes(q),
          );
        if (!options.length) return null;
        const label =
          group === 'colleague' && ccCustomerOrgLabel
            ? ccCustomerOrgLabel
            : CC_GROUP_LABEL[group];
        return { label, options };
      })
      .filter(Boolean) as Array<{
      label: string;
      options: Array<{ value: string; label: string; raw: CcPickOption }>;
    }>;
  }, [ccOptions, ccDropdownSearch, ccCustomerOrgLabel]);

  const ccLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    ccOptions.forEach((o) => {
      map.set(String(o.value), ccPeerShortName(o.label));
    });
    return map;
  }, [ccOptions]);

  const isCcPickSelected = useCallback(
    (opt: CcPickOption) => {
      const key = String(opt.value);
      if (typeof opt.value === 'number' || /^\d+$/.test(key)) {
        return ccCustomerIds.includes(+key);
      }
      return ccEmails.includes(key.toLowerCase());
    },
    [ccCustomerIds, ccEmails],
  );

  const toggleCcPick = useCallback((opt: CcPickOption) => {
    const key = String(opt.value);
    if (typeof opt.value === 'number' || /^\d+$/.test(key)) {
      const id = +key;
      setCcCustomerIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      return;
    }
    const email = key.toLowerCase();
    setCcEmails((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email],
    );
  }, []);

  const onCcSelectChange = useCallback(
    (vals: Array<string | number>) => {
      const ids: number[] = [];
      const emails: string[] = [];
      for (const raw of vals || []) {
        const token = String(raw || '').trim();
        if (!token) continue;
        if (/^\d+$/.test(token)) {
          ids.push(+token);
          continue;
        }
        if (isCcEmailToken(token)) {
          emails.push(token.toLowerCase());
          continue;
        }
        const match = ccOptions.find(
          (o) =>
            ccPeerShortName(o.label).toLowerCase() === token.toLowerCase() ||
            String(o.label).toLowerCase() === token.toLowerCase(),
        );
        if (match) {
          if (typeof match.value === 'number' || /^\d+$/.test(String(match.value))) {
            ids.push(+match.value);
          } else if (isCcEmailToken(String(match.value))) {
            emails.push(String(match.value).toLowerCase());
          }
        }
      }
      const nextIds = [...new Set(ids)];
      const nextEmails = [...new Set(emails)];
      setCcCustomerIds((prev) =>
        prev.length === nextIds.length && prev.every((id, i) => id === nextIds[i])
          ? prev
          : nextIds,
      );
      setCcEmails((prev) =>
        prev.length === nextEmails.length &&
        prev.every((e, i) => e === nextEmails[i])
          ? prev
          : nextEmails,
      );
    },
    [ccOptions],
  );

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
    (isCustomer &&
      (activeConversation?.conversationKind === 'admin' ||
        activeConversation?.conversationKind === 'colleague' ||
        activeConversation?.conversationKind === 'personnel')) ||
    (isAdmin &&
      (selectedConversation?.peerType === 'customer' ||
        selectedConversation?.peerType === 'staff')) ||
    (hasLinkedReport && (isCustomer || isAdmin));

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
      } else if (activeConsumableDeliveryId) {
        payload.consumableDeliveryId = activeConsumableDeliveryId;
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
        // To colleague must be delivered via ccCustomerIds; extras may be ServiceLink and/or peers.
        const selfId = profile?.id ? +profile.id : 0;
        const peerId = +(
          activeConversation.filterSenderId ||
          activeConversation.peerId ||
          0
        );
        const extra = ccCustomerIds.filter(
          (id) => +id !== selfId && +id !== peerId,
        );
        const ids =
          peerId && peerId !== selfId ? [peerId, ...extra] : extra;
        if (ids.length) payload.ccCustomerIds = ids;
      } else if (hasLinkedReport && ccCustomerIds.length > 0) {
        const selfId = profile?.id ? +profile.id : 0;
        payload.ccCustomerIds = ccCustomerIds.filter((id) => +id !== selfId);
      } else if (showCcComposer && ccCustomerIds.length > 0) {
        payload.ccCustomerIds = ccCustomerIds;
      }
      const personnelTo =
        isCustomer && activeConversation?.conversationKind === 'personnel'
          ? String(activeConversation.toEmail || '').trim().toLowerCase()
          : '';
      const outboundEmails = [
        ...new Set(
          [...(personnelTo ? [personnelTo] : []), ...ccEmails]
            .map((e) => String(e || '').trim().toLowerCase())
            .filter((e) => e.includes('@')),
        ),
      ];
      if (outboundEmails.length) payload.ccEmails = outboundEmails;

      await callAPIAsync(serviceType.COMMON, `${endPoint.MESSAGES}/send`, 'POST', payload);
      if (
        activeConversationKey !== 'none' &&
        (activeReportFaultId || activeUserTaskId || activeConsumableDeliveryId)
      ) {
        pinnedReportByConversationRef.current[activeConversationKey] = activeReportFaultId
          ? { faultId: activeReportFaultId }
          : activeUserTaskId
            ? { taskId: activeUserTaskId }
            : { deliveryId: activeConsumableDeliveryId! };
      }
      clearComposer();
      freshComposeRef.current = false;
      setComposingNew(false);
      const nextTab = folderToMessageTab(mailFolder);
      if (showConversationSidebar) await loadThreads();
      await loadMessages({ forceTab: nextTab });
      scrollToLatestMessage();
      window.setTimeout(scrollToLatestMessage, 100);
    } finally {
      setSending(false);
    }
  };

  const openNewMessage = async () => {
    freshComposeRef.current = true;
    setComposingNew(true);
    setMobileReadingOpen(false);
    setMessages([]);
    clearComposer();
    clearReportLinkContext();
    setCcCustomerIds([]);
    if (reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam) {
      history.replace('/messages');
    }
    if (isCustomer || isStaff) {
      setNewMessageTarget(null);
      setNewMessageAdminId(null);
      setNewMessageColleagueId(null);
      setNewMessagePersonnelEmail(null);
      setNewMessageOpen(true);
      await Promise.all([loadNewMessageRecipients(), loadPersonnelForCc()]);
      if (!threads.length) await loadThreads();
      return;
    }
    setNewMessageTarget(null);
    setNewMessageCustomerId(null);
    setNewMessageStaffId(null);
    setNewMessageOpen(true);
    loadRecipientOptions();
  };

  const startNewConversation = async () => {
    if (isCustomer || isStaff) {
      if (!newMessageAdminId && !newMessageColleagueId && !newMessagePersonnelEmail) {
        return;
      }
      const rowList = (await loadThreads()) || threads;

      if (newMessagePersonnelEmail && isCustomer) {
        const email = newMessagePersonnelEmail.trim().toLowerCase();
        const person = personnelCcOptions.find((p) => p.email === email);
        const support =
          rowList.find((t) => t.conversationKind === 'admin') ?? rowList[0] ?? null;
        setSelectedConversation({
          threadId: support?.threadId ?? 0,
          peerType: 'customer',
          peerId: profile?.id ? +profile.id : 0,
          conversationKind: 'personnel',
          displayName: person?.name || email,
          toEmail: email,
        });
        setCcEmails([]);
        setCcCustomerIds([]);
        setMessageTab(folderToMessageTab(mailFolder));
        setNewMessageOpen(false);
        freshComposeRef.current = true;
        setComposingNew(true);
        setMobileReadingOpen(true);
        setMessages([]);
        clearComposer();
        clearReportLinkContext();
        const selfId = profile?.id ? +profile.id : 0;
        const peerOpts = sortOptionsAz(
          colleagueRecipientOptions.filter((c) => +c.id !== selfId),
        ).map((c) => ({
          value: c.id,
          label: c.name,
          group: 'colleague' as const,
        }));
        const otherPersonnel = personnelCcOptions
          .filter((p) => p.email !== email)
          .map((p) => ({
            value: p.email,
            label: p.name,
            group: 'personnel' as const,
          }));
        setCcOptions([...peerOpts, ...otherPersonnel]);
        return;
      }

      if (newMessageAdminId) {
        const existing = rowList.find(
          (t) => t.conversationKind === 'admin' && +t.filterSenderId === +newMessageAdminId,
        );
        const admin = adminRecipientOptions.find((a) => a.id === newMessageAdminId);
        // Service provider is always ServiceLink (brand) — never the admin login name.
        const brand = serviceProviderLabel(
          admin?.companyName || serviceProviderOrgName,
        );
        if (existing) {
          setSelectedConversation({
            ...threadToSelection(existing),
            displayName: brand,
          });
        } else {
          // threadId 0 = brand-new To:; do not borrow another conversation's id
          // (Inbox filter was replacing the recipient with the first visible thread).
          setSelectedConversation({
            threadId: 0,
            peerType: 'admin',
            peerId: newMessageAdminId,
            conversationKind: 'admin',
            filterSenderId: newMessageAdminId,
            filterSenderType: userType.ADMIN,
            displayName: brand,
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
            setSelectedConversation({
              threadId: 0,
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
      setMessageTab(folderToMessageTab(mailFolder));
      setNewMessageOpen(false);
      freshComposeRef.current = true;
      setComposingNew(true);
      setMobileReadingOpen(true);
      setMessages([]);
      clearComposer();
      clearReportLinkContext();
      // New message → ServiceLink: auto-Cc colleagues. → Colleague: auto-Cc providers.
      const personnelOpts: CcPickOption[] = personnelCcOptions.map((p) => ({
        value: p.email,
        label: p.name,
        group: 'personnel',
      }));
      if (isCustomer && newMessageAdminId) {
        const selfId = profile?.id ? +profile.id : 0;
        const peerOpts = sortOptionsAz(
          colleagueRecipientOptions.filter((c) => +c.id !== selfId),
        ).map((c) => ({
          value: c.id,
          label: c.name,
          group: 'colleague' as const,
        }));
        const otherProviders = sortOptionsAz(
          adminRecipientOptions.filter((a) => +a.id !== +newMessageAdminId),
        ).map((a) => {
          const org = serviceProviderLabel(a.companyName || serviceProviderOrgName);
          return {
            value: a.id,
            label: adminRecipientOptions.length > 1 ? `${org} (${a.name})` : org,
            group: 'provider' as const,
          };
        });
        setCcOptions([...peerOpts, ...otherProviders, ...personnelOpts]);
        setCcCustomerIds(peerOpts.map((o) => +o.value));
        setCcEmails([]);
        ccPrefillKeyRef.current = `cust-admin:${newMessageAdminId}`;
        ccContextKeyRef.current = `cust-admin:${newMessageAdminId}`;
      } else if (isCustomer && newMessageColleagueId) {
        const selfId = profile?.id ? +profile.id : 0;
        const peerId = +newMessageColleagueId;
        const providerOpts = sortOptionsAz(adminRecipientOptions).map((a) => {
          const org = serviceProviderLabel(a.companyName || serviceProviderOrgName);
          return {
            value: a.id,
            label: adminRecipientOptions.length > 1 ? `${org} (${a.name})` : org,
            group: 'provider' as const,
          };
        });
        const peerOpts = sortOptionsAz(
          colleagueRecipientOptions.filter(
            (c) => +c.id !== selfId && +c.id !== peerId,
          ),
        ).map((c) => ({
          value: c.id,
          label: c.name,
          group: 'colleague' as const,
        }));
        setCcOptions([...providerOpts, ...peerOpts, ...personnelOpts]);
        setCcCustomerIds(providerOpts.map((o) => +o.value));
        setCcEmails([]);
        ccPrefillKeyRef.current = `cust-col:${peerId}`;
        ccContextKeyRef.current = `cust-col:${peerId}`;
      } else {
        setCcCustomerIds([]);
        setCcEmails([]);
      }
      window.setTimeout(() => focusComposer(), 0);
      return;
    }
    const rowList = threads.length ? threads : (await loadThreads()) || [];

    freshComposeRef.current = true;
    setComposingNew(true);
    setMobileReadingOpen(true);
    setMessages([]);
    clearComposer();
    clearReportLinkContext();
    setCcCustomerIds([]);
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
    setMessageTab(folderToMessageTab(mailFolder));
    setNewMessageOpen(false);
  };

  const canCompose = Boolean(
    isAdmin ? selectedConversation : (isCustomer || isStaff) && activeConversation,
  );
  const canSend = Boolean(draft.trim() || attachUrls.length > 0);
  const canStartConversation = Boolean(
    isAdmin
      ? newMessageCustomerId || newMessageStaffId
      : newMessageAdminId ||
          newMessageColleagueId ||
          (isCustomer && newMessagePersonnelEmail),
  );

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
  const showMessageListPane =
    (!isMobilePortrait && showChatPane) ||
    (isMobilePortrait && hasOpenConversation && !mobileReadingOpen);
  const showReadingPane =
    (!isMobilePortrait && showChatPane) ||
    (isMobilePortrait && hasOpenConversation && mobileReadingOpen);

  const goBackToConversationList = () => {
    setMobileReadingOpen(false);
    setSelectedConversation(null);
    setSearchKeyword('');
    clearReportLinkContext();
    if (reportFaultIdParam || userTaskIdParam) {
      history.replace('/messages');
    }
  };

  const goBackMobileFromReading = () => {
    setMobileReadingOpen(false);
    if (composingNew) {
      freshComposeRef.current = false;
      setComposingNew(false);
    }
  };

  const openMobileReading = () => {
    if (isMobilePortrait) setMobileReadingOpen(true);
  };

  const selectConversation = (t: ThreadRow) => {
    suppressMarkReadRef.current = false;
    freshComposeRef.current = false;
    setComposingNew(false);
    setMobileReadingOpen(false);
    setSelectedMessageId(null);
    if (reportFaultIdParam || userTaskIdParam || consumableDeliveryIdParam) {
      history.replace('/messages');
    }
    clearReportLinkContext();
    clearComposer();
    setSelectedConversation(threadToSelection(t));
    setMessageTab(folderToMessageTab(mailFolder));
  };

  const readingIsColleague =
    !isAdmin && activeConversation?.conversationKind === 'colleague';
  const readingIsPersonnel =
    !isAdmin && activeConversation?.conversationKind === 'personnel';

  // New email / task deep-link: prefer explicit displayName (person) over thread company label.
  // Customer → provider: show brand (SERVICELINK), not the admin login name "Servicelink".
  const readingTitle = isAdmin
    ? selectedConversation?.displayName ||
      selectedThread?.customerName ||
      (selectedConversation ? `User #${selectedConversation.peerId}` : 'Select a conversation')
    : activeConversation?.conversationKind === 'personnel'
      ? activeConversation.displayName ||
        activeConversation.toEmail ||
        'Personnel'
    : activeConversation?.conversationKind === 'admin'
      ? serviceProviderLabel(
          selectedThread?.companyName ||
            selectedConversation?.displayName ||
            serviceProviderOrgName,
        )
      : activeConversation?.displayName ||
        selectedThread?.customerName ||
        `Select a conversation or click ${NEW_MESSAGE_TO_LABEL}`;

  const readingPeerType =
    selectedThread?.peerType || selectedConversation?.peerType || null;
  const readingPeerCompany = selectedThread?.companyName || null;

  const readingRoleTag = isAdmin
    ? readingPeerType
      ? (
          <span
            className={`outlook-thread-role outlook-reading-role${
              readingPeerType === 'staff'
                ? ' outlook-thread-role--staff'
                : ' outlook-thread-role--customer'
            }`}
          >
            {peerRoleLabel(readingPeerType, readingPeerCompany)}
          </span>
        )
      : null
    : activeConversation
      ? (
          <span
            className={`outlook-thread-role outlook-reading-role${
              readingIsColleague
                ? ' outlook-thread-role--colleague'
                : readingIsPersonnel
                  ? ' outlook-thread-role--staff'
                  : ' outlook-thread-role--support'
            }`}
          >
            {/* Same pattern as Colleague: To = name/brand, badge = role. */}
            {readingIsColleague
              ? COLLEAGUE_BADGE_LABEL
              : readingIsPersonnel
                ? PERSONNEL_BADGE_LABEL
                : SERVICE_PROVIDER_ROLE}
          </span>
        )
      : null;

  const readingBadgeTooltip = conversationRoleTooltip(
    activeConversation?.conversationKind ??
      (readingIsColleague
        ? 'colleague'
        : readingIsPersonnel
          ? 'personnel'
          : selectedThread
            ? 'admin'
            : undefined),
    selectedThread
      ? {
          customerName: selectedThread.customerName,
          companyName: selectedThread.companyName,
          roleLabel: selectedThread.roleLabel,
        }
      : {
          customerName: activeConversation?.displayName,
        },
  );

  const readingRoleTagWithTip =
    readingRoleTag && readingBadgeTooltip ? (
      <Tooltip title={readingBadgeTooltip} trigger="click">
        {readingRoleTag}
      </Tooltip>
    ) : (
      readingRoleTag
    );

  const resolveComposerTextArea = (): HTMLTextAreaElement | null => {
    const ref = composerRef.current;
    if (!ref) return null;
    if (ref instanceof HTMLTextAreaElement) return ref;
    const nested =
      ref?.resizableTextArea?.textArea ||
      ref?.textArea ||
      null;
    return nested instanceof HTMLTextAreaElement ? nested : null;
  };

  const focusComposer = () => {
    const shell = composerShellRef.current;
    const textarea = resolveComposerTextArea();
    const scrollTarget = shell || textarea;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (textarea) {
      textarea.classList.add('outlook-composer-flash');
      window.setTimeout(() => textarea.classList.remove('outlook-composer-flash'), 900);
    }
    window.setTimeout(() => resolveComposerTextArea()?.focus(), 0);
  };

  return (
    <Layout title="Messages">
      <div
        className={`messages-page-root messages-outlook${messagesPageDark ? ' messages-page-dark messages-theme-dark' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: isMobilePortrait ? 'auto' : 'calc(100vh - 140px)',
          minHeight: isMobilePortrait ? 480 : 520,
          overflow: 'hidden',
          width: '100%',
          color: ui.text,
        }}
      >
        {showConversationSidebar ? (
          <div className="outlook-mail-topbar">
            <div className="outlook-folder-tabs" role="tablist" aria-label="Mail folders">
              {(
                [
                  // Folder badges = conversations in that folder (list changes with the tab).
                  { key: 'inbox' as MailFolder, label: 'Inbox', count: inboxThreadCount },
                  { key: 'unread' as MailFolder, label: 'Unread', count: unreadThreadCount },
                  { key: 'sent' as MailFolder, label: 'Sent', count: sentThreadCount },
                  { key: 'deleted' as MailFolder, label: 'Deleted', count: deletedThreadCount },
                  { key: 'all' as MailFolder, label: 'All', count: threads.length },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={mailFolder === f.key}
                  className={`outlook-folder-tab outlook-folder-tab--${f.key}${
                    mailFolder === f.key ? ' is-active' : ''
                  }${f.count > 0 ? ' has-count' : ''}`}
                  onClick={() => selectMailFolder(f.key)}
                >
                  <span className="outlook-folder-label">{f.label}</span>
                  {f.count > 0 ? (
                    <span className="outlook-folder-count">{f.count}</span>
                  ) : null}
                </button>
              ))}
              <Button
                type="primary"
                icon={<MailOutlined />}
                onClick={openNewMessage}
                className="outlook-new-email-inline"
              >
                New email
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className={`outlook-main-row${isMobilePortrait ? ' is-mobile' : ''}`}
          style={{
            flexDirection: isMobilePortrait ? 'column' : 'row',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
        {showListPane ? (
          <div
            className="outlook-list-pane"
            style={{
              flex: isMobilePortrait && !hasOpenConversation ? 1 : undefined,
              minHeight: isMobilePortrait ? 320 : undefined,
            }}
          >
            <div className="outlook-message-list-header">
              <div className="outlook-list-pane-title">Conversations</div>
              <div className="outlook-message-sort-group">
                <button
                  type="button"
                  className={`outlook-message-sort${
                    conversationListSort === 'newest' ||
                    conversationListSort === 'oldest'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConversationListSort((prev) => toggleDateSort(prev));
                  }}
                  title={
                    conversationListSort === 'oldest'
                      ? 'Oldest first — click for newest first'
                      : 'Newest first — click for oldest first'
                  }
                >
                  {conversationListSort === 'oldest' ? (
                    <SortAscendingOutlined />
                  ) : (
                    <SortDescendingOutlined />
                  )}
                  <span>
                    {conversationListSort === 'oldest' ? 'Oldest' : 'Newest'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`outlook-message-sort${
                    conversationListSort === 'az' || conversationListSort === 'za'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConversationListSort((prev) => toggleAlphaSort(prev));
                  }}
                  title={
                    conversationListSort === 'za'
                      ? 'Z–A — click for A–Z'
                      : 'A–Z — click for Z–A'
                  }
                >
                  {conversationListSort === 'za' ? (
                    <SortDescendingOutlined />
                  ) : (
                    <SortAscendingOutlined />
                  )}
                  <span>{conversationListSort === 'za' ? 'Z–A' : 'A–Z'}</span>
                </button>
              </div>
            </div>
            <div className="outlook-list-search">
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Search conversations…"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div className="outlook-list-scroll" key={`conv-sort-${conversationListSort}`}>
              {loadingThreads ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : filteredThreads.length === 0 ? (
                <Empty
                  description={
                    debouncedSearch.trim()
                      ? 'No conversations match your search'
                      : mailFolder === 'unread'
                        ? 'No unread conversations'
                        : 'No conversations yet'
                  }
                  style={{ marginTop: 24 }}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                filteredThreads.map((t) => {
                  const selected = conversationMatches(selectedConversation, t);
                  const unread = t.unreadCount > 0;
                  return (
                    <button
                      key={`${t.threadId}-${t.peerId}-${t.conversationKind ?? 'thread'}`}
                      type="button"
                      className={`outlook-thread-row${selected ? ' is-selected' : ''}${unread ? ' is-unread' : ''}`}
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
                    >
                      <div className="outlook-thread-top">
                        <span className="outlook-thread-from">{t.customerName}</span>
                        {t.updatedAt ? (
                          <span className="outlook-thread-time">{formatListDate(t.updatedAt)}</span>
                        ) : null}
                      </div>
                      {t.conversationKind === 'colleague' ||
                      t.conversationKind === 'admin' ? (
                        <Tooltip
                          title={conversationRoleTooltip(t.conversationKind, t)}
                          trigger="click"
                        >
                          <span
                            className={`outlook-thread-role${
                              t.conversationKind === 'colleague'
                                ? ' outlook-thread-role--colleague'
                                : ' outlook-thread-role--support'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.conversationKind === 'colleague'
                              ? COLLEAGUE_BADGE_LABEL
                              : serviceProviderLabel(t.companyName)}
                          </span>
                        </Tooltip>
                      ) : (
                        <span
                          className={`outlook-thread-role${
                            t.peerType === 'staff'
                              ? ' outlook-thread-role--staff'
                              : ' outlook-thread-role--customer'
                          }`}
                        >
                          {peerRoleLabel(t.peerType, t.companyName)}
                        </span>
                      )}
                      {t.lastMessagePreview ? (
                        <span className="outlook-thread-preview">{t.lastMessagePreview}</span>
                      ) : null}
                      <div className="outlook-thread-meta">
                        {unread ? <Badge count={t.unreadCount} style={{ flexShrink: 0 }} /> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {showMessageListPane ? (
          <div
            className="outlook-message-list-pane"
            style={{
              flex: isMobilePortrait ? 1 : undefined,
              minHeight: isMobilePortrait ? 320 : undefined,
            }}
          >
            {isMobilePortrait && hasOpenConversation ? (
              <div className="outlook-mobile-back">
                <Button
                  type="link"
                  icon={<ArrowLeftOutlined />}
                  onClick={goBackToConversationList}
                >
                  Conversations
                </Button>
              </div>
            ) : null}
            <div className="outlook-message-list-header">
              <div className="outlook-list-pane-title">Messages</div>
              <div className="outlook-message-sort-group">
                <button
                  type="button"
                  className={`outlook-message-sort${
                    messageListSort === 'newest' || messageListSort === 'oldest'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMessageListSort((prev) => toggleDateSort(prev));
                  }}
                  title={
                    messageListSort === 'oldest'
                      ? 'Oldest first — click for newest first'
                      : 'Newest first — click for oldest first'
                  }
                >
                  {messageListSort === 'oldest' ? (
                    <SortAscendingOutlined />
                  ) : (
                    <SortDescendingOutlined />
                  )}
                  <span>
                    {messageListSort === 'oldest' ? 'Oldest' : 'Newest'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`outlook-message-sort${
                    messageListSort === 'az' || messageListSort === 'za'
                      ? ' is-active'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMessageListSort((prev) => toggleAlphaSort(prev));
                  }}
                  title={
                    messageListSort === 'za'
                      ? 'Z–A — click for A–Z'
                      : 'A–Z — click for Z–A'
                  }
                >
                  {messageListSort === 'za' ? (
                    <SortDescendingOutlined />
                  ) : (
                    <SortAscendingOutlined />
                  )}
                  <span>{messageListSort === 'za' ? 'Z–A' : 'A–Z'}</span>
                </button>
              </div>
            </div>
            <div className="outlook-message-list-scroll">
              {!hasOpenConversation ? (
                <Empty
                  description="Select a conversation"
                  style={{ marginTop: 32 }}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : loadingMessages ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin />
                </div>
              ) : filteredMessages.length === 0 ? (
                <Empty
                  description={
                    composingNew
                      ? isMobilePortrait
                        ? 'New email — open composer to write, then Send'
                        : 'New email — write on the right, then Send'
                      : 'No messages in this conversation'
                  }
                  style={{ marginTop: 32 }}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                filteredMessages.map((m) => {
                  const active = selectedMessageId != null && +m.id === +selectedMessageId;
                  const fromLabel = m.isMine
                    ? myDisplayName || 'You'
                    : m.senderName?.trim() ||
                      senderRoleLabel(m.senderType, m.senderCompanyName);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`outlook-message-row${active ? ' is-selected' : ''}${
                        m.isMine ? ' is-mine' : ''
                      }`}
                      onClick={() => {
                        setSelectedMessageId(+m.id);
                        setComposingNew(false);
                        freshComposeRef.current = false;
                        // Match composer report context to the message being opened.
                        const linked = extractLinkedReportFromMessage(m);
                        if (linked?.kind === 'fault') {
                          setReportFaultId(linked.id);
                          setUserTaskId(null);
                          setConsumableDeliveryId(null);
                        } else if (linked?.kind === 'task') {
                          setUserTaskId(linked.id);
                          setReportFaultId(null);
                          setConsumableDeliveryId(null);
                        } else if (linked?.kind === 'consumable') {
                          setConsumableDeliveryId(linked.id);
                          setReportFaultId(null);
                          setUserTaskId(null);
                        }
                        openMobileReading();
                      }}
                    >
                      <div className="outlook-message-row-top">
                        <span className="outlook-message-row-from">{fromLabel}</span>
                        <span className="outlook-message-row-time">
                          {formatListDate(m.createdAt || m.created_at)}
                        </span>
                      </div>
                      <span className="outlook-message-row-subject">
                        {messageListSubject(m)}
                      </span>
                      {resolveMessageReportLink(m) ? (
                        <span className="outlook-message-row-meta">Linked report</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {showReadingPane ? (
        <div
          className="outlook-reading messages-page-chat"
          style={{
            flex: isMobilePortrait ? 1 : undefined,
            minHeight: isMobilePortrait ? 420 : undefined,
          }}
        >
          {isMobilePortrait && hasOpenConversation ? (
            <div className="outlook-mobile-back">
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={goBackMobileFromReading}
              >
                Messages
              </Button>
            </div>
          ) : null}

          <div className="outlook-reading-toolbar">
            <Button
              icon={<EyeInvisibleOutlined />}
              disabled={
                messageTab === 'deleted' ||
                (!threadId && !selectedConversation && !selectedThread)
              }
              onClick={() => void markConversationUnread()}
            >
              Mark unread
            </Button>
            {messageTab === 'deleted' && deletedCount > 0 ? (
              <>
                <Button
                  icon={<UndoOutlined />}
                  disabled={filteredMessages.length === 0}
                  loading={messageActionId != null}
                  onClick={() => void restoreSelectedDeletedMessage()}
                >
                  Restore
                </Button>
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
              </>
            ) : (
              <Popconfirm
                title="Move the latest message to Deleted?"
                okText="Delete"
                cancelText="Cancel"
                disabled={messageTab === 'deleted' || filteredMessages.length === 0}
                onConfirm={() => void deleteLatestMessage()}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={messageTab === 'deleted' || filteredMessages.length === 0}
                  loading={messageActionId != null}
                >
                  Delete
                </Button>
              </Popconfirm>
            )}
          </div>

          <div className="outlook-reading-meta">
            <h2 className="outlook-reading-heading outlook-reading-to">
              {canEditToRecipient ? (
                <>
                  <span className="outlook-reading-to-label">To</span>
                  <Select
                    className="outlook-reading-to-select"
                    showSearch
                    allowClear={false}
                    placeholder="Choose who to message…"
                    style={{ flex: 1, minWidth: 220, maxWidth: 480 }}
                    value={toSelectValue}
                    options={toRecipientOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const q = String(input || '').trim().toLowerCase();
                      if (!q) return true;
                      const search = String(
                        (option as { search?: string; label?: string })?.search ||
                          option?.label ||
                          '',
                      ).toLowerCase();
                      return search.includes(q);
                    }}
                    onChange={(v) => void applyToRecipient(v != null ? String(v) : null)}
                    onBlur={(e) => {
                      const typed = String(
                        (e.target as HTMLInputElement)?.value || '',
                      ).trim();
                      if (typed.includes('@')) void applyToRecipient(typed);
                    }}
                    notFoundContent="No matching contact — type a full email"
                  />
                  {readingRoleTagWithTip}
                </>
              ) : hasOpenConversation ? (
                <>
                  <span className="outlook-reading-to-label">To</span>
                  <span className="outlook-reading-title-text">{readingTitle}</span>
                  {readingRoleTagWithTip}
                </>
              ) : (
                <span className="outlook-reading-title-text">{readingTitle}</span>
              )}
            </h2>
            <div className="outlook-reading-fromline">
              <div>
                {selectedThread?.companyName || selectedThread?.customerName ? (
                  <div className="muted">
                    {selectedThread?.companyName
                      ? `Org: ${selectedThread.companyName}`
                      : null}
                  </div>
                ) : null}
              </div>
              {selectedThread?.updatedAt ? (
                <div className="muted">{formatMessageTimestamp(selectedThread.updatedAt)}</div>
              ) : null}
            </div>
            {isAdmin && hasLinkedReport ? (
              <div className="outlook-reading-banner">
                {`Replying about ${linkedItemLabel}`}
                {activeReportHref ? (
                  <>
                    {' — '}
                    <Link to={activeReportHref}>
                      {activeConsumableDeliveryId ? 'Open delivery' : 'Open report'}
                    </Link>
                  </>
                ) : null}
                {' — messaging '}
                {selectedConversation?.peerType === 'staff'
                  ? selectedConversation.displayName || 'staff'
                  : 'customer'}
                . Replies stay linked
                {activeConsumableDeliveryId ? ' to this delivery' : ' to this report'}.
                Colleagues are Cc&apos;d automatically.
              </div>
            ) : null}
            {isCustomer &&
            activeConversation?.conversationKind === 'admin' &&
            hasLinkedReport ? (
              <div className="outlook-reading-banner">
                {`Replying about ${linkedItemLabel}`}
                {activeReportHref ? (
                  <>
                    {' — '}
                    <Link to={activeReportHref}>
                      {activeConsumableDeliveryId ? 'Open delivery' : 'Open report'}
                    </Link>
                  </>
                ) : null}
                . Replies stay linked
                {activeConsumableDeliveryId ? ' to this delivery' : ' to this report'}.
                Colleagues are Cc&apos;d automatically.
              </div>
            ) : null}
          </div>

          <div className="outlook-reading-body">
            <div className="outlook-reading-card">
              {canCompose && messageTab !== 'deleted' ? (
                <div className="messages-page-composer outlook-reading-card-compose">
                  {showCcComposer ? (
                    <div
                      className={`outlook-reading-card-cc${
                        ccDropdownOpen ? ' is-open' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      title="Click to choose people to Cc"
                      onClick={() => {
                        if (!loadingCc) setCcDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (loadingCc) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCcDropdownOpen(true);
                        }
                      }}
                    >
                      <div className="outlook-reading-card-cc-row">
                        <button
                          type="button"
                          className="outlook-cc-label-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loadingCc) setCcDropdownOpen((open) => !open);
                          }}
                        >
                          Cc
                          <DownOutlined
                            className={`outlook-cc-chevron${
                              ccDropdownOpen ? ' is-open' : ''
                            }`}
                          />
                        </button>
                        {loadingCc ? (
                          <Spin size="small" />
                        ) : (
                          <Select
                            mode="tags"
                            size="small"
                            style={{ flex: 1, minWidth: 180 }}
                            placeholder="Click to choose Cc…"
                            value={ccSelectValue}
                            open={ccDropdownOpen}
                            onDropdownVisibleChange={(open) => {
                              setCcDropdownOpen(open);
                              if (!open) setCcDropdownSearch('');
                            }}
                            onChange={onCcSelectChange}
                            tokenSeparators={[',', ';']}
                            showSearch={false}
                            allowClear
                            listHeight={320}
                            dropdownMatchSelectWidth={false}
                            dropdownStyle={{ minWidth: 280 }}
                            getPopupContainer={() => document.body}
                            filterOption={false}
                            notFoundContent={null}
                            tagRender={(props) => {
                              const { value, closable, onClose } = props;
                              const label =
                                ccLabelByValue.get(String(value)) || String(value);
                              return (
                                <span className="ant-select-selection-item">
                                  <span className="ant-select-selection-item-content">
                                    {label}
                                  </span>
                                  {closable ? (
                                    <span
                                      className="ant-select-selection-item-remove"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onClose?.();
                                      }}
                                    >
                                      ×
                                    </span>
                                  ) : null}
                                </span>
                              );
                            }}
                            dropdownRender={() => (
                              <div
                                className="outlook-cc-dropdown"
                                onMouseDown={(e) => {
                                  // Keep Select open while toggling checkboxes.
                                  e.preventDefault();
                                }}
                              >
                                <Input
                                  size="small"
                                  allowClear
                                  placeholder="Search or type an email…"
                                  value={ccDropdownSearch}
                                  onChange={(e) => setCcDropdownSearch(e.target.value)}
                                  onPressEnter={(e) => {
                                    e.preventDefault();
                                    const token = ccDropdownSearch.trim();
                                    if (!isCcEmailToken(token)) return;
                                    const email = token.toLowerCase();
                                    setCcEmails((prev) =>
                                      prev.includes(email) ? prev : [...prev, email],
                                    );
                                    setCcDropdownSearch('');
                                  }}
                                  style={{ marginBottom: 8 }}
                                />
                                {ccSelectOptions.length === 0 ? (
                                  <div className="outlook-cc-dropdown-empty">
                                    {ccDropdownSearch.trim()
                                      ? isCcEmailToken(ccDropdownSearch.trim())
                                        ? 'Press Enter to add this email'
                                        : 'No matches'
                                      : 'No people available to Cc'}
                                  </div>
                                ) : (
                                  ccSelectOptions.map((group) => (
                                    <div
                                      key={group.label}
                                      className="outlook-cc-dropdown-group"
                                    >
                                      <div className="outlook-cc-dropdown-group-title">
                                        {group.label}
                                      </div>
                                      {group.options.map((opt) => (
                                        <label
                                          key={opt.value}
                                          className="outlook-cc-dropdown-item"
                                        >
                                          <Checkbox
                                            checked={isCcPickSelected(opt.raw)}
                                            onChange={() => toggleCcPick(opt.raw)}
                                          />
                                          <span>{opt.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          >
                            {/* Keep Option nodes so tags resolve names when closed. */}
                            {ccOptions.map((o) => (
                              <Select.Option
                                key={String(o.value)}
                                value={String(o.value)}
                                label={ccPeerShortName(o.label)}
                              >
                                {ccPeerShortName(o.label)}
                              </Select.Option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div className="outlook-composer-shell" ref={composerShellRef}>
                    <span className="outlook-composer-label">
                      {composingNew ? 'New message' : 'Reply'}
                    </span>
                    <TextArea
                      ref={composerRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        composingNew ? 'Write your new email…' : 'Type your message…'
                      }
                      autoSize={{ minRows: 4, maxRows: 10 }}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault();
                          if (canSend) sendMessage();
                        }
                      }}
                    />
                    <div className="outlook-composer-toolbar">
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
                        <Button icon={<PaperClipOutlined />}>Attach</Button>
                      </Upload>
                      <span style={{ flex: 1 }} />
                      {hasLinkedReport ? (
                        <Button
                          block={isMobilePortrait}
                          onClick={() => {
                            clearReportLinkContext();
                            history.replace('/messages');
                          }}
                        >
                          {activeConsumableDeliveryId
                            ? 'Clear delivery link'
                            : 'Clear report link'}
                        </Button>
                      ) : null}
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
                </div>
              ) : null}

              <div
                ref={scrollRef}
                className="outlook-reading-scroll outlook-reading-card-message"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: isMobilePortrait ? 240 : undefined,
                }}
              >
                {!hasOpenConversation ? (
                  <Empty
                    description="Select a conversation, then a message"
                    style={{ marginTop: 48 }}
                  />
                ) : loadingMessages ? (
                  <div style={{ textAlign: 'center', paddingTop: 48 }}>
                    <Spin />
                  </div>
                ) : !selectedMessage ? (
                  <Empty
                    description={
                      composingNew
                        ? 'New email — write above and Send'
                        : filteredMessages.length
                          ? isMobilePortrait
                            ? 'Go back to Messages and pick one'
                            : 'Select a message from the middle list'
                          : 'No messages yet — type above to send'
                    }
                    style={{ marginTop: 48 }}
                  />
                ) : (
                  <MessageBubble
                    key={selectedMessage.id}
                    msg={selectedMessage}
                    myDisplayName={myDisplayName}
                    peerDisplayName={
                      isAdmin
                        ? selectedThread?.customerName
                        : activeConversation?.displayName || selectedThread?.customerName
                    }
                    supportOrgLabel={
                      selectedThread?.conversationKind === 'admin'
                        ? selectedThread.companyName
                        : serviceProviderOrgName
                    }
                    darkMode={messagesPageDark}
                    isDeletedTab={messageTab === 'deleted'}
                    onDelete={messageTab === 'deleted' ? undefined : softDeleteMessage}
                    onRestore={messageTab === 'deleted' ? restoreMessage : undefined}
                    actionLoading={messageActionId === selectedMessage.id}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        ) : null}
        </div>
      </div>

      <Modal
        className={`outlook-new-message-modal${
          messagesPageDark ? ' outlook-new-message-modal--dark' : ''
        }`}
        title={<NewMessageToHeading />}
        open={newMessageOpen}
        onCancel={() => {
          setNewMessageOpen(false);
          // Cancelled before starting — restore the open conversation history.
          if (selectedConversation || activeConversation) {
            freshComposeRef.current = false;
            setComposingNew(false);
            void loadMessages();
          }
        }}
        onOk={startNewConversation}
        okText="Start conversation"
        okButtonProps={{
          disabled: !canStartConversation,
          className: 'outlook-new-message-ok',
        }}
        style={isMobilePortrait ? { top: 16, maxWidth: 'calc(100vw - 16px)' } : undefined}
        width={isMobilePortrait ? '100%' : 560}
      >
        {isCustomer || isStaff ? (
          <div className="outlook-new-message-body">
            <p className="outlook-new-message-lead">Who do you want to message?</p>
            <div className="outlook-new-message-cards">
              <button
                type="button"
                className={`outlook-new-message-card${
                  newMessageTarget === 'provider' ? ' is-active' : ''
                }`}
                onClick={() => {
                  setNewMessageTarget('provider');
                  setNewMessageColleagueId(null);
                  setNewMessagePersonnelEmail(null);
                  setNewMessageAdminId(firstOptionIdAz(adminRecipientOptions));
                }}
              >
                <span className="outlook-new-message-card-icon">
                  <CustomerServiceOutlined />
                </span>
                <span className="outlook-new-message-card-text">
                  <strong>Service provider</strong>
                  <span>Help from Servicelink</span>
                </span>
              </button>
              <button
                type="button"
                className={`outlook-new-message-card${
                  newMessageTarget === 'colleague' ? ' is-active' : ''
                }`}
                onClick={() => {
                  setNewMessageTarget('colleague');
                  setNewMessageAdminId(null);
                  setNewMessagePersonnelEmail(null);
                  setNewMessageColleagueId(firstOptionIdAz(colleagueRecipientOptions));
                }}
              >
                <span className="outlook-new-message-card-icon">
                  <TeamOutlined />
                </span>
                <span className="outlook-new-message-card-text">
                  <strong>Colleague</strong>
                  <span>Someone at your organisation</span>
                </span>
              </button>
              {isCustomer && personnelCcOptions.length > 0 ? (
                <button
                  type="button"
                  className={`outlook-new-message-card${
                    newMessageTarget === 'personnel' ? ' is-active' : ''
                  }`}
                  onClick={() => {
                    setNewMessageTarget('personnel');
                    setNewMessageAdminId(null);
                    setNewMessageColleagueId(null);
                    const first = [...personnelCcOptions].sort((a, b) =>
                      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
                    )[0];
                    setNewMessagePersonnelEmail(first?.email ?? null);
                  }}
                >
                  <span className="outlook-new-message-card-icon">
                    <UserOutlined />
                  </span>
                  <span className="outlook-new-message-card-text">
                    <strong>Personnel</strong>
                    <span>Email your own personnel</span>
                  </span>
                </button>
              ) : null}
            </div>
            {newMessageTarget === 'provider' ? (
              <div className="outlook-new-message-pick">
                <label className="outlook-new-message-label">Choose a service provider</label>
                <Select
                  showSearch
                  allowClear={false}
                  autoFocus
                  placeholder="Search or select…"
                  style={{ width: '100%' }}
                  size="large"
                  loading={loadingRecipients}
                  value={newMessageAdminId ?? undefined}
                  onChange={(v) => setNewMessageAdminId(v ?? null)}
                  optionFilterProp="label"
                  options={
                    newMessageAdminId || adminRecipientOptions[0]
                      ? [
                          {
                            value:
                              newMessageAdminId ??
                              firstOptionIdAz(adminRecipientOptions) ??
                              adminRecipientOptions[0].id,
                            // Same idea as colleague name: show the party name (ServiceLink brand).
                            label: serviceProviderLabel(serviceProviderOrgName),
                          },
                        ]
                      : []
                  }
                />
              </div>
            ) : null}
            {newMessageTarget === 'colleague' ? (
              <div className="outlook-new-message-pick">
                <label className="outlook-new-message-label">Choose a colleague</label>
                <Select
                  showSearch
                  allowClear
                  autoFocus
                  placeholder="Search or select…"
                  style={{ width: '100%' }}
                  size="large"
                  loading={loadingRecipients}
                  value={newMessageColleagueId ?? undefined}
                  onChange={(v) => setNewMessageColleagueId(v ?? null)}
                  optionFilterProp="label"
                  options={colleagueRecipientOptions.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
            ) : null}
            {newMessageTarget === 'personnel' ? (
              <div className="outlook-new-message-pick">
                <label className="outlook-new-message-label">Choose personnel</label>
                <Select
                  showSearch
                  allowClear
                  autoFocus
                  placeholder="Search or select…"
                  style={{ width: '100%' }}
                  size="large"
                  value={newMessagePersonnelEmail ?? undefined}
                  onChange={(v) => setNewMessagePersonnelEmail(v ?? null)}
                  optionFilterProp="label"
                  options={personnelCcOptions.map((p) => ({
                    value: p.email,
                    label: `${p.name} <${p.email}>`,
                  }))}
                />
              </div>
            ) : null}
            {!newMessageTarget ? (
              <p className="outlook-new-message-hint">
                Select a type above, then pick the person.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="outlook-new-message-body">
            <p className="outlook-new-message-lead">Who do you want to message?</p>
            <div className="outlook-new-message-cards">
              <button
                type="button"
                className={`outlook-new-message-card${
                  newMessageTarget === 'customer' ? ' is-active' : ''
                }`}
                onClick={() => {
                  setNewMessageTarget('customer');
                  setNewMessageStaffId(null);
                  setNewMessageCustomerId(firstOptionIdAz(customerOptions));
                }}
              >
                <span className="outlook-new-message-card-icon">
                  <UserOutlined />
                </span>
                <span className="outlook-new-message-card-text">
                  <strong>Customer</strong>
                  <span>Message a customer contact</span>
                </span>
              </button>
              <button
                type="button"
                className={`outlook-new-message-card${
                  newMessageTarget === 'staff' ? ' is-active' : ''
                }`}
                onClick={() => {
                  setNewMessageTarget('staff');
                  setNewMessageCustomerId(null);
                  setNewMessageStaffId(firstOptionIdAz(staffOptions));
                }}
              >
                <span className="outlook-new-message-card-icon">
                  <TeamOutlined />
                </span>
                <span className="outlook-new-message-card-text">
                  <strong>Staff</strong>
                  <span>Message a field staff member</span>
                </span>
              </button>
            </div>
            {newMessageTarget === 'customer' ? (
              <div className="outlook-new-message-pick">
                <label className="outlook-new-message-label">Choose a customer</label>
                <Select
                  showSearch
                  allowClear
                  autoFocus
                  placeholder="Search or select…"
                  style={{ width: '100%' }}
                  size="large"
                  loading={loadingRecipients}
                  value={newMessageCustomerId ?? undefined}
                  onChange={(v) => setNewMessageCustomerId(v ?? null)}
                  optionFilterProp="label"
                  options={customerOptions.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
            ) : null}
            {newMessageTarget === 'staff' ? (
              <div className="outlook-new-message-pick">
                <label className="outlook-new-message-label">Choose a staff member</label>
                <Select
                  showSearch
                  allowClear
                  autoFocus
                  placeholder="Search or select…"
                  style={{ width: '100%' }}
                  size="large"
                  loading={loadingRecipients}
                  value={newMessageStaffId ?? undefined}
                  onChange={(v) => setNewMessageStaffId(v ?? null)}
                  optionFilterProp="label"
                  options={staffOptions.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </div>
            ) : null}
            {!newMessageTarget ? (
              <p className="outlook-new-message-hint">Select a type above, then pick the person.</p>
            ) : null}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default MessagesPage;
