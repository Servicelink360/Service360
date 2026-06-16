import { PUBLIC_ROUTE } from '@app/route.constants';
import {
  ACCEPTABLE_USE_SECTIONS,
  COOKIES_SECTIONS,
  GDPR_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from './legalContent';
import { ABOUT_SECTIONS } from './aboutContent';

export type NavItem = { path: string; label: string; key: string };
export type FooterLink = { path: string; label: string };
export type FooterSection = { title: string; links: FooterLink[] };

export type PageSection =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string; emphasis?: boolean }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; steps: { title: string; text: string }[] }
  | { type: 'info'; title: string; text: string; links?: { path: string; label: string }[] };

export type MarketingPage = {
  slug: string;
  path: string;
  title: string;
  navKey?: string;
  hero: string;
  lead: string;
  sections: PageSection[];
};

export const NAV_ITEMS: NavItem[] = [
  { path: PUBLIC_ROUTE.MARKETING_PLATFORM, label: 'Platform', key: 'platform' },
  { path: PUBLIC_ROUTE.MARKETING_FEATURES, label: 'Features', key: 'features' },
  { path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS, label: 'How it works', key: 'how-it-works' },
  { path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact', key: 'contact' },
];

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { path: PUBLIC_ROUTE.MARKETING_PLATFORM, label: 'Platform' },
      { path: PUBLIC_ROUTE.MARKETING_FEATURES, label: 'Features' },
      { path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS, label: 'How it works' },
    ],
  },
  {
    title: 'Company',
    links: [
      { path: PUBLIC_ROUTE.MARKETING_ABOUT, label: 'About Service360' },
      { path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' },
      { path: PUBLIC_ROUTE.MARKETING_SUPPORT, label: 'Support' },
      { path: PUBLIC_ROUTE.MARKETING_HOW_TO, label: 'How to' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { path: PUBLIC_ROUTE.MARKETING_PRIVACY, label: 'Privacy' },
      { path: PUBLIC_ROUTE.MARKETING_TERMS, label: 'Terms' },
      { path: PUBLIC_ROUTE.MARKETING_GDPR, label: 'GDPR' },
      { path: PUBLIC_ROUTE.MARKETING_COOKIES, label: 'Cookies' },
      { path: PUBLIC_ROUTE.MARKETING_ACCEPTABLE_USE, label: 'Acceptable use' },
    ],
  },
];

export type HomeFeature = { icon: string; title: string; text: string; path: string };

export const HOME_FEATURES: HomeFeature[] = [
  { icon: 'building', title: 'Job sites & portfolios', path: PUBLIC_ROUTE.MARKETING_JOB_SITES, text: 'Register properties, assign services, and keep every location documented in the directory — companies, staff, customers, and sites.' },
  { icon: 'clipboard-list', title: 'Schedules & tasks', path: PUBLIC_ROUTE.MARKETING_TASKS, text: 'Plan recurring maintenance, track pending and in‑progress work, schedule tasks, and coordinate field teams from the task board.' },
  { icon: 'exclamation-triangle', title: 'Faults & reporting', path: PUBLIC_ROUTE.MARKETING_REPORTS, text: 'Log issues with report faults, new reports, incident reports, action plans, and PPE plans — with full audit history.' },
  { icon: 'clipboard-check', title: 'Inspections & compliance', path: PUBLIC_ROUTE.MARKETING_INSPECTIONS, text: 'Capture structured audit reports, export PDFs, and maintain records your clients can trust.' },
  { icon: 'comments', title: 'Messages & tickets', path: PUBLIC_ROUTE.MARKETING_TICKETS, text: 'Keep admins, clients, and field staff aligned with built‑in messaging and helpdesk tickets — pending, in progress, and completed.' },
  { icon: 'user-shield', title: 'Roles & permissions', path: PUBLIC_ROUTE.MARKETING_ROLES, text: 'Separate access for administrators, staff, and clients — each with tailored navigation, dashboards, and permissions.' },
];

export type HomeAudience = { icon: string; title: string; text: string; path: string };

export const HOME_AUDIENCES: HomeAudience[] = [
  { icon: 'landmark', title: 'Local government', path: PUBLIC_ROUTE.MARKETING_LOCAL_GOVERNMENT, text: 'Public estates, scheduled maintenance, and compliance reporting' },
  { icon: 'city', title: 'Commercial property', path: PUBLIC_ROUTE.MARKETING_COMMERCIAL_PROPERTY, text: 'Multi‑site portfolios, tenant tickets, and service coordination' },
  { icon: 'hard-hat', title: 'Facilities contractors', path: PUBLIC_ROUTE.MARKETING_FACILITIES_CONTRACTORS, text: 'Field staff, site check‑in, attendance, training, and induction' },
  { icon: 'building', title: 'Corporate estates', path: PUBLIC_ROUTE.MARKETING_CORPORATE_ESTATES, text: 'Asset tracking, PPE management, and operational dashboards' },
];

export const MARKETING_PAGES: MarketingPage[] = [
  {
    slug: 'platform',
    path: PUBLIC_ROUTE.MARKETING_PLATFORM,
    title: 'Facility Management Platform — Service360',
    navKey: 'platform',
    hero: 'The Service360 platform',
    lead: 'A cloud facility management system for property teams, contractors, and organisations — with dedicated workspaces, role-based access, and every module connected.',
    sections: [
      { type: 'heading', text: 'What the platform includes' },
      { type: 'paragraph', text: 'Service360 brings together the tools facility teams use every day: directory management, scheduled tasks, fault reporting, tickets, messaging, assets, and compliance records.' },
      { type: 'list', items: ['Dedicated workspace per organisation', 'Admin, staff, and client role experiences', 'Dashboard with live counts for tasks, tickets, and reports', 'Secure member login with forgot password support'] },
      { type: 'info', title: 'Explore modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_FEATURES, label: 'Features' }, { path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS, label: 'How it works' }] },
    ],
  },
  {
    slug: 'features',
    path: PUBLIC_ROUTE.MARKETING_FEATURES,
    title: 'Facility Management Features — Service360',
    navKey: 'features',
    hero: 'Platform features',
    lead: 'Every module in Service360 maps to real screens in the live application — from job sites and tasks to reports, tickets, and staff management.',
    sections: [
      { type: 'heading', text: 'Core modules' },
      { type: 'list', items: ['Dashboard — task totals, ticket status, and report counts filtered by role', 'Directory — companies, services, staff, customers, and job sites', 'Tasks — pending, in progress, completed, and scheduled tasks', 'Tickets — helpdesk requests with pending, in progress, and completed states', 'Reports — new reports, report faults, audit, incident, action plans, and PPE plans', 'Messages — conversations between admins, staff, and clients', 'Assets & PPE — asset registry and PPE management', 'Staff management — attendance, training, and induction', 'System — admins, roles, report templates, and settings'] },
    ],
  },
  {
    slug: 'how-it-works',
    path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS,
    title: 'How it works — Service360',
    navKey: 'how-it-works',
    hero: 'How it works',
    lead: 'Onboard your organisation, configure your services, and invite your team. Service360 scales with your operations.',
    sections: [
      { type: 'steps', steps: [{ title: 'Create your workspace', text: 'Your organisation gets a dedicated environment on the Service360 platform.' }, { title: 'Configure sites & services', text: 'Set up properties, maintenance types, schedules, and user roles to match your operations.' }, { title: 'Run day-to-day operations', text: 'Teams sign in to manage work, report faults, and communicate — from anywhere.' }] },
      { type: 'heading', text: 'After login' },
      { type: 'paragraph', text: 'Users are redirected to the dashboard. Navigation adapts automatically: administrators see the full directory and system tools; staff see site check-in and field tasks; clients see tickets and service requests.' },
    ],
  },
  {
    slug: 'contact',
    path: PUBLIC_ROUTE.MARKETING_CONTACT,
    title: 'Contact — Service360',
    navKey: 'contact',
    hero: 'Contact us',
    lead: 'Talk to us about bringing Service360 to your organisation or get help with your existing workspace.',
    sections: [{ type: 'paragraph', text: 'contact-form' }],
  },
  {
    slug: 'dashboard',
    path: PUBLIC_ROUTE.MARKETING_DASHBOARD,
    title: 'Dashboard — Service360',
    hero: 'Dashboard',
    lead: 'Your operational overview after sign-in — task counts, ticket status, and report badges filtered for your role.',
    sections: [
      { type: 'heading', text: 'What you see' },
      { type: 'list', items: ['Total task counts for admins and clients', 'Ticket status widget with new ticket badges', 'Quick links to report faults, new reports, and messages', 'Staff dashboard shows training and induction shortcuts'] },
      { type: 'paragraph', text: 'Data is loaded from the live /v1/common/dashboardData endpoint and scoped to the authenticated user.' },
    ],
  },
  {
    slug: 'tasks-schedules',
    path: PUBLIC_ROUTE.MARKETING_TASKS,
    title: 'Tasks & Schedules — Service360',
    hero: 'Tasks & schedules',
    lead: 'Plan recurring maintenance, track field work, and manage scheduled tasks across your sites.',
    sections: [
      { type: 'heading', text: 'Task board' },
      { type: 'list', items: ['Pending — work waiting to be started', 'In progress — active jobs in the field', 'Completed — closed tasks with history', 'Schedule tasks — recurring maintenance plans (admin)'] },
    ],
  },
  {
    slug: 'tickets-messages',
    path: PUBLIC_ROUTE.MARKETING_TICKETS,
    title: 'Tickets & Messages — Service360',
    hero: 'Tickets & messages',
    lead: 'Helpdesk tickets and built-in messaging keep admins, clients, and field staff aligned.',
    sections: [
      { type: 'heading', text: 'Tickets' },
      { type: 'paragraph', text: 'Clients raise service requests; admins and staff manage them through pending, in progress, and completed states.' },
      { type: 'heading', text: 'Messages' },
      { type: 'paragraph', text: 'Unread message counts appear on the dashboard. All roles — admin, staff, and client — can access the messages module.' },
    ],
  },
  {
    slug: 'reports-faults',
    path: PUBLIC_ROUTE.MARKETING_REPORTS,
    title: 'Reports & Faults — Service360',
    hero: 'Reports & faults',
    lead: 'Structured reporting for faults, audits, incidents, action plans, and PPE — with PDF export and audit history.',
    sections: [
      { type: 'heading', text: 'Report types' },
      { type: 'list', items: ['New reports', 'Report faults', 'Audit report', 'Incident report', 'Action plans', 'PPE plans'] },
      { type: 'paragraph', text: 'Staff and admins can create and manage reports; clients can submit faults and audit reports from their navigation.' },
    ],
  },
  {
    slug: 'companies-services',
    path: PUBLIC_ROUTE.MARKETING_COMPANIES,
    title: 'Companies & Services — Service360',
    hero: 'Companies & services',
    lead: 'Manage the organisations and service types that power your facility operations.',
    sections: [{ type: 'paragraph', text: 'The directory module lets administrators register companies, define services, and link them to job sites and staff assignments.' }],
  },
  {
    slug: 'staff-customers',
    path: PUBLIC_ROUTE.MARKETING_STAFF,
    title: 'Staff & Customers — Service360',
    hero: 'Staff & customers',
    lead: 'Onboard field teams and client contacts with role-based access to the platform.',
    sections: [
      { type: 'heading', text: 'User types' },
      { type: 'list', items: ['Staff — field workers with site check-in, tasks, and reports', 'Customers (clients) — ticket and report access for property teams', 'Admins — full directory and system management'] },
    ],
  },
  {
    slug: 'job-sites',
    path: PUBLIC_ROUTE.MARKETING_JOB_SITES,
    title: 'Job Sites & Portfolios — Service360',
    hero: 'Job sites & portfolios',
    lead: 'Register properties, assign services, and keep every location documented in the directory — companies, staff, customers, and sites.',
    sections: [
      { type: 'heading', text: 'Directory at the centre' },
      { type: 'paragraph', text: 'Job sites are central to Service360. Each property is linked to the companies, services, staff, and customers that operate there — giving admins a single view of every portfolio.', emphasis: true },
      { type: 'list', items: ['Register job sites with address, services, and assigned staff', 'Link companies and service types to each location', 'Staff see only their assigned sites; admins manage the full registry', 'Clients access sites relevant to their organisation'] },
      { type: 'info', title: 'Related modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_COMPANIES, label: 'Companies & services' }, { path: PUBLIC_ROUTE.MARKETING_STAFF, label: 'Staff & customers' }] },
    ],
  },
  {
    slug: 'inspections-compliance',
    path: PUBLIC_ROUTE.MARKETING_INSPECTIONS,
    title: 'Inspections & Compliance — Service360',
    hero: 'Inspections & compliance',
    lead: 'Capture structured audit reports, export PDFs, and maintain compliance records your clients can trust.',
    sections: [
      { type: 'heading', text: 'Audit & compliance reporting' },
      { type: 'paragraph', text: 'Service360 supports structured inspections through audit reports, incident documentation, and configurable report templates — all with exportable PDF records.' },
      { type: 'list', items: ['Audit reports — structured inspections with sign-off and history', 'Incident reports — document events with full audit trail', 'Report templates — consistent forms managed under Master data', 'PDF export — shareable records for clients and regulators', 'PPE plans — safety and compliance documentation'] },
      { type: 'info', title: 'See also', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_REPORTS, label: 'Reports & faults' }, { path: PUBLIC_ROUTE.MARKETING_TEMPLATES, label: 'Report templates' }] },
    ],
  },
  {
    slug: 'roles-permissions',
    path: PUBLIC_ROUTE.MARKETING_ROLES,
    title: 'Roles & Permissions — Service360',
    hero: 'Roles & permissions',
    lead: 'Separate access for administrators, staff, and clients — each with tailored navigation, dashboards, and permissions.',
    sections: [
      { type: 'heading', text: 'Three roles, one platform' },
      { type: 'paragraph', text: 'After sign-in, each user sees a workspace scoped to their role. Navigation, dashboard widgets, and module access adapt automatically — no manual configuration per screen.' },
      { type: 'list', items: ['Administrator — full directory, tasks, tickets, reports, assets, staff management, and system settings', 'Staff — site check-in, assigned job sites, field tasks, and reports', 'Client — tickets, service requests, faults, and audit reports from their dashboard'] },
      { type: 'paragraph', text: 'Organisation admins manage user accounts and roles from the system module. Each workspace is isolated — no shared data between organisations.' },
      { type: 'info', title: 'Learn more', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_PLATFORM, label: 'Platform overview' }, { path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS, label: 'How it works' }] },
    ],
  },
  {
    slug: 'local-government',
    path: PUBLIC_ROUTE.MARKETING_LOCAL_GOVERNMENT,
    title: 'Local Government — Service360',
    hero: 'Local government',
    lead: 'Public estates, scheduled maintenance, and compliance reporting — managed from one secure workspace.',
    sections: [
      { type: 'heading', text: 'Built for councils and public sector estates' },
      { type: 'paragraph', text: 'Local government teams manage diverse property portfolios — civic buildings, parks, depots, and community facilities. Service360 keeps every site documented, maintenance scheduled, and compliance records audit-ready.' },
      { type: 'list', items: ['Register public estates and job sites across your portfolio', 'Schedule recurring maintenance and track work through the task board', 'Capture audit reports and export PDFs for compliance reviews', 'Separate workspaces per organisation with role-based access'] },
      { type: 'info', title: 'Related modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_JOB_SITES, label: 'Job sites & portfolios' }, { path: PUBLIC_ROUTE.MARKETING_TASKS, label: 'Tasks & schedules' }, { path: PUBLIC_ROUTE.MARKETING_INSPECTIONS, label: 'Inspections & compliance' }] },
    ],
  },
  {
    slug: 'commercial-property',
    path: PUBLIC_ROUTE.MARKETING_COMMERCIAL_PROPERTY,
    title: 'Commercial Property — Service360',
    hero: 'Commercial property',
    lead: 'Multi‑site portfolios, tenant tickets, and service coordination for property managers and landlords.',
    sections: [
      { type: 'heading', text: 'Portfolio operations at scale' },
      { type: 'paragraph', text: 'Commercial property teams coordinate maintenance across many buildings and tenants. Service360 links job sites, service providers, and client contacts so requests are tracked from ticket to completion.' },
      { type: 'list', items: ['Manage multi‑site portfolios from the directory', 'Clients raise tickets and track service requests from their dashboard', 'Coordinate contractors and internal teams via messages and tasks', 'Report faults and incidents with full audit history per property'] },
      { type: 'info', title: 'Related modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_JOB_SITES, label: 'Job sites & portfolios' }, { path: PUBLIC_ROUTE.MARKETING_TICKETS, label: 'Tickets & messages' }, { path: PUBLIC_ROUTE.MARKETING_REPORTS, label: 'Reports & faults' }] },
    ],
  },
  {
    slug: 'facilities-contractors',
    path: PUBLIC_ROUTE.MARKETING_FACILITIES_CONTRACTORS,
    title: 'Facilities Contractors — Service360',
    hero: 'Facilities contractors',
    lead: 'Field staff, site check‑in, attendance, training, and induction — everything your crews need in the field.',
    sections: [
      { type: 'heading', text: 'Built for field teams' },
      { type: 'paragraph', text: 'Contractors dispatch staff to client sites daily. Service360 gives field workers mobile-friendly access to assigned job sites, check-in, tasks, and reports — while admins monitor attendance and training from the office.' },
      { type: 'list', items: ['Site check‑in confirms staff location at each job site', 'Staff see assigned sites, pending tasks, and field reports', 'Attendance, training, and induction managed under staff management', 'Admins coordinate schedules and recurring maintenance across clients'] },
      { type: 'info', title: 'Related modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_SITE_CHECKIN, label: 'Site check-in' }, { path: PUBLIC_ROUTE.MARKETING_ATTENDANCE, label: 'Staff attendance' }, { path: PUBLIC_ROUTE.MARKETING_TRAINING, label: 'Training & induction' }] },
    ],
  },
  {
    slug: 'corporate-estates',
    path: PUBLIC_ROUTE.MARKETING_CORPORATE_ESTATES,
    title: 'Corporate Estates — Service360',
    hero: 'Corporate estates',
    lead: 'Asset tracking, PPE management, and operational dashboards for in-house facilities teams.',
    sections: [
      { type: 'heading', text: 'Centralised estate operations' },
      { type: 'paragraph', text: 'Corporate facilities teams run campuses, offices, and data centres from a single platform. Service360 combines asset registers, PPE compliance, and live dashboard metrics so estate managers see the full picture.' },
      { type: 'list', items: ['Asset registry and lifecycle tracking across all sites', 'PPE plans and safety compliance documentation', 'Dashboard with task totals, ticket status, and report counts', 'Directory links companies, staff, and services to each location'] },
      { type: 'info', title: 'Related modules', text: 'module-links', links: [{ path: PUBLIC_ROUTE.MARKETING_ASSETS, label: 'Assets & PPE' }, { path: PUBLIC_ROUTE.MARKETING_DASHBOARD, label: 'Dashboard' }, { path: PUBLIC_ROUTE.MARKETING_JOB_SITES, label: 'Job sites & portfolios' }] },
    ],
  },
  {
    slug: 'assets-ppe',
    path: PUBLIC_ROUTE.MARKETING_ASSETS,
    title: 'Assets & PPE — Service360',
    hero: 'Assets & PPE',
    lead: 'Track facility assets and manage PPE records from dedicated admin modules.',
    sections: [{ type: 'list', items: ['Assets — asset registry and lifecycle tracking', 'Manage PPE — PPE plans and compliance records'] }],
  },
  {
    slug: 'site-check-in',
    path: PUBLIC_ROUTE.MARKETING_SITE_CHECKIN,
    title: 'Site Check-in — Service360',
    hero: 'Site check-in',
    lead: 'Field staff check in at job sites to confirm attendance and location for scheduled work.',
    sections: [{ type: 'paragraph', text: 'Available in the staff navigation. Supports day-to-day field operations and attendance verification.' }],
  },
  {
    slug: 'staff-attendance',
    path: PUBLIC_ROUTE.MARKETING_ATTENDANCE,
    title: 'Staff Attendance — Service360',
    hero: 'Staff attendance',
    lead: 'Monitor and manage staff attendance records from the staff management module.',
    sections: [{ type: 'paragraph', text: 'Administrators access staff attendance under Staff management alongside training and induction tools.', emphasis: true }],
  },
  {
    slug: 'training-induction',
    path: PUBLIC_ROUTE.MARKETING_TRAINING,
    title: 'Training & Induction — Service360',
    hero: 'Training & induction',
    lead: 'Onboard field staff with training materials and induction workflows.',
    sections: [{ type: 'paragraph', text: 'Staff see training and induction shortcuts on their dashboard. Admins manage programmes from staff management.' }],
  },
  {
    slug: 'report-templates',
    path: PUBLIC_ROUTE.MARKETING_TEMPLATES,
    title: 'Report Templates — Service360',
    hero: 'Report templates',
    lead: 'Configure structured report templates used across audit, incident, and compliance workflows.',
    sections: [{ type: 'paragraph', text: 'Managed under Master data in the admin navigation. Templates drive consistent reporting across your organisation.', emphasis: true }],
  },
  {
    slug: 'about',
    path: PUBLIC_ROUTE.MARKETING_ABOUT,
    title: 'About Service360',
    hero: 'About Service360',
    lead: 'Your partner in facilities — a cloud platform for property teams, contractors, and organisations.',
    sections: ABOUT_SECTIONS,
  },
  {
    slug: 'how-to',
    path: PUBLIC_ROUTE.MARKETING_HOW_TO,
    title: 'How to — Service360',
    hero: 'How to',
    lead: 'In-app guidance for using Service360 modules — available to signed-in users from the sidebar.',
    sections: [
      { type: 'paragraph', text: 'The live application includes a How to section in the admin navigation with step-by-step help for common tasks.', emphasis: true },
      { type: 'paragraph', text: 'Sign in to your workspace to access the full guide.' },
    ],
  },
  {
    slug: 'support',
    path: PUBLIC_ROUTE.MARKETING_SUPPORT,
    title: 'Support — Service360',
    hero: 'Support',
    lead: 'Get help with your Service360 workspace, user access, or platform configuration.',
    sections: [{ type: 'info', title: 'Need help?', text: 'contact-link', links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }] }],
  },
  {
    slug: 'privacy',
    path: PUBLIC_ROUTE.MARKETING_PRIVACY,
    title: 'Privacy Policy — Service360',
    hero: 'Privacy policy',
    lead: "How Service360 collects, uses, and protects personal information.",
    sections: PRIVACY_SECTIONS,
  },
  {
    slug: 'terms',
    path: PUBLIC_ROUTE.MARKETING_TERMS,
    title: 'Terms of Service — Service360',
    hero: 'Terms of service',
    lead: 'Terms governing access to and use of the Service360 platform.',
    sections: TERMS_SECTIONS,
  },
  {
    slug: 'gdpr',
    path: PUBLIC_ROUTE.MARKETING_GDPR,
    title: 'GDPR — Service360',
    hero: 'GDPR information',
    lead: 'Data protection information for users in the EEA, UK, and Switzerland.',
    sections: GDPR_SECTIONS,
  },
  {
    slug: 'cookies',
    path: PUBLIC_ROUTE.MARKETING_COOKIES,
    title: 'Cookie Policy — Service360',
    hero: 'Cookie policy',
    lead: 'How Service360 uses cookies and similar technologies.',
    sections: COOKIES_SECTIONS,
  },
  {
    slug: 'acceptable-use',
    path: PUBLIC_ROUTE.MARKETING_ACCEPTABLE_USE,
    title: 'Acceptable Use Policy — Service360',
    hero: 'Acceptable use policy',
    lead: 'Rules for lawful and responsible use of the Service360 platform.',
    sections: ACCEPTABLE_USE_SECTIONS,
  },
];

export const MARKETING_PATHS = [
  PUBLIC_ROUTE.LANDING,
  ...MARKETING_PAGES.map((p) => p.path),
];

export function getPageByPath(pathname: string): MarketingPage | undefined {
  return MARKETING_PAGES.find((p) => p.path === pathname);
}
