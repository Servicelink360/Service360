import Loader from '@app/components/utility/loader';
import React, { lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { PUBLIC_ROUTE } from './route.constants';
import { GlobalHotKeys, configure } from "react-hotkeys";
import appActions from "@app/redux/app/actions";
import actions from "@app/redux/auth/actions"

const { toggleCollapsed } = appActions;

const Dashboard = lazy(() => import('./containers/dashboard/Dashboard'));

(async () => {
  if (!localStorage.getItem('id_token')) {
    return;
  }
  const pathName = window.location.pathname.substring(1)
  if (pathName === '' || pathName === 'signin' || pathName === 'forgotpassword' || pathName === 'signup' || process.env.PUBLIC_URL === '/' + pathName) {
    window.location.href = window.location.origin + "/dashboard/";
  }
})()
const publicRoutes = [

  {
    path: PUBLIC_ROUTE.LANDING,
    exact: true,
    component: lazy(() => import('@app/containers/auth/SignIn/SignIn')),
  },
  {
    path: PUBLIC_ROUTE.PAGE_404,
    component: lazy(() => import('@app/containers/auth/404/404')),
  },
  {
    path: PUBLIC_ROUTE.PAGE_500,
    component: lazy(() => import('@app/containers/auth/500/500')),
  },
  {
    path: PUBLIC_ROUTE.NO_PERMISSION,
    component: lazy(() => import('@app/containers/auth/NoPermission/NoPermission')),
  },
  {
    path: PUBLIC_ROUTE.SIGN_IN,
    component: lazy(() => import('@app/containers/auth/SignIn/SignIn')),
  },
  {
    path: PUBLIC_ROUTE.SIGN_UP,
    component: lazy(() => import('@app/containers/auth/SignUp/SignUp')),
  },
  {
    path: PUBLIC_ROUTE.FORGET_PASSWORD,
    component: lazy(() =>
      import('@app/containers/auth/ForgotPassword/ForgotPassword')
    ),
  },
  {
    path: PUBLIC_ROUTE.RESET_PASSWORD,
    component: lazy(() =>
      import('@app/containers/auth/ResetPassword/ResetPassword')
    ),
  },
  {
    path: PUBLIC_ROUTE.CHECK_COOKIE,
    component: lazy(() =>
      import('@app/containers/auth/SignInCookie/CheckCookie')
    ),
  },
];
function PrivateRoute({ children, ...rest }) {
  const isLoggedIn = useSelector((state) => state.Auth.idToken);
  const dispatch = useDispatch();
  const pathname = rest.location.pathname;
  const pathname_real = pathname.split("/")[pathname.split("/").length - 1]
  const hardcode = false;
  const refresh = useSelector((state) => state.Auth.refresh);

  // Reload page after login to refresh language intl
  if (pathname_real === 'dashboard' && refresh) {
    dispatch(actions.refreshPage())
    window.location.reload()
  }
  if (isLoggedIn) {
    if (hardcode) {
      return <Route
        {...rest}
        render={(props) => children}
      />
    }


    return <Route
      {...rest}
      render={(props) => children}
    />
  } else {
    return (

      <Route
        {...rest}
        render={({ location }) => {
          return (
            <Redirect
              to={{
                pathname: '/signin',
                state: { from: location }
              }}
            />
          );
        }}
      />
    );
  }
}

export default function Routes() {
  const keyMap = {
    TOGGLE: "ctrl+m"
  };
  const dispatch = useDispatch();
  const handlers = {
    TOGGLE: () => handleToggle(),
  };
  configure({
    defaultTabIndex: '-1',
    ignoreTags: ['input', 'select', 'textarea'],
    ignoreEventsCondition: function () { }
  })
  const handleToggle = React.useCallback(
    () => dispatch(toggleCollapsed()),
    [dispatch]
  );
  return (
    <Suspense fallback={<Loader />}>
      <Router basename={process.env.PUBLIC_URL}>
        <Switch>
          {publicRoutes.map((route, index) => {
            return (
              <Route key={index} path={route.path} exact={route.exact}>
                <route.component />
              </Route>
            )
          })}
          <PrivateRoute path="/">
            <GlobalHotKeys keyMap={keyMap} handlers={handlers} tabIndex={-1}>
              <Dashboard />
            </GlobalHotKeys>
          </PrivateRoute>
          <Route component={lazy(() => import('@app/containers/auth/404/404'))} />
        </Switch>
      </Router>
    </Suspense>
  );
}
