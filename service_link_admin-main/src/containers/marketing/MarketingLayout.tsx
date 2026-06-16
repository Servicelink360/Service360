import React from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_ROUTE } from '@app/route.constants';
import MarketingFooter from './MarketingFooter';
import MarketingNavbar from './MarketingNavbar';
import MarketingSeo from './MarketingSeo';
import HomePage from './HomePage';
import MarketingPageView from './MarketingPageView';
import { DEFAULT_HOME_DESCRIPTION, DEFAULT_HOME_TITLE } from './marketingSeo';
import { getPageByPath } from './siteData';
import './marketing.css';

type Props = {
  children?: React.ReactNode;
};

export default function MarketingLayout({ children }: Props) {
  const { pathname } = useLocation();
  const isHome = pathname === PUBLIC_ROUTE.LANDING;
  const page = getPageByPath(pathname);

  return (
    <div className="marketing-site">
      <MarketingSeo
        path={pathname}
        isHome={isHome}
        title={isHome ? DEFAULT_HOME_TITLE : page?.title}
        description={isHome ? DEFAULT_HOME_DESCRIPTION : page?.lead}
      />
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
