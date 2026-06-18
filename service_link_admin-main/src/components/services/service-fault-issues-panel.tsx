import { DeleteOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import { notificationComponent } from '@app/components/common/Notification/index';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { Button, Divider, Empty, Form, Input, Popover, Space, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

type ServiceFaultIssueRow = {
  faultIssueId: number;
  label: string;
};

type Props = {
  serviceId: number;
};

const ServiceFaultIssuesPanel: React.FC<Props> = ({ serviceId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [assigned, setAssigned] = useState<ServiceFaultIssueRow[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const assignedRes = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/fault-issues`,
        'GET',
      );
      setAssigned(Array.isArray(assignedRes?.data) ? assignedRes.data : []);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const removeIssue = async (faultIssueId: number, label: string) => {
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/fault-issues/${faultIssueId}`,
        'DELETE',
      );
      if (res?.code === 1) {
        notificationComponent('success', 3, `Issue removed: ${label}`, '');
        await loadData();
      } else {
        notificationComponent('error', 3, res?.message || 'Could not remove issue', '');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewIssue = async () => {
    const label = newLabel.trim();
    if (!label) {
      notificationComponent('warning', 3, 'Enter an issue name first', '');
      return;
    }
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.SERVICES}/${serviceId}/fault-issues`,
        'POST',
        { label },
      );
      if (res?.code !== 1) {
        notificationComponent('error', 3, res?.message || 'Could not add issue', '');
        return;
      }
      notificationComponent('success', 3, `Issue added: ${label}`, '');
      setNewLabel('');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const panelContent = (
    <div
      style={{
        background: '#fff',
        borderRadius: 2,
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08)',
        width: 360,
        maxWidth: '90vw',
      }}
    >
      <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : assigned.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No issues yet" />
        ) : (
          assigned.map((row) => (
            <div
              key={row.faultIssueId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span style={{ flex: 1, fontSize: 14, color: 'rgba(0, 0, 0, 0.88)' }}>
                {row.label}
              </span>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={saving}
                aria-label={`Remove ${row.label}`}
                onClick={() => void removeIssue(row.faultIssueId, row.label)}
              />
            </div>
          ))
        )}
      </div>
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: '8px 12px' }}>
        <Space style={{ width: '100%' }}>
          <Input
            placeholder="New issue name"
            value={newLabel}
            disabled={saving}
            maxLength={200}
            onChange={(event) => setNewLabel(event.target.value)}
            onPressEnter={(event) => {
              event.preventDefault();
              void handleAddNewIssue();
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={saving}
            onClick={() => void handleAddNewIssue()}
          >
            Add
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <Form.Item
      label="Fault issues"
      tooltip="Issues shown in Report Fault for this service."
      required
    >
      <div className="service-fault-issues-field">
        <Popover
          content={panelContent}
          trigger="click"
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          placement="bottomLeft"
          overlayStyle={{ padding: 0 }}
          getPopupContainer={(trigger) => trigger.parentElement || document.body}
        >
          <div
            className="service-fault-issues-trigger ant-select ant-select-single ant-select-show-arrow"
            style={{ width: '100%', cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setDropdownOpen((open) => !open);
              }
            }}
          >
            <div className="ant-select-selector">
              <span
                className="ant-select-selection-item"
                style={{ color: 'rgba(0, 0, 0, 0.88)', opacity: 1 }}
              >
                Select or add issues
              </span>
              <span className="ant-select-arrow" style={{ userSelect: 'none' }}>
                <DownOutlined />
              </span>
            </div>
          </div>
        </Popover>
        <style>{`
          .service-fault-issues-trigger .ant-select-selector {
            height: 32px;
            align-items: center;
            display: flex;
          }
        `}</style>
      </div>
    </Form.Item>
  );
};

export default ServiceFaultIssuesPanel;
