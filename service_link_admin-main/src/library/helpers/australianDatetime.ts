import moment, { Moment } from 'moment';
import { dateFormat, dateTimeFormat } from '@app/config/data.config';

/** Australian Eastern (fixed +10; aligns with existing attendance display). */
export const AU_UTC_OFFSET = '+10:00';

export function momentAu(value?: string | Date | null): Moment | null {
  if (value == null || value === '') return null;
  const m = moment(value).utcOffset(AU_UTC_OFFSET);
  return m.isValid() ? m : null;
}

export function formatAuDate(value?: string | Date | null): string {
  const m = momentAu(value);
  return m ? m.format(dateFormat) : '—';
}

export function formatAuTime(value?: string | Date | null): string {
  const m = momentAu(value);
  return m ? m.format('HH:mm') : '—';
}

export function formatAuDateTime(value?: string | Date | null): string {
  const m = momentAu(value);
  return m ? m.format(dateTimeFormat) : '—';
}

/** Ant Design DatePicker value (DD/MM/YYYY HH:mm). */
export function toAuDatePickerValue(value?: string | Date | null): Moment | null {
  const m = momentAu(value);
  if (!m) return null;
  return moment(m.format(dateTimeFormat), dateTimeFormat);
}

/** Persist picker wall-clock time as UTC ISO for the API. */
export function auDatePickerToISO(value?: Moment | null): string | undefined {
  if (!value || !moment.isMoment(value) || !value.isValid()) return undefined;
  return moment(value.format('YYYY-MM-DD HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss')
    .utcOffset(AU_UTC_OFFSET, true)
    .toISOString();
}
