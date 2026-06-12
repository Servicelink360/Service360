import React from 'react';
import { Select, Space } from 'antd';
import {
  SITE_ITEM_FREQUENCY_NA,
  SITE_ITEM_FREQUENCY_UNITS,
  formatSiteItemFrequency,
  frequencyCountOptions,
  frequencyTimesSelectOptions,
  isSiteItemFrequencyNa,
  resolveFrequencyPerCount,
  resolveFrequencyTimes,
} from '@app/library/helpers/siteItemFrequency';

export type SiteItemFrequencyRow = {
  id?: number;
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
};

type FrequencyPatch = {
  frequencyTimes?: number | null;
  frequencyCount?: number | null;
  frequencyPeriod?: string | null;
};

type Props = {
  row: SiteItemFrequencyRow;
  onChange: (patch: FrequencyPatch) => void;
  disabled?: boolean;
  /** Inline layout for unified frequency panel */
  compact?: boolean;
};

const SiteItemFrequencyEditor: React.FC<Props> = ({
  row,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const frequencyNa = isSiteItemFrequencyNa(row);
  const times = resolveFrequencyTimes(row);
  const perCount = resolveFrequencyPerCount(row);
  const period = row.frequencyPeriod;

  const controls = (
    <Space size={4} wrap align="center" className="gm-frequency-editor">
      <Select
        value={frequencyNa ? SITE_ITEM_FREQUENCY_NA : times}
        options={frequencyTimesSelectOptions(30)}
        disabled={disabled}
        onChange={(v) => {
          if (v === SITE_ITEM_FREQUENCY_NA) {
            onChange({
              frequencyTimes: null,
              frequencyCount: null,
              frequencyPeriod: null,
            });
          } else {
            onChange({
              frequencyTimes: +v,
              frequencyCount: perCount,
              frequencyPeriod:
                period && period !== SITE_ITEM_FREQUENCY_NA ? period : 'month',
            });
          }
        }}
        style={{ width: 72 }}
        aria-label="Times"
      />
      {!frequencyNa ? (
        <>
          <span className="gm-frequency-editor__label">times per</span>
          <Select
            value={perCount}
            options={frequencyCountOptions(30)}
            disabled={disabled}
            onChange={(v) => onChange({ frequencyCount: +v })}
            style={{ width: 56 }}
            aria-label="Per interval number"
          />
          <Select
            value={period}
            options={[...SITE_ITEM_FREQUENCY_UNITS]}
            disabled={disabled}
            onChange={(v) => onChange({ frequencyPeriod: v })}
            style={{ width: 88 }}
            aria-label="Period"
          />
        </>
      ) : null}
    </Space>
  );

  if (compact) {
    return (
      <div className="gm-frequency-editor--compact">
        {controls}
        {!frequencyNa ? (
          <span className="gm-frequency-editor__preview">
            {formatSiteItemFrequency(row.frequencyTimes, row.frequencyCount, row.frequencyPeriod)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      {controls}
      <span style={{ fontSize: 12, color: '#595959', lineHeight: 1.3 }}>
        {formatSiteItemFrequency(row.frequencyTimes, row.frequencyCount, row.frequencyPeriod)}
      </span>
    </Space>
  );
};

export default SiteItemFrequencyEditor;
