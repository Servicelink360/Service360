import React from 'react';

import { Space } from 'antd';

import { formatSiteItemFrequencySummary } from '@app/library/helpers/siteItemFrequencySummary';

import {
  isDetailedFrequencySiteItem,
  resolveSiteItemFrequencyType,
  serviceFrequencyTypeLabel,
  siteItemFrequencyTypeOverrideLabel,
} from '@app/library/helpers/serviceFrequencyType';

type Props = {
  row: {
    frequencyType?: string | null;
    frequencyTimes?: number | null;
    frequencyCount?: number | null;
    frequencyPeriod?: string | null;
    service?: { id?: number; name?: string; frequencyType?: string | null };
    Service?: { id?: number; name?: string; frequencyType?: string | null };
  };
  canExpandSchedule?: boolean;
};

const SiteItemFrequencyColumn: React.FC<Props> = ({
  row,
  canExpandSchedule = false,
}) => {
  const detailed = isDetailedFrequencySiteItem(row);
  const override = siteItemFrequencyTypeOverrideLabel(row);

  return (
    <Space direction="vertical" size={4} className="gm-frequency-column">
      <span className="gm-frequency-column__summary">
        {detailed
          ? 'Detailed schedule'
          : formatSiteItemFrequencySummary(row)}
      </span>
      {override ? (
        <span className="gm-frequency-column__hint gm-frequency-column__hint--override">
          {override}
        </span>
      ) : (
        <span className="gm-frequency-column__hint gm-frequency-column__hint--muted">
          {serviceFrequencyTypeLabel(resolveSiteItemFrequencyType(row))}
        </span>
      )}
      {canExpandSchedule ? (
        <span className="gm-frequency-column__hint">
          Expand row to edit {detailed ? 'schedule' : 'frequency'}
        </span>
      ) : (
        <span className="gm-frequency-column__hint gm-frequency-column__hint--muted">
          Save the site first, then expand this row
        </span>
      )}
    </Space>
  );
};

export default SiteItemFrequencyColumn;
