import { store } from './store';
import authActions from '@app/redux/auth/actions';

export default () =>
  new Promise(() => {
    store.dispatch(authActions.checkAuthorization());
  });
