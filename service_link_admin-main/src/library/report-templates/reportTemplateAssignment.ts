/** Stored in report_templates.assigned_staff_id — all staff can use the template. */
export const REPORT_TEMPLATE_ASSIGNED_ALL = 0;

export const isReportTemplateAssignedToAll = (assignedStaffId?: number | null): boolean =>
  assignedStaffId === REPORT_TEMPLATE_ASSIGNED_ALL;

export const assignToSelectOptions = (
  staffOptions: { value: number; label: string }[],
): { value: number; label: string }[] => [
  { value: REPORT_TEMPLATE_ASSIGNED_ALL, label: 'All' },
  ...staffOptions,
];

export const formatAssignToLabel = (
  assignedStaffId: number | null | undefined,
  staffLabelById: Record<number, string>,
): string => {
  if (assignedStaffId == null) {
    return 'None';
  }
  if (isReportTemplateAssignedToAll(assignedStaffId)) {
    return 'All';
  }
  return staffLabelById[assignedStaffId] || `Staff #${assignedStaffId}`;
};
