import moment from 'moment';
import React, { useMemo } from 'react';
import { visitsDueThisMonth } from '../../library/helpers/monthlyScheduleVisits';
import '../marketing/marketing.css';
import '../marketing/monthlyReport.css';
import MonthlyReportDocument, { MonthlyDraft } from './report-document';

type Kpi = { label: string; value: number; prior: number; note: string };
type WorkRow = {
  id: number;
  date: string;
  siteId?: number | null;
  site: string;
  address: string;
  serviceId?: number | null;
  service: string;
  title: string;
  detail: string;
  kind: string;
  pdfFile?: string;
  staffName?: string;
};

type StreamDef = {
  key: string;
  serviceId: number | null;
  /** Canonical bucket used for Roof / Ground / Cleaning / Adhoc copy. */
  kind: string;
  /** Exact service name from /services (or work), so each service keeps its own section. */
  label: string;
  rows: WorkRow[];
  sites: Set<string>;
  /** Expected visits this month from /sites frequency, keyed by site name. */
  scheduleBySite: Map<string, number>;
  /** Contracted site id → canonical site name (for matching New Reports uploads). */
  siteNameById: Map<number, string>;
};

function normSite(value: string) {
  return String(value || '').trim().toLowerCase();
}
type FaultRow = {
  id: number;
  date: string;
  site: string;
  title: string;
  priority: string;
  status: string;
  detail?: string;
};
export type MonthlyPack = {
  customer: {
    companyId?: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    contactName: string;
  };
  period: { label: string; from: string; to: string; priorLabel: string; month?: string };
  edit?: Partial<MonthlyDraft> | null;
  summary: string[];
  kpis: Kpi[];
  sites: { site: string; jobs: number; faults: number; tickets: number }[];
  services: { name: string; value: number }[];
  /** Job-site services assigned to this customer (all provided services, not only those with jobs this month). */
  contractedServices?: {
    id: number;
    name: string;
    sites: {
      id: number;
      name: string;
      /** Parent roll-up address listing child parks (1.Park A, 2.Park B, …). */
      addressName?: string;
      frequencyTimes?: number | null;
      frequencyCount?: number | null;
      frequencyPeriod?: string | null;
      /** Visits due this report month from /sites frequency (simple or detailed). */
      scheduleVisits?: number;
      monthCadence?: string | null;
    }[];
  }[];
  /** Consumable deliveries emailed to this client in the period. */
  consumables?: {
    id: number;
    date: string;
    site: string;
    subject: string;
    emailedTo?: string;
    items: string[];
    itemsLabel: string;
  }[];
  work: WorkRow[];
  faults: FaultRow[];
  tickets: { id: number; date: string; site: string; title: string; status: string }[];
  invoices: { id: number; date: string; title: string }[];
  personnel: { name: string; role: string }[];
  toolbox?: { date: string; title: string; site: string; ledBy: string; notes: string }[];
};

function formatWhen(value?: string) {
  if (!value) return '';
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
}

function serviceHeading(name: string) {
  const text = name.toLowerCase();
  if (/roof|gutter/.test(text)) return 'Roof and Gutter';
  if (/ground|garden/.test(text)) return 'Ground Maintenance';
  if (/clean/.test(text)) return 'Cleaning';
  if (/adhoc/.test(text)) return 'Adhoc';
  return name || 'Other';
}

function siteGroup(name: string) {
  const text = name.toLowerCase();
  if (/child|elc|\bccc\b|kindergarten|preschool|day care|daycare/.test(text)) return 'Early Learning Centers';
  if (/aquatic|pool|swim/.test(text)) return 'Aquatic Centers';
  if (/town hall|townhall|library/.test(text)) return 'Town Hall and Library';
  if (/depot/.test(text)) return 'Depot';
  if (/community|hall|centre|center/.test(text)) return 'Community Centers';
  if (/toilet|amenit|park|oval|pavilion/.test(text)) return 'Parks and amenities';
  return 'Other sites';
}

function streamHeading(_service: string, period: string, label = _service) {
  // Always use exact /services name (e.g. Car park cleaning, Public Amenities Cleaning).
  return `${label} – Scheduled work due for ${period}`;
}

function detailHeading(_service: string, period: string, label = _service) {
  return `${label} – Work completed for ${period}`;
}

