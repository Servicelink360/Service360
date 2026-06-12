export const GROUND_MAINTENANCE_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type ScheduleMonthValue = 'weekly' | 'monthly' | 'fortnight' | 'daily' | null;

/** Daily (D) is available in local/dev builds only — not in production admin. */
export function isGroundMaintenanceDailyEnabled(): boolean {
  return process.env.REACT_APP_MODE !== 'PROD';
}

export function isGroundMaintenanceService(row: {
  service?: { name?: string };
  Service?: { name?: string };
}): boolean {
  const name = row?.service?.name ?? row?.Service?.name ?? '';
  return /ground\s*maintenance/i.test(String(name));
}

export function normalizeScheduleMonthValue(
  value: string | ScheduleMonthValue | null | undefined,
): ScheduleMonthValue {
  if (value == null || value === '') return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'once') return 'weekly';
  if (v === 'weekly' || v === 'monthly' || v === 'fortnight' || v === 'daily') return v;
  return null;
}

/** Spreadsheet-style cell label (W / M / F / —). */
export function formatScheduleCell(value: ScheduleMonthValue): string {
  if (!value) return '—';
  if (value === 'weekly') return 'W';
  if (value === 'monthly') return 'M';
  if (value === 'fortnight') return 'F';
  if (value === 'daily') return 'D';
  return '—';
}

export function scheduleCellClassName(value: ScheduleMonthValue): string {
  if (value === 'fortnight') return 'gm-schedule-cell gm-schedule-cell--fortnight';
  if (value === 'daily') return 'gm-schedule-cell gm-schedule-cell--daily';
  if (value === 'monthly') return 'gm-schedule-cell gm-schedule-cell--monthly';
  if (value === 'weekly') return 'gm-schedule-cell gm-schedule-cell--weekly';
  return 'gm-schedule-cell gm-schedule-cell--empty';
}

export const SCHEDULE_MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'fortnight', label: 'Fortnightly' },
];

/** Compact labels for narrow month cells in the edit grid. */
const SCHEDULE_MONTH_SELECT_OPTIONS_BASE: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'weekly', label: 'W' },
  { value: 'monthly', label: 'M' },
  { value: 'fortnight', label: 'F' },
];

export const SCHEDULE_MONTH_SELECT_OPTIONS: { value: string; label: string }[] =
  SCHEDULE_MONTH_SELECT_OPTIONS_BASE;

export function getScheduleMonthSelectOptions(): { value: string; label: string }[] {
  if (!isGroundMaintenanceDailyEnabled()) {
    return SCHEDULE_MONTH_SELECT_OPTIONS_BASE;
  }
  return [...SCHEDULE_MONTH_SELECT_OPTIONS_BASE, { value: 'daily', label: 'D' }];
}

export function parseScheduleMonthOption(value: string): ScheduleMonthValue {
  return normalizeScheduleMonthValue(value);
}
