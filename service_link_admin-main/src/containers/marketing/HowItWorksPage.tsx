import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBuilding,
  FaClipboardCheck,
  FaClipboardList,
  FaComments,
  FaExclamationTriangle,
  FaFileAlt,
  FaFileInvoiceDollar,
  FaMapMarkerAlt,
  FaTachometerAlt,
  FaTools,
  FaUserFriends,
  FaUserShield,
} from 'react-icons/fa';
import { PUBLIC_ROUTE } from '@app/route.constants';
import './howItWorksMockups.css';

type FeatureHighlight = {
  id: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  bullets: string[];
  path: string;
};

/** Live client sidebar — `optionsCustomer` in Sidebar/options.ts */
type ClientChild = {
  title: string;
  text: string;
  image?: string;
  imageAlt?: string;
  images?: { src: string; alt: string }[];
  pdfUrl?: string;
  pdfLabel?: string;
};

type ClientFeature = {
  title: string;
  path: string;
  icon: React.ReactNode;
  text: string;
  bullets?: string[];
  children?: ClientChild[];
  image?: string;
  imageAlt?: string;
};

const CLIENT_FEATURES: ClientFeature[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: <FaTachometerAlt />,
    text: 'After sign-in you land here. Badges show what needs attention for your organisation only.',
    bullets: [
      'New reports, fault reports, tickets, messages, and invoices with live counts',
      'Tap a tile to open that module',
      'Invoices badge clears after you open Invoices',
    ],
    image: '/images/marketing/client-dashboard.png',
    imageAlt: 'Client dashboard with Reports and Invoices quick links',
  },
  {
    title: 'Messages',
    path: '/messages',
    icon: <FaComments />,
    text: 'Threaded inbox to talk with your service provider (ServiceLink) or colleagues in your organisation.',
    bullets: [
      'Tabs: All, Received, Sent, and Deleted',
      'Start a conversation with one recipient, then send text and attachments',
      'Cc colleagues on provider threads or report-linked chats',
      'Open a chat from a fault or new report (“message about this report”) — replies stay linked to that record',
    ],
    image: '/images/marketing/client-messages.png',
    imageAlt: 'Client messages inbox with conversation list and compose form',
  },
  {
    title: 'Tickets',
    path: '/tickets',
    icon: <FaClipboardList />,
    text: 'Raise and track service requests for your sites. Support moves each ticket through status; you reply when it’s your turn.',
    bullets: [
      'Create from Ticket New: site, service, subject, message, optional Urgent, and required media',
      'Edit, delete, or restore your own tickets',
    ],
    image: '/images/marketing/client-tickets.png',
    imageAlt: 'Client tickets list with New, In progress, and Completed views',
    children: [
      {
        title: 'Ticket New',
        text: 'Newly submitted requests waiting for support. This is where clients create a ticket.',
      },
      {
        title: 'Ticket In progress',
        text: 'Support is working the ticket. Status shows Waiting for customer or Waiting for support.',
      },
      {
        title: 'Ticket Completed',
        text: 'Closed tickets with full history. No further replies.',
      },
    ],
  },
  {
    title: 'My personnel',
    path: '/customer-personnel',
    icon: <FaUserFriends />,
    text: 'Your organisation’s contact list — people who can receive fault work when you delegate.',
    bullets: [
      'Add, edit, or remove contacts (name, email, phone, type such as Tradesperson or Electrician)',
      'Used when delegating a fault by email with a secure link',
    ],
    image: '/images/marketing/client-my-personnel.png',
    imageAlt: 'My personnel list with name, email, phone, type, and actions',
  },
  {
    title: 'Invoices',
    path: '/invoices',
    icon: <FaFileInvoiceDollar />,
    text: 'View and download invoices published for your organisation. Clients do not upload invoices — admins publish them.',
    bullets: [
      'Search and filter by date',
      'Open details and download attachments',
      'Soft-delete or restore from the Deleted tab',
    ],
    image: '/images/marketing/client-invoices.png',
    imageAlt: 'Client invoices list with sample invoice PDF and download actions',
  },
  {
    title: 'Reports',
    path: '/new-reports',
    icon: <FaFileAlt />,
    text: 'All site reporting for your portfolio — completed work, faults you manage, audits, and adhoc / reactive jobs.',
    children: [
      {
        title: 'New reports',
        text: 'History of template-based site reports created by staff or admin (clients cannot create here). Filter by date or site, open a report, download PDF, message about it, and track read status. Sample: Roof and Gutter cleaning report at Tonbridge Reserve.',
        image: '/images/marketing/client-new-reports.png',
        imageAlt: 'New report detail — Roof and Gutter cleaning report sample',
        pdfUrl: 'https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1788606566517.pdf',
        pdfLabel: 'View report sample',
        images: [
          {
            src: '/images/marketing/report1.png',
            alt: 'Roof and Gutter Cleaning Report modal with before and after photos',
          },
          {
            src: '/images/marketing/report2.png',
            alt: 'Roof and Gutter cleaning report photo viewer with site location stamp',
          },
        ],
      },
      {
        title: 'Adhoc reports',
        text: 'Reactive / ad hoc maintenance filed by staff (Adhoc Report template, including “Other” custom sites). Finished adhoc jobs appear under New reports for your sites. Sample: emergency gutter unblock after storm.',
        image: '/images/marketing/client-adhoc-report.png',
        imageAlt: 'Adhoc report sample for reactive roof and gutter work',
      },
      {
        title: 'Report faults',
        text: 'Review and manage faults logged by staff (clients do not create faults). Set priority, message support, mark completed or reopen, and delegate to ServiceLink or My personnel via email + secure link. Sample: Roof and Gutter fault — blocked gutter overflowing.',
        image: '/images/marketing/client-report-faults.png',
        imageAlt: 'Report faults list with Roof and Gutter urgent fault sample',
        images: [
          {
            src: '/images/marketing/fault.png',
            alt: 'Fault media — overhanging branches over corrugated roof',
          },
          {
            src: '/images/marketing/fault1.png',
            alt: 'Fault Report modal — Blackmore Oval Roof and Gutter Cleaning with media files',
          },
        ],
      },
      {
        title: 'Audit report',
        text: 'Month / site / service view of completed scheduled field tasks and their audit PDFs. Search completed work, open the viewer, and download PDF when available.',
      },
      {
        title: 'Monthly report pack',
        text: 'Sample month-end client pack for Bayside Council — KPIs, weekly trends, ticket/report/fault charts, top sites, invoices, and highlights across every client module.',
        pdfUrl: PUBLIC_ROUTE.MARKETING_MONTHLY_REPORT,
        pdfLabel: 'Open Bayside monthly report sample',
      },
    ],
  },
];

