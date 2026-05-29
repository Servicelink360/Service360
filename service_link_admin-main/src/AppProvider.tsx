import React from 'react';
import { ConfigProvider } from 'antd';
import { IntlProvider } from 'react-intl';
import { useSelector } from 'react-redux';
import AppLocale from '@app/config/translation';
import { ColorModeProvider } from '@app/context/ColorModeContext';

export default function AppProvider({ children }: any) {
  const pathName = window.location.pathname.substring(1)
  let data = useSelector((state: any) => state.profile.data)
  if(pathName !== 'my-profile') {
    data = JSON.parse(localStorage.getItem('profile')) 
  }
  const currentUserLanguage = data?.UILanguage?.toLowerCase() || 'en'
  const defaultLanguage = 'en'
  const currentAppLocale: any = AppLocale[data ? currentUserLanguage : defaultLanguage];
  return (
    <ColorModeProvider>
      <ConfigProvider locale={currentAppLocale?.antd}>
        <IntlProvider
          locale={currentAppLocale?.locale}
          messages={currentAppLocale?.messages}
        >
          {children}
        </IntlProvider>
      </ConfigProvider>
    </ColorModeProvider>
  );
}

