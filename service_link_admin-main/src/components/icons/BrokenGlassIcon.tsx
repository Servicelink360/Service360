import React from 'react';
import faultReportBadgeImg from '@app/assets/images/fault-report-badge.png';

type Props = {
  className?: string;
};

/** Fault report badge — wrench & screwdriver (user-provided artwork). */
const BrokenGlassIcon: React.FC<Props> = ({ className }) => (
  <img
    src={faultReportBadgeImg}
    alt=""
    className={className ? `dashboard-fault-report-badge-icon ${className}` : 'dashboard-fault-report-badge-icon'}
    aria-hidden
  />
);

export default BrokenGlassIcon;
