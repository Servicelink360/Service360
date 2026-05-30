/** Fix UTF-8 mojibake (e.g. en-dash shown as "â€"") and known label typos. */
export function fixTextEncoding(text: unknown): string {
  if (text == null) return '';
  let s = String(text);
  s = s.replace(/\u00e2\u20ac[\u0093-\u0099]?/g, '-');
  s = s.replace(/â€./g, '-');
  s = s.replace(/â€™/g, "'");
  s = s.replace(/â€œ/g, '"');
  s = s.replace(/â€\u009d/g, '"');
  s = s.replace(/[\u2013\u2014\u2212]/g, '-');
  s = s.replace(/\bTiime and Date\b/gi, 'Time and Date');
  return s;
}

export function fixTextEncodingDeep<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') return fixTextEncoding(value) as T;
  if (Array.isArray(value)) return value.map((v) => fixTextEncodingDeep(v)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = fixTextEncodingDeep(v);
    }
    return out as T;
  }
  return value;
}
