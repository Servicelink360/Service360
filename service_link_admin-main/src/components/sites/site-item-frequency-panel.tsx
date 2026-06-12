import React, { useCallback, useState } from 'react';
import { Popconfirm, Radio, Space } from 'antd';
import SiteItemSimpleFrequencyPanel from './site-item-simple-frequency-panel';
import GroundMaintenanceScheduleGrid from './ground-maintenance-schedule-grid';
import endPoint from '@app/constants/endPoint';
import errorCode from '@app/constants/errorCode';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { notificationComponent } from '@app/components/common/Notification/index';
import { isPersistedDbId } from '@app/library/helpers/persistedRecordId';
import {
  SERVICE_FREQUENCY_TYPE_OPTIONS,
  isDetailedFrequencySiteItem,
  normalizeServiceFrequencyType,
  resolveSiteItemFrequencyType,
  resolveSiteItemService,
  serviceFrequencyTypeLabel,
  siteItemFrequencyTypeOverrideLabel,
  type ServiceFrequencyType,
} from '@app/library/helpers/serviceFrequencyType';

type Props = {
  siteId: number;
  siteItemId: number;
  row: {
    frequencyType?: string | null;
    frequencyTimes?: number | null;
    frequencyCount?: number | null;
    frequencyPeriod?: string | null;
    service?: { id?: number; name?: string; frequencyType?: string | null };
    Service?: { id?: number; name?: string; frequencyType?: string | null };
  };
  disabled?: boolean;
  scheduleClassName?: string;
  onUpdated?: (patch?: Record<string, unknown>) => void;
};

const SiteItemFrequencyPanel: React.FC<Props> = ({
  siteId,
  siteItemId,
  row,
  disabled = false,
  scheduleClassName = 'job-sites-schedule-table',
  onUpdated,
}) => {
  const [switching, setSwitching] = useState(false);
  const service = resolveSiteItemService(row);
  const effectiveType = resolveSiteItemFrequencyType(row);
  const detailed = isDetailedFrequencySiteItem(row);
  const overrideLabel = siteItemFrequencyTypeOverrideLabel(row);
  const serviceDefaultLabel = service
    ? serviceFrequencyTypeLabel(
        normalizeServiceFrequencyType(
          service.frequencyType ??
            (/ground\s*maintenance/i.test(String(service.name ?? '')) ? 'detailed' : 'simple'),
        ),
      )
    : null;

  const persisted = isPersistedDbId(siteItemId);

  const applyFrequencyType = useCallback(async (next: ServiceFrequencyType) => {
    if (!persisted) {
      notificationComponent('error', 3, 'Save the site first, then change frequency type', '');
      return;
    }
    if (normalizeServiceFrequencyType(next) === effectiveType) return;
    setSwitching(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/site-item/${siteItemId}`,
        'PATCH',
        { frequencyType: next },
      );
      if (res?.code !== errorCode.SUCCESS) {
        throw new Error(res?.message || 'Could not change frequency type');
      }
      onUpdated?.({ frequencyType: next });
      notificationComponent(
        'success',
        3,
        next === 'simple' ? 'Switched to simple frequency' : 'Switched to detailed schedule',
        next === 'simple'
          ? 'Activity rows for this site were removed.'
          : 'Simple repeat fields for this site were cleared.',
      );
    } catch (e) {
      notificationComponent(
        'error',
        3,
        e instanceof Error ? e.message : 'Could not change frequency type',
        '',
      );
    } finally {
      setSwitching(false);
    }
  }, [effectiveType, onUpdated, persisted, siteItemId]);

  const unsavedNote = !persisted ? (
    <p className="gm-frequency-panel__intro gm-frequency-panel__intro--muted">
      Save the site to store this service, then you can set frequency here.
    </p>
  ) : null;

  const switchConfirmMessage = (next: ServiceFrequencyType) =>
    next === 'simple'
      ? 'Switch to simple frequency? All activity rows and month values for this site will be deleted.'
      : 'Switch to detailed schedule? Simple repeat settings for this site will be cleared.';

  const typeSelector = (
    <div className="gm-frequency-panel__type">
      <Radio.Group value={effectiveType} disabled={disabled || switching || !persisted}>
        <Space direction="vertical" size={8}>
          {SERVICE_FREQUENCY_TYPE_OPTIONS.map((opt) => (
            <Popconfirm
              key={opt.value}
              title={switchConfirmMessage(opt.value)}
              okText="Switch"
              cancelText="Cancel"
              disabled={disabled || switching || opt.value === effectiveType}
              onConfirm={() => void applyFrequencyType(opt.value)}
            >
              <Radio value={opt.value} className="gm-frequency-panel__type-option">
                <span className="gm-frequency-panel__type-label">{opt.label}</span>
                <span className="gm-frequency-panel__type-desc">{opt.hint}</span>
              </Radio>
            </Popconfirm>
          ))}
        </Space>
      </Radio.Group>
      {serviceDefaultLabel ? (
        <p className="gm-frequency-panel__intro gm-frequency-panel__intro--muted">
          Service default: {serviceDefaultLabel}
          {overrideLabel ? ` · ${overrideLabel}` : ''}
        </p>
      ) : null}
    </div>
  );

  if (detailed) {
    return (
      <div className="gm-frequency-panel gm-frequency-panel--detailed">
        <div className="gm-frequency-panel__header-row">
          <p className="gm-frequency-panel__title">Frequency</p>
          <span className="gm-frequency-panel__badge">Detailed schedule</span>
        </div>
        {unsavedNote}
        {typeSelector}
        <p className="gm-frequency-panel__intro">
          Activities are per site. Type a name and click <strong>Add</strong>, set months,
          then Save. <strong>Remove</strong> drops a row from this site only.
        </p>
        <div className="gm-frequency-panel__body">
          <GroundMaintenanceScheduleGrid
            siteId={siteId}
            siteItemId={siteItemId}
            className={scheduleClassName}
            embedded
            compactLegend
            disabled={disabled || !persisted}
            onMutated={() => onUpdated?.()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="gm-frequency-panel gm-frequency-panel--simple">
      <div className="gm-frequency-panel__header-row">
        <p className="gm-frequency-panel__title">Frequency</p>
        <span className="gm-frequency-panel__badge">Simple repeat</span>
      </div>
      {unsavedNote}
      {typeSelector}
      <SiteItemSimpleFrequencyPanel
        siteItemId={siteItemId}
        row={row}
        disabled={disabled || !persisted}
        embedded
        onUpdated={onUpdated}
      />
    </div>
  );
};

export default SiteItemFrequencyPanel;
