import { PUBLIC_ROUTE } from '@app/route.constants';
import React, { useEffect, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import MarketingLogo from './MarketingLogo';
import { NAV_ITEMS } from './siteData';

export default function MarketingNavbar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <nav className="navbar">
      <Link className="nav-logo" to={PUBLIC_ROUTE.LANDING}>
        <MarketingLogo />
        <div className="logo-type">
          <strong>Service360</strong>
          <span>Facility management platform</span>
        </div>
      </Link>

      <div className="nav-links nav-links--desktop">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={pathname === item.path ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="navbar-actions">
        <Link className="btn-signin" to={PUBLIC_ROUTE.SIGN_IN}>
          Sign in
        </Link>
        <button
          type="button"
          className="nav-menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      <div className={`nav-mobile-panel${menuOpen ? ' nav-mobile-panel--open' : ''}`}>
        <div className="nav-mobile-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={pathname === item.path ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {menuOpen && (
        <button
          type="button"
          className="nav-mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </nav>
  );
}
