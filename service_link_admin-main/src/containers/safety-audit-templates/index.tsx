import React from 'react';
import ReportTemplatesPage from '@app/containers/report-templates';
import { SAFETY_AUDIT_CATEGORY } from '@app/constants/statusUser';

/**
 * Admin-managed Safety Audit templates (same engine as Report templates,
 * locked to SAFETY_AUDIT category).
 */
const SafetyAuditTemplatesPage: React.FC = () => (
  <ReportTemplatesPage
    lockedCategory={SAFETY_AUDIT_CATEGORY}
    pageTitle="sidebar.safetyAuditTemplates"
  />
);

export default SafetyAuditTemplatesPage;
