import React from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PUBLIC_ROUTE } from '@app/route.constants';
import './monthlyReport.css';

/** Realistic sample pack for Bayside Council � aligned to Service360 client modules + FM monthly report practice. */

const CLIENT = {
  name: 'Bayside Council',
  legal: 'Bayside City Council',
  abn: 'ABN sample � demo pack',
  contact: 'council@bayside.nsw.gov.au',
  phone: '02 9562 1666',
  address: 'Rockdale NSW 2216',
  web: 'https://www.bayside.nsw.gov.au/',
};

const PERIOD = {
  label: 'August 2026',
  from: '01/08/2026',
  to: '31/08/2026',
  prepared: '02/09/2026',
  preparedBy: 'ServiceLink Pty Ltd � Service360',
  contract: 'Public Amenities Cleaning � Bayside portfolio',
};

const EXEC_SUMMARY = [
  'Operational volume was steady: 41 tickets, 52 completed site reports (including adhoc), and 17 faults across Bayside and Mascot Public Amenities locations.',
  'Public Amenities Cleaning remained the primary service. Highest amenity activity: Tonbridge Reserve, Scarborough Park, Gardiner Park, and Ador Reserve.',
  'Four invoices were published for the month; three fully downloaded by council users. Two urgent faults remain open with ServiceLink and are listed under Client action items.',
  'Audit / scheduled completions produced 16 PDF-ready audit records. Personnel contacts available for fault delegation: 9.',
];

const KPI_ROWS = [
  { label: 'Registered sites', value: 2, prior: 2, unit: '', note: 'Bayside + Mascot Public Amenities' },
  { label: 'Amenity locations worked', value: 14, prior: 12, unit: '', note: 'Named reserves / parks under sites' },
  { label: 'Tickets raised', value: 41, prior: 36, unit: '', note: '18 completed � 14 in progress � 9 new' },
  { label: 'Site reports completed', value: 52, prior: 47, unit: '', note: 'New reports + adhoc subset' },
  { label: 'Faults logged', value: 17, prior: 15, unit: '', note: '5 urgent � 11 closed' },
  { label: 'Audit PDFs available', value: 16, prior: 14, unit: '', note: 'Completed scheduled field tasks' },
  { label: 'Message threads active', value: 29, prior: 24, unit: '', note: 'Provider + colleague chats' },
  { label: 'Invoices published', value: 4, prior: 3, unit: '', note: '3 downloaded � 1 viewed' },
];

const WEEKLY_ACTIVITY = [
  { week: '1�7 Aug', tickets: 9, reports: 11, faults: 3, messages: 6, audits: 3 },
  { week: '8�14 Aug', tickets: 10, reports: 13, faults: 4, messages: 8, audits: 4 },
  { week: '15�21 Aug', tickets: 12, reports: 15, faults: 5, messages: 9, audits: 5 },
  { week: '22�31 Aug', tickets: 10, reports: 13, faults: 5, messages: 6, audits: 4 },
];

const TICKET_STATUS = [
  { name: 'New', value: 9, color: '#f59e0b' },
  { name: 'In progress', value: 14, color: '#3b82f6' },
  { name: 'Completed', value: 18, color: '#147a54' },
];

const TICKET_WAIT = [
  { name: 'Waiting for support', value: 8 },
  { name: 'Waiting for customer', value: 6 },
];

const REPORT_MIX = [
  { name: 'New reports', count: 34 },
  { name: 'Adhoc (in New reports)', count: 12 },
  { name: 'Audit records', count: 16 },
  { name: 'Faults', count: 17 },
];

const FAULT_PRIORITY = [
  { name: 'Urgent', value: 5, color: '#dc2626' },
  { name: 'High', value: 4, color: '#ea580c' },
  { name: 'Normal', value: 8, color: '#147a54' },
];

const FAULT_OUTCOME = [
  { name: 'Closed', value: 11, color: '#147a54' },
  { name: 'Open / in progress', value: 4, color: '#3b82f6' },
  { name: 'Delegated', value: 2, color: '#6366f1' },
];

