import { Button, DatePicker, Form, Input, Modal, Select, message } from 'antd';
import moment, { Moment } from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PersonnelRoleSelect from '@app/components/customer-personnel/PersonnelRoleSelect';
import { formatPersonnelAssigneeLabel, CUSTOMER_SERVICE_PROVIDER_LABEL } from '@app/components/report-faults/fault-delegation-cell';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import { userType } from '../../constants/statusUser';

type ContactOption = { id: number; name: string; email: string; role: string };

const ACT_BY_PRESETS = [
  { value: '2h', label: 'Within 2 hours' },
  { value: '4h', label: 'Within 4 hours' },
  { value: 'eod', label: 'End of today' },
  { value: '24h', label: 'Within 24 hours' },
  { value: '48h', label: 'Within 48 hours' },
  { value: 'custom', label: 'Custom date & time' },
];

function presetToMoment(preset: string): Moment | null {
  const now = moment();
  switch (preset) {
    case '2h':
      return now.clone().add(2, 'hours');
    case '4h':
      return now.clone().add(4, 'hours');
    case 'eod':
      return now.clone().endOf('day');
    case '24h':
      return now.clone().add(24, 'hours');
    case '48h':
      return now.clone().add(48, 'hours');
    default:
      return null;
  }
}

const contactLabel = (p: ContactOption) =>
  formatPersonnelAssigneeLabel(p.name, p.role);

