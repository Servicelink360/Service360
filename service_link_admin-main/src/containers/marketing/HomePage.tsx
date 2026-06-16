import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaBuilding,
  FaCity,
  FaClipboardCheck,
  FaClipboardList,
  FaComments,
  FaExclamationTriangle,
  FaHardHat,
  FaLandmark,
  FaSitemap,
  FaUserShield,
} from 'react-icons/fa';
import { HOME_AUDIENCES, HOME_FEATURES } from './siteData';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  building: <FaBuilding />,
  'clipboard-list': <FaClipboardList />,
  'exclamation-triangle': <FaExclamationTriangle />,
  'clipboard-check': <FaClipboardCheck />,
  comments: <FaComments />,
  'user-shield': <FaUserShield />,
};

const AUDIENCE_ICONS: Record<string, React.ReactNode> = {
  landmark: <FaLandmark />,
  city: <FaCity />,
  'hard-hat': <FaHardHat />,
  building: <FaBuilding />,
};

export default function HomePage() {
  return (
    <>
      <div className="section">
        <div className="section-header">
          <h3>Built for multi‑organisation facility management</h3>
          <p>
            Each customer gets their own secure workspace. No shared data between organisations —
            just one platform to run operations at scale.
          </p>
        </div>
        <div className="features-grid">
          {HOME_FEATURES.map((feature) => (
            <Link to={feature.path} className="feature-card feature-card-link" key={feature.title}>
              <div className="feature-icon">{FEATURE_ICONS[feature.icon]}</div>
              <h4>{feature.title}</h4>
              <p>{feature.text}</p>
              <span className="feature-card-cta">Learn more</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="section section-light">
        <div className="section-header">
          <h3>Who uses Service360</h3>
          <p>Trusted by facility managers, contractors, and property teams across sectors.</p>
        </div>
        <div className="features-grid audience">
          {HOME_AUDIENCES.map((item) => (
            <Link to={item.path} className="feature-card centered feature-card-link" key={item.title}>
              <div className="audience-icon">{AUDIENCE_ICONS[item.icon]}</div>
              <h4>{item.title}</h4>
              <p className="small">{item.text}</p>
              <span className="feature-card-cta">Learn more</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="testimonial">
          <div className="icon">
            <FaSitemap />
          </div>
          <p>
            After sign‑in, each role sees a tailored experience: admins manage directory, tasks,
            tickets, reports, assets, and system settings; staff use site check‑in, job sites, and
            field reports; clients raise tickets and track service requests from their dashboard.
          </p>
          <div className="subtitle">Three roles, one platform</div>
          <div className="meta">Administrator · Staff · Client</div>
        </div>
      </div>
    </>
  );
}
