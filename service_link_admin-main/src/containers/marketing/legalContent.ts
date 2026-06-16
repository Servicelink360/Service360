import { PUBLIC_ROUTE } from '@app/route.constants';
import type { PageSection } from './siteData';

export const LEGAL_EFFECTIVE_DATE = '16 June 2026';
export const LEGAL_OPERATOR = 'SERVICELINK';
export const LEGAL_PRODUCT = 'Service360';
export const LEGAL_WEBSITE = 'https://service360.com.au';
export const LEGAL_JURISDICTION = 'New South Wales, Australia';

const meta = (summary: string): PageSection[] => [
  { type: 'paragraph', text: `Last updated: ${LEGAL_EFFECTIVE_DATE}` },
  { type: 'paragraph', text: summary },
];

export const PRIVACY_SECTIONS: PageSection[] = [
  ...meta(
    `${LEGAL_PRODUCT} is operated by ${LEGAL_OPERATOR}. This Privacy Policy explains how we collect, use, disclose, and protect personal information when you use our facility management platform, website, and related services.`,
  ),
  { type: 'heading', text: '1. Who we are' },
  {
    type: 'paragraph',
    text: `${LEGAL_OPERATOR} ("we", "us", "our") provides ${LEGAL_PRODUCT}, a cloud-based facility and property management platform. Our website is ${LEGAL_WEBSITE}. We act as a service provider to organisations that subscribe to the platform. Each subscribing organisation receives a dedicated workspace; data entered by one organisation is not shared with other organisations on the platform.`,
  },
  { type: 'heading', text: '2. Scope of this policy' },
  {
    type: 'paragraph',
    text: 'This policy applies to visitors to our website, authorised users who sign in to the platform (administrators, staff, and clients), and individuals whose information is processed through the platform on behalf of our customers. Where we process personal information on behalf of a customer organisation, that organisation is responsible for ensuring it has a lawful basis to provide the information to us; we process it according to our agreement with them and this policy.',
  },
  { type: 'heading', text: '3. Information we collect' },
  { type: 'paragraph', text: 'We may collect the following categories of information:' },
  {
    type: 'list',
    items: [
      'Account and identity data — name, email address, username, role (administrator, staff, or client), organisation affiliation, and authentication credentials.',
      'Profile and directory data — job title, contact details, photos, company and site assignments, and other fields your organisation chooses to store.',
      'Operational data — tasks, schedules, tickets, messages, reports, faults, inspections, attendance, site check-ins, assets, PPE records, and attachments you upload in the course of using the platform.',
      'Technical and usage data — IP address, browser type, device information, log files, session identifiers, access tokens, and actions taken within the application for security, audit, and service improvement.',
      'Communications — enquiries submitted through our contact forms or support channels.',
    ],
  },
  { type: 'heading', text: '4. How we use information' },
  { type: 'paragraph', text: 'We use personal information to:' },
  {
    type: 'list',
    items: [
      'Provide, operate, maintain, and secure the platform.',
      'Authenticate users and enforce role-based access controls.',
      'Process password reset and account recovery requests.',
      'Generate dashboards, reports, and notifications relevant to your role.',
      'Respond to support requests and improve our services.',
      'Comply with legal obligations and protect our rights, users, and the public.',
      'Detect, prevent, and address fraud, abuse, or security incidents.',
    ],
  },
  { type: 'heading', text: '5. Legal bases for processing (EEA/UK users)' },
  {
    type: 'paragraph',
    text: 'Where the General Data Protection Regulation (GDPR) or UK GDPR applies, we rely on: (a) performance of a contract — to provide the platform to you or your organisation; (b) legitimate interests — security, fraud prevention, service improvement, and internal administration, balanced against your rights; (c) consent — where required for optional communications or cookies; and (d) legal obligation — where we must retain or disclose information by law. See our GDPR page for additional detail.',
  },
  { type: 'heading', text: '6. Disclosure of information' },
  { type: 'paragraph', text: 'We do not sell personal information. We may disclose information to:' },
  {
    type: 'list',
    items: [
      'Your organisation — administrators within your workspace can access data according to their permissions.',
      'Service providers — hosting, email, monitoring, and infrastructure partners who process data on our instructions under confidentiality and security obligations.',
      'Professional advisers — lawyers, auditors, or insurers where reasonably necessary.',
      'Authorities — courts, regulators, or law enforcement when required by law or to protect rights and safety.',
      'Business transfers — in connection with a merger, acquisition, or sale of assets, subject to equivalent protections.',
    ],
  },
  { type: 'heading', text: '7. Storage, security, and retention' },
  {
    type: 'paragraph',
    text: 'Data is stored on secure cloud infrastructure. We use access controls, encryption in transit, authentication tokens, and organisational separation between customer workspaces. No method of transmission or storage is completely secure; we continuously review our safeguards. We retain personal information for as long as your organisation’s subscription is active and as needed to provide the service, resolve disputes, meet legal requirements, or enforce agreements. Your organisation may export or request deletion of data subject to administrator controls and applicable law.',
  },
  { type: 'heading', text: '8. International transfers' },
  {
    type: 'paragraph',
    text: 'We are based in Australia. If you access the platform from outside Australia, your information may be processed in Australia or in other countries where our service providers operate. Where required, we implement appropriate safeguards for cross-border transfers, such as standard contractual clauses or equivalent mechanisms.',
  },
  { type: 'heading', text: '9. Your rights' },
  { type: 'paragraph', text: 'Depending on your location, you may have rights to:' },
  {
    type: 'list',
    items: [
      'Access and receive a copy of personal information we hold about you.',
      'Correct inaccurate or incomplete information.',
      'Request deletion, subject to legal and contractual limits.',
      'Object to or restrict certain processing.',
      'Withdraw consent where processing is consent-based.',
      'Lodge a complaint with a supervisory authority (EEA/UK) or the Office of the Australian Information Commissioner (OAIC) in Australia.',
    ],
  },
  {
    type: 'paragraph',
    text: 'Platform users should contact their organisation’s administrator first for workspace data. For requests directed to us, use the Contact page or your organisation’s account representative.',
  },
  { type: 'heading', text: '10. Cookies and similar technologies' },
  {
    type: 'paragraph',
    text: 'We use cookies and similar technologies for essential sign-in sessions, security, and preferences. For details, see our Cookie Policy.',
  },
  {
    type: 'info',
    title: 'Cookie Policy',
    text: 'cookie-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_COOKIES, label: 'Cookie policy' }],
  },
  { type: 'heading', text: '11. Children' },
  {
    type: 'paragraph',
    text: 'The platform is intended for use by organisations and authorised adults in a business context. It is not directed at children under 16. We do not knowingly collect personal information from children.',
  },
  { type: 'heading', text: '12. Changes to this policy' },
  {
    type: 'paragraph',
    text: 'We may update this Privacy Policy from time to time. We will post the revised version on this page and update the “Last updated” date. Material changes may be communicated through the platform or by email where appropriate.',
  },
  { type: 'heading', text: '13. Contact us' },
  {
    type: 'info',
    title: 'Privacy enquiries',
    text: 'legal-contact-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }],
  },
];