const SITE_ACTIVITY = [
  { site: 'Tonbridge Reserve', reports: 8, faults: 3, tickets: 5, audits: 2 },
  { site: 'Scarborough Park', reports: 7, faults: 2, tickets: 4, audits: 2 },
  { site: 'Gardiner Park', reports: 6, faults: 2, tickets: 4, audits: 2 },
  { site: 'Ador Reserve', reports: 5, faults: 2, tickets: 3, audits: 1 },
  { site: 'Arncliffe Park', reports: 5, faults: 1, tickets: 3, audits: 2 },
  { site: 'Rockdale Park', reports: 4, faults: 2, tickets: 3, audits: 1 },
  { site: 'John Curtin Reserve', reports: 4, faults: 1, tickets: 2, audits: 2 },
  { site: 'Mascot Memorial Park', reports: 3, faults: 1, tickets: 3, audits: 1 },
];

const SERVICE_SPLIT = [
  { name: 'Public Amenities Cleaning', value: 48, color: '#0f5c3f' },
  { name: 'Reactive / Adhoc works', value: 18, color: '#147a54' },
  { name: 'Audit / scheduled', value: 16, color: '#3b82f6' },
  { name: 'Fault follow-up', value: 12, color: '#dc2626' },
];

const MOM_TREND = [
  { month: 'May', tickets: 31, reports: 40, faults: 12 },
  { month: 'Jun', tickets: 34, reports: 43, faults: 14 },
  { month: 'Jul', tickets: 36, reports: 47, faults: 15 },
  { month: 'Aug', tickets: 41, reports: 52, faults: 17 },
];

const INVOICE_ROWS = [
  {
    date: '05/08/2026',
    title: 'INV-2026-08-BAY-01 � July amenities cleaning cycle',
    amount: '$18,640',
    status: 'Downloaded',
  },
  {
    date: '12/08/2026',
    title: 'INV-2026-08-BAY-02 � Reactive / adhoc callouts',
    amount: '$6,280',
    status: 'Downloaded',
  },
  {
    date: '20/08/2026',
    title: 'INV-2026-08-BAY-03 � Scheduled audit pack',
    amount: '$4,920',
    status: 'Downloaded',
  },
  {
    date: '29/08/2026',
    title: 'INV-2026-08-BAY-04 � Urgent fault rectification',
    amount: '$3,150',
    status: 'Viewed',
  },
];

const NOTABLE_EVENTS = [
  {
    date: '06/08/2026',
    type: 'Fault',
    title: 'Overhanging branches � Blackmore / Canal Rd amenity area',
    detail: 'Urgent priority. Photos attached. Delegated follow-up discussed with council personnel.',
  },
  {
    date: '12/08/2026',
    type: 'Report',
    title: 'Roof and Gutter / amenities clean � Tonbridge Reserve',
    detail: 'Completed New Report with before/after media; PDF available to client under New reports.',
  },
  {
    date: '18/08/2026',
    type: 'Ticket',
    title: 'Blocked amenity access � Scarborough Park (Production Ave)',
    detail: 'Client ticket New ? In progress. Waiting for support with site photos.',
  },
  {
    date: '25/08/2026',
    type: 'Adhoc',
    title: 'Storm debris clear � Gardiner Park amenities',
    detail: 'Adhoc Report under Reactive/Adhoc Maintenance Works; visible in New reports list.',
  },
];

const COMPLIANCE = [
  { item: 'Audit PDFs issued (scheduled completions)', value: '16', status: 'On track' },
  { item: 'Faults closed vs opened', value: '11 / 17', status: '65% closed' },
  { item: 'Urgent faults still open', value: '2', status: 'Action needed' },
  { item: 'PPE / uniform confirmation on site reports', value: 'Captured on templates', status: 'OK' },
  { item: 'Safe-to-enter checks on completed cleans', value: 'Recorded on reports', status: 'OK' },
];

const PERSONNEL = [
  { name: 'Jessica Bosevska', type: 'Council contact', note: 'Primary Service360 client login sample' },
  { name: 'Alex Nguyen', type: 'Electrician', note: 'Available for fault delegation' },
  { name: 'Sam Patel', type: 'Tradesperson', note: 'Available for fault delegation' },
  { name: 'Morgan Lee', type: 'Support', note: 'Available for fault delegation' },
];

