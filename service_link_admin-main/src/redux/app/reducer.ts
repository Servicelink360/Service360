import { getDefaultPath } from '@app/lib/helpers/url_sync';
import actions, { getView } from './actions';
import { isServer } from '@app/lib/helpers/isServer';
const initialMenu = getDefaultPath();
const initState = {
	collapsed: !isServer && window.innerWidth > 1220 ? false : true,
	view: !isServer && getView(window.innerWidth),
	height: !isServer && window.innerHeight,
	openDrawer: false,
	openKeys: initialMenu.openKeys,
	current: initialMenu.current,
};

export default function appReducer(state = initState, action: any) {
	switch (action.type) {
		case actions.COLLPSE_CHANGE:
			return {
				...state,
				collapsed: !state.collapsed,
			};
		case actions.COLLPSE_CLOSE_DRAWER:
			return {
				...state,
				collapsed: false,
			};
		case actions.COLLPSE_OPEN_DRAWER:
			return {
				...state,
				openDrawer: !state.openDrawer,
			};
		case actions.SET_OPEN_DRAWER:
			if (state.openDrawer === action.open) {
				return state;
			}
			return {
				...state,
				openDrawer: action.open,
			};
		case actions.TOGGLE_ALL:
			if (state.view !== action.view || action.height !== state.height) {
				const height = action.height ? action.height : state.height;
				return {
					...state,
					collapsed: action.collapsed,
					view: action.view,
					height,
				};
			}
			break;
		case actions.CHANGE_OPEN_KEYS: {
			const next = action.openKeys || [];
			const prev = state.openKeys || [];
			if (
				prev.length === next.length &&
				prev.every((key: string, i: number) => String(key) === String(next[i]))
			) {
				return state;
			}
			return {
				...state,
				openKeys: next,
			};
		}
		case actions.CHANGE_CURRENT: {
			const next = action.current || [];
			const prev = state.current || [];
			if (
				prev.length === next.length &&
				prev.every((key: string, i: number) => String(key) === String(next[i]))
			) {
				return state;
			}
			return {
				...state,
				current: next,
			};
		}
		case actions.CLEAR_MENU:
			return {
				...state,
				openKeys: [],
				current: [],
			};
		
		default:
			return state;
	}
	return state;
}
