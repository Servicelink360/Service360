import Layout from '@app/components/layout/Layout';
import { CameraOutlined, CustomerServiceOutlined, FileAddOutlined, FileTextOutlined, FolderOpenOutlined, LoginOutlined, MailOutlined, UnorderedListOutlined } from '@ant-design/icons';
import BrokenGlassIcon from '@app/components/icons/BrokenGlassIcon';
import React, { useCallback, useEffect, useRef } from 'react';
import { DashboardWarp } from '../../components/common/Common.styles';
import { useDispatch, useSelector } from 'react-redux';
import actions from "@app/redux/dashboard/actions";
import { useColorModeOptional } from '@app/context/ColorModeContext';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';

import { Link, useHistory, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { saveCapturedPhotoInApp, startCameraSession, type CameraSaveTarget } from '@app/library/helpers/field-camera';
import CameraSaveChoice from '@app/containers/field-photos/CameraSaveChoice';
import { userType } from '../../constants/statusUser';
import intl from '../../library/helpers/intlProvider';


const Dashboard: React.FC = () => {

  const { data } = useSelector((state: any) => state?.dashboard);
  const dispatch = useDispatch();
  const location = useLocation();
  const history = useHistory();
  const appCameraRef = useRef<HTMLInputElement>(null);
  const [cameraChoice, setCameraChoice] = React.useState(false);
  const [cameraStarting, setCameraStarting] = React.useState(false);
  const { isDark } = useColorModeOptional();
  const isMobilePortrait = useMobilePortrait();
  const dashboardDark = isDark && isMobilePortrait;

  const loadDashboard = useCallback(() => {
    dispatch(actions.getData({ startDate: '', endDate: '' }));
  }, [dispatch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, location.pathname]);

  useEffect(() => {
    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadDashboard]);

  useEffect(() => {
    const cls = 'dashboard-page-body-dark';
    if (dashboardDark) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [dashboardDark]);

  const profileRaw = localStorage.getItem('profile');
  let profile = null;
  if (profileRaw) {
    profile = JSON.parse(profileRaw)
  }

  const reportFaultsCount = data?.reportFaultsCount ?? 0;
  const newReportsCount = data?.newReportsCount ?? 0;
  const newTicketsCount = data?.newTicketsCount ?? 0;
  const messagesUnreadCount = data?.messagesUnreadCount ?? 0;
  const myTasksCount = data?.myTasksCount ?? 0;
  const invoicesCount = data?.invoicesCount ?? 0;
  const canShowMessages =
    profile &&
    (+profile.type === userType.ADMIN ||
      +profile.type === userType.CUSTOMER ||
      +profile.type === userType.STAFF);

  const profileType = profile ? +profile.type : 0;
  const isStaff = profileType === userType.STAFF;
  const isAdmin = profileType === userType.ADMIN;
  const isCustomer = profileType === userType.CUSTOMER;
  const showReportsSection = isStaff || isAdmin || isCustomer;

  const darkLabelStyle: React.CSSProperties | undefined = dashboardDark
    ? {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1.25,
        marginTop: 8,
        textAlign: 'center',
      }
    : undefined;
  const darkHeadingStyle: React.CSSProperties | undefined = dashboardDark
    ? { color: '#ffffff', fontWeight: 700 }
    : undefined;

  const ticketsBadge = (to: string) => (
    <Link to={to} className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--tickets dashboard-report-badge__circle--action">
          <CustomerServiceOutlined />
        </div>
        {newTicketsCount > 0 ? (
          <span className="dashboard-messages-badge__count" aria-label={`${newTicketsCount} new tickets`}>
            {newTicketsCount > 99 ? '99+' : newTicketsCount}
          </span>
        ) : null}
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>
        {intl.formatMessage({ id: 'sidebar.tickets' })}
      </div>
    </Link>
  );

  const newReportBadge = (to: string, showCount: boolean) => (
    <Link to={to} className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--reports dashboard-report-badge__circle--action">
          <FileTextOutlined />
        </div>
        {showCount && newReportsCount > 0 ? (
          <span className="dashboard-messages-badge__count" aria-label={`${newReportsCount} new reports`}>
            {newReportsCount > 99 ? '99+' : newReportsCount}
          </span>
        ) : null}
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>New Report</div>
    </Link>
  );

  const openDashboardCamera = (target: CameraSaveTarget) => {
    if (target === 'app') {
      setCameraChoice(false);
      appCameraRef.current?.click();
      return;
    }
    setCameraStarting(true);
    void (async () => {
      try {
        await startCameraSession(target);
        setCameraChoice(false);
        history.push(`/field-photos?camera=${target}`);
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          message.error(error?.message || 'Could not open the camera');
        }
      } finally {
        setCameraStarting(false);
      }
    })();
  };

  const saveAppPhoto = async (chosen?: File) => {
    if (!chosen) return;
    const hide = message.loading('Saving the photo in the app…', 0);
    try {
      await saveCapturedPhotoInApp(chosen);
      history.push('/field-photos');
      message.success('Photo saved in the app');
    } catch (error: any) {
      message.error(error?.message || 'Could not save the photo');
    } finally {
      hide();
      if (appCameraRef.current) appCameraRef.current.value = '';
    }
  };

  const cameraBadge = (isStaff || isAdmin) ? (
    <button
      type="button"
      className="dashboard-report-badge"
      onClick={() => setCameraChoice(true)}
      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
    >
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--camera dashboard-report-badge__circle--action">
          <CameraOutlined />
        </div>
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>Camera</div>
    </button>
  ) : null;

  const adhocReportBadge = (isStaff || isAdmin) ? (
    <Link to="/new-reports?create=adhoc" className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--adhoc dashboard-report-badge__circle--action">
          <FileAddOutlined />
        </div>
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>Adhoc Report</div>
    </Link>
  ) : null;

  const faultsReportsBadge = (to: string, showCount: boolean, label: string) => (
    <Link to={to} className="dashboard-faults-badge">
      <span className="dashboard-faults-badge__icon-wrap">
        <BrokenGlassIcon />
        {showCount && reportFaultsCount > 0 ? (
          <span className="dashboard-faults-badge__count" aria-label={`${reportFaultsCount} unread fault reports`}>
            {reportFaultsCount > 99 ? '99+' : reportFaultsCount}
          </span>
        ) : null}
      </span>
      <span className="dashboard-report-badge__label" style={darkLabelStyle}>{label}</span>
    </Link>
  );

  const checkInBadge = isStaff ? (
    <Link to="/site-check-in" className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--checkin dashboard-report-badge__circle--action">
          <LoginOutlined />
        </div>
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>
        {intl.formatMessage({ id: 'sidebar.siteCheckIn' })}
      </div>
    </Link>
  ) : null;

  const myTasksBadge = isStaff ? (
    <Link to="/my-tasks" className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--tickets dashboard-report-badge__circle--action">
          <UnorderedListOutlined />
        </div>
        {myTasksCount > 0 ? (
          <span className="dashboard-messages-badge__count" aria-label={`${myTasksCount} open tasks`}>
            {myTasksCount > 99 ? '99+' : myTasksCount}
          </span>
        ) : null}
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>
        {intl.formatMessage({ id: 'sidebar.myTasks' })}
      </div>
    </Link>
  ) : null;

  const messagesEnvelopeBadge = canShowMessages ? (
    <Link to="/messages" className="dashboard-messages-badge">
      <span className="dashboard-messages-badge__icon-wrap">
        <MailOutlined />
        {messagesUnreadCount > 0 ? (
          <span className="dashboard-messages-badge__count">{messagesUnreadCount}</span>
        ) : null}
      </span>
      <span className="dashboard-messages-badge__label" style={darkLabelStyle}>Messages</span>
    </Link>
  ) : null;

  const invoicesBadge = (isAdmin || isCustomer) ? (
    <Link to="/invoices" className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--reports dashboard-report-badge__circle--action">
          <FolderOpenOutlined />
        </div>
        {isCustomer && invoicesCount > 0 ? (
          <span
            className="dashboard-messages-badge__count"
            aria-label={`${invoicesCount} new invoices`}
          >
            {invoicesCount > 99 ? '99+' : invoicesCount}
          </span>
        ) : null}
      </span>
      <div className="dashboard-report-badge__label" style={darkLabelStyle}>
        {intl.formatMessage({ id: 'sidebar.invoices' })}
      </div>
    </Link>
  ) : null;

  const dashboardReportBadges = (
    <div className="dashboard-report-badges">
      {checkInBadge}
      {myTasksBadge}
      {newReportBadge(
        isStaff ? '/new-reports?create=1' : '/new-reports',
        isAdmin || isCustomer,
      )}
      {adhocReportBadge}
      {cameraBadge}
      {faultsReportsBadge(
        isStaff ? '/report-faults?create=1' : '/report-faults',
        !isStaff,
        isStaff ? 'Fault Report' : 'Faults Reports',
      )}
      {(isAdmin || isCustomer) ? ticketsBadge('/tickets?status=2') : null}
      {messagesEnvelopeBadge}
    </div>
  );

  return (
    <Layout title="">
      <CameraSaveChoice
        visible={cameraChoice}
        busy={cameraStarting}
        onCancel={() => setCameraChoice(false)}
        onChoose={openDashboardCamera}
      />
      <input
        ref={appCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          void saveAppPhoto(chosen);
        }}
      />
      <DashboardWarp className={dashboardDark ? 'dashboard-page--dark' : undefined}>
        {dashboardDark ? (
          <style>{`
            .dashboard-page--dark .dashboard-report-badge__label,
            .dashboard-page--dark .dashboard-messages-badge__label {
              color: #ffffff !important;
              font-size: 15px !important;
              font-weight: 700 !important;
              line-height: 1.25 !important;
            }
            .dashboard-page--dark .dashboard-section-heading {
              color: #ffffff !important;
              font-weight: 700 !important;
            }
          `}</style>
        ) : null}
        {showReportsSection ? (
          <div className="dashboard-item dashboard-item--flush">
            <h1 className="dashboard-section-heading" style={darkHeadingStyle}>Reports</h1>
            {dashboardReportBadges}
          </div>
        ) : null}
        {(isAdmin || isCustomer) ? (
          <div className="dashboard-item dashboard-item--flush" style={{ marginTop: 24 }}>
            <h1 className="dashboard-section-heading" style={darkHeadingStyle}>Invoices</h1>
            <div className="dashboard-report-badges">{invoicesBadge}</div>
          </div>
        ) : null}
      </DashboardWarp>
    </Layout>
  )
}

export default Dashboard
