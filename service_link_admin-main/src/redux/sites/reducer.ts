import actions from './actions'
import { buildCustomerCompanyOptions } from '@app/lib/helpers/customerCompanyOptions'

const initialState: any = {
    rows: [],
    count: 0,
    loading: false,
    success: false,
    row: {},
    info: {},
    loadingAction: false,
    Id: null,
    modalType: null,
    services: [],
    reportTemplates: [],
    sites:[]
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
        case actions.GET_DATA_INIT_SUCCESS:
            const data = action?.payload?.data;
            return {
                ...state,
                loading: false,
                services: data?.services,
                sites: data?.sites,
                reportTemplates: data?.reportTemplates,
                shifts: data?.shifts,
                staffs: data && data?.users ? data?.users?.filter(c => +c.type === 2) : [],
                customerUsers: data && data?.users ? data?.users?.filter(c => +c.type === 1) : [],
                customers:
                    data?.customerCompanies?.length > 0
                        ? data.customerCompanies
                        : buildCustomerCompanyOptions(data?.users ?? []),
            }
        case actions.CLEAR_DATA:
            return {
                ...initialState,
            }
        case actions.MODAL: {
            const payload = action.payload;
            if (
                payload == null ||
                payload === '' ||
                (typeof payload === 'object' && payload.modalType == null)
            ) {
                return {
                    ...state,
                    modalType: null,
                    row: {},
                };
            }
            return {
                ...state,
                modalType: payload.modalType,
                row: payload.row ?? {},
            };
        }

        case actions.GET_INFO_SUCCESS:
            return {
                ...state,
                info: action.payload.data,
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
        case actions.RELOAD:
            return {
                ...state,
                loadingAction: false,
                success: true,
                modalType: action.payload.modalType,
                row: action.payload.row,
            }
        default:
            return {
                ...state,
            }
    }
}

export default hawbReducer
