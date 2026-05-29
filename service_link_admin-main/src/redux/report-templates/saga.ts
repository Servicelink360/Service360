import serviceType from "@app/constants/serviceType";
import { ListResponse } from "@app/interfaces/ICommon";
import { callAPI } from "@app/lib/helpers/api";
import { buildReportTemplateSaveBodies } from "@app/lib/report-templates/templateItemUtils";
import { all, fork, put, takeEvery } from "@redux-saga/core/effects";
import { notificationComponent } from "@app/components/common/Notification/index";
import errorCode from "@app/constants/errorCode";
import endPoint from '@app/constants/endPoint';
import actions from "./actions";
import intl from '@app/lib/helpers/intlProvider'
import actionType from "../../constants/actionType";
import method from "../../constants/method";

function* getData() {
    yield takeEvery(actions.GET_DATA, function* ({ payload }: any) {
        try {
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.REPORT_TEMPLATES}`, "GET", payload);
            if (response?.code === errorCode.SUCCESS) {
                yield put({
                    type: actions.GET_DATA_SUCCESS,
                    payload: { data: response?.data }
                })
                return;
            }
            yield put({ type: actions.GET_DATA_FAILURE })
            notificationComponent('error', 3, response.message, '');
        } catch (error: any) {
            notificationComponent('error', 3, error?.message, '');
            yield put({ type: actions.GET_DATA_FAILURE })
        }
    })
}

function* getInfo() {
    yield takeEvery(actions.GET_INFO, function* ({ payload }: any) {
        try {
            const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.REPORT_TEMPLATES}/` + payload, "GET");
            if (response?.code === errorCode.SUCCESS) {
                yield put({
                    type: actions.GET_INFO_SUCCESS,
                    payload: { data: response?.data }
                })
                return;
            }
            yield put({ type: actions.GET_INFO_FAILURE })
            notificationComponent('error', 3, response.message, '');
        } catch (error: any) {
            notificationComponent('error', 3, error?.message, '');
            yield put({ type: actions.GET_INFO_FAILURE })
        }
    })
}

const formatApiErrorMessage = (response: any, fallback: string) => {
    if (!response) return fallback
    if (Array.isArray(response.message)) {
        return response.message.join(', ')
    }
    if (typeof response.message === 'string' && response.message.trim()) {
        return response.message
    }
    const nested = response?.details?.message
    if (Array.isArray(nested)) return nested.join(', ')
    if (typeof nested === 'string' && nested.trim()) return nested
    return fallback
}

function* saveInto({ payload }: any) {
    try {
        const { actionName, data } = payload;
        let response: ListResponse<any> = {
            data: null,
            code: null,
            message: ''
        };

        switch (actionName) {
            case actionType.ADD: {
                const { meta } = buildReportTemplateSaveBodies(data, {
                    isEdit: false,
                    includeItems: true,
                });
                response = yield callAPI(serviceType.COMMON, endPoint.REPORT_TEMPLATES, method.POST, meta);
                break;
            }
            case actionType.DELETE:
                response = yield callAPI(serviceType.COMMON, `${endPoint.REPORT_TEMPLATES}/${data.id}`, method.DELETE, {});
                break;
            case actionType.UPDATE: {
                const { meta, items } = buildReportTemplateSaveBodies(data, {
                    isEdit: true,
                    includeItems: true,
                });
                response = yield callAPI(
                    serviceType.COMMON,
                    `${endPoint.REPORT_TEMPLATES}/${data.id}`,
                    method.PATCH,
                    meta,
                );
                if (response?.code === errorCode.SUCCESS && items) {
                    response = yield callAPI(
                        serviceType.COMMON,
                        `${endPoint.REPORT_TEMPLATES}/${data.id}/items`,
                        method.PUT,
                        { items },
                    );
                }
                break;
            }
            case actionType.DUPLICATE:
                response = yield callAPI(serviceType.COMMON, `${endPoint.REPORT_TEMPLATES}/${data.id}/duplicate`, method.POST, {});
                break;
            default:
                break;
        }

        if (response != null && response.code === 1) {
            yield put({ type: actions.SAVE_INTO_SUCCESS })
            if (actionName === actionType.UPDATE && data?.id) {
                yield put(actions.getInfo(data.id))
            }
            const successMsg = response?.message || intl.formatMessage({ id: 'notification.success' });
            notificationComponent('success', 3, successMsg, '');
        } else {
            notificationComponent('error', 3, formatApiErrorMessage(response, 'Save failed'), '');
            yield put({ type: actions.SAVE_INTO_FAILURE })
        }
    } catch (error: any) {
        notificationComponent('error', 3, error?.message, '');
        yield put({ type: actions.SAVE_INTO_FAILURE })
    }
}

export default function* rootSaga() {
    yield all([
        fork(getData),
        fork(getInfo),
        takeEvery(actions.SAVE_INTO, saveInto),
    ])
}
