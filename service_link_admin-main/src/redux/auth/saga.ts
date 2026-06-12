import endPoint from '@app/constants/endPoint';
import { notificationComponent } from '@app/components/common/Notification/index';
import { notification } from '@app/components';
import errorCode from './../../constants/errorCode';
import { IData } from '@app/interfaces/IData';
import { callAPI } from '@app/lib/helpers/api';
import { clearToken, getProfile, getToken } from '@app/lib/helpers/utility';
import { createBrowserHistory } from 'history';
import { all, call, fork, put, takeEvery } from 'redux-saga/effects';
import actions from './actions';
import serviceType from './../../constants/serviceType';
import intl from '@app/lib/helpers/intlProvider'
import { userType } from '@app/constants/statusUser';
import env from '@app/config/site.config';

const history = createBrowserHistory();
export function* loginRequest() {
  yield takeEvery(actions.LOGIN_REQUEST, function* (action: any) {
    try {
      const { payload, callback } = action;
      const [res, resSetting]: IData[] = yield all([
        call(callAPI, serviceType.COMMON, 'v1/auth/signIn', 'POST', {
          username: payload.user.username,
          password: payload.user.password,
          version: env.version || '1.0.7',
          type: userType.ADMIN,
        }),
        call(callAPI, serviceType.COMMON, 'v1/settings/getSettings', 'GET'),
      ]);

      if (resSetting?.data) {
        localStorage.setItem('settings', JSON.stringify(resSetting.data));
      }
      if (res && res?.code === errorCode.SUCCESS) {
        yield put({
          type: actions.LOGIN_SUCCESS,
          token: res.data.accessToken,
          rf_token: res.data.refreshToken,
          profile: res.data.user
        });
        if (callback) {
          callback()
        }
      } else {
        notification('error', intl.formatMessage({id: 'notification.userPwdNotMatch'}), '');
        yield put({ type: actions.LOGIN_ERROR });
      }

    } catch (error) {
      notification('error', intl.formatMessage({id: 'notification.userPwdNotMatch'}), '');
      yield put({ type: actions.LOGIN_ERROR });
    }
  });
}

export function* loginSuccess() {
  yield takeEvery(actions.LOGIN_SUCCESS, function* (payload: any) {
    yield localStorage.setItem('id_token', payload.token);
    if(payload.rf_token)
      yield localStorage.setItem('rf_token', payload.rf_token);

    yield localStorage.setItem('profile', JSON.stringify(payload.profile));
    yield localStorage.setItem('userId', payload.profile.id.toString());
   
  });
}

export function* logout() {
  yield takeEvery(actions.LOGOUT, function* () {
    yield clearToken();
    history.push('/');
  });
}

export function* checkAuthorization() {
  yield takeEvery(actions.CHECK_AUTHORIZATION, function* () {
    const token = getToken().get('idToken');
    let profile = null;
    try {
      const raw = getProfile().get('profile');
      profile = raw ? JSON.parse(raw) : null;
    } catch {
      profile = null;
    }
    if (token) {
      yield put({
        type: actions.AUTHORIZATION,
        token,
        profile: profile,
      });
    }
  });
}

export function* forgotPassword() {
  yield takeEvery('FORGOT_PASSWORD', function* ({ payload }: any) {
    let result: IData = yield callAPI(
      serviceType.COMMON,
      'v1/auth/forgotPasswordAdmin',
      'POST',
      { email: payload.email },
    );

    if (result.code === errorCode.SUCCESS) {
      notification('success', intl.formatMessage({id: 'notification.sendMailOTP'}),'');
      yield put({
        type: actions.FORGOT_PASSWORD_SUCCESS,
        isSuccess: true
      });
    } else {
      notification('error', intl.formatMessage({id: 'notification.userEmailNotMatch'}), '');
      yield put({ type: actions.ERROR });
    }
  });
}


export function* resetPassword() {
  yield takeEvery('RESET_PASSWORD', function* ({ payload }: any) {
    const token = String(payload.code || '').trim().toUpperCase();
    let result: IData = yield callAPI(
      serviceType.COMMON,
      'v1/auth/resetPassword',
      'POST',
      { password: payload.password, token },
    );
    if (result.code === errorCode.SUCCESS) {
      notification('success', intl.formatMessage({id: 'notification.success'}), '');
      yield put({
        type: actions.RESET_PASSWORD_SUCCESS,
        isSuccess: true
      });
    } else {
      notification('error', "Invalid OTP code", '');
      yield put({ type: actions.ERROR });
    }
  });
}

///get list data
function* handleRegister() {
  yield takeEvery(actions.REGISTER_START, function* ({ payload }: any) {
      try {
          const response: IData = yield callAPI(
              serviceType.COMMON,
              `${endPoint.REGISTER}`,
              "POST",payload
          );
          if (response?.code === errorCode.SUCCESS) {
              yield put(actions.registerSuccess())
              return;
          } else {
              yield put(actions.registerFailure());
              notificationComponent('error', 3, response.message, '');
          }
      } catch (error) {
          notificationComponent('error', 3, error?.message, '');
          yield put(actions.registerFailure());
      }
  })

}

export default function* rootSaga() {
  yield all([
    fork(checkAuthorization),
    fork(loginRequest),
    fork(loginSuccess),
    fork(logout),
    fork(forgotPassword),
    fork(resetPassword),
    fork(handleRegister)
  ]);
}
