import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import urlConfig from '@app/config/site.config';
import type { MarketingPage, PageSection } from './siteData';
import {
  LEGAL_OPERATOR,
  LEGAL_OPERATOR_WEBSITE,
  LEGAL_PRODUCT,
} from './legalContent';

const CONTACT_INBOX = 'helpdesk@servicelink.net.au';

const buildContactApiUrl = () => {
  const base = String(urlConfig.orderApiURL || '').replace(/\/+$/, '');
  return `${base}/v1/contact/enquiry`;
};

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = body.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      message.warning('Please fill in your name, email, and message.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(buildContactApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.code === 1) {
        message.success('Thank you — your message has been sent. We will get back to you soon.');
        setName('');
        setEmail('');
        setBody('');
        return;
      }
      message.error(
        data?.message ||
          `Could not send your message. Please email ${CONTACT_INBOX} directly.`,
      );
    } catch {
      message.error(`Could not send your message. Please email ${CONTACT_INBOX} directly.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label htmlFor="contact-name">Name</label>
      <input
        id="contact-name"
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={120}
        disabled={submitting}
      />
      <label htmlFor="contact-email">Email</label>
      <input
        id="contact-email"
        type="email"
        placeholder="you@organisation.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        maxLength={200}
        autoComplete="email"
        disabled={submitting}
      />
      <label htmlFor="contact-message">Message</label>
      <textarea
        id="contact-message"
        placeholder="How can we help?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={5000}
        disabled={submitting}
      />
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

function renderSection(section: PageSection, index: number) {
  switch (section.type) {
    case 'heading':
      return <h2 key={index}>{section.text}</h2>;
    case 'paragraph':
      if (section.text === 'contact-form') {
        return <ContactForm key={index} />;
      }
      if (section.text === 'about-intro') {
        return (
          <p key={index}>
            {LEGAL_PRODUCT} is a cloud facility management platform operated by{' '}
            <a href={LEGAL_OPERATOR_WEBSITE} target="_blank" rel="noopener noreferrer">
              {LEGAL_OPERATOR}
            </a>
            . We help property teams, facilities contractors, and organisations run day-to-day
            operations from one secure workspace — without spreadsheets, disconnected tools, or
            shared data between customers.
          </p>
        );
      }
      return (
        <p key={index}>
          {section.emphasis ? <em>{section.text}</em> : section.text}
        </p>
      );
    case 'list':
      return (
        <ul key={index}>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <div className="steps-grid" key={index}>
          {section.steps.map((step, stepIndex) => (
            <div className="step-card" key={step.title}>
              <div className="step-num">{stepIndex + 1}</div>
              <h4>{step.title}</h4>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      );
    case 'info':
      return (
        <div className="info-card" key={index}>
          <h3>{section.title}</h3>
          {section.text === 'module-links' && section.links && section.links.length >= 2 ? (
            <p>
              See <Link to={section.links[0].path}>{section.links[0].label}</Link> for a full module
              breakdown, or <Link to={section.links[1].path}>{section.links[1].label}</Link> for
              onboarding steps.
            </p>
          ) : section.text === 'legal-contact-link' && section.links?.[0] ? (
            <p>
              Please <Link to={section.links[0].path}>{section.links[0].label}</Link> with sufficient
              detail for us to verify your identity and respond to your enquiry.
            </p>
          ) : section.text === 'contact-link' && section.links?.[0] ? (
            <p>
              For account or technical support, contact your organisation administrator or reach out
              via the <Link to={section.links[0].path}>{section.links[0].label}</Link>.
            </p>
          ) : section.text === 'cookie-link' && section.links?.[0] ? (
            <p>
              See our <Link to={section.links[0].path}>{section.links[0].label}</Link> for details on
              cookies and similar technologies.
            </p>
          ) : section.text === 'aup-link' && section.links?.[0] ? (
            <p>
              See our <Link to={section.links[0].path}>{section.links[0].label}</Link> for further
              detail on permitted and prohibited use.
            </p>
          ) : section.text === 'privacy-link' && section.links?.[0] ? (
            <p>
              See our <Link to={section.links[0].path}>{section.links[0].label}</Link> for how we
              handle personal information.
            </p>
          ) : (
            <p>{section.text}</p>
          )}
        </div>
      );
    default:
      return null;
  }
}

type Props = {
  page: MarketingPage;
};

const LEGAL_SLUGS = new Set(['privacy', 'terms', 'gdpr', 'cookies', 'acceptable-use']);

export default function MarketingPageView({ page }: Props) {
  const isLegal = LEGAL_SLUGS.has(page.slug);

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / {page.hero}
          </div>
          <h1>{page.hero}</h1>
          <p>{page.lead}</p>
        </div>
      </section>
      <main className={isLegal ? 'page-content legal' : 'page-content'}>
        {page.sections.map((section, index) => renderSection(section, index))}
      </main>
    </>
  );
}
