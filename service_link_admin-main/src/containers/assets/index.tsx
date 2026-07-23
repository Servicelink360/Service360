import Layout from '@app/components/layout/Layout';
import { dateFormat, dateTimeFormat } from '@app/config/data.config';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  AutoComplete,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Dropdown,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';

type AssetListTab = 'active' | 'deleted';

type AssetFilters = {
  keyword: string;
  companyId?: number;
  assetStatus?: string;
};

type AssetListSort = {
  orderBy: string;
  orderValue: string;
};

type AssetRow = {
  id: number;
  name: string;
  assetTag?: string | null;
  category?: string | null;
  status: string;
  companyId: number;
  companyName: string;
  siteId?: number | null;
  siteName?: string | null;
  locationDetail?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installDate?: string | null;
  warrantyExpiry?: string | null;
  condition?: string | null;
  notes?: string | null;
  attachFiles?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CompanyOption = { id: number; name?: string; companyName?: string };
type SiteOption = { id: number; name?: string };

const ASSET_SORT_FIELDS = new Set([
  'createdAt',
  'name',
  'assetTag',
  'category',
  'status',
  'companyName',
  'siteName',
  'condition',
  'updatedAt',
]);

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'disposed', label: 'Disposed' },
];

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'critical', label: 'Critical' },
];

function companyLabel(c: CompanyOption): string {
  return String(c.name || c.companyName || '').trim() || `Company #${c.id}`;
}

function assetColumnSortOrder(listSort: AssetListSort, field: string): SortOrder | undefined {
  if (listSort.orderBy !== field) return undefined;
  return listSort.orderValue === 'ASC' ? 'ascend' : 'descend';
}

function statusColor(status: string): string {
  switch (String(status || '').toLowerCase()) {
    case 'maintenance':
      return 'orange';
    case 'retired':
      return 'default';
    case 'disposed':
      return 'red';
    default:
      return 'green';
  }
}

