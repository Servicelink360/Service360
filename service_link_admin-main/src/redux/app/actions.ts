export function getView(width: number) {
  let newView = 'MobileView';
  if (width > 1220) {
    newView = 'DesktopView';
  } else if (width > 767) {
    newView = 'TabView';
  }
  return newView;
}
const actions = {
  COLLPSE_CHANGE: 'COLLPSE_CHANGE',
  COLLPSE_OPEN_DRAWER: 'COLLPSE_OPEN_DRAWER',
  SET_OPEN_DRAWER: 'SET_OPEN_DRAWER',
  COLLPSE_CLOSE_DRAWER: 'COLLPSE_CLOSE_DRAWER',
  CHANGE_OPEN_KEYS: 'CHANGE_OPEN_KEYS',
  TOGGLE_ALL: 'TOGGLE_ALL',
  CHANGE_CURRENT: 'CHANGE_CURRENT',
  CLEAR_MENU: 'CLEAR_MENU',
  toggleCollapsed: () => ({
    type: actions.COLLPSE_CHANGE,
  }),
  closeCollapsed: () => ({
    type: actions.COLLPSE_CLOSE_DRAWER
  }),
  toggleAll: (width: number, height: number) => {
    const view = getView(width);
    const collapsed = view !== 'DesktopView';
    return {
      type: actions.TOGGLE_ALL,
      collapsed,
      view,
      height,
    };
  },
  toggleOpenDrawer: () => ({
    type: actions.COLLPSE_OPEN_DRAWER,
  }),
  setOpenDrawer: (open: boolean) => ({
    type: actions.SET_OPEN_DRAWER,
    open,
  }),
  changeOpenKeys: (openKeys: any) => ({
    type: actions.CHANGE_OPEN_KEYS,
    openKeys,
  }),
  changeCurrent: (current: any) => ({
    type: actions.CHANGE_CURRENT,
    current,
  }),
  clearMenu: () => ({ type: actions.CLEAR_MENU }),
};
export default actions;