const FEATURES: FeatureHighlight[] = [
  {
    id: 'dashboard',
    icon: <FaTachometerAlt />,
    title: 'Live operational dashboard',
    text: 'After sign-in, each role lands on a dashboard scoped to their work — task totals, ticket status, and report activity in one view.',
    bullets: [
      'Role-filtered widgets for admin, staff, and client',
      'Quick links to faults, new reports, and messages',
      'Live counts from your organisation workspace',
    ],
    path: PUBLIC_ROUTE.MARKETING_DASHBOARD,
  },
  {
    id: 'sites',
    icon: <FaBuilding />,
    title: 'Job sites & directory',
    text: 'Register every property, link companies and services, and keep staff and customers attached to the right locations.',
    bullets: [
      'Portfolio registry with address and service assignments',
      'Companies, staff, and customers in one directory',
      'Staff only see sites they are assigned to',
    ],
    path: PUBLIC_ROUTE.MARKETING_JOB_SITES,
  },
  {
    id: 'tasks',
    icon: <FaClipboardList />,
    title: 'Schedules & field tasks',
    text: 'Plan recurring maintenance and track work from pending through to completed — across every site in the portfolio.',
    bullets: [
      'Pending, in progress, and completed boards',
      'Recurring schedule tasks for admins',
      'Field-ready task lists for staff',
    ],
    path: PUBLIC_ROUTE.MARKETING_TASKS,
  },
  {
    id: 'reports',
    icon: <FaExclamationTriangle />,
    title: 'Faults & structured reports',
    text: 'Capture faults and structured reports on site — with templates for audits, incidents, and day-to-day facility work.',
    bullets: [
      'Report faults and new reports from the field',
      'Templates drive consistent forms and history',
      'Full history for clients and administrators',
    ],
    path: PUBLIC_ROUTE.MARKETING_REPORTS,
  },
  {
    id: 'adhoc-reports',
    icon: <FaTools />,
    title: 'Adhoc reports',
    text: 'Staff document reactive / ad hoc maintenance using the Adhoc Report template and Reactive/Adhoc Maintenance Works service — including “Other” custom sites when the job is off the usual list.',
    bullets: [
      'Adhoc Report template linked to Reactive/Adhoc Maintenance Works',
      'Assigned job sites auto-fill client and service from the site assignment',
      'Other (custom site): enter name and address; client comes from the staff assignment',
      'Clients see completed adhoc reports under New reports for their sites',
    ],
    path: PUBLIC_ROUTE.MARKETING_REPORTS,
  },
  {
    id: 'inspections',
    icon: <FaClipboardCheck />,
    title: 'Inspections & compliance',
    text: 'Run structured inspections with configurable templates, then export PDF records clients and auditors can trust.',
    bullets: [
      'Audit and incident report workflows',
      'Report templates under master data',
      'PDF export for compliance packs',
    ],
    path: PUBLIC_ROUTE.MARKETING_INSPECTIONS,
  },
  {
    id: 'tickets',
    icon: <FaComments />,
    title: 'Tickets & messaging',
    text: 'Clients raise service requests; teams reply in-thread. Messages and tickets keep admins, staff, and clients aligned.',
    bullets: [
      'Helpdesk tickets: pending → in progress → completed',
      'Built-in messaging across roles',
      'Unread counts on the dashboard',
    ],
    path: PUBLIC_ROUTE.MARKETING_TICKETS,
  },
  {
    id: 'checkin',
    icon: <FaMapMarkerAlt />,
    title: 'Site check-in & attendance',
    text: 'Field staff check in at job sites. Admins track attendance, training, and induction from staff management.',
    bullets: [
      'Mobile-friendly site check-in',
      'Attendance records for crews',
      'Training and induction shortcuts',
    ],
    path: PUBLIC_ROUTE.MARKETING_SITE_CHECKIN,
  },
  {
    id: 'roles',
    icon: <FaUserShield />,
    title: 'Roles & secure workspaces',
    text: 'Administrators, staff, and clients each get a tailored workspace. Organisations stay isolated — no shared data between customers.',
    bullets: [
      'Admin: full directory and system tools',
      'Staff: assigned sites, tasks, and reports',
      'Client: tickets, faults, and service requests',
    ],
    path: PUBLIC_ROUTE.MARKETING_ROLES,
  },
];

