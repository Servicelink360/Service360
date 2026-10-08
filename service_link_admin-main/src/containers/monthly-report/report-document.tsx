import { Button, Input, message } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  }[];
  feedbackHeading: string;
  feedback: { site: string; feedback: string; comment: string; rectified: string }[];
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
};

function textOf(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

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
    serviceLine: textOf(raw.serviceLine, base.serviceLine),
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
    feedbackHeading: textOf(raw.feedbackHeading, base.feedbackHeading),
    staffChanges: textOf(raw.staffChanges, base.staffChanges),
    staffFeedback: textOf(raw.staffFeedback, base.staffFeedback),
    recognition: textOf(raw.recognition, base.recognition),
    invoiceIntro: textOf(raw.invoiceIntro, textOf(raw.invoiceEmpty, base.invoiceIntro)),
    variationComments: textOf(raw.variationComments, typeof raw.variations === 'string' ? raw.variations : base.variationComments),
    adhocComments: textOf(raw.adhocComments, base.adhocComments),
    quotes: textOf(raw.quotes, base.quotes),
    weekly: list(raw.weekly, (row) => ({
      week: String(row.week || ''),
      jobs: String(row.jobs || ''),
      faults: String(row.faults || ''),
      tickets: String(row.tickets || ''),
    }), base.weekly),
    services: list(raw.services, (row) => ({ name: String(row.name || ''), value: String(row.value || '') }), base.services),
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
    streams: list(raw.streams, (row) => ({
      heading: String(row.heading || ''),
      note: String(row.note || ''),
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
    }), base.streams),
    feedback: list(raw.feedback, (row) => ({
      site: String(row.site || ''),
      feedback: String(row.feedback || ''),
      comment: String(row.comment || row.status || ''),
      rectified: String(row.rectified || row.date || ''),
    }), base.feedback),
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
  if (!editing) return <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>;
  if (multiline) {
    return (
      <Input.TextArea
        className={grow ? 'mr-edit-area mr-edit-grow' : 'mr-edit-area'}
        autoSize={grow ? { minRows: 2 } : { minRows: 2, maxRows: 3 }}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  const width = chars ? `${Math.min(36, Math.max(chars, (value || '').length + 1))}ch` : undefined;
  const fitClass = fit === 'num' ? 'mr-edit-num' : fit === 'short' ? 'mr-edit-short' : '';
  return (
    <Input
      className={`${chars ? 'mr-edit-inline' : 'mr-edit-fill'} ${fitClass}`.trim()}
      size="small"
      placeholder={placeholder}
      style={width && !fit ? { width, maxWidth: '100%' } : undefined}
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
  const colors = ['#0f5c3f', '#147a54', '#3b82f6', '#6366f1', '#f59e0b', '#dc2626'];

  return (
    <div className="marketing-site mr-app">
      <div className={`mr-page mr-page--app${editing ? ' mr-editing' : ''}`}>
        <section className="mr-hero">
          <div className="mr-hero-bg" aria-hidden="true" />
          <div className="mr-hero-inner">
            <p className="mr-eyebrow">Monthly operations report</p>
            <h1>
              Monthly Report � <TextField editing={editing} chars={16} value={draft.periodLabel} onChange={(value) => onText('periodLabel', value)} />
            </h1>
            <p className="mr-hero-lead">
              <TextField editing={editing} chars={28} value={draft.serviceLine} onChange={(value) => onText('serviceLine', value)} />
              <span>for</span>
              <strong>
                <TextField editing={editing} chars={22} value={draft.clientName} onChange={(value) => onText('clientName', value)} />
              </strong>
            </p>
            <div className="mr-hero-meta">
              <span>
                <em>Client</em>
                <TextField editing={editing} value={draft.clientName} onChange={(value) => onText('clientName', value)} />
              </span>
              <span>
                <em>Period</em>
                <TextField editing={editing} value={draft.periodLabel} onChange={(value) => onText('periodLabel', value)} />
              </span>
              <span>
                <em>Jobs</em>
                <TextField editing={editing} chars={6} value={draft.jobs} onChange={(value) => onText('jobs', value)} />
              </span>
              <span>
                <em>Locations</em>
                <TextField editing={editing} chars={6} value={draft.locations} onChange={(value) => onText('locations', value)} />
              </span>
            </div>
            <div className="mr-cover-grid">
              <div>
                <h4>Client</h4>
                <p>
                  <TextField editing={editing} value={draft.clientName} onChange={(value) => onText('clientName', value)} />
                  <br />
                  <TextField editing={editing} value={draft.address} onChange={(value) => onText('address', value)} />
                  <br />
                  <TextField editing={editing} value={draft.contact} onChange={(value) => onText('contact', value)} />
                </p>
              </div>
              <div>
                <h4>This month</h4>
                <p>
                  <TextField editing={editing} value={draft.serviceLine} onChange={(value) => onText('serviceLine', value)} />
                  <br />
                  <TextField editing={editing} value={draft.periodRange} onChange={(value) => onText('periodRange', value)} />
                </p>
              </div>
              <div>
                <h4>Prepared by</h4>
                <p>
                  <TextField editing={editing} multiline value={draft.preparedBy} onChange={(value) => onText('preparedBy', value)} />
                </p>
              </div>
            </div>
            <div className="mr-toc">
              <h4>Table of content</h4>
              <div>
                <p><a href="#mr-overview">Section One � Overview</a></p>
                <p>1.1 Service Delivery</p>
                <p>1.2 Service Disruption</p>
                <p>1.3 General Issues</p>
                <p>1.4 Previous Minutes</p>
              </div>
              <div>
                <p><a href="#mr-contract">Section Two � Contract Review</a></p>
                <p>2.1 Contract Compliance and KPI</p>
                <p>2.2 Work Health and Safety</p>
                <p>2.3 Environmental Issues</p>
              </div>
              <div>
                <p><a href="#mr-inspections">Section Three � Inspections</a></p>
                <p>3.1 Site Inspections</p>
                <p>3.2 Customer feedback</p>
              </div>
              <div>
                <p><a href="#mr-staffing">Section Four � Staffing</a></p>
                <p>4.1 Toolbox talk</p>
                <p>4.2 Staff changes</p>
                <p>4.3 Staff feedback</p>
                <p>4.4 Staffing recognition award</p>
              </div>
              <div>
                <p><a href="#mr-financials">Section Five � Financials</a></p>
                <p>5.1 Overdue invoices</p>
                <p>5.2 Contract variations</p>
                <p>5.3 Adhoc work request</p>
                <p>5.4 Quotes</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mr-section mr-section--surface" id="mr-charts">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>This month at a glance</h2>
              <p>
                <TextField editing={editing} value={draft.glanceNote} onChange={(value) => onText('glanceNote', value)} />
              </p>
            </header>
            <div className="mr-chart-grid">
              <article className="mr-chart-card">
                <header className="mr-chart-card-head">
                  <h3>Weekly volume</h3>
                  <p>Completed jobs, faults, and tickets</p>
                </header>
                <div className="mr-chart-card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartWeekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5e3db" />
                      <XAxis dataKey="week" tick={{ fill: '#4d6359', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#4d6359', fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="jobs" name="Jobs" fill="#147a54" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="faults" name="Faults" fill="#dc2626" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="tickets" name="Tickets" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article className="mr-chart-card">
                <header className="mr-chart-card-head">
                  <h3>Work by service</h3>
                  <p>{draft.periodLabel}</p>
                </header>
                <div className="mr-chart-card-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={chartServices} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                        {chartServices.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
            {editing ? (
              <div className="mr-table-wrap" style={{ marginTop: 16 }}>
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
          </div>
        </section>

        <section className="mr-section" id="mr-overview">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>1. Overview</h2>
              <p>Service delivery, disruptions, and issues for {draft.periodLabel}.</p>
            </header>
            <div className="mr-exec-card">
              <h3 className="mr-subhead">1.1 Service Delivery</h3>
              <TextField editing={editing} multiline grow value={draft.serviceDelivery} onChange={(value) => onText('serviceDelivery', value)} />
              <h3 className="mr-subhead">1.2 Service Disruption</h3>
              <TextField editing={editing} multiline grow value={draft.disruptions} onChange={(value) => onText('disruptions', value)} />
              <h3 className="mr-subhead">1.3 General Issues</h3>
              <TextField editing={editing} multiline grow value={draft.generalIssues} onChange={(value) => onText('generalIssues', value)} />
              <h3 className="mr-subhead">1.4 Previous Minutes</h3>
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
            <h3 className="mr-subhead">2.1 Contract Compliance and KPI</h3>
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

            <h3 className="mr-subhead">2.2 Work Health and Safety</h3>
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
            <h3 className="mr-subhead">2.3 Environmental Issues</h3>
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
            <h3 className="mr-subhead">3.1 Site Inspections</h3>
            {draft.streams.map((stream, streamIndex) => {
              const summary = stream.summary || [];
              const blankRow = { month: draft.periodLabel, group: '', description: '', schedule: '', completed: '', comments: '' };
              return (
              <div className="mr-stream" key={`stream-${streamIndex}`}>
                <div className="mr-stream-head">
                  <h3 className="mr-subhead">
                    <TextField editing={editing} chars={Math.max(16, (stream.heading || '').length + 1)} value={stream.heading} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, heading: value } : item) }))} />
                  </h3>
                  {editing ? (
                    <Button className="mr-add-row" danger size="small" onClick={() => onDraft((current) => ({ ...current, streams: current.streams.filter((_, index) => index !== streamIndex) }))}>
                      Remove this service
                    </Button>
                  ) : null}
                </div>
                {editing || stream.note ? (
                  <p className="mr-nil">
                    <TextField editing={editing} placeholder="Note" value={stream.note} onChange={(value) => onDraft((current) => ({ ...current, streams: current.streams.map((item, index) => index === streamIndex ? { ...item, note: value } : item) }))} />
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
              </div>
              );
            })}
            <AddButton editing={editing} label="Add service" onClick={() => onDraft((current) => ({ ...current, streams: [...current.streams, { heading: 'New service', note: '', summary: [{ month: draft.periodLabel, group: '', description: '', schedule: '', completed: '', comments: '' }] }] }))} />

            <h3 className="mr-subhead">
              3.2 <TextField editing={editing} value={draft.feedbackHeading} onChange={(value) => onText('feedbackHeading', value)} />
            </h3>
            {draft.feedback.length ? (
              <div className="mr-table-wrap">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Feedback</th>
                      <th>Comment</th>
                      <th>Date Rectified</th>
                      {editing ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.feedback.map((row, index) => (
                      <tr key={`feedback-${index}`}>
                        <td><TextField editing={editing} value={row.site} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, site: value } : item) }))} /></td>
                        <td><TextField editing={editing} multiline value={row.feedback} onChange={(value) => onDraft((current) => ({ ...current, feedback: current.feedback.map((item, itemIndex) => itemIndex === index ? { ...item, feedback: value } : item) }))} /></td>
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
            <AddButton editing={editing} label="Add feedback" onClick={() => onDraft((current) => ({ ...current, feedback: [...current.feedback, { site: '', feedback: '', comment: '', rectified: '' }] }))} />
          </div>
        </section>

        <section className="mr-section mr-section--surface" id="mr-staffing">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>4. Staffing</h2>
              <p>Toolbox talks, staff changes, feedback, and recognition.</p>
            </header>
            <h3 className="mr-subhead">4.1 Toolbox talk</h3>
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
            <h3 className="mr-subhead">4.2 Staff changes � New staff and staff leaving</h3>
            <TextField editing={editing} multiline value={draft.staffChanges} onChange={(value) => onText('staffChanges', value)} />
            <h3 className="mr-subhead">4.3 Staff feedback</h3>
            <TextField editing={editing} multiline value={draft.staffFeedback} onChange={(value) => onText('staffFeedback', value)} />
            <h3 className="mr-subhead">4.4 Staffing recognition award</h3>
            <TextField editing={editing} multiline value={draft.recognition} onChange={(value) => onText('recognition', value)} />
          </div>
        </section>

        <section className="mr-section" id="mr-financials">
          <div className="mr-section-inner">
            <header className="mr-section-header">
              <h2>5. Financials</h2>
              <p>Overdue invoices, contract variations, adhoc requests, and quotes.</p>
            </header>
            <h3 className="mr-subhead">5.1 Overdue invoices</h3>
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
            <h3 className="mr-subhead">5.2 Contract variations</h3>
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
            <h3 className="mr-subhead">5.3 Adhoc work request</h3>
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
            <h3 className="mr-subhead">5.4 Quotes</h3>
            <TextField editing={editing} multiline value={draft.quotes} onChange={(value) => onText('quotes', value)} />
          </div>
        </section>
      </div>
    </div>
  );
}
