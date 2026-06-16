import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { message } from 'antd';
import type { MarketingPage, PageSection } from './siteData';

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    message.success('Thank you — this demo form does not submit to a server.');
    setName('');
    setEmail('');
    setBody('');
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
      />
      <label htmlFor="contact-email">Email</label>
      <input
        id="contact-email"
        type="email"
        placeholder="you@organisation.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="contact-message">Message</label>
      <textarea
        id="contact-message"
        placeholder="How can we help?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button type="submit" className="btn-primary">
        Send message
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
