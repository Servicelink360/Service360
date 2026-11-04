import FooterCopyright from '@app/components/common/FooterCopyright';
import useWindowSize from '@app/lib/hooks/useWindowSize';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';
import { useColorModeOptional } from '@app/context/ColorModeContext';
import appActions from '@app/redux/app/actions';
import profileActions from '@app/redux/profile/actions';
import { Layout } from 'antd';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DashboardRoutes from '../routes';
import Sidebar from '../Sidebar/Sidebar';
import Topbar from '../topbar/Topbar';
import { DashboardContainer, DashboardGlobalStyles } from './Dashboard.styles';
const { Content, Footer } = Layout;
const { toggleAll } = appActions;
const styles = {
  layout: { flexDirection: 'row', overflowX: 'hidden' },
  content: {
    padding: '45px 0 0',
    flexShrink: '0',
    background: '#f1f3f6',
    position: 'relative',
    width: '100%',
  },
  footer: {
    background: '#ffffff',
    textAlign: 'center',
    borderTop: '1px solid #ededed',
  },
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const appHeight = useSelector((state) => state.App.height);
  const { width, height } = useWindowSize();
  const isMobilePortrait = useMobilePortrait();
  const { isDark } = useColorModeOptional();
  // Mobile dark shell for every role (admin / staff / customer) and every in-app page.
  const shellDark = isDark && isMobilePortrait;

  React.useEffect(() => {
    dispatch(toggleAll(width, height));
  }, [width, height, dispatch]);

  React.useEffect(() => {
    const pathName = window.location.pathname.substring(1)
    if(pathName !== 'my-profile')
      dispatch(profileActions.fetchProfileDataStart())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useLayoutEffect(() => {
    const cls = 'app-shell-dark';
    if (shellDark) {
      document.body.classList.add(cls);
      document.documentElement.setAttribute('data-app-shell', 'dark');
    } else {
      document.body.classList.remove(cls);
      document.documentElement.removeAttribute('data-app-shell');
    }
    return () => {
      document.body.classList.remove(cls);
      document.documentElement.removeAttribute('data-app-shell');
    };
  }, [shellDark]);

  return (
    <DashboardContainer>
      <DashboardGlobalStyles />
      <Layout style={{ height: height }}>
        <Topbar />
        <Layout style={styles.layout}>
          <Sidebar />
          <Layout
            className="isoContentMainLayout"
            style={{
              height: appHeight,
            }}
          >
            <Content
              className={`isomorphicContent${shellDark ? ' dashboard-content--dark app-content--dark' : ''}`}
              style={shellDark ? { ...styles.content, background: '#000000' } : styles.content}
              id="main-content"
              role="main"
              aria-label="Page content"
            >
              <DashboardRoutes />
            </Content>
            <Footer
              style={
                shellDark
                  ? {
                      ...styles.footer,
                      background: '#000000',
                      borderTop: '1px solid #262626',
                      color: '#8c8c8c',
                    }
                  : styles.footer
              }
            >
              <FooterCopyright />
            </Footer>
          </Layout>
        </Layout>
      </Layout>
    </DashboardContainer>
  );
}
