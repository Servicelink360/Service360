import React from 'react';
import { Provider } from 'react-redux';
import GlobalStyles from '@app/assets/styles/globalStyle';
import { store } from './redux/store';
import Boot from './redux/boot';
import Routes from './router';
import AppProvider from './AppProvider';
import InstallPrompt from './components/pwa/InstallPrompt';
// import Loading from './components/Common/Loading';

const App = () => (
  <Provider store={store}>
    <AppProvider>
      <>
        <GlobalStyles />
        <InstallPrompt />
        <Routes />
        {/* <Loading/> */}
      </>
    </AppProvider>
  
  </Provider>
);
Boot()
  .then(() => App())
  .catch(error => console.error(error));

export default App;
