import Layout from '@app/components/layout/Layout';
import PersonnelRoleSelect from '@app/components/customer-personnel/PersonnelRoleSelect';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Table, Tag, Tooltip, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';

type PersonnelRow = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
};

const AdminPersonnelPage: React.FC = () => {
  const [rows, setRows] = useState<PersonnelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelRow | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.ADMIN_PERSONNEL, 'GET', {});
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch {
      message.error('Failed to load personnel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: PersonnelRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.ADMIN_PERSONNEL}/${editing.id}`,
          'PATCH',
          values,
        );
        if (res?.code !== 1) {
          message.error(res?.message || 'Update failed');
          return;
        }
        message.success('Personnel updated');
      } else {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.ADMIN_PERSONNEL, 'POST', values);
        if (res?.code !== 1) {
          message.error(res?.message || 'Save failed');
          return;
        }
        message.success('Personnel added');
      }
      setModalOpen(false);
      load();
    } catch {
      message.error('Save failed');
    }
  };

  const onRemove = (row: PersonnelRow) => {
    Modal.confirm({
      title: `Remove ${row.name}?`,
      content: 'They will no longer appear in fault delegation lists.',
      okText: 'Remove',
      okButtonProps: { danger: true },
      onOk: async () => {
        await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.ADMIN_PERSONNEL}/${row.id}`,
          'DELETE',
          {},
        );
        message.success('Personnel removed');
        load();
      },
    });
  };

  return (
    <Layout>
      <div style={{ padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>My personnel</h2>
            <p style={{ margin: '4px 0 0', color: '#595959' }}>
              Add Servicelink contacts with custom types (e.g. Electrician, Plumber). Tasks and fault
              repairs can be assigned to them.
            </p>
          </div>
          <Button type="primary" onClick={openCreate}>
            Add personnel
          </Button>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Phone', dataIndex: 'phone', render: (v) => v || '—' },
            {
              title: 'Type',
              dataIndex: 'role',
              render: (v) => <Tag>{v || '—'}</Tag>,
            },
            {
              title: 'Action',
              key: 'actions',
              width: 88,
              align: 'center' as const,
              render: (_: unknown, row: PersonnelRow) => (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                  <Tooltip title="Edit">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      aria-label="Edit"
                      onClick={() => openEdit(row)}
                    />
                  </Tooltip>
                  <Tooltip title="Delete">
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label="Delete"
                      onClick={() => onRemove(row)}
                    />
                  </Tooltip>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Modal
        title={editing ? 'Edit personnel' : 'Add personnel'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
          >
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
            <PersonnelRoleSelect personnelScope="admin" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminPersonnelPage;
