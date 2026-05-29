import React, { Suspense } from 'react';
import asyncComponent from '@app/lib/helpers/AsyncFunc';
import { Route, Switch } from 'react-router-dom';
import Loader from '../components/utility/loader';

const routes = [
	{
		path: '',
		component: asyncComponent(() => import('@app/containers/dashboard-page')),
		exact: true,
	},
	{ path: 'dashboard', component: asyncComponent(() => import('@app/containers/dashboard-page')), exact: true, },
	{ path: 'my-profile', component: asyncComponent(() => import('@app/containers/profile/profile2')), },
	{ path: 'customer', component: asyncComponent(() => import('@app/containers/admins')), },
	{ path: 'customers', component: asyncComponent(() => import('@app/containers/admins')), },
	{ path: 'staff', component: asyncComponent(() => import('@app/containers/admins')), },
	{ path: 'admin', component: asyncComponent(() => import('@app/containers/admins')), },
	{ path: 'admins', component: asyncComponent(() => import('@app/containers/admins')), },
	{ path: 'roles', component: asyncComponent(() => import('@app/containers/roles')) },
	{ path: 'companies', component: asyncComponent(() => import('@app/containers/companies')) },
	{ path: 'settings', component: asyncComponent(() => import('@app/containers/settings')) },
	{ path: 'how-to', component: asyncComponent(() => import('@app/containers/help/how-to')) },
	{ path: 'services', component: asyncComponent(() => import('@app/containers/services')) },
	{ path: 'positions', component: asyncComponent(() => import('@app/containers/positions')) },
	{ path: 'groups', component: asyncComponent(() => import('@app/containers/groups')) },
	{ path: 'sites', component: asyncComponent(() => import('@app/containers/job-sites')) },
	{ path: 'user-sites', component: asyncComponent(() => import('@app/containers/job-sites/user-job-site')) },
	{ path: 'user-sites-today', component: asyncComponent(() => import('@app/containers/job-sites/user-job-site-today')) },
	{ path: 'site-detail', component: asyncComponent(() => import('@app/containers/job-sites/detail')) },
	{ path: 'report-templates', component: asyncComponent(() => import('@app/containers/report-templates')) },
	{ path: 'user-task-today', component: asyncComponent(() => import('@app/containers/tasks/user-task-today')) },
	{ path: 'task-today', component: asyncComponent(() => import('@app/containers/tasks')) },
	{ path: 'schedule-tasks', component: asyncComponent(() => import('@app/containers/schedule-tasks')) },
	{ path: 'user-schedule-tasks', component: asyncComponent(() => import('@app/containers/schedule-tasks')) },


	{ path: 'staff-attendance', component: asyncComponent(() => import('@app/containers/staff-attendance')) },
	{ path: 'site-check-in', component: asyncComponent(() => import('@app/containers/site-check-in')) },


	{ path: 'new-reports', component: asyncComponent(() => import('@app/containers/reports/new-reports')) },
	{ path: 'custom-reports', component: asyncComponent(() => import('@app/containers/reports/new-reports')) },
	{ path: 'report-faults', component: asyncComponent(() => import('@app/containers/reports/report-faults')) },
	{ path: 'messages', component: asyncComponent(() => import('@app/containers/messages')) },
	{ path: 'audit-report', component: asyncComponent(() => import('@app/containers/reports/audit-report')) },
	{ path: 'ppe-report', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'action-plans', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'incident-report', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'training', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'induction', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'assets', component: asyncComponent(() => import('@app/containers/blank')) },
	{ path: 'manageme-PPE', component: asyncComponent(() => import('@app/containers/blank')) },


	{ path: 'tickets', component: asyncComponent(() => import('@app/containers/tickets')) },

];

export default function AppRouter() {
	return (
		<Suspense fallback={<Loader />}>
			<Switch>
				{routes.map((route, idx) => (
					<Route exact={route.exact} key={idx} path={`/${route.path}`}>
						<route.component />
					</Route>

				))}
			</Switch>
		</Suspense>
	);
}