export const TERMS_SECTIONS: PageSection[] = [
  ...meta(
    `These Terms of Service ("Terms") govern access to and use of ${LEGAL_PRODUCT}, operated by ${LEGAL_OPERATOR}. By accessing or using the platform, you agree to these Terms.`,
  ),
  { type: 'heading', text: '1. The service' },
  {
    type: 'paragraph',
    text: `${LEGAL_PRODUCT} is a cloud facility management platform that enables organisations to manage sites, tasks, schedules, tickets, messaging, reports, assets, staff operations, and related workflows. Features available to you depend on your role (administrator, staff, or client) and your organisation’s configuration.`,
  },
  { type: 'heading', text: '2. Eligibility and accounts' },
  {
    type: 'list',
    items: [
      'Access is provided only to authorised users invited or registered by a subscribing organisation.',
      'You must provide accurate account information and keep your login credentials confidential.',
      'You are responsible for all activity under your account.',
      'You must notify your administrator immediately if you suspect unauthorised access.',
      'We may suspend or terminate access for breach of these Terms or to protect the service.',
    ],
  },
  { type: 'heading', text: '3. Organisation responsibilities' },
  {
    type: 'paragraph',
    text: 'Each subscribing organisation is responsible for: configuring user roles and permissions; ensuring users comply with these Terms and applicable law; obtaining any consents required to upload personal or operational data; and the accuracy of data entered into its workspace.',
  },
  { type: 'heading', text: '4. Acceptable use' },
  {
    type: 'paragraph',
    text: 'You must not misuse the platform. Prohibited conduct includes unauthorised access, interference with security, uploading malware, harassment, unlawful content, reverse engineering except as permitted by law, scraping or automated access without permission, and use that infringes third-party rights. See our Acceptable Use Policy for further detail.',
  },
  {
    type: 'info',
    title: 'Acceptable Use Policy',
    text: 'aup-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_ACCEPTABLE_USE, label: 'Acceptable use policy' }],
  },
  { type: 'heading', text: '5. Customer data' },
  {
    type: 'paragraph',
    text: 'Your organisation retains ownership of data it submits to the platform. You grant us a limited licence to host, process, transmit, and display that data solely to provide and improve the service, comply with law, and as described in our Privacy Policy. We do not use customer operational data to train public AI models or sell it to third parties.',
  },
  { type: 'heading', text: '6. Intellectual property' },
  {
    type: 'paragraph',
    text: `${LEGAL_OPERATOR} and its licensors own all rights in the platform, software, branding, documentation, and underlying technology. These Terms do not grant you any ownership rights. You may not copy, modify, distribute, or create derivative works except as expressly permitted.`,
  },
  { type: 'heading', text: '7. Availability and support' },
  {
    type: 'paragraph',
    text: 'We aim to provide reliable access but do not guarantee uninterrupted or error-free operation. Maintenance, updates, and circumstances beyond our reasonable control may affect availability. Support is provided according to your organisation’s agreement with us or through in-app guidance and contact channels.',
  },
  { type: 'heading', text: '8. Third-party services' },
  {
    type: 'paragraph',
    text: 'The platform may integrate with or link to third-party services. We are not responsible for third-party terms, privacy practices, or availability.',
  },
  { type: 'heading', text: '9. Disclaimer' },
  {
    type: 'paragraph',
    text: 'To the maximum extent permitted by law, the platform is provided "as is" and "as available" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. Operational decisions made using the platform remain your organisation’s responsibility.',
  },
  { type: 'heading', text: '10. Limitation of liability' },
  {
    type: 'paragraph',
    text: `To the maximum extent permitted by law, ${LEGAL_OPERATOR} and its officers, employees, and contractors are not liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill. Our total liability arising from these Terms or the service is limited to the fees paid by your organisation for the service in the twelve (12) months before the claim, or AUD $100 if no fees apply, except where liability cannot be excluded under the Australian Consumer Law or other applicable law.`,
  },
  { type: 'heading', text: '11. Indemnity' },
  {
    type: 'paragraph',
    text: 'You agree to indemnify and hold harmless ${LEGAL_OPERATOR} against claims arising from your breach of these Terms, misuse of the platform, or violation of law, except to the extent caused by our gross negligence or wilful misconduct.',
  },
  { type: 'heading', text: '12. Termination' },
  {
    type: 'paragraph',
    text: 'Your organisation may end its subscription according to its agreement with us. We may suspend or terminate access for breach, risk to the service, or legal requirement. Upon termination, access ceases and data may be deleted or exported according to your agreement and our data retention practices.',
  },
  { type: 'heading', text: '13. Governing law' },
  {
    type: 'paragraph',
    text: `These Terms are governed by the laws of ${LEGAL_JURISDICTION}. Courts in that jurisdiction have non-exclusive jurisdiction, subject to mandatory consumer protections in your country of residence.`,
  },
  { type: 'heading', text: '14. Changes' },
  {
    type: 'paragraph',
    text: 'We may update these Terms. Continued use after the effective date of revised Terms constitutes acceptance. Material changes will be communicated where reasonably practicable.',
  },
  { type: 'heading', text: '15. Contact' },
  {
    type: 'info',
    title: 'Terms enquiries',
    text: 'legal-contact-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }],
  },
];

