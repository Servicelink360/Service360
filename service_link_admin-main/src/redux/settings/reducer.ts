import actions from './actions'

const initialState: any = {
    loading: false,
    success: false,
    rows: [],
    count: 0
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
        case actions.SAVE_INTO:
            return {
                ...state,
                loadingAction: true,
                success: false,
                loading: action.payload?.actionName === 'Delete' ? true : false,
            }
        case actions.SAVE_INTO_SUCCESS:
            return {
                ...state,
                loadingAction: false,
                success: true,
                isSaveAdd: false,
            }
        default:
            return {
                ...state,
            }
    }
}

export default hawbReducer
