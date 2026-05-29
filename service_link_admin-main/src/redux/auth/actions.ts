const actions = {
  CHECK_AUTHORIZATION: 'CHECK_AUTHORIZATION',
  LOGIN_REQUEST: 'LOGIN_REQUEST',
  LOGOUT: 'LOGOUT',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  FORGOT_PASSWORD_SUCCESS: "FORGOT_PASSWORD_SUCCESS",
  RESET_PASSWORD: "RESET_PASSWORD",
  RESET_PASSWORD_SUCCESS: "RESET_PASSWORD_SUCCESS",
  ERROR: "ERROR",
  RESET_SIGNIN: "RESET_SIGNIN",
  RESET_STORE: "RESET_STORE",
  SET_PROFILE: "SET_PROFILE",
  GET_ROLES: "GET_ROLES",
  UPLOAD_TOKEN_NOTI: "UPLOAD_TOKEN_NOTI",
  REFRESH_PAGE: "REFRESH_PAGE",
  AUTHORIZATION: "AUTHORIZATION",

  REGISTER_CLEAR: 'REGISTER_CLEAR',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',

  registerStart: (data: any) => {
    return ({
      type: actions.REGISTER_START,
      payload: data
    })
  },

  registerSuccess: () => {
    return ({
      type: actions.REGISTER_SUCCESS
    })
  },

  registerFailure: () => {
    return ({
      type: actions.REGISTER_FAILURE
    })
  },

  regiterClear: () => {
    return ({
      type: actions.REGISTER_CLEAR
    })
  },

  checkAuthorization: () => ({ type: actions.CHECK_AUTHORIZATION }),
  login: (user: any, callback: any = null) => ({
    type: actions.LOGIN_REQUEST,
    payload: { user },
    callback
  }),
  refreshPage: () => ({
    type: actions.REFRESH_PAGE
  }),
  logout: () => ({
    type: actions.LOGOUT,
  }),
  forgotPassword: (email: string) => ({
    type: actions.FORGOT_PASSWORD,
    payload: email,
  }),
  resetPassword: (formReset: { password: string, code: string }) => ({
    type: actions.RESET_PASSWORD,
    payload: formReset,
  }),
  resetStore: () => ({
    type: actions.RESET_STORE,
  }),
  setProfile: (data: any) => ({
    type: actions.SET_PROFILE,
    payload: data
  }),
  uploadNotiToken: (data: any) => ({
    type: actions.UPLOAD_TOKEN_NOTI,
    payload: data
  })
};
export default actions;
