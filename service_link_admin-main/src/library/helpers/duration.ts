import { momentAu } from './australianDatetime';

/** Format elapsed time as "48 h 25 min" (total hours, not days:hours). */
export function formatDurationMs(distanceMs: number): string {
  if (!Number.isFinite(distanceMs) || distanceMs <= 0) {
    return '—';
  }
  const totalMinutes = Math.floor(distanceMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
}

export function formatHoursBetween(checkIn?: string, checkOut?: string): string {
  if (!checkIn || !checkOut) return '—';
  const out = momentAu(checkOut);
  const inn = momentAu(checkIn);
  if (!out || !inn) return '—';
  const distance = out.valueOf() - inn.valueOf();
  if (distance <= 0) return '—';
  return formatDurationMs(distance);
}

/** API total field is seconds. */
export function formatTotalSeconds(totalSeconds: number): string {
  return formatDurationMs(totalSeconds * 1000);
}
