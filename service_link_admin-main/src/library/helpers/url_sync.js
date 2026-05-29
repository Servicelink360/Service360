import qs from 'qs';
import sidebarMenu from '../../containers/Sidebar/options';
import { isServer } from './isServer';

const adminMenuOptions = sidebarMenu.default || sidebarMenu;

export function getInitData() {
  if (!isServer) {
    const initData = qs.parse(window.location.search.slice(1));
    if (initData.toggle)
      initData.toggle.free_shipping =
        initData.toggle.free_shipping === 'true' ? true : undefined;
    return initData;
  }
  return false;
}

export function setUrl(searchState) {
  if (!isServer) {
    const search = searchState
      ? `${window.location.pathname}?${qs.stringify(searchState)}`
      : '';
    window.history.pushState(searchState, null, search);
  }
  return;
}

function findAncestorsInMenu(leafKey, menuOptions) {
  const target = String(leafKey || '').split('?')[0];
  const walk = (items, trail) => {
    for (const item of items) {
      const itemPath = String(item.key).split('?')[0];
      if (itemPath === target || item.key === leafKey) {
        return [item.key, ...trail];
      }
      if (item.children?.length) {
        const found = walk(item.children, [item.key, ...trail]);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  return walk(menuOptions, []) || [leafKey];
}

function menuItemHasChildren(key, menuOptions) {
  const walk = (items) => {
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

function findOpenKeysInMenu(leafKey, menuOptions) {
  const ancestors = findAncestorsInMenu(leafKey, menuOptions);
  if (ancestors.length > 1) {
    return ancestors.slice(1).map(String);
  }
  if (ancestors.length === 1 && menuItemHasChildren(ancestors[0], menuOptions)) {
    return [String(ancestors[0])];
  }
  return [];
}

/** Initial menu highlight + open submenus for current URL (admin menu tree). */
export function getDefaultPath() {
  if (isServer || !window.location.pathname) {
    return { current: [], openKeys: [] };
  }
  const routes = window.location.pathname.split('/');
  if (routes.length <= 1) {
    return { current: [], openKeys: [] };
  }
  const segment = routes[routes.length - 1];
  const leaf = segment + (window.location.search || '');
  return {
    current: findAncestorsInMenu(leaf, adminMenuOptions),
    openKeys: findOpenKeysInMenu(leaf, adminMenuOptions),
  };
}
