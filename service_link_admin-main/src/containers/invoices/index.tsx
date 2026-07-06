import Layout from '@app/components/layout/Layout';
import { dateFormat, dateTimeFormat } from '@app/config/data.config';
import urlConfig from '@app/config/site.config';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  PlusOutlined,
  SearchOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
  Tabs,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import dashboardActions from '@app/redux/dashboard/actions';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';

const { RangePicker } = DatePicker;

const INVOICE_SORT_FIELDS = new Set([
  'createdAt',
  'sender',
  'companyName',
  'title',
  'files',
]);

type InvoiceFilters = {
  keyword: string;
  startDate: string;
  endDate: string;
};

type InvoiceListSort = {
  orderBy: string;
  orderValue: string;
};

function invoiceColumnSortOrder(listSort: InvoiceListSort, field: string): SortOrder | undefined {
  if (listSort.orderBy !== field) return undefined;
  return listSort.orderValue === 'ASC' ? 'ascend' : 'descend';
}

function saveBlobAsFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

type InvoiceRow = {
  id: number;
  customerId: number;
  customerName: string;
  companyName: string;
  title: string;
  notes?: string | null;
  attachFiles: string;
  createdAt: string;
  createdUser?: {
    fullName?: string;
    username?: string;
  };
};

function invoiceSenderLabel(r: InvoiceRow): string {
  return (
    String(r.createdUser?.fullName || '').trim() ||
    String(r.createdUser?.username || '').trim() ||
    '—'
  );
}

type CompanyOption = {
  id: number;
  name?: string;
  companyName?: string;
};

function companyLabel(c: CompanyOption): string {
  return String(c.name || c.companyName || '').trim() || `Company #${c.id}`;
}

function normalizeCompanyKey(name: string | undefined | null): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildCompanyCustomerMap(
  companies: CompanyOption[],
  users: Array<{
    id: number;
    customerInfo?: {
      companyId?: number | null;
      companyName?: string;
      company?: { id?: number; name?: string };
    };
  }>,
): Record<number, number> {
  const map: Record<number, number> = {};
  const nameToCompanyId = new Map<string, number>();
  for (const c of companies) {
    const key = normalizeCompanyKey(c.name || c.companyName);
    if (key) nameToCompanyId.set(key, +c.id);
  }

  for (const u of users) {
    let companyId = +(u.customerInfo?.companyId ?? u.customerInfo?.company?.id ?? 0);
    if (!companyId) {
      const key = normalizeCompanyKey(
        u.customerInfo?.companyName || u.customerInfo?.company?.name,
      );
      if (key) companyId = nameToCompanyId.get(key) || 0;
    }
    if (companyId && !map[companyId]) {
      map[companyId] = +u.id;
    }
  }
  return map;
}

function parseFileUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function findCompanyIdForInvoice(
  row: InvoiceRow,
  companies: CompanyOption[],
  companyToCustomerId: Record<number, number>,
): number | undefined {
  const byCustomer = Object.entries(companyToCustomerId).find(
    ([, userId]) => +userId === +row.customerId,
  );
  if (byCustomer) return +byCustomer[0];
  const key = normalizeCompanyKey(row.companyName || row.customerName);
  if (!key) return undefined;
  return companies.find((c) => normalizeCompanyKey(c.name || c.companyName) === key)?.id;
}

function fileLabel(url: string): string {
  const parts = String(url).split('/');
  return decodeURIComponent(parts[parts.length - 1] || 'file');
}

function uploadListFromUrls(urls: string[]) {
  return urls.map((url, index) => ({
    uid: `file-${index}-${url}`,
    name: fileLabel(url),
    status: 'done' as const,
    url,
  }));
}

