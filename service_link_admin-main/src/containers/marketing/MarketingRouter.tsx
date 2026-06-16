import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { PUBLIC_ROUTE } from '@app/route.constants';
import { MarketingHome, MarketingInnerPage } from './MarketingLayout';
import { MARKETING_PAGES } from './siteData';

export default function MarketingRouter() {
  return (
    <Switch>
      <Route exact path={PUBLIC_ROUTE.LANDING} component={MarketingHome} />
      {MARKETING_PAGES.map((page) => (
        <Route key={page.slug} exact path={page.path} component={MarketingInnerPage} />
      ))}
      <Route render={() => <Redirect to={PUBLIC_ROUTE.PAGE_404} />} />
    </Switch>
  );
}
