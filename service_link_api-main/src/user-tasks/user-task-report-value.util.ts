/** Max length for user_task_reports.value when DB column is still varchar(5000). */
export const USER_TASK_REPORT_VALUE_MAX = 4800;

const MEDIA_FIELD_TYPES = new Set([
  'IMAGES',
  'PHOTOS',
  'PHOTO',
  'IMAGE',
  'VIDEOS',
  'VIDEO',
]);

export type ReportItemInput = {
  name: string;
  type: string;
  value?: string | null;
  order?: number;
};

function parseUrlList(value: string): string[] {
  try {
    const p = JSON.parse(value);
    if (Array.isArray(p)) return p.map(String).filter(Boolean);
    if (typeof p === 'string' && p) return [p];
  } catch {
    // ignore
  }
  return [];
}

function isMediaFieldType(type: string): boolean {
  return MEDIA_FIELD_TYPES.has(String(type || '').toUpperCase());
}

/** DB enforces UNIQUE (user_task_id, name) — duplicate template field names must be disambiguated. */
export function ensureUniqueReportItemNames(items: ReportItemInput[]): ReportItemInput[] {
  const used = new Set<string>();
  return items.map((item, idx) => {
    const base = String(item.name ?? '').trim() || `field_${idx + 1}`;
    const label = String((item as ReportItemInput & { label?: string }).label ?? '').trim();
    const candidates: string[] = [];
    if (label && label !== base) candidates.push(label);
    candidates.push(base);
    if (label && label === base) candidates.unshift(label);

    for (const candidate of candidates) {
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate === base ? item : { ...item, name: candidate };
      }
    }

    let suffix = 2;
    let next = `${base} (${suffix})`;
    while (used.has(next)) {
      suffix += 1;
      next = `${base} (${suffix})`;
    }
    used.add(next);
    return { ...item, name: next };
  });
}

/**
 * Split oversized IMAGES/VIDEOS JSON into multiple rows (name, name__part2, …) so each value fits varchar(5000).
 * After migration to TEXT, a single row is enough but chunking still works when merged on read.
 */
export function expandReportItemsForStorage(items: ReportItemInput[]): ReportItemInput[] {
  const uniqueItems = ensureUniqueReportItemNames(items);
  const out: ReportItemInput[] = [];
  for (const item of uniqueItems) {
    const type = String(item.type || '');
    const val = item.value != null && item.value !== '' ? String(item.value) : '';
    if (!isMediaFieldType(type) || val.length <= USER_TASK_REPORT_VALUE_MAX) {
      out.push(item);
      continue;
    }
    const urls = parseUrlList(val);
    if (!urls.length) {
      out.push(item);
      continue;
    }
    let batch: string[] = [];
    let partIndex = 0;
    const flush = () => {
      if (!batch.length) return;
      const name =
        partIndex === 0 ? item.name : `${item.name}__part${partIndex + 1}`;
      out.push({
        ...item,
        name,
        value: JSON.stringify(batch),
        order: item.order,
      });
      partIndex += 1;
      batch = [];
    };
    for (const url of urls) {
      const nextBatch = [...batch, url];
      if (
        JSON.stringify(nextBatch).length > USER_TASK_REPORT_VALUE_MAX &&
        batch.length
      ) {
        flush();
        batch = [url];
      } else {
        batch = nextBatch;
      }
    }
    flush();
  }
  return out;
}

/** Merge __partN rows back into one logical field for display/PDF. */
export function mergeChunkedReportItems<T extends { name: string; type: string; value: string; order?: number }>(
  reports: T[],
): T[] {
  if (!reports?.length) return reports;
  const partRe = /^(.+?)__part(\d+)$/;
  const singles: T[] = [];
  const groups = new Map<string, T[]>();

  for (const r of reports) {
    const m = partRe.exec(r.name);
    if (m && isMediaFieldType(r.type)) {
      const base = m[1];
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push(r);
    } else {
      singles.push(r);
    }
  }

  const merged: T[] = [...singles];
  for (const [base, parts] of groups) {
    parts.sort((a, b) => {
      const pa = parseInt(partRe.exec(a.name)?.[2] || '0', 10);
      const pb = parseInt(partRe.exec(b.name)?.[2] || '0', 10);
      return pa - pb;
    });
    const urls: string[] = [];
    for (const p of parts) {
      urls.push(...parseUrlList(p.value));
    }
    const first = parts[0];
    merged.push({
      ...first,
      name: base,
      value: JSON.stringify(urls),
    });
  }

  merged.sort((a, b) => (+a.order || 0) - (+b.order || 0));
  return merged;
}