function downloadInvoiceFiles(row: InvoiceRow) {
  const urls = parseFileUrls(row.attachFiles);
  if (!urls.length) {
    message.warning('No files to download');
    return;
  }
  const token = localStorage.getItem('id_token') || '';
  const apiBase = String(urlConfig.orderApiURL || '').replace(/\/+$/, '');

  void (async () => {
    for (let index = 0; index < urls.length; index += 1) {
      const fallbackName = fileLabel(urls[index]);
      try {
        const response = await fetch(
          `${apiBase}/v1/invoices/${row.id}/download?fileIndex=${index}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error('Download failed');
        }
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Empty file');
        }
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/i);
        const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
        saveBlobAsFile(blob, filename);
        if (index < urls.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      } catch {
        message.error(`Could not download ${fallbackName}`);
      }
    }
  })();
}

type InvoiceListTab = 'active' | 'deleted';

const renderInvoiceActions = (
  row: InvoiceRow,
  opts: {
    onView: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
    isDeletedTab: boolean;
    isAdmin: boolean;
  },
) => {
  const deleteTitle =
    opts.isDeletedTab && opts.isAdmin
      ? 'Permanently delete this invoice?'
      : opts.isDeletedTab && !opts.isAdmin
        ? 'Remove this invoice from Deleted permanently?'
        : opts.isAdmin
          ? 'Move this invoice to Deleted?'
          : 'The invoice moves to Deleted. You can restore it from the Deleted tab.';
  const deleteOkText =
    opts.isDeletedTab && opts.isAdmin
      ? 'Delete permanently'
      : opts.isDeletedTab && !opts.isAdmin
        ? 'Remove permanently'
        : opts.isAdmin
          ? 'Move to Deleted'
          : 'Yes';

  return (
  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
    <Tooltip title="View">
      <Button
        type="link"
        icon={<EyeOutlined />}
        aria-label="View"
        onClick={opts.onView}
      />
    </Tooltip>
    {opts.onEdit && !opts.isDeletedTab ? (
      <Tooltip title="Edit">
        <Button
          type="link"
          icon={<EditOutlined />}
          aria-label="Edit"
          onClick={opts.onEdit}
        />
      </Tooltip>
    ) : null}
    <Tooltip title="Download">
      <Button
        type="link"
        icon={<DownloadOutlined />}
        aria-label="Download"
        disabled={!parseFileUrls(row.attachFiles).length}
        onClick={() => downloadInvoiceFiles(row)}
      />
    </Tooltip>
    {opts.onRestore && opts.isDeletedTab ? (
      <Popconfirm
        title="Restore this invoice to the list?"
        okText="Restore"
        cancelText="No"
        onConfirm={opts.onRestore}
      >
        <Tooltip title="Restore">
          <Button type="link" icon={<UndoOutlined />} aria-label="Restore" />
        </Tooltip>
      </Popconfirm>
    ) : null}
    {opts.onDelete ? (
      <Popconfirm title={deleteTitle} okText={deleteOkText} cancelText="No" onConfirm={opts.onDelete}>
        <Button type="link" danger icon={<DeleteOutlined />} aria-label="Delete" />
      </Popconfirm>
    ) : null}
  </div>
  );
};

const InvoicesPage: React.FC = () => {
  const dispatch = useDispatch();
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;
  const isAdmin = profileType === userType.ADMIN;
  const isCustomer = profileType === userType.CUSTOMER;
  const showInvoiceDeletedTabs = isAdmin || isCustomer;

  const [listTab, setListTab] = useState<InvoiceListTab>('active');
  const [deletedCount, setDeletedCount] = useState(0);
  const isDeletedTab = showInvoiceDeletedTabs && listTab === 'deleted';
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRow, setEditingRow] = useState<InvoiceRow | null>(null);
  const [viewRow, setViewRow] = useState<InvoiceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyToCustomerId, setCompanyToCustomerId] = useState<Record<number, number>>({});
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [uploadList, setUploadList] = useState<any[]>([]);
  const [filters, setFilters] = useState<InvoiceFilters>({
    keyword: '',
    startDate: '',
    endDate: '',
  });
  const [listSort, setListSort] = useState<InvoiceListSort>({
    orderBy: 'createdAt',
    orderValue: 'DESC',
  });
  const [uploadForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  const loadDeletedCount = useCallback(async () => {
    if (!showInvoiceDeletedTabs) return;
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.INVOICES}/deleted/count`,
        'GET',
        {
          keyword: filters.keyword,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      );
      setDeletedCount(+res?.data || 0);
    } catch {
      setDeletedCount(0);
    }
  }, [showInvoiceDeletedTabs, filters.keyword, filters.startDate, filters.endDate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.INVOICES, 'GET', {
        page,
        limit,
        orderBy: listSort.orderBy,
        orderValue: listSort.orderValue,
        keyword: filters.keyword,
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: isDeletedTab ? 'deleted' : 'active',
      });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not load invoices');
        setRows([]);
        setCount(0);
        return;
      }
      setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setCount(+res?.data?.count || 0);
    } catch {
      message.error('Could not load invoices');
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, listSort, isDeletedTab]);

  useEffect(() => {
    if (showInvoiceDeletedTabs) void loadDeletedCount();
  }, [showInvoiceDeletedTabs, loadDeletedCount]);

  useEffect(() => {
    if (!loading && showInvoiceDeletedTabs) void loadDeletedCount();
  }, [loading, showInvoiceDeletedTabs, loadDeletedCount]);

  useEffect(() => {
    setPage(1);
  }, [listTab]);

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    const range = values.dateRange;
    setFilters({
      keyword: String(values.keyword || '').trim(),
      startDate: range?.[0] ? moment(range[0]).format('YYYY-MM-DD') : '',
      endDate: range?.[1] ? moment(range[1]).format('YYYY-MM-DD') : '',
    });
    setPage(1);
  };

  const onTableChange = (pagination: any, _tableFilters: any, sorter: any, extra?: any) => {
    if (extra?.action === 'paginate') {
      setPage(pagination.current || 1);
      setLimit(pagination.pageSize || limit);
      return;
    }
    if (extra?.action !== 'sort') return;

    const colSorter = Array.isArray(sorter)
      ? [...sorter].reverse().find((s) => s?.order) ?? sorter[sorter.length - 1]
      : sorter;
    const field = String(colSorter?.key ?? '');
    if (!INVOICE_SORT_FIELDS.has(field)) return;

    setListSort({
      orderBy: field,
      orderValue: colSorter?.order === 'ascend' ? 'ASC' : 'DESC',
    });
    setPage(1);
  };

  const loadCompanies = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [companiesRes, usersRes] = await Promise.all([
        callAPIAsync(serviceType.COMMON, `${endPoint.COMPANIES}/options`, 'GET', null),
        callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
          type: userType.CUSTOMER,
          limit: 500,
          page: 1,
          keyword: '',
          orderBy: 'fullName',
          orderValue: 'ASC',
        }),
      ]);

      if (companiesRes?.code !== 1) {
        message.error(companiesRes?.message || 'Could not load companies');
        setCompanies([]);
        setCompanyToCustomerId({});
        return;
      }

      const companyList = Array.isArray(companiesRes?.data) ? companiesRes.data : [];
      const users = usersRes?.code === 1 && Array.isArray(usersRes?.data?.rows)
        ? usersRes.data.rows
        : [];

      setCompanies(companyList);
      setCompanyToCustomerId(buildCompanyCustomerMap(companyList, users));
    } catch {
      message.error('Could not load companies');
      setCompanies([]);
      setCompanyToCustomerId({});
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (!isCustomer) return;
    void (async () => {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.INVOICES}/markAllInvoicesOpened`,
        'PATCH',
        {},
      );
      if (res?.code === 1) {
        dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
      }
    })();
  }, [dispatch, isCustomer]);

  const companyOptions = useMemo(
    () =>
      companies
        .filter((c) => companyToCustomerId[+c.id])
        .sort((a, b) => companyLabel(a).localeCompare(companyLabel(b)))
        .map((c) => ({
          value: c.id,
          label: companyLabel(c),
        })),
    [companies, companyToCustomerId],
  );

  const openCreate = () => {
    void loadCompanies();
    setModalMode('create');
    setEditingRow(null);
    uploadForm.resetFields();
    setFileUrls([]);
    setUploadList([]);
    setModalOpen(true);
  };

  const openEdit = (row: InvoiceRow) => {
    void loadCompanies();
    const urls = parseFileUrls(row.attachFiles);
    setModalMode('edit');
    setEditingRow(row);
    setFileUrls(urls);
    setUploadList(uploadListFromUrls(urls));
    uploadForm.setFieldsValue({
      companyId: findCompanyIdForInvoice(row, companies, companyToCustomerId),
      title: row.title,
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setModalMode('create');
    uploadForm.resetFields();
    setFileUrls([]);
    setUploadList([]);
  };

  const uploadFile = async (options: any) => {
    const { onSuccess, onError, onProgress, file } = options;
    const raw = file as File;
    try {
      const response: any = await callAPIAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        'POST',
        { file: raw },
        {
          onUploadProgress: (pct: number) => onProgress?.({ percent: pct }),
        },
        true,
      );
      if (response?.code === 1 && response?.data) {
        setFileUrls((prev) => [...prev, response.data]);
        onSuccess?.(response, raw);
        message.success(`${raw.name} uploaded`);
      } else {
        onError?.(new Error(response?.message || 'Upload failed'));
        message.error(response?.message || 'Upload failed');
      }
    } catch (e) {
      onError?.(e as Error);
      message.error('Upload failed');
    }
  };

  const onSave = async () => {
    const values = await uploadForm.validateFields();
    if (!fileUrls.length) {
      message.warning('Upload at least one file');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'edit' && editingRow) {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.INVOICES}/${editingRow.id}`,
          'PATCH',
          {
            title: values.title,
            notes: values.notes || '',
            attachFiles: JSON.stringify(fileUrls),
          },
        );
        if (res?.code !== 1) {
          message.error(res?.message || 'Could not update invoice');
          return;
        }
      message.success('Invoice updated');
      closeInvoiceModal();
      void load();
      dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
      return;
      }

      const companyId = +values.companyId;
      const company = companies.find((c) => +c.id === companyId);
      const customerId = companyToCustomerId[companyId];
      if (!customerId) {
        message.error('No client account is linked to this company');
        return;
      }
      const companyName = company ? companyLabel(company) : '';
      const res = await callAPIAsync(serviceType.COMMON, endPoint.INVOICES, 'POST', {
        customerId,
        customerName: companyName,
        companyName,
        title: values.title,
        notes: values.notes || '',
        attachFiles: JSON.stringify(fileUrls),
      });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save invoice');
        return;
      }
      message.success('Invoice files published to client');
      closeInvoiceModal();
      dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
      if (page !== 1) {
        setPage(1);
      } else {
        void load();
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.INVOICES}/${id}`,
      'DELETE',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete');
      return;
    }
    message.success(
      isDeletedTab && isAdmin
        ? 'Invoice permanently deleted'
        : isDeletedTab && isCustomer
          ? 'Invoice removed from Deleted'
          : isAdmin
            ? 'Invoice moved to Deleted'
            : 'Invoice moved to Deleted',
    );
    void load();
    void loadDeletedCount();
    dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
  };

  const onRestore = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.INVOICES}/${id}/restore`,
      'PATCH',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore');
      return;
    }
    message.success(isAdmin ? 'Invoice restored to list' : 'Invoice restored');
    void load();
    void loadDeletedCount();
    dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
  };

  const columns: ColumnsType<InvoiceRow> = [
    {
      title: 'Date',
      key: 'createdAt',
      dataIndex: 'createdAt',
      width: 160,
      sorter: true,
      sortOrder: invoiceColumnSortOrder(listSort, 'createdAt'),
      render: (v: string) =>
        v ? moment(v).utcOffset(600).format(dateTimeFormat) : '—',
    },
    {
      title: 'Sender',
      key: 'sender',
      width: 160,
      ellipsis: true,
      sorter: true,
      sortOrder: invoiceColumnSortOrder(listSort, 'sender'),
      render: (_: unknown, r: InvoiceRow) => invoiceSenderLabel(r),
    },
    ...(isAdmin
      ? [
          {
            title: 'Company',
            key: 'companyName',
            dataIndex: 'companyName',
            sorter: true,
            sortOrder: invoiceColumnSortOrder(listSort, 'companyName'),
            render: (_: unknown, r: InvoiceRow) =>
              r.companyName || r.customerName || '—',
          },
        ]
      : []),
    {
      title: 'Title',
      key: 'title',
      dataIndex: 'title',
      ellipsis: true,
      sorter: true,
      sortOrder: invoiceColumnSortOrder(listSort, 'title'),
    },
    {
      title: 'Files',
      key: 'files',
      sorter: true,
      sortOrder: invoiceColumnSortOrder(listSort, 'files'),
      render: (_: unknown, r: InvoiceRow) => {
        const urls = parseFileUrls(r.attachFiles);
        if (!urls.length) return '—';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {urls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <FileOutlined /> {fileLabel(url)}
              </a>
            ))}
          </div>
        );
      },
    },
    ...(isAdmin || isCustomer
      ? [
          {
            title: 'Action',
            key: 'action',
            width: isDeletedTab ? 150 : isAdmin ? 160 : 120,
            render: (_: unknown, r: InvoiceRow) =>
              renderInvoiceActions(r, {
                onView: () => setViewRow(r),
                onEdit: isAdmin ? () => openEdit(r) : undefined,
                onDelete: () => onDelete(r.id),
                onRestore: () => onRestore(r.id),
                isDeletedTab,
                isAdmin,
              }),
          },
        ]
      : []),
  ];

  return (
    <Layout title="Invoices">
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', color: '#595959', maxWidth: 720 }}>
          {isAdmin
            ? 'Upload invoice PDFs and other files for each customer. Clients in the same organisation can access them from their dashboard.'
            : 'View and download invoice files shared by Service360.'}
        </p>

        <Form form={filterForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={[16, 8]} align="bottom">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="keyword" label="Search by name" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Title, company, sender..."
                  allowClear
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={10} lg={8}>
              <Form.Item name="dateRange" label="Date" style={{ marginBottom: 0 }}>
                <RangePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={6} lg={isAdmin ? 10 : 4}>
              <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearch}
                    loading={loading}
                  >
                    Search
                  </Button>
                  {isAdmin && !isDeletedTab ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      Upload invoice
                    </Button>
                  ) : null}
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      {showInvoiceDeletedTabs ? (
        <Tabs
          activeKey={listTab}
          onChange={(key) => setListTab(key as InvoiceListTab)}
          style={{ marginBottom: 12 }}
          items={[
            { key: 'active', label: 'Invoices' },
            { key: 'deleted', label: `Deleted (${deletedCount})` },
          ]}
        />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        onChange={onTableChange}
        pagination={{
          current: page,
          pageSize: limit,
          total: count,
          showSizeChanger: true,
        }}
      />

      <Modal
        title="Invoice details"
        open={!!viewRow}
        onCancel={() => setViewRow(null)}
        footer={
          <Button type="primary" onClick={() => setViewRow(null)}>
            Close
          </Button>
        }
        width={560}
      >
        {viewRow ? (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Date">
                {viewRow.createdAt
                  ? moment(viewRow.createdAt).utcOffset(600).format(dateTimeFormat)
                  : '—'}
              </Descriptions.Item>
              {isAdmin ? (
                <Descriptions.Item label="Company">
                  {viewRow.companyName || viewRow.customerName || '—'}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="Title">{viewRow.title || '—'}</Descriptions.Item>
              <Descriptions.Item label="Sender">
                {invoiceSenderLabel(viewRow)}
              </Descriptions.Item>
              {viewRow.notes ? (
                <Descriptions.Item label="Notes">{viewRow.notes}</Descriptions.Item>
              ) : null}
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <strong>Files</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {parseFileUrls(viewRow.attachFiles).length ? (
                  parseFileUrls(viewRow.attachFiles).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileOutlined /> {fileLabel(url)}
                    </a>
                  ))
                ) : (
                  '—'
                )}
              </div>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        title={modalMode === 'edit' ? 'Edit invoice' : 'Upload invoice files'}
        open={modalOpen}
        onCancel={closeInvoiceModal}
        onOk={() => void onSave()}
        confirmLoading={saving}
        okText={modalMode === 'edit' ? 'Save changes' : 'Publish to client'}
        width={560}
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical">
          {modalMode === 'edit' ? (
            <Form.Item label="Company">
              <Input
                disabled
                value={editingRow?.companyName || editingRow?.customerName || '—'}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="companyId"
              label="Company"
              rules={[{ required: true, message: 'Select a company' }]}
            >
              <Select
                showSearch
                placeholder="Select company"
                options={companyOptions}
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Enter a title' }]}
          >
            <Input placeholder="e.g. Invoice June 2026" maxLength={500} />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Form.Item label="Files" required>
            <Upload
              multiple
              customRequest={uploadFile}
              fileList={uploadList}
              onChange={({ fileList }) => {
                setUploadList(fileList);
                const urls = fileList
                  .filter((f) => f.status === 'done')
                  .map((f) => String(f.url || f.response?.data || ''))
                  .filter(Boolean);
                setFileUrls(urls);
              }}
              onRemove={(file) => {
                const url = String(file.url || file.response?.data || '');
                if (url) {
                  setFileUrls((prev) => prev.filter((item) => item !== url));
                }
                return true;
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            >
              <Button icon={<UploadOutlined />}>Select PDF or other files</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default InvoicesPage;
