import React from "react";
import { Link } from "react-router-dom";
import {
  AccountBookOutlined,
  AlertOutlined,
  AuditOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CameraOutlined,
  CarryOutOutlined,
  CheckSquareOutlined,
  ContactsOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FormOutlined,
  GoldOutlined,
  GroupOutlined,
  HistoryOutlined,
  MailOutlined,
  PicLeftOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShoppingOutlined,
  SnippetsOutlined,
  SolutionOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import IntlMessages from "@app/components/utility/intlMessages";
import { ReactComponent as DashboardSVG } from "@app/assets/images/svg/Dashboard.svg";
import { ReactComponent as CommonSVG } from "@app/assets/images/svg/Common.svg";
import { ReactComponent as AdminSVG } from "@app/assets/images/svg/Admin.svg";

export const stripTrailingSlash = (str: string) => {
  if (str.substr(-1) === "/") {
    return str.substr(0, str.length - 1);
  }
  return str;
};

export function SidebarIcon({ name }: { name?: string }) {
  switch (name) {
    case "svg-dashboard":
      return <DashboardSVG className="anticon" width={20} />;
    case "svg-common":
      return <CommonSVG className="anticon" width={20} />;
    case "ion-clipboard":
      return <FileTextOutlined />;
    case "icon-users":
      return <UserOutlined className="anticon" />;
    case "icon-companies":
      return <BankOutlined className="anticon" />;
    case "icon-admin":
      return <AdminSVG className="anticon" width={20} />;
    case "icon-staff":
      return <TeamOutlined />;
    case "icon-master":
      return <BookOutlined />;
    case "icon-product":
      return <ProjectOutlined />;
    case "icon-contact":
      return <ContactsOutlined />;
    case "icon-package":
      return <GoldOutlined />;
    case "icon-asset":
    case "icon-assets":
      return <DatabaseOutlined />;
    case "icon-system":
      return <SettingOutlined />;
    case "icon-site":
      return <ScheduleOutlined />;
    case "icon-group":
      return <GroupOutlined />;
    case "icon-service":
      return <PicLeftOutlined />;
    case "icon-help":
      return <QuestionCircleOutlined className="anticon" />;
    case "icon-messages":
      return <MailOutlined />;
    case "icon-camera":
      return <CameraOutlined />;
    case "icon-meeting":
      return <VideoCameraOutlined />;
    case "icon-history":
      return <HistoryOutlined />;
    case "icon-invoice":
      return <AccountBookOutlined />;
    case "icon-consumables":
      return <ShoppingOutlined />;
    case "icon-tasks":
      return <CheckSquareOutlined />;
    case "icon-my-tasks":
      return <CarryOutOutlined />;
    case "icon-tickets":
      return <CustomerServiceOutlined />;
    case "icon-reports":
      return <FileTextOutlined />;
    case "icon-report-new":
      return <FileAddOutlined />;
    case "icon-report-safety":
      return <SafetyCertificateOutlined />;
    case "icon-report-fault":
      return <WarningOutlined />;
    case "icon-report-audit":
      return <AuditOutlined />;
    case "icon-report-monthly":
      return <CalendarOutlined />;
    case "icon-report-incident":
      return <AlertOutlined />;
    case "icon-report-action-plans":
      return <SolutionOutlined />;
    case "icon-report-ppe":
      return <SafetyCertificateOutlined />;
    case "icon-report-templates":
      return <SnippetsOutlined />;
    case "icon-report-template":
      return <FormOutlined />;
    case "icon-report-safety-template":
      return <FileSearchOutlined />;
    case "icon-ppe":
      return <SafetyCertificateOutlined />;
    case "icon-checkin":
      return <EnvironmentOutlined />;
    case "icon-toolbox":
      return <ToolOutlined />;
    case "icon-training":
      return <ReadOutlined />;
    default:
      return name ? (
        <i style={{ paddingRight: "1.75rem", fontSize: "1.25rem" }} className={name} />
      ) : (
        <DashboardSVG className="anticon" width={20} />
      );
  }
}

/** Colored group header — same idea as /nav-mock (bar + uppercase title). */
const NavGroupTitle: React.FC<{ label: string; groupColor: string }> = ({ label, groupColor }) => (
  <span className="isoNavGroup" style={{ ["--g" as string]: groupColor }}>
    <span className="isoNavGroup-bar" aria-hidden />
    <span className="isoNavGroup-title">
      <IntlMessages id={label} />
    </span>
  </span>
);

/** Renders submenu row icon + label id (label is i18n key string on parent `option`). */
const SubmenuTitle: React.FC<{ leftIcon: string; label: string; submenuColor: React.CSSProperties }> = ({
  leftIcon,
  label,
  submenuColor,
}) => (
  <span className="isoMenuHolder" style={submenuColor}>
    <SidebarIcon name={leftIcon} />
    <span className="nav-text">
      <IntlMessages id={label} />
    </span>
  </span>
);

const LeafMenuInner: React.FC<{ leftIcon: string; label: string; submenuColor: React.CSSProperties }> = ({
  leftIcon,
  label,
  submenuColor,
}) => (
  <span className="isoMenuHolder" style={submenuColor}>
    <SidebarIcon name={leftIcon} />
    <span className="nav-text">
      <IntlMessages id={label} />
    </span>
  </span>
);

function mapMenuChildren(
  children: any[],
  base: string,
  submenuStyle: React.CSSProperties,
  submenuColor: React.CSSProperties,
  depth = 0,
): MenuProps["items"] {
  return children.map((child: any) => {
    if (child.children?.length) {
      return {
        key: child.key,
        label: child.leftIcon ? (
          <span className="isoMenuHolder isoMenuHolder--child" style={submenuColor}>
            <SidebarIcon name={child.leftIcon} />
            <span className="nav-text">
              <IntlMessages id={child.label} />
            </span>
          </span>
        ) : (
          <span style={{ ...submenuColor, marginLeft: depth > 0 ? "0.6rem" : 0 }}>
            <IntlMessages id={child.label} />
          </span>
        ),
        children: mapMenuChildren(child.children, base, submenuStyle, submenuColor, depth + 1),
      };
    }
    const linkTo = child.withoutDashboard ? `/${child.key}` : `${base}/${child.key}`;
    if (child.leftIcon) {
      return {
        key: child.key,
        style: submenuStyle,
        label: (
          <Link to={linkTo}>
            <span className="isoMenuHolder isoMenuHolder--child" style={submenuColor}>
              <SidebarIcon name={child.leftIcon} />
              <span className="nav-text">
                <IntlMessages id={child.label} />
              </span>
            </span>
          </Link>
        ),
      };
    }
    return {
      key: child.key,
      style: submenuStyle,
      label: (
        <Link style={{ ...submenuColor, marginLeft: "0.6rem" }} to={linkTo}>
          <IntlMessages id={child.label} />
        </Link>
      ),
    };
  });
}

export function buildSidebarMenuItems(
  singleOptions: any[],
  url: string,
  submenuStyle: React.CSSProperties,
  submenuColor: React.CSSProperties
): MenuProps["items"] {
  const base = stripTrailingSlash(url);
  return singleOptions.map((singleOption) => {
    const { key, label, leftIcon, children, groupColor } = singleOption;
    if (children) {
      return {
        key,
        className: groupColor ? "isoNavGroup-submenu" : undefined,
        style: groupColor
          ? ({ ["--g" as string]: groupColor } as React.CSSProperties)
          : undefined,
        label: groupColor ? (
          <NavGroupTitle label={label} groupColor={groupColor} />
        ) : (
          <SubmenuTitle leftIcon={leftIcon} label={label} submenuColor={submenuColor} />
        ),
        children: mapMenuChildren(children, base, submenuStyle, submenuColor),
      };
    }
    return {
      key,
      label: (
        <Link to={`${base}/${key}`}>
          <LeafMenuInner leftIcon={leftIcon} label={label} submenuColor={submenuColor} />
        </Link>
      ),
    };
  });
}
