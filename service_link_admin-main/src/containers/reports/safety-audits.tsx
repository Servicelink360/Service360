import React from 'react';
import NewReports from '@app/containers/reports/new-reports';
import { SAFETY_AUDIT_CATEGORY } from '@app/constants/statusUser';

/**
 * Fill / list Safety Audit reports using SAFETY_AUDIT report templates.
 */
const SafetyAuditsPage: React.FC = () => (
  <NewReports
    lockedTemplateCategory={SAFETY_AUDIT_CATEGORY}
    pageTitle="sidebar.safetyAudits"
  />
);

export default SafetyAuditsPage;
