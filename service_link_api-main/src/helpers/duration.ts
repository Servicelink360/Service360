import * as moment from 'moment';

/** Milliseconds between two dates → "48 h 25 min" style label. */
export function formatDurationMs(distanceMs: number): string {
  if (!Number.isFinite(distanceMs) || distanceMs <= 0) {
    return '0 h 0 min';
  }
  const totalMinutes = Math.floor(distanceMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
}

/** Per app_from_host strHours — hours:minutes string (days folded into hours). */
function strHours(distanceMs: number): string {
  const days = Math.floor(distanceMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distanceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distanceMs % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) {
    return `${days * 24 + hours}:${minutes}`;
  }
  return `${hours}:${minutes}`;
}

/**
 * Total hours for isTotalHours=1 — matches app_from_host user-daily-jobs findAll.
 * Truncates to minute, sums h:mm strings, returns seconds.
 */
export function sumAttendanceTotalSeconds(
  rows: { checkIn?: Date | string; checkOut?: Date | string }[],
): number {
  const list: string[] = [];
  for (const row of rows) {
    if (!row.checkIn || !row.checkOut) continue;
    const timeCheckOut = new Date(
      moment(row.checkOut).format('YYYY-MM-DD HH:mm'),
    ).getTime();
    const timeCheckIn = new Date(
      moment(row.checkIn).format('YYYY-MM-DD HH:mm'),
    ).getTime();
    const distance = Math.round(timeCheckOut - timeCheckIn);
    if (distance <= 0) continue;
    list.push(strHours(distance));
  }
  let minutes = 0;
  for (const hhmm of list) {
    const parts = hhmm.split(':');
    minutes += parseFloat(parts[0]) * 60 + parseFloat(parts[1] || '0');
  }
  return minutes * 60;
}

/** Sum check-in/out pairs; returns total milliseconds (raw timestamps). */
export function sumAttendanceDurations(
  rows: { checkIn?: Date | string; checkOut?: Date | string }[],
): number {
  return sumAttendanceTotalSeconds(rows) * 1000;
}