const ACTION_ITEMS = [
  {
    owner: 'Bayside Council',
    item: 'Confirm access for remaining urgent fault at Canal Rd / Blackmore amenities (photos on fault record).',
    due: '12/09/2026',
  },
  {
    owner: 'Bayside Council',
    item: 'Review invoice INV-2026-08-BAY-04 (viewed, not yet downloaded).',
    due: '10/09/2026',
  },
  {
    owner: 'ServiceLink',
    item: 'Close 2 open urgent faults and confirm PDF evidence in New reports.',
    due: '15/09/2026',
  },
  {
    owner: 'ServiceLink',
    item: 'Schedule September audit sweep for Mascot Public Amenities locations.',
    due: '20/09/2026',
  },
];

const NEXT_MONTH = [
  'Continue Public Amenities Cleaning cycle across Bayside & Mascot sites.',
  'Prioritise Scarborough Park and Tonbridge Reserve based on August fault density.',
  'Complete delegated fault follow-ups via My personnel where council elects trades.',
  'Publish September invoice pack and clear dashboard badges after client download.',
];

function delta(value: number, prior: number) {
  const d = value - prior;
  if (d === 0) return { text: 'Flat vs Jul', cls: 'mr-delta--flat' };
  if (d > 0) return { text: `+${d} vs Jul`, cls: 'mr-delta--up' };
  return { text: `${d} vs Jul`, cls: 'mr-delta--down' };
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mr-chart-card">
      <header className="mr-chart-card-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="mr-chart-card-body">{children}</div>
    </article>
  );
}

