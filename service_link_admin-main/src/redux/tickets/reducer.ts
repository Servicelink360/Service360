import actions from './actions'

const initialState: any = {
    rows: [],
    count: 0,
    loading: false,
    success: false,
    row: {},

    loadingAction: false,
    Id: null,
    modalType: null
}

const hawbReducer = (state = initialState, action: any) => {
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
        case actions.MODAL:
            return {
                ...state,
                modalType: action.payload.modalType,
                row: action.payload.row,
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

export default hawbReducer
