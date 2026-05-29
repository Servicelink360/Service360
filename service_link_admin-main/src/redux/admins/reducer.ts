import actions from './actions'

const initialState: any = {
    rows: [],
    count: 0,
    loading: false,
    success: false,
    row: null,

    loadingAction: false,
    Id: null,
    modalType: null,
    roles: [],
    companies: [],
    services: [],
    positions: [],
    groups:[]
}

const adminReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case actions.GET_DATA:
            return {
                ...state,
                success: false,
                loading: true
            }
        case actions.GET_DATA_SUCCESS:
            return {
                ...state,
                loading: false,
                rows: action.payload.data.rows,
                count: action.payload.data.count
            }
        case actions.GET_DATA_INIT_SUCCESS:
            return {
                ...state,
                loading: false,
                roles: action.payload.data.roles,
                companies: action.payload.data.companies,
                services: action.payload.data.services,
                positions: action.payload.data.positions,
                groups: action.payload.data.groups,
            }
        case actions.GET_DATA_FAILURE:
            return {
                ...state,
                loadingAction: false,
                loading: false,
                success: false,
            }
        case actions.SAVE_INTO_FAILURE:
            return {
                ...state,
                loadingAction: false,
                loading: false,
                success: false,
            }
        case actions.CLEAR_DATA:
            return {
                ...initialState,
            }
        case actions.MODAL: {
            const payload =
                action.payload && typeof action.payload === 'object'
                    ? action.payload
                    : { modalType: null, row: null };
            return {
                ...state,
                modalType: payload.modalType ?? null,
                row: payload.row ?? null,
            };
        }
        case actions.SAVE_INTO:
            return {
                ...state,
                loadingAction: true,
                success: false,
                isSaveAdd: action?.isSaveContinue,
                loading: action.payload?.actionName === 'Delete' ? true : false,
            }
        case actions.SAVE_INTO_SUCCESS:
            return {
                ...state,
                loadingAction: false,
                success: true,
                modalType: state.isSaveAdd ? state.modalType : null,
                isSaveAdd: false,
            }
        default:
            return {
                ...state,
            }
    }
}

export default adminReducer