const AssetsPage: React.FC = () => {
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const isAdmin = profile ? +profile.type === userType.ADMIN : false;

  const [listTab, setListTab] = useState<AssetListTab>('active');
  const [deletedCount, setDeletedCount] = useState(0);
  const isDeletedTab = listTab === 'deleted';
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [filters, setFilters] = useState<AssetFilters>({ keyword: '' });
  const [listSort, setListSort] = useState<AssetListSort>({
    orderBy: 'createdAt',
    orderValue: 'DESC',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRow, setEditingRow] = useState<AssetRow | null>(null);
  const [viewRow, setViewRow] = useState<AssetRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  const loadDeletedCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.ASSETS}/deleted/count`,
        'GET',
        null,
      );
      setDeletedCount(+res?.data || 0);
    } catch {
      setDeletedCount(0);
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.ASSETS, 'GET', {
        page,
        limit,
        orderBy: listSort.orderBy,
        orderValue: listSort.orderValue,
        keyword: filters.keyword,
        companyId: filters.companyId || undefined,
        assetStatus: filters.assetStatus || undefined,
        status: isDeletedTab ? 'deleted' : 'active',
      });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not load assets');
        setRows([]);
        setCount(0);
        return;
      }
      setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setCount(+res?.data?.count || 0);
    } catch {
      message.error('Could not load assets');
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, limit, filters, listSort, isDeletedTab]);

  const loadCompanies = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.COMPANIES}/options`,
        'GET',
        null,
      );
      if (res?.code === 1 && Array.isArray(res.data)) {
        setCompanies(res.data);
      } else {
        setCompanies([]);
      }
    } catch {
      setCompanies([]);
    }
  }, [isAdmin]);

  const loadSites = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/getSites`,
        'GET',
        null,
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setSites(
        list
          .map((s: any) => ({ id: +s.id, name: String(s.name || '').trim() }))
          .filter((s: SiteOption) => s.id && s.name),
      );
    } catch {
      setSites([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (isAdmin) void loadDeletedCount();
  }, [isAdmin, loadDeletedCount]);

  useEffect(() => {
    if (!loading && isAdmin) void loadDeletedCount();
  }, [loading, isAdmin, loadDeletedCount]);

  useEffect(() => {
    setPage(1);
  }, [listTab]);

  const companyOptions = useMemo(
    () =>
      companies
        .slice()
        .sort((a, b) => companyLabel(a).localeCompare(companyLabel(b)))
        .map((c) => ({ value: +c.id, label: companyLabel(c) })),
    [companies],
  );

  const siteNameOptions = useMemo(
    () =>
      sites
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map((s) => ({ value: String(s.name), label: String(s.name), id: s.id })),
    [sites],
  );

  const resolveSiteFromName = (rawName: string | undefined | null) => {
    const siteName = String(rawName || '').trim();
    if (!siteName) return { siteId: null as number | null, siteName: null as string | null };
    const match = sites.find(
      (s) => String(s.name || '').trim().toLowerCase() === siteName.toLowerCase(),
    );
    return {
      siteId: match ? +match.id : null,
      siteName,
    };
  };

  const handleSearch = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      keyword: String(values.keyword || '').trim(),
      companyId: values.companyId ? +values.companyId : undefined,
      assetStatus: values.assetStatus || undefined,
    });
    setPage(1);
  };

  const onTableChange = (pagination: any, _filters: any, sorter: any, extra?: any) => {
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
    if (!ASSET_SORT_FIELDS.has(field)) return;
    setListSort({
      orderBy: field,
      orderValue: colSorter?.order === 'ascend' ? 'ASC' : 'DESC',
    });
    setPage(1);
  };

  const openCreate = () => {
    void loadSites();
    setModalMode('create');
    setEditingRow(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', condition: 'good', siteId: undefined, siteName: '' });
    setModalOpen(true);
  };

  const openEdit = (row: AssetRow) => {
    void loadSites();
    setModalMode('edit');
    setEditingRow(row);
    form.setFieldsValue({
      name: row.name,
      assetTag: row.assetTag || '',
      category: row.category || '',
      status: row.status || 'active',
      companyId: row.companyId,
      siteId: row.siteId || undefined,
      siteName: row.siteName || '',
      locationDetail: row.locationDetail || '',
      manufacturer: row.manufacturer || '',
      model: row.model || '',
      serialNumber: row.serialNumber || '',
      installDate: row.installDate ? moment(row.installDate) : null,
      warrantyExpiry: row.warrantyExpiry ? moment(row.warrantyExpiry) : null,
      condition: row.condition || undefined,
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setModalMode('create');
    form.resetFields();
  };

  const onSave = async () => {
    const values = await form.validateFields();
    const company = companies.find((c) => +c.id === +values.companyId);
    const site = resolveSiteFromName(values.siteName);
    const payload = {
      name: String(values.name || '').trim(),
      assetTag: String(values.assetTag || '').trim() || null,
      category: String(values.category || '').trim() || null,
      status: values.status || 'active',
      companyId: +values.companyId,
      companyName: company ? companyLabel(company) : '',
      siteId: site.siteId,
      siteName: site.siteName,
      locationDetail: String(values.locationDetail || '').trim() || null,
      manufacturer: String(values.manufacturer || '').trim() || null,
      model: String(values.model || '').trim() || null,
      serialNumber: String(values.serialNumber || '').trim() || null,
      installDate: values.installDate ? moment(values.installDate).format('YYYY-MM-DD') : null,
      warrantyExpiry: values.warrantyExpiry
        ? moment(values.warrantyExpiry).format('YYYY-MM-DD')
        : null,
      condition: values.condition || null,
      notes: String(values.notes || '').trim() || null,
    };

    setSaving(true);
    try {
      if (modalMode === 'edit' && editingRow) {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.ASSETS}/${editingRow.id}`,
          'PATCH',
          payload,
        );
        if (res?.code !== 1) {
          message.error(res?.message || 'Could not update asset');
          return;
        }
        message.success('Asset updated');
      } else {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.ASSETS, 'POST', payload);
        if (res?.code !== 1) {
          message.error(res?.message || 'Could not create asset');
          return;
        }
        message.success('Asset created');
      }
      closeModal();
      void load();
      void loadDeletedCount();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.ASSETS}/${id}`,
      'DELETE',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete');
      return;
    }
    message.success(
      isDeletedTab ? 'Asset permanently deleted' : 'Asset moved to Deleted',
    );
    void load();
    void loadDeletedCount();
  };

  const onRestore = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.ASSETS}/${id}/restore`,
      'PATCH',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore');
      return;
    }
    message.success('Asset restored');
    void load();
    void loadDeletedCount();
  };

  const onChangeStatus = async (row: AssetRow, nextStatus: string) => {
    const status = String(nextStatus || '').trim().toLowerCase();
    if (!status || status === String(row.status || '').toLowerCase()) return;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.ASSETS}/${row.id}`,
      'PATCH',
      { status },
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not update status');
      return;
    }
    message.success(`Status set to ${status}`);
    setRows((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, status } : item)),
    );
    if (viewRow?.id === row.id) {
      setViewRow({ ...viewRow, status });
    }
  };

  const statusMenuItems = (row: AssetRow): MenuProps['items'] =>
    STATUS_OPTIONS.map((opt) => ({
      key: opt.value,
      label: opt.label,
      disabled: String(row.status || '').toLowerCase() === opt.value,
      onClick: () => void onChangeStatus(row, opt.value),
    }));

  const columns: ColumnsType<AssetRow> = [
    {
      title: 'Tag',
      key: 'assetTag',
      dataIndex: 'assetTag',
      width: 110,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'assetTag'),
      render: (v: string) => v || '—',
    },
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name',
      ellipsis: true,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'name'),
    },
    {
      title: 'Category',
      key: 'category',
      dataIndex: 'category',
      width: 140,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'category'),
      render: (v: string) => v || '—',
    },
    {
      title: 'Company',
      key: 'companyName',
      dataIndex: 'companyName',
      ellipsis: true,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'companyName'),
    },
    {
      title: 'Site',
      key: 'siteName',
      dataIndex: 'siteName',
      ellipsis: true,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'siteName'),
      render: (v: string) => v || '—',
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      width: 130,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'status'),
      onCell: () => ({
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }),
      render: (v: string, r: AssetRow) => {
        const label = String(v || 'active').toUpperCase();
        if (isDeletedTab) {
          return <Tag color={statusColor(v)}>{label}</Tag>;
        }
        return (
          <Dropdown
            trigger={['click']}
            menu={{ items: statusMenuItems(r) }}
            placement="bottomLeft"
          >
            <Tag
              color={statusColor(v)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Click to change status"
            >
              {label}
            </Tag>
          </Dropdown>
        );
      },
    },
    {
      title: 'Condition',
      key: 'condition',
      dataIndex: 'condition',
      width: 110,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'condition'),
      render: (v: string) => (v ? String(v).replace(/^\w/, (c) => c.toUpperCase()) : '—'),
    },
    {
      title: 'Updated',
      key: 'updatedAt',
      dataIndex: 'updatedAt',
      width: 150,
      sorter: true,
      sortOrder: assetColumnSortOrder(listSort, 'updatedAt'),
      render: (v: string) => (v ? moment(v).utcOffset(600).format(dateTimeFormat) : '—'),
    },
    {
      title: 'Action',
      key: 'action',
      width: isDeletedTab ? 120 : 130,
      render: (_: unknown, r: AssetRow) => (
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View">
            <Button type="link" icon={<EyeOutlined />} onClick={() => setViewRow(r)} />
          </Tooltip>
          {!isDeletedTab ? (
            <Tooltip title="Edit">
              <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
          ) : (
            <Popconfirm title="Restore this asset?" okText="Restore" onConfirm={() => onRestore(r.id)}>
              <Tooltip title="Restore">
                <Button type="link" icon={<UndoOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title={
              isDeletedTab
                ? 'Permanently delete this asset?'
                : 'Move this asset to Deleted?'
            }
            okText={isDeletedTab ? 'Delete permanently' : 'Move to Deleted'}
            onConfirm={() => onDelete(r.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <Layout title="Asset register">
        <p>Asset register is available to administrators only.</p>
      </Layout>
    );
  }

  return (
    <Layout title="Asset register">
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', color: '#595959', maxWidth: 720 }}>
          Maintain the facility asset register by company — tags, categories, condition, and lifecycle details.
        </p>

        <Form form={filterForm} layout="vertical">
          <Row gutter={[16, 8]} align="bottom">
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="keyword" label="Search" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Name, tag, category, serial..."
                  allowClear
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Form.Item name="companyId" label="Company" style={{ marginBottom: 0 }}>
                <Select
                  allowClear
                  showSearch
                  placeholder="All companies"
                  options={companyOptions}
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Form.Item name="assetStatus" label="Status" style={{ marginBottom: 0 }}>
                <Select allowClear placeholder="All" options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={10} lg={8}>
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
                  {!isDeletedTab ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      Add asset
                    </Button>
                  ) : null}
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <Tabs
        activeKey={listTab}
        onChange={(key) => setListTab(key as AssetListTab)}
        style={{ marginBottom: 12 }}
        items={[
          { key: 'active', label: 'Assets' },
          { key: 'deleted', label: `Deleted (${deletedCount})` },
        ]}
      />

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
        title="Asset details"
        open={!!viewRow}
        onCancel={() => setViewRow(null)}
        footer={
          <Button type="primary" onClick={() => setViewRow(null)}>
            Close
          </Button>
        }
        width={640}
      >
        {viewRow ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Name">{viewRow.name}</Descriptions.Item>
            <Descriptions.Item label="Tag">{viewRow.assetTag || '—'}</Descriptions.Item>
            <Descriptions.Item label="Category">{viewRow.category || '—'}</Descriptions.Item>
            <Descriptions.Item label="Company">{viewRow.companyName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Site">{viewRow.siteName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Location">{viewRow.locationDetail || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor(viewRow.status)}>
                {String(viewRow.status || 'active').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Condition">{viewRow.condition || '—'}</Descriptions.Item>
            <Descriptions.Item label="Manufacturer">{viewRow.manufacturer || '—'}</Descriptions.Item>
            <Descriptions.Item label="Model">{viewRow.model || '—'}</Descriptions.Item>
            <Descriptions.Item label="Serial">{viewRow.serialNumber || '—'}</Descriptions.Item>
            <Descriptions.Item label="Install date">
              {viewRow.installDate ? moment(viewRow.installDate).format(dateFormat) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Warranty expiry">
              {viewRow.warrantyExpiry ? moment(viewRow.warrantyExpiry).format(dateFormat) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes">{viewRow.notes || '—'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title={modalMode === 'edit' ? 'Edit asset' : 'Add asset'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void onSave()}
        confirmLoading={saving}
        okText={modalMode === 'edit' ? 'Save changes' : 'Create asset'}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Enter asset name' }]}
              >
                <Input maxLength={500} placeholder="e.g. Rooftop AHU-1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="assetTag" label="Asset tag">
                <Input maxLength={120} placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Input maxLength={255} placeholder="Free text, e.g. HVAC" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="condition" label="Condition">
                <Select allowClear options={CONDITION_OPTIONS} placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="siteId" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="siteName" label="Site name">
                <AutoComplete
                  allowClear
                  options={siteNameOptions}
                  placeholder="Select a site or type a new name"
                  filterOption={(input, option) =>
                    String(option?.value ?? '')
                      .toLowerCase()
                      .includes(String(input || '').toLowerCase())
                  }
                  onSelect={(value) => {
                    const match = sites.find(
                      (s) =>
                        String(s.name || '').trim().toLowerCase() ===
                        String(value || '').trim().toLowerCase(),
                    );
                    form.setFieldsValue({
                      siteName: String(value || '').trim(),
                      siteId: match ? +match.id : undefined,
                    });
                  }}
                  onChange={(value) => {
                    const typed = String(value || '').trim();
                    const match = sites.find(
                      (s) =>
                        String(s.name || '').trim().toLowerCase() === typed.toLowerCase(),
                    );
                    form.setFieldsValue({
                      siteName: value,
                      siteId: match ? +match.id : undefined,
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationDetail" label="Location detail">
                <Input maxLength={500} placeholder="Plant room / roof / level..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="manufacturer" label="Manufacturer">
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="model" label="Model">
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="serialNumber" label="Serial number">
                <Input maxLength={255} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="installDate" label="Install date">
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="warrantyExpiry" label="Warranty expiry">
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} maxLength={4000} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AssetsPage;