export const GDPR_SECTIONS: PageSection[] = [
  ...meta(
    'This page supplements our Privacy Policy for individuals in the European Economic Area (EEA), United Kingdom, and Switzerland where the GDPR or UK GDPR applies to our processing of personal data.',
  ),
  { type: 'heading', text: '1. Data controller and processor roles' },
  {
    type: 'paragraph',
    text: `For account and website data relating to platform users, ${LEGAL_OPERATOR} typically acts as a data controller. For operational data that customer organisations upload about their staff, contractors, tenants, or sites, we generally act as a data processor on behalf of that organisation, which remains the data controller. If you are a platform user, contact your organisation first for requests about workspace data.`,
  },
  { type: 'heading', text: '2. Lawful bases' },
  {
    type: 'list',
    items: [
      'Contract — processing necessary to provide the platform and authenticate users.',
      'Legitimate interests — security monitoring, fraud prevention, service improvement, and internal reporting, where not overridden by your rights.',
      'Legal obligation — compliance with applicable laws and lawful requests.',
      'Consent — optional marketing or non-essential cookies where required.',
    ],
  },
  { type: 'heading', text: '3. Your GDPR rights' },
  { type: 'paragraph', text: 'Subject to exceptions in law, you may have the right to:' },
  {
    type: 'list',
    items: [
      'Access your personal data and obtain a copy.',
      'Rectify inaccurate data.',
      'Erase data ("right to be forgotten") where applicable.',
      'Restrict processing in certain circumstances.',
      'Data portability for data you provided in a structured, machine-readable format.',
      'Object to processing based on legitimate interests or for direct marketing.',
      'Not be subject to solely automated decisions with legal or significant effects, where applicable.',
      'Withdraw consent at any time where processing is based on consent.',
      'Lodge a complaint with your local supervisory authority.',
    ],
  },
  { type: 'heading', text: '4. International transfers' },
  {
    type: 'paragraph',
    text: 'Personal data may be transferred to Australia and other countries where we or our subprocessors operate. Where the European Commission or UK authorities have not issued an adequacy decision, we implement appropriate safeguards such as Standard Contractual Clauses (SCCs) and supplementary measures where required.',
  },
  { type: 'heading', text: '5. Subprocessors' },
  {
    type: 'paragraph',
    text: 'We use trusted infrastructure and service providers (for example cloud hosting and email delivery) who process data on our instructions under written agreements requiring confidentiality, security, and GDPR-compliant terms.',
  },
  { type: 'heading', text: '6. Retention' },
  {
    type: 'paragraph',
    text: 'We retain personal data only as long as necessary for the purposes described in our Privacy Policy, to comply with legal obligations, and to resolve disputes. Retention periods may vary by data category and customer agreement.',
  },
  { type: 'heading', text: '7. Security measures' },
  {
    type: 'paragraph',
    text: 'We implement technical and organisational measures including access controls, encryption in transit, workspace isolation between organisations, authentication tokens, and audit logging. Details may be provided to customers under a data processing agreement on request.',
  },
  { type: 'heading', text: '8. Exercising your rights' },
  {
    type: 'info',
    title: 'Submit a GDPR request',
    text: 'legal-contact-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }],
  },
  {
    type: 'paragraph',
    text: 'We will respond within one month of receiving a verifiable request, or inform you if an extension is required. We may need to verify your identity before processing requests.',
  },
  { type: 'heading', text: '9. Supervisory authorities' },
  {
    type: 'paragraph',
    text: 'You have the right to lodge a complaint with a data protection authority in your country of residence, place of work, or where an alleged infringement occurred. A list of EU supervisory authorities is available from the European Data Protection Board.',
  },
];

