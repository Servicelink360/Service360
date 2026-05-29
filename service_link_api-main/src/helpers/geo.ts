/** Parse site location or client coords as "lat,lng" or "lat;lng". */
export function parseLatLng(value?: string): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const parts = trimmed.split(/[,;]/).map((p) => parseFloat(p.trim()));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { lat: parts[0], lng: parts[1] };
}

/** Haversine distance in metres between two WGS84 points. */
export function distanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
