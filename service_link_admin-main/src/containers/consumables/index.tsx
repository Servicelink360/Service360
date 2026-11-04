import Layout from '@app/components/layout/Layout';
import { dateTimeFormat } from '@app/config/data.config';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  PlusOutlined,
  SendOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Link, useHistory, useLocation } from 'react-router-dom';
import {
  Alert,
  AutoComplete,
  Button,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync, callAPIUploadAsync } from '../../library/helpers/api';
import EmailTemplateEditor from './EmailTemplateEditor';
import './consumables.css';

type ConsumableRow = {
  id: number;
  name: string;
  category?: string | null;
  stockCode?: string | null;
  unit: string;
  description?: string | null;
  isActive: boolean;
};

type SupplierRow = {
  id: number;
  companyId?: number | null;
  name: string;
  category?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive: boolean;
};

type CompanyOption = {
  id: number;
  name?: string;
  companyName?: string;
};

type DeliveryItem = {
  consumableId?: number | null;
  name: string;
  stockCode?: string | null;
  unit: string;
  quantity: number;
};

type DeliveryEvent = {
  id: number;
  action: string;
  emailedTo?: string | null;
  emailedCc?: string | null;
  detail?: string | null;
  createdAt: string;
  actorName?: string;
};

type DeliveryRow = {
  id: number;
  customerId?: number | null;
  supplierId?: number | null;
  companyId?: number | null;
  customerName: string;
  companyName: string;
  siteName?: string;
  subject: string;
  notes?: string | null;
  itemsJson: string;
  items?: DeliveryItem[];
  emailedTo?: string | null;
  emailedCc?: string | null;
  emailedAt?: string | null;
  emailStatus: string;
  emailError?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  /** Customer portal: brand sender (e.g. SERVICELINK). */
  fromLabel?: string | null;
  fromSender?: string | null;
  createdUser?: { fullName?: string; username?: string };
  events?: DeliveryEvent[];
};

type CustomerOption = {
  id: number;
  label: string;
  email?: string;
  companyName?: string;
  companyId?: number | null;
};

type SiteOption = {
  id: number;
  name: string;
  customerIds: number[];
};

type EmailSettings = {
  logoUrl?: string | null;
  logoWidth?: number | null;
  logoHeight?: number | null;
  headingText?: string | null;
  introText?: string | null;
  closingText?: string | null;
  signatureHtml?: string | null;
  bodyHtml?: string | null;
};

type ConfirmSendPreview = {
  supplierLabel: string;
  siteName: string;
  emailTo: string;
  emailCc: string;
  subject: string;
  itemCount: number;
  items: Array<{ name: string; quantity: number; unit: string }>;
};

type PartyContact = {
  userId: number | null;
  email: string;
  label: string;
  canDelete: boolean;
};

function parseItems(raw: string | null | undefined): DeliveryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function deliveryItems(row: DeliveryRow | null | undefined): DeliveryItem[] {
  if (!row) return [];
  if (Array.isArray(row.items) && row.items.length) return row.items;
  return parseItems(row.itemsJson);
}

function eventActionLabel(action: string) {
  switch (action) {
    case 'created':
      return 'Created';
    case 'updated':
      return 'Edited';
    case 'send_ok':
      return 'Sent';
    case 'send_failed':
      return 'Send failed';
    case 'deleted':
      return 'Deleted';
    case 'restored':
      return 'Restored';
    default:
      return action;
  }
}