export const COOKIES_SECTIONS: PageSection[] = [
  ...meta(
    'This Cookie Policy explains how Service360 uses cookies and similar technologies on our website and platform.',
  ),
  { type: 'heading', text: '1. What are cookies?' },
  {
    type: 'paragraph',
    text: 'Cookies are small text files stored on your device when you visit a website or use an application. Similar technologies include local storage, session storage, and pixels. They help the service function, remember preferences, and understand usage.',
  },
  { type: 'heading', text: '2. How we use cookies' },
  {
    type: 'list',
    items: [
      'Strictly necessary — required for sign-in, session management, security, and load balancing. The platform cannot function without these.',
      'Functional — remember preferences such as language or saved sign-in email where you choose to save credentials.',
      'Analytics — help us understand how the service is used so we can improve performance and usability, where enabled.',
    ],
  },
  { type: 'heading', text: '3. Cookies we may set' },
  {
    type: 'list',
    items: [
      'Authentication and session tokens — to keep you signed in securely during your session.',
      'Security cookies — to help detect abuse and protect accounts.',
      'Preference storage — local storage for UI settings and optional saved sign-in details.',
    ],
  },
  { type: 'heading', text: '4. Third-party cookies' },
  {
    type: 'paragraph',
    text: 'Some embedded content or infrastructure providers may set their own cookies subject to their policies. We limit third-party cookies to what is necessary to operate the service.',
  },
  { type: 'heading', text: '5. Managing cookies' },
  {
    type: 'paragraph',
    text: 'You can control cookies through your browser settings — block, delete, or alert you when cookies are set. Blocking strictly necessary cookies may prevent you from signing in or using core features. To clear saved sign-in details, remove them from the sign-in screen or clear site data in your browser.',
  },
  { type: 'heading', text: '6. Changes' },
  {
    type: 'paragraph',
    text: 'We may update this Cookie Policy. The “Last updated” date at the top will reflect the latest version.',
  },
  { type: 'heading', text: '7. More information' },
  {
    type: 'info',
    title: 'Privacy Policy',
    text: 'privacy-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_PRIVACY, label: 'Privacy policy' }],
  },
];

