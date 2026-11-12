import {
  AccountBookOutlined,
  AimOutlined,
  BankOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentFilled,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  HomeOutlined,
  PhoneFilled,
  ReadOutlined,
  SearchOutlined,
  ShopOutlined,
  SolutionOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Button, Input, message } from 'antd';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { userType } from '../../constants/statusUser';
import { callAPIAsync } from '../../library/helpers/api';

const COVER_COLORS = ['#135829', '#4ea829', '#1976d2', '#6366f1', '#f59e0b', '#e5534b'];
const PERF_SCHEDULE = '#064e1b';
const PERF_COMPLETED = '#9ff36c';

/** Reference dashboard icons (graduation, people, book, drop, tree, house). */
function InspectIconSvg({ path, viewBox = '0 0 24 24', size = 18 }: { path: string; viewBox?: string; size?: number }) {
  return (
    <svg viewBox={viewBox} width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/** Right-rail KPI icons — match reference mock exactly. */
const PERF_STAT_ICONS = {
  // Bold check (Overall Completion)
  overall: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  // Calendar (Total Scheduled)
  scheduled: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  // Check in circle (Total Completed)
  completed: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  // Target / crosshair (Completion Rate)
  rate: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
} as const;

function inspectGroupIconPath(group: string) {
  const text = String(group || '').toLowerCase();
  if (/early|learn|child|school|kind|elc|preschool|daycare/.test(text)) {
    return 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z';
  }
  if (/community/.test(text) || (/centre|center/.test(text) && !/town|library|aquatic/.test(text))) {
    return 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z';
  }
  if (/town|library|hall/.test(text)) {
    return 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z';
  }
  if (/aquatic|bath|pool|swim/.test(text)) {
    return 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2zm0 18c-2.76 0-5-2.02-5-5.2 0-1.85 1.36-4.22 5-7.76 3.64 3.54 5 5.91 5 7.76 0 3.18-2.24 5.2-5 5.2z';
  }
  if (/park|amenit|cottage|oval|garden|green/.test(text)) {
    return 'M17 12h2L12 2 5.05 12H7l-3.9 6h6.92v4h3.96v-4H21z';
  }
  if (/depot/.test(text)) {
    return 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z';
  }
  return 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';
}

function inspectGroupIcon(group: string) {
  return <InspectIconSvg path={inspectGroupIconPath(group)} />;
}

const VISIT_COL_ICONS = {
  sites: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z',
  dates: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
  quality: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  comments: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
  building: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
} as const;

function VisitColIcon({ name }: { name: keyof typeof VISIT_COL_ICONS }) {
  return (
    <span className="mr-visit-col-ico" aria-hidden="true">
      <InspectIconSvg path={VISIT_COL_ICONS[name]} size={14} />
    </span>
  );
}

function VisitSiteIcon() {
  return (
    <span className="mr-visit-site-ico" aria-hidden="true">
      <InspectIconSvg path={VISIT_COL_ICONS.building} size={14} />
    </span>
  );
}

function VisitParentGrass() {
  return (
    <svg className="mr-visit-parent-grass" viewBox="0 0 120 40" width="120" height="40" aria-hidden="true">
      <path d="M8 40 C10 22 4 12 12 2 C14 18 16 28 18 40 Z" fill="#7ed957" opacity="0.95" />
      <path d="M22 40 C26 18 18 10 28 0 C30 16 32 26 34 40 Z" fill="#52b035" />
      <path d="M38 40 C40 24 36 14 44 4 C46 18 48 28 50 40 Z" fill="#8be06a" opacity="0.9" />
      <path d="M54 40 C58 16 50 8 62 0 C64 14 66 26 68 40 Z" fill="#3f9a28" />
      <path d="M72 40 C74 22 70 12 78 2 C80 16 82 28 84 40 Z" fill="#7ed957" />
      <path d="M88 40 C92 18 84 10 96 2 C98 16 100 28 102 40 Z" fill="#52b035" opacity="0.95" />
      <path d="M106 40 C108 26 104 16 112 6 C114 18 116 28 118 40 Z" fill="#8be06a" opacity="0.85" />
    </svg>
  );
}

type InspectChartRow = {
  group: string;
  schedule: number;
  completed: number;
  pctLabel: string;
};

function wrapCatLabel(label: string, maxChars = 11): string[] {
  const words = String(label || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

/** Self-contained schedule/completed chart — no Recharts (exact bar/bracket geometry). */
function InspectPerfChart({ rows }: { rows: InspectChartRow[] }) {
  const data = rows.filter((row) => row.group || row.schedule || row.completed);
  if (!data.length) return null;

  const n = data.length;
  const maxRaw = Math.max(1, ...data.flatMap((row) => [row.schedule, row.completed]));
  const maxY = Math.max(4, Math.ceil(maxRaw * 1.28));
  const width = n <= 2 ? 560 : n <= 4 ? 680 : 820;
  const catH = 86;
  const padL = 58;
  const padR = 16;
  const padT = 56;
  const padB = 12;
  const plotH = 280;
  const height = padT + plotH + padB + catH;
  const plotW = width - padL - padR;
  const usable = n <= 2 ? plotW * 0.55 : plotW;
  const offsetX = n <= 2 ? padL + (plotW - usable) / 2 : padL;
  const groupW = usable / n;
  const gap = 8;
  const barW = Math.max(20, Math.min(44, (groupW - 20) / 2));
  const yTicks = [0, 1, 2, 3, 4].map((step) => Math.round((maxY * step) / 4));

  const barValue = (x: number, y: number, w: number, h: number, value: number, fill: string) => {
    if (!value || h <= 0) return null;
    const labelY = h >= 22 ? y + 17 : y + Math.max(h / 2, 9);
    return (
      <text
        x={x + w / 2}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        fontSize={h >= 22 ? 17 : 14}
        fontWeight={800}
      >
        {value}
      </text>
    );
  };

  return (
    <svg
      className="mr-inspect-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Schedule versus completed by site group"
    >
      {yTicks.map((tick) => {
        const y = padT + plotH - (plotH * tick) / maxY;
        return (
          <g key={`ytick-${tick}`}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke="#d7e5db"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            <text x={padL - 8} y={y + 5} textAnchor="end" fill="#24352c" fontSize={14} fontWeight={700}>
              {tick}
            </text>
          </g>
        );
      })}
      <text
        x={16}
        y={padT + plotH / 2}
        textAnchor="middle"
        fill="#24352c"
        fontSize={13}
        fontWeight={700}
        transform={`rotate(-90 16 ${padT + plotH / 2})`}
      >
        Schedule reports
      </text>

      {data.map((row, index) => {
        const pairW = barW * 2 + gap;
        const gx = offsetX + index * groupW + (groupW - pairW) / 2;
        const schedH = Math.max((row.schedule / maxY) * plotH, row.schedule ? 3 : 0);
        const doneH = Math.max((row.completed / maxY) * plotH, row.completed ? 3 : 0);
        const sx = gx;
        const dx = gx + barW + gap;
        const sy = padT + plotH - schedH;
        const dy = padT + plotH - doneH;
        // Bracket spans only this pair: left of schedule → right of completed.
        const left = sx;
        const right = dx + barW;
        const midX = (left + right) / 2;
        const topY = Math.min(sy, dy);
        const tallH = Math.max(schedH, doneH);
        const lift = tallH < 28 ? 22 : 14;
        const pill = row.pctLabel;
        const pillW = Math.max(52, pill.length * 10 + 20);
        const pillH = 26;
        const catCX = offsetX + index * groupW + groupW / 2;
        const catY = padT + plotH + padB;
        const catCardW = Math.min(groupW - 6, 96);
        const lines = wrapCatLabel(row.group);
        const iconPath = inspectGroupIconPath(row.group);

        return (
          <g key={`inspect-group-${row.group}-${index}`}>
            <rect x={sx} y={sy} width={barW} height={schedH} rx={6} fill={PERF_SCHEDULE} />
            {barValue(sx, sy, barW, schedH, row.schedule, '#fff')}
            <rect x={dx} y={dy} width={barW} height={doneH} rx={6} fill={PERF_COMPLETED} />
            {barValue(dx, dy, barW, doneH, row.completed, '#064e1b')}

            {pill ? (
              <g>
                <line x1={left} y1={topY - 4} x2={left} y2={topY - 14} stroke="#b6f08a" strokeWidth={2} strokeLinecap="round" />
                <line x1={left} y1={topY - 14} x2={right} y2={topY - 14} stroke="#b6f08a" strokeWidth={2} strokeLinecap="round" />
                <line x1={right} y1={topY - 14} x2={right} y2={topY - 4} stroke="#b6f08a" strokeWidth={2} strokeLinecap="round" />
                <rect
                  x={midX - pillW / 2}
                  y={topY - 14 - lift - pillH}
                  width={pillW}
                  height={pillH}
                  rx={13}
                  fill="#c8f7a6"
                />
                <text
                  x={midX}
                  y={topY - 14 - lift - pillH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#064e1b"
                  fontSize={15}
                  fontWeight={800}
                >
                  {pill}
                </text>
              </g>
            ) : null}

            <g transform={`translate(${catCX}, ${catY})`}>
              <rect x={-catCardW / 2} y={0} width={catCardW} height={78} rx={10} fill="#f4faf5" stroke="#ddeee1" />
              <circle cx={0} cy={20} r={14} fill="#fff" stroke="#cfe8c4" />
              <svg x={-9} y={11} width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
                <path d={iconPath} fill="#0d6b2f" />
              </svg>
              <text textAnchor="middle" fill="#1a2c23" fontSize={10} fontWeight={700}>
                {lines.map((line, lineIndex) => (
                  <tspan key={`${row.group}-line-${lineIndex}`} x={0} y={46 + lineIndex * 12}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export type MonthlyDraft = {
  serviceLine: string;
  clientName: string;
  address: string;
  contact: string;
  periodLabel: string;
  periodRange: string;
  jobs: string;
  locations: string;
  preparedBy: string;
  glanceNote: string;
  weekly: { week: string; jobs: string; faults: string; tickets: string }[];
  services: { name: string; value: string }[];
  serviceDelivery: string;
  disruptions: string;
  generalIssues: string;
  previousMinutes: string;
  compliance: { area: string; yes: string; no: string; comments: string }[];
  whsScope: string;
  whsMonth1: string;
  whsMonth2: string;
  whsMonth3: string;
  whs: { label: string; m1: string; m2: string; m3: string; ytd: string }[];
  environmental: { area: string; comments: string }[];
  streams: {
    heading: string;
    note: string;
    summary: { month: string; group: string; description: string; schedule: string; completed: string; comments: string }[];
    /** Site-by-site visit list (Innerwest pages 6–11 style). */
    detailHeading?: string;
    detailNote?: string;
    showQuality?: boolean;
    visits?: {
      site: string;
      dates: string;
      quality: string;
      comments: string;
      /** Links each displayed date to the underlying user-task / report. */
      dateLinks?: { date: string; id: number }[];
      /** Parent amenity label only; child rows under it hold the dates. */
      isGroupHeader?: boolean;
      isGroupChild?: boolean;
      /** From sites.dropdown_sort_order — parent block order. */
      sortOrder?: number | null;
    }[];
  }[];
  feedbackHeading: string;
  feedback: { site: string; feedback: string; comment: string; rectified: string; id?: number }[];
  toolbox: { title: string; date: string; detail: string }[];
  staffChanges: string;
  staffFeedback: string;
  recognition: string;
  invoiceIntro: string;
  invoices: { number: string; detail: string }[];
  variations: { site: string; date: string; reason: string; requestedBy: string; amount: string }[];
  variationComments: string;
  adhoc: { site: string; description: string; requestedBy: string; date: string; amount: string }[];
  adhocComments: string;
  quotes: string;
  consumables: { date: string; site: string; subject: string; items: string }[];
  consumablesComments: string;
};

function isAmenityParentSite(name: string) {
  return /\bpublic\s+amenities\b/i.test(String(name || '').trim());
}

/** Parent amenity rows are name-only; recover even if isGroupHeader was dropped from an old draft. */
function isVisitGroupHeader(row: {
  site?: string;
  dates?: string;
  dateLinks?: { date: string; id: number }[];
  isGroupHeader?: boolean;
}) {
  if (row.isGroupHeader) return true;
  if (!isAmenityParentSite(row.site || '')) return false;
  const hasDates = String(row.dates || '').trim().length > 0;
  const hasLinks = Array.isArray(row.dateLinks) && row.dateLinks.length > 0;
  return !hasDates && !hasLinks;
}

type VisitBlock = {
  key: string;
  parent: string | null;
  sortOrder: number;
  rows: { row: NonNullable<MonthlyDraft['streams'][number]['visits']>[number]; index: number }[];
};

/** Split visits into parent amenity blocks (header on top) + leftover sites. */
function visitBlocks(
  visits: NonNullable<MonthlyDraft['streams'][number]['visits']>,
): VisitBlock[] {
  const blocks: VisitBlock[] = [];
  let current: VisitBlock | null = null;
  const pushLoose = (entry: VisitBlock['rows'][number]) => {
    const last = blocks[blocks.length - 1];
    if (last && !last.parent) {
      last.rows.push(entry);
      return;
    }
    blocks.push({
      key: `loose-${entry.index}`,
      parent: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      rows: [entry],
    });
  };

  visits.forEach((row, index) => {
    if (isVisitGroupHeader(row)) {
      const order =
        row.sortOrder != null && Number.isFinite(+row.sortOrder)
          ? Math.floor(+row.sortOrder)
          : Number.MAX_SAFE_INTEGER - 10;
      current = {
        key: `parent-${index}-${row.site}`,
        parent: String(row.site || '').replace(/\s+/g, ' ').trim(),
        sortOrder: order,
        rows: [],
      };
      blocks.push(current);
      return;
    }
    // Children are flagged; once a non-child appears, close the parent block.
    if (current && row.isGroupChild) {
      current.rows.push({ row, index });
      return;
    }
    current = null;
    pushLoose({ row, index });
  });

  // Order by sites.dropdown_sort_order on parent headers (data), then key.
  return [...blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key),
  );
}

function textOf(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

/** Month pill should never repeat the title (e.g. "MONTHLY REPORT October 2026"). */
function monthPillLabel(value: string) {
  return String(value || '')
    .replace(/^\s*monthly\s+report\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cover subtitle under MONTHLY REPORT, e.g. "Roof and Gutter Report". */
function reportNameLabel(value: string) {
  const base = String(value || '').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  return /report$/i.test(base) ? base : `${base} Report`;
}

/** Word-wrap chart axis labels (avoids "Parks and ameniti…" truncation). */
export function mergeMonthlyDraft(base: MonthlyDraft, saved?: Partial<MonthlyDraft> | null): MonthlyDraft {
  if (!saved || typeof saved !== 'object') return base;
  const raw = saved as Record<string, unknown>;
  const list = <T,>(value: unknown, map: (row: Record<string, unknown>) => T, fallback: T[]) => (
    Array.isArray(value) ? value.map((row) => map((row || {}) as Record<string, unknown>)) : fallback
  );
  const variations = Array.isArray(raw.variations)
    ? list(raw.variations, (row) => ({
      site: String(row.site || ''),
      date: String(row.date || ''),
      reason: String(row.reason || ''),
      requestedBy: String(row.requestedBy || ''),
      amount: String(row.amount || ''),
    }), base.variations)
    : base.variations;
  return {
    ...base,
    // Always live from contracted /services — do not keep a stale saved join (e.g. with Reactive/Adhoc).
    serviceLine: base.serviceLine,
    clientName: textOf(raw.clientName, base.clientName),
    address: textOf(raw.address, base.address),
    contact: textOf(raw.contact, base.contact),
    periodLabel: textOf(raw.periodLabel, base.periodLabel),
    periodRange: textOf(raw.periodRange, base.periodRange),
    jobs: textOf(raw.jobs, base.jobs),
    locations: textOf(raw.locations, base.locations),
    preparedBy: textOf(raw.preparedBy, base.preparedBy),
    glanceNote: textOf(raw.glanceNote, base.glanceNote),
    serviceDelivery: textOf(raw.serviceDelivery, base.serviceDelivery),
    disruptions: textOf(raw.disruptions, base.disruptions),
    generalIssues: textOf(raw.generalIssues, base.generalIssues),
    previousMinutes: textOf(raw.previousMinutes, base.previousMinutes),
    whsScope: textOf(raw.whsScope, base.whsScope),
    whsMonth1: textOf(raw.whsMonth1, textOf(raw.whsPriorLabel, base.whsMonth1)),
    whsMonth2: textOf(raw.whsMonth2, base.whsMonth2),
    whsMonth3: textOf(raw.whsMonth3, textOf(raw.whsCurrentLabel, base.whsMonth3)),
    feedbackHeading: (() => {
      const saved = textOf(raw.feedbackHeading, '');
      // Upgrade old "... feedback" titles to Faults Reports.
      if (!saved) return base.feedbackHeading;
      if (/\bfeedback$/i.test(saved.trim())) {
        return saved.replace(/\s*feedback\s*$/i, ' Faults Reports').replace(/\s+/g, ' ').trim();
      }
      return saved;
    })(),
    staffChanges: textOf(raw.staffChanges, base.staffChanges),
    staffFeedback: textOf(raw.staffFeedback, base.staffFeedback),
    recognition: textOf(raw.recognition, base.recognition),
    invoiceIntro: textOf(raw.invoiceIntro, textOf(raw.invoiceEmpty, base.invoiceIntro)),
    variationComments: textOf(raw.variationComments, typeof raw.variations === 'string' ? raw.variations : base.variationComments),
    adhocComments: textOf(raw.adhocComments, base.adhocComments),
    quotes: textOf(raw.quotes, base.quotes),
    consumablesComments: textOf(raw.consumablesComments, base.consumablesComments),
    weekly: list(raw.weekly, (row) => ({
      week: String(row.week || ''),
      jobs: String(row.jobs || ''),
      faults: String(row.faults || ''),
      tickets: String(row.tickets || ''),
    }), base.weekly),
    services: (() => {
      const savedServices = list(raw.services, (row) => ({ name: String(row.name || ''), value: String(row.value || '') }), base.services);
      const names = new Set(savedServices.map((row) => row.name.trim().toLowerCase()).filter(Boolean));
      const missing = base.services.filter((row) => row.name && !names.has(row.name.trim().toLowerCase()));
      return [...savedServices, ...missing];
    })(),
    compliance: list(raw.compliance, (row) => ({
      area: String(row.area || ''),
      yes: String(row.yes || row.result || ''),
      no: String(row.no || ''),
      comments: String(row.comments || ''),
    }), base.compliance),
    whs: list(raw.whs, (row) => ({
      label: String(row.label || ''),
      m1: String(row.m1 || ''),
      m2: String(row.m2 || row.prior || ''),
      m3: String(row.m3 || row.current || ''),
      ytd: String(row.ytd || ''),
    }), base.whs),
    environmental: Array.isArray(raw.environmental)
      ? list(raw.environmental, (row) => ({ area: String(row.area || ''), comments: String(row.comments || '') }), base.environmental)
      : base.environmental,
    streams: (() => {
      const savedStreams = list(raw.streams, (row) => ({
        heading: String(row.heading || ''),
        note: String(row.note || ''),
        detailHeading: String(row.detailHeading || ''),
        detailNote: String(row.detailNote || ''),
        showQuality: row.showQuality === true || row.showQuality === 'true',
        summary: Array.isArray(row.summary)
          ? row.summary.map((item) => {
            const summary = (item || {}) as Record<string, unknown>;
            return {
              month: String(summary.month || ''),
              group: String(summary.group || ''),
              description: String(summary.description || ''),
              schedule: String(summary.schedule ?? summary.completed ?? ''),
              completed: String(summary.completed || ''),
              comments: String(summary.comments || ''),
            };
          })
          : [],
        visits: Array.isArray(row.visits)
          ? row.visits.map((item) => {
            const visit = (item || {}) as Record<string, unknown>;
            const site = String(visit.site || '');
            const rawDates = String(visit.dates || visit.date || '');
            // Older drafts joined dates with spaces — normalise to comma-separated.
            const dates = rawDates.replace(/(\d{2}\/\d{2}\/\d{4})\s+(?=\d{2}\/\d{2}\/\d{4})/g, '$1, ');
            const rawLinks = Array.isArray(visit.dateLinks) ? visit.dateLinks : [];
            const dateLinks = rawLinks
              .map((link) => {
                const entry = (link || {}) as Record<string, unknown>;
                const id = Number(entry.id);
                const date = String(entry.date || '').trim();
                if (!date || !Number.isFinite(id) || id <= 0) return null;
                return { date, id };
              })
              .filter(Boolean) as { date: string; id: number }[];
            const sortOrder =
              visit.sortOrder != null && Number.isFinite(+visit.sortOrder)
                ? Math.floor(+visit.sortOrder)
                : null;
            const mapped = {
              site,
              dates: dateLinks.length
                ? dateLinks.map((link) => link.date).join(', ')
                : dates,
              quality: String(visit.quality || ''),
              comments: String(visit.comments || ''),
              ...(dateLinks.length ? { dateLinks } : {}),
              ...(visit.isGroupChild ? { isGroupChild: true } : {}),
              ...(sortOrder != null ? { sortOrder } : {}),
            };
            const header = isVisitGroupHeader({ ...mapped, isGroupHeader: Boolean(visit.isGroupHeader) });
            return {
              ...mapped,
              ...(header
                ? {
                    isGroupHeader: true as const,
                    dates: '',
                    quality: '',
                    comments: '',
                    ...(sortOrder != null ? { sortOrder } : {}),
                  }
                : {}),
            };
          })
          : [],
      }), base.streams);
      // Keep saved stream edits, then append any contracted services missing from the saved draft.
      const headingKey = (heading: string) => heading.split('–')[0].split('-')[0].trim().toLowerCase();
      const savedKeys = new Set(savedStreams.map((stream) => headingKey(stream.heading)));
      const missing = base.streams.filter((stream) => !savedKeys.has(headingKey(stream.heading)));
      return [...savedStreams, ...missing].map((stream, streamIndex) => {
        // Live visits are grouped by parent amenities (Bayside / Mascot). Prefer that
        // structure so old drafts do not keep Nil child-park rows.
        const baseStream =
          base.streams.find((item) => headingKey(item.heading) === headingKey(stream.heading))
          || base.streams[streamIndex];
        const liveVisits = (baseStream?.visits || []).map((live) => {
          if (isVisitGroupHeader(live)) {
            return {
              site: String(live.site || '').replace(/\s+/g, ' ').trim(),
              dates: '',
              quality: '',
              comments: '',
              isGroupHeader: true as const,
              ...(live.sortOrder != null ? { sortOrder: live.sortOrder } : {}),
            };
          }
          const saved = (stream.visits || []).find(
            (row) => !isVisitGroupHeader(row)
              && String(row.site || '').trim().toLowerCase() === String(live.site || '').trim().toLowerCase(),
          );
          const savedComment = String(saved?.comments || '').trim();
          const keepSavedComment = savedComment
            && !/^covered under\b/i.test(savedComment)
            && !/^includes:/i.test(savedComment);
          return {
            ...live,
            quality: String(saved?.quality || '').trim() || live.quality,
            comments: keepSavedComment ? savedComment : (live.comments || savedComment),
            dateLinks: live.dateLinks?.length ? live.dateLinks : saved?.dateLinks,
            dates: live.dateLinks?.length
              ? live.dates
              : (saved?.dates || live.dates),
            ...(live.isGroupChild ? { isGroupChild: true as const } : {}),
          };
        });
        // Schedule/completed always follow live /sites frequency + New Reports uploads (not frozen draft).
        const liveSummary = (baseStream?.summary || []).map((baseRow) => {
          const savedRow = (stream.summary || []).find(
            (row) => row.group.trim().toLowerCase() === baseRow.group.trim().toLowerCase(),
          );
          return {
            month: savedRow?.month || baseRow.month,
            group: baseRow.group,
            // Description = exact /services name from live pack.
            description: baseRow.description || savedRow?.description || '',
            schedule: baseRow.schedule,
            completed: baseRow.completed,
            comments: savedRow?.comments ?? baseRow.comments,
          };
        });
        return {
          ...stream,
          // Headings always from live /services names (not old "Cleaning Site Inspections" drafts).
          heading: baseStream?.heading || stream.heading,
          detailHeading: baseStream?.detailHeading || stream.detailHeading,
          detailNote: baseStream?.detailNote || stream.detailNote,
          note: baseStream?.note || stream.note,
          summary: liveSummary.length ? liveSummary : stream.summary,
          visits: liveVisits.length ? liveVisits : stream.visits,
        };
      });
    })(),
    feedback: list(raw.feedback, (row) => {
      const site = String(row.site || '');
      const feedback = String(row.feedback || '');
      const comment = String(row.comment || row.status || '');
      let reported = String(row.rectified || row.date || '').trim();
      const savedId = Number(row.id);
      const match =
        base.feedback.find((item) => item.site === site && item.feedback === feedback)
        || base.feedback.find((item) => item.feedback === feedback && !!item.rectified)
        || base.feedback.find((item) => item.site === site && !!item.rectified);
      // Old drafts stored blank/"Nil" under Date rectified — pull the real fault date.
      if (!reported || /^nil$/i.test(reported) || /^n\/?a$/i.test(reported)) {
        if (match?.rectified) reported = match.rectified;
      }
      const id = Number.isFinite(savedId) && savedId > 0 ? savedId : match?.id;
      return { site, feedback, comment, rectified: reported, ...(id ? { id } : {}) };
    }, base.feedback),
    toolbox: list(raw.toolbox, (row) => ({
      title: String(row.title || ''),
      date: String(row.date || ''),
      detail: String(row.detail || ''),
    }), base.toolbox),
    invoices: list(raw.invoices, (row) => ({
      number: String(row.number || row.title || ''),
      detail: String(row.detail || row.date || ''),
    }), base.invoices),
    variations,
    adhoc: list(raw.adhoc, (row) => ({
      site: String(row.site || ''),
      description: String(row.description || ''),
      requestedBy: String(row.requestedBy || ''),
      date: String(row.date || ''),
      amount: String(row.amount || ''),
    }), base.adhoc),
    consumables: (() => {
      const saved = list(raw.consumables, (row) => ({
        date: String(row.date || ''),
        site: String(row.site || ''),
        subject: String(row.subject || ''),
        items: String(row.items || row.itemsLabel || ''),
      }), base.consumables);
      if (!Array.isArray(raw.consumables)) return base.consumables;
      // Keep saved edits; append any newly sent deliveries missing from the draft.
      const keys = new Set(
        saved.map((row) => `${row.date}|${row.site}|${row.subject}|${row.items}`.toLowerCase()),
      );
      const missing = base.consumables.filter(
        (row) => !keys.has(`${row.date}|${row.site}|${row.subject}|${row.items}`.toLowerCase()),
      );
      return [...saved, ...missing];
    })(),
  };
}

function TextField({
  editing,
  value,
  onChange,
  multiline,
  chars,
  fit,
  grow,
  placeholder,
}: {
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  chars?: number;
  fit?: 'num' | 'short';
  grow?: boolean;
  placeholder?: string;
}) {
  const areaRef = useRef<any>(null);
  const text = String(value || '');
  // Long values (date lists, addresses, comments, contact) always use a growing textarea so nothing is clipped.
  const useArea = !!multiline || !!grow || (!fit && !chars) || text.length > 42 || text.includes('\n') || (text.match(/\d{2}\/\d{2}\/\d{4}/g) || []).length > 1;

  const resolveArea = (): HTMLTextAreaElement | null => {
    const root = areaRef.current;
    if (!root) return null;
    if (root instanceof HTMLTextAreaElement) return root;
    return (
      root?.resizableTextArea?.textArea
      || root?.nativeElement
      || (typeof root?.querySelector === 'function' ? root.querySelector('textarea') : null)
      || null
    );
  };

  const fitAreaHeight = () => {
    const el = resolveArea();
    if (!el) return;
    el.style.maxHeight = 'none';
    el.style.overflow = 'hidden';
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 28)}px`;
  };

  useLayoutEffect(() => {
    if (!editing || !useArea) return;
    fitAreaHeight();
    const frame = window.requestAnimationFrame(fitAreaHeight);
    return () => window.cancelAnimationFrame(frame);
  }, [editing, useArea, value]);

  if (!editing) {
    return <span className="mr-field-view" style={{ whiteSpace: 'pre-wrap', display: 'block', overflowWrap: 'anywhere' }}>{value}</span>;
  }
  if (useArea) {
    return (
      <Input.TextArea
        ref={areaRef}
        className="mr-edit-area mr-edit-grow"
        autoSize={false}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onInput={fitAreaHeight}
        style={{ overflow: 'hidden', maxHeight: 'none', resize: 'none' }}
      />
    );
  }
  const width = chars
    ? `${Math.max(chars, text.length + 2)}ch`
    : undefined;
  const fitClass = fit === 'num' ? 'mr-edit-num' : fit === 'short' ? 'mr-edit-short' : '';
  return (
    <Input
      className={`${chars ? 'mr-edit-inline' : 'mr-edit-fill'} ${fitClass}`.trim()}
      size="small"
      placeholder={placeholder}
      style={width && !fit ? { width, minWidth: width, maxWidth: '100%' } : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RemoveButton({ editing, onClick }: { editing: boolean; onClick: () => void }) {
  if (!editing) return null;
  return (
    <Button className="mr-row-remove" type="link" danger size="small" onClick={onClick}>
      Remove
    </Button>
  );
}

function AddButton({ editing, onClick, label = 'Add row' }: { editing: boolean; onClick: () => void; label?: string }) {
  if (!editing) return null;
  return (
    <Button className="mr-add-row" size="small" onClick={onClick}>
      {label}
    </Button>
  );
}

export default function MonthlyReportDocument({
  seed,
  saved,
  companyId,
  month,
  onBack,
  startEditing = false,
}: {
  seed: MonthlyDraft;
  saved?: Partial<MonthlyDraft> | null;
  companyId?: number;
  month?: string;
  onBack?: () => void;
  startEditing?: boolean;
}) {
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const isAdmin = +profile?.type === userType.ADMIN;
  const [draft, setDraft] = useState<MonthlyDraft>(() => mergeMonthlyDraft(seed, saved));
  const [baseline, setBaseline] = useState<MonthlyDraft>(() => mergeMonthlyDraft(seed, saved));
  const [editing, setEditing] = useState(startEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = mergeMonthlyDraft(seed, saved);
    setDraft(next);
    setBaseline(next);
    setEditing(Boolean(startEditing) && isAdmin);
  }, [seed, saved, startEditing, isAdmin]);

  const setText = (key: keyof MonthlyDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!companyId || !month) {
      message.error('This report cannot be saved');
      return;
    }
    setSaving(true);
    const res = await callAPIAsync(serviceType.COMMON, endPoint.MONTHLY_REPORTS, 'PUT', {
      companyId,
      month,
      body: draft,
    });
    setSaving(false);
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not save the monthly report');
      return;
    }
    setBaseline(draft);
    setEditing(false);
    message.success('Monthly report saved');
  };

  const chartServices = draft.services
    .map((row) => ({ name: row.name || 'Service', value: Number(row.value) || 0 }))
    .filter((row) => row.name);
  const chartWeekly = draft.weekly.map((row) => ({
    week: row.week || 'Week',
    jobs: Number(row.jobs) || 0,
    faults: Number(row.faults) || 0,
    tickets: Number(row.tickets) || 0,
  }));

  return (
    <div>
      <div className="mr-edit-bar">
        {onBack ? (
          <Button onClick={onBack} style={{ marginRight: 'auto' }}>
            Back to customers
          </Button>
        ) : (
          <span style={{ marginRight: 'auto' }} />
        )}
        {isAdmin && !editing ? (
          <Button type="primary" onClick={() => setEditing(true)}>
            Edit report
          </Button>
        ) : null}
        {isAdmin && editing ? (
          <>
            <Button
              onClick={() => {
                setDraft(baseline);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="primary" loading={saving} onClick={() => void save()}>
              Save
            </Button>
          </>
        ) : null}
      </div>
      <ReportBody
        draft={draft}
        editing={editing && isAdmin}
        chartWeekly={chartWeekly}
        chartServices={chartServices}
        onText={setText}
        onDraft={setDraft}
      />
    </div>
  );
}

function ReportBody({
  draft,
  editing,
  chartWeekly,
  chartServices,
  onText,
  onDraft,
}: {
  draft: MonthlyDraft;
  editing: boolean;
  chartWeekly: { week: string; jobs: number; faults: number; tickets: number }[];
  chartServices: { name: string; value: number }[];
  onText: (key: keyof MonthlyDraft, value: string) => void;
  onDraft: React.Dispatch<React.SetStateAction<MonthlyDraft>>;
}) {
  const faultTotal = chartWeekly.reduce((sum, row) => sum + row.faults, 0);
  const ticketTotal = chartWeekly.reduce((sum, row) => sum + row.tickets, 0);
  const serviceTotal = chartServices.reduce((sum, row) => sum + row.value, 0) || Number(draft.jobs) || 0;
  const serviceSlices = chartServices.map((row) => ({
    ...row,
    pct: serviceTotal > 0 ? Math.round((row.value / serviceTotal) * 100) : 0,
  }));
  const jumpToSection = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    const id = href.replace(/^#/, '');
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', href);
    }
  };
  const tocGroups: {
    label: string;
    href: string;
    page: number;
    icon: React.ReactNode;
    items: { label: string; href: string; page: number }[];
  }[] = [
    {
      label: 'This month at a glance',
      href: '#mr-charts',
      page: 2,
      icon: <BarChartOutlined />,
      items: [],
    },
    {
      label: '1. Overview',
      href: '#mr-overview',
      page: 3,
      icon: <FileTextOutlined />,
      items: [
        { label: '1.1 Service delivery', href: '#mr-overview-delivery', page: 3 },
        { label: '1.2 Service disruption', href: '#mr-overview-disruption', page: 3 },
        { label: '1.3 Previous minutes', href: '#mr-overview-minutes', page: 3 },
      ],
    },
    {
      label: '2. Contract review',
      href: '#mr-contract',
      page: 4,
      icon: <FileProtectOutlined />,
      items: [
        { label: '2.1 Contract compliance and KPI', href: '#mr-contract-compliance', page: 4 },
        { label: '2.2 Work health and safety', href: '#mr-contract-whs', page: 4 },
        { label: '2.3 Environmental issues', href: '#mr-contract-env', page: 4 },
      ],
    },
    {
      label: '3. Inspections',
      href: '#mr-inspections',
      page: 5,
      icon: <SearchOutlined />,
      items: [
        { label: '3.1 Site inspections', href: '#mr-inspections-sites', page: 5 },
        { label: '3.2 Faults Reports', href: '#mr-faults', page: 5 },
      ],
    },
    {
      label: '4. Staffing',
      href: '#mr-staffing',
      page: 6,
      icon: <TeamOutlined />,
      items: [
        { label: '4.1 Toolbox talk', href: '#mr-staffing-toolbox', page: 6 },
        { label: '4.2 Staff changes', href: '#mr-staffing-changes', page: 6 },
        { label: '4.3 Staff feedback', href: '#mr-staffing-feedback', page: 6 },
        { label: '4.4 Staffing recognition award', href: '#mr-staffing-recognition', page: 6 },
      ],
    },
    {
      label: '5. Financials',
      href: '#mr-financials',
      page: 7,
      icon: <AccountBookOutlined />,
      items: [
        { label: '5.1 Overdue invoices', href: '#mr-financials-invoices', page: 7 },
        { label: '5.2 Contract variations', href: '#mr-financials-variations', page: 7 },
        { label: '5.3 Adhoc work request', href: '#mr-financials-adhoc', page: 7 },
        { label: '5.4 Quotes', href: '#mr-financials-quotes', page: 7 },
      ],
    },
  ];

  const kpiStats: { icon: React.ReactNode; value: React.ReactNode; label: string }[] = [
    { icon: <FileDoneOutlined />, value: serviceTotal || draft.jobs || 0, label: 'Service jobs' },
    {
      icon: <CheckCircleOutlined />,
      value: <TextField editing={editing} chars={6} value={draft.jobs} onChange={(value) => onText('jobs', value)} />,
      label: 'Jobs completed',
    },
    {
      icon: <EnvironmentFilled />,
      value: <TextField editing={editing} chars={6} value={draft.locations} onChange={(value) => onText('locations', value)} />,
      label: 'Locations serviced',
    },
    { icon: <ToolOutlined />, value: faultTotal, label: 'Faults resolved' },
    { icon: <TagOutlined />, value: ticketTotal, label: 'Open tickets' },
  ];

  const periodMonth = monthPillLabel(draft.periodLabel);

  return (
    <div className="marketing-site mr-app">
      <div className={`mr-page mr-page--app mr-page--cover${editing ? ' mr-editing' : ''}`}>
        <section className="mr-cover" id="mr-cover">
          <div className="mr-cover-inset">
            <div className="mr-cover-titlebar">
              <div className="mr-cover-title-text">
                <h1>MONTHLY REPORT</h1>
                {(editing || draft.serviceLine) ? (
                  <p className="mr-cover-report-name">
                    <TextField
                      editing={editing}
                      value={reportNameLabel(draft.serviceLine)}
                      onChange={(value) => onText('serviceLine', reportNameLabel(value))}
                    />
                  </p>
                ) : null}
              </div>
              <div className="mr-cover-month" title="Report period">
                {editing ? (
                  <TextField
                    editing
                    chars={Math.max(12, periodMonth.length + 2)}
                    value={periodMonth}
                    onChange={(value) => onText('periodLabel', monthPillLabel(value))}
                  />
                ) : (
                  <span>{periodMonth || draft.periodLabel || 'Monthly report'}</span>
                )}
              </div>
            </div>

            <div className="mr-cover-identity" id="mr-identity">
              <div className="mr-cover-id-card">
                <TeamOutlined className="mr-cover-id-icon" />
                <div>
                  <em>Client</em>
                  <p><TextField editing={editing} value={draft.clientName} onChange={(value) => onText('clientName', value)} /></p>
                </div>
              </div>
              <div className="mr-cover-id-card">
                <EnvironmentFilled className="mr-cover-id-icon" />
                <div>
                  <em>Address</em>
                  <p><TextField editing={editing} multiline grow value={draft.address} onChange={(value) => onText('address', value)} /></p>
                </div>
              </div>
              <div className="mr-cover-id-card">
                <PhoneFilled className="mr-cover-id-icon" />
                <div>
                  <em>Contact</em>
                  <p><TextField editing={editing} multiline grow value={draft.contact} onChange={(value) => onText('contact', value)} /></p>
                </div>
              </div>
              <div className="mr-cover-id-card">
                <SolutionOutlined className="mr-cover-id-icon" />
                <div>
                  <em>Prepared by</em>
                  <p><TextField editing={editing} multiline grow value={draft.preparedBy} onChange={(value) => onText('preparedBy', value)} /></p>
                </div>
              </div>
            </div>


            <section className="mr-toc-panel" id="mr-toc">
              <header className="mr-toc-head">
                <h2><ReadOutlined /> Table of contents</h2>
              </header>
              <div className="mr-toc mr-toc--cover">
                {tocGroups.map((group) => (
                  <div className="mr-toc-group" key={group.label}>
                    <div className="mr-toc-rail" aria-hidden="true">{group.icon}</div>
                    <div className="mr-toc-group-body">
                      <p className="mr-toc-row mr-toc-row--icon">
                        <a href={group.href} onClick={(event) => jumpToSection(event, group.href)}>{group.label}</a>
                        <span className="mr-toc-dots" aria-hidden="true" />
                        <span className="mr-toc-page">Page {group.page}</span>
                      </p>
                      {group.items.map((item) => (
                        <p key={item.label} className="mr-toc-row mr-toc-row--sub">
                          <a href={item.href} onClick={(event) => jumpToSection(event, item.href)}>{item.label}</a>
                          <span className="mr-toc-dots" aria-hidden="true" />
                          <span className="mr-toc-page">Page {item.page}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>


            <section className="mr-glance-panel" id="mr-charts">
              <header className="mr-glance-head">
                <h2><BarChartOutlined /> This month at a glance</h2>
                <span>Weekly volume and work by service.</span>
              </header>
              <div className="mr-glance-body">
                <div className="mr-glance-stats">
                  {kpiStats.map((stat) => (
                    <div className="mr-glance-stat" key={stat.label}>
                      <span className="mr-glance-stat-icon">{stat.icon}</span>
                      <div>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <article className="mr-glance-chart">
                  <header>
                    <h3>Weekly volume</h3>
                    <p>Completed jobs, faults, and tickets</p>
                  </header>
                  <ResponsiveContainer width="100%" height={204}>
                    <BarChart data={chartWeekly} margin={{ top: 20, right: 10, left: -4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="5 5" stroke="#d7e5db" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: '#24352c', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#4d6359', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #d7e8db',
                          boxShadow: '0 8px 22px rgba(15,36,28,0.1)',
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} iconType="circle" />
                      <Bar dataKey="jobs" name="Jobs" fill="#167934" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        <LabelList dataKey="jobs" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#18241b' }} />
                      </Bar>
                      <Bar dataKey="faults" name="Faults" fill="#e34f46" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        <LabelList dataKey="faults" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#18241b' }} />
                      </Bar>
                      <Bar dataKey="tickets" name="Tickets" fill="#1870c9" radius={[4, 4, 0, 0]} maxBarSize={28}>
                        <LabelList dataKey="tickets" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#18241b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </article>
                <article className="mr-glance-chart mr-glance-chart--donut">
                  <header>
                    <h3>Work by service</h3>
                    <p>{periodMonth || 'This period'}</p>
                  </header>
                  <div className="mr-donut-layout">
                    <div className="mr-donut-wrap">
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={serviceSlices}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={42}
                            outerRadius={68}
                            paddingAngle={1.5}
                            stroke="#fff"
                            strokeWidth={2}
                            label={(props) => {
                              const pct = Number((props as { pct?: number }).pct || 0);
                              return pct ? `${pct}%` : '';
                            }}
                            labelLine={false}
                          >
                            {serviceSlices.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={COVER_COLORS[index % COVER_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mr-donut-center" aria-hidden="true">
                        <strong>{serviceTotal}</strong>
                        <span>Jobs</span>
                      </div>
                    </div>
                    <ul className="mr-donut-legend">
                      {serviceSlices.map((row, index) => (
                        <li key={`slice-${row.name}-${index}`}>
                          <i style={{ background: COVER_COLORS[index % COVER_COLORS.length] }} />
                          <span>{row.name}</span>
                          <b>{row.value}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </div>
              <div className="mr-period-bar">
                <CalendarOutlined />
                <TextField
                  editing={editing}
                  value={reportNameLabel(draft.serviceLine)}
                  onChange={(value) => onText('serviceLine', reportNameLabel(value))}
                />
                <span aria-hidden="true">–</span>
                <TextField editing={editing} value={draft.periodRange || draft.periodLabel} onChange={(value) => onText('periodRange', value)} />
              </div>
              {editing ? (
                <div className="mr-table-wrap" style={{ marginTop: 12 }}>
                  <p className="mr-nil">
                    <TextField editing={editing} value={draft.glanceNote} onChange={(value) => onText('glanceNote', value)} />
                  </p>
                  <table className="mr-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Jobs</th>
                        <th>Faults</th>
                        <th>Tickets</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.weekly.map((row, index) => (
                        <tr key={`week-${index}`}>
                          <td><Input className="mr-edit-short" size="small" value={row.week} onChange={(event) => onDraft((current) => ({ ...current, weekly: current.weekly.map((item, itemIndex) => itemIndex === index ? { ...item, week: event.target.value } : item) }))} /></td>
                          <td><Input className="mr-edit-num" size="small" value={row.jobs} onChange={(event) => onDraft((current) => ({ ...current, weekly: current.weekly.map((item, itemIndex) => itemIndex === index ? { ...item, jobs: event.target.value } : item) }))} /></td>
                          <td><Input className="mr-edit-num" size="small" value={row.faults} onChange={(event) => onDraft((current) => ({ ...current, weekly: current.weekly.map((item, itemIndex) => itemIndex === index ? { ...item, faults: event.target.value } : item) }))} /></td>
                          <td><Input className="mr-edit-num" size="small" value={row.tickets} onChange={(event) => onDraft((current) => ({ ...current, weekly: current.weekly.map((item, itemIndex) => itemIndex === index ? { ...item, tickets: event.target.value } : item) }))} /></td>
                          <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, weekly: current.weekly.filter((_, itemIndex) => itemIndex !== index) }))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <AddButton editing onClick={() => onDraft((current) => ({ ...current, weekly: [...current.weekly, { week: '', jobs: '0', faults: '0', tickets: '0' }] }))} />
                  <table className="mr-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Jobs</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.services.map((row, index) => (
                        <tr key={`service-${index}`}>
                          <td><Input size="small" value={row.name} onChange={(event) => onDraft((current) => ({ ...current, services: current.services.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></td>
                          <td><Input className="mr-edit-num" size="small" value={row.value} onChange={(event) => onDraft((current) => ({ ...current, services: current.services.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) }))} /></td>
                          <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, services: current.services.filter((_, itemIndex) => itemIndex !== index) }))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <AddButton editing onClick={() => onDraft((current) => ({ ...current, services: [...current.services, { name: '', value: '0' }] }))} />
                </div>
              ) : null}
            </section>


          </div>
        </section>

        <section className="mr-section" id="mr-overview">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>1. Overview</h2>
              <p>Service delivery, disruptions, and previous minutes for {draft.periodLabel}.</p>
            </header>
            <div className="mr-exec-card">
              <h3 className="mr-subhead" id="mr-overview-delivery">1.1 Service Delivery</h3>
              <TextField editing={editing} multiline grow value={draft.serviceDelivery} onChange={(value) => onText('serviceDelivery', value)} />
              <h3 className="mr-subhead" id="mr-overview-disruption">1.2 Service Disruption</h3>
              <TextField editing={editing} multiline grow value={draft.disruptions} onChange={(value) => onText('disruptions', value)} />
              <h3 className="mr-subhead" id="mr-overview-minutes">1.3 Previous Minutes</h3>
              <TextField editing={editing} multiline grow value={draft.previousMinutes} onChange={(value) => onText('previousMinutes', value)} />
            </div>
          </div>
        </section>

        <section className="mr-section mr-section--surface" id="mr-contract">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>2. Contract review</h2>
              <p>Compliance, safety, and environment for this month.</p>
            </header>
            <h3 className="mr-subhead" id="mr-contract-compliance">2.1 Contract Compliance and KPI</h3>
            <div className="mr-table-wrap">
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Area of Compliance</th>
                    <th>Yes</th>
                    <th>No</th>
                    <th>Comments</th>
                    {editing ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {draft.compliance.map((row, index) => (
                    <tr key={`compliance-${index}`}>
                      <td><TextField editing={editing} value={row.area} onChange={(value) => onDraft((current) => ({ ...current, compliance: current.compliance.map((item, itemIndex) => itemIndex === index ? { ...item, area: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.yes} onChange={(value) => onDraft((current) => ({ ...current, compliance: current.compliance.map((item, itemIndex) => itemIndex === index ? { ...item, yes: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.no} onChange={(value) => onDraft((current) => ({ ...current, compliance: current.compliance.map((item, itemIndex) => itemIndex === index ? { ...item, no: value } : item) }))} /></td>
                      <td><TextField editing={editing} multiline value={row.comments} onChange={(value) => onDraft((current) => ({ ...current, compliance: current.compliance.map((item, itemIndex) => itemIndex === index ? { ...item, comments: value } : item) }))} /></td>
                      {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, compliance: current.compliance.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton editing={editing} onClick={() => onDraft((current) => ({ ...current, compliance: [...current.compliance, { area: '', yes: '', no: '', comments: '' }] }))} />

            <h3 className="mr-subhead" id="mr-contract-whs">2.2 Work Health and Safety</h3>
            <p className="mr-nil">
              <TextField editing={editing} value={draft.whsScope} onChange={(value) => onText('whsScope', value)} />
            </p>
            <div className="mr-table-wrap">
              <table className="mr-table">
                <thead>
                  <tr>
                    <th />
                    <th><TextField editing={editing} fit="short" value={draft.whsMonth1} onChange={(value) => onText('whsMonth1', value)} /></th>
                    <th><TextField editing={editing} fit="short" value={draft.whsMonth2} onChange={(value) => onText('whsMonth2', value)} /></th>
                    <th><TextField editing={editing} fit="short" value={draft.whsMonth3} onChange={(value) => onText('whsMonth3', value)} /></th>
                    <th>Y.T.D.</th>
                    {editing ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {draft.whs.map((row, index) => (
                    <tr key={`whs-${index}`}>
                      <td><TextField editing={editing} value={row.label} onChange={(value) => onDraft((current) => ({ ...current, whs: current.whs.map((item, itemIndex) => itemIndex === index ? { ...item, label: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.m1} onChange={(value) => onDraft((current) => ({ ...current, whs: current.whs.map((item, itemIndex) => itemIndex === index ? { ...item, m1: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.m2} onChange={(value) => onDraft((current) => ({ ...current, whs: current.whs.map((item, itemIndex) => itemIndex === index ? { ...item, m2: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.m3} onChange={(value) => onDraft((current) => ({ ...current, whs: current.whs.map((item, itemIndex) => itemIndex === index ? { ...item, m3: value } : item) }))} /></td>
                      <td><TextField editing={editing} fit="num" value={row.ytd} onChange={(value) => onDraft((current) => ({ ...current, whs: current.whs.map((item, itemIndex) => itemIndex === index ? { ...item, ytd: value } : item) }))} /></td>
                      {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, whs: current.whs.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton editing={editing} onClick={() => onDraft((current) => ({ ...current, whs: [...current.whs, { label: '', m1: '0', m2: '0', m3: '0', ytd: '0' }] }))} />
            <h3 className="mr-subhead" id="mr-contract-env">2.3 Environmental Issues</h3>
            <div className="mr-table-wrap">
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Area of Compliance</th>
                    <th>Comments</th>
                    {editing ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {draft.environmental.map((row, index) => (
                    <tr key={`env-${index}`}>
                      <td><TextField editing={editing} value={row.area} onChange={(value) => onDraft((current) => ({ ...current, environmental: current.environmental.map((item, itemIndex) => itemIndex === index ? { ...item, area: value } : item) }))} /></td>
                      <td><TextField editing={editing} multiline value={row.comments} onChange={(value) => onDraft((current) => ({ ...current, environmental: current.environmental.map((item, itemIndex) => itemIndex === index ? { ...item, comments: value } : item) }))} /></td>
                      {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, environmental: current.environmental.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton editing={editing} onClick={() => onDraft((current) => ({ ...current, environmental: [...current.environmental, { area: '', comments: '' }] }))} />
          </div>
        </section>

        <section className="mr-section" id="mr-inspections">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>3. Inspections</h2>
              <p>Site inspections and scheduled work for this month.</p>
            </header>
            <h3 className="mr-subhead" id="mr-inspections-sites">3.1 Site Inspections</h3>
            {draft.streams.map((stream, streamIndex) => {
              const summary = stream.summary || [];
              const visits = stream.visits || [];
              const showQuality = !!stream.showQuality;
              const blankRow = { month: draft.periodLabel, group: '', description: '', schedule: '', completed: '', comments: '' };
              const blankVisit = { site: '', dates: '', quality: '', comments: '' };
              const chartData = summary
                .filter((row) => row.group || row.schedule || row.completed)
                .map((row) => {
                  const schedule = Number(row.schedule) || 0;
                  const completed = Number(row.completed) || 0;
                  // % only when the site has frequency (schedule > 0).
                  // Adhoc / fault rows keep completed counts but no percentage.
                  const pct = schedule > 0
                    ? Math.round((Math.min(completed, schedule) / schedule) * 100)
                    : null;
                  return {
                    group: row.group || 'Sites',
                    schedule,
                    completed,
                    pctLabel: pct == null ? '' : `${pct}%`,
                  };
                })
                .filter((row) => row.schedule > 0 || row.completed > 0);
              const scheduleTotal = chartData.reduce((sum, row) => sum + row.schedule, 0);
              const completedTotal = chartData.reduce((sum, row) => sum + row.completed, 0);
              // Overall % uses frequency rows only — ignore adhoc/fault completed-only rows.
              const scheduledCompletedTotal = chartData.reduce(
                (sum, row) => sum + (row.schedule > 0 ? Math.min(row.completed, row.schedule) : 0),
                0,
              );
              // % only when frequency exists; completed-only rows (no /sites frequency) stay off the %.
              const overallPct = scheduleTotal > 0
                ? Math.round((scheduledCompletedTotal / scheduleTotal) * 100)
                : null;
              const completionRate = overallPct;
              const perfStats = [
                {
                  key: 'overall',
                  label: 'Overall Completion',
                  value: overallPct == null ? '—' : `${overallPct}%`,
                  icon: <InspectIconSvg path={PERF_STAT_ICONS.overall} size={24} />,
                  tone: 'accent',
                },
                {
                  key: 'scheduled',
                  label: 'Total Scheduled',
                  value: String(scheduleTotal),
                  icon: <InspectIconSvg path={PERF_STAT_ICONS.scheduled} size={24} />,
                  tone: 'plain',
                },
                {
                  key: 'completed',
                  label: 'Total Completed',
                  value: String(completedTotal),
                  icon: <InspectIconSvg path={PERF_STAT_ICONS.completed} size={24} />,
                  tone: 'plain',
                },
                {
                  key: 'rate',
                  label: 'Completion Rate',
                  value: completionRate == null ? '—' : `${completionRate}%`,
                  icon: <InspectIconSvg path={PERF_STAT_ICONS.rate} size={24} />,
                  tone: 'plain',
                },
              ] as const;
              const chartTitle = `${stream.detailHeading || stream.heading || 'Site inspections'} – Overall Result${
                summary[0]?.month || draft.periodLabel ? ` (${summary[0]?.month || draft.periodLabel})` : ''
              }`;
              const patchStream = (patch: Partial<(typeof draft.streams)[number]>) =>
                onDraft((current) => ({
                  ...current,
                  streams: current.streams.map((item, index) => (index === streamIndex ? { ...item, ...patch } : item)),
                }));
              return (
              <div className="mr-stream" key={`stream-${streamIndex}`}>
                <div className="mr-stream-head">
                  <h3 className="mr-subhead">
                    <TextField editing={editing} chars={Math.max(16, (stream.heading || '').length + 1)} value={stream.heading} onChange={(value) => patchStream({ heading: value })} />
                  </h3>
                  {editing ? (
                    <Button className="mr-add-row" danger size="small" onClick={() => onDraft((current) => ({ ...current, streams: current.streams.filter((_, index) => index !== streamIndex) }))}>
                      Remove this service
                    </Button>
                  ) : null}
                </div>
                {editing || stream.note ? (
                  <p className="mr-nil">
                    <TextField editing={editing} placeholder="Note" value={stream.note} onChange={(value) => patchStream({ note: value })} />
                  </p>
                ) : null}
                <div className="mr-table-wrap" style={{ marginBottom: 8 }}>
                  <table className="mr-table mr-table--sites">
                    <colgroup>
                      <col className="mr-col-month" />
                      <col className="mr-col-site" />
                      <col className="mr-col-desc" />
                      <col className="mr-col-num" />
                      <col className="mr-col-num" />
                      <col className="mr-col-notes" />
                      {editing ? <col className="mr-col-act" /> : null}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Site</th>
                        <th>Description</th>
                        <th>Schedule for this month</th>
                        <th>Completed</th>
                        <th>Comments</th>
                        {editing ? <th className="mr-actions" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((row, rowIndex) => (
                        <tr key={`summary-${streamIndex}-${rowIndex}`}>
                          <td><TextField editing={editing} fit="short" value={row.month} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, month: value } : entry) } : item) }))} /></td>
                          <td><TextField editing={editing} value={row.group} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, group: value } : entry) } : item) }))} /></td>
                          <td><TextField editing={editing} value={row.description} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, description: value } : entry) } : item) }))} /></td>
                          <td><TextField editing={editing} fit="num" value={row.schedule} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, schedule: value } : entry) } : item) }))} /></td>
                          <td><TextField editing={editing} fit="num" value={row.completed} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, completed: value } : entry) } : item) }))} /></td>
                          <td><TextField editing={editing} multiline value={row.comments} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).map((entry, summaryIndex) => summaryIndex === rowIndex ? { ...entry, comments: value } : entry) } : item) }))} /></td>
                          {editing ? <td className="mr-actions"><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: (item.summary || []).filter((_, summaryIndex) => summaryIndex !== rowIndex) } : item) }))} /></td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mr-row-actions">
                  <AddButton editing={editing} label="Add row" onClick={() => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, summary: [...(item.summary || []), blankRow] } : item) }))} />
                </div>

                {chartData.length ? (
                  <article className="mr-perf-card">
                    <header className="mr-chart-card-head">
                      <h3>{chartTitle}</h3>
                      <p>Schedule vs completed by site group · {stream.heading.split('–')[0].trim() || 'Service'}</p>
                    </header>
                    <div className="mr-perf-layout">
                      <div className="mr-perf-main">
                        <div className="mr-perf-body">
                          <div className="mr-perf-chart-wrap">
                            <InspectPerfChart rows={chartData} />
                          </div>
                        </div>
                        <footer className="mr-perf-foot">
                          <div className="mr-perf-legend">
                            <span><i style={{ background: PERF_SCHEDULE }} /> Schedule for this month</span>
                            <span><i style={{ background: PERF_COMPLETED }} /> Completed</span>
                          </div>
                        </footer>
                      </div>
                      <aside className="mr-perf-stats" aria-label={`${stream.heading.split('–')[0].trim() || 'Service'} summary`}>
                        {perfStats.map((stat) => (
                          <div className={`mr-perf-stat mr-perf-stat--${stat.tone}`} key={`perf-stat-${streamIndex}-${stat.key}`}>
                            <span className="mr-perf-stat-ico">{stat.icon}</span>
                            <div className="mr-perf-stat-copy">
                              <em>{stat.label}</em>
                              <strong>{stat.value}</strong>
                            </div>
                          </div>
                        ))}
                      </aside>
                    </div>
                  </article>
                ) : null}

                <h3 className="mr-subhead">
                  <TextField
                    editing={editing}
                    chars={Math.max(16, (stream.detailHeading || 'Work completed').length + 1)}
                    value={stream.detailHeading || 'Work completed'}
                    onChange={(value) => patchStream({ detailHeading: value })}
                  />
                </h3>
                {editing || stream.detailNote ? (
                  <p className="mr-nil">
                    <TextField editing={editing} placeholder="Detail note" value={stream.detailNote || ''} onChange={(value) => patchStream({ detailNote: value })} />
                  </p>
                ) : null}
                <>
                  {visitBlocks(visits).map((block) => (
                    <div
                      className={`mr-visit-block${block.parent ? ' mr-visit-block--parent' : ''}`}
                      key={`visit-block-${streamIndex}-${block.key}`}
                    >
                      {block.parent ? (
                        <div className="mr-visit-parent-head">
                          <span className="mr-visit-parent-ico" aria-hidden="true">
                            <InspectIconSvg path={VISIT_COL_ICONS.building} size={22} />
                          </span>
                          <strong className="mr-visit-group-name">{block.parent}</strong>
                          <VisitParentGrass />
                        </div>
                      ) : null}
                      <div className={`mr-visit-card${block.parent ? ' mr-visit-card--children' : ''}`}>
                        <div className="mr-table-wrap mr-table-wrap--visits">
                          <table className={`mr-table mr-table--sites mr-table--visits${block.parent ? ' mr-table--visit-children' : ''}`}>
                            <colgroup>
                              <col className="mr-col-visit-site" />
                              <col className="mr-col-visit-dates" />
                              {showQuality ? <col className="mr-col-visit-quality" /> : null}
                              <col className="mr-col-visit-notes" />
                              {editing ? <col className="mr-col-act" /> : null}
                            </colgroup>
                            <thead>
                              <tr>
                                <th><span className="mr-visit-th"><VisitColIcon name="sites" />Sites</span></th>
                                <th>
                                  <span className="mr-visit-th">
                                    <VisitColIcon name="dates" />
                                    {showQuality ? 'Date of Inspection' : 'Date of Service'}
                                  </span>
                                </th>
                                {showQuality ? (
                                  <th><span className="mr-visit-th"><VisitColIcon name="quality" />Cleaning Quality (%)</span></th>
                                ) : null}
                                <th><span className="mr-visit-th"><VisitColIcon name="comments" />Comments</span></th>
                                {editing ? <th className="mr-actions" /> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.length ? block.rows.map(({ row, index: rowIndex }) => {
                                const isChild = Boolean(block.parent || row.isGroupChild);
                                const qualityText = String(row.quality || '').trim();
                                const commentsText = String(row.comments || '').trim();
                                const showQualityPill = !editing && showQuality && qualityText
                                  && /satisfactory|good|excellent|pass/i.test(qualityText);
                                return (
                                  <tr
                                    key={`visit-${streamIndex}-${rowIndex}`}
                                    className={isChild ? 'mr-visit-child' : undefined}
                                  >
                                    <td className={isChild ? 'mr-visit-child-site' : undefined}>
                                      <div className="mr-visit-site-cell">
                                        {isChild ? <VisitSiteIcon /> : null}
                                        <TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: (item.visits || []).map((entry, visitIndex) => visitIndex === rowIndex ? { ...entry, site: value } : entry) } : item) }))} />
                                      </div>
                                    </td>
                                    <td className="mr-visit-dates">
                                      {editing ? (
                                        <TextField editing={editing} multiline grow value={row.dates} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: (item.visits || []).map((entry, visitIndex) => visitIndex === rowIndex ? { ...entry, dates: value } : entry) } : item) }))} />
                                      ) : row.dateLinks?.length ? (
                                        <div className="mr-date-links">
                                          {row.dateLinks.map((link, linkIndex) => (
                                            <span key={`visit-date-${streamIndex}-${rowIndex}-${link.id}`}>
                                              {linkIndex > 0 ? ', ' : null}
                                              <a
                                                className="mr-date-link"
                                                href={`/new-reports?reportId=${link.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Open inspection report"
                                              >
                                                {link.date}
                                              </a>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        row.dates
                                      )}
                                    </td>
                                    {showQuality ? (
                                      <td className="mr-visit-quality">
                                        {editing ? (
                                          <TextField editing={editing} fit="num" value={row.quality} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: (item.visits || []).map((entry, visitIndex) => visitIndex === rowIndex ? { ...entry, quality: value } : entry) } : item) }))} />
                                        ) : showQualityPill ? (
                                          <span className="mr-quality-pill">{qualityText}</span>
                                        ) : (
                                          qualityText
                                        )}
                                      </td>
                                    ) : null}
                                    <td className="mr-visit-comments">
                                      {editing ? (
                                        <TextField editing={editing} multiline value={row.comments} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: (item.visits || []).map((entry, visitIndex) => visitIndex === rowIndex ? { ...entry, comments: value } : entry) } : item) }))} />
                                      ) : (
                                        commentsText
                                      )}
                                    </td>
                                    {editing ? <td className="mr-actions"><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: (item.visits || []).filter((_, visitIndex) => visitIndex !== rowIndex) } : item) }))} /></td> : null}
                                  </tr>
                                );
                              }) : (
                                <tr>
                                  <td colSpan={showQuality ? (editing ? 5 : 4) : (editing ? 4 : 3)} className="mr-nil">No child sites listed.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mr-row-actions">
                    <AddButton editing={editing} label="Add site visit" onClick={() => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, visits: [...(item.visits || []), blankVisit] } : item) }))} />
                  </div>
                </>
              </div>
              );
            })}
            <AddButton editing={editing} label="Add service" onClick={() => onDraft((current) => ({ ...current, streams: [...current.streams, { heading: 'New service', note: '', detailHeading: 'Work completed', detailNote: '', showQuality: false, summary: [{ month: draft.periodLabel, group: '', description: '', schedule: '', completed: '', comments: '' }], visits: [] }] }))} />

            <h3 className="mr-subhead" id="mr-faults">
              3.2 <TextField editing={editing} value={draft.feedbackHeading} onChange={(value) => onText('feedbackHeading', value)} />
            </h3>
            {draft.feedback.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Fault</th>
                      <th>Comment</th>
                      <th>Date reported</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.feedback.map((row, index) => (
                      <tr key={`feedback-${index}`}>
                        <td><TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, site: value } : item) }))} /></td>
                        <td>
                          {editing || !row.id ? (
                            <TextField editing={editing} multiline value={row.feedback} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, feedback: value } : item) }))} />
                          ) : (
                            <a
                              className="mr-fault-link"
                              href={`/report-faults?faultId=${row.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open fault report"
                            >
                              {row.feedback || `Fault #${row.id}`}
                            </a>
                          )}
                        </td>
                        <td><TextField editing={editing} multiline value={row.comment} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, comment: value } : item) }))} /></td>
                        <td><TextField editing={editing} fit="short" value={row.rectified} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, rectified: value } : item) }))} /></td>
                        {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, feedback: current.feedback.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mr-nil">Nil</p>
            )}
            <AddButton editing={editing} label="Add fault report" onClick={() => onDraft((current) => ({ ...current, feedback: [...current.feedback, { site: '', feedback: '', comment: '', rectified: '' }] }))} />
          </div>
        </section>

        <section className="mr-section mr-section--surface" id="mr-staffing">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>4. Staffing</h2>
              <p>Toolbox talks, staff changes, feedback, and recognition.</p>
            </header>
            <h3 className="mr-subhead" id="mr-staffing-toolbox">4.1 Toolbox talk</h3>
            {draft.toolbox.length ? (
              <div className="mr-events">
                {draft.toolbox.map((talk, index) => (
                  <article key={`talk-${index}`} className="mr-event">
                    <div className="mr-event-meta">
                      <span className="mr-pill mr-pill--type">Topic</span>
                      <time><TextField editing={editing} fit="short" value={talk.date} onChange={(value) => onDraft((current) => ({ ...current, toolbox: current.toolbox.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item) }))} /></time>
                    </div>
                    <h3><TextField editing={editing} value={talk.title} onChange={(value) => onDraft((current) => ({ ...current, toolbox: current.toolbox.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) }))} /></h3>
                    <p><TextField editing={editing} multiline value={talk.detail} onChange={(value) => onDraft((current) => ({ ...current, toolbox: current.toolbox.map((item, itemIndex) => itemIndex === index ? { ...item, detail: value } : item) }))} /></p>
                    <RemoveButton editing={editing} onClick={() => onDraft((current) => ({ ...current, toolbox: current.toolbox.filter((_, itemIndex) => itemIndex !== index) }))} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="mr-nil">Nil</p>
            )}
            <AddButton editing={editing} label="Add toolbox talk" onClick={() => onDraft((current) => ({ ...current, toolbox: [...current.toolbox, { title: '', date: '', detail: '' }] }))} />
            <h3 className="mr-subhead" id="mr-staffing-changes">4.2 Staff changes — New staff and staff leaving</h3>
            <TextField editing={editing} multiline value={draft.staffChanges} onChange={(value) => onText('staffChanges', value)} />
            <h3 className="mr-subhead" id="mr-staffing-feedback">4.3 Staff feedback</h3>
            <TextField editing={editing} multiline value={draft.staffFeedback} onChange={(value) => onText('staffFeedback', value)} />
            <h3 className="mr-subhead" id="mr-staffing-recognition">4.4 Staffing recognition award</h3>
            <TextField editing={editing} multiline value={draft.recognition} onChange={(value) => onText('recognition', value)} />
          </div>
        </section>

        <section className="mr-section" id="mr-financials">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>5. Financials</h2>
              <p>Overdue invoices, contract variations, adhoc requests, quotes, and consumables delivered.</p>
            </header>
            <h3 className="mr-subhead" id="mr-financials-invoices">5.1 Overdue invoices</h3>
            <p className="mr-nil"><TextField editing={editing} value={draft.invoiceIntro} onChange={(value) => onText('invoiceIntro', value)} /></p>
            {draft.invoices.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Detail</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.invoices.map((row, index) => (
                      <tr key={`invoice-${index}`}>
                        <td><TextField editing={editing} value={row.number} onChange={(value) => onDraft((current) => ({ ...current, invoices: current.invoices.map((item, itemIndex) => itemIndex === index ? { ...item, number: value } : item) }))} /></td>
                        <td><TextField editing={editing} multiline value={row.detail} onChange={(value) => onDraft((current) => ({ ...current, invoices: current.invoices.map((item, itemIndex) => itemIndex === index ? { ...item, detail: value } : item) }))} /></td>
                        {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, invoices: current.invoices.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <AddButton editing={editing} label="Add invoice" onClick={() => onDraft((current) => ({ ...current, invoices: [...current.invoices, { number: '', detail: '' }] }))} />
            <h3 className="mr-subhead" id="mr-financials-variations">5.2 Contract variations</h3>
            {draft.variations.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Requested by</th>
                      <th>Amount</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.variations.map((row, index) => (
                      <tr key={`variation-${index}`}>
                        <td><TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, variations: current.variations.map((item, itemIndex) => itemIndex === index ? { ...item, site: value } : item) }))} /></td>
                        <td><TextField editing={editing} fit="short" value={row.date} onChange={(value) => onDraft((current) => ({ ...current, variations: current.variations.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item) }))} /></td>
                        <td><TextField editing={editing} value={row.reason} onChange={(value) => onDraft((current) => ({ ...current, variations: current.variations.map((item, itemIndex) => itemIndex === index ? { ...item, reason: value } : item) }))} /></td>
                        <td><TextField editing={editing} value={row.requestedBy} onChange={(value) => onDraft((current) => ({ ...current, variations: current.variations.map((item, itemIndex) => itemIndex === index ? { ...item, requestedBy: value } : item) }))} /></td>
                        <td><TextField editing={editing} fit="num" value={row.amount} onChange={(value) => onDraft((current) => ({ ...current, variations: current.variations.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item) }))} /></td>
                        {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, variations: current.variations.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mr-nil">Nil</p>
            )}
            <AddButton editing={editing} label="Add variation" onClick={() => onDraft((current) => ({ ...current, variations: [...current.variations, { site: '', date: '', reason: '', requestedBy: '', amount: '' }] }))} />
            <p><TextField editing={editing} multiline value={draft.variationComments} onChange={(value) => onText('variationComments', value)} /></p>
            <h3 className="mr-subhead" id="mr-financials-adhoc">5.3 Adhoc work request</h3>
            {draft.adhoc.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Description</th>
                      <th>Requested by</th>
                      <th>Date</th>
                      <th>Amount</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.adhoc.map((row, index) => (
                      <tr key={`adhoc-${index}`}>
                        <td><TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, adhoc: current.adhoc.map((item, itemIndex) => itemIndex === index ? { ...item, site: value } : item) }))} /></td>
                        <td><TextField editing={editing} multiline value={row.description} onChange={(value) => onDraft((current) => ({ ...current, adhoc: current.adhoc.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item) }))} /></td>
                        <td><TextField editing={editing} value={row.requestedBy} onChange={(value) => onDraft((current) => ({ ...current, adhoc: current.adhoc.map((item, itemIndex) => itemIndex === index ? { ...item, requestedBy: value } : item) }))} /></td>
                        <td><TextField editing={editing} fit="short" value={row.date} onChange={(value) => onDraft((current) => ({ ...current, adhoc: current.adhoc.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item) }))} /></td>
                        <td><TextField editing={editing} fit="num" value={row.amount} onChange={(value) => onDraft((current) => ({ ...current, adhoc: current.adhoc.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item) }))} /></td>
                        {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, adhoc: current.adhoc.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mr-nil">Nil</p>
            )}
            <AddButton editing={editing} label="Add adhoc request" onClick={() => onDraft((current) => ({ ...current, adhoc: [...current.adhoc, { site: '', description: '', requestedBy: '', date: '', amount: '' }] }))} />
            <p><TextField editing={editing} multiline value={draft.adhocComments} onChange={(value) => onText('adhocComments', value)} /></p>
            <h3 className="mr-subhead" id="mr-financials-quotes">5.4 Quotes</h3>
            <TextField editing={editing} multiline value={draft.quotes} onChange={(value) => onText('quotes', value)} />
            <h3 className="mr-subhead" id="mr-financials-consumables">5.5 Consumables delivered</h3>
            {draft.consumables.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>Subject</th>
                      <th>Items</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.consumables.map((row, index) => (
                      <tr key={`consumable-${index}`}>
                        <td><TextField editing={editing} fit="short" value={row.date} onChange={(value) => onDraft((current) => ({ ...current, consumables: current.consumables.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item) }))} /></td>
                        <td><TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, consumables: current.consumables.map((item, itemIndex) => itemIndex === index ? { ...item, site: value } : item) }))} /></td>
                        <td><TextField editing={editing} value={row.subject} onChange={(value) => onDraft((current) => ({ ...current, consumables: current.consumables.map((item, itemIndex) => itemIndex === index ? { ...item, subject: value } : item) }))} /></td>
                        <td><TextField editing={editing} multiline value={row.items} onChange={(value) => onDraft((current) => ({ ...current, consumables: current.consumables.map((item, itemIndex) => itemIndex === index ? { ...item, items: value } : item) }))} /></td>
                        {editing ? <td><RemoveButton editing onClick={() => onDraft((current) => ({ ...current, consumables: current.consumables.filter((_, itemIndex) => itemIndex !== index) }))} /></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mr-nil">Nil</p>
            )}
            <AddButton editing={editing} label="Add consumable delivery" onClick={() => onDraft((current) => ({ ...current, consumables: [...current.consumables, { date: '', site: '', subject: '', items: '' }] }))} />
            <p><TextField editing={editing} multiline value={draft.consumablesComments} onChange={(value) => onText('consumablesComments', value)} /></p>
          </div>
        </section>
      </div>
    </div>
  );
}
