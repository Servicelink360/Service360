import appActions from '@app/redux/app/actions';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';
import { useColorMode } from '@app/context/ColorModeContext';
import { DashboardOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import React from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { resolvePageTitleLabel } from '../Sidebar/options';
import TopbarWrapper from './Topbar.styles';
import TopbarUser from './TopbarUser';

const { Header } = Layout;
const { toggleCollapsed, toggleOpenDrawer } = appActions;

export default function Topbar() {
  const intl = useIntl()
  const history = useHistory();
  const location = useLocation();

  const { collapsed, openDrawer } = useSelector((state: any) => state.App);
  const user = useSelector((state: any) => state.Auth.profile);
  const { rows } = useSelector((state: any) => state?.settings);
  const dispatch = useDispatch();
  const isMobilePortrait = useMobilePortrait();
  const { isDark, setMode } = useColorMode();
  const handleToggle = React.useCallback(() => {
    if (isMobilePortrait) {
      dispatch(toggleOpenDrawer());
    } else {
      dispatch(toggleCollapsed());
    }
  }, [dispatch, isMobilePortrait]);
  const isCollapsed = collapsed && !openDrawer;
  const menuExpanded = isMobilePortrait ? openDrawer : !isCollapsed;
  const topbarDark = isMobilePortrait && isDark;
  const topbarClass = isMobilePortrait
    ? `isomorphicTopbar mobile-portrait-topbar${topbarDark ? ' mobile-portrait-topbar--dark' : ''}`
    : isCollapsed
      ? 'isomorphicTopbar collapsed'
      : 'isomorphicTopbar';

  const titleLabel = resolvePageTitleLabel(location.pathname, location.search);

  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    width: '100%',
    ...(topbarDark
      ? {
          backgroundColor: '#000000',
          borderBottom: '1px solid #1a1a1a',
        }
      : {}),
  };

  return (
    <TopbarWrapper>
      <Header style={headerStyle} className={topbarClass}>
        <div className="isoLeft">
          <button
            className={
              menuExpanded ? 'triggerBtn menuOpen' : 'triggerBtn menuCollapsed'
            }
            onClick={handleToggle}
            aria-expanded={menuExpanded}
            aria-label="Menu"
            style={topbarDark ? { color: '#ffffff' } : undefined}
          />
          <h2 style={topbarDark ? { color: '#ffffff' } : undefined}>
            {titleLabel ? intl.formatMessage({ id: titleLabel }) : ''}
          </h2>
          {isMobilePortrait ? (
            <button
              type="button"
              className="topbarDashboardBtn"
              onClick={() => history.push('/dashboard')}
              aria-label={intl.formatMessage({ id: 'sidebar.dashboard' })}
              style={topbarDark ? { color: '#ffffff' } : undefined}
            >
              <DashboardOutlined aria-hidden />
            </button>
          ) : null}
        </div>
        <ul className="isoRight">
          {isMobilePortrait ? (
            <li className="isoColorMode">
              <button
                type="button"
                className="isoColorModeToggle"
                onClick={() => setMode(isDark ? 'light' : 'dark')}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDark}
                style={
                  topbarDark
                    ? {
                        color: '#ffffff',
                        border: '1px solid #5a5a5a',
                        background: 'rgba(255, 255, 255, 0.1)',
                      }
                    : {
                        color: '#1a1a1a',
                        border: '1px solid #d9d9d9',
                        background: 'transparent',
                      }
                }
              >
                {isDark ? (
                  <MoonOutlined aria-hidden style={{ color: '#ffffff', fontSize: 20 }} />
                ) : (
                  <SunOutlined aria-hidden style={{ color: '#1a1a1a', fontSize: 20 }} />
                )}
              </button>
            </li>
          ) : null}
          <li className="isoUser d-flex">
            <TopbarUser rows={rows} user={user} userPhoto={''} topbarDark={topbarDark} />
          </li>
        </ul>
      </Header>
    </TopbarWrapper>
  );
}
