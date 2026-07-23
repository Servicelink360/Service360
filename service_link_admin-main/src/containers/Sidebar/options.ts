export interface option {
	key: string,
	label: string,
	leftIcon: any,
	children?: any,
}
export interface hashOption {
	key: string,
	label: string,
}
//permissions: all: T?t c? ch?c nang
export const optionsStaff: option[] = [
	{
		key: 'dashboard',
		label: 'sidebar.dashboard',
		leftIcon: 'svg-dashboard'
	},
	{
		key: 'messages',
		label: 'sidebar.messages',
		leftIcon: 'icon-site',
	},
	{
		key: 'my-tasks',
		label: 'sidebar.myTasks',
		leftIcon: 'icon-site',
	},
	{
		key: 'site-check-in',
		label: 'sidebar.siteCheckIn',
		leftIcon: 'icon-site',
	},
	{
		key: 'user-sites',
		label: 'sidebar.jobSites',
		leftIcon: 'icon-site',
	},
	{
		key: 'task-today',
		label: 'sidebar.tasks',
		leftIcon: 'icon-site',
		children: [
			{
				key: 'task-today?status=p',
				label: 'sidebar.pending',
			},
			{
				key: 'task-today?status=i',
				label: 'sidebar.in_progress',
			},
			{
				key: 'task-today?status=s',
				label: 'sidebar.completed',
			}
		]
	},
	{
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-package',
		children: [
			{
				key: 'new-reports',
				label: 'sidebar.newReports',
			},
			{
				key: 'report-faults',
				label: 'sidebar.reportFaults',
			},
			{
				key: 'audit-report',
				label: 'sidebar.auditReport',
			},
			{
				key: 'incident-report',
				label: 'sidebar.incidentReport',
			},
			{
				key: 'action-plans',
				label: 'sidebar.actionPlans',
			},

			{
				key: 'ppe-report',
				label: 'sidebar.ppeReport',
			},
		]
	},
]

