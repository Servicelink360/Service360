import { store } from './store';
import authActions from '@app/redux/auth/actions';

export default () =>
  new Promise((resolve) => {
    store.dispatch(authActions.checkAuthorization());
    resolve();
  });
