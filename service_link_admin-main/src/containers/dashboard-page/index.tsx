import Layout from '@app/components/layout/Layout';
import { CustomerServiceOutlined, FileTextOutlined, LoginOutlined, MailOutlined, UnorderedListOutlined } from '@ant-design/icons';
import BrokenGlassIcon from '@app/components/icons/BrokenGlassIcon';
import React, { useCallback, useEffect } from 'react';
import { DashboardWarp } from '../../components/common/Common.styles';
import { useDispatch, useSelector } from 'react-redux';
import actions from "@app/redux/dashboard/actions";
import { useColorModeOptional } from '@app/context/ColorModeContext';
import useMobilePortrait from '@app/lib/hooks/useMobilePortrait';

import { Link, useLocation } from 'react-router-dom';
import { userType } from '../../constants/statusUser';
import intl from '../../library/helpers/intlProvider';


const Dashboard: React.FC = () => {

  const { data } = useSelector((state: any) => state?.dashboard);
  const dispatch = useDispatch();
  const location = useLocation();
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
      <div className="dashboard-report-badge__label">
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
      <div className="dashboard-report-badge__label">New Report</div>
    </Link>
  );

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
      <span className="dashboard-report-badge__label">{label}</span>
    </Link>
  );

  const checkInBadge = isStaff ? (
    <Link to="/site-check-in" className="dashboard-report-badge">
      <span className="dashboard-report-badge__icon-wrap">
        <div className="dashboard-report-badge__circle dashboard-report-badge__circle--checkin dashboard-report-badge__circle--action">
          <LoginOutlined />
        </div>
      </span>
      <div className="dashboard-report-badge__label">
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
      <div className="dashboard-report-badge__label">
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
      <span className="dashboard-messages-badge__label">Messages</span>
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
      <DashboardWarp className={dashboardDark ? 'dashboard-page--dark' : undefined}>
        {showReportsSection ? (
          <div className="dashboard-item dashboard-item--flush">
            <h1 className="dashboard-section-heading">Reports</h1>
            {dashboardReportBadges}
          </div>
        ) : null}
      </DashboardWarp>
    </Layout>
  )
}

export default Dashboard