export const optionsCustomer: option[] = [
	{
		key: 'dashboard',
		label: 'sidebar.dashboard',
		leftIcon: 'svg-dashboard'
	},
	{
		key: 'messages',
		label: 'sidebar.messages',
		leftIcon: 'icon-site',
	},
	{
		key: 'tickets',
		label: 'sidebar.tickets',
		leftIcon: 'icon-site',
		children: [
			{
				key: 'tickets?status=2',
				label: 'sidebar.ticket-pending',
			},
			{
				key: 'tickets?status=3',
				label: 'sidebar.ticket-inprogress',
			},
			{
				key: 'tickets?status=1',
				label: 'sidebar.ticket-completed',
			},
		]
	},
	{
		key: 'customer-personnel',
		label: 'sidebar.customerPersonnel',
		leftIcon: 'icon-staff',
	},
	{
		key: 'invoices',
		label: 'sidebar.invoices',
		leftIcon: 'icon-package',
	},
	{
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-package',
		children: [
			{
				key: 'new-reports',
				label: 'sidebar.newReports',
			},
			{
				key: 'report-faults',
				label: 'sidebar.reportFaults',
			},
			{
				key: 'audit-report',
				label: 'sidebar.auditReport',
			}
		]
	},
]
const options: option[] = [
	{
		key: 'dashboard',
		label: 'sidebar.dashboard',
		leftIcon: 'svg-dashboard'
	},
	{
		key: 'messages',
		label: 'sidebar.messages',
		leftIcon: 'icon-site',
	},
	{
		key: 'invoices',
		label: 'sidebar.invoices',
		leftIcon: 'icon-package',
	},
	{
		key: 'directory',
		label: 'sidebar.directory',
		leftIcon: 'icon-users',
		children: [
			{
				key: 'services',
				label: 'sidebar.services',
			},
			{
				key: 'companies',
				label: 'sidebar.companies',
			},
			{
				key: 'staff',
				label: 'sidebar.staff',
			},
			{
				key: 'admin-personnel',
				label: 'sidebar.adminPersonnel',
			},
			{
				key: 'customers',
				label: 'sidebar.customers',
			},
			{
				key: 'sites',
				label: 'sidebar.jobSites',
			},
		],
	},

	{
		key: 'task-today',
		label: 'sidebar.tasks',
		leftIcon: 'icon-site',
		children: [
			{
				key: 'task-today?status=p',
				label: 'sidebar.pending',
			},
			{
				key: 'task-today?status=i',
				label: 'sidebar.in_progress',
			},
			{
				key: 'task-today?status=s',
				label: 'sidebar.completed',
			},
			{
				key: 'schedule-tasks',
				label: 'sidebar.scheduleTasks',
				leftIcon: 'icon-site',
			},
		]
	},
	{
		key: 'tickets',
		label: 'sidebar.tickets',
		leftIcon: 'icon-site',
		children: [
			{
				key: 'tickets?status=2',
				label: 'sidebar.ticket-pending',
			},
			{
				key: 'tickets?status=3',
				label: 'sidebar.ticket-inprogress',
			},
			{
				key: 'tickets?status=1',
				label: 'sidebar.ticket-completed',
			},
		]
	},
	{
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-package',
		children: [
			{
				key: 'new-reports',
				label: 'sidebar.newReports',
			},
			{
				key: 'report-faults',
				label: 'sidebar.reportFaults',
			},
			{
				key: 'audit-report',
				label: 'sidebar.auditReport',
			},
			{
				key: 'incident-report',
				label: 'sidebar.incidentReport',
			},
			{
				key: 'action-plans',
				label: 'sidebar.actionPlans',
			},
			{
				key: 'ppe-report',
				label: 'sidebar.ppeReport',
			},
		]
	},

	{
		key: 'staff-management',
		label: 'sidebar.staffManagement',
		leftIcon: 'icon-staff',
		children: [
			{
				key: 'staff-attendance',
				label: 'sidebar.staffAttendance',
			},
			{
				key: 'training',
				label: 'sidebar.training',
			},
			{
				key: 'induction',
				label: 'sidebar.induction',
			},
		]
	},

	{
		key: 'asset',
		label: 'sidebar.asset',
		leftIcon: 'icon-asset',
		children: [
			{
				key: 'asset-register',
				label: 'sidebar.assetRegister',
			},
		],
	},
	{
		key: 'manageme-PPE',
		label: 'sidebar.managemePPE',
		leftIcon: 'icon-asset',
	},
	{
		key: 'master',
		label: 'sidebar.Master',
		leftIcon: 'icon-master',
		children: [
			// {
			// 	key: 'companies',
			// 	label: 'sidebar.companies',
			// },
			// {
			// 	key: 'positions',
			// 	label: 'sidebar.positions',
			// },
			{
				key: 'roles',
				label: 'sidebar.roles',
			},
			{
				key: 'report-templates',
				label: 'sidebar.reportTemplates',
			},
		]
	},

	{
		key: 'admin',
		label: 'sidebar.System',
		leftIcon: 'icon-system',
		children: [
			{
				key: 'admins',
				label: 'sidebar.admins',
			},
			{
				key: 'settings',
				label: 'sidebar.settings',
			},
		],
	},
	{
		key: 'how-to',
		label: 'sidebar.howTo',
		leftIcon: 'icon-help',
	},
];
const hashOptions: hashOption[] = [
	{
		key: '',
		label: 'sidebar.dashboard',
	},
	{
		key: 'dashboard',
		label: 'sidebar.dashboard',
	},
	{
		key: 'messages',
		label: 'sidebar.messages',
	},
	{
		key: 'my-profile',
		label: 'topbar.myprofile',
	},
	{
		key: 'options',
		label: 'sidebar.options',
	},

	{
		key: 'roles',
		label: 'sidebar.roles',
	},
	{
		key: 'directory',
		label: 'sidebar.directory',
	},
	{
		key: 'users',
		label: 'sidebar.users',
	},
	{
		key: 'companies',
		label: 'sidebar.companies',
	},
	{
		key: 'master',
		label: 'sidebar.Master',
	},

	{
		key: 'system',
		label: 'sidebar.System',
	},

	{
		key: 'admins',
		label: 'sidebar.admin',
	},
	{
		key: 'settings',
		label: 'sidebar.settings',
	},
	{
		key: 'how-to',
		label: 'sidebar.howTo',
	},

	{
		key: 'services',
		label: 'sidebar.services',
	},
	{
		key: 'positions',
		label: 'sidebar.positions',
	},
	{
		key: 'groups',
		label: 'sidebar.groups',
	},
	{
		key: 'customers',
		label: 'sidebar.customers',
	},
	{
		key: 'staffs',
		label: 'sidebar.staff',
	},
	{
		key: 'sites',
		label: 'sidebar.jobSites',
	},
	{
		key: 'report-templates',
		label: 'sidebar.reportTemplates',
	},
	{
		key: 'user-sites',
		label: 'sidebar.jobSites'
	},
	{
		key: 'task-history',
		label: 'sidebar.taskHistory'
	},
	{
		key: 'site-check-in',
		label: 'sidebar.siteCheckIn',
	},
	{
		key: 'staff-attendance',
		label: 'sidebar.staffAttendance',
	},
	{
		key: 'admin-personnel',
		label: 'sidebar.adminPersonnel',
	},
	{
		key: 'schedule-tasks',
		label: 'sidebar.scheduleTasks',
	},
	{
		key: 'new-reports',
		label: 'sidebar.newReports',
	},
	{
		key: 'custom-reports',
		label: 'sidebar.newReports',
	},
	{
		key: 'report-faults',
		label: 'sidebar.reportFaults',
	},
	{
		key: 'audit-report',
		label: 'sidebar.auditReport',
	},
	{
		key: 'incident-report',
		label: 'sidebar.incidentReport',
	},
	{
		key: 'action-plans',
		label: 'sidebar.actionPlans',
	},
	{
		key: 'ppe-report',
		label: 'sidebar.ppeReport',
	},
	{
		key: 'tickets',
		label: 'sidebar.tickets',
	},
	{
		key: 'invoices',
		label: 'sidebar.invoices',
	},
	{
		key: 'task-today',
		label: 'sidebar.tasks',
	},
	{
		key: 'task-today?status=p',
		label: 'sidebar.pending',
	},
	{
		key: 'task-today?status=i',
		label: 'sidebar.in_progress',
	},
	{
		key: 'task-today?status=s',
		label: 'sidebar.completed',
	},
	{
		key: 'tickets?status=2',
		label: 'sidebar.ticket-pending',
	},
	{
		key: 'tickets?status=3',
		label: 'sidebar.ticket-inprogress',
	},
	{
		key: 'tickets?status=1',
		label: 'sidebar.ticket-completed',
	},
	{
		key: 'asset-register',
		label: 'sidebar.assetRegister',
	},
	{
		key: 'manageme-PPE',
		label: 'sidebar.managemePPE',
	},
];