const STEPS = [
  {
    title: 'Create your workspace',
    text: 'Your organisation gets a dedicated Service360 environment with secure member login.',
  },
  {
    title: 'Configure sites & services',
    text: 'Add properties, service types, schedules, and user roles to match how you operate.',
  },
  {
    title: 'Invite your team',
    text: 'Onboard admins, field staff, and client contacts — each with the right access.',
  },
  {
    title: 'Run day-to-day operations',
    text: 'Schedule work, log faults, message teams, and keep compliance records from anywhere.',
  },
];

function FeatureList({ features }: { features: FeatureHighlight[] }) {
  return (
    <div className="hiw-feature-list">
      {features.map((feature) => (
        <article key={feature.id} id={feature.id} className="hiw-feature">
          <div className="hiw-feature-copy">
            <div className="hiw-feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <ul>
              {feature.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <Link to={feature.path} className="hiw-feature-link">
              Learn more
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClientFeatureList() {
  return (
    <ul className="hiw-client-feature-list">
      {CLIENT_FEATURES.map((feature) => (
        <li key={feature.path} className="hiw-client-feature-item">
          <div className="hiw-client-feature-main">
            <span className="hiw-client-feature-icon" aria-hidden="true">
              {feature.icon}
            </span>
            <div>
              <h3>{feature.title}</h3>
              <p className="hiw-client-feature-text">{feature.text}</p>
            </div>
          </div>
          {feature.image ? (
            <figure className="hiw-client-feature-figure">
              <img src={feature.image} alt={feature.imageAlt || feature.title} />
            </figure>
          ) : null}
          {feature.bullets && feature.bullets.length > 0 ? (
            <ul className="hiw-client-feature-bullets">
              {feature.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {feature.children && feature.children.length > 0 ? (
            <ul className="hiw-client-feature-children">
              {feature.children.map((child) => (
                <li key={child.title}>
                  <strong>{child.title}</strong>
                  <span>{child.text}</span>
                  {child.pdfUrl ? (
                    child.pdfUrl.startsWith('http') ? (
                      <a
                        className="hiw-client-feature-pdf"
                        href={child.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {child.pdfLabel || 'View report sample'}
                      </a>
                    ) : (
                      <Link className="hiw-client-feature-pdf" to={child.pdfUrl}>
                        {child.pdfLabel || 'View report sample'}
                      </Link>
                    )
                  ) : null}
                  {child.image ? (
                    <figure
                      className={`hiw-client-feature-figure hiw-client-feature-figure--child${
                        child.pdfUrl ? ' hiw-client-feature-figure--has-pdf' : ''
                      }`}
                    >
                      <img src={child.image} alt={child.imageAlt || child.title} />
                      {child.pdfUrl ? (
                        <a
                          className="hiw-client-feature-pdf-hotspot"
                          href={child.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={child.pdfLabel || 'View report sample'}
                          aria-label={child.pdfLabel || 'View report sample'}
                        >
                          <span className="hiw-client-feature-pdf-hotspot-label">
                            {child.pdfLabel || 'View report sample'}
                          </span>
                        </a>
                      ) : null}
                    </figure>
                  ) : null}
                  {child.images && child.images.length > 0 ? (
                    <div className="hiw-client-feature-gallery" aria-label={`${child.title} media samples`}>
                      {child.images.map((img) => (
                        <figure key={img.src} className="hiw-client-feature-gallery-item">
                          <img src={img.src} alt={img.alt} />
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="hiw-page">
      <section className="hiw-hero">
        <div className="hiw-hero-bg" aria-hidden="true" />
        <div className="hiw-hero-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / Feature highlights
          </div>
          <p className="hiw-brand">Service360</p>
          <h1>App feature highlights</h1>
          <p className="hiw-hero-lead">
            Explore platform modules and the full client workspace.
          </p>
          <div className="hiw-hero-actions">
            <a href="#hiw-features" className="btn-primary hiw-btn">
              Platform features
            </a>
            <a href="#hiw-clients" className="hiw-btn-secondary">
              For clients
            </a>
          </div>
        </div>
      </section>

      <nav className="hiw-audience-nav" aria-label="How it works sections">
        <div className="hiw-audience-nav-inner">
          <a href="#hiw-features">Platform overview</a>
          <a href="#hiw-clients">For clients</a>
        </div>
      </nav>

      <section className="hiw-section hiw-steps-section">
        <div className="hiw-section-inner">
          <header className="hiw-section-header">
            <h2>Get started in four steps</h2>
            <p>Onboard once, then run maintenance, faults, and client requests from one workspace.</p>
          </header>
          <ol className="hiw-steps">
            {STEPS.map((step, index) => (
              <li className="hiw-step" key={step.title} style={{ animationDelay: `${index * 0.08}s` }}>
                <span className="hiw-step-num">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hiw-section hiw-features-section" id="hiw-features">
        <div className="hiw-section-inner">
          <header className="hiw-section-header">
            <h2>Platform feature highlights</h2>
            <p>Each item maps to a live Service360 module.</p>
          </header>
          <FeatureList features={FEATURES} />
        </div>
      </section>

      <section className="hiw-section hiw-clients-section" id="hiw-clients">
        <div className="hiw-section-inner">
          <header className="hiw-section-header">
            <p className="hiw-eyebrow">Client workspace</p>
            <h2>Client features</h2>
            <p>Everything in the live client sidebar after sign-in.</p>
            <a
              className="hiw-client-feature-pdf hiw-client-features-guide"
              href="/images/marketing/client-features-guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Client features PDF
            </a>
            <Link
              className="hiw-client-feature-pdf hiw-client-features-guide"
              to={PUBLIC_ROUTE.MARKETING_MONTHLY_REPORT}
            >
              View Bayside monthly report sample
            </Link>
          </header>
          <ClientFeatureList />
        </div>
      </section>

      <section className="hiw-section hiw-cta-section">
        <div className="hiw-cta">
          <h2>Ready to see Service360 in your organisation?</h2>
          <p>Talk to us about onboarding clients, or explore the full feature list.</p>
          <div className="hiw-hero-actions">
            <Link to={PUBLIC_ROUTE.MARKETING_CONTACT} className="btn-primary hiw-btn">
              Contact us
            </Link>
            <Link to={PUBLIC_ROUTE.SIGN_IN} className="hiw-btn-secondary hiw-btn-secondary--on-dark">
              Client sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
