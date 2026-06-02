import { all, fork, put, takeLatest } from 'redux-saga/effects';
import actions from './actions';
import { notificationComponent } from '../../components/common/Notification';
import errorCode from '../../constants/errorCode';
import { ListResponse } from '../../interfaces/ICommon';
import { callAPI } from '../../library/helpers/api';
import serviceType from '../../constants/serviceType';
import endPoint from '../../constants/endPoint';

function* getData() {
  yield takeLatest(actions.GET_DATA, function* ({ payload }: any) {
    try {
      const response: ListResponse<any> = yield callAPI(serviceType.COMMON, `${endPoint.COMMON}/dashboardData`, "GET", payload);
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
                if (response?.message) {
                    notificationComponent('error', 3, response.message, '');
                }
            }
    } catch (error) {
      yield put({
        type: actions.GET_DATA_FAILURE,
      });
      notificationComponent('error', 3, error?.message, '');
    }
  })
}

export default function* dashboardSaga() {
  yield all([
    fork(getData),
  ]);
}