import { DeleteOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { Button, Divider, Empty, Input, Popover, Space, Spin, message, notification } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

type RoleTypeRow = { id: number; label: string };

type AssignedContact = { name: string; email?: string };

function showTypeInUseToast(
  typeLabel: string,
  contacts: AssignedContact[],
  fallbackMessage?: string,
) {
  if (!contacts.length) {
    message.error(fallbackMessage || 'Could not remove type');
    return;
  }
  const preview = contacts.slice(0, 5);
  const remaining = contacts.length - preview.length;
  notification.error({
    message: `Cannot remove "${typeLabel}"`,
    description: (
      <div style={{ maxWidth: 320 }}>
        <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
          Still used by{' '}
          <strong>
            {contacts.length} contact{contacts.length === 1 ? '' : 's'}
          </strong>
          :
        </p>
        <ul
          style={{
            margin: '0 0 10px',
            paddingLeft: 18,
            lineHeight: 1.45,
            fontSize: 13,
          }}
        >
          {preview.map((c) => (
            <li key={`${c.name}-${c.email ?? ''}`}>{c.name}</li>
          ))}
          {remaining > 0 ? <li>…and {remaining} more</li> : null}
        </ul>
        <p style={{ margin: 0, fontSize: 12, color: '#595959', lineHeight: 1.45 }}>
          On <strong>My personnel</strong>, edit each contact to pick another type, or remove them,
          then delete this type again.
        </p>
      </div>
    ),
    placement: 'topRight',
    duration: 7,
    style: { width: 380, maxWidth: 'calc(100vw - 32px)' },
  });
}

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** customer = My personnel types; admin = service provider staff types */
  personnelScope?: 'customer' | 'admin';
};

const PersonnelRoleSelect: React.FC<Props> = ({
  value,
  onChange,
  disabled,
  personnelScope = 'customer',
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleTypes, setRoleTypes] = useState<RoleTypeRow[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const roleTypesBase =
    personnelScope === 'admin' ? endPoint.ADMIN_PERSONNEL : endPoint.CUSTOMER_PERSONNEL;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${roleTypesBase}/role-types`,
        'GET',
        {},
      );
      setRoleTypes(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [roleTypesBase]);

  useEffect(() => {
    if (dropdownOpen) {
      void loadData();
    }
  }, [dropdownOpen, loadData]);

  const selectType = (label: string) => {
    onChange?.(label);
    setDropdownOpen(false);
  };

  const handleAddNewType = async () => {
    const label = newLabel.trim();
    if (!label) {
      message.warning('Enter a type name first');
      return;
    }
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${roleTypesBase}/role-types`,
        'POST',
        { label },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not add type');
        return;
      }
      message.success(`Type added: ${label}`);
      setNewLabel('');
      await loadData();
      if (res.data?.label) {
        selectType(res.data.label);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeType = async (row: RoleTypeRow) => {
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${roleTypesBase}/role-types/${row.id}`,
        'DELETE',
      );
      if (res?.code === 1) {
        message.success(`Type removed: ${row.label}`);
        if (value === row.label) onChange?.('');
        await loadData();
      } else {
        const contacts = Array.isArray(res?.data?.assignedContacts)
          ? res.data.assignedContacts
          : [];
        const typeLabel = res?.data?.typeLabel ?? row.label;
        if (contacts.length > 0) {
          showTypeInUseToast(typeLabel, contacts, res?.message);
        } else {
          message.error(res?.message || 'Could not remove type');
        }
      }
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
        ) : roleTypes.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No types yet" />
        ) : (
          roleTypes.map((row) => (
            <div
              key={`${row.id}-${row.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                background: value === row.label ? '#f6ffed' : undefined,
                cursor: 'pointer',
              }}
              onClick={() => selectType(row.label)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectType(row.label);
                }
              }}
              role="button"
              tabIndex={0}
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
                onClick={(event) => {
                  event.stopPropagation();
                  void removeType(row);
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
            placeholder="New type name"
            value={newLabel}
            disabled={saving || disabled}
            maxLength={100}
            onChange={(event) => setNewLabel(event.target.value)}
            onPressEnter={(event) => {
              event.preventDefault();
              void handleAddNewType();
            }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={saving}
            disabled={disabled}
            onClick={() => void handleAddNewType()}
          >
            Add
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <div className="personnel-role-select-field">
      <Popover
        content={panelContent}
        trigger="click"
        open={dropdownOpen && !disabled}
        onOpenChange={(open) => {
          if (!disabled) setDropdownOpen(open);
        }}
        placement="bottomLeft"
        overlayStyle={{ padding: 0 }}
        getPopupContainer={(trigger) => trigger.parentElement || document.body}
      >
        <div
          className="personnel-role-select-trigger ant-select ant-select-single ant-select-show-arrow"
          style={{
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setDropdownOpen((open) => !open);
            }
          }}
        >
          <div className="ant-select-selector">
            <span
              className="ant-select-selection-item"
              style={{
                color: value ? 'rgba(0, 0, 0, 0.88)' : 'rgba(0, 0, 0, 0.45)',
                opacity: 1,
              }}
            >
              {value || 'Select or add type'}
            </span>
            <span className="ant-select-arrow" style={{ userSelect: 'none' }}>
              <DownOutlined />
            </span>
          </div>
        </div>
      </Popover>
      <style>{`
        .personnel-role-select-trigger .ant-select-selector {
          height: 32px;
          align-items: center;
          display: flex;
        }
      `}</style>
    </div>
  );
};

export default PersonnelRoleSelect;
