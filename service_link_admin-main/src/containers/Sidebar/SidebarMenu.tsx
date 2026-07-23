import React from "react";
import { Link } from "react-router-dom";
import {
  BankOutlined,
  FileTextOutlined,
  BookOutlined,
  SettingOutlined,
  UserOutlined,
  ProjectOutlined,
  GroupOutlined,
  ContactsOutlined,
  GoldOutlined,
  ScheduleOutlined,
  PicLeftOutlined,
  TeamOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
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

/** Renders submenu row icon + label id (label is i18n key string on parent `option`). */
const SubmenuTitle: React.FC<{ leftIcon: string; label: string; submenuColor: React.CSSProperties }> = ({
  leftIcon,
  label,
  submenuColor,
}) => (
  <span className="isoMenuHolder" style={submenuColor}>
    {leftIcon === "ion-clipboard" ? (
      <FileTextOutlined />
    ) : leftIcon === "svg-common" ? (
      <CommonSVG className="anticon" width={20} />
    ) : leftIcon === "icon-users" ? (
      <UserOutlined className="anticon" width={20} />
    ) : leftIcon === "icon-companies" ? (
      <BankOutlined className="anticon" width={20} />
    ) : leftIcon === "icon-admin" ? (
      <AdminSVG className="anticon" width={20} />
    ) : leftIcon === "icon-staff" ? (
      <TeamOutlined />
    ) : leftIcon === "icon-master" ? (
      <BookOutlined />
    ) : leftIcon === "icon-product" ? (
      <ProjectOutlined />
    ) : leftIcon === "icon-contact" ? (
      <ContactsOutlined />
    ) : leftIcon === "icon-package" ? (
      <GoldOutlined />
    ) : leftIcon === "icon-asset" || leftIcon === "icon-assets" ? (
      <DatabaseOutlined />
    ) : leftIcon === "icon-system" ? (
      <SettingOutlined />
    ) : leftIcon === "icon-site" ? (
      <ContactsOutlined />
    ) : (
      <i style={{ paddingRight: "1.75rem", fontSize: "1.25rem" }} className={leftIcon} />
    )}
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
    {leftIcon === "icon-users" ? (
      <UserOutlined className="anticon" width={20} />
    ) : leftIcon === "icon-companies" ? (
      <BankOutlined className="anticon" width={20} />
    ) : leftIcon === "icon-product" ? (
      <ProjectOutlined />
    ) : leftIcon === "icon-group" ? (
      <GroupOutlined />
    ) : leftIcon === "icon-service" ? (
      <PicLeftOutlined />
    ) : leftIcon === "icon-site" ? (
      <ScheduleOutlined />
    ) : leftIcon === "icon-package" ? (
      <GoldOutlined />
    ) : leftIcon === "icon-help" ? (
      <QuestionCircleOutlined className="anticon" width={20} />
    ) : (
      <DashboardSVG className="anticon" width={20} />
    )}
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
        label: (
          <span style={{ ...submenuColor, marginLeft: depth > 0 ? "0.6rem" : 0 }}>
            <IntlMessages id={child.label} />
          </span>
        ),
        children: mapMenuChildren(child.children, base, submenuStyle, submenuColor, depth + 1),
      };
    }
    const linkTo = child.withoutDashboard ? `/${child.key}` : `${base}/${child.key}`;
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
    const { key, label, leftIcon, children } = singleOption;
    if (children) {
      return {
        key,
        label: <SubmenuTitle leftIcon={leftIcon} label={label} submenuColor={submenuColor} />,
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
