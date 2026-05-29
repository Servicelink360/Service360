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

function* getDataInit() {
    yield takeEvery(actions.GET_DATA_INIT, function* ({ payload }: any) {
        try {
            let items = 'items=REPORT_TEMPLATES';
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.COMMON}/getInitData?${items}`, "GET");
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
            let subPoint = 'getAllUserTasksByUserId';
            if (payload.today) {
                subPoint = 'getAllUserTasksByUserId';
            }
            if (payload.isAdmin && +payload.isAdmin === 1) {
                subPoint = 'getAllUserTasksByUserId'
            }
            if (payload.staffAttendance ===1) {
                subPoint = 'getAllUserTasksByUserId'
            }
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/${subPoint}`, "GET", payload);
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

///get info
function* getInfo() {
    yield takeEvery(actions.GET_INFO, function* ({ payload }: any) {
        try {
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}` + payload, "GET");
            if (response?.code === errorCode.SUCCESS) {
                yield put({
                    type: actions.GET_INFO_SUCCESS,
                    payload: { data: response?.data }
                })
                return;
            } else {
                yield put({
                    type: actions.GET_INFO_FAILURE,
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
        let data_output: ListResponse<any> = {
            data: null,
            code: null,
            message: ''
        };
        switch (actionName) {
            case actionType.ADD:
                data_output = yield callAPI(serviceType.COMMON, endPoint.USER_TASKS, method.POST, data);
                break;
            case actionType.DELETE:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/${data.id}`, method.DELETE, {});
                break;
            case actionType.UPDATE:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/${data.id}`, method.PATCH, data);
                break;
            case actionType.CHANGE_STATUS:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/changeStatus/${data.id}`, method.PATCH, data);
                break;
            case actionType.CHECK_IN:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/checkIn`, method.POST, data);
                break;
            case actionType.CREATE_REPORT:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/updateReport/${data.id}`, method.POST, data);
                break;

            case actionType.CHECK_OUT:
                data_output = yield callAPI(serviceType.COMMON, `${endPoint.USER_TASKS}/checkOut/${data.id}`, method.POST, data);
                break;
            default:
                break;
        }
        if (data_output != null && data_output.code === 1) {
            yield put({ type: actions.SAVE_INTO_SUCCESS })
            notificationComponent('success', 3, intl.formatMessage({ id: 'notification.success' }), '');
        } else {
            notificationComponent('error', 3, data_output?.message, '');
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
        fork(getInfo),
        takeEvery(actions.SAVE_INTO, saveInto),
    ])
}