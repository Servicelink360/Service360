import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_ROUTE } from '@app/route.constants';
import MarketingFooter from './MarketingFooter';
import MarketingNavbar from './MarketingNavbar';
import HomePage from './HomePage';
import MarketingPageView from './MarketingPageView';
import { getPageByPath } from './siteData';
import './marketing.css';

type Props = {
  children?: React.ReactNode;
};

export default function MarketingLayout({ children }: Props) {
  const { pathname } = useLocation();
  const isHome = pathname === PUBLIC_ROUTE.LANDING;

  useEffect(() => {
    const page = getPageByPath(pathname);
    document.title = isHome
      ? 'Service360 — Facility Management System'
      : page?.title || 'Service360';
  }, [pathname, isHome]);

  return (
    <div className="marketing-site">
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function MarketingHome() {
  return (
    <MarketingLayout>
      <main>
        <HomePage />
      </main>
    </MarketingLayout>
  );
}

export function MarketingInnerPage() {
  const { pathname } = useLocation();
  const page = getPageByPath(pathname);

  if (!page) {
    return null;
  }

  return (
    <MarketingLayout>
      <MarketingPageView page={page} />
    </MarketingLayout>
  );
}