function mapStaffUser(u: Record<string, unknown>): ContactOption | null {
  const id = +(u.id ?? 0);
  if (!id) return null;
  const name =
    String(u.fullName ?? '').trim() ||
    `${String(u.firstName ?? '').trim()} ${String(u.lastName ?? '').trim()}`.trim() ||
    String(u.username ?? '').trim();
  if (!name) return null;
  return {
    id,
    name,
    email: String(u.email ?? '').trim(),
    role: String(u.position ?? '').trim(),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  faultId: number;
  record: any;
  viewerType: number;
  onSaved?: (delegation?: Record<string, unknown>) => void;
};

const FaultDelegationModal: React.FC<Props> = ({
  open,
  onClose,
  faultId,
  record,
  viewerType,
  onSaved,
}) => {
  const isCustomer = +viewerType === userType.CUSTOMER;
  const isAdmin = +viewerType === userType.ADMIN;
  const [adminPersonnel, setAdminPersonnel] = useState<ContactOption[]>([]);
  const [directoryStaff, setDirectoryStaff] = useState<ContactOption[]>([]);
  const [customerPersonnel, setCustomerPersonnel] = useState<ContactOption[]>([]);
  const [loadingAdminPersonnel, setLoadingAdminPersonnel] = useState(false);
  const [loadingDirectoryStaff, setLoadingDirectoryStaff] = useState(false);
  const [loadingCustomerPersonnel, setLoadingCustomerPersonnel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [form] = Form.useForm();
  const [addContactForm] = Form.useForm();
  const targetType = Form.useWatch('delegatedToType', form);
  const actByPreset = Form.useWatch('actByPreset', form);
  const prevTargetTypeRef = useRef<string | undefined>();

  useEffect(() => {
    if (!open) {
      prevTargetTypeRef.current = undefined;
      return;
    }
    if (
      prevTargetTypeRef.current &&
      targetType &&
      prevTargetTypeRef.current !== targetType
    ) {
      form.setFieldsValue({
        delegatedToStaffId: undefined,
        delegatedToPersonnelId: undefined,
      });
    }
    if (targetType) prevTargetTypeRef.current = targetType;
  }, [open, targetType, form]);

  const loadAdminPersonnel = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAdminPersonnel(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.ADMIN_PERSONNEL, 'GET', {});
      setAdminPersonnel(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setLoadingAdminPersonnel(false);
    }
  }, [isAdmin]);

  const loadDirectoryStaff = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingDirectoryStaff(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
        type: userType.STAFF,
        page: 1,
        limit: 500,
        keyword: '',
        orderBy: 'fullName',
        orderValue: 'ASC',
      });
      const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
      setDirectoryStaff(
        rows
          .map((row: Record<string, unknown>) => mapStaffUser(row))
          .filter((row: ContactOption | null): row is ContactOption => row != null),
      );
    } finally {
      setLoadingDirectoryStaff(false);
    }
  }, [isAdmin]);

  const loadCustomerPersonnel = useCallback(async () => {
    if (!isCustomer) return;
    setLoadingCustomerPersonnel(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.CUSTOMER_PERSONNEL, 'GET', {});
      setCustomerPersonnel(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setLoadingCustomerPersonnel(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    if (!open) return;
    void loadAdminPersonnel();
    void loadDirectoryStaff();
    void loadCustomerPersonnel();
    const until = record?.delegatedUntil ? moment(record.delegatedUntil) : null;
    let delegatedType = record?.delegatedToType ?? undefined;
    if (isAdmin) {
      if (delegatedType === 'personnel' || delegatedType === 'admin') delegatedType = undefined;
      else if (
        delegatedType !== 'staff' &&
        delegatedType !== 'admin_personnel'
      ) {
        delegatedType = undefined;
      }
    } else {
      if (delegatedType === 'staff' || delegatedType === 'admin_personnel') {
        delegatedType = 'admin';
      } else if (delegatedType !== 'personnel' && delegatedType !== 'admin') {
        delegatedType = undefined;
      }
    }
    form.setFieldsValue({
      delegatedToType: delegatedType,
      delegatedToPersonnelId: record?.delegatedToPersonnelId ?? undefined,
      delegatedToStaffId:
        isCustomer &&
        (record?.delegatedToType === 'staff' ||
          record?.delegatedToType === 'admin_personnel')
          ? undefined
          : record?.delegatedToStaffId ?? undefined,
      actByPreset: until ? 'custom' : undefined,
      delegatedUntilCustom: until,
      delegationNote: record?.delegationNote ?? '',
    });
  }, [
    open,
    record,
    form,
    loadAdminPersonnel,
    loadDirectoryStaff,
    loadCustomerPersonnel,
    isAdmin,
    isCustomer,
  ]);

  const canAddPersonnel =
    (isAdmin && targetType === 'admin_personnel') ||
    (isCustomer && targetType === 'personnel');

  const openAddContact = () => {
    addContactForm.resetFields();
    setAddContactOpen(true);
  };

  const onAddContactSave = async () => {
    const values = await addContactForm.validateFields();
    setAddingContact(true);
    try {
      const endpoint = isAdmin ? endPoint.ADMIN_PERSONNEL : endPoint.CUSTOMER_PERSONNEL;
      const res = await callAPIAsync(serviceType.COMMON, endpoint, 'POST', values);
      if (res?.code !== 1) {
        message.error(res?.message || 'Save failed');
        return;
      }
      message.success('Personnel added');
      setAddContactOpen(false);
      if (isAdmin) {
        await loadAdminPersonnel();
        const newId = res?.data?.id;
        if (newId) form.setFieldValue('delegatedToStaffId', newId);
      } else {
        await loadCustomerPersonnel();
        const newId = res?.data?.id;
        if (newId) form.setFieldValue('delegatedToPersonnelId', newId);
      }
    } catch {
      message.error('Save failed');
    } finally {
      setAddingContact(false);
    }
  };

  const onSave = async () => {
    const values = await form.validateFields();
    let delegatedUntil: string;
    if (values.actByPreset === 'custom') {
      if (!values.delegatedUntilCustom?.isValid?.()) {
        message.error('Select act-by date and time');
        return;
      }
      delegatedUntil = values.delegatedUntilCustom.toISOString();
    } else {
      const m = presetToMoment(values.actByPreset);
      if (!m) {
        message.error('Select act-by timeframe');
        return;
      }
      delegatedUntil = m.toISOString();
    }
    const sendsEmail =
      values.delegatedToType === 'personnel' || values.delegatedToType === 'admin_personnel';
    const staffAssigned = values.delegatedToType === 'staff';
    const adminPersonnelAssigned = values.delegatedToType === 'admin_personnel';
    const staffId = values.delegatedToStaffId != null ? +values.delegatedToStaffId : 0;
    const personnelId =
      values.delegatedToPersonnelId != null ? +values.delegatedToPersonnelId : 0;

    if ((staffAssigned || adminPersonnelAssigned) && staffId <= 0) {
      message.error(
        staffAssigned ? 'Select a staff member from the list' : 'Select personnel from the list',
      );
      return;
    }
    if (values.delegatedToType === 'personnel' && personnelId <= 0) {
      message.error('Select personnel from the list');
      return;
    }

    if (
      isCustomer &&
      (values.delegatedToType === 'staff' || values.delegatedToType === 'admin_personnel')
    ) {
      message.error('Staff assignment is not available');
      return;
    }

    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/delegation`,
        'PATCH',
        {
          delegatedToType: values.delegatedToType,
          delegatedToPersonnelId:
            values.delegatedToType === 'personnel' ? personnelId : undefined,
          delegatedToStaffId:
            staffAssigned || adminPersonnelAssigned ? staffId : undefined,
          delegatedUntil,
          delegationNote: values.delegationNote?.trim() ?? '',
        },
      );
      if (!res) {
        message.error('Failed to save assignment — no response from server');
        return;
      }
      if (res?.code !== 1) {
        message.error(res?.message || 'Failed to save delegation');
        return;
      }
      message.success(
        staffAssigned
          ? 'Assigned — staff notified in My tasks'
          : sendsEmail
            ? 'Assigned — email sent'
            : 'Assignment saved',
      );
      onSaved?.(res.data);
      onClose();
    } catch {
      message.error('Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const assignToOptions = isAdmin
    ? [
        { value: 'admin_personnel', label: 'My personnel (email + secure link)' },
        { value: 'staff', label: 'Staff (My tasks in app)' },
      ]
    : [
        { value: 'admin', label: CUSTOMER_SERVICE_PROVIDER_LABEL },
        { value: 'personnel', label: 'My personnel (email + secure link)' },
      ];

  const addContactLink = canAddPersonnel ? (
    <Button
      type="link"
      size="small"
      style={{ padding: 0, height: 'auto', fontSize: 13 }}
      onClick={openAddContact}
    >
      Add personnel
    </Button>
  ) : null;

  const renderContactPicker = (
    fieldName: 'delegatedToStaffId' | 'delegatedToPersonnelId',
    label: string,
    options: ContactOption[],
    loading: boolean,
    emptyMessage: string,
    showAdd: boolean,
  ) => {
    const isEmpty = !loading && options.length === 0;
    if (isEmpty) {
      return (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#595959' }}>{emptyMessage}</p>
          {showAdd ? addContactLink : null}
        </div>
      );
    }
    return (
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span>
            <span style={{ color: '#ff4d4f', fontFamily: 'SimSun, sans-serif' }}>* </span>
            {label}
          </span>
          {showAdd ? addContactLink : null}
        </div>
        <Form.Item
          name={fieldName}
          rules={[{ required: true, message: `Select ${label.toLowerCase()}` }]}
          style={{ marginBottom: 0 }}
        >
          <Select
            loading={loading}
            placeholder={`Select ${label.toLowerCase()}`}
            showSearch
            optionFilterProp="label"
            options={options.map((p) => ({
              value: p.id,
              label: contactLabel(p),
            }))}
          />
        </Form.Item>
      </div>
    );
  };

  const showAdminPersonnelPicker = isAdmin && targetType === 'admin_personnel';
  const showDirectoryStaffPicker = isAdmin && targetType === 'staff';
  const showCustomerPersonnelPicker = isCustomer && targetType === 'personnel';

  const showNoAdminPersonnel =
    showAdminPersonnelPicker && !loadingAdminPersonnel && adminPersonnel.length === 0;
  const showNoDirectoryStaff =
    showDirectoryStaffPicker && !loadingDirectoryStaff && directoryStaff.length === 0;
  const showNoCustomerPersonnel =
    showCustomerPersonnelPicker &&
    !loadingCustomerPersonnel &&
    customerPersonnel.length === 0;

  const saveDisabled =
    (showNoAdminPersonnel && !canAddPersonnel) ||
    showNoDirectoryStaff ||
    (showNoCustomerPersonnel && !canAddPersonnel);

  return (
    <>
      <Modal
        open={open}
        title="Assign to"
        onCancel={onClose}
        width={480}
        centered
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            disabled={saveDisabled}
            onClick={onSave}
          >
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="delegatedToType"
            rules={[{ required: true, message: 'Select assignee' }]}
          >
            <Select
              placeholder="Select"
              options={assignToOptions}
              onChange={() =>
                form.setFieldsValue({
                  delegatedToStaffId: undefined,
                  delegatedToPersonnelId: undefined,
                })
              }
            />
          </Form.Item>
          {showAdminPersonnelPicker
            ? renderContactPicker(
                'delegatedToStaffId',
                'My personnel',
                adminPersonnel,
                loadingAdminPersonnel,
                'No personnel on file yet. Add a contact to assign fault reports by email.',
                true,
              )
            : null}
          {showDirectoryStaffPicker
            ? renderContactPicker(
                'delegatedToStaffId',
                'Staff',
                directoryStaff,
                loadingDirectoryStaff,
                'No staff in Directory. Add staff under Directory → Staff.',
                false,
              )
            : null}
          {showCustomerPersonnelPicker
            ? renderContactPicker(
                'delegatedToPersonnelId',
                'My personnel',
                customerPersonnel,
                loadingCustomerPersonnel,
                'No personnel on file yet. Add a contact to assign fault reports by email.',
                true,
              )
            : null}
          <Form.Item
            name="actByPreset"
            label="Act by"
            rules={[{ required: true, message: 'Select timeframe' }]}
          >
            <Select placeholder="Select timeframe" options={ACT_BY_PRESETS} />
          </Form.Item>
          {actByPreset === 'custom' ? (
            <Form.Item
              name="delegatedUntilCustom"
              label="Custom date & time"
              rules={[{ required: true, message: 'Required' }]}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          <Form.Item name="delegationNote" label="Note (optional)">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add personnel"
        open={addContactOpen}
        onCancel={() => setAddContactOpen(false)}
        onOk={() => void onAddContactSave()}
        okText="Save"
        confirmLoading={addingContact}
        destroyOnClose
        width={440}
        centered
      >
        <Form form={addContactForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Type"
            rules={[{ required: true, message: 'Select or add a type' }]}
          >
            <PersonnelRoleSelect personnelScope={isAdmin ? 'admin' : 'customer'} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FaultDelegationModal;
