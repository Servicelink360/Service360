import React from 'react';
import NewReports from '@app/containers/reports/new-reports';
import { INCIDENT_REPORT_CATEGORY } from '@app/constants/statusUser';

/**
 * Fill / list Incident Reports using INCIDENT report templates (staff + admin).
 */
const IncidentReportPage: React.FC = () => (
  <NewReports
    lockedTemplateCategory={INCIDENT_REPORT_CATEGORY}
    pageTitle="sidebar.incidentReport"
  />
);

export default IncidentReportPage;
