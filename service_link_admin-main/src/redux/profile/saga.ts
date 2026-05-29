import { all, takeEvery, put } from 'redux-saga/effects';
import actions from './actions';
import { callAPI } from '@app/lib/helpers/api';
import { IData } from '@app/interfaces/IData';
import { notification } from '@app/components';
import serviceType from '../../constants/serviceType';
import endPoint from '@app/constants/endPoint';
import intl  from '@app/lib/helpers/intlProvider'
function* fetchProfileDataEffect(action: any) {
  try {
    let vData: IData = (yield callAPI(serviceType.COMMON, endPoint.GET_USER_PROFILE, "GET", null));
    if (vData != null && vData?.code === 1) {
      yield localStorage.setItem('profile', JSON.stringify(vData.data));
      let resSetting: IData = yield callAPI(serviceType.COMMON, "v1/settings/getSettings", "GET");
      localStorage.setItem('settings',JSON.stringify(resSetting.data))
      const data = {
        data: vData.data,
      }
      localStorage.setItem("profile", JSON.stringify(vData.data));
      yield put(actions.fetchProfileDataSuccess(data));
    }
  } catch (error) {
    yield put(actions.fetchProfileDataFailure(error));
  }
}

function* updateProfile({ payload }: any) {
  try {
    let res: IData = (yield callAPI(serviceType.COMMON, endPoint.CHANGE_PROFILE , "PUT", payload));
    if (res && res?.code === 1) {
        notification('success', intl.formatMessage({id: 'notification.success'}), '');
      yield put(actions.changeProfileSuccess());
    } else {
      if (res?.message)
        notification('error', res?.message, '');
      yield put(actions.changeProfileFailure(res?.message));
    }
  } catch (error) {

    notification('error', (error as Error).message, '');
    yield put(actions.changeProfileFailure(error));
  }
}

function* changePassword({ payload }: any) {
  try {
    let res: IData = (yield callAPI(serviceType.COMMON, endPoint.CHANGE_PASSWORD, "PUT", payload));

    if (res && (res?.code === 1 || res?.code === 2)) {
      notification('success',  intl.formatMessage({id: 'notification.success'}), '');
      yield put(actions.changePasswordSuccess());
    }else if (res && (res?.code === 7)) {
      notification('error', "Mật khẩu hiện tại không khớp", '');
      yield put(actions.changePasswordFailure(res?.message));
    } else {
      notification('error', res?.message , '');
      yield put(actions.changePasswordFailure(res?.message));
    }
  } catch (error) {

    notification('error', (error as Error).message, '');
    yield put(actions.changePasswordFailure(error));
  }
}
export default function* profileSaga() {
  yield all([
    takeEvery(actions.FETCH_PROFILE_DATA_START, fetchProfileDataEffect),
    takeEvery(actions.CHANGE_PROFILE, updateProfile),
    takeEvery(actions.CHANGE_PASSWORD, changePassword),
  ]);
}
