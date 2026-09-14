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

export const formatAssignToLabels = (
  assignedStaffIds: number[] | null | undefined,
  staffLabelById: Record<number, string>,
): string => {
  const ids = Array.isArray(assignedStaffIds) ? assignedStaffIds : [];
  if (!ids.length) return 'None';
  if (ids.some((id) => isReportTemplateAssignedToAll(+id))) return 'All';
  return ids
    .map((id) => staffLabelById[+id] || `Staff #${id}`)
    .filter(Boolean)
    .join(', ');
};

/** Keep All exclusive: picking All clears staff; picking staff clears All. */
export function normalizeAssignedStaffIdsSelection(next: number[]): number[] {
  const cleaned = (next || [])
    .map((v) => +v)
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (cleaned.includes(REPORT_TEMPLATE_ASSIGNED_ALL)) {
    return [REPORT_TEMPLATE_ASSIGNED_ALL];
  }
  return [...new Set(cleaned.filter((n) => n > 0))];
}

export function assignedStaffIdsFromTemplate(data: {
  assignedStaffIds?: unknown;
  assigned_staff_ids?: unknown;
  assignedStaffId?: unknown;
  assigned_staff_id?: unknown;
}): number[] {
  const rawMulti = data.assignedStaffIds ?? data.assigned_staff_ids;
  if (Array.isArray(rawMulti) && rawMulti.length) {
    return normalizeAssignedStaffIdsSelection(rawMulti.map((v) => +v));
  }
  const raw = data.assignedStaffId ?? data.assigned_staff_id;
  if (raw == null || raw === '') return [];
  const n = +raw;
  if (!Number.isFinite(n)) return [];
  if (isReportTemplateAssignedToAll(n)) return [REPORT_TEMPLATE_ASSIGNED_ALL];
  if (n > 0) return [n];
  return [];
}