/** Whether a menu item key matches the current route (leaf-first; respects query keys). */
function menuKeyMatchesRoute(itemKey: string, leafKey: string, hasChildren: boolean): boolean {
	const key = String(itemKey);
	const leaf = String(leafKey || '');
	if (key === leaf) {
		return true;
	}
	const itemPath = key.split('?')[0];
	const leafPath = leaf.split('?')[0];
	if (itemPath !== leafPath) {
		return false;
	}
	if (key.includes('?')) {
		return key === leaf;
	}
	if (leaf.includes('?')) {
		return false;
	}
	return !hasChildren;
}

/** Leaf first, then parents (e.g. customers ? [customers, directory]). */
export function findMenuAncestors(
	leafKey: string,
	menuOptions: option[] = options,
): string[] {
	const walk = (items: option[], trail: string[]): string[] | null => {
		for (const item of items) {
			const key = String(item.key);
			if (item.children?.length) {
				const found = walk(item.children, [key, ...trail]);
				if (found) {
					return found;
				}
			}
			if (menuKeyMatchesRoute(key, leafKey, !!item.children?.length)) {
				return [key, ...trail];
			}
		}
		return null;
	};
	return walk(menuOptions, []) ?? [String(leafKey || '')];
}

export function menuItemHasChildren(key: string, menuOptions: option[] = options): boolean {
	const walk = (items: option[]): boolean => {
		for (const item of items) {
			if (String(item.key) === String(key)) {
				return !!item.children?.length;
			}
			if (item.children?.length && walk(item.children)) {
				return true;
			}
		}
		return false;
	};
	return walk(menuOptions);
}

/** Parent submenu keys to open for this route (used on navigation only). */
export function findMenuOpenKeys(
	leafKey: string,
	menuOptions: option[] = options,
): string[] {
	const ancestors = findMenuAncestors(leafKey, menuOptions);
	if (ancestors.length > 1) {
		return ancestors.slice(1).map(String);
	}
	if (ancestors.length === 1 && menuItemHasChildren(ancestors[0], menuOptions)) {
		return [String(ancestors[0])];
	}
	return [];
}

export function findMenuSelectedKey(leafKey: string, menuOptions: option[] = options): string {
	const ancestors = findMenuAncestors(leafKey, menuOptions);
	return String(ancestors[0] ?? leafKey);
}

/** i18n label key for a menu route (matches full key or path before `?`). */
export function findMenuLabelByKey(
	leafKey: string,
	menuOptions: option[] = options,
): string | undefined {
	const walk = (items: option[]): string | undefined => {
		for (const item of items) {
			if (item.children?.length) {
				const found = walk(item.children);
				if (found) return found;
			}
			if (menuKeyMatchesRoute(String(item.key), leafKey, !!item.children?.length)) {
				return item.label;
			}
		}
		return undefined;
	};
	return walk(menuOptions);
}

/** Resolve i18n label for top bar from current route (pathname + query). */
export function resolvePageTitleLabel(
	pathname: string,
	search: string = '',
	menuOptions: option[] = options,
): string | undefined {
	const path = (pathname || '/').replace(/^\//, '').replace(/\/$/, '') || 'dashboard';
	const candidates = [
		`${path}${search}`,
		path,
		path.includes('/') ? path.split('/').pop()! : path,
	];
	for (const key of candidates) {
		const hit = hashOptions.find((o) => o.key === key);
		if (hit?.label) return hit.label;
		const fromMenu = findMenuLabelByKey(key, menuOptions);
		if (fromMenu) return fromMenu;
	}
	return (
		hashOptions.find((o) => o.key === 'dashboard')?.label
		?? findMenuLabelByKey('dashboard', menuOptions)
	);
}

export {
	hashOptions,
};
export default options;
