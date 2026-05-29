import {
  SearchOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { ActionBtn, Fieldset, TableWrapper } from '@app/components/common/Common.styles';
import Layout from '@app/components/layout/Layout';
import { notification } from '@app/components';
import { dateServerFormat, dateTimeFormat, pageData } from '@app/config/data.config';
import { Col, Form, Row, DatePicker, Checkbox, Popconfirm, Modal } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ButtonDiv, InformationDiv, StatusRow, UsersDiv } from '@app/components/common/container.style';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import FormSelect from '@app/components/common/FormItem/Select';
import intl from '../../library/helpers/intlProvider';
import helperFunc from '../../library/helpers/helperFunc';
import TableComponent from '@app/components/common/Table/index';
import {
  formatAuDate,
  formatAuTime,
  toAuDatePickerValue,
  auDatePickerToISO,
} from '@app/library/helpers/australianDatetime';
import { formatHoursBetween, formatTotalSeconds } from '@app/library/helpers/duration';
import './staff-attendance.css';

const { RangePicker } = DatePicker;

export type AttendanceItem = {
  id: number;
  siteName: string;
  staffName: string;
  staffId: number;
  staffUsername?: string;
  staffEmail?: string;
  checkIn?: string;
  checkOut?: string;
  hours: string;
};

export type StaffGroupRow = {
  userId: number;
  fullName: string;
  username: string;
  email: string;
  items: AttendanceItem[];
};

/** One API item = one sign-in / sign-out row (type 1). */
function mapItem(raw: any): AttendanceItem {
  const job = raw.userDailyJob;
  const staff = job?.staff;
  return {
    id: raw.id,
    siteName: job?.site?.name ?? '—',
    staffName: staff?.fullName ?? '—',
    staffId: job?.staffId ?? staff?.id,
    staffUsername: staff?.username,
    staffEmail: staff?.email,
    checkIn: raw.checkIn,
    checkOut: raw.checkOut,
    hours: formatHoursBetween(raw.checkIn, raw.checkOut),
  };
}

