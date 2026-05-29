import dashboardActions from './actions';

const INITIAL_DATA = {
    data: null,
    loading: true,
    error: null,
    success: false,
};

export default function dashboardReducer(state = INITIAL_DATA, action: any) {
    switch (action.type) {
        case dashboardActions.GET_DATA_SUCCESS:
            return {
                ...state,
                data: action.payload.data,
                loading: false,
                error: null,
            };
        case dashboardActions.GET_DATA_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };

        case dashboardActions.GET_DATA:
            return {
                ...state,
                loading: true,
            }
        default:
            return state;
    }
}