function detailNote(service: string, label = service) {
  if (service === 'Adhoc') {
    return label.endsWith('.') ? label : `${label}.`;
  }
  return `Note: ${label} reports are available on the Service360 platform with timestamped photos.`;
}

function isAdhocServiceName(name: string) {
  return /adhoc/i.test(String(name || ''));
}

/** Adhoc / fault / reactive uploads have no site frequency — count completed only, never %. */
function isUnscheduledReport(row: WorkRow) {
  const text = `${row.service || ''} ${row.title || ''} ${row.kind || ''}`;
  return isAdhocServiceName(text) || /fault|reactive/i.test(text);
}

type VisitRow = {
  site: string;
  dates: string;
  dateLinks: { date: string; id: number }[];
  quality: string;
  comments: string;
  /** Parent amenity name only — children under it carry the inspection dates. */
  isGroupHeader?: boolean;
  /** Child park/site row under a parent amenities header. */
  isGroupChild?: boolean;
};

/** True for parent portfolio sites such as Bayside / Mascot Public Amenities. */
function isAmenityParentName(name: string) {
  return /\bpublic\s+amenities\b/i.test(String(name || '').trim());
}

/**
 * Parse parent address_name into child park labels.
 * Supports numbered lists ("1.Park A, 2.Park B") and comma lists
 * ("Sites:Rockdale Park, Ador Avenue Reserve, …").
 */
function childLabelsFromAddress(address: string) {
  let text = String(address || '').trim();
  if (!text) return [];
  text = text.replace(/^sites?\s*:\s*/i, '').trim();
  if (/\d+\.\s*\S/.test(text)) {
    return text
      .split(/\d+\.\s*/)
      .map((part) => part.replace(/[.,]\s*$/g, '').trim())
      .filter(Boolean);
  }
  return text
    .split(',')
    .map((part) => part.replace(/^[.\s]+|[.\s]+$/g, '').trim())
    .filter(Boolean);
}

