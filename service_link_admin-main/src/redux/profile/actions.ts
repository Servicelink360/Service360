const profileActions = {
  FETCH_PROFILE_DATA_START: 'FETCH_PROFILE_DATA_START',
  FETCH_PROFILE_DATA_SUCCESS: 'FETCH_PROFILE_DATA_SUCCESS',
  FETCH_PROFILE_DATA_FAILURE: 'FETCH_PROFILE_DATA_FAILURE',
  SET_PROFILE_DATA: 'SET_PROFILE_DATA',
  CHANGE_PROFILE: 'CHANGE_PROFILE',
  CHANGE_PROFILE_SUCCESS: 'CHANGE_PROFILE_SUCCESS',
  CHANGE_PROFILE_FAILURE: 'CHANGE_PROFILE_FAILURE',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  CHANGE_PASSWORD_SUCCESS: 'CHANGE_PASSWORD_SUCCESS',
  CHANGE_PASSWORD_FAILURE: 'CHANGE_PASSWORD_FAILURE',
  fetchProfileDataStart: () => ({
    type: profileActions.FETCH_PROFILE_DATA_START,
  }),
  fetchProfileDataSuccess: (profile: any) => ({
    type: profileActions.FETCH_PROFILE_DATA_SUCCESS,
    payload: profile,
  }),
  fetchProfileDataFailure: (error: any) => ({
    type: profileActions.FETCH_PROFILE_DATA_FAILURE,
    payload: error,
  }),
  changeProfile: (profile: any) => ({
    type: profileActions.CHANGE_PROFILE,
    payload: profile
  }),
  changeProfileSuccess: () => ({
    type: profileActions.CHANGE_PROFILE_SUCCESS,
    // payload: payload,
  }),
  changeProfileFailure: (error: any) => ({
    type: profileActions.CHANGE_PROFILE_FAILURE,
    payload: error,
  }),
  changePassword: (error: any) => ({
    type: profileActions.CHANGE_PASSWORD,
    payload: error,
  }),
  changePasswordSuccess: () => ({
    type: profileActions.CHANGE_PASSWORD_SUCCESS,
    // payload: payload,
  }),
  changePasswordFailure: (error: any) => ({
    type: profileActions.CHANGE_PASSWORD_FAILURE,
    payload: error,
  }),
};

export default profileActions;
