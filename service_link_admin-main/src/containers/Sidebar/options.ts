export interface option {
	key: string,
	label: string,
	leftIcon?: any,
	children?: any,
	groupColor?: string,
}
export interface hashOption {
	key: string,
	label: string,
}

export type NavGroupDef = {
	id: string;
	label: string;
	color: string;
	keys: string[];
};

/** Same grouping as /nav-mock — unwrap these so the group title is the section, not a nested duplicate. */
const UNWRAP_INTO_GROUP = new Set([
	'report',
	'directory',
	'staff-management',
	'admin',
]);

/** Icons for unwrapped leaves (match nav-mock). */
const LEAF_ICONS: Record<string, string> = {
	services: 'icon-service',
	companies: 'icon-companies',
	staff: 'icon-staff',
	'admin-personnel': 'icon-admin',
	customers: 'icon-contact',
	sites: 'icon-site',
	'new-reports': 'icon-report-new',
	'safety-audits': 'icon-report-safety',
	'report-faults': 'icon-report-fault',
	'audit-report': 'icon-report-audit',
	'monthly-report': 'icon-report-monthly',
	'incident-report': 'icon-report-incident',
	'ppe-report': 'icon-ppe',
	'report-templates-menu': 'icon-report-templates',
	'report-templates': 'icon-report-template',
	'safety-audit-templates': 'icon-report-safety-template',
	'staff-attendance': 'icon-staff',
	training: 'icon-training',
	'training-admin': 'icon-training',
	'toolbox-admin': 'icon-toolbox',
	induction: 'icon-ppe',
	'users-roles': 'icon-admin',
	admins: 'icon-admin',
	roles: 'icon-master',
	settings: 'icon-system',
	'asset-register': 'icon-asset',
};

export const adminNavGroups: NavGroupDef[] = [
	{ id: 'nav-home', label: 'sidebar.dashboard', color: '#A3F34F', keys: ['dashboard'] },
	{ id: 'nav-messages', label: 'sidebar.navMessages', color: '#A3F34F', keys: ['messages', 'tickets'] },
	{ id: 'nav-camera', label: 'sidebar.navCamera', color: '#FFAD32', keys: ['field-photos'] },
	{ id: 'nav-field', label: 'sidebar.navFieldWork', color: '#FFE05B', keys: ['task-today'] },
	{ id: 'nav-meeting', label: 'sidebar.navTeamMeeting', color: '#4FB8FF', keys: ['team-meeting', 'meeting-history'] },
	{ id: 'nav-procurement', label: 'sidebar.navProcurement', color: '#FF5797', keys: ['invoices', 'consumables'] },
	{ id: 'nav-directory', label: 'sidebar.navDirectory', color: '#BD70FF', keys: ['directory'] },
	{ id: 'nav-reports', label: 'sidebar.navReports', color: '#67E8F9', keys: ['report'] },
	{ id: 'nav-staff', label: 'sidebar.navStaffManagement', color: '#FFAD32', keys: ['staff-management'] },
	{ id: 'nav-assets', label: 'sidebar.navAssetsPpe', color: '#A3F34F', keys: ['asset', 'manageme-PPE'] },
	{ id: 'nav-admin', label: 'sidebar.navAdmin', color: '#CBD5E1', keys: ['admin'] },
	{ id: 'nav-help', label: 'sidebar.navHelp', color: '#F9A8D4', keys: ['how-to'] },
];

/** Staff (type 2): field tools only — no Staff Management / Directory / Admin / Assets / Procurement / Meetings. */
export const staffNavGroups: NavGroupDef[] = [
	{ id: 'nav-home', label: 'sidebar.dashboard', color: '#A3F34F', keys: ['dashboard'] },
	{ id: 'nav-messages', label: 'sidebar.navMessages', color: '#A3F34F', keys: ['messages'] },
	{ id: 'nav-camera', label: 'sidebar.navCamera', color: '#FFAD32', keys: ['field-photos'] },
	{
		id: 'nav-field',
		label: 'sidebar.navFieldWork',
		color: '#FFE05B',
		// Site check-in / job sites sit at Field Work level — not under Tasks
		keys: ['site-check-in', 'my-tasks'],
	},
	{ id: 'nav-reports', label: 'sidebar.navReports', color: '#67E8F9', keys: ['report'] },
	{
		id: 'nav-training',
		label: 'sidebar.training',
		color: '#FFAD32',
		keys: ['training-menu', 'toolbox', 'induction'],
	},
	{ id: 'nav-help', label: 'sidebar.navHelp', color: '#F9A8D4', keys: ['how-to'] },
];

