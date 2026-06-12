import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Popconfirm, Space, Table } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import endPoint from '@app/constants/endPoint';
import errorCode from '@app/constants/errorCode';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { notificationComponent } from '@app/components/common/Notification/index';
import '@app/containers/job-sites/job-sites-table.css';

type ActivityRow = {
  id: number;
  name: string;
  sortOrder?: number;
};

type Props = {
  serviceId: number;
  disabled?: boolean;
};

const ServiceActivitiesEditor: React.FC<Props> = ({ serviceId, disabled = false }) => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editNames, setEditNames] = useState<Record<number, string>>({});

  const loadActivities = useCallback(async () => {
    if (!serviceId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/activities`,
        'GET',
      );
      if (res?.code === errorCode.SUCCESS) {
        const list = (res.data ?? []) as ActivityRow[];
        setRows(list);
        setEditNames(Object.fromEntries(list.map((r) => [r.id, r.name])));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const addActivity = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/activities`,
        'POST',
        { name },
      );
      if (res?.code !== errorCode.SUCCESS) {
        throw new Error(res?.message || 'Could not add activity');
      }
      setNewName('');
      await loadActivities();
      notificationComponent('success', 3, 'Activity added', '');
    } catch (e) {
      notificationComponent(
        'error',
        3,
        e instanceof Error ? e.message : 'Could not add activity',
        '',
      );
    } finally {
      setAdding(false);
    }
  };

  const saveName = async (activityId: number) => {
    const name = (editNames[activityId] ?? '').trim();
    if (!name) return;
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/activities/${activityId}`,
        'PATCH',
        { name },
      );
      if (res?.code !== errorCode.SUCCESS) {
        throw new Error(res?.message || 'Could not save activity');
      }
      await loadActivities();
      notificationComponent('success', 3, 'Activity updated', '');
    } catch (e) {
      notificationComponent(
        'error',
        3,
        e instanceof Error ? e.message : 'Could not save activity',
        '',
      );
    }
  };

  const removeActivity = async (activityId: number) => {
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/activities/${activityId}`,
        'DELETE',
      );
      if (res?.code !== errorCode.SUCCESS) {
        throw new Error(res?.message || 'Could not remove activity');
      }
      await loadActivities();
      notificationComponent('success', 3, 'Activity removed', '');
    } catch (e) {
      notificationComponent(
        'error',
        3,
        e instanceof Error ? e.message : 'Could not remove activity',
        '',
      );
    }
  };

  return (
    <div className="service-activities-editor">
      <p className="service-activities-editor__title">Activities</p>
      <p className="service-activities-editor__hint">
        Define tasks for this service. Deleting an activity removes it from all
        site schedules that use it.
      </p>
      {!disabled ? (
        <Space wrap size={8} className="service-activities-editor__add">
          <Input
            placeholder="Activity name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={() => void addActivity()}
            style={{ width: 280 }}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            loading={adding}
            disabled={!newName.trim()}
            onClick={() => void addActivity()}
          >
            Add activity
          </Button>
        </Space>
      ) : null}
      <Table
        size="small"
        loading={loading}
        pagination={false}
        rowKey="id"
        dataSource={rows}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: (_: unknown, record: ActivityRow) =>
              disabled ? (
                record.name
              ) : (
                <Input
                  size="small"
                  value={editNames[record.id] ?? record.name}
                  onChange={(e) =>
                    setEditNames((prev) => ({
                      ...prev,
                      [record.id]: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    if ((editNames[record.id] ?? record.name) !== record.name) {
                      void saveName(record.id);
                    }
                  }}
                />
              ),
          },
          ...(disabled
            ? []
            : [
                {
                  title: '',
                  key: 'actions',
                  width: 48,
                  render: (_: unknown, record: ActivityRow) => (
                    <Popconfirm
                      title="Delete this activity from the service and all site schedules?"
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => void removeActivity(record.id)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  ),
                },
              ]),
        ]}
      />
    </div>
  );
};

export default ServiceActivitiesEditor;
