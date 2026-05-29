import profileActions from './actions';

const INITIAL_DATA = {
  data: null,
  loading: true,
  error: null,
  gender: null,
  success: false
};
export default function profileReducer(state = INITIAL_DATA, action: any) {
  switch (action.type) {
    case profileActions.FETCH_PROFILE_DATA_START:
      return {
        loading: true,
        data: null,
        dashboard: null,
        gender: null,
        idType: null,
        uiLanguage: null,
      }
    case profileActions.FETCH_PROFILE_DATA_SUCCESS: 
      return {
        ...state,
        data: {...action.payload.data},
        gender: action.payload.gender,
        loading: false,
        error: null,
      };
    
    case profileActions.FETCH_PROFILE_DATA_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case profileActions.CHANGE_PROFILE:

      return {
        ...state,
        // loading: true,
        success: false,
        error: null,
      };
    case profileActions.CHANGE_PROFILE_SUCCESS:

      return {
        ...state,
        // loading: false,
        success: true,
        error: null,
      };
    case profileActions.CHANGE_PROFILE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case profileActions.CHANGE_PASSWORD:
      return {
        ...state,
        loading: true
      }
    case profileActions.CHANGE_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false
      }
    case profileActions.CHANGE_PASSWORD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      }
    default:
      return state;
  }
}
