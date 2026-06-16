import React from 'react';
import { Link } from 'react-router-dom';
import { FOOTER_SECTIONS } from './siteData';

export default function MarketingFooter() {
  return (
    <footer>
      <div className="footer-links">
        {FOOTER_SECTIONS.map((section) => (
          <div className="footer-group" key={section.title}>
            <span className="footer-group-label">{section.title}</span>
            {section.links.map((link) => (
              <Link key={link.path} to={link.path}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Service360 — Facility Management System. All rights reserved.</p>
      </div>
    </footer>
  );
}
