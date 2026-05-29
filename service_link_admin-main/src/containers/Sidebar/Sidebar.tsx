import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouteMatch, useLocation } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Drawer, Layout, Menu } from 'antd';
import Scrollbars from '@app/components/utility/customScrollBar';
import appActions from '@app/redux/app/actions';
import Logo from '@app/components/utility/logo';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';
import SidebarWrapper from './Sidebar.styles';
import { buildSidebarMenuItems } from './SidebarMenu';
import options, {
	findMenuAncestors,
	findMenuOpenKeys,
	findMenuSelectedKey,
	optionsCustomer,
	optionsStaff,
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
		if (isMobilePortrait) dispatch(setOpenDrawer(false));
	}, [dispatch, isMobilePortrait]);

	const prevPathRef = React.useRef(location.pathname);
	React.useEffect(() => {
		if (!isMobilePortrait) return;
		if (prevPathRef.current !== location.pathname) {
			prevPathRef.current = location.pathname;
			dispatch(setOpenDrawer(false));
		}
	}, [location.pathname, isMobilePortrait, dispatch]);

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
		const base =
			profile && +profile.type === 3
				? options
				: profile && +profile.type === 2
					? optionsStaff
					: profile && +profile.type === 1
						? optionsCustomer
						: [];
		if (profile?.roles?.find((c: { roleId: string }) => c.roleId === 'USER')) {
			return [
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
		dispatch(changeCurrent(findMenuAncestors(pathLeaf, optionsPermisstion)));
		if (menuPathRef.current === pathLeaf) {
			return;
		}
		menuPathRef.current = pathLeaf;
		dispatch(changeOpenKeys(findMenuOpenKeys(pathLeaf, optionsPermisstion)));
	}, [pathLeaf, dispatch, optionsPermisstion]);

	function handleClick() {
		closeMobileMenu();
	}

	function onOpenChange(newOpenKeys: string[]) {
		dispatch(changeOpenKeys(newOpenKeys.map(String)));
	}

	const isCollapsed = collapsed && !openDrawer;
	const mode = isCollapsed === true ? 'vertical' : 'inline';
	const onMouseEnter = (event: any) => {
		if (collapsed && openDrawer === false) {
			dispatch(toggleOpenDrawer());
		}
		return;
	};
	const onMouseLeave = () => {
		if (collapsed && openDrawer === true) {
			dispatch(toggleOpenDrawer());
		}
		return;
	};

	const submenuStyle = React.useMemo(
		() => ({ backgroundColor: '#397d36' }),
		[],
	);
	const submenuColor = React.useMemo(() => ({}), []);

	// !profile.roles ? [] : (profile.roles.find(c => c.roleId === 'ADMIN')) ? options :
	// profile.roles.find(c => c.roleId === 'ORDER') ? [
	// 	{
	// 		key: 'dashboard',
	// 		label: 'sidebar.dashboard',
	// 		leftIcon: 'svg-dashboard'
	// 	},
	// 	{
	// 		key: 'orders',
	// 		label: 'sidebar.orders',
	// 		leftIcon: 'icon-package',
	// 	}] : [
	// 	{
	// 		key: 'orders',
	// 		label: 'sidebar.orders',
	// 		leftIcon: 'icon-package',
	// 	}
	// ];
	const menuItems = React.useMemo(
		() => buildSidebarMenuItems(optionsPermisstion, match.url, submenuStyle, submenuColor),
		[optionsPermisstion, match.url, submenuStyle, submenuColor],
	);

	const selectedMenuKeys = React.useMemo(() => {
		const key = findMenuSelectedKey(pathLeaf, optionsPermisstion);
		return key ? [key] : [];
	}, [pathLeaf, optionsPermisstion]);

	const resolvedOpenKeys =
		isCollapsed && !isMobilePortrait ? [] : (openKeys ?? []).map(String);

	const menuList = (
		<Menu
			onClick={handleClick}
			theme='dark'
			className='isoDashboardMenu'
			mode={isMobilePortrait ? 'inline' : mode}
			openKeys={resolvedOpenKeys}
			selectedKeys={selectedMenuKeys}
			onOpenChange={onOpenChange}
			triggerSubMenuAction='click'
			items={menuItems}
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
					bodyStyle={{ padding: 0, background: '#397d36' }}
					headerStyle={{ display: 'none' }}
					closable={false}
					maskClosable
					drawerStyle={{ width: drawerWidth, maxWidth: '100vw' }}
				>
					<div className="isomorphicSidebar isomorphicSidebar--drawer">
						<Button
							type="default"
							shape="circle"
							size="large"
							icon={<CloseOutlined />}
							onClick={closeMobileMenu}
							aria-label="Close menu"
							className="mobile-sidebar-close"
							style={{
								position: 'fixed',
								top: 12,
								right: 12,
								zIndex: 1101,
								width: 44,
								height: 44,
								minWidth: 44,
								padding: 0,
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: '#fff',
								border: 'none',
								boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
							}}
						/>
						<div
							className="mobile-sidebar-header"
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								padding: '10px 56px 10px 10px',
								background: '#397d36',
							}}
						>
							<div
								className="mobile-sidebar-header__brand"
								style={{
									background: '#fff',
									padding: '8px 10px',
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
				width="240px"
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