export default function MonthlyReportPage() {
  return (
    <div className="mr-page">
      <section className="mr-hero">
        <div className="mr-hero-bg" aria-hidden="true" />
        <div className="mr-hero-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> /{' '}
            <Link to={PUBLIC_ROUTE.MARKETING_FEATURE_HIGHLIGHTS}>Feature highlights</Link> / Monthly
            report � Bayside
          </div>
          <p className="mr-eyebrow">Confidential sample � Client pack</p>
          <h1>Monthly operations report</h1>
          <p className="mr-hero-lead">
            Realistic month-end pack for <strong>{CLIENT.name}</strong> � executive summary, MoM KPIs,
            tickets, messages, reports, faults, audits, invoices, personnel, and action items drawn from
            the live Service360 client workspace modules.
          </p>
          <div className="mr-hero-meta">
            <span>
              <em>Client</em>
              {CLIENT.name}
            </span>
            <span>
              <em>Period</em>
              {PERIOD.label}
            </span>
            <span>
              <em>Contract</em>
              Public Amenities Cleaning
            </span>
            <span>
              <em>Prepared</em>
              {PERIOD.prepared}
            </span>
          </div>
          <div className="mr-cover-grid">
            <div>
              <h4>Client</h4>
              <p>
                {CLIENT.legal}
                <br />
                {CLIENT.address}
                <br />
                {CLIENT.contact} � {CLIENT.phone}
              </p>
            </div>
            <div>
              <h4>Sites in scope</h4>
              <p>
                Bayside Public Amenities � 341 W Botany St, Rockdale NSW 2216
                <br />
                Mascot Public Amenities � 80 High St, Mascot NSW 2020
              </p>
            </div>
            <div>
              <h4>Prepared by</h4>
              <p>
                {PERIOD.preparedBy}
                <br />
                Reporting window {PERIOD.from} � {PERIOD.to}
              </p>
            </div>
          </div>
          <div className="mr-hero-actions">
            <a href="#mr-exec" className="btn-primary mr-btn">
              Executive summary
            </a>
            <a href="#mr-kpis" className="mr-btn-secondary">
              KPIs
            </a>
            <a href="#mr-actions" className="mr-btn-secondary">
              Action items
            </a>
          </div>
        </div>
      </section>

      <section className="mr-section" id="mr-exec">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>1. Executive summary</h2>
            <p>Stand-alone overview for council stakeholders.</p>
          </header>
          <div className="mr-exec-card">
            <ul>
              {EXEC_SUMMARY.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mr-exec-footnote">
              Action items requiring council decision: <strong>{ACTION_ITEMS.filter((a) => a.owner === 'Bayside Council').length}</strong> (see section 9).
            </p>
          </div>
        </div>
      </section>

      <section className="mr-section mr-section--surface" id="mr-kpis">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>2. Key performance indicators</h2>
            <p>Current month vs July 2026 � client-visible Service360 modules.</p>
          </header>
          <div className="mr-kpi-grid mr-kpi-grid--8">
            {KPI_ROWS.map((k) => {
              const d = delta(k.value, k.prior);
              return (
                <div className="mr-kpi" key={k.label}>
                  <span className="mr-kpi-value">{k.value}</span>
                  <span className="mr-kpi-label">{k.label}</span>
                  <span className={`mr-delta ${d.cls}`}>{d.text}</span>
                  <span className="mr-kpi-hint">{k.note}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mr-section" id="mr-charts">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>3. Operations & trends</h2>
            <p>Weekly volume, four-month trend, and work mix.</p>
          </header>

          <div className="mr-chart-grid">
            <ChartCard title="Weekly operational volume" subtitle="Tickets � reports � faults � messages � audits">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={WEEKLY_ACTIVITY} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#147a54" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#147a54" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5e3db" />
                  <XAxis dataKey="week" tick={{ fill: '#4d6359', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#4d6359', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="reports" name="Reports" stroke="#147a54" fill="url(#mrReports)" strokeWidth={2} />
                  <Area type="monotone" dataKey="tickets" name="Tickets" stroke="#3b82f6" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="faults" name="Faults" stroke="#dc2626" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="messages" name="Messages" stroke="#6366f1" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="audits" name="Audits" stroke="#0f5c3f" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="4-month trend" subtitle="May�August 2026">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={MOM_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5e3db" />
                  <XAxis dataKey="month" tick={{ fill: '#4d6359', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#4d6359', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reports" name="Reports" fill="#147a54" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="tickets" name="Tickets" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="faults" name="Faults" stroke="#dc2626" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ticket status" subtitle="41 tickets in August">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={TICKET_STATUS} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {TICKET_STATUS.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mr-mini-bars">
                {TICKET_WAIT.map((w) => (
                  <div key={w.name} className="mr-mini-bar-row">
                    <span>{w.name}</span>
                    <strong>{w.value}</strong>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Report & fault mix" subtitle="Client Reports module">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={REPORT_MIX} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5e3db" />
                  <XAxis dataKey="name" tick={{ fill: '#4d6359', fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#4d6359', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" fill="#147a54" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </section>

      <section className="mr-section mr-section--surface">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>4. Sites, services & faults</h2>
            <p>Amenity-level activity under Bayside / Mascot Public Amenities.</p>
          </header>

          <div className="mr-chart-grid mr-chart-grid--wide">
            <ChartCard title="Top amenity locations" subtitle="Reports � tickets � faults � audits">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart layout="vertical" data={SITE_ACTIVITY} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5e3db" />
                  <XAxis type="number" tick={{ fill: '#4d6359', fontSize: 12 }} />
                  <YAxis type="category" dataKey="site" width={140} tick={{ fill: '#0f241c', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reports" name="Reports" stackId="a" fill="#147a54" />
                  <Bar dataKey="tickets" name="Tickets" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="audits" name="Audits" stackId="a" fill="#0f5c3f" />
                  <Bar dataKey="faults" name="Faults" stackId="a" fill="#dc2626" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="mr-stack">
              <ChartCard title="Work by service" subtitle="Share of completed field activity">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={SERVICE_SPLIT} dataKey="value" nameKey="name" innerRadius={42} outerRadius={78} paddingAngle={2}>
                      {SERVICE_SPLIT.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Fault priority & outcome" subtitle="17 faults logged">
                <div className="mr-dual-pie">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={FAULT_PRIORITY} dataKey="value" nameKey="name" outerRadius={60}>
                        {FAULT_PRIORITY.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={FAULT_OUTCOME} dataKey="value" nameKey="name" outerRadius={60}>
                        {FAULT_OUTCOME.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mr-legend-inline">
                  <span>Priority</span>
                  <span>Outcome</span>
                </div>
              </ChartCard>
            </div>
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>5. Notable events</h2>
            <p>Significant tickets, reports, faults, and adhoc jobs this month.</p>
          </header>
          <div className="mr-events">
            {NOTABLE_EVENTS.map((e) => (
              <article key={e.title} className="mr-event">
                <div className="mr-event-meta">
                  <span className="mr-pill mr-pill--type">{e.type}</span>
                  <time>{e.date}</time>
                </div>
                <h3>{e.title}</h3>
                <p>{e.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mr-section mr-section--surface">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>6. Compliance & quality</h2>
            <p>Checks typically expected in facilities monthly packs + Service360 audit evidence.</p>
          </header>
          <div className="mr-table-wrap">
            <table className="mr-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Result</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {COMPLIANCE.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td>{row.value}</td>
                    <td>
                      <span
                        className={`mr-pill ${
                          row.status === 'Action needed' ? 'mr-pill--warn' : 'mr-pill--ok'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mr-section">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>7. Invoices & messaging</h2>
            <p>Billing visibility and communication volume for the client workspace.</p>
          </header>
          <div className="mr-split">
            <div className="mr-table-wrap">
              <h3>Invoices published</h3>
              <table className="mr-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {INVOICE_ROWS.map((row) => (
                    <tr key={row.title}>
                      <td>{row.date}</td>
                      <td>{row.title}</td>
                      <td>{row.amount}</td>
                      <td>
                        <span className="mr-pill">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mr-table-note">
                Total invoiced (sample): <strong>$32,990</strong> � Clients do not upload invoices � Service360
                publishes; council downloads from Invoices.
              </p>
            </div>
            <div className="mr-highlights">
              <h3>Messages</h3>
              <ul>
                <li>29 active threads with ServiceLink and council colleagues.</li>
                <li>12 conversations linked to faults or new reports (�message about this report�).</li>
                <li>Unread badges cleared when opened from the client dashboard.</li>
              </ul>
              <h3>My personnel</h3>
              <ul>
                {PERSONNEL.map((p) => (
                  <li key={p.name}>
                    <strong>{p.name}</strong> � {p.type}. {p.note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mr-section mr-section--surface">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>8. Next month priorities</h2>
            <p>September 2026 focus areas.</p>
          </header>
          <ol className="mr-next-list">
            {NEXT_MONTH.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mr-section" id="mr-actions">
        <div className="mr-section-inner">
          <header className="mr-section-header">
            <h2>9. Client action items</h2>
            <p>Decisions / follow-ups required � standard closing section for monthly packs.</p>
          </header>
          <div className="mr-table-wrap">
            <table className="mr-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Action</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {ACTION_ITEMS.map((row) => (
                  <tr key={row.item}>
                    <td>{row.owner}</td>
                    <td>{row.item}</td>
                    <td>{row.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mr-module-map" style={{ marginTop: 24 }}>
            <h4>Service360 modules covered in this pack</h4>
            <div className="mr-chips">
              {[
                'Dashboard',
                'Messages',
                'Tickets',
                'My personnel',
                'Invoices',
                'New reports',
                'Adhoc reports',
                'Report faults',
                'Audit report',
              ].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mr-section mr-cta-section">
        <div className="mr-cta">
          <h2>Sample pack for Bayside Council</h2>
          <p>
            This marketing demo mirrors industry monthly FM reporting (executive summary, KPIs, operations,
            compliance, invoices, and action items) using Service360 client-module data patterns for Bayside.
          </p>
          <div className="mr-hero-actions">
            <Link to={PUBLIC_ROUTE.MARKETING_CONTACT} className="btn-primary mr-btn">
              Contact us
            </Link>
            <Link
              to={`${PUBLIC_ROUTE.MARKETING_FEATURE_HIGHLIGHTS}#hiw-clients`}
              className="mr-btn-secondary mr-btn-secondary--on-dark"
            >
              Client features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
