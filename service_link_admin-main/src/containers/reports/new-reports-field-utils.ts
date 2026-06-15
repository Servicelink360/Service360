import moment from "moment";
import { fixTextEncoding } from "@app/library/report-templates/templateItemUtils";

/** Em dash placeholder for empty table / meta values. */
export const EM_DASH = "—";

export type TemplateItem = {
  id?: number;
  name: string;
  type: string;
  order?: number;
  required?: boolean;
  value?: string;
  config?: Record<string, any>;
};

/** Unique Ant Design form keys — duplicate template item `name` values would otherwise hide fields. */
export const getTemplateFieldKey = (it: TemplateItem, idx: number) => {
  if (it.id != null && Number.isFinite(+it.id)) return `_tpl_${it.id}`;
  const base = String(it.name || "field").trim() || "field";
  return `${base}__${it.order ?? idx + 1}`;
};

const AUTO_MERGE_FIELD_TYPES = new Set([
  "[REPORT_DATE]",
  "[REPORT_TIME]",
  "[SITE_NAME]",
  "[SITE_ADDRESS]",
  "[CUSTOMER_NAME]",
  "[REPORT_BY]",
]);

export const isAutoMergeTemplateField = (it: TemplateItem) =>
  AUTO_MERGE_FIELD_TYPES.has(String(it?.type || "").toUpperCase());

export const autoMergeUsesPicker = (it: TemplateItem, isStaffUser: boolean): boolean => {
  const t = String(it?.type || "").toUpperCase();
  if (t !== "[REPORT_DATE]" && t !== "[REPORT_TIME]") return false;
  if (!isStaffUser) return true;
  const visibleToStaff = it?.config?.visibleToStaff;
  if (typeof visibleToStaff === "boolean") return visibleToStaff;
  return true;
};

export const resolveAutoMergeFieldValue = (
  it: TemplateItem,
  values: Record<string, any>,
  profile?: { fullName?: string; username?: string },
): string => {
  const t = String(it?.type || "").toUpperCase();
  if (t === "[REPORT_DATE]") return moment().format("YYYY-MM-DD");
  if (t === "[REPORT_TIME]") return moment().format("HH:mm:ss");
  if (t === "[SITE_NAME]") return String(values.siteName || "").trim();
  if (t === "[SITE_ADDRESS]") return String(values.siteAddress || "").trim();
  if (t === "[CUSTOMER_NAME]") {
    return String(values.companyName || values.customerName || "").trim();
  }
  if (t === "[REPORT_BY]") {
    return String(
      values.staffDisplayName ||
        values.reportBy ||
        profile?.fullName ||
        profile?.username ||
        "",
    ).trim();
  }
  return "";
};

export const isJunkTemplateField = (it: TemplateItem) => {
  const name = String(it?.name || "").trim().toLowerCase();
  const junkNames = [
    "section one - excutive summary",
    "section one - executive summary",
    "section two - contract review",
    "section three - inspections",
    "section four - staffing",
    "sective five - financials",
    "section five - financials",
    "section six- appendix",
    "section six - appendix",
    "description",
  ];
  if (junkNames.includes(name)) return true;
  if (name.startsWith("section one") || name.startsWith("section two") || name.startsWith("section three")) return true;
  if (name.startsWith("section four") || name.startsWith("section five") || name.startsWith("sective five") || name.startsWith("section six")) return true;
  // Some templates encode section headers as special types
  const t = String(it?.type || "").toUpperCase();
  if (t === "SECTION" || t === "TITLE" || t === "HEADER" || t === "DIVIDER") return true;
  return false;
};