function softSiteMatch(a: string, b: string) {
  const na = normSite(a).replace(/[^a-z0-9]+/g, '');
  const nb = normSite(b).replace(/[^a-z0-9]+/g, '');
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function siteVisits(rows: WorkRow[], allSites: string[] = [], includeEmptySites = false): VisitRow[] {
  const bySite = new Map<string, { date: string; id: number }[]>();
  if (includeEmptySites) {
    allSites.forEach((site) => {
      const name = String(site || '').trim() || 'Unnamed site';
      if (!bySite.has(name)) bySite.set(name, []);
    });
  }
  rows.forEach((row) => {
    const site = row.site || 'Unnamed site';
    const date = formatWhen(row.date);
    const id = Number(row.id);
    if (!date || !Number.isFinite(id) || id <= 0) return;
    const list = bySite.get(site) || [];
    if (!list.some((item) => item.id === id)) list.push({ date, id });
    bySite.set(site, list);
  });
  return [...bySite.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([, dateLinks]) => includeEmptySites || dateLinks.length > 0)
    .map(([site, dateLinks]) => {
      const links = uniqueDateLinks(dateLinks);
      return {
        site,
        dates: links.map((item) => item.date).join(', '),
        dateLinks: links,
        quality: '',
        comments: '',
      };
    });
}

function sortDateLinks(links: { date: string; id: number }[]) {
  return [...links].sort((a, b) => {
    const [da, ma, ya] = a.date.split('/').map(Number);
    const [db, mb, yb] = b.date.split('/').map(Number);
    return (yb - ya) || (mb - ma) || (db - da) || (b.id - a.id);
  });
}

/** One link per calendar day (keep newest report id) — avoid "12/10/2026, 12/10/2026, …". */
function uniqueDateLinks(links: { date: string; id: number }[]) {
  const seen = new Set<string>();
  const out: { date: string; id: number }[] = [];
  sortDateLinks(links).forEach((link) => {
    const day = String(link.date || '').trim();
    if (!day || seen.has(day)) return;
    seen.add(day);
    out.push(link);
  });
  return out;
}

/**
 * Parent amenity = name-only header; child parks under it carry the inspection dates.
 * Example:
 *   Mascot Public Amenities
 *   870 Botany Rd-Mascot     | dates…
 *   John Curtin…            | dates…
 */
function groupVisitsByParentAmenities(
  visits: VisitRow[],
  contractedSites: { name: string; addressName?: string }[],
): VisitRow[] {
  const byName = new Map<string, { name: string; labels: string[] }>();
  const remember = (name: string, labels: string[] = []) => {
    const key = normSite(name);
    if (!key) return;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { name, labels: [...labels] });
      return;
    }
    labels.forEach((label) => {
      if (!existing.labels.some((item) => softSiteMatch(item, label))) {
        existing.labels.push(label);
      }
    });
  };

  // Only Bayside / Mascot Public Amenities (etc.) are parents — never child parks
  // like John Curtin Memorial Reserve, even if they have an address_name list.
  contractedSites.forEach((site) => {
    if (!isAmenityParentName(site.name)) return;
    remember(site.name, childLabelsFromAddress(site.addressName || ''));
  });
  visits.forEach((visit) => {
    if (isAmenityParentName(visit.site)) remember(visit.site, []);
  });

  const parentRank = (name: string) => {
    if (/bayside/i.test(name)) return 0;
    if (/mascot/i.test(name)) return 1;
    return 2;
  };
  const parents = [...byName.values()].sort(
    (a, b) => parentRank(a.name) - parentRank(b.name) || a.name.localeCompare(b.name),
  );
  if (!parents.length) return visits;

  const isChildOf = (siteName: string, labels: string[]) =>
    labels.some((label) => softSiteMatch(siteName, label));

  const grouped: VisitRow[] = [];
  const used = new Set<string>();

  parents.forEach((parent) => {
    const parentVisit = visits.find((item) => softSiteMatch(item.site, parent.name));
    const childVisits = visits.filter((item) => isChildOf(item.site, parent.labels));
    const parentLinks = uniqueDateLinks(
      (parentVisit?.dateLinks?.length
        ? parentVisit.dateLinks
        : childVisits.flatMap((item) => item.dateLinks || []))
        .filter((link, index, all) => all.findIndex((item) => item.id === link.id) === index),
    );
    const parentDates = parentLinks.map((link) => link.date).join(', ');

    // Prefer the clean contracted/parent name (not a wrapped/truncated visit label).
    const headerName = parent.name.replace(/\s+/g, ' ').trim()
      || parentVisit?.site
      || 'Public Amenities';

    // Resolve each address label to a contracted/visit site name when possible.
    const children = parent.labels
      .map((label) => {
        const fromVisits = visits.find((item) => softSiteMatch(item.site, label));
        const fromContract = contractedSites.find((item) => softSiteMatch(item.name, label));
        return {
          label,
          site: fromVisits?.site || fromContract?.name || label,
          ownLinks: fromVisits?.dateLinks || [],
          ownQuality: fromVisits?.quality || '',
          ownComments: fromVisits?.comments || '',
        };
      })
      .filter((row) => !softSiteMatch(row.site, headerName))
      .filter((row) => !isAmenityParentName(row.site))
      .filter((row, index, all) => all.findIndex((item) => softSiteMatch(item.site, row.site)) === index);

    grouped.push({
      site: headerName,
      dateLinks: [],
      dates: '',
      quality: '',
      comments: '',
      isGroupHeader: true,
    });
    used.add(normSite(headerName));
    if (parentVisit) used.add(normSite(parentVisit.site));

    children.forEach((child) => {
      const links = uniqueDateLinks(
        (child.ownLinks.length ? child.ownLinks : parentLinks).map((link) => ({ ...link })),
      );
      grouped.push({
        site: child.site,
        dateLinks: links,
        dates: links.map((link) => link.date).join(', ') || parentDates,
        quality: child.ownQuality || 'Satisfactory',
        comments: child.ownComments || '',
        isGroupChild: true,
      });
      used.add(normSite(child.site));
    });
  });

  visits.forEach((visit) => {
    if (used.has(normSite(visit.site))) return;
    if (parents.some((parent) => softSiteMatch(visit.site, parent.name))) return;
    if (parents.some((parent) => isChildOf(visit.site, parent.labels))) return;
    if (isAmenityParentName(visit.site)) return;
    grouped.push(visit);
  });

  return grouped;
}

const GROUP_ORDER = ['Early Learning Centers', 'Community Centers', 'Town Hall and Library', 'Aquatic Centers', 'Depot', 'Parks and amenities', 'Other sites'];
const SERVICE_ORDER = ['Cleaning', 'Ground Maintenance', 'Roof and Gutter', 'Adhoc'];

