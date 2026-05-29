import actions from "./actions";
interface IState {
  signin: any;
  idToken: string | null;
  notiToken: string | null;
  profile: {};
  isSuccess: false;
  isSuccess_reset: false;
  loading: false;
  roles: any[];
  refresh: boolean;
  loadingRegister: boolean,
  isRegisterSuccess: boolean
}
const data = localStorage.getItem("signin");
const save = data && JSON.parse(data);
const initState: IState = {
  idToken: null,
  notiToken: null,
  signin: save ? save : "",
  profile: {},
  isSuccess: false,
  loading: false,
  isSuccess_reset: false,
  roles: [],
  refresh: false,

  loadingRegister: false,
  isRegisterSuccess: false

};

export default function authReducer(state = initState, action: any) {
  switch (action.type) {
    case actions.LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
      }
    case actions.LOGIN_SUCCESS: 
      return {
        idToken: action.token,
        profile: action.profile,
        loading: false,
        refresh: true
      };
    case actions.AUTHORIZATION: 
      return {
        idToken: action.token,
        profile: action.profile,
        loading: false,
      };
    case actions.LOGIN_ERROR:
      return {
        ...state,
        loading: false
      }
    case actions.REFRESH_PAGE: 
      return {
        ...state,
        refresh: false
      }
    case actions.RESET_SIGNIN: {
      return {
        signin: action.payload,
      };
    }
    case actions.LOGOUT: {
      const dataValue = localStorage.getItem("signin");
      const saveValue = dataValue && JSON.parse(dataValue);
      return { ...initState, signin: saveValue ? saveValue : "" };
    }
    //   return {...initState, signin: save ? save : ""};
    case actions.FORGOT_PASSWORD:
      return {
        isSuccess: false,
        loading: true,
      };
    case actions.FORGOT_PASSWORD_SUCCESS:
      return {
        isSuccess: action.isSuccess,
        loading: false,
      };
    case actions.RESET_PASSWORD:
      return {
        isSuccess_reset: false,
        loading: true,
      };
    case actions.RESET_PASSWORD_SUCCESS:
      return {
        isSuccess_reset: action.isSuccess,
        loading: false,
      };
    case actions.ERROR:
      return {
        isSuccess_reset: false,
        isSuccess: false,
        loading: false,
      };
    case actions.RESET_STORE:
      return {
        isSuccess: false,
        loading: false,
        isSuccess_reset: false,
      };
    case actions.SET_PROFILE:
      localStorage.setItem("profile", JSON.stringify(action?.payload));
      return {
        ...state,
        profile: action.payload,
      };

    case actions.REGISTER_CLEAR:
      return {
        ...state,
        loadingRegister: false,
        isRegisterSuccess: false
      }
    case actions.REGISTER_START: 
      return {
        ...state,
        loadingRegister: true,
        isRegisterSuccess: false
      }
    case actions.REGISTER_SUCCESS:
      return {
        ...state,
        loadingRegister: false,
        isRegisterSuccess: true
      }
    case actions.REGISTER_FAILURE:
      return {
        ...state,
        loadingRegister: false,
        isRegisterSuccess: false
      }


    default:
      return state;
  }
}