function sanitizeText(value: unknown) {
  return String(value || '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ConsumablesPage() {
  const routerHistory = useHistory();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const fromMessages = searchParams.get('from') === 'messages';
  const deliveryIdParam = Number(searchParams.get('deliveryId') || 0);
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const isAdmin = +profile?.type === userType.ADMIN;
  const isCustomer = +profile?.type === userType.CUSTOMER;

  const [tab, setTab] = useState('order');
  const [historyListTab, setHistoryListTab] = useState<'active' | 'deleted'>('active');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<ConsumableRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [history, setHistory] = useState<DeliveryRow[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedPartyKey, setSelectedPartyKey] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState<ConsumableRow | null>(null);
  const [catalogForm] = Form.useForm();
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [supplierCategoryDropdownOpen, setSupplierCategoryDropdownOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const watchedCategory = Form.useWatch('category', catalogForm);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [supplierForm] = Form.useForm();
  const watchedSupplierCategory = Form.useWatch('category', supplierForm);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [manageContactsOpen, setManageContactsOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [companyCustomerOptions, setCompanyCustomerOptions] = useState<
    Array<{
      id: number;
      label: string;
      email: string;
      phone?: string;
      position?: string;
      landLine?: string;
      linked?: boolean;
    }>
  >([]);
  const [selectedCompanyCustomerIds, setSelectedCompanyCustomerIds] = useState<number[]>([]);
  const [contactForm] = Form.useForm();
  const [sendForm] = Form.useForm();
  const [lineItems, setLineItems] = useState<DeliveryItem[]>([]);
  const [catalogPick, setCatalogPick] = useState<number | null>(null);
  const [catalogPickKey, setCatalogPickKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [partyContacts, setPartyContacts] = useState<PartyContact[]>([]);
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [catalogShowDeleted, setCatalogShowDeleted] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [viewDelivery, setViewDelivery] = useState<DeliveryRow | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPreview, setConfirmPreview] = useState<ConfirmSendPreview | null>(null);
  const [emailForm] = Form.useForm();
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({});
  const [emailSaving, setEmailSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const loadCatalog = useCallback(async (opts?: { keyword?: string; includeDeleted?: boolean }) => {
    const keyword = opts?.keyword != null ? opts.keyword : catalogKeyword;
    const includeDeleted = opts?.includeDeleted != null ? opts.includeDeleted : catalogShowDeleted;
    const res = await callAPIAsync(serviceType.COMMON, endPoint.CONSUMABLES, 'GET', {
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      ...(includeDeleted ? { includeDeleted: '1' } : {}),
      ...(!includeDeleted ? { activeOnly: '0' } : {}),
    });
    if (res?.code === 1) setCatalog(res.data?.rows || []);
  }, [catalogKeyword, catalogShowDeleted]);

  const loadSuppliers = useCallback(async (opts?: { keyword?: string }) => {
    const keyword = opts?.keyword != null ? opts.keyword : supplierKeyword;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/suppliers`,
      'GET',
      keyword.trim() ? { keyword: keyword.trim() } : {},
    );
    if (res?.code === 1) setSuppliers(res.data?.rows || []);
  }, [supplierKeyword]);

  const companyLabel = (c: CompanyOption) =>
    String(c.companyName || c.name || '').trim() || `Company #${c.id}`;

  const loadCompanies = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.COMPANIES}/options`,
      'GET',
      {},
    );
    if (res?.code === 1 && Array.isArray(res.data)) {
      setCompanies(res.data);
    } else {
      setCompanies([]);
    }
  }, []);

  const companyOptions = useMemo(
    () =>
      companies
        .slice()
        .sort((a, b) => companyLabel(a).localeCompare(companyLabel(b)))
        .map((c) => ({ value: +c.id, label: companyLabel(c) })),
    [companies],
  );

  const loadHistory = useCallback(async (listTab?: 'active' | 'deleted', keywordOverride?: string) => {
    const tabKey = listTab || historyListTab;
    const keyword = keywordOverride != null ? keywordOverride : historyKeyword;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/list`,
      'GET',
      {
        limit: 100,
        page: 1,
        ...(tabKey === 'deleted' ? { deleted: '1' } : {}),
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      },
    );
    if (res?.code === 1) {
      setHistory(res.data?.rows || []);
      setDeletedCount(Number(res.data?.deletedCount || 0));
    }
    return res;
  }, [historyListTab, historyKeyword]);

  const loadCustomers = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
      type: userType.CUSTOMER,
      limit: 2000,
      page: 1,
      orderBy: 'fullName',
      orderValue: 'ASC',
    });
    if (res?.code !== 1) return;
    const rows = res.data?.rows || [];
    setCustomers(
      rows.map((u: any) => {
        const company = sanitizeText(
          u.customerInfo?.company?.name ||
            u.customerInfo?.companyName ||
            u.companyName ||
            '',
        );
        const name = sanitizeText(u.fullName || u.username || `Customer #${u.id}`);
        const companyId =
          u.customerInfo?.companyId != null
            ? +u.customerInfo.companyId
            : u.customerInfo?.company?.id != null
              ? +u.customerInfo.company.id
              : null;
        return {
          id: +u.id,
          label: name,
          email: String(u.email || u.customerInfo?.companyEmail || '').trim(),
          companyName: company,
          companyId: companyId && companyId > 0 ? companyId : null,
        };
      }),
    );
  }, []);

  const loadSites = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getSites`, 'GET', {});
    const list = Array.isArray(res?.data) ? res.data : [];
    setSites(
      list
        .map((s: any) => ({
          id: +s.id,
          name: sanitizeText(s.name || ''),
          customerIds: Array.isArray(s.customerIds)
            ? s.customerIds.map((id: unknown) => +id).filter((id: number) => id > 0)
            : [],
        }))
        .filter((s: SiteOption) => s.id && s.name),
    );
  }, []);

  const stripEmailTokens = (html: string) =>
    String(html || '')
      .replace(/\{\{\s*logo\s*\}\}/gi, '')
      .replace(/\{\{\s*itemsTable\s*\}\}/gi, '');

  const loadEmailSettings = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/email-settings`,
      'GET',
      {},
    );
    if (res?.code !== 1 || !res.data) return;
    const data = res.data as EmailSettings;
    setEmailSettings(data);
    emailForm.setFieldsValue({
      logoUrl: data.logoUrl || '',
      logoWidth: Math.min(400, Math.max(40, Number(data.logoWidth) || 140)),
      logoHeight: Math.min(400, Math.max(24, Number(data.logoHeight) || 72)),
      headingText: stripEmailTokens(data.headingText || '') || '<p>Consumables delivery</p>',
      introText: stripEmailTokens(data.introText || ''),
      closingText: stripEmailTokens(data.closingText || ''),
      signatureHtml: stripEmailTokens(data.signatureHtml || ''),
    });
  }, [emailForm]);

  useEffect(() => {
    if (isCustomer) {
      setTab('history');
      setLoading(true);
      loadHistory('active').finally(() => setLoading(false));
      return;
    }
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      loadCatalog(),
      loadSuppliers(),
      loadCompanies(),
      loadHistory(),
      loadCustomers(),
      loadSites(),
      loadEmailSettings(),
    ]).finally(() => setLoading(false));
  }, [
    isAdmin,
    isCustomer,
    loadCatalog,
    loadSuppliers,
    loadCompanies,
    loadHistory,
    loadCustomers,
    loadSites,
    loadEmailSettings,
  ]);

  // Open delivery from messages "Open delivery" deep-link.
  useEffect(() => {
    if (!Number.isFinite(deliveryIdParam) || deliveryIdParam <= 0) return;
    if (viewDelivery?.id === deliveryIdParam) return;
    let cancelled = false;
    void (async () => {
      setTab('history');
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.CONSUMABLES}/deliveries/${deliveryIdParam}`,
        'GET',
        {},
      );
      if (cancelled) return;
      if (res?.code === 1 && res.data) {
        setViewDelivery(res.data);
        return;
      }
      const match = history.find((row) => +row.id === +deliveryIdParam);
      if (match) setViewDelivery(match);
    })();
    return () => {
      cancelled = true;
    };
  }, [deliveryIdParam, viewDelivery?.id, history]);

  const goBackToMessages = () => routerHistory.push('/messages');

  const backToMessagesButton = fromMessages ? (
    <button
      type="button"
      onClick={goBackToMessages}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        margin: '0 0 12px',
        padding: '8px 12px',
        border: '1px solid #d9e8d4',
        borderRadius: 8,
        background: '#e8f5e3',
        color: '#2f6b22',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.2,
        cursor: 'pointer',
      }}
    >
      <ArrowLeftOutlined style={{ fontSize: 12 }} />
      <span>Back to messages</span>
    </button>
  ) : null;

  const watchedPartyKey = Form.useWatch('partyKey', sendForm);
  const watchedSiteName = Form.useWatch('siteName', sendForm);
  const watchedEmailTo = Form.useWatch('emailTo', sendForm);
  const watchedEmailCc = Form.useWatch('emailCc', sendForm);

  useEffect(() => {
    setSelectedPartyKey(watchedPartyKey ? String(watchedPartyKey) : null);
  }, [watchedPartyKey]);

  const emailToSet = useMemo(() => {
    const list = Array.isArray(watchedEmailTo)
      ? watchedEmailTo
      : String(watchedEmailTo || '')
          .split(/[;,]+/)
          .map((e) => e.trim())
          .filter(Boolean);
    return new Set(list.map((e) => String(e).trim().toLowerCase()).filter(Boolean));
  }, [watchedEmailTo]);

  // Keep CC free of anyone already in To (avoids duplicate delivery).
  useEffect(() => {
    if (!emailToSet.size) return;
    const raw = watchedEmailCc;
    const list = Array.isArray(raw)
      ? raw.map((e) => String(e || '').trim()).filter(Boolean)
      : String(raw || '')
          .split(/[;,]+/)
          .map((e) => e.trim())
          .filter(Boolean);
    const next = list.filter((e) => !emailToSet.has(e.toLowerCase()));
    if (next.length !== list.length) {
      sendForm.setFieldsValue({ emailCc: next });
    }
  }, [emailToSet, watchedEmailCc, sendForm]);

  const activeSuppliers = useMemo(
    () => suppliers.filter((row) => row.isActive !== false),
    [suppliers],
  );

  const partyCompanyId = useMemo(() => {
    const key = selectedPartyKey || '';
    if (key.startsWith('company:')) return +key.slice('company:'.length) || null;
    if (key.startsWith('supplier:')) {
      const id = +key.slice('supplier:'.length);
      const supplier = activeSuppliers.find((s) => s.id === id);
      return supplier?.companyId ? +supplier.companyId : null;
    }
    return null;
  }, [selectedPartyKey, activeSuppliers]);

  const siteOptions = useMemo(() => {
    const currentSite = String(watchedSiteName || '').trim();
    const partyCustomerIds = new Set(
      customers
        .filter((c) => partyCompanyId && c.companyId === partyCompanyId)
        .map((c) => c.id),
    );
    let filtered = sites;
    if (partyCompanyId && partyCustomerIds.size) {
      filtered = sites.filter((s) => s.customerIds.some((id) => partyCustomerIds.has(id)));
      if (!filtered.length) filtered = sites;
    }
    const options = filtered.map((s) => ({ value: s.name, label: s.name }));
    if (currentSite && !options.some((o) => o.value === currentSite)) {
      options.unshift({ value: currentSite, label: currentSite });
    }
    return options;
  }, [sites, watchedSiteName, customers, partyCompanyId]);

  const supplierCompanyIds = useMemo(() => {
    const ids = new Set<number>();
    activeSuppliers.forEach((s) => {
      if (s.companyId && +s.companyId > 0) ids.add(+s.companyId);
    });
    return ids;
  }, [activeSuppliers]);

  const partyOptions = useMemo(() => {
    const supplierOpts = activeSuppliers.map((row) => ({
      value: `supplier:${row.id}`,
      label: row.name,
    }));
    const clientOpts = companies
      .filter((c) => !supplierCompanyIds.has(+c.id))
      .map((c) => ({
        value: `company:${c.id}`,
        label: companyLabel(c),
      }));
    const groups: Array<{ label: string; options: Array<{ value: string; label: string }> }> = [];
    if (supplierOpts.length) groups.push({ label: 'Suppliers', options: supplierOpts });
    if (clientOpts.length) groups.push({ label: 'Client companies', options: clientOpts });
    return groups;
  }, [activeSuppliers, companies, supplierCompanyIds]);

  const loadPartyContacts = useCallback(async (partyKey?: string | null) => {
    const key = partyKey != null ? partyKey : selectedPartyKey;
    if (!key) {
      setPartyContacts([]);
      return;
    }
    const contacts: PartyContact[] = [];
    const pushContact = (
      email: string,
      label: string,
      userId: number | null,
      canDelete: boolean,
    ) => {
      const e = String(email || '').trim();
      if (!e || contacts.some((o) => o.email.toLowerCase() === e.toLowerCase())) return;
      contacts.push({ email: e, label, userId, canDelete: canDelete && !!userId });
    };

    const params: Record<string, string | number> = {};
    if (key.startsWith('supplier:')) {
      const id = +key.slice('supplier:'.length);
      const supplier = activeSuppliers.find((s) => s.id === id);
      if (supplier?.email) pushContact(supplier.email, supplier.name, null, false);
      params.supplierId = id;
    } else if (key.startsWith('company:')) {
      params.companyId = +key.slice('company:'.length);
    }

    if (params.companyId || params.supplierId) {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.CONSUMABLES}/contacts`,
        'GET',
        params,
      );
      if (res?.code === 1) {
        (res.data?.rows || []).forEach((row: any) => {
          pushContact(row.email, row.label || row.email, +row.id, true);
        });
      }
    }
    setPartyContacts(contacts);
  }, [selectedPartyKey, activeSuppliers]);

  useEffect(() => {
    void loadPartyContacts(selectedPartyKey);
  }, [selectedPartyKey, loadPartyContacts]);

  const removeContactFromForm = (email: string) => {
    const drop = (field: 'emailTo' | 'emailCc') => {
      const raw = sendForm.getFieldValue(field);
      const list = Array.isArray(raw)
        ? raw.map((e) => String(e || '').trim()).filter(Boolean)
        : String(raw || '')
            .split(/[;,]+/)
            .map((e) => e.trim())
            .filter(Boolean);
      sendForm.setFieldsValue({
        [field]: list.filter((e) => e.toLowerCase() !== email.toLowerCase()),
      });
    };
    drop('emailTo');
    drop('emailCc');
  };

  const deleteContactPerson = async (userId: number, email: string, name: string) => {
    const key = selectedPartyKey || '';
    const params: Record<string, string | number> = {};
    if (key.startsWith('supplier:')) params.supplierId = +key.slice('supplier:'.length);
    else if (key.startsWith('company:')) params.companyId = +key.slice('company:'.length);
    else if (partyCompanyId) params.companyId = partyCompanyId;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/contacts/${userId}`,
      'DELETE',
      params,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not remove contact');
      return;
    }
    message.success(res?.message || `${name || email} removed from contacts`);
    removeContactFromForm(email);
    await Promise.all([loadCustomers(), loadPartyContacts()]);
  };

  const emailContactOptions = useMemo(
    () =>
      partyContacts.map((c) => ({
        value: c.email,
        label: c.canDelete ? `${c.label} <${c.email}>` : `${c.label} <${c.email}> (company)`,
      })),
    [partyContacts],
  );

  const emailCcOptions = useMemo(
    () => emailContactOptions.filter((o) => !emailToSet.has(String(o.value).toLowerCase())),
    [emailContactOptions, emailToSet],
  );

  const openCatalogModal = (row?: ConsumableRow) => {
    setEditing(row || null);
    catalogForm.setFieldsValue(
      row
        ? {
            name: row.name,
            category: row.category || undefined,
            stockCode: row.stockCode || '',
            unit: row.unit,
            description: row.description || '',
            isActive: row.isActive !== false,
          }
        : {
            name: '',
            category: '',
            stockCode: '',
            unit: 'each',
            description: '',
            isActive: true,
          },
    );
    setCatalogOpen(true);
  };

  const openSupplierModal = (row?: SupplierRow) => {
    setEditingSupplier(row || null);
    let companyId = row?.companyId ? +row.companyId : undefined;
    if (!companyId && row?.name) {
      const match = companies.find(
        (c) => companyLabel(c).toLowerCase() === String(row.name).trim().toLowerCase(),
      );
      if (match) companyId = +match.id;
    }
    supplierForm.setFieldsValue(
      row
        ? {
            name: row.name,
            companyId: companyId || undefined,
            category: row.category || undefined,
            contactName: row.contactName || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            website: row.website || '',
            notes: row.notes || '',
            isActive: row.isActive !== false,
          }
        : {
            name: '',
            companyId: undefined,
            category: undefined,
            contactName: '',
            email: '',
            phone: '',
            address: '',
            website: '',
            notes: '',
            isActive: true,
          },
    );
    setSupplierCategoryDropdownOpen(false);
    setNewCategoryName('');
    setSupplierOpen(true);
  };

  const saveEmailSettings = async () => {
    const values = await emailForm.validateFields();
    setEmailSaving(true);
    const headingText =
      stripEmailTokens(values.headingText || '') || '<p>Consumables delivery</p>';
    const introText = stripEmailTokens(values.introText || '');
    const closingText = stripEmailTokens(values.closingText || '');
    const signatureHtml = stripEmailTokens(values.signatureHtml || '');
    const payload: EmailSettings = {
      logoUrl: values.logoUrl || '',
      logoWidth: Math.min(400, Math.max(40, Number(values.logoWidth) || 140)),
      logoHeight: Math.min(400, Math.max(24, Number(values.logoHeight) || 72)),
      headingText,
      introText,
      closingText,
      signatureHtml,
      // Keep send path using one body with tokens for items + logo.
      bodyHtml: `${introText}<p>{{itemsTable}}</p>${closingText}<p>{{logo}}</p>${signatureHtml}`,
    };
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/email-settings`,
      'PATCH',
      payload,
    );
    setEmailSaving(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save email template');
      return;
    }
    setEmailSettings(res.data || payload);
    message.success(res?.message || 'Email template saved');
  };

  const persistEmailLogo = async (logoUrl: string | null) => {
    const values = emailForm.getFieldsValue();
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/email-settings`,
      'PATCH',
      {
        ...values,
        logoUrl: logoUrl || '',
      },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not update logo');
      return false;
    }
    emailForm.setFieldsValue({ logoUrl: logoUrl || '' });
    setEmailSettings(res.data || { ...values, logoUrl: logoUrl || '' });
    return true;
  };

  const uploadEmailLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'consumables-logo.png');
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
        message.error(res?.message || 'Logo upload failed');
        return;
      }
      const ok = await persistEmailLogo(String(url));
      if (ok) message.success('Logo added');
    } finally {
      setLogoUploading(false);
    }
  };

  const removeEmailLogo = async () => {
    setLogoUploading(true);
    try {
      const ok = await persistEmailLogo('');
      if (ok) message.success('Logo removed');
    } finally {
      setLogoUploading(false);
    }
  };

  const logoUploadRequest = async ({
    file,
    onSuccess,
    onError,
  }: {
    file: string | Blob | File;
    onSuccess?: (body: unknown, xhr: XMLHttpRequest) => void;
    onError?: (error: Error) => void;
  }) => {
    try {
      await uploadEmailLogo(file as File);
      onSuccess?.({}, new XMLHttpRequest());
    } catch (e) {
      onError?.(e as Error);
    }
  };

  const saveCatalog = async () => {
    const values = await catalogForm.validateFields();
    const payload = {
      name: values.name,
      category: values.category || '',
      stockCode: values.stockCode || '',
      unit: values.unit || 'each',
      description: values.description || '',
      isActive: values.isActive !== false,
    };
    const res = editing
      ? await callAPIAsync(serviceType.COMMON, `${endPoint.CONSUMABLES}/${editing.id}`, 'PATCH', payload)
      : await callAPIAsync(serviceType.COMMON, endPoint.CONSUMABLES, 'POST', payload);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save consumable');
      return;
    }
    message.success(editing ? 'Consumable updated' : 'Consumable created');
    setCatalogOpen(false);
    loadCatalog();
  };

  const removeCatalog = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.CONSUMABLES}/${id}`, 'DELETE');
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete');
      return;
    }
    message.success(res?.message || 'Consumable removed');
    loadCatalog();
  };

  const permanentDeleteCatalog = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/${id}`,
      'DELETE',
      { permanent: '1' },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not permanently delete');
      return;
    }
    message.success(res?.message || 'Consumable permanently deleted');
    await loadCatalog({ includeDeleted: true });
  };

  const saveSupplier = async () => {
    const values = await supplierForm.validateFields();
    const name = String(values.name || '').trim();
    if (!name) {
      message.error('Company name is required');
      return;
    }
    // Only link to a directory company when the name matches an existing client company.
    // New supplier names stay in Supplies only — they are not added to /companies.
    const matched = companies.find(
      (c) => companyLabel(c).toLowerCase() === name.toLowerCase(),
    );
    const companyId = matched ? +matched.id : null;
    const payload = {
      companyId,
      name: matched ? companyLabel(matched) : name,
      category: String(values.category || '').trim() || null,
      contactName: values.contactName || '',
      email: values.email || '',
      phone: values.phone || '',
      address: values.address || '',
      website: values.website || '',
      notes: values.notes || '',
      isActive: values.isActive !== false,
    };
    const res = editingSupplier
      ? await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/suppliers/${editingSupplier.id}`,
          'PATCH',
          payload,
        )
      : await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/suppliers`,
          'POST',
          payload,
        );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save supplier');
      return;
    }
    message.success(editingSupplier ? 'Supplier updated' : 'Supplier added');
    setSupplierOpen(false);
    loadSuppliers();
  };

  const removeSupplier = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/suppliers/${id}`,
      'DELETE',
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete');
      return;
    }
    message.success('Supplier removed');
    loadSuppliers();
  };

  const addLineFromCatalog = (consumableId: number) => {
    const item = catalog.find((row) => row.id === consumableId);
    if (!item) return;
    setLineItems((current) => {
      const existing = current.find((row) => row.consumableId === item.id);
      if (existing) {
        return current.map((row) =>
          row.consumableId === item.id ? { ...row, quantity: row.quantity + 1 } : row,
        );
      }
      return [
        ...current,
        {
          consumableId: item.id,
          name: item.name,
          stockCode: item.stockCode || null,
          unit: item.unit,
          quantity: 1,
        },
      ];
    });
    setCatalogPick(null);
    setCatalogPickKey((key) => key + 1);
  };

  const clearOrderForm = () => {
    sendForm.resetFields();
    setLineItems([]);
    setEditingOrderId(null);
    setSendError(null);
    setSelectedPartyKey(null);
    setConfirmOpen(false);
    setConfirmPreview(null);
  };

  const parsePartyKey = (key: string | null | undefined) => {
    const raw = String(key || '');
    if (raw.startsWith('supplier:')) {
      return { supplierId: +raw.slice('supplier:'.length), companyId: null as number | null };
    }
    if (raw.startsWith('company:')) {
      return { supplierId: null as number | null, companyId: +raw.slice('company:'.length) };
    }
    return { supplierId: null as number | null, companyId: null as number | null };
  };

  const partyLabelFromKey = (key: string | null | undefined) => {
    const { supplierId, companyId } = parsePartyKey(key);
    if (supplierId) {
      return activeSuppliers.find((s) => s.id === supplierId)?.name || `Supplier #${supplierId}`;
    }
    if (companyId) {
      const c = companies.find((row) => +row.id === companyId);
      return c ? companyLabel(c) : `Company #${companyId}`;
    }
    return '-';
  };

  const resolvePartyCompany = (key: string | null | undefined) => {
    const { supplierId, companyId } = parsePartyKey(key);
    if (companyId) {
      const c = companies.find((row) => +row.id === companyId);
      return {
        companyId,
        companyName: c ? companyLabel(c) : partyLabelFromKey(key),
      };
    }
    if (supplierId) {
      const supplier = activeSuppliers.find((s) => s.id === supplierId);
      if (supplier?.companyId) {
        const c = companies.find((row) => +row.id === +supplier.companyId!);
        return {
          companyId: +supplier.companyId,
          companyName: c ? companyLabel(c) : supplier.name,
        };
      }
      const byName = companies.find(
        (c) =>
          companyLabel(c).toLowerCase() === String(supplier?.name || '').trim().toLowerCase(),
      );
      if (byName) {
        return { companyId: +byName.id, companyName: companyLabel(byName) };
      }
      return {
        companyId: null as number | null,
        companyName: supplier?.name || '',
      };
    }
    return { companyId: null as number | null, companyName: '' };
  };

  const loadCompanyCustomerPicker = async (partyKey?: string | null) => {
    const key = partyKey != null ? partyKey : selectedPartyKey;
    const party = resolvePartyCompany(key);
    if (!party.companyId) {
      setCompanyCustomerOptions([]);
      return;
    }
    const params: Record<string, string | number> = {
      companyId: party.companyId,
      picker: '1',
    };
    if (key?.startsWith('supplier:')) params.supplierId = +key.slice('supplier:'.length);
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/contacts`,
      'GET',
      params,
    );
    if (res?.code !== 1) {
      setCompanyCustomerOptions([]);
      return;
    }
    setCompanyCustomerOptions(
      (res.data?.rows || []).map((row: any) => ({
        id: +row.id,
        label: String(row.label || row.email || '').trim(),
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        position: String(row.position || '').trim(),
        landLine: String(row.landLine || '').trim(),
        linked: !!row.linked,
      })),
    );
  };

  const openAddContact = () => {
    if (!selectedPartyKey) {
      message.warning('Select a supplier or client company first');
      return;
    }
    const party = resolvePartyCompany(selectedPartyKey);
    if (!party.companyId) {
      message.warning(
        'Link this supplier to a directory company (matching name on Suppliers) before adding contacts',
      );
      return;
    }
    contactForm.setFieldsValue({
      fullName: '',
      email: '',
      phone: '',
      position: '',
      landLine: '',
      comments: '',
    });
    setSelectedCompanyCustomerIds([]);
    void loadCompanyCustomerPicker(selectedPartyKey);
    setContactOpen(true);
  };

  const attachEmailToOrder = (email: string) => {
    const raw = sendForm.getFieldValue('emailTo');
    const current = Array.isArray(raw)
      ? raw.map((e) => String(e || '').trim()).filter(Boolean)
      : String(raw || '')
          .split(/[;,]+/)
          .map((e) => e.trim())
          .filter(Boolean);
    const key = email.toLowerCase();
    const nextTo = current.some((e) => e.toLowerCase() === key)
      ? current
      : [...current, email];
    const rawCc = sendForm.getFieldValue('emailCc');
    const nextCc = (
      Array.isArray(rawCc)
        ? rawCc.map((e) => String(e || '').trim()).filter(Boolean)
        : String(rawCc || '')
            .split(/[;,]+/)
            .map((e) => e.trim())
            .filter(Boolean)
    ).filter((e) => e.toLowerCase() !== key);
    sendForm.setFieldsValue({ emailTo: nextTo, emailCc: nextCc });
  };

  const linkExistingContact = async (
    party: { companyId: number; companyName: string },
    person: { email: string; label?: string; phone?: string; position?: string },
  ) => {
    const key = selectedPartyKey || '';
    const linkBody: Record<string, string | number> = {
      companyId: party.companyId,
      email: person.email,
      fullName: person.label || '',
      phone: person.phone || '',
      position: person.position || '',
    };
    if (key.startsWith('supplier:')) linkBody.supplierId = +key.slice('supplier:'.length);
    return callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/contacts`,
      'POST',
      linkBody,
    );
  };

  const saveNewContact = async () => {
    const party = resolvePartyCompany(selectedPartyKey);
    if (!party.companyId) {
      message.error('Cannot add contact without a linked directory company');
      return;
    }

    setContactSaving(true);
    try {
      if (selectedCompanyCustomerIds.length) {
        const picked = companyCustomerOptions.filter((c) =>
          selectedCompanyCustomerIds.includes(c.id),
        );
        if (!picked.length) {
          message.warning('Select at least one customer');
          return;
        }
        let ok = 0;
        for (const person of picked) {
          const res = await linkExistingContact(party as { companyId: number; companyName: string }, {
            email: person.email,
            label: person.label,
            phone: person.phone,
            position: person.position,
          });
          if (res?.code === 1) {
            ok += 1;
            attachEmailToOrder(person.email);
          }
        }
        if (!ok) {
          message.error('Could not add selected customers');
          return;
        }
        message.success(
          ok === 1 ? 'Contact added' : `${ok} contacts added`,
        );
        setContactOpen(false);
        setSelectedCompanyCustomerIds([]);
        await Promise.all([loadCustomers(), loadPartyContacts()]);
        return;
      }

      const values = await contactForm.validateFields();
      const email = String(values.email || '').trim().toLowerCase();
      const fullName = String(values.fullName || '').trim();
      const phone = String(values.phone || '').trim();
      const position = String(values.position || '').trim();
      const landLine = String(values.landLine || '').trim();
      const comments = String(values.comments || '').trim();

      const linked = await linkExistingContact(party as { companyId: number; companyName: string }, {
        email,
        label: fullName,
        phone: phone || landLine,
        position,
      });
      if (linked?.code === 1) {
        message.success(linked?.message || 'Contact added');
        setContactOpen(false);
        await Promise.all([loadCustomers(), loadPartyContacts()]);
        attachEmailToOrder(email);
        return;
      }

      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(' ') || '';
      const password = `Tmp${Math.random().toString(36).slice(2, 10)}!A1`;
      const res = await callAPIAsync(serviceType.COMMON, endPoint.USERS, 'POST', {
        type: userType.CUSTOMER,
        email,
        username: email,
        password,
        firstName,
        lastName,
        fullName,
        phone,
        position,
        landLine,
        description: comments,
        companyId: party.companyId,
        companyName: party.companyName || undefined,
        companyEmail: email,
        companyPhone: phone || landLine || '',
        allowDelete: 1,
      });
      if (res?.code === 1) {
        message.success('Contact person added');
        setContactOpen(false);
        await Promise.all([loadCustomers(), loadPartyContacts()]);
        attachEmailToOrder(email);
        return;
      }
      if (res?.code === 6) {
        const again = await linkExistingContact(party as { companyId: number; companyName: string }, {
          email,
          label: fullName,
          phone: phone || landLine,
          position,
        });
        if (again?.code === 1) {
          message.success(again?.message || 'Contact added back');
          setContactOpen(false);
          await Promise.all([loadCustomers(), loadPartyContacts()]);
          attachEmailToOrder(email);
          return;
        }
        message.error(again?.message || res?.message || 'Could not add contact person');
        return;
      }
      message.error(res?.message || linked?.message || 'Could not add contact person');
    } finally {
      setContactSaving(false);
    }
  };

  const startEditOrder = (row: DeliveryRow, opts?: { failedRetry?: boolean }) => {
    setEditingOrderId(row.id);
    setViewDelivery(null);
    setLineItems(deliveryItems(row));
    let partyKey: string | undefined;
    if (row.supplierId) partyKey = `supplier:${row.supplierId}`;
    else if (row.companyId) partyKey = `company:${row.companyId}`;
    else {
      const byName = suppliers.find(
        (s) =>
          s.name.trim().toLowerCase() ===
          String(row.companyName || row.customerName || '')
            .trim()
            .toLowerCase(),
      );
      if (byName) partyKey = `supplier:${byName.id}`;
      else {
        const company = companies.find(
          (c) =>
            companyLabel(c).toLowerCase() ===
            String(row.companyName || row.customerName || '')
              .trim()
              .toLowerCase(),
        );
        if (company) partyKey = `company:${company.id}`;
      }
    }
    setSelectedPartyKey(partyKey || null);
    setSendError(
      opts?.failedRetry || row.emailStatus === 'failed'
        ? row.emailError || 'Previous email send failed. Fix the address and send again.'
        : null,
    );
    const emails = String(row.emailedTo || '')
      .split(/[;,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    const ccEmails = String(row.emailedCc || '')
      .split(/[;,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    sendForm.setFieldsValue({
      partyKey,
      siteName: row.siteName || undefined,
      emailTo: emails,
      emailCc: ccEmails,
      subject: row.subject || '',
      notes: row.notes || '',
    });
    setTab('order');
    if (opts?.failedRetry || row.emailStatus === 'failed') {
      message.warning('Fix the email if needed, then send again');
    } else {
      message.info('Edit the order, then Update and email to resend');
    }
  };

  const openViewDelivery = async (row: DeliveryRow) => {
    setViewDelivery(row);
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/${row.id}`,
      'GET',
      {},
    );
    if (res?.code === 1 && res.data) setViewDelivery(res.data);
  };

  const softDeleteDelivery = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/${id}`,
      'DELETE',
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete order');
      return;
    }
    message.success(res?.message || 'Order moved to Deleted');
    if (viewDelivery?.id === id) setViewDelivery(null);
    setHistory((rows) => rows.filter((row) => row.id !== id));
    setDeletedCount((n) => n + 1);
    await loadHistory('active');
  };

  const permanentDeleteDelivery = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/${id}`,
      'DELETE',
      { permanent: '1' },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not permanently delete order');
      return;
    }
    message.success(res?.message || 'Order permanently deleted');
    if (viewDelivery?.id === id) setViewDelivery(null);
    setHistory((rows) => rows.filter((row) => row.id !== id));
    setDeletedCount((n) => Math.max(0, n - 1));
    await loadHistory('deleted');
  };

  const restoreDelivery = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/${id}/restore`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore order');
      return;
    }
    message.success(res?.message || 'Order restored');
    if (viewDelivery?.id === id) setViewDelivery(null);
    setHistoryListTab('active');
    setDeletedCount((n) => Math.max(0, n - 1));
    await loadHistory('active');
  };

  const normalizeEmailList = (value: unknown) => {
    const raw = Array.isArray(value)
      ? value.map((e) => String(e || '').trim()).filter(Boolean)
      : String(value || '')
          .split(/[;,]+/)
          .map((e) => e.trim())
          .filter(Boolean);
    const seen = new Set<string>();
    const unique: string[] = [];
    raw.forEach((email) => {
      const key = email.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(email);
    });
    return unique;
  };

  const splitToAndCc = (toValue: unknown, ccValue: unknown) => {
    const emails = normalizeEmailList(toValue);
    const toSet = new Set(emails.map((e) => e.toLowerCase()));
    const ccEmails = normalizeEmailList(ccValue).filter((e) => !toSet.has(e.toLowerCase()));
    return { emails, ccEmails };
  };

  const openSendConfirm = async () => {
    const values = await sendForm.validateFields();
    if (!lineItems.length) {
      message.warning('Add at least one consumable item');
      return;
    }
    const { emails, ccEmails } = splitToAndCc(values.emailTo, values.emailCc);
    setConfirmPreview({
      supplierLabel: partyLabelFromKey(values.partyKey),
      siteName: String(values.siteName || '').trim() || '-',
      emailTo: emails.join(', '),
      emailCc: ccEmails.join(', '),
      subject: String(values.subject || '').trim() || 'Consumables order',
      itemCount: lineItems.length,
      items: lineItems.map((row) => ({
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
      })),
    });
    setConfirmOpen(true);
  };

  const buildDeliveryPayload = (values: any, sendEmail: boolean) => {
    const { supplierId, companyId } = parsePartyKey(values.partyKey);
    const label = partyLabelFromKey(values.partyKey);
    const { emails, ccEmails } = splitToAndCc(values.emailTo, values.emailCc);
    const firstEmail = emails[0] || '';
    const contact =
      partyContacts.find((c) => c.email.toLowerCase() === firstEmail.toLowerCase()) || null;
    return {
      supplierId: supplierId || undefined,
      companyId: companyId || undefined,
      companyName: label,
      customerName: contact?.label || label,
      contactName: contact?.label || undefined,
      siteName: values.siteName || '',
      subject: values.subject || '',
      notes: values.notes || '',
      emailTo: emails.join(', '),
      emailCc: ccEmails.join(', '),
      sendEmail,
      items: lineItems,
    };
  };

  const saveDraftOrder = async () => {
    const values = await sendForm.validateFields(['partyKey']);
    if (!lineItems.length) {
      message.warning('Add at least one consumable item');
      return;
    }
    setSavingDraft(true);
    setSendError(null);
    const payload = buildDeliveryPayload(
      { ...sendForm.getFieldsValue(true), partyKey: values.partyKey },
      false,
    );
    if (!payload.emailTo) {
      payload.emailTo = '';
    }
    const res = editingOrderId
      ? await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/deliveries/${editingOrderId}`,
          'PATCH',
          payload,
        )
      : await callAPIAsync(serviceType.COMMON, `${endPoint.CONSUMABLES}/deliveries`, 'POST', payload);
    setSavingDraft(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save draft');
      return;
    }
    message.success('Draft saved (not emailed)');
    clearOrderForm();
    loadHistory();
    setTab('history');
  };

  const sendToSupplier = async () => {
    const values = await sendForm.validateFields();
    if (!lineItems.length) {
      message.warning('Add at least one consumable item');
      return;
    }
    setConfirmOpen(false);
    setSending(true);
    setSendError(null);
    const payload = buildDeliveryPayload(values, true);
    const res = editingOrderId
      ? await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/deliveries/${editingOrderId}`,
          'PATCH',
          payload,
        )
      : await callAPIAsync(serviceType.COMMON, `${endPoint.CONSUMABLES}/deliveries`, 'POST', payload);
    setSending(false);
    if (res?.code !== 1) {
      const err = res?.message || 'Could not send consumables';
      setSendError(err);
      message.error(err);
      return;
    }
    const saved = res?.data as DeliveryRow | undefined;
    if (res?.emailFailed || saved?.emailStatus === 'failed') {
      const err =
        saved?.emailError || res?.message || 'Email failed to send (Brevo). Fix the address and try again.';
      if (saved?.id) setEditingOrderId(saved.id);
      setSendError(err);
      message.error(err);
      loadHistory();
      return;
    }
    message.success(
      res?.message ||
        (editingOrderId ? 'Order updated and emailed' : 'Consumables emailed to supplier'),
    );
    clearOrderForm();
    loadHistory();
    setTab('history');
  };

  const resendDeliveryOnly = async (row: DeliveryRow) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/deliveries/${row.id}/send`,
      'POST',
      {
        emailTo: row.emailedTo || undefined,
        emailCc: row.emailedCc || undefined,
      },
    );
    if (res?.code !== 1 || res?.emailFailed || res?.data?.emailStatus === 'failed') {
      message.error(res?.data?.emailError || res?.message || 'Resend failed');
      loadHistory();
      return;
    }
    message.success('Email resent');
    setViewDelivery(null);
    loadHistory();
  };

  const restoreCatalogItem = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.CONSUMABLES}/${id}/restore`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore');
      return;
    }
    message.success('Consumable restored');
    setCatalogShowDeleted(false);
    await loadCatalog({ includeDeleted: false });
  };

  const catalogColumns: ColumnsType<ConsumableRow> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          sensitivity: 'base',
        }),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      sorter: (a, b) =>
        String(a.category || '').localeCompare(String(b.category || ''), undefined, {
          sensitivity: 'base',
        }),
      render: (value) => (value ? <Tag color="blue">{value}</Tag> : '—'),
    },
    {
      title: 'Stock code',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 140,
      sorter: (a, b) =>
        String(a.stockCode || '').localeCompare(String(b.stockCode || ''), undefined, {
          sensitivity: 'base',
          numeric: true,
        }),
      render: (value) => value || '-',
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      sorter: (a, b) =>
        String(a.unit || '').localeCompare(String(b.unit || ''), undefined, {
          sensitivity: 'base',
        }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      sorter: (a, b) =>
        String(a.description || '').localeCompare(String(b.description || ''), undefined, {
          sensitivity: 'base',
        }),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      sorter: (a, b) => Number(b.isActive !== false) - Number(a.isActive !== false),
      render: (value) => (value === false ? <Tag>Off</Tag> : <Tag color="green">On</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, row) =>
        catalogShowDeleted ? (
          <Space>
            <Popconfirm title="Restore this consumable?" onConfirm={() => restoreCatalogItem(row.id)}>
              <Button size="small" icon={<UndoOutlined />}>
                Restore
              </Button>
            </Popconfirm>
            <Popconfirm
              title={
                <span>
                  Permanently delete this consumable?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                    This cannot be undone.
                  </div>
                </span>
              }
              okText="Delete permanently"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => permanentDeleteCatalog(row.id)}
            >
              <Tooltip title="Delete permanently">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ) : (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openCatalogModal(row)} />
            <Popconfirm title="Remove this consumable?" onConfirm={() => removeCatalog(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  const supplierColumns: ColumnsType<SupplierRow> = [
    { title: 'Company', dataIndex: 'name', key: 'name' },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      ellipsis: true,
      render: (value) => (value ? <Tag>{value}</Tag> : '—'),
    },
    { title: 'Contact', dataIndex: 'contactName', key: 'contactName', ellipsis: true },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (value) => (value === false ? <Tag>Off</Tag> : <Tag color="green">On</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openSupplierModal(row)} />
          <Popconfirm title="Remove this supplier?" onConfirm={() => removeSupplier(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isDeletedHistoryTab = historyListTab === 'deleted';

  const historyColumns: ColumnsType<DeliveryRow> = [
    {
      title: 'Sent',
      key: 'emailedAt',
      width: 150,
      render: (_, row) => {
        const when = row.emailedAt || (row.emailStatus === 'pending' ? null : row.createdAt);
        if (!when) return '—';
        return moment(when).format(dateTimeFormat);
      },
    },
    {
      title: 'Supplier / company',
      key: 'supplier',
      width: 180,
      ellipsis: true,
      render: (_, row) => row.companyName || row.customerName || '-',
    },
    {
      title: 'Site',
      dataIndex: 'siteName',
      key: 'siteName',
      width: 140,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Email',
      key: 'email',
      width: 200,
      ellipsis: true,
      render: (_, row) => {
        const to = row.emailedTo || '-';
        const tip = [to, row.emailedCc ? `CC ${row.emailedCc}` : '', row.emailError || '']
          .filter(Boolean)
          .join('\n');
        return (
          <div className="consumables-email-cell" title={tip}>
            <div className="consumables-email-to">{to}</div>
            {row.emailedCc ? <div className="consumables-email-cc">CC {row.emailedCc}</div> : null}
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 96,
      render: (_, row) => {
        if (row.emailStatus === 'failed') return <Tag color="red">failed</Tag>;
        if (row.emailStatus === 'pending') return <Tag>draft</Tag>;
        if (row.emailStatus === 'sent' || row.emailedAt) return <Tag color="green">sent</Tag>;
        return <Tag>{row.emailStatus || '—'}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: isDeletedHistoryTab ? 120 : 160,
      fixed: 'right' as const,
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="View">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openViewDelivery(row)}
            />
          </Tooltip>
          {!isDeletedHistoryTab ? (
            <>
              <Tooltip title="Edit">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => startEditOrder(row)}
                />
              </Tooltip>
              {row.emailStatus === 'failed' ? (
                <Tooltip title="Fix and retry">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<SendOutlined />}
                    onClick={() => startEditOrder(row, { failedRetry: true })}
                  />
                </Tooltip>
              ) : row.emailStatus === 'pending' ? null : (
                <Tooltip title="Resend">
                  <Button
                    type="link"
                    size="small"
                    icon={<SendOutlined />}
                    onClick={() => void resendDeliveryOnly(row)}
                  />
                </Tooltip>
              )}
              <Popconfirm
                title={
                  <span>
                    Move this order to Deleted?
                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                      You can permanently delete it later from the Deleted tab.
                    </div>
                  </span>
                }
                okText="Move to Deleted"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => softDeleteDelivery(row.id)}
              >
                <Tooltip title="Delete">
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          ) : (
            <>
              <Popconfirm
                title="Restore this order to Order history?"
                okText="Restore"
                cancelText="Cancel"
                onConfirm={() => restoreDelivery(row.id)}
              >
                <Tooltip title="Restore">
                  <Button type="link" size="small" icon={<UndoOutlined />} />
                </Tooltip>
              </Popconfirm>
              <Popconfirm
                title={
                  <span>
                    Permanently delete this order?
                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                      This cannot be undone.
                    </div>
                  </span>
                }
                okText="Delete permanently"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => permanentDeleteDelivery(row.id)}
              >
                <Tooltip title="Delete permanently">
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const activeCatalog = useMemo(() => catalog.filter((row) => row.isActive !== false), [catalog]);

  /** Existing catalog/supplier categories + ones added via + in this session. */
  const catalogCategoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ value: string; label: string }> = [];
    const add = (raw: string) => {
      const cat = String(raw || '').trim();
      if (!cat) return;
      const key = cat.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      opts.push({ value: cat, label: cat });
    };
    for (const row of catalog) add(row.category || '');
    for (const row of suppliers) add(row.category || '');
    for (const c of customCategories) add(c);
    return opts.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [catalog, suppliers, customCategories]);

  const addCatalogCategory = (target: 'catalog' | 'supplier' = 'catalog') => {
    const name = String(newCategoryName || '').trim();
    if (!name) {
      message.warning('Enter a category name first');
      return;
    }
    const exists = catalogCategoryOptions.some(
      (o) => o.value.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      setCustomCategories((prev) => [...prev, name]);
    }
    if (target === 'supplier') {
      supplierForm.setFieldsValue({ category: name });
      setSupplierCategoryDropdownOpen(false);
    } else {
      catalogForm.setFieldsValue({ category: name });
      setCategoryDropdownOpen(false);
    }
    setNewCategoryName('');
  };

  const removeCatalogCategory = async (name: string) => {
    const label = String(name || '').trim();
    if (!label) return;
    setCategorySaving(true);
    try {
      const affected = catalog.filter(
        (row) =>
          String(row.category || '').trim().toLowerCase() === label.toLowerCase(),
      );
      for (const row of affected) {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/${row.id}`,
          'PATCH',
          { category: '' },
        );
        if (res?.code !== 1) {
          message.error(res?.message || `Could not clear category on ${row.name}`);
          return;
        }
      }
      const affectedSuppliers = suppliers.filter(
        (row) =>
          String(row.category || '').trim().toLowerCase() === label.toLowerCase(),
      );
      for (const row of affectedSuppliers) {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.CONSUMABLES}/suppliers/${row.id}`,
          'PATCH',
          { category: '' },
        );
        if (res?.code !== 1) {
          message.error(res?.message || `Could not clear category on ${row.name}`);
          return;
        }
      }
      setCustomCategories((prev) =>
        prev.filter((c) => c.toLowerCase() !== label.toLowerCase()),
      );
      if (
        String(catalogForm.getFieldValue('category') || '').toLowerCase() ===
        label.toLowerCase()
      ) {
        catalogForm.setFieldsValue({ category: undefined });
      }
      if (
        String(supplierForm.getFieldValue('category') || '').toLowerCase() ===
        label.toLowerCase()
      ) {
        supplierForm.setFieldsValue({ category: undefined });
      }
      if (affected.length) {
        await loadCatalog();
      }
      if (affectedSuppliers.length) {
        await loadSuppliers();
      }
      message.success(`Category removed: ${label}`);
    } finally {
      setCategorySaving(false);
    }
  };

  const makeCategoryPanel = (target: 'catalog' | 'supplier') => {
    const selected =
      target === 'supplier' ? watchedSupplierCategory : watchedCategory;
    const close = () => {
      if (target === 'supplier') setSupplierCategoryDropdownOpen(false);
      else setCategoryDropdownOpen(false);
    };
    const pick = (value: string) => {
      if (target === 'supplier') supplierForm.setFieldsValue({ category: value });
      else catalogForm.setFieldsValue({ category: value });
      close();
    };
    return (
      <div
        className="consumables-category-panel"
        style={{
          background: '#fff',
          borderRadius: 2,
          boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08)',
          width: 360,
          maxWidth: '90vw',
        }}
      >
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
          {catalogCategoryOptions.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No categories yet" />
          ) : (
            catalogCategoryOptions.map((opt) => (
              <div
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background:
                    String(selected || '').toLowerCase() === opt.value.toLowerCase()
                      ? '#e6f4ff'
                      : undefined,
                }}
                onClick={() => pick(opt.value)}
              >
                <span style={{ flex: 1, fontSize: 14, color: 'rgba(0, 0, 0, 0.88)' }}>
                  {opt.label}
                </span>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={categorySaving}
                  aria-label={`Remove ${opt.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeCatalogCategory(opt.value);
                  }}
                />
              </div>
            ))
          )}
        </div>
        <Divider style={{ margin: 0 }} />
        <div style={{ padding: '8px 12px' }}>
          <Space style={{ width: '100%' }}>
            <Input
              placeholder="New category name"
              value={newCategoryName}
              disabled={categorySaving}
              maxLength={64}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onPressEnter={(e) => {
                e.preventDefault();
                addCatalogCategory(target);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={categorySaving}
              onClick={(e) => {
                e.stopPropagation();
                addCatalogCategory(target);
              }}
            >
              Add
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  const categoryPanelContent = makeCategoryPanel('catalog');
  const supplierCategoryPanelContent = makeCategoryPanel('supplier');

  if (isCustomer) {
    const isCustomerDeletedTab = historyListTab === 'deleted';
    const customerHistoryColumns: ColumnsType<DeliveryRow> = [
      {
        title: 'From',
        key: 'from',
        width: 140,
        ellipsis: true,
        render: (_, row) =>
          String(row.fromLabel || row.fromSender || '').trim() || 'SERVICELINK',
      },
      {
        title: 'Date',
        key: 'date',
        width: 150,
        render: (_, row) => {
          const when = row.emailedAt || row.createdAt;
          return when ? moment(when).format(dateTimeFormat) : '-';
        },
      },
      { title: 'Site', dataIndex: 'siteName', key: 'siteName', ellipsis: true },
      { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
      {
        title: 'Items',
        key: 'items',
        width: 80,
        render: (_, row) => deliveryItems(row).length || 0,
      },
      {
        title: 'Action',
        key: 'actions',
        width: isCustomerDeletedTab ? 130 : 130,
        render: (_, row) => (
          <Space size={0} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => openViewDelivery(row)}
              />
            </Tooltip>
            <Link
              to={`/messages?consumableDeliveryId=${row.id}`}
              title="Message about this delivery"
            >
              <Button
                type="link"
                size="small"
                icon={<MailOutlined />}
                aria-label="Message about this delivery"
              />
            </Link>
            {isCustomerDeletedTab ? (
              <>
                <Popconfirm
                  title="Restore this delivery to the list?"
                  okText="Restore"
                  cancelText="No"
                  onConfirm={() => restoreDelivery(row.id)}
                >
                  <Tooltip title="Restore">
                    <Button type="link" size="small" icon={<UndoOutlined />} />
                  </Tooltip>
                </Popconfirm>
                <Popconfirm
                  title="Remove this delivery from Deleted permanently?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  cancelText="No"
                  onConfirm={() => permanentDeleteDelivery(row.id)}
                >
                  <Tooltip title="Delete permanently">
                    <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </>
            ) : (
              <Popconfirm
                title="Move this delivery to Deleted? You can restore it from the Deleted tab."
                okText="Yes"
                cancelText="No"
                onConfirm={() => softDeleteDelivery(row.id)}
              >
                <Tooltip title="Delete">
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ];

    return (
      <Layout title="Consumables">
        <div className="consumables-page">
          {backToMessagesButton}
          <div className="consumables-list-chrome">
            <div className="consumables-list-chrome-top">
              <div>
                <h2 className="consumables-list-chrome-title">Consumables</h2>
                <p className="consumables-list-chrome-sub">
                  Deliveries sent to your company
                </p>
              </div>
              <Space wrap>
                <Input.Search
                  allowClear
                  placeholder="Search"
                  style={{ width: 220 }}
                  value={historyKeyword}
                  onChange={(e) => setHistoryKeyword(e.target.value)}
                  onSearch={(value) => {
                    setHistoryKeyword(value);
                    void loadHistory(historyListTab, value);
                  }}
                />
                <Tabs
                  className="consumables-list-chrome-tabs"
                  activeKey={historyListTab}
                  onChange={(key) => {
                    const next = key as 'active' | 'deleted';
                    setHistoryListTab(next);
                    loadHistory(next);
                  }}
                  items={[
                    { key: 'active', label: 'Orders' },
                    { key: 'deleted', label: `Deleted (${deletedCount})` },
                  ]}
                />
              </Space>
            </div>
            <div className="consumables-list-table-panel">
              <Table
                rowKey="id"
                loading={loading}
                columns={customerHistoryColumns}
                dataSource={history}
                pagination={{ pageSize: 20 }}
                locale={{
                  emptyText: isCustomerDeletedTab
                    ? 'No deleted consumables'
                    : 'No consumables sent to your company yet',
                }}
              />
            </div>
          </div>

          <Modal
            title={viewDelivery?.subject || 'Delivery'}
            open={!!viewDelivery}
            width={720}
            onCancel={() => {
              setViewDelivery(null);
              if (fromMessages) goBackToMessages();
            }}
            footer={[
              fromMessages ? (
                <Button
                  key="back-messages"
                  icon={<ArrowLeftOutlined />}
                  onClick={goBackToMessages}
                >
                  Back to messages
                </Button>
              ) : (
                <Button key="close" onClick={() => setViewDelivery(null)}>
                  Close
                </Button>
              ),
              !fromMessages && viewDelivery ? (
                <Link
                  key="message"
                  to={`/messages?consumableDeliveryId=${viewDelivery.id}`}
                  title="Message about this delivery"
                >
                  <Button icon={<MailOutlined />}>Message</Button>
                </Link>
              ) : null,
            ]}
          >
            {viewDelivery ? (
              <div>
                <p>
                  <strong>From:</strong>{' '}
                  {String(viewDelivery.fromLabel || viewDelivery.fromSender || '').trim() ||
                    'SERVICELINK'}
                </p>
                <p>
                  <strong>Company:</strong>{' '}
                  {viewDelivery.companyName || viewDelivery.customerName}
                </p>
                {viewDelivery.siteName ? (
                  <p>
                    <strong>Site:</strong> {viewDelivery.siteName}
                  </p>
                ) : null}
                {viewDelivery.notes ? (
                  <p>
                    <strong>Notes:</strong> {viewDelivery.notes}
                  </p>
                ) : null}
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(_, index) => `view-${index}`}
                  dataSource={deliveryItems(viewDelivery)}
                  columns={[
                    { title: 'Item', dataIndex: 'name' },
                    { title: 'Qty', dataIndex: 'quantity', width: 80 },
                    { title: 'Unit', dataIndex: 'unit', width: 90 },
                    {
                      title: 'Stock code',
                      dataIndex: 'stockCode',
                      width: 110,
                      render: (value) => value || '-',
                    },
                  ]}
                />
              </div>
            ) : null}
          </Modal>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout title="Consumables">
        <p>Only admins can manage consumables.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Consumables">
      <div className="consumables-page">
      {backToMessagesButton}
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'order',
            label: 'Order consumables',
            children: (
              <div className="consumables-order">
                {sendError ? (
                  <Alert
                    type="error"
                    showIcon
                    closable
                    onClose={() => setSendError(null)}
                    message="Email send failed"
                    description={
                      <div>
                        <div>{sendError}</div>
                        <div style={{ marginTop: 6, color: '#6b7280' }}>
                          Check the To / CC addresses below, then send again. The order is saved.
                        </div>
                      </div>
                    }
                  />
                ) : null}
                <section className="consumables-card">
                  <header className="consumables-card__head">
                    <div>
                      <h3>{editingOrderId ? `Edit order #${editingOrderId}` : 'Delivery details'}</h3>
                      <p>
                        {editingOrderId
                          ? sendError
                            ? 'Fix the email if needed, then send again.'
                            : 'Update this order, then save and email again.'
                          : 'Choose the supplier and where this order should be emailed.'}
                      </p>
                    </div>
                    {editingOrderId ? (
                      <Button type="link" onClick={clearOrderForm}>
                        Cancel edit
                      </Button>
                    ) : null}
                  </header>
                  <div className="consumables-card__body">
                    <Form form={sendForm} layout="vertical" requiredMark="optional">
                      <div className="consumables-grid">
                        <Form.Item
                          name="partyKey"
                          label="Supplier"
                          rules={[{ required: true, message: 'Select a supplier or client company' }]}
                          required
                          extra="Supplier companies and client companies (not individual colleagues)"
                        >
                          <Select
                            showSearch
                            size="large"
                            placeholder="Search supplier or client company"
                            optionFilterProp="label"
                            options={partyOptions}
                            onChange={(value) => {
                              const key = value ? String(value) : null;
                              setSelectedPartyKey(key);
                              setManageContactsOpen(false);
                              sendForm.setFieldsValue({ emailTo: [], emailCc: [] });
                              const label = partyLabelFromKey(key);
                              if (!sendForm.getFieldValue('subject') && label && label !== '-') {
                                sendForm.setFieldsValue({
                                  subject: `Consumables order - ${label}`,
                                });
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="siteName"
                          label="Site"
                          extra="Pick a job site (optional)"
                        >
                          <Select
                            allowClear
                            showSearch
                            size="large"
                            placeholder="Select site"
                            optionFilterProp="label"
                            options={siteOptions}
                          />
                        </Form.Item>
                        <Form.Item
                          name="emailTo"
                          label="To"
                          rules={[
                            {
                              required: true,
                              type: 'array',
                              min: 1,
                              message: 'Select at least one contact',
                            },
                          ]}
                          required
                          extra={
                            selectedPartyKey ? (
                              <div className="consumables-contact-actions">
                                <span style={{ color: '#6b7280', fontSize: 12 }}>
                                  Primary recipients
                                </span>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => setManageContactsOpen(true)}
                                >
                                  Manage contacts
                                  {partyContacts.length
                                    ? ` (${partyContacts.length})`
                                    : ''}
                                </Button>
                              </div>
                            ) : (
                              'Select a supplier or client company first'
                            )
                          }
                        >
                          <Select
                            mode="tags"
                            size="large"
                            showSearch
                            allowClear
                            tokenSeparators={[',', ';']}
                            placeholder={
                              selectedPartyKey
                                ? 'Who should receive this order'
                                : 'Select supplier first'
                            }
                            optionFilterProp="label"
                            options={emailContactOptions}
                            disabled={!selectedPartyKey}
                            onChange={(values: string[]) => {
                              const to = (values || [])
                                .map((e) => String(e || '').trim())
                                .filter(Boolean);
                              const toKeys = new Set(to.map((e) => e.toLowerCase()));
                              const rawCc = sendForm.getFieldValue('emailCc');
                              const cc = (
                                Array.isArray(rawCc)
                                  ? rawCc.map((e) => String(e || '').trim()).filter(Boolean)
                                  : []
                              ).filter((e) => !toKeys.has(e.toLowerCase()));
                              sendForm.setFieldsValue({ emailTo: to, emailCc: cc });
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="emailCc"
                          label="CC"
                          extra={
                            selectedPartyKey
                              ? 'Optional copies — people already in To are left out (no duplicate email)'
                              : 'Select a supplier or client company first'
                          }
                        >
                          <Select
                            mode="tags"
                            size="large"
                            showSearch
                            allowClear
                            tokenSeparators={[',', ';']}
                            placeholder={
                              selectedPartyKey
                                ? 'Optional CC (not already in To)'
                                : 'Select supplier first'
                            }
                            optionFilterProp="label"
                            options={emailCcOptions}
                            disabled={!selectedPartyKey}
                            onChange={(values: string[]) => {
                              const cc = (values || [])
                                .map((e) => String(e || '').trim())
                                .filter((e) => e && !emailToSet.has(e.toLowerCase()));
                              sendForm.setFieldsValue({ emailCc: cc });
                            }}
                          />
                        </Form.Item>
                      </div>
                      <Form.Item name="subject" label="Subject">
                        <Input size="large" placeholder="Consumables order" />
                      </Form.Item>
                      <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
                        <Input.TextArea rows={3} placeholder="Optional notes for the supplier" />
                      </Form.Item>
                    </Form>
                  </div>
                </section>

                <section className="consumables-card">
                  <header className="consumables-card__head">
                    <div>
                      <h3>Items</h3>
                      <p>Add consumables from the catalog and set quantities.</p>
                    </div>
                    <Tag color="green">{lineItems.length} item{lineItems.length === 1 ? '' : 's'}</Tag>
                  </header>
                  <div className="consumables-card__body">
                    <div className="consumables-items-toolbar">
                      <Select
                        key={catalogPickKey}
                        size="large"
                        placeholder="Add item from catalog"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        value={catalogPick ?? undefined}
                        options={activeCatalog.map((row) => ({
                          value: row.id,
                          label: row.stockCode
                            ? `${row.stockCode} - ${row.name} (${row.unit})`
                            : `${row.name} (${row.unit})`,
                        }))}
                        onChange={(value) => {
                          if (value == null) {
                            setCatalogPick(null);
                            return;
                          }
                          addLineFromCatalog(+value);
                        }}
                      />
                      <Button icon={<PlusOutlined />} onClick={() => { setTab('catalog'); openCatalogModal(); }}>
                        New item
                      </Button>
                    </div>

                    {lineItems.length ? (
                      <Table
                        rowKey={(_, index) => `line-${index}`}
                        size="middle"
                        pagination={false}
                        dataSource={lineItems}
                        columns={[
                          { title: 'Item', dataIndex: 'name' },
                          {
                            title: 'Qty',
                            dataIndex: 'quantity',
                            width: 120,
                            render: (value, _, index) => (
                              <InputNumber
                                min={1}
                                value={value}
                                onChange={(next) =>
                                  setLineItems((current) =>
                                    current.map((row, i) =>
                                      i === index ? { ...row, quantity: Number(next) || 1 } : row,
                                    ),
                                  )
                                }
                              />
                            ),
                          },
                          { title: 'Unit', dataIndex: 'unit', width: 100 },
                          {
                            title: 'Stock code',
                            dataIndex: 'stockCode',
                            width: 120,
                            render: (value) => value || '-',
                          },
                          {
                            title: '',
                            width: 90,
                            render: (_, __, index) => (
                              <Button
                                type="link"
                                danger
                                onClick={() =>
                                  setLineItems((current) => current.filter((_, i) => i !== index))
                                }
                              >
                                Remove
                              </Button>
                            ),
                          },
                        ]}
                      />
                    ) : (
                      <div className="consumables-empty">No items yet. Pick from the catalog above.</div>
                    )}

                    <div className="consumables-actions">
                      {editingOrderId ? (
                        <Button onClick={clearOrderForm}>Cancel</Button>
                      ) : null}
                      <Button loading={savingDraft} onClick={() => void saveDraftOrder()}>
                        Save draft
                      </Button>
                      <Button
                        type="primary"
                        danger={!!sendError}
                        icon={<SendOutlined />}
                        loading={sending}
                        onClick={openSendConfirm}
                      >
                        {sendError
                          ? 'Retry send'
                          : editingOrderId
                            ? 'Update and email'
                            : 'Save and email'}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            ),
          },
          {
            key: 'history',
            label: 'Order history',
            children: (
              <div className="consumables-list-chrome">
                <div className="consumables-list-chrome-top">
                  <div>
                    <h2 className="consumables-list-chrome-title">Order history</h2>
                    <p className="consumables-list-chrome-sub">
                      Consumables emails sent to suppliers
                    </p>
                  </div>
                  <Space wrap>
                    <Input.Search
                      allowClear
                      placeholder="Search orders"
                      style={{ width: 220 }}
                      value={historyKeyword}
                      onChange={(e) => setHistoryKeyword(e.target.value)}
                      onSearch={(value) => {
                        setHistoryKeyword(value);
                        void loadHistory(historyListTab, value);
                      }}
                    />
                    <Tabs
                      className="consumables-list-chrome-tabs"
                      activeKey={historyListTab}
                      onChange={(key) => {
                        const next = key as 'active' | 'deleted';
                        setHistoryListTab(next);
                        loadHistory(next);
                      }}
                      items={[
                        { key: 'active', label: 'Orders' },
                        { key: 'deleted', label: `Deleted (${deletedCount})` },
                      ]}
                    />
                  </Space>
                </div>
                <div className="consumables-list-table-panel">
                  <Table
                    rowKey="id"
                    loading={loading}
                    columns={historyColumns}
                    dataSource={history}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1100 }}
                    locale={{
                      emptyText: isDeletedHistoryTab
                        ? 'No deleted orders'
                        : 'No orders yet',
                    }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'catalog',
            label: 'Catalog',
            children: (
              <>
                <div
                  style={{
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <Space wrap>
                    <Input.Search
                      allowClear
                      placeholder="Search catalog"
                      style={{ width: 220 }}
                      value={catalogKeyword}
                      onChange={(e) => setCatalogKeyword(e.target.value)}
                      onSearch={(value) => {
                        setCatalogKeyword(value);
                        void loadCatalog({ keyword: value });
                      }}
                    />
                    <Button
                      type={catalogShowDeleted ? 'primary' : 'default'}
                      ghost={catalogShowDeleted}
                      onClick={() => {
                        const next = !catalogShowDeleted;
                        setCatalogShowDeleted(next);
                        void loadCatalog({ includeDeleted: next });
                      }}
                    >
                      {catalogShowDeleted ? 'Showing removed' : 'Show removed'}
                    </Button>
                  </Space>
                  {!catalogShowDeleted ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openCatalogModal()}>
                      Add consumable
                    </Button>
                  ) : null}
                </div>
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={catalogColumns}
                  dataSource={catalog}
                  pagination={{ pageSize: 20 }}
                  locale={{
                    emptyText: catalogShowDeleted ? 'No removed items' : 'No catalog items yet',
                  }}
                />
              </>
            ),
          },
          {
            key: 'email',
            label: 'Edit email template',
            children: (
              <EmailTemplateEditor
                emailForm={emailForm}
                emailSaving={emailSaving}
                logoUploading={logoUploading}
                onSave={saveEmailSettings}
                onRemoveLogo={() => void removeEmailLogo()}
                logoUploadRequest={logoUploadRequest}
              />
            ),
          },
          {
            key: 'supplies',
            label: 'Suppliers',
            children: (
              <>
                <div
                  style={{
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <Input.Search
                    allowClear
                    placeholder="Search suppliers"
                    style={{ width: 220 }}
                    value={supplierKeyword}
                    onChange={(e) => setSupplierKeyword(e.target.value)}
                    onSearch={(value) => {
                      setSupplierKeyword(value);
                      void loadSuppliers({ keyword: value });
                    }}
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openSupplierModal()}>
                    Add supplier
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={supplierColumns}
                  dataSource={suppliers}
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: 'No suppliers yet' }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Confirm send"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        okText={sendError ? 'Send again' : 'Send email'}
        okButtonProps={{ danger: !!sendError, loading: sending, icon: <SendOutlined /> }}
        onOk={sendToSupplier}
        cancelText="Back"
      >
        {confirmPreview ? (
          <div className="consumables-confirm">
            <p>Double-check before sending:</p>
            <dl>
              <dt>Supplier</dt>
              <dd>{confirmPreview.supplierLabel}</dd>
              <dt>Site</dt>
              <dd>{confirmPreview.siteName}</dd>
              <dt>To</dt>
              <dd>{confirmPreview.emailTo || '-'}</dd>
              {confirmPreview.emailCc ? (
                <>
                  <dt>CC</dt>
                  <dd>{confirmPreview.emailCc}</dd>
                </>
              ) : null}
              <dt>Subject</dt>
              <dd>{confirmPreview.subject}</dd>
              <dt>Items</dt>
              <dd>
                <div>
                  {confirmPreview.itemCount} item{confirmPreview.itemCount === 1 ? '' : 's'}
                </div>
                <ul className="consumables-confirm-items">
                  {confirmPreview.items.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      {item.quantity} {item.unit} — {item.name}
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        title={editing ? 'Edit consumable' : 'Add consumable'}
        open={catalogOpen}
        onCancel={() => {
          setCatalogOpen(false);
          setCategoryDropdownOpen(false);
          setNewCategoryName('');
        }}
        onOk={saveCatalog}
        okText="Save"
      >
        <Form form={catalogForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            hidden
            rules={[{ required: true, message: 'Category is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Category" required>
            <div className="consumables-category-field">
              <Popover
                content={categoryPanelContent}
                trigger="click"
                open={categoryDropdownOpen}
                onOpenChange={(open) => {
                  setCategoryDropdownOpen(open);
                  if (!open) setNewCategoryName('');
                }}
                placement="bottomLeft"
                overlayStyle={{ padding: 0 }}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              >
                <div
                  className="consumables-category-trigger ant-select ant-select-single ant-select-show-arrow"
                  style={{ width: '100%', cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setCategoryDropdownOpen((open) => !open);
                    }
                  }}
                >
                  <div className="ant-select-selector">
                    <span
                      className={
                        watchedCategory
                          ? 'ant-select-selection-item'
                          : 'ant-select-selection-placeholder'
                      }
                      style={{
                        color: watchedCategory
                          ? 'rgba(0, 0, 0, 0.88)'
                          : 'rgba(0, 0, 0, 0.25)',
                        opacity: 1,
                      }}
                    >
                      {watchedCategory || 'Select or add category'}
                    </span>
                    <span className="ant-select-arrow" style={{ userSelect: 'none' }}>
                      <DownOutlined />
                    </span>
                  </div>
                </div>
              </Popover>
              <style>{`
                .consumables-category-trigger .ant-select-selector {
                  height: 32px;
                  align-items: center;
                  display: flex;
                }
              `}</style>
            </div>
          </Form.Item>
          <Form.Item name="stockCode" label="Stock code">
            <Input placeholder="e.g. BL-001" />
          </Form.Item>
          <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
            <Input placeholder="each / pack / carton / litre" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSupplier ? 'Edit supplier' : 'Add supplier'}
        open={supplierOpen}
        onCancel={() => {
          setSupplierOpen(false);
          setSupplierCategoryDropdownOpen(false);
          setNewCategoryName('');
        }}
        onOk={saveSupplier}
        okText="Save"
        width={560}
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item name="companyId" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="name"
            label="Company name"
            rules={[{ required: true, message: 'Company name is required' }]}
            extra="Pick an existing client company, or type a new supplier name (stays in Suppliers only)"
          >
            <AutoComplete
              options={companyOptions.map((o) => ({ value: o.label, companyId: o.value }))}
              filterOption={(input, option) =>
                String(option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onSelect={(value, option: any) => {
                supplierForm.setFieldsValue({
                  name: value,
                  companyId: option?.companyId ? +option.companyId : undefined,
                });
              }}
              onChange={(value) => {
                const match = companies.find(
                  (c) => companyLabel(c).toLowerCase() === String(value || '').trim().toLowerCase(),
                );
                supplierForm.setFieldsValue({
                  name: value,
                  companyId: match ? +match.id : undefined,
                });
              }}
              placeholder="Supplier company name"
            />
          </Form.Item>
          <Form.Item name="contactName" label="Contact name">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input placeholder="www.example.com" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="category" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Category">
            <div className="consumables-category-field">
              <Popover
                content={supplierCategoryPanelContent}
                trigger="click"
                open={supplierCategoryDropdownOpen}
                onOpenChange={(open) => {
                  setSupplierCategoryDropdownOpen(open);
                  if (!open) setNewCategoryName('');
                }}
                placement="bottomLeft"
                overlayStyle={{ padding: 0 }}
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              >
                <div
                  className="consumables-category-trigger ant-select ant-select-single ant-select-show-arrow"
                  style={{ width: '100%', cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSupplierCategoryDropdownOpen((open) => !open);
                    }
                  }}
                >
                  <div className="ant-select-selector">
                    <span
                      className={
                        watchedSupplierCategory
                          ? 'ant-select-selection-item'
                          : 'ant-select-selection-placeholder'
                      }
                      style={{
                        color: watchedSupplierCategory
                          ? 'rgba(0, 0, 0, 0.88)'
                          : 'rgba(0, 0, 0, 0.25)',
                        opacity: 1,
                      }}
                    >
                      {watchedSupplierCategory || 'Select or add category (optional)'}
                    </span>
                    <span className="ant-select-arrow" style={{ userSelect: 'none' }}>
                      <DownOutlined />
                    </span>
                  </div>
                </div>
              </Popover>
              <style>{`
                .consumables-category-trigger .ant-select-selector {
                  height: 32px;
                  align-items: center;
                  display: flex;
                }
              `}</style>
            </div>
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add contact person"
        open={contactOpen}
        onCancel={() => {
          setContactOpen(false);
          setSelectedCompanyCustomerIds([]);
        }}
        onOk={() => void saveNewContact()}
        okText={
          selectedCompanyCustomerIds.length > 1
            ? `Add ${selectedCompanyCustomerIds.length} contacts`
            : 'Add contact'
        }
        confirmLoading={contactSaving}
        destroyOnClose
        width={560}
      >
        <p style={{ marginTop: 0, color: '#6b7280' }}>
          Company: <strong>{partyLabelFromKey(selectedPartyKey)}</strong>
        </p>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <label style={{ fontWeight: 600 }}>Customers at this company</label>
            <Button
              type="link"
              size="small"
              disabled={!companyCustomerOptions.length}
              onClick={() =>
                setSelectedCompanyCustomerIds(companyCustomerOptions.map((c) => c.id))
              }
            >
              Select all
            </Button>
          </div>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={
              companyCustomerOptions.length
                ? 'Select one or more customers'
                : 'No customers found for this company'
            }
            style={{ width: '100%' }}
            value={selectedCompanyCustomerIds}
            options={companyCustomerOptions.map((c) => ({
              value: c.id,
              label: `${c.label} <${c.email}>${c.linked ? '' : ' (not linked)'}`,
            }))}
            onChange={(ids: number[]) => {
              setSelectedCompanyCustomerIds(ids || []);
              if (ids?.length === 1) {
                const person = companyCustomerOptions.find((c) => c.id === ids[0]);
                if (person) {
                  contactForm.setFieldsValue({
                    fullName: person.label,
                    email: person.email,
                    phone: person.phone || '',
                    position: person.position || '',
                    landLine: person.landLine || '',
                  });
                }
              }
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
            Pick existing customers, or leave empty and enter a new contact below.
          </div>
        </div>
        <Form form={contactForm} layout="vertical">
          <Form.Item
            name="fullName"
            label="Name"
            rules={
              selectedCompanyCustomerIds.length
                ? []
                : [{ required: true, message: 'Name is required' }]
            }
          >
            <Input
              placeholder="Contact name"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={
              selectedCompanyCustomerIds.length
                ? []
                : [
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Enter a valid email' },
                  ]
            }
          >
            <Input
              type="email"
              placeholder="name@company.com"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={
              selectedCompanyCustomerIds.length
                ? []
                : [{ required: true, message: 'Phone is required' }]
            }
          >
            <Input
              placeholder="Mobile phone"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
          <Form.Item name="landLine" label="Landline">
            <Input
              placeholder="Office / landline (optional)"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
          <Form.Item
            name="position"
            label="Position"
            rules={
              selectedCompanyCustomerIds.length
                ? []
                : [{ required: true, message: 'Position is required' }]
            }
          >
            <Input
              placeholder="e.g. Facilities Manager"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
          <Form.Item name="comments" label="Comments">
            <Input.TextArea
              rows={3}
              placeholder="Notes about this contact (optional)"
              disabled={selectedCompanyCustomerIds.length > 0}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Contacts — ${partyLabelFromKey(selectedPartyKey)}`}
        open={manageContactsOpen}
        onCancel={() => setManageContactsOpen(false)}
        footer={[
          <Button key="add" icon={<PlusOutlined />} onClick={openAddContact}>
            Add contact
          </Button>,
          <Button key="done" type="primary" onClick={() => setManageContactsOpen(false)}>
            Done
          </Button>,
        ]}
        width={520}
        destroyOnClose
      >
        {partyContacts.length ? (
          <ul className="consumables-manage-contacts">
            {partyContacts.map((c) => (
              <li key={`${c.userId || 'x'}-${c.email}`}>
                <div className="consumables-manage-contacts__meta">
                  <strong>{c.label}</strong>
                  <span>{c.email}</span>
                  {!c.canDelete ? (
                    <em>Company email — cannot delete</em>
                  ) : null}
                </div>
                {c.canDelete && c.userId ? (
                  <Popconfirm
                    title={
                      <span>
                        Remove {c.label} from this company&apos;s contacts?
                        <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                          Their portal login stays active. Only this contact list is updated.
                        </div>
                      </span>
                    }
                    okText="Remove from list"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancel"
                    onConfirm={() =>
                      void deleteContactPerson(c.userId!, c.email, c.label)
                    }
                  >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                      Remove
                    </Button>
                  </Popconfirm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: '#6b7280' }}>
            No contacts for this company yet. Use Add contact to create one.
          </p>
        )}
      </Modal>

      <Modal
        title={viewDelivery?.subject || 'Delivery'}
        open={!!viewDelivery}
        width={720}
        onCancel={() => {
          setViewDelivery(null);
          if (fromMessages) goBackToMessages();
        }}
        footer={[
          fromMessages ? (
            <Button
              key="back-messages"
              icon={<ArrowLeftOutlined />}
              onClick={goBackToMessages}
            >
              Back to messages
            </Button>
          ) : (
            <Button key="close" onClick={() => setViewDelivery(null)}>
              Close
            </Button>
          ),
          viewDelivery?.deletedAt ? (
            <Button
              key="restore"
              type="primary"
              icon={<UndoOutlined />}
              onClick={() => restoreDelivery(viewDelivery.id)}
            >
              Restore
            </Button>
          ) : viewDelivery?.emailStatus === 'failed' ? (
            <Button
              key="retry"
              type="primary"
              danger
              icon={<SendOutlined />}
              onClick={() => startEditOrder(viewDelivery, { failedRetry: true })}
            >
              Fix and retry
            </Button>
          ) : viewDelivery && !fromMessages ? (
            <Space key="actions">
              {viewDelivery.emailStatus === 'sent' ? (
                <Button
                  icon={<SendOutlined />}
                  onClick={() => void resendDeliveryOnly(viewDelivery)}
                >
                  Resend email
                </Button>
              ) : null}
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => startEditOrder(viewDelivery)}
              >
                Edit{viewDelivery.emailStatus === 'pending' ? '' : ' and Resend'}
              </Button>
            </Space>
          ) : null,
        ]}
      >
        {viewDelivery ? (
          <div>
            {viewDelivery.emailStatus === 'failed' && viewDelivery.emailError ? (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message="Email send failed"
                description={viewDelivery.emailError}
              />
            ) : null}
            <p>
              <strong>Supplier:</strong> {viewDelivery.companyName || viewDelivery.customerName}
            </p>
            {viewDelivery.siteName ? (
              <p>
                <strong>Site:</strong> {viewDelivery.siteName}
              </p>
            ) : null}
            <p>
              <strong>Email:</strong> {viewDelivery.emailedTo || '-'} ({viewDelivery.emailStatus})
            </p>
            {viewDelivery.emailedCc ? (
              <p>
                <strong>CC:</strong> {viewDelivery.emailedCc}
              </p>
            ) : null}
            {viewDelivery.notes ? (
              <p>
                <strong>Notes:</strong> {viewDelivery.notes}
              </p>
            ) : null}
            <Table
              size="small"
              pagination={false}
              rowKey={(_, index) => `view-${index}`}
              dataSource={deliveryItems(viewDelivery)}
              columns={[
                { title: 'Item', dataIndex: 'name' },
                { title: 'Qty', dataIndex: 'quantity', width: 80 },
                { title: 'Unit', dataIndex: 'unit', width: 90 },
                {
                  title: 'Stock code',
                  dataIndex: 'stockCode',
                  width: 110,
                  render: (value) => value || '-',
                },
              ]}
            />
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Activity</h4>
            <Table
              size="small"
              pagination={false}
              locale={{ emptyText: 'No activity yet' }}
              rowKey="id"
              dataSource={viewDelivery.events || []}
              columns={[
                {
                  title: 'When',
                  dataIndex: 'createdAt',
                  width: 160,
                  render: (value) => (value ? moment(value).format(dateTimeFormat) : '-'),
                },
                {
                  title: 'Action',
                  dataIndex: 'action',
                  width: 110,
                  render: (value) => (
                    <Tag color={value === 'send_failed' ? 'red' : value === 'send_ok' ? 'green' : 'default'}>
                      {eventActionLabel(value)}
                    </Tag>
                  ),
                },
                {
                  title: 'By',
                  dataIndex: 'actorName',
                  width: 120,
                  ellipsis: true,
                },
                {
                  title: 'Detail',
                  key: 'detail',
                  ellipsis: true,
                  render: (_, event) => {
                    const bits = [event.detail, event.emailedTo ? `To ${event.emailedTo}` : '']
                      .filter(Boolean)
                      .join(' - ');
                    return bits || '-';
                  },
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>
      </div>
    </Layout>
  );
}
