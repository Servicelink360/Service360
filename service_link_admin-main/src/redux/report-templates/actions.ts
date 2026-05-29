const DOCUMENT = "REPORT_TEMPLATE"

const actions = {
    GET_DATA: DOCUMENT + 'GET_DATA',
    GET_DATA_SUCCESS: DOCUMENT + 'GET_DATA_SUCCESS',
    GET_DATA_FAILURE: DOCUMENT + 'GET_DATA_FAILURE',
    MODAL: DOCUMENT + 'MODAL',
    
    SAVE_INTO: DOCUMENT + 'SAVE_INTO',
    SAVE_INTO_SUCCESS: DOCUMENT + 'SAVE_INTO_SUCCESS',
    SAVE_INTO_FAILURE: DOCUMENT + 'SAVE_INTO_FAILURE',

    CLEAR_DATA: DOCUMENT + 'CLEAR_DATA',
   

    GET_INFO: DOCUMENT + 'GET_INFO',
    GET_INFO_SUCCESS: DOCUMENT + 'GET_INFO_SUCCESS',
    GET_INFO_FAILURE: DOCUMENT + 'GET_INFO_FAILURE',

    getData: (payload: any) => {
        return ({
            type: actions.GET_DATA,
            payload
        })
    },
    getInfo: (payload: any) => {
        return ({
            type: actions.GET_INFO,
            payload
        })
    },
    clearData: ()=>{
        return ({
            type: actions.CLEAR_DATA
        })
    },
    ///action
    saveInto: (data: any, actionName:string, isSaveContinue = false) =>{
        return ({
            type: actions.SAVE_INTO,
            payload: { data, actionName },
            isSaveContinue
        })
    },

}
export default actions