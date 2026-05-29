import serviceType from "@app/constants/serviceType";
import { ListResponse } from "@app/interfaces/ICommon";
import { callAPI } from "@app/lib/helpers/api";
import { all, fork, put, takeEvery } from "@redux-saga/core/effects";
import { notificationComponent } from "@app/components/common/Notification/index";
import errorCode from "@app/constants/errorCode";
import endPoint from '@app/constants/endPoint';
import actions from "./actions";
import intl from '@app/lib/helpers/intlProvider'
import actionType from "../../constants/actionType";
import method from "../../constants/method";

///get list data
function* getDataInit() {
    yield takeEvery(actions.GET_DATA_INIT, function* ({ payload }: any) {
        try {
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.COMMON}/getInitData?items=USERS&items=SITES`, "GET", payload);
            if (response?.code === errorCode.SUCCESS) {
                yield put({
                    type: actions.GET_DATA_INIT_SUCCESS,
                    payload: { data: response?.data }
                })
                return;
            } else {
                yield put({
                    type: actions.GET_DATA_INIT_FAILURE,
                })
                notificationComponent('error', 3, response.message, '');
            }
        } catch (error) {
            notificationComponent('error', 3, error?.message, '');
            yield put({ type: actions.GET_DATA_INIT_FAILURE })
        }
    })

}

///get list data
function* getData() {
    yield takeEvery(actions.GET_DATA, function* ({ payload }: any) {
        try {
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.SERVICES}`, "GET", payload);
            if (response?.code === errorCode.SUCCESS) {
                yield put({
                    type: actions.GET_DATA_SUCCESS,
                    payload: { data: response?.data }
                })
                return;
            } else {
                yield put({
                    type: actions.GET_DATA_FAILURE,
                })
                notificationComponent('error', 3, response.message, '');
            }
        } catch (error) {
            notificationComponent('error', 3, error?.message, '');
            yield put({ type: actions.GET_DATA_FAILURE })
        }
    })

}

///action
function* saveInto({ payload }: any) {
    try {
        const { actionName, data } = payload;
        let response: ListResponse<any> = {
            data: null,
            code: null,
            message: ''
        };
        switch (actionName) {
            case actionType.ADD:
                response = yield callAPI(serviceType.COMMON, endPoint.SERVICES, method.POST, data);
                break;
            case actionType.DELETE:
                response = yield callAPI(serviceType.COMMON, `${endPoint.SERVICES}/${data.id}`, method.DELETE, {});
                break;
            case actionType.UPDATE:
                response = yield callAPI(serviceType.COMMON, `${endPoint.SERVICES}/${data.id}`, method.PATCH, data);
                break;
            default:
                break;
        }
        if (response != null && response.code === 1) {
            yield put({ type: actions.SAVE_INTO_SUCCESS })
            notificationComponent('success', 3, intl.formatMessage({ id: 'notification.success' }), '');
        } else {
            notificationComponent('error', 3, response?.message, '');
            yield put({ type: actions.SAVE_INTO_FAILURE })
        }
    } catch (error) {
        notificationComponent('error', 3, error?.message, '');
        yield put({ type: actions.SAVE_INTO_FAILURE })
    }
}


export default function* rootSaga() {
    yield all([
        fork(getData),
        fork(getDataInit),
        takeEvery(actions.SAVE_INTO, saveInto),
    ])
}