export const ACCEPTABLE_USE_SECTIONS: PageSection[] = [
  ...meta(
    'This Acceptable Use Policy forms part of our Terms of Service and applies to all users of Service360.',
  ),
  { type: 'heading', text: '1. Permitted use' },
  {
    type: 'paragraph',
    text: 'You may use the platform only for lawful facility and property management activities authorised by your organisation, including managing sites, tasks, tickets, reports, communications, and related operational data.',
  },
  { type: 'heading', text: '2. Prohibited conduct' },
  { type: 'paragraph', text: 'You must not:' },
  {
    type: 'list',
    items: [
      'Access accounts, workspaces, or data you are not authorised to view.',
      'Share login credentials or allow others to use your account.',
      'Upload viruses, malware, or code designed to disrupt the service.',
      'Attempt to probe, scan, or test vulnerabilities without written permission.',
      'Reverse engineer, decompile, or extract source code except where law permits.',
      'Use automated scripts or bots to access the service without approval.',
      'Harass, threaten, or discriminate against other users.',
      'Upload unlawful, defamatory, obscene, or infringing content.',
      'Use the platform to send spam or unsolicited commercial messages.',
      'Interfere with or overload infrastructure or other users’ access.',
      'Misrepresent your identity or affiliation.',
      'Use the service in violation of export control, privacy, or sector-specific regulations applicable to your organisation.',
    ],
  },
  { type: 'heading', text: '3. Content responsibility' },
  {
    type: 'paragraph',
    text: 'Your organisation and its users are responsible for the accuracy, legality, and appropriateness of content uploaded to the platform, including reports, messages, photos, and attachments.',
  },
  { type: 'heading', text: '4. Monitoring and enforcement' },
  {
    type: 'paragraph',
    text: 'We may monitor use for security and compliance purposes. We may remove content, suspend accounts, or terminate access without notice where we reasonably believe this policy or our Terms has been violated, or where required to protect users or the service.',
  },
  { type: 'heading', text: '5. Reporting abuse' },
  {
    type: 'info',
    title: 'Report a concern',
    text: 'legal-contact-link',
    links: [{ path: PUBLIC_ROUTE.MARKETING_CONTACT, label: 'Contact us' }],
  },
];