/** Stored report values: JSON array string (admin IMAGES/VIDEOS), or legacy URL / comma-separated. */
export const parseMediaListValue = (v: unknown): string[] => {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v).trim();
  if (!s || s === "[]") return [];
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p)) return p.map(String).filter(Boolean);
    if (typeof p === "string" && p) return [p];
  } catch {
    if (/^https?:\/\//i.test(s) || s.startsWith("/")) return [s];
    return s.split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

export const isJsonMediaFieldType = (fieldType: string) =>
  ["IMAGES", "PHOTOS", "PHOTO", "IMAGE", "VIDEOS", "VIDEO"].includes(fieldType);

const reportItemPartRe = /^(.+?)__part(\d+)$/;

const normalizeReportFieldName = (name: string): string =>
  String(name || "")
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();

/** Strip __partN and " (2)" suffixes so split/chunk rows map to one template field. */
export const reportFieldStorageKey = (name: string): string => {
  let n = String(name || "").trim();
  const partM = reportItemPartRe.exec(n);
  if (partM) n = partM[1];
  const parenM = n.match(/^(.+?)\s\((\d+)\)$/);
  if (parenM) n = parenM[1];
  return normalizeReportFieldName(n);
};

const reportFieldDisplayName = (name: string): string => {
  let n = String(name || "").trim();
  const partM = reportItemPartRe.exec(n);
  if (partM) return partM[1];
  const parenM = n.match(/^(.+?)\s\(\d+\)$/);
  if (parenM) return parenM[1];
  return n;
};

/** Merge __partN chunks and duplicate " (2)" media rows into one JSON URL list per field. */
export const mergeReportMediaRowsForForm = (reports: any[]): any[] => {
  if (!Array.isArray(reports) || !reports.length) return reports;
  const nonMedia: any[] = [];
  const mediaGroups = new Map<string, any[]>();

  for (const r of reports) {
    const rt = String(r?.type || "").toUpperCase();
    if (!isJsonMediaFieldType(rt)) {
      nonMedia.push(r);
      continue;
    }
    const key = reportFieldStorageKey(r.name);
    if (!mediaGroups.has(key)) mediaGroups.set(key, []);
    mediaGroups.get(key)!.push(r);
  }

  const merged: any[] = [...nonMedia];
  for (const [, parts] of mediaGroups) {
    if (parts.length === 1) {
      merged.push({ ...parts[0], name: reportFieldDisplayName(parts[0].name) });
      continue;
    }
    const sorted = [...parts].sort((a, b) => {
      const ao = +a.order || 0;
      const bo = +b.order || 0;
      if (ao !== bo) return ao - bo;
      const pa = parseInt(reportItemPartRe.exec(String(a.name || ""))?.[2] || "0", 10);
      const pb = parseInt(reportItemPartRe.exec(String(b.name || ""))?.[2] || "0", 10);
      if (pa !== pb) return pa - pb;
      const da = parseInt(String(a.name || "").match(/\((\d+)\)$/)?.[1] || "1", 10);
      const db = parseInt(String(b.name || "").match(/\((\d+)\)$/)?.[1] || "1", 10);
      return da - db;
    });
    const urls: string[] = [];
    for (const p of sorted) {
      urls.push(...parseMediaListValue(p.value));
    }
    merged.push({
      ...sorted[0],
      name: reportFieldDisplayName(sorted[0].name),
      value: JSON.stringify(urls),
    });
  }

  return merged.sort((a, b) => (+a.order || 0) - (+b.order || 0));
};


export const getTemplateLabel = (it: TemplateItem) => {
  const raw = String(it?.config?.label || (it as any)?.label || it?.name || "").trim();
  return fixTextEncoding(raw);
};

export const isTimeLikeTemplateItem = (it: TemplateItem): boolean => {
  // Some templates have "Time", "Time " or "Time (optional)" as label/name.
  const raw = String(getTemplateLabel(it) || it?.name || "");
  const normalized = raw
    // Strip icons / punctuation / zero-width chars etc.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("time and date")) return false;
  return /\btime\b/.test(normalized);
};

export const isTimeLikeLabel = (label: unknown): boolean => {
  const raw = String(label ?? "");
  const normalized = raw
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("time and date")) return false;
  return /\btime\b/.test(normalized);
};

export const legacyFieldKey = (r: any, idx: number) =>
  `_legacy_${r?.id != null && Number.isFinite(+r.id) ? +r.id : r?.order != null && Number.isFinite(+r.order) ? +r.order : idx}`;

function templateFieldNameKeys(it: TemplateItem): string[] {
  const label = getTemplateLabel(it);
  const keys = new Set<string>();
  if (it.name) keys.add(reportFieldStorageKey(it.name));
  if (label) keys.add(reportFieldStorageKey(label));
  return [...keys];
}

function reportRowMatchesTemplateItem(rep: any, it: TemplateItem): boolean {
  const typeMatch =
    String(rep?.type || "").toUpperCase() === String(it?.type || "").toUpperCase();
  if (!typeMatch) return false;
  const rowKey = reportFieldStorageKey(rep?.name);
  return templateFieldNameKeys(it).some((k) => k === rowKey);
}

export function matchReportItemForTemplate(
  reports: any[],
  it: TemplateItem,
  idx: number,
): any | undefined {
  if (!Array.isArray(reports) || !reports.length) return undefined;
  const sorted = [...reports].sort((a, b) => (+a.order || 0) - (+b.order || 0));
  const typeMatch = (rep: any) =>
    String(rep.type || "").toUpperCase() === String(it.type || "").toUpperCase();
  const matches = sorted.filter((rep) => reportRowMatchesTemplateItem(rep, it));

  if (matches.length > 1 && isJsonMediaFieldType(String(it.type || "").toUpperCase())) {
    const urls: string[] = [];
    for (const m of matches) {
      urls.push(...parseMediaListValue(m.value));
    }
    const label = getTemplateLabel(it);
    return {
      ...matches[0],
      name: label || it.name || reportFieldDisplayName(matches[0].name),
      value: JSON.stringify(urls),
    };
  }

  if (matches.length === 1) return matches[0];

  const label = getTemplateLabel(it);
  return (
    sorted.find((rep) => rep.name === it.name && typeMatch(rep)) ??
    (label ? sorted.find((rep) => rep.name === label && typeMatch(rep)) : undefined) ??
    sorted.find(
      (rep) =>
        typeMatch(rep) &&
        templateFieldNameKeys(it).includes(reportFieldStorageKey(rep.name)),
    ) ??
    (sorted[idx] && typeMatch(sorted[idx]) ? sorted[idx] : undefined)
  );
}

export function parseReportItemValueForForm(r: any): any {
  if (!r) return undefined;
  const rt = String(r.type || "").toUpperCase();
  const isTimeLabel = isTimeLikeLabel(r?.name);
  if (rt === "TIME") {
    const v = String(r.value ?? "").trim();
    // Corrupt legacy values: TIME field sometimes stored photo JSON/URLs.
    if (!v || v.startsWith("[") || /^https?:\/\//i.test(v)) return undefined;
    return moment(moment().format(`YYYY-MM-DD ${v}`));
  }
  if (rt === "DATE" || rt === "DATE_PICKER") {
    return r.value ? moment(r.value) : undefined;
  }
  if (rt === "[REPORT_DATE]") {
    return r.value ? moment(r.value, "YYYY-MM-DD") : undefined;
  }
  if (rt === "[REPORT_TIME]") {
    const v = String(r.value ?? "").trim();
    if (!v || v.startsWith("[") || /^https?:\/\//i.test(v)) return undefined;
    return moment(moment().format(`YYYY-MM-DD ${v}`));
  }
  if ((rt === "TEXT" || rt === "DATETIME") && isTimeLabel) {
    const s = String(r.value ?? "").trim();
    if (!s || s.startsWith("[") || /^https?:\/\//i.test(s)) return undefined;
    const strict = moment(s, ["HH:mm:ss", "HH:mm", "h:mm:ss a", "h:mm a"], true);
    if (strict.isValid()) return strict;
    const loose = moment(new Date(s));
    return loose.isValid() ? loose : undefined;
  }
  if (isJsonMediaFieldType(rt)) {
    const urls = parseMediaListValue(r.value);
    return urls.length ? JSON.stringify(urls) : undefined;
  }
  return r.value;
}

/** Admin preset on YES_NO template fields (stored in item.value / config.defaultValue). */
export const getYesNoPreset = (item: TemplateItem): "YES" | "NO" | undefined => {
  const raw = String(item.value ?? item.config?.defaultValue ?? "")
    .trim()
    .toUpperCase();
  if (raw === "YES" || raw === "NO") return raw;
  return undefined;
};

function templateServiceIds(tpl: any): number[] {
  const raw = tpl?.serviceIds;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => +v).filter((n) => Number.isFinite(n) && n > 0);
}

/** Whether a template may be used at a site given that site's Service ids. */
export function templateMatchesSiteServices(tpl: any, siteDeptIds: number[]): boolean {
  if (!siteDeptIds.length) return false;
  const tplIds = templateServiceIds(tpl);
  if (!tplIds.length) return true;
  return tplIds.some((id) => siteDeptIds.includes(id));
}

export function serviceCandidatesForTemplateAtSite(
  tpl: any,
  siteServices: { id: number | string }[],
): number[] {
  const siteDeptIds = siteServices
    .map((d) => +d.id)
    .filter((n) => Number.isFinite(n) && n > 0);
  const tplIds = templateServiceIds(tpl);
  if (!tplIds.length) return siteDeptIds;
  return tplIds.filter((id) => siteDeptIds.includes(id));
}

export const getOptions = (item: TemplateItem): string[] => {
  const configOptions = Array.isArray(item?.config?.options) ? item.config?.options : [];
  if (configOptions.length) return configOptions;
  const t = String(item.type || "").toUpperCase();
  if (typeof item.value === "string" && (t === "SELECT" || t === "CHECKLIST")) {
    return item.value.split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};