function pickUserField(row: any, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Merge staff profile from every attendance row for that staff id. */
function profilesFromItems(items: AttendanceItem[]): Map<number, Partial<StaffGroupRow>> {
  const map = new Map<number, Partial<StaffGroupRow>>();
  for (const item of items) {
    if (!item.staffId) continue;
    const prev = map.get(item.staffId) || {};
    map.set(item.staffId, {
      fullName:
        pickUserField(prev, 'fullName') ||
        (item.staffName && item.staffName !== '—' ? item.staffName : ''),
      username: pickUserField(prev, 'username') || item.staffUsername || '',
      email: pickUserField(prev, 'email') || item.staffEmail || '',
    });
  }
  return map;
}

function buildStaffGroups(
  staffFromApi: any[],
  items: AttendanceItem[],
  staffDirectory: any[] = [],
): StaffGroupRow[] {
  const byStaff = new Map<number, AttendanceItem[]>();
  for (const item of items) {
    if (!item.staffId) continue;
    const list = byStaff.get(item.staffId) || [];
    list.push(item);
    byStaff.set(item.staffId, list);
  }

  const apiById = new Map<number, any>();
  for (const u of staffFromApi) {
    const id = +(u.user_id ?? u.userId ?? u.id);
    if (id) apiById.set(id, u);
  }

  const dirById = new Map<number, any>();
  for (const s of staffDirectory) {
    const id = +(s.id ?? s.user_id ?? s.userId);
    if (id) dirById.set(id, s);
  }

  const fromItems = profilesFromItems(items);
  const staffIds = new Set<number>();
  byStaff.forEach((_, id) => staffIds.add(id));
  apiById.forEach((_, id) => staffIds.add(id));

  const groups: StaffGroupRow[] = [];
  staffIds.forEach((staffId) => {
    const api = apiById.get(staffId);
    const dir = dirById.get(staffId);
    const fromRow = fromItems.get(staffId);
    const staffItems = (byStaff.get(staffId) || []).sort(
      (a, b) => moment(b.checkIn).valueOf() - moment(a.checkIn).valueOf(),
    );
    if (staffItems.length === 0) return;
    const fullName =
      pickUserField(api, 'full_name', 'fullName') ||
      pickUserField(dir, 'fullName', 'full_name') ||
      pickUserField(fromRow, 'fullName') ||
      '—';
    const username =
      pickUserField(api, 'username') ||
      pickUserField(dir, 'username') ||
      pickUserField(fromRow, 'username') ||
      '—';
    const email =
      pickUserField(api, 'email') ||
      pickUserField(dir, 'email') ||
      pickUserField(fromRow, 'email') ||
      '—';
    groups.push({
      userId: staffId,
      fullName,
      username,
      email,
      items: staffItems,
    });
  });

  return groups
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

const StaffAttendance: React.FC = () => {
  const [form] = Form.useForm();
  const [sites, setSites] = useState<any[]>([]);
  const [staffs, setStaffs] = useState<any[]>([]);
  const [staffGroups, setStaffGroups] = useState<StaffGroupRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [totalHoursLabel, setTotalHoursLabel] = useState<string | null>(null);
  const [page, setPage] = useState(pageData);
  const [limit, setLimit] = useState(100);
  const [editRow, setEditRow] = useState<AttendanceItem | null>(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const getFilter = async (): Promise<any[]> => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getSites`, 'GET');
    if (res?.data) setSites(res.data);
    const res1 = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.COMMON}/getInitData?items=USERS`,
      'GET',
    );
    const staffList =
      res1?.data?.users?.filter((c: any) => +c.type === 2) ?? [];
    setStaffs(staffList);
    return staffList;
  };

  const buildFilters = useCallback(() => {
    const siteId = form.getFieldValue('siteId');
    const staffId = form.getFieldValue('staffId');
    const range = form.getFieldValue('startDateEndDate');
    const calcTotal = form.getFieldValue('calculateTotalHours');
    return {
      siteId: siteId?.id ?? siteId ?? 0,
      staffId: staffId?.id ?? staffId ?? 0,
      startDate: range?.[0] ? moment(range[0]).format(dateServerFormat) : '',
      endDate: range?.[1] ? moment(range[1]).format(dateServerFormat) : '',
      isTotalHours: calcTotal ? 1 : 0,
    };
  }, [form]);

  const loadAttendance = useCallback(
    async (staffDirectory?: any[], dateRange?: any[]) => {
      setListLoading(true);
      setTotalHoursLabel(null);
      try {
        const range =
          dateRange ??
          (form.getFieldValue('startDateEndDate') as any[] | undefined);
        const filters = {
          ...buildFilters(),
          startDate: range?.[0] ? moment(range[0]).format(dateServerFormat) : '',
          endDate: range?.[1] ? moment(range[1]).format(dateServerFormat) : '',
        };
        const itemFilters = {
          ...filters,
          page: 1,
          limit: 5000,
          orderBy: 'items.createdAt',
          orderValue: 'DESC',
        };

        const itemsRes = await callAPIAsync(
          serviceType.COMMON,
          endPoint.USER_DAILY_JOBS,
          'GET',
          itemFilters,
        );

        if (itemsRes?.code !== 1) {
          notification('error', itemsRes?.message || 'Failed to load attendance');
          setStaffGroups([]);
          return;
        }

        const items: AttendanceItem[] = (itemsRes.data?.rows || []).map(mapItem);

        let staffFromApi: any[] = Array.isArray(itemsRes.data?.staff)
          ? itemsRes.data.staff
          : [];
        if (!staffFromApi.length && items.length) {
          const usersRes = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.USER_DAILY_JOBS}/getUsers`,
            'GET',
            filters,
          );
          if (usersRes?.code === 1 && Array.isArray(usersRes.data)) {
            staffFromApi = usersRes.data;
          }
        }

        const directory = staffDirectory ?? staffs;
        setStaffGroups(buildStaffGroups(staffFromApi, items, directory));

        const calcTotal = !!form.getFieldValue('calculateTotalHours');
        if (calcTotal && itemsRes?.data?.total != null) {
          setTotalHoursLabel(formatTotalSeconds(+itemsRes.data.total));
        } else {
          setTotalHoursLabel(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load attendance';
        notification('error', message);
        setStaffGroups([]);
      } finally {
        setListLoading(false);
      }
    },
    [buildFilters, staffs, form],
  );

  useEffect(() => {
    (async () => {
      const staffList = await getFilter();
      const defaultRange = [moment().subtract(30, 'days'), moment()];
      form.setFieldsValue({
        startDateEndDate: defaultRange,
        calculateTotalHours: false,
      });
      await loadAttendance(staffList, defaultRange);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    setPage(1);
    const directory = staffs.length ? staffs : await getFilter();
    const range = form.getFieldValue('startDateEndDate') as any[] | undefined;
    await loadAttendance(directory, range);
  };

  const onTableChange = (pagination: any) => {
    setPage(pagination.current);
    setLimit(pagination.pageSize);
  };

  const handleDelete = async (item: AttendanceItem) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.USER_DAILY_JOBS}/${item.id}`,
      'DELETE',
      {},
    );
    if (res?.code === 1) {
      notification('success', 'Deleted');
      loadAttendance();
    } else {
      notification('error', res?.message || 'Delete failed');
    }
  };

  const openEdit = (item: AttendanceItem) => {
    setEditRow(item);
    editForm.setFieldsValue({
      checkIn: toAuDatePickerValue(item.checkIn),
      checkOut: toAuDatePickerValue(item.checkOut),
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const values = await editForm.validateFields();
    const checkInIso = auDatePickerToISO(values.checkIn);
    const checkOutIso = auDatePickerToISO(values.checkOut);
    if (
      checkInIso &&
      checkOutIso &&
      moment(checkOutIso).valueOf() <= moment(checkInIso).valueOf()
    ) {
      notification('error', 'Check out must be after check in');
      return;
    }
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_DAILY_JOBS}/${editRow.id}`,
        'PATCH',
        {
          checkIn: checkInIso,
          checkOut: checkOutIso,
        },
      );
      if (res?.code === 1) {
        notification('success', 'Updated');
        setEditRow(null);
        loadAttendance();
      } else {
        notification('error', res?.message || 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const rows: Record<string, string>[] = [];
    staffGroups.forEach((g) => {
      g.items.forEach((item) => {
        rows.push({
          Staff: g.fullName,
          'User name': g.username,
          Email: g.email,
          'Job Site': item.siteName,
          'Date In': formatAuDate(item.checkIn).replace('—', ''),
          'Time In': formatAuTime(item.checkIn).replace('—', ''),
          'Date Out': formatAuDate(item.checkOut).replace('—', ''),
          'Time Out': formatAuTime(item.checkOut).replace('—', ''),
          Hours: item.hours,
        });
      });
    });
    if (!rows.length) {
      notification('error', 'No data to export');
      return;
    }
    helperFunc.exportToCSV(rows, `staff-attendance-${moment().format('YYYY-MM-DD')}`);
  };

  const detailColumns = useMemo(
    () => [
      {
        title: 'Staff',
        dataIndex: 'staffName',
        width: 130,
      },
      {
        title: 'Job Site',
        dataIndex: 'siteName',
        width: 160,
      },
      {
        title: 'Date In',
        width: 105,
        render: (_: unknown, row: AttendanceItem) => formatAuDate(row.checkIn),
      },
      {
        title: 'Time In',
        width: 75,
        render: (_: unknown, row: AttendanceItem) => formatAuTime(row.checkIn),
      },
      {
        title: 'Date Out',
        width: 105,
        render: (_: unknown, row: AttendanceItem) => formatAuDate(row.checkOut),
      },
      {
        title: 'Time Out',
        width: 75,
        render: (_: unknown, row: AttendanceItem) => formatAuTime(row.checkOut),
      },
      {
        title: 'Hours',
        dataIndex: 'hours',
        width: 65,
      },
      {
        title: 'Action',
        width: 80,
        align: 'center' as const,
        render: (_: unknown, row: AttendanceItem) => (
          <div className="staff-attendance-actions">
            <button type="button" className="btnEdit" aria-label="Edit" onClick={() => openEdit(row)}>
              <EditOutlined />
            </button>
            <Popconfirm
              title="Delete this sign in / sign out?"
              okText={intl.formatMessage({ id: 'button.Yes' })}
              cancelText={intl.formatMessage({ id: 'button.No' })}
              onConfirm={() => handleDelete(row)}
            >
              <button type="button" className="btnDelete" aria-label="Delete">
                <DeleteOutlined />
              </button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const expandedRowRender = (record: StaffGroupRow) => (
    <div className="staff-attendance-detail-wrap">
      <TableWrapper
        className="staff-attendance-detail"
        columns={detailColumns}
        dataSource={record.items.map((item) => ({ ...item, key: item.id }))}
        pagination={{
          pageSize: 10,
          size: 'small',
          position: ['bottomRight'],
          hideOnSinglePage: true,
        }}
        locale={{ emptyText: 'No sign in / sign out records' }}
      />
    </div>
  );

  const parentColumns = useMemo(
    () => [
      { title: 'Full name', dataIndex: 'fullName', width: 220 },
      { title: 'User name', dataIndex: 'username', width: 160 },
      { title: 'Email', dataIndex: 'email', width: 280 },
    ],
    [],
  );

  const pagedGroups = useMemo(() => {
    const start = (page - 1) * limit;
    return staffGroups.slice(start, start + limit).map((g) => ({ ...g, key: g.userId }));
  }, [staffGroups, page, limit]);

  return (
    <Layout title="sidebar.staffAttendance" subtitle="staffAttendance.subtitle">
      <UsersDiv>
        <Form form={form} style={{ width: '100%' }} layout="vertical">
          <StatusRow>
            <Col md={18} sm={18} xs={24}>
              <Row gutter={[12, 8]}>
                <Col md={5} xs={24}>
                  <Fieldset>
                    <FormSelect
                      name="siteId"
                      allowClear
                      label="Job Site"
                      options={sites}
                      className="break-line"
                      optionValue="id"
                      optionLabel="name"
                      isRequired={false}
                    />
                  </Fieldset>
                </Col>
                <Col md={5} xs={24}>
                  <Fieldset>
                    <FormSelect
                      name="staffId"
                      allowClear
                      label="Staff"
                      options={staffs}
                      className="break-line"
                      optionValue="id"
                      optionLabel="fullName"
                      isRequired={false}
                    />
                  </Fieldset>
                </Col>
                <Col md={6} xs={24}>
                  <Fieldset>
                    <Form.Item name="startDateEndDate" label="Start Date - End Date">
                      <RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Fieldset>
                </Col>
                <Col md={4} xs={24}>
                  <Fieldset>
                    <Form.Item
                      name="calculateTotalHours"
                      valuePropName="checked"
                      style={{ marginTop: 30 }}
                    >
                      <Checkbox
                        onChange={(e) => {
                          form.setFieldsValue({ calculateTotalHours: e.target.checked });
                          handleSearch();
                        }}
                      >
                        Calculate total hours
                      </Checkbox>
                    </Form.Item>
                  </Fieldset>
                </Col>
              </Row>
            </Col>
            <Col
              md={6}
              xs={24}
              style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}
            >
              <ButtonDiv>
                <ActionBtn
                  type="primary"
                  onClick={handleSearch}
                  loading={listLoading}
                  icon={<SearchOutlined />}
                >
                  {intl.formatMessage({ id: 'sidebar.users.search' })}
                </ActionBtn>
                <ActionBtn type="primary" onClick={exportExcel} icon={<DownloadOutlined />}>
                  Excel
                </ActionBtn>
              </ButtonDiv>
            </Col>
          </StatusRow>
        </Form>

        {totalHoursLabel ? (
          <p className="staff-attendance-total-hours">Total hours (all staff): {totalHoursLabel}</p>
        ) : null}

        <InformationDiv>
          <TableComponent
            heightTable="auto"
            pagination
            tableClassName="staff-attendance-main"
            columns={parentColumns}
            onTableChange={onTableChange}
            keys="userId"
            page={page}
            count={staffGroups.length}
            limit={limit}
            data={pagedGroups}
            loading={listLoading}
            expandedRowRender={expandedRowRender}
            expandable
            defaultExpandAllRows={false}
            expandRowByClick={false}
            rowExpandable={(record: StaffGroupRow) => record.items.length > 0}
            totalUnit="staff"
          />
        </InformationDiv>
      </UsersDiv>

      <Modal
        title="Edit sign in / sign out"
        open={!!editRow}
        onCancel={() => setEditRow(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="checkIn" label="Check in">
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format={dateTimeFormat}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="checkOut" label="Check out">
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format={dateTimeFormat}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default StaffAttendance;
