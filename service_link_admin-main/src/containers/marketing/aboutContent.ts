import { PUBLIC_ROUTE } from '@app/route.constants';
import type { PageSection } from './siteData';
import { LEGAL_OPERATOR, LEGAL_PRODUCT, LEGAL_WEBSITE } from './legalContent';

export const ABOUT_SECTIONS: PageSection[] = [
  {
    type: 'paragraph',
    text: `${LEGAL_PRODUCT} is a cloud facility management platform operated by ${LEGAL_OPERATOR}. We help property teams, facilities contractors, and organisations run day-to-day operations from one secure workspace — without spreadsheets, disconnected tools, or shared data between customers.`,
  },
  { type: 'heading', text: 'What we do' },
  {
    type: 'paragraph',
    text: 'Service360 brings together the work facility and property teams do every day: managing job sites, scheduling tasks, raising and resolving tickets, logging faults and inspections, coordinating field staff, and keeping a clear audit trail — all accessible through a single sign-in.',
  },
  { type: 'heading', text: 'Who Service360 is for' },
  {
    type: 'list',
    items: [
      'Local government and public estates managing scheduled maintenance and compliance reporting.',
      'Commercial property teams coordinating multi-site portfolios and tenant service requests.',
      'Facilities contractors running field staff, site check-in, attendance, and client reporting.',
      'Corporate estates tracking assets, PPE, and operational performance across locations.',
    ],
  },
  { type: 'heading', text: 'Built for how you actually work' },
  {
    type: 'list',
    items: [
      'Dedicated workspace per organisation — your data is never mixed with another customer\'s.',
      'Three role types — administrators, staff, and clients each see navigation and dashboards tailored to their responsibilities.',
      'Directory at the core — companies, services, staff, customers, and job sites linked in one place.',
      'Tasks and schedules — pending, in-progress, and completed work with recurring maintenance planning.',
      'Tickets and messaging — helpdesk requests and conversations between admins, staff, and clients.',
      'Reports and compliance — faults, audits, incidents, action plans, and PPE records with export support.',
      'Field operations — site check-in, staff attendance, training, and induction for mobile teams.',
    ],
  },
  { type: 'heading', text: 'Our approach' },
  {
    type: 'paragraph',
    text: 'We believe facility management software should be straightforward for field teams and powerful for administrators. Service360 is designed around real workflows — not generic project management — so every module maps to a screen in the live application, from the dashboard through to report templates and system settings.',
  },
  {
    type: 'paragraph',
    text: 'Security and separation are built in: member login with password recovery, role-based permissions, and workspace isolation for every organisation on the platform.',
  },
  { type: 'heading', text: 'Learn more' },
  {
    type: 'info',
    title: 'Explore the platform',
    text: 'module-links',
    links: [
      { path: PUBLIC_ROUTE.MARKETING_FEATURES, label: 'Features' },
      { path: PUBLIC_ROUTE.MARKETING_HOW_IT_WORKS, label: 'How it works' },
    ],
  },
  {
    type: 'info',
    title: 'Get in touch',
    text: 'legal-contact-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }],
  },
  {
    type: 'paragraph',
    text: `Visit us at ${LEGAL_WEBSITE.replace('https://', '')} or sign in to access your organisation's workspace.`,
  },
];
