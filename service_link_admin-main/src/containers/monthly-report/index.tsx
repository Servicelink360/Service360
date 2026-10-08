import Layout from '@app/components/layout/Layout';
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, DatePicker, Modal, Popconfirm, Space, Switch, Table, Tabs, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment, { Moment } from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';
import '../marketing/monthlyReport.css';
import { resolveReportPdfHref } from '../reports/new-reports-display-utils';
import MonthlyCustomerPack, { buildMonthlyDraft, MonthlyPack } from './MonthlyCustomerPack';
import { mergeMonthlyDraft } from './report-document';

type CustomerRow = {
  companyId: number;
  name: string;
  month: string;
  jobs: number;
  period: string;
  clientVisible: boolean;
};

type PublishedRow = {
  companyId: number;
  month: string;
  period: string;
};

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  padding: 0,
  lineHeight: 1,
};

export default function MonthlyReportPage() {
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const isAdmin = +profile?.type === userType.ADMIN;
  const [month, setMonth] = useState<Moment | null>(null);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [published, setPublished] = useState<PublishedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<MonthlyPack | null>(null);
  const [viewing, setViewing] = useState(false);
  const [startEditing, setStartEditing] = useState(false);
  const [unavailable, setUnavailable] = useState('');
  const [visibilityId, setVisibilityId] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<CustomerRow | null>(null);
  const [copyMonth, setCopyMonth] = useState<Moment | null>(null);
  const [copying, setCopying] = useState(false);
  const [listTick, setListTick] = useState(0);
  const [listTab, setListTab] = useState<'active' | 'deleted'>('active');
  const [deletedCount, setDeletedCount] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const monthKey = month ? month.format('YYYY-MM') : '';

  const openCustomer = useCallback(
    async (companyId: number, reportMonth: string, edit = false) => {
      setLoading(true);
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'GET', {
        companyId,
        month: reportMonth,
      });
      setLoading(false);
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not open the monthly report');
        if (!isAdmin) setUnavailable(res?.message || 'This monthly report is not available');
        setPack(null);
        setViewing(false);
        return;
      }
      setUnavailable('');
      setStartEditing(edit);
      setPack(res.data || null);
      setViewing(true);
    },
    [isAdmin],
  );

  const openPdf = useCallback(
    async (companyId: number, reportMonth: string) => {
      setLoading(true);
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'GET', {
        companyId,
        month: reportMonth,
      });
      if (res?.code !== 1 || !res.data) {
        setLoading(false);
        if (!isAdmin) setUnavailable(res?.message || 'This monthly report is not available');
        message.error(res?.message || 'Could not open the monthly report');
        return;
      }
      const draft = mergeMonthlyDraft(buildMonthlyDraft(res.data), res.data.edit);
      const pdf = await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/pdf`, 'POST', {
        companyId,
        month: reportMonth,
        body: draft,
      });
      setLoading(false);
      const href = resolveReportPdfHref(pdf?.data?.url);
      if (pdf?.code !== 1 || !href) {
        message.error(pdf?.message || 'Could not create the PDF');
        return;
      }
      setUnavailable('');
      window.open(href, '_blank', 'noopener,noreferrer');
    },
    [isAdmin],
  );

  const loadCustomers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(true);
      const res = await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/published`, 'GET');
      setLoading(false);
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not load monthly reports');
        setPublished([]);
        return;
      }
      setPublished(res.data || []);
      setUnavailable('');
      return;
    }
    setLoading(true);
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.MONTHLY_REPORTS}/customers`,
      'GET',
      {
        ...(monthKey ? { month: monthKey } : {}),
        ...(listTab === 'deleted' ? { deleted: 1 } : {}),
      },
    );
    setLoading(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not load customers');
      setRows([]);
      return;
    }
    setRows(res.data || []);
    setDeletedCount(+res.deletedCount || 0);
  }, [isAdmin, monthKey, listTab]);

  useEffect(() => {
    if (viewing) return;
    void loadCustomers();
  }, [loadCustomers, viewing, listTick]);

  const setClientVisible = async (row: CustomerRow, clientVisible: boolean) => {
    const rowKey = `${row.companyId}-${row.month}`;
    setVisibilityId(rowKey);
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/visibility`, 'PUT', {
      companyId: row.companyId,
      month: row.month,
      clientVisible,
    });
    setVisibilityId(null);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not update client access');
      return;
    }
    setRows((current) => current.map((item) => (
      item.companyId === row.companyId && item.month === row.month ? { ...item, clientVisible } : item
    )));
    message.success(clientVisible ? 'Client can view this report' : 'Client cannot view this report');
  };

  const rowKeyOf = (row: CustomerRow) => `${row.companyId}-${row.month}`;

  const deleteReport = async (row: CustomerRow, permanent = false) => {
    setLoading(true);
    const res = await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'DELETE', {
      companyId: row.companyId,
      month: row.month,
      ...(permanent ? { permanent: 1 } : {}),
    });
    setLoading(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete the monthly report');
      return;
    }
    message.success(permanent ? 'Report permanently deleted' : 'Report moved to Deleted');
    setSelectedRowKeys((current) => current.filter((key) => key !== rowKeyOf(row)));
    setListTick((current) => current + 1);
  };

  const restoreReport = async (row: CustomerRow) => {
    setLoading(true);
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/restore`, 'PUT', {
      companyId: row.companyId,
      month: row.month,
    });
    setLoading(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore the monthly report');
      return;
    }
    message.success('Report restored');
    setSelectedRowKeys((current) => current.filter((key) => key !== rowKeyOf(row)));
    setListTick((current) => current + 1);
  };

  const applyToSelected = async (mode: 'delete' | 'purge' | 'restore') => {
    const chosen = rows.filter((row) => selectedRowKeys.includes(rowKeyOf(row)));
    if (!chosen.length) return;
    setLoading(true);
    for (const row of chosen) {
      const res = mode === 'restore'
        ? await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/restore`, 'PUT', {
          companyId: row.companyId,
          month: row.month,
        })
        : await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'DELETE', {
          companyId: row.companyId,
          month: row.month,
          ...(mode === 'purge' ? { permanent: 1 } : {}),
        });
      if (res?.code !== 1) {
        setLoading(false);
        message.error(res?.message || 'Could not update the selected reports');
        setListTick((current) => current + 1);
        return;
      }
    }
    setLoading(false);
    const count = chosen.length;
    message.success(
      mode === 'purge'
        ? `${count} report${count === 1 ? '' : 's'} permanently deleted`
        : mode === 'restore'
          ? `${count} report${count === 1 ? '' : 's'} restored`
          : `${count} report${count === 1 ? '' : 's'} moved to Deleted`,
    );
    setSelectedRowKeys([]);
    setListTick((current) => current + 1);
  };

  const confirmCopy = async () => {
    if (!copyTarget || !copyMonth) {
      message.error('Choose the month to copy to');
      return;
    }
    const sourceMonth = copyTarget.month;
    const targetMonth = copyMonth.format('YYYY-MM');
    if (targetMonth === sourceMonth) {
      message.error('Choose a different month');
      return;
    }
    setCopying(true);
    const res = await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'GET', {
      companyId: copyTarget.companyId,
      month: sourceMonth,
    });
    if (res?.code !== 1 || !res.data) {
      setCopying(false);
      message.error(res?.message || 'Could not copy the monthly report');
      return;
    }
    const draft = mergeMonthlyDraft(buildMonthlyDraft(res.data), res.data.edit);
    const targetStart = copyMonth.clone().startOf('month');
    draft.periodLabel = targetStart.format('MMMM YYYY');
    draft.periodRange = `${targetStart.format('DD/MM/YYYY')} to ${targetStart.clone().endOf('month').format('DD/MM/YYYY')}`;
    const copied = await callAPIAsync(serviceType.COMMON, `${endPoint.MONTHLY_REPORTS}/copy`, 'POST', {
      companyId: copyTarget.companyId,
      month: sourceMonth,
      targetMonth,
      body: draft,
    });
    setCopying(false);
    if (copied?.code !== 1) {
      message.error(copied?.message || 'Could not copy the monthly report');
      return;
    }
    message.success(`Copied to ${targetStart.format('MMMM YYYY')}. It is now in the list. Client view is off until you turn it on.`);
    setCopyTarget(null);
    setCopyMonth(null);
    setMonth(null);
    setListTick((current) => current + 1);
  };

  const columns: ColumnsType<CustomerRow> = [
    {
      title: 'Customer',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Jobs completed',
      dataIndex: 'jobs',
      key: 'jobs',
      width: 160,
      sorter: (a, b) => a.jobs - b.jobs,
    },
    {
      title: 'Month',
      dataIndex: 'period',
      key: 'period',
      width: 160,
      sorter: (a, b) => a.month.localeCompare(b.month),
    },
    {
      title: 'Client view',
      key: 'clientVisible',
      width: 130,
      align: 'center',
      sorter: (a, b) => Number(a.clientVisible) - Number(b.clientVisible),
      render: (_, row) => (
        <Tooltip title={row.clientVisible ? 'Client can view this report' : 'Client cannot view this report'}>
          <Switch
            checked={row.clientVisible}
            loading={visibilityId === `${row.companyId}-${row.month}`}
            aria-label={row.clientVisible ? 'Client can view this report' : 'Client cannot view this report'}
            onChange={(checked) => void setClientVisible(row, checked)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Report file',
      key: 'reportPdf',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Tooltip title="Open or download PDF" overlayStyle={{ pointerEvents: 'none' }}>
          <Button
            type="link"
            size="small"
            icon={<FilePdfOutlined />}
            aria-label="Open report PDF"
            style={iconButtonStyle}
            onClick={() => void openPdf(row.companyId, row.month)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Action',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_, row) => (
        <Space
          size={4}
          wrap={false}
          className="new-reports-row-actions"
          style={{ width: '100%', justifyContent: 'space-evenly' }}
        >
          {listTab === 'active' ? (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              aria-label="Edit report"
              title="Edit"
              style={iconButtonStyle}
              onClick={() => void openCustomer(row.companyId, row.month, true)}
            />
          ) : null}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            aria-label="View report"
            title="View report"
            style={iconButtonStyle}
            onClick={() => void openCustomer(row.companyId, row.month, false)}
          />
          {listTab === 'active' ? (
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              aria-label="Copy report"
              title="Copy"
              style={iconButtonStyle}
              onClick={() => {
                setCopyTarget(row);
                setCopyMonth(moment(row.month, 'YYYY-MM').add(1, 'month'));
              }}
            />
          ) : null}
          {listTab === 'active' ? (
            <Popconfirm
              title={(
                <span>
                  Move this report to Deleted?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                    You can permanently delete it later from the Deleted tab.
                  </div>
                </span>
              )}
              okText="Move to Deleted"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => deleteReport(row)}
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                aria-label="Delete report"
                title="Delete"
                style={iconButtonStyle}
              />
            </Popconfirm>
          ) : (
            <>
              <Popconfirm
                title="Restore this report to the Reports list?"
                okText="Restore"
                cancelText="Cancel"
                onConfirm={() => restoreReport(row)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<UndoOutlined />}
                  aria-label="Restore report"
                  title="Restore"
                  style={iconButtonStyle}
                />
              </Popconfirm>
              <Popconfirm
                title={(
                  <span>
                    Permanently delete this report?
                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                      This cannot be undone.
                    </div>
                  </span>
                )}
                okText="Delete permanently"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => deleteReport(row, true)}
              >
                <Button
                  type="link"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label="Permanently delete report"
                  title="Delete permanently"
                  style={iconButtonStyle}
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const shownColumns = listTab === 'deleted'
    ? columns.filter((column) => column.key !== 'clientVisible')
    : columns;

  return (
    <Layout title="Monthly report">
      {viewing && pack ? (
        <MonthlyCustomerPack
          pack={pack}
          startEditing={startEditing}
          onBack={
            isAdmin
              ? () => {
                  setViewing(false);
                  setPack(null);
                  setStartEditing(false);
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="mr-list-bar">
            <div>
              <div className="mr-list-bar-title">{isAdmin ? 'Monthly reports' : 'Monthly report'}</div>
              <div className="mr-list-bar-note">
                {isAdmin
                  ? 'Each row is one month. Delete moves a report to the Deleted tab. Turn Client view on to let that customer open the PDF.'
                  : 'Open the PDF to read a monthly report.'}
              </div>
            </div>
            {isAdmin ? (
              <DatePicker
                picker="month"
                value={month}
                format="MMMM YYYY"
                allowClear
                placeholder="All months"
                onChange={(value) => setMonth(value ? value.startOf('month') : null)}
              />
            ) : null}
          </div>
          {isAdmin ? (
            <>
              <Tabs
                activeKey={listTab}
                onChange={(key) => {
                  setListTab(key as 'active' | 'deleted');
                  setSelectedRowKeys([]);
                }}
                items={[
                  { key: 'active', label: 'Reports' },
                  { key: 'deleted', label: `Deleted (${deletedCount})` },
                ]}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                {listTab === 'deleted' ? (
                  <Popconfirm
                    title="Restore the selected reports to the Reports list?"
                    okText="Restore"
                    cancelText="Cancel"
                    disabled={!selectedRowKeys.length || loading}
                    onConfirm={() => void applyToSelected('restore')}
                  >
                    <Button icon={<UndoOutlined />} disabled={!selectedRowKeys.length || loading}>
                      Restore selected{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ''}
                    </Button>
                  </Popconfirm>
                ) : null}
                <Popconfirm
                  title={listTab === 'deleted' ? (
                    <span>
                      Permanently delete {selectedRowKeys.length || 'the'} selected report{selectedRowKeys.length === 1 ? '' : 's'}?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                        This cannot be undone.
                      </div>
                    </span>
                  ) : (
                    <span>
                      Move {selectedRowKeys.length || 'the'} selected report{selectedRowKeys.length === 1 ? '' : 's'} to Deleted?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                        You can permanently delete them later from the Deleted tab.
                      </div>
                    </span>
                  )}
                  okText={listTab === 'deleted' ? 'Delete permanently' : 'Move to Deleted'}
                  okButtonProps={{ danger: true }}
                  cancelText="Cancel"
                  disabled={!selectedRowKeys.length || loading}
                  onConfirm={() => void applyToSelected(listTab === 'deleted' ? 'purge' : 'delete')}
                >
                  <Button danger icon={<DeleteOutlined />} disabled={!selectedRowKeys.length || loading}>
                    {listTab === 'deleted' ? 'Delete permanently' : 'Move to Deleted'}
                    {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ''}
                  </Button>
                </Popconfirm>
              </div>
              <Table
                rowKey={(row) => `${row.companyId}-${row.month}`}
                loading={loading}
                columns={shownColumns}
                dataSource={rows}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys.map(String)),
                }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} records`,
                }}
                locale={{
                  emptyText: listTab === 'deleted'
                    ? 'No deleted reports'
                    : month
                      ? 'No monthly reports for this month.'
                      : 'No monthly reports yet.',
                }}
                size="middle"
              />
            </>
          ) : (
            <Table
              className="mr-client-table"
              rowKey="month"
              loading={loading}
              dataSource={published}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `${total} records`,
              }}
              locale={{ emptyText: unavailable || 'No monthly reports are available.' }}
              size="middle"
              columns={[
                { title: 'Month', dataIndex: 'period' },
                {
                  title: 'Report file',
                  key: 'reportPdf',
                  width: 120,
                  align: 'center',
                  render: (_, row) => (
                    <button
                      type="button"
                      className="mr-client-pdf"
                      title="Open PDF"
                      aria-label="Open report PDF"
                      onClick={() => void openPdf(row.companyId, row.month)}
                    >
                      <FilePdfOutlined />
                    </button>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
      <Modal
        title={copyTarget ? `Copy ${copyTarget.name} · ${copyTarget.period}` : 'Copy monthly report'}
        open={!!copyTarget}
        okText="Copy"
        confirmLoading={copying}
        onOk={() => void confirmCopy()}
        onCancel={() => {
          if (copying) return;
          setCopyTarget(null);
          setCopyMonth(null);
        }}
      >
        <p>Copy this monthly report to another month. The client cannot see the copy until you turn Client view on.</p>
        <DatePicker
          picker="month"
          value={copyMonth}
          format="MMMM YYYY"
          allowClear={false}
          onChange={(value) => setCopyMonth(value)}
          disabledDate={(value) => !!value && value.format('YYYY-MM') === copyTarget?.month}
        />
      </Modal>
    </Layout>
  );
}