/** Customer (type 1): messages/tickets, invoices, consumables (read), limited reports, own personnel — nothing admin. */
export const customerNavGroups: NavGroupDef[] = [
	{ id: 'nav-home', label: 'sidebar.dashboard', color: '#A3F34F', keys: ['dashboard'] },
	{ id: 'nav-messages', label: 'sidebar.navMessages', color: '#A3F34F', keys: ['messages', 'tickets'] },
	{ id: 'nav-procurement', label: 'sidebar.navProcurement', color: '#FF5797', keys: ['invoices', 'consumables'] },
	{ id: 'nav-reports', label: 'sidebar.navReports', color: '#67E8F9', keys: ['report'] },
	{ id: 'nav-directory', label: 'sidebar.navDirectory', color: '#BD70FF', keys: ['customer-personnel'] },
	{ id: 'nav-help', label: 'sidebar.navHelp', color: '#F9A8D4', keys: ['how-to'] },
];

function withLeafIcon(item: option): option {
	const icon = item.leftIcon || LEAF_ICONS[String(item.key)];
	const children = item.children?.map((child: option) => withLeafIcon(child));
	return {
		...item,
		...(icon ? { leftIcon: icon } : {}),
		...(children ? { children } : {}),
	};
}

/** Wrap flat menus into the same colored groups as /nav-mock. */
export function applyNavGroups(items: option[], groups: NavGroupDef[]): option[] {
	const byKey = new Map(items.map((item) => [String(item.key), item]));
	const used = new Set<string>();
	const result: option[] = [];

	for (const group of groups) {
		const children: option[] = [];
		for (const key of group.keys) {
			const item = byKey.get(key);
			if (!item) continue;
			used.add(key);
			if (UNWRAP_INTO_GROUP.has(key) && item.children?.length) {
				children.push(...item.children.map((child: option) => withLeafIcon(child)));
			} else {
				children.push(withLeafIcon(item));
			}
		}
		if (!children.length) continue;
		result.push({
			key: group.id,
			label: group.label,
			leftIcon: children[0]?.leftIcon || 'svg-dashboard',
			groupColor: group.color,
			children,
		});
	}

	// Do not append unused items — role menus must only show what the group map allows.
	return result;
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
		leftIcon: 'icon-messages',
	},
	{
		key: 'field-photos',
		label: 'sidebar.camera',
		leftIcon: 'icon-camera',
	},
	{
		key: 'site-check-in',
		label: 'sidebar.siteCheckIn',
		leftIcon: 'icon-checkin',
	},
	{
		key: 'my-tasks',
		label: 'sidebar.tasks',
		leftIcon: 'icon-my-tasks',
	},
	{
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-reports',
		children: [
			{
				key: 'new-reports',
				label: 'sidebar.newReports',
			},
			{
				key: 'safety-audits',
				label: 'sidebar.safetyAudits',
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
				key: 'ppe-report',
				label: 'sidebar.ppeReport',
			},
		]
	},
	{
		key: 'training-menu',
		label: 'sidebar.training',
		leftIcon: 'icon-training',
		children: [
			{
				key: 'training',
				label: 'sidebar.training',
			},
			{
				key: 'my-certificates',
				label: 'sidebar.myCertificates',
			},
		],
	},
	{
		key: 'toolbox',
		label: 'sidebar.toolbox',
		leftIcon: 'icon-toolbox',
	},
	{
		key: 'induction',
		label: 'sidebar.induction',
		leftIcon: 'icon-ppe',
	},
	{
		key: 'how-to',
		label: 'sidebar.howTo',
		leftIcon: 'icon-help',
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
		leftIcon: 'icon-messages',
	},
	{
		key: 'tickets',
		label: 'sidebar.tickets',
		leftIcon: 'icon-tickets',
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
		key: 'invoices',
		label: 'sidebar.invoices',
		leftIcon: 'icon-invoice',
	},
	{
		key: 'consumables',
		label: 'sidebar.consumables',
		leftIcon: 'icon-consumables',
	},
	{
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-reports',
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
				key: 'monthly-report',
				label: 'sidebar.monthlyReport',
			}
		]
	},
	{
		key: 'customer-personnel',
		label: 'sidebar.customerPersonnel',
		leftIcon: 'icon-staff',
	},
	{
		key: 'how-to',
		label: 'sidebar.howTo',
		leftIcon: 'icon-help',
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
		leftIcon: 'icon-messages',
	},
	{
		key: 'tickets',
		label: 'sidebar.tickets',
		leftIcon: 'icon-tickets',
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
		key: 'field-photos',
		label: 'sidebar.camera',
		leftIcon: 'icon-camera',
	},
	{
		key: 'task-today',
		label: 'sidebar.tasks',
		leftIcon: 'icon-tasks',
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
		key: 'team-meeting',
		label: 'sidebar.teamMeeting',
		leftIcon: 'icon-meeting',
	},
	{
		key: 'meeting-history',
		label: 'sidebar.meetingHistory',
		leftIcon: 'icon-history',
	},
	{
		key: 'invoices',
		label: 'sidebar.invoices',
		leftIcon: 'icon-invoice',
	},
	{
		key: 'consumables',
		label: 'sidebar.consumables',
		leftIcon: 'icon-consumables',
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
		key: 'report',
		label: 'sidebar.report',
		leftIcon: 'icon-reports',
		children: [
			{
				key: 'new-reports',
				label: 'sidebar.newReports',
			},
			{
				key: 'safety-audits',
				label: 'sidebar.safetyAudits',
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
				key: 'monthly-report',
				label: 'sidebar.monthlyReport',
			},
			{
				key: 'incident-report',
				label: 'sidebar.incidentReport',
			},
			{
				key: 'ppe-report',
				label: 'sidebar.ppeReport',
			},
			{
				key: 'report-templates-menu',
				label: 'sidebar.templates',
				children: [
					{
						key: 'report-templates',
						label: 'sidebar.reportTemplates',
					},
					{
						key: 'safety-audit-templates',
						label: 'sidebar.safetyAuditTemplates',
					},
				],
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
				key: 'training-admin',
				label: 'sidebar.trainingAdmin',
			},
			{
				key: 'toolbox-admin',
				label: 'sidebar.toolboxAdmin',
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
		leftIcon: 'icon-ppe',
	},
	{
		key: 'admin',
		label: 'sidebar.admin',
		leftIcon: 'icon-system',
		children: [
			{
				key: 'users-roles',
				label: 'sidebar.usersRoles',
				children: [
					{
						key: 'admins',
						label: 'sidebar.admins',
					},
					{
						key: 'roles',
						label: 'sidebar.roles',
					},
				],
			},
			{
				key: 'settings',
				label: 'sidebar.organisation',
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
		key: 'admin',
		label: 'sidebar.admin',
	},
	{
		key: 'users-roles',
		label: 'sidebar.usersRoles',
	},
	{
		key: 'report-templates-menu',
		label: 'sidebar.templates',
	},
	{
		key: 'admins',
		label: 'sidebar.admins',
	},
	{
		key: 'settings',
		label: 'sidebar.organisation',
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
		key: 'safety-audit-templates',
		label: 'sidebar.safetyAuditTemplates',
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
		key: 'safety-audits',
		label: 'sidebar.safetyAudits',
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
		key: 'consumables',
		label: 'sidebar.consumables',
	},
	{
		key: 'task-today',
		label: 'sidebar.tasks',
	},
	{
		key: 'my-tasks',
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
		path.includes('/') ? path.split('/')[0] : path,
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