export function buildMonthlyDraft(pack: MonthlyPack): MonthlyDraft {
  const openFaults = pack.faults.filter((fault) => fault.status !== 'Completed');
  const urgentOpen = openFaults.filter((fault) => fault.priority === 'Urgent');
  // Financials 5.3 still lists adhoc rows; inspections also keep each Adhoc service stream.
  const adhoc = pack.work.filter((row) => isAdhocServiceName(`${row.service} ${row.title} ${row.kind}`));
  const talks = pack.toolbox || [];
  const contracted = pack.contractedServices || [];

  // One inspections stream per contracted /services row (Roof and Gutter ≠ Ground Maintenance).
  const streamMap = new Map<string, StreamDef>();
  const ensureStream = (opts: {
    serviceId?: number | null;
    name: string;
  }): StreamDef => {
    const name = String(opts.name || '').trim() || 'Other';
    const serviceId = opts.serviceId != null && +opts.serviceId > 0 ? +opts.serviceId : null;
    const key = serviceId ? `id:${serviceId}` : `name:${serviceHeading(name).toLowerCase()}`;
    const existing = streamMap.get(key);
    if (existing) {
      if (!existing.label && name) existing.label = name;
      return existing;
    }
    const created: StreamDef = {
      key,
      serviceId,
      kind: serviceHeading(name),
      label: name,
      rows: [],
      sites: new Set<string>(),
      scheduleBySite: new Map<string, number>(),
      siteNameById: new Map<number, string>(),
    };
    streamMap.set(key, created);
    return created;
  };

  const monthMoment = moment(pack.period.from);
  const monthIndex = monthMoment.isValid() ? monthMoment.month() : 0;
  const daysInMonth = monthMoment.isValid() ? monthMoment.daysInMonth() : 30;

  contracted.forEach((svc) => {
    const stream = ensureStream({ serviceId: svc.id, name: svc.name });
    (svc.sites || []).forEach((site) => {
      const siteName = site.name || 'Unnamed site';
      stream.sites.add(siteName);
      if (+site.id > 0) stream.siteNameById.set(+site.id, siteName);
      const due = visitsDueThisMonth(site, monthIndex, daysInMonth);
      stream.scheduleBySite.set(siteName, Math.max(stream.scheduleBySite.get(siteName) || 0, due));
    });
  });

  const servicesForSite = (row: WorkRow) => {
    const siteId = row.siteId != null && +row.siteId > 0 ? +row.siteId : null;
    const siteKey = normSite(row.site);
    return contracted.filter((svc) =>
      (svc.sites || []).some((site) =>
        (siteId != null && +site.id === siteId)
        || (siteKey && normSite(site.name) === siteKey),
      ),
    );
  };

  const matchContracted = (row: WorkRow) => {
    if (row.serviceId != null && +row.serviceId > 0) {
      const byId = contracted.find((svc) => +svc.id === +row.serviceId!);
      if (byId) return byId;
    }
    const heading = serviceHeading(row.service);
    const byName = contracted.filter((svc) => serviceHeading(svc.name) === heading);
    if (byName.length === 1) return byName[0];
    const exact = byName.find(
      (svc) => String(svc.name || '').trim().toLowerCase() === String(row.service || '').trim().toLowerCase(),
    );
    if (exact) return exact;
    // Fall back: New Report uploaded for a contracted site → count against that site's service.
    const bySite = servicesForSite(row);
    if (bySite.length === 1) return bySite[0];
    if (bySite.length > 1 && byName.length) {
      const overlap = bySite.find((svc) => byName.some((named) => +named.id === +svc.id));
      if (overlap) return overlap;
    }
    return bySite[0] || byName[0] || null;
  };

  /** Resolve report site to the contracted site name used for schedule, so 1×/month + 1 upload = 100%. */
  const resolveStreamSite = (stream: StreamDef, row: WorkRow) => {
    const siteId = row.siteId != null && +row.siteId > 0 ? +row.siteId : null;
    if (siteId != null && stream.siteNameById.has(siteId)) {
      return stream.siteNameById.get(siteId)!;
    }
    const siteKey = normSite(row.site);
    if (siteKey) {
      const match = [...stream.sites].find((name) => normSite(name) === siteKey);
      if (match) return match;
    }
    return String(row.site || '').trim() || 'Unnamed site';
  };

  pack.work.forEach((row) => {
    const matched = matchContracted(row);
    const stream = ensureStream({
      serviceId: matched?.id ?? row.serviceId,
      name: matched?.name || row.service || 'Other',
    });
    // Canonical site name from /sites so completed lines up with frequency schedule.
    const site = resolveStreamSite(stream, row);
    stream.rows.push({ ...row, site });
    stream.sites.add(site);
  });

  // Fallback: if site_items are empty, still use services chart / work names.
  if (!streamMap.size) {
    (pack.services || []).forEach((svc) => {
      ensureStream({ name: svc.name });
    });
  }

  const streams = [...streamMap.values()]
    .sort((a, b) => {
      const ai = SERVICE_ORDER.indexOf(a.kind);
      const bi = SERVICE_ORDER.indexOf(b.kind);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.label.localeCompare(b.label);
    })
    .map((stream) => {
      // Schedule vs completed: ONLY sites with a /new-reports upload this month.
      // Do not count every contracted site. Example: 1×/month frequency + 1 report = 100%.
      // Uploads still count as completed when the site has no /sites frequency yet
      // (otherwise Car park / parent amenity sites show 0/0 despite New Reports).
      const reportsBySite = new Map<string, number>();
      stream.rows.forEach((row) => {
        if (isUnscheduledReport(row)) return;
        const site = row.site || 'Unnamed site';
        reportsBySite.set(site, (reportsBySite.get(site) || 0) + 1);
      });

      // Bayside / Mascot Public Amenities: schedule = parent frequency (1×/day).
      // Child-park uploads roll into the parent. 4 done of 20 due = 20%, never 100%.
      const amenityContractSites = (contracted.find((svc) =>
        (stream.serviceId != null && +svc.id === +stream.serviceId)
        || String(svc.name || '').trim().toLowerCase() === String(stream.label || '').trim().toLowerCase(),
      )?.sites || []);
      const amenityParents = amenityContractSites
        .filter((site) => isAmenityParentName(site.name))
        .map((site) => ({
          name: site.name,
          labels: childLabelsFromAddress(site.addressName || ''),
        }))
        .filter((site) => site.labels.length > 0);
      if (amenityParents.length) {
        amenityParents.forEach((parent) => {
          let rolled = 0;
          [...reportsBySite.entries()].forEach(([site, reports]) => {
            const underParent = softSiteMatch(site, parent.name)
              || parent.labels.some((label) => softSiteMatch(site, label));
            if (!underParent) return;
            rolled += reports;
            reportsBySite.delete(site);
          });
          // Prefer the contracted parent name so scheduleBySite frequency matches.
          const parentKey =
            [...stream.scheduleBySite.keys()].find((name) => softSiteMatch(name, parent.name))
            || parent.name;
          if (rolled > 0) reportsBySite.set(parentKey, rolled);
          // Child parks have no own frequency — clear any leftover schedule on them.
          parent.labels.forEach((label) => {
            [...stream.scheduleBySite.keys()].forEach((siteName) => {
              if (softSiteMatch(siteName, parent.name)) return;
              if (softSiteMatch(siteName, label)) stream.scheduleBySite.set(siteName, 0);
            });
          });
        });
      }

      const groups = new Map<string, { schedule: number; completed: number; sites: Set<string> }>();
      reportsBySite.forEach((reports, site) => {
        if (reports <= 0) return;
        const freqDue = stream.scheduleBySite.get(site) || 0;
        // No /sites frequency: count uploads only (schedule=completed). Never invent 100% over a real due.
        const due = freqDue > 0 ? freqDue : reports;
        const group = siteGroup(site);
        const entry = groups.get(group) || { schedule: 0, completed: 0, sites: new Set<string>() };
        if (!entry.sites.has(site)) {
          entry.sites.add(site);
          entry.schedule += due;
        }
        entry.completed += Math.min(reports, due);
        groups.set(group, entry);
      });
      const summary = [...groups.entries()]
        .filter(([, entry]) => entry.schedule > 0 || entry.completed > 0)
        .sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
        .map(([group, entry]) => ({
          group,
          schedule: entry.schedule,
          // Never show completed above schedule on the chart (caps 133%/150% pills).
          completed: Math.min(entry.completed, entry.schedule),
        }));
      const siteCount = [...groups.values()].reduce((total, entry) => total + entry.sites.size, 0);
      return {
        key: stream.key,
        serviceId: stream.serviceId,
        kind: stream.kind,
        label: stream.label,
        rows: stream.rows,
        siteNames: [...stream.sites].sort((a, b) => a.localeCompare(b)),
        jobs: stream.rows.length,
        siteCount,
        summary,
      };
    });
  const locations = pack.sites.filter((site) => site.jobs > 0).length
    || pack.sites.length
    || contracted.reduce((total, svc) => total + (svc.sites?.length || 0), 0);
  const contact = [pack.customer.contactName, pack.customer.email, pack.customer.phone].filter(Boolean).join(' · ');
  // Cover/PDF report name = this client's contracted /services, never Reactive/Adhoc.
  // Order by jobs this month (desc) so e.g. Public Amenities Cleaning & Car park cleaning.
  const jobsByServiceId = new Map<number, number>();
  const jobsByServiceName = new Map<string, number>();
  streams.forEach((stream) => {
    if (stream.kind === 'Adhoc' || /adhoc|reactive/i.test(stream.label)) return;
    if (stream.serviceId != null && stream.serviceId > 0) {
      jobsByServiceId.set(stream.serviceId, (jobsByServiceId.get(stream.serviceId) || 0) + stream.jobs);
    }
    const key = String(stream.label || '').trim().toLowerCase();
    if (key) jobsByServiceName.set(key, (jobsByServiceName.get(key) || 0) + stream.jobs);
  });
  const serviceLineNames = contracted
    .map((svc) => ({
      name: String(svc.name || '').replace(/\s+/g, ' ').trim(),
      jobs: (svc.id != null && jobsByServiceId.get(+svc.id))
        || jobsByServiceName.get(String(svc.name || '').trim().toLowerCase())
        || 0,
    }))
    .filter((row) => row.name && !/adhoc|reactive/i.test(row.name))
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name))
    .map((row) => row.name)
    .filter((name, index, all) => all.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
  const serviceLine = serviceLineNames.join(' & ') || 'Monthly services';
  const closedFaults = pack.faults.filter((fault) => fault.status === 'Completed').length;
  const buckets = new Map<string, { week: string; jobs: number; faults: number; tickets: number }>();
  const addBucket = (date: string, key: 'jobs' | 'faults' | 'tickets') => {
    const parsed = moment(date);
    if (!parsed.isValid()) return;
    const start = parsed.clone().startOf('isoWeek');
    const id = start.format('YYYY-MM-DD');
    const row = buckets.get(id) || { week: start.format('D MMM'), jobs: 0, faults: 0, tickets: 0 };
    row[key] += 1;
    buckets.set(id, row);
  };
  pack.work.forEach((row) => addBucket(row.date, 'jobs'));
  pack.faults.forEach((row) => addBucket(row.date, 'faults'));
  pack.tickets.forEach((row) => addBucket(row.date, 'tickets'));
  const weekly = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map((entry) => entry[1]);
  const monthStamp = moment(pack.period.from).isValid()
    ? moment(pack.period.from).format('MMM YYYY')
    : pack.period.label;
  const whsMonths = [2, 1, 0].map((offset) => (
    moment(pack.period.from).isValid()
      ? moment(pack.period.from).clone().subtract(offset, 'months').format('MMM YYYY')
      : pack.period.label
  ));
  const zero = { m1: '0', m2: '0', m3: '0', ytd: '0' };
  const talkTitles = talks
    .map((talk) => talk.title)
    .filter((title, index, all) => title && all.indexOf(title) === index);
  const minuteLines = [
    streams.some((stream) => stream.kind === 'Roof and Gutter') ? 'Reports for Roof & Gutter all up to date' : '',
    streams.some((stream) => stream.kind === 'Ground Maintenance') ? 'Reports for Gardening & Ground Maintenance all up to date' : '',
  ].filter(Boolean);
  return {
    serviceLine,
    clientName: pack.customer.name,
    address: pack.customer.address || '',
    contact,
    periodLabel: pack.period.label,
    periodRange: `${formatWhen(pack.period.from)} to ${formatWhen(pack.period.to)}`,
    jobs: String(pack.work.length),
    locations: String(locations),
    preparedBy: 'ServiceLink Pty Ltd\nService360',
    glanceNote: 'Weekly volume and work by service.',
    weekly: weekly.map((row) => ({
      week: row.week,
      jobs: String(row.jobs),
      faults: String(row.faults),
      tickets: String(row.tickets),
    })),
    services: pack.services.map((row) => ({ name: row.name, value: String(row.value) })),
    serviceDelivery: `Servicelink will continue to deliver the full service to ${pack.customer.name} under the term and agreement by providing a weekly report with time stamped photos, and all reports are available on the Service360 platform.`,
    disruptions: urgentOpen.length
      ? urgentOpen.map((fault) => `${fault.site ? `${fault.site}: ` : ''}${fault.title} (${fault.status})`).join('\n')
      : 'Nil',
    generalIssues: openFaults.length
      ? openFaults.map((fault) => `${fault.site ? `${fault.site}: ` : ''}${fault.title} – ${fault.priority}, ${fault.status}`).join('\n')
      : 'Nil',
    previousMinutes: minuteLines.join('\n') || 'Nil',
    compliance: [
      { area: 'Insurance', yes: 'Yes', no: '', comments: 'Both workers compensation and public liability are up to date.' },
      { area: 'Accreditations', yes: 'Yes', no: '', comments: 'All ISO accreditations are up to date.' },
      {
        area: 'Periodicals',
        yes: pack.work.length ? 'Yes' : '',
        no: pack.work.length ? '' : 'No',
        comments: pack.work.length
          ? `All sites inspected. ${pack.work.length} completed jobs across ${streams
            .filter((stream) => stream.kind !== 'Adhoc' && !/adhoc|reactive/i.test(stream.label))
            .map((stream) => `${stream.label} (${stream.jobs})`)
            .join(', ') || 'the contracted services'}.`
          : 'No completed jobs were recorded this month.',
      },
      {
        area: 'Response',
        yes: openFaults.length ? '' : 'Yes',
        no: '',
        comments: pack.faults.length
          ? `${closedFaults} of ${pack.faults.length} faults completed. ${pack.tickets.length} tickets raised. Additional requests are listed in section 5.3.`
          : 'All additional requests responded to within the agreed time frame.',
      },
      {
        area: 'Staff Toolbox talk Training',
        yes: talks.length ? 'Yes' : '',
        no: '',
        comments: talkTitles.length ? talkTitles.join('; ') : 'Nil',
      },
      { area: 'New starters Police check & Visa check', yes: '', no: '', comments: 'Nil' },
      { area: 'Safety Audit', yes: 'Yes', no: '', comments: 'All safety audits were completed for all sites. All technicians are compliant. SWMS are up to date.' },
    ],
    whsScope: 'All Sites – Childcares, Community and Aquatics',
    whsMonth1: whsMonths[0],
    whsMonth2: whsMonths[1],
    whsMonth3: whsMonths[2],
    whs: [
      { label: 'Number of Injuries', ...zero },
      { label: 'Number of lost time injuries', ...zero },
      { label: 'Working days lost due to injury', ...zero },
      { label: 'Number of Near Misses', ...zero },
      { label: 'Public Liability Claims', ...zero },
      { label: 'Workers Compensation Claims', ...zero },
      { label: 'Number of risk/hazard inspection conducted', ...zero },
    ],
    environmental: [
      { area: 'Environment', comments: "Compliance with Contractor's Environmental Management Plan" },
      { area: 'Performance Standard', comments: 'Zero Non-Compliance' },
      { area: 'Measurement Methodology', comments: `Number of non-compliances formally issued by ${pack.customer.name}` },
      { area: 'Performance Target', comments: 'Zero Non-Compliance' },
      { area: 'Assessment Frequency', comments: 'Quarterly' },
    ],
    streams: streams.map((stream) => {
      const label = stream.label;
      const kind = stream.kind;
      // Cleaning: every contracted site + Bayside/Mascot parent→child grouping.
      // Adhoc / other streams: only real dated visits — never empty amenity Nil rows.
      const contractedSites = (contracted.find((svc) =>
        (stream.serviceId != null && +svc.id === +stream.serviceId)
        || String(svc.name || '').trim().toLowerCase() === String(label || '').trim().toLowerCase(),
      )?.sites || []).map((site) => ({
        name: site.name,
        addressName: site.addressName,
      }));
      const rawVisits = siteVisits(stream.rows, stream.siteNames || [], kind === 'Cleaning');
      const visits = kind === 'Cleaning'
        ? groupVisitsByParentAmenities(rawVisits, contractedSites)
        : rawVisits;
      return {
        heading: streamHeading(kind, pack.period.label, label),
        note: stream.jobs
          ? `${stream.jobs} completed visits across ${
              visits.filter((row) => !row.isGroupHeader).length || stream.siteCount
            } sites.`
          : stream.siteCount
            ? `No completed visits this period across ${stream.siteCount} contracted sites.`
            : 'No completed visits this period.',
        detailHeading: detailHeading(kind, pack.period.label, label),
        detailNote: detailNote(kind, label),
        showQuality: kind === 'Cleaning',
        summary: stream.summary.length
          ? stream.summary.map((row) => ({
            month: monthStamp,
            group: row.group,
            description: label,
            schedule: String(row.schedule),
            completed: String(row.completed),
            comments: kind === 'Ground Maintenance' || kind === 'Roof and Gutter'
              ? 'All work completed according to schedule. All rubbish removed off site. Yard clean after finish.'
              : row.schedule > 0
                ? 'All reports are available on the Service360 platform with timestamped photos.'
                : 'Completed visits recorded; set /sites frequency to show scheduled targets and %.',
          }))
          : [{
            month: monthStamp,
            group: '',
            description: label,
            schedule: '',
            completed: '',
            comments: 'No completed visits recorded this period.',
          }],
        visits: visits.map((row) => ({
          site: row.site,
          dates: row.dates,
          dateLinks: row.dateLinks,
          quality: row.quality,
          comments: row.comments,
          ...(row.isGroupHeader ? { isGroupHeader: true } : {}),
          ...(row.isGroupChild ? { isGroupChild: true } : {}),
        })),
      };
    }),
    feedbackHeading: `${pack.customer.name} Faults Reports`,
    feedback: pack.faults.map((fault) => ({
      id: fault.id,
      site: fault.site,
      feedback: fault.title,
      comment: fault.detail && fault.detail !== fault.title
        ? fault.detail
        : `${fault.priority} – ${fault.status}`,
      // Fault created_at = date reported (always show, even if still open).
      rectified: formatWhen(fault.date),
    })),
    toolbox: talks.map((talk) => ({
      title: talk.title,
      date: formatWhen(talk.date),
      detail: [talk.ledBy ? `Led by ${talk.ledBy}` : '', talk.site, 'Delivered to Servicelink staff.'].filter(Boolean).join('. '),
    })),
    staffChanges: `New staff – Nil for ${pack.period.label}`,
    staffFeedback: 'Nil',
    recognition: 'Nil',
    invoiceIntro: pack.invoices.length ? 'Outstanding invoices' : `No overdue invoices were recorded for ${pack.period.label}.`,
    invoices: pack.invoices.map((invoice) => ({
      number: invoice.title,
      detail: formatWhen(invoice.date),
    })),
    variations: [],
    variationComments: `Nil for ${pack.period.label}.`,
    adhoc: adhoc.map((row) => ({
      site: row.site,
      description: row.title || row.service,
      requestedBy: '',
      date: formatWhen(row.date),
      amount: '',
    })),
    adhocComments: adhoc.length
      ? 'All adhoc has been completed to a satisfactory level. Photos and reports were provided via the Service360 platform.'
      : 'Nil',
    quotes: `Nil recorded for ${pack.period.label}.`,
    consumables: (pack.consumables || []).map((row) => ({
      date: formatWhen(row.date),
      site: row.site || '',
      subject: row.subject || 'Consumables delivery',
      items: row.itemsLabel || (row.items || []).join('; '),
    })),
    consumablesComments: (pack.consumables || []).length
      ? `${pack.consumables!.length} consumable delivery${pack.consumables!.length === 1 ? '' : 'ies'} emailed to the client in ${pack.period.label}.`
      : `No consumables were emailed to the client in ${pack.period.label}.`,
  };
}

export default function MonthlyCustomerPack({
  pack,
  onBack,
  startEditing = false,
}: {
  pack: MonthlyPack;
  onBack?: () => void;
  startEditing?: boolean;
}) {
  const seed = useMemo(() => buildMonthlyDraft(pack), [pack]);

  return (
    <MonthlyReportDocument
      seed={seed}
      saved={pack.edit}
      companyId={pack.customer.companyId}
      month={pack.period.month}
      onBack={onBack}
      startEditing={startEditing}
    />
  );
}
