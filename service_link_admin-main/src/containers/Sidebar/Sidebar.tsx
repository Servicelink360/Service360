import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouteMatch, useLocation } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';
import { Drawer, Layout } from 'antd';
import Scrollbars from '@app/components/utility/customScrollBar';
import appActions from '@app/redux/app/actions';
import Logo from '@app/components/utility/logo';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';
import SidebarWrapper from './Sidebar.styles';
import GroupedSidebarNav from './GroupedSidebarNav';
import options, {
	adminNavGroups,
	applyNavGroups,
	customerNavGroups,
	findMenuAncestors,
	findMenuOpenKeys,
	optionsCustomer,
	optionsStaff,
	staffNavGroups,
} from './options';
const { Sider } = Layout;

const { toggleOpenDrawer, setOpenDrawer, changeOpenKeys, changeCurrent } =
	appActions;

export default function Sidebar() {
	const dispatch = useDispatch();
	const match = useRouteMatch();
	const location = useLocation();
	const isMobilePortrait = useMobilePortrait();
	const { openKeys, collapsed, openDrawer } = useSelector((state: any) => state.App);

	const closeMobileMenu = React.useCallback(() => {
		if (isMobilePortrait && openDrawer) dispatch(setOpenDrawer(false));
	}, [dispatch, isMobilePortrait, openDrawer]);

	const prevPathRef = React.useRef(location.pathname);
	React.useEffect(() => {
		if (!isMobilePortrait) return;
		if (prevPathRef.current !== location.pathname) {
			prevPathRef.current = location.pathname;
			if (openDrawer) dispatch(setOpenDrawer(false));
		}
	}, [location.pathname, isMobilePortrait, dispatch, openDrawer]);

	const pathLeaf = React.useMemo(() => {
		const segment = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
		return segment + (location.search || '');
	}, [location.pathname, location.search]);

	const profile = React.useMemo(() => {
		const profileRaw = localStorage.getItem('profile');
		if (!profileRaw) {
			return null;
		}
		try {
			return JSON.parse(profileRaw);
		} catch {
			return null;
		}
	}, []);

	const optionsPermisstion: any[] = React.useMemo(() => {
		const flat =
			profile && +profile.type === 3
				? options
				: profile && +profile.type === 2
					? optionsStaff
					: profile && +profile.type === 1
						? optionsCustomer
						: [];
		const groups =
			profile && +profile.type === 3
				? adminNavGroups
				: profile && +profile.type === 2
					? staffNavGroups
					: profile && +profile.type === 1
						? customerNavGroups
						: [];
		let base = groups.length ? applyNavGroups(flat, groups) : flat;
		// Extra Users menu only for admin accounts (type 3), never staff/customer.
		if (
			profile &&
			+profile.type === 3 &&
			profile?.roles?.find((c: { roleId: string }) => c.roleId === 'USER')
		) {
			base = [
				...base,
				{
					key: 'user',
					label: 'sidebar.users',
					leftIcon: 'icon-users',
					children: [
						{
							key: 'admins',
							label: 'sidebar.admin',
						},
					],
				},
			];
		}
		return base;
	}, [profile]);

	const menuPathRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		const nextCurrent = findMenuAncestors(pathLeaf, optionsPermisstion);
		dispatch(changeCurrent(nextCurrent));
		if (menuPathRef.current === pathLeaf) {
			return;
		}
		menuPathRef.current = pathLeaf;
		dispatch(changeOpenKeys(findMenuOpenKeys(pathLeaf, optionsPermisstion)));
	}, [pathLeaf, dispatch, optionsPermisstion]);

	function onOpenChange(newOpenKeys: string[]) {
		dispatch(changeOpenKeys(newOpenKeys.map(String)));
	}

	const isCollapsed = collapsed && !openDrawer;
	const onMouseEnter = () => {
		if (collapsed && openDrawer === false) {
			dispatch(toggleOpenDrawer());
		}
	};
	const onMouseLeave = () => {
		if (collapsed && openDrawer === true) {
			dispatch(toggleOpenDrawer());
		}
	};

	const resolvedOpenKeys =
		isCollapsed && !isMobilePortrait ? [] : (openKeys ?? []).map(String);

	const menuList = (
		<GroupedSidebarNav
			options={optionsPermisstion}
			url={match.url}
			pathLeaf={pathLeaf}
			openKeys={resolvedOpenKeys}
			onOpenChange={onOpenChange}
			onNavigate={closeMobileMenu}
		/>
	);

	const menuNode = isMobilePortrait ? (
		<div className="mainNav mobile-sidebar-nav">{menuList}</div>
	) : (
		<>
			<Logo collapsed={false} />
			<Scrollbars className="mainNav">
				{menuList}
			</Scrollbars>
		</>
	);

	if (isMobilePortrait) {
		const drawerWidth =
			typeof window !== 'undefined' ? window.innerWidth : 360;

		return (
			<SidebarWrapper>
				<Drawer
					placement="left"
					open={openDrawer}
					onClose={closeMobileMenu}
					width={drawerWidth}
					className="mobile-left-nav-drawer"
					zIndex={1100}
					bodyStyle={{
						padding: 0,
						background:
							'radial-gradient(120% 55% at 0% 0%, rgba(120, 220, 80, 0.28) 0%, transparent 55%), linear-gradient(165deg, #06452b 0%, #00351f 48%, #002b1b 100%)',
					}}
					headerStyle={{ display: 'none' }}
					closable={false}
					maskClosable
					drawerStyle={{ width: drawerWidth, maxWidth: '100vw' }}
				>
					<div className="isomorphicSidebar isomorphicSidebar--drawer">
						{/* Native button — Ant Design dark btn CSS was stripping the circle */}
						<button
							type="button"
							className="mobile-sidebar-close"
							aria-label="Close menu"
							onClick={closeMobileMenu}
						>
							<CloseOutlined />
						</button>
						<div
							className="mobile-sidebar-header"
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								justifyContent: 'center',
								padding: '16px 56px 8px 16px',
								background: 'transparent',
							}}
						>
							<div
								className="mobile-sidebar-header__brand"
								style={{
									background: 'transparent',
									padding: '4px 8px',
									maxWidth: 'calc(100% - 8px)',
								}}
							>
								<Logo collapsed={false} mobileDrawer />
							</div>
						</div>
						{menuNode}
					</div>
				</Drawer>
			</SidebarWrapper>
		);
	}

	return (
		<SidebarWrapper>
			<Sider
				trigger={null}
				collapsible={true}
				collapsed={isCollapsed}
				width="250px"
				className='isomorphicSidebar'
				id="main_side_bar"
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
			>
				{menuNode}
			</Sider>

		</SidebarWrapper>
	);
}
