import moment from 'moment';
import React, { useMemo } from 'react';
import '../marketing/marketing.css';
import '../marketing/monthlyReport.css';
import MonthlyReportDocument, { MonthlyDraft } from './report-document';

type Kpi = { label: string; value: number; prior: number; note: string };
type WorkRow = {
  id: number;
  date: string;
  site: string;
  address: string;
  service: string;
  title: string;
  detail: string;
  kind: string;
  pdfFile?: string;
  staffName?: string;
};
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

function workDescription(service: string) {
  if (service === 'Roof and Gutter') return 'Roof and gutter Cleaning';
  if (service === 'Ground Maintenance') return 'Grounds Maintenance';
  if (service === 'Cleaning') return 'Cleaning';
  return service;
}

function streamHeading(service: string, period: string) {
  if (service === 'Roof and Gutter') return `Roof and Gutter – Scheduled work due for ${period}`;
  if (service === 'Ground Maintenance') return `Ground Maintenance – Scheduled work due for ${period}`;
  return `${service} – Scheduled for ${period}`;
}

const GROUP_ORDER = ['Early Learning Centers', 'Community Centers', 'Town Hall and Library', 'Aquatic Centers', 'Depot', 'Parks and amenities', 'Other sites'];
const SERVICE_ORDER = ['Cleaning', 'Ground Maintenance', 'Roof and Gutter', 'Adhoc'];

export function buildMonthlyDraft(pack: MonthlyPack): MonthlyDraft {
  const openFaults = pack.faults.filter((fault) => fault.status !== 'Completed');
  const urgentOpen = openFaults.filter((fault) => fault.priority === 'Urgent');
  const adhoc = pack.work.filter((row) => /adhoc/i.test(`${row.service} ${row.title} ${row.kind}`));
  const talks = pack.toolbox || [];
  const byService = new Map<string, WorkRow[]>();
  pack.work.forEach((row) => {
    if (/adhoc/i.test(`${row.service} ${row.title}`)) return;
    const key = serviceHeading(row.service);
    const list = byService.get(key) || [];
    list.push(row);
    byService.set(key, list);
  });
  const streams = [...byService.entries()]
    .sort((a, b) => {
      const ai = SERVICE_ORDER.indexOf(a[0]);
      const bi = SERVICE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a[0].localeCompare(b[0]);
    })
    .map(([service, rows]) => {
      const groups = new Map<string, Set<string>>();
      rows.forEach((row) => {
        const site = row.site || 'Unnamed site';
        const group = siteGroup(site);
        const names = groups.get(group) || new Set<string>();
        names.add(site);
        groups.set(group, names);
      });
      const summary = [...groups.entries()]
        .sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
        .map(([group, names]) => ({ group, completed: names.size }));
      const siteCount = [...groups.values()].reduce((total, names) => total + names.size, 0);
      return { service, jobs: rows.length, siteCount, summary };
    });
  const locations = pack.sites.filter((site) => site.jobs > 0).length;
  const contact = [pack.customer.contactName, pack.customer.email, pack.customer.phone].filter(Boolean).join(' · ');
  const serviceLine = streams.map((stream) => stream.service).join(' & ') || 'Monthly services';
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
    streams.some((stream) => stream.service === 'Roof and Gutter') ? 'Reports for Roof & Gutter all up to date' : '',
    streams.some((stream) => stream.service === 'Ground Maintenance') ? 'Reports for Gardening & Ground Maintenance all up to date' : '',
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
    services: pack.services.slice(0, 6).map((row) => ({ name: row.name, value: String(row.value) })),
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
          ? `All sites inspected. ${pack.work.length} completed jobs across ${streams.map((stream) => `${stream.service} (${stream.jobs})`).join(', ') || 'the contracted services'}.`
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
    streams: streams.map((stream) => ({
      heading: streamHeading(stream.service, pack.period.label),
      note: `${stream.jobs} completed visits across ${stream.siteCount} sites. Reports are available on the Service360 platform with timestamped photos.`,
      summary: stream.summary.map((row) => ({
        month: monthStamp,
        group: row.group,
        description: workDescription(stream.service),
        schedule: String(row.completed),
        completed: String(row.completed),
        comments: stream.service === 'Ground Maintenance'
          ? 'All work completed according to schedule. All rubbish removed off site. Yard clean after finish.'
          : 'All reports are available on the Service360 platform with timestamped photos.',
      })),
    })),
    feedbackHeading: `${pack.customer.name} feedback`,
    feedback: pack.faults.map((fault) => ({
      site: fault.site,
      feedback: fault.title,
      comment: fault.detail || `${fault.priority} – ${fault.status}`,
      rectified: fault.status === 'Completed' ? formatWhen(fault.date) : '',
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
