import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import SiteItemFrequencyEditor from './site-item-frequency-editor';
import endPoint from '@app/constants/endPoint';
import errorCode from '@app/constants/errorCode';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { notificationComponent } from '@app/components/common/Notification/index';
import { isPersistedDbId } from '@app/library/helpers/persistedRecordId';
import {
  formatSiteItemFrequency,
  isSiteItemFrequencyNa,
  resolveFrequencyPerCount,
  resolveFrequencyTimes,
} from '@app/library/helpers/siteItemFrequency';

type FrequencyPatch = {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
};

type Props = {
  siteItemId: number;
  row: {
    frequencyTimes?: number | null;
    frequencyCount?: number | null;
    frequencyPeriod?: string | null;
  };
  disabled?: boolean;
  embedded?: boolean;
  onUpdated?: (patch?: FrequencyPatch) => void;
};

function draftFromRow(row: Props['row']): FrequencyPatch {
  if (isSiteItemFrequencyNa(row)) {
    return { frequencyTimes: 1, frequencyCount: 1, frequencyPeriod: 'month' };
  }
  return {
    frequencyTimes: resolveFrequencyTimes(row),
    frequencyCount: resolveFrequencyPerCount(row),
    frequencyPeriod: row.frequencyPeriod ?? 'month',
  };
}

function draftsEqual(a: FrequencyPatch, b: FrequencyPatch): boolean {
  return (
    a.frequencyTimes === b.frequencyTimes &&
    a.frequencyCount === b.frequencyCount &&
    a.frequencyPeriod === b.frequencyPeriod
  );
}

const SiteItemSimpleFrequencyPanel: React.FC<Props> = ({
  siteItemId,
  row,
  disabled = false,
  embedded = false,
  onUpdated,
}) => {
  const [draft, setDraft] = useState<FrequencyPatch>(() => draftFromRow(row));
  const [saving, setSaving] = useState(false);

  const savedDraft = useMemo(() => draftFromRow(row), [
    row.frequencyTimes,
    row.frequencyCount,
    row.frequencyPeriod,
  ]);

  const dirty = !draftsEqual(draft, savedDraft);
  const canSave = !disabled && !isSiteItemFrequencyNa(draft) && dirty;

  useEffect(() => {
    setDraft(draftFromRow(row));
  }, [row.frequencyTimes, row.frequencyCount, row.frequencyPeriod]);

  const saveFrequency = async () => {
    if (!isPersistedDbId(siteItemId)) {
      notificationComponent('error', 3, 'Save the site first, then save frequency', '');
      return;
    }
    if (!canSave) return;
    setSaving(true);
    try {
      const na = isSiteItemFrequencyNa(draft);
      const patch: FrequencyPatch = {
        frequencyTimes: na ? null : draft.frequencyTimes ?? 1,
        frequencyCount: na ? null : draft.frequencyCount ?? 1,
        frequencyPeriod: na ? null : draft.frequencyPeriod ?? null,
      };
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/site-item/${siteItemId}`,
        'PATCH',
        patch,
      );
      if (res?.code !== errorCode.SUCCESS) {
        throw new Error(res?.message || 'Could not save frequency');
      }
      onUpdated?.(patch);
      notificationComponent('success', 3, 'Frequency saved', '');
    } catch (e) {
      notificationComponent(
        'error',
        3,
        e instanceof Error ? e.message : 'Could not save frequency',
        '',
      );
    } finally {
      setSaving(false);
    }
  };

  const preview = isSiteItemFrequencyNa(draft)
    ? 'Not set'
    : formatSiteItemFrequency(
        draft.frequencyTimes,
        draft.frequencyCount,
        draft.frequencyPeriod,
      );

  return (
    <div className={`gm-frequency-panel gm-frequency-panel--simple${embedded ? ' gm-frequency-panel--embedded-simple' : ''}`}>
      {!embedded ? (
        <>
          <div className="gm-frequency-panel__header-row">
            <p className="gm-frequency-panel__title">Frequency</p>
            <span className="gm-frequency-panel__badge">{preview}</span>
          </div>
          <p className="gm-frequency-panel__intro">
            Simple repeat — e.g. 1 time per 2 months
          </p>
        </>
      ) : null}
      <div className="gm-frequency-panel__body">
        <SiteItemFrequencyEditor
          row={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          disabled={disabled}
          compact
        />
        <div className="gm-frequency-panel__actions">
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={!canSave}
            onClick={() => void saveFrequency()}
          >
            Save frequency
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteItemSimpleFrequencyPanel;
