/* eslint-disable react-hooks/rules-of-hooks */
import Layout from "@app/components/layout/Layout";
import ReportListKeywordSearch from "./report-list-keyword-search";
import { Fieldset } from "@app/components/common/Common.styles";
import { UploadImageMultilHandle } from "@app/components/common/upload-image-multi";
import { UsersDiv } from "@app/components/common/container.style";
import endPoint from "@app/constants/endPoint";
import serviceType from "@app/constants/serviceType";
import { CheckCircleFilled, ClockCircleOutlined, CloseOutlined, DeleteOutlined, DownOutlined, EditOutlined, EnvironmentOutlined, EyeOutlined, FilePdfOutlined, FileTextOutlined, FilterOutlined, MailOutlined, SaveOutlined, SearchOutlined, UndoOutlined, UpOutlined } from "@ant-design/icons";
import { Link, useHistory, useLocation } from "react-router-dom";
import { callAPIAsync } from "../../library/helpers/api";
import { getStaffLocationDetailed } from "@app/library/helpers/geolocation";
import { Button, Checkbox, Col, DatePicker, Divider, Empty, Form, Image, Input, InputNumber, message, Modal, Pagination, Popconfirm, Progress, Row, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { ReportsMobileDarkPageStyles } from "./reports-mobile-dark-styles";
import MobileReportPdfOverlay from "@app/components/common/MobileReportPdfOverlay";
import useMobilePortrait from "@app/lib/hooks/useMobilePortrait";
import { useColorModeOptional } from "@app/context/ColorModeContext";
import { useDispatch } from "react-redux";
import { useIntl } from "react-intl";
import dashboardActions from "@app/redux/dashboard/actions";
import { dJobStatus, userType, INCIDENT_REPORT_CATEGORY, SAFETY_AUDIT_CATEGORY, NEW_REPORTS_OWN_PAGE_CATEGORIES } from "../../constants/statusUser";
import { fixTextEncoding } from "@app/library/report-templates/templateItemUtils";
import {
  EM_DASH,
  TemplateItem,
  autoMergeUsesPicker,
  getOptions,
  getTemplateFieldKey,
  getTemplateLabel,
  getYesNoPreset,
  isAutoMergeTemplateField,
  isJunkTemplateField,
  isJsonMediaFieldType,
  isObsoleteCombinedDateTimeRow,
  isObsoleteSeparateDateOrTimeRow,
  isTimeLikeLabel,
  isTimeLikeTemplateItem,
  isVideoMediaUrl,
  legacyFieldKey,
  matchReportItemForTemplate,
  mergeReportMediaRowsForForm,
  parseMediaListValue,
  parseReportItemValueForForm,
  reportFieldStorageKey,
  resolveAutoMergeFieldValue,
  serviceCandidatesForTemplateAtSite,
  templateMatchesSiteServices,
} from "./new-reports-field-utils";
import {
  SUBMIT_PROGRESS_MEDIA_MAX,
  SUBMIT_PROGRESS_SAVE_CAP,
  SUBMIT_PROGRESS_SAVE_START,
  TemplateFileUpload,
  TemplateImageUpload,
  TemplateVideoUpload,
  delay,
} from "./new-reports-template-uploads";
import {
  buildCustomReportSavePayload,
  canUserSoftDeleteCustomReport,
  clearDeletedCustomReports,
  createCustomReport,
  deleteCustomReport,
  fetchCustomReportById,
  fetchCustomReportDeletedCount,
  fetchCustomReportsList,
  isDuplicateReportFieldNameError,
  markAllCustomReportsOpened,
  markCustomReportOpened,
  markCustomReportUnread,
  restoreCustomReport,
  updateCustomReport,
} from "./custom-reports-api";
import {
  REPORT_DISPLAY_DATE,
  REPORT_LIST_SEP,
  REPORT_TIME_PICKER_FORMAT,
  buildReportDisplayTitle,
  formatCustomerDisplayName,
  formatIncidentType,
  formatMobileReportCardTitle,
  formatReportSubmittedAt,
  formatReportViewDate,
  formatReportViewTime,
  formatSubmittedByRow,
  getReportPdfField,
  reportPdfLinkLabel,
  resolveReportPdfHref,
  resolveReportSubmittedDisplayMoment,
} from "./new-reports-display-utils";

const { RangePicker } = DatePicker;

type InitData = {
  reportTemplates?: any[];
};

type ListQueryFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: number;
  serviceId?: string;
  keyword?: string;
};

type ReportListTab = "active" | "deleted";

/** Job site Select value for a custom / free-text site (not a real sites.id). */
const OTHER_JOB_SITE = "__other__";

const isOtherJobSite = (siteId: unknown): boolean =>
  siteId === OTHER_JOB_SITE || siteId === "other";

function normalizeCompanyKey(name: string | undefined | null): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** One customer user id per company — for Other-site company dropdown (not every worker). */
function buildCompanyCustomerOptions(
  companies: Array<{ id: number; name?: string; companyName?: string }>,
  users: Array<{
    id: number;
    customerInfo?: {
      companyId?: number | null;
      companyName?: string;
      company?: { id?: number; name?: string };
    };
  }>,
): Array<{
  id: number;
  fullName: string;
  customerName: string;
  companyName: string;
  companyId: number;
}> {
  const map: Record<number, number> = {};
  const nameToCompanyId = new Map<string, number>();
  for (const c of companies) {
    const key = normalizeCompanyKey(c.name || c.companyName);
    if (key) nameToCompanyId.set(key, +c.id);
  }
  for (const u of users) {
    let companyId = +(u.customerInfo?.companyId ?? u.customerInfo?.company?.id ?? 0);
    if (!companyId) {
      const key = normalizeCompanyKey(
        u.customerInfo?.companyName || u.customerInfo?.company?.name,
      );
      if (key) companyId = nameToCompanyId.get(key) || 0;
    }
    if (companyId && !map[companyId]) {
      map[companyId] = +u.id;
    }
  }
  return companies
    .map((c) => {
      const companyId = +c.id;
      const customerUserId = map[companyId];
      if (!customerUserId) return null;
      const companyName = String(c.name || c.companyName || "").trim() || `Client #${companyId}`;
      return {
        id: customerUserId,
        companyId,
        fullName: companyName,
        customerName: companyName,
        companyName,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.companyName.localeCompare(b!.companyName)) as Array<{
    id: number;
    fullName: string;
    customerName: string;
    companyName: string;
    companyId: number;
  }>;
}

const staffPrimaryGreen = { background: "#389e0d", borderColor: "#389e0d" };
/** Submitted Reports modal — reference UI */
const submittedMetaLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#595959",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};
const submittedMetaValue: React.CSSProperties = {
  fontSize: 14,
  color: "#000000",
  fontWeight: 400,
  lineHeight: 1.5,
  display: "block",
};
const submittedGreenPill: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  background: "#52c41a",
  color: "#fff",
  borderRadius: 999,
  padding: "5px 16px",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.35,
};

/** Matches Ant Design `Button type="link" size="small"` icon scale in the Action column. */
const tableLinkIconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  padding: 0,
  lineHeight: 1,
};

const NARROW_VIEWPORT_QUERY = "(max-width: 768px)";

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const update = () => setNarrow(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);
  return narrow;
}

type MobileStyledDark = { $dark?: boolean };

const ReportTimePickerPopupStyles = createGlobalStyle`
  .nr-report-ampm-wrap {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .nr-report-ampm-datetime {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .nr-report-ampm-datetime .nr-report-ampm-date,
  .nr-report-ampm-datetime .nr-report-ampm-date.ant-picker {
    width: 100% !important;
  }
  .nr-report-ampm-wrap .nr-report-ampm-hour.ant-select,
  .nr-report-ampm-wrap .nr-report-ampm-minute.ant-select {
    width: 88px !important;
    min-width: 88px !important;
    max-width: 88px !important;
    flex: 0 0 88px !important;
  }
  .nr-report-ampm-wrap .nr-report-ampm-hour .ant-select-selector,
  .nr-report-ampm-wrap .nr-report-ampm-minute .ant-select-selector {
    width: 100% !important;
  }
  .nr-report-ampm-btns.ant-btn-group {
    display: inline-flex;
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .nr-report-ampm-btns .ant-btn {
    min-width: 52px;
    font-weight: 600;
    height: 40px;
    padding: 0 14px;
  }
  .nr-report-ampm-btns .ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;
  }
`;

const AMPM_HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: h, label: String(h).padStart(2, "0") };
});
const AMPM_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, "0"),
}));

function normalizeAmPmMoment(value: unknown): moment.Moment | null {
  if (value == null || value === "") return null;
  if (moment.isMoment(value)) return value.isValid() ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const strict = moment(
    s,
    [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "HH:mm:ss",
      "HH:mm",
      "h:mm:ss A",
      "h:mm A",
      "h:mm:ss a",
      "h:mm a",
    ],
    true,
  );
  if (strict.isValid()) return strict;
  const loose = moment(s);
  return loose.isValid() ? loose : null;
}

function buildAmPmMoment(
  base: moment.Moment | null,
  hour12: number,
  minute: number,
  pm: boolean,
): moment.Moment {
  let h24 = hour12 % 12;
  if (pm) h24 += 12;
  const next = base && base.isValid() ? base.clone() : moment();
  return next.hour(h24).minute(minute).second(0).millisecond(0);
}

type AmPmPickerSharedProps = {
  value?: moment.Moment | null;
  onChange?: (v: moment.Moment | null) => void;
  size?: "large" | "middle" | "small";
  className?: string;
  popupClassName?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
};

/** Hour + minute dropdowns with AM/PM buttons (reliable load/edit; no cramped time panel). */
function ReportAmPmTimePicker({
  value,
  onChange,
  size = "large",
  className,
}: AmPmPickerSharedProps) {
  const m = normalizeAmPmMoment(value);
  const hour12 = m ? m.hour() % 12 || 12 : undefined;
  const minute = m ? m.minute() : undefined;
  const isPm = !!(m && m.hour() >= 12);

  const commit = (nextHour12: number, nextMinute: number, nextPm: boolean) => {
    onChange?.(buildAmPmMoment(m, nextHour12, nextMinute, nextPm));
  };

  return (
    <div className="nr-report-ampm-wrap">
      <Select
        size={size}
        className={["nr-report-ampm-hour", className].filter(Boolean).join(" ")}
        placeholder="Hour"
        value={hour12}
        options={AMPM_HOUR_OPTIONS}
        style={{ width: 88 }}
        dropdownMatchSelectWidth={false}
        onChange={(h) => commit(h, minute ?? 0, isPm)}
      />
      <Select
        size={size}
        className={["nr-report-ampm-minute", className].filter(Boolean).join(" ")}
        placeholder="Min"
        value={minute}
        options={AMPM_MINUTE_OPTIONS}
        style={{ width: 88 }}
        dropdownMatchSelectWidth={false}
        onChange={(min) => commit(hour12 ?? 12, min, isPm)}
      />
      <Button.Group className="nr-report-ampm-btns">
        <Button
          type={!isPm ? "primary" : "default"}
          size={size}
          onClick={(e) => {
            e.preventDefault();
            commit(hour12 ?? 12, minute ?? 0, false);
          }}
        >
          AM
        </Button>
        <Button
          type={isPm ? "primary" : "default"}
          size={size}
          onClick={(e) => {
            e.preventDefault();
            commit(hour12 ?? 12, minute ?? 0, true);
          }}
        >
          PM
        </Button>
      </Button.Group>
    </div>
  );
}

/** Date picker + hour/minute + AM/PM buttons (single form moment value). */
function ReportAmPmDateTimePicker({
  value,
  onChange,
  size = "large",
  className,
  popupClassName,
}: AmPmPickerSharedProps) {
  const m = normalizeAmPmMoment(value);

  return (
    <div className="nr-report-ampm-datetime">
      <DatePicker
        value={m || undefined}
        onChange={(d) => {
          if (!d || !d.isValid()) {
            onChange?.(null);
            return;
          }
          const next = d.clone();
          if (m) {
            next.hour(m.hour()).minute(m.minute()).second(0).millisecond(0);
          } else {
            next.hour(12).minute(0).second(0).millisecond(0);
          }
          onChange?.(next);
        }}
        allowClear
        size={size}
        className={["nr-report-ampm-date", className].filter(Boolean).join(" ")}
        popupClassName={popupClassName}
        style={{ width: "100%", borderRadius: 8 }}
        format="YYYY-MM-DD"
      />
      <ReportAmPmTimePicker value={m} onChange={onChange} size={size} className={className} />
    </div>
  );
}

/** Smaller template field labels on mobile portrait (long YES/NO questions). */
const NewReportModalMobilePortraitStyles = createGlobalStyle`
  @media (orientation: portrait) and (max-width: 768px) {
    .new-report-form-modal .nr-template-fields-mobile .ant-form-item-label {
      font-size: 14px;
      line-height: 1.35;
      white-space: normal;
      overflow: visible;
      height: auto !important;
      flex: 0 0 auto;
      max-width: 100%;
    }

    .new-report-form-modal .nr-template-fields-mobile .ant-form-item-label > label {
      font-size: 50%;
      line-height: 1.35;
      white-space: normal;
      word-break: break-word;
      height: auto;
    }

    .new-report-form-modal.new-report-form-modal--dark .nr-template-fields-mobile .ant-form-item-label > label {
      color: #f0f0f0 !important;
    }
  }
`;

/** Desktop list chrome — match proposed mockup (filters + table). */
const NewReportsListChromeStyles = createGlobalStyle`
  .nr-list-page {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  .nr-list-chrome {
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 16px 14px;
    margin-bottom: 0;
  }
  .nr-list-table-panel {
    width: 100%;
    box-sizing: border-box;
    margin-top: 14px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }
  .nr-list-table-panel--mobile {
    border: none;
    background: transparent;
    border-radius: 0;
    overflow: visible;
  }
  .nr-list-table-panel .ant-table-wrapper,
  .nr-list-table-panel .ant-spin-nested-loading,
  .nr-list-table-panel .ant-table,
  .nr-list-table-panel .ant-table-container,
  .nr-list-table-panel table {
    width: 100% !important;
  }
  .nr-list-table-panel .ant-table-pagination {
    margin: 12px 16px !important;
  }
  .nr-list-chrome-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .nr-list-chrome-title {
    margin: 0 0 2px;
    font-size: 22px;
    font-weight: 700;
    color: #166534;
    line-height: 1.2;
  }
  .nr-list-chrome-sub {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
  }
  .nr-list-chrome-tabs.ant-tabs {
    margin-bottom: 0 !important;
  }
  .nr-list-chrome-tabs .ant-tabs-nav {
    margin: 0 !important;
  }
  .nr-list-chrome-tabs .ant-tabs-nav::before {
    border-bottom: none !important;
  }
  .nr-list-chrome-tabs .ant-tabs-nav-list {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 3px;
  }
  .nr-list-chrome-tabs .ant-tabs-tab {
    margin: 0 !important;
    padding: 6px 16px !important;
    border-radius: 999px !important;
    border: none !important;
    background: transparent !important;
  }
  .nr-list-chrome-tabs .ant-tabs-tab + .ant-tabs-tab {
    margin-left: 0 !important;
  }
  .nr-list-chrome-tabs .ant-tabs-tab .ant-tabs-tab-btn {
    color: #6b7280;
    font-size: 13px;
  }
  .nr-list-chrome-tabs .ant-tabs-tab-active {
    background: #188038 !important;
  }
  .nr-list-chrome-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #fff !important;
    font-weight: 600;
    text-shadow: none;
  }
  .nr-list-chrome-tabs .ant-tabs-ink-bar {
    display: none !important;
  }
  /* Single filter strip — no nested card */
  .nr-list-chrome .nr-toolbar-card {
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 12px 12px 10px;
    width: 100%;
    box-sizing: border-box;
  }
  .nr-toolbar-form {
    display: grid !important;
    grid-template-columns: minmax(200px, 1.35fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(180px, 1.15fr) max-content;
    gap: 12px 12px;
    align-items: end;
  }
  .nr-toolbar-form.nr-toolbar-form--no-service {
    grid-template-columns: minmax(200px, 1.35fr) minmax(150px, 1fr) minmax(180px, 1.15fr) max-content;
  }
  .nr-toolbar-form .ant-form-item {
    margin: 0 !important;
    margin-right: 0 !important;
    margin-bottom: 0 !important;
  }
  .nr-toolbar-form .ant-form-item-label {
    padding-bottom: 4px !important;
  }
  .nr-toolbar-form .ant-form-item-label > label {
    font-size: 11px !important;
    font-weight: 600;
    color: #6b7280 !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    height: auto !important;
  }
  .nr-toolbar-form .ant-form-item-control-input {
    min-height: 0;
  }
  .nr-toolbar-form .ant-picker,
  .nr-toolbar-form .ant-select,
  .nr-toolbar-form .ant-input-affix-wrapper,
  .nr-toolbar-form .ant-input,
  .nr-toolbar-form .nr-dark-select-shell,
  .nr-toolbar-form .nr-dark-select-shell .ant-select {
    width: 100% !important;
    min-width: 0 !important;
    border-radius: 8px !important;
  }
  .nr-toolbar-form .nr-toolbar-actions.ant-form-item .ant-form-item-control-input-content {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }
  .nr-toolbar-form .nr-btn-search.ant-btn {
    background: #188038 !important;
    border-color: #188038 !important;
    color: #fff !important;
    border-radius: 8px;
    height: 36px;
    padding: 0 16px;
    font-weight: 600;
  }
  .nr-toolbar-form .nr-btn-new.ant-btn {
    background: #fff !important;
    border: 1px solid #86efac !important;
    color: #166534 !important;
    border-radius: 8px;
    height: 36px;
    padding: 0 16px;
    font-weight: 600;
  }
  .nr-toolbar-form .nr-btn-new.ant-btn:hover,
  .nr-toolbar-form .nr-btn-new.ant-btn:focus {
    border-color: #188038 !important;
    color: #188038 !important;
  }
  .nr-bulk-bar--chrome {
    margin-top: 10px;
    margin-bottom: 0 !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 10px !important;
    background: #fafafa !important;
    border: 1px dashed #d1d5db !important;
    border-radius: 8px !important;
    box-shadow: none !important;
  }
  .nr-bulk-bar-hint {
    font-size: 12px;
    color: #6b7280;
  }
  .nr-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    line-height: 1.35;
    white-space: normal;
  }
  .nr-list-table-panel .ant-table-thead > tr > th {
    background: #188038 !important;
    color: #fff !important;
    font-weight: 600;
    border-bottom: none !important;
  }
  .nr-list-table-panel .ant-table-thead > tr > th .ant-table-column-sorter {
    color: rgba(255, 255, 255, 0.75);
  }
  .nr-list-table-panel .ant-table.ant-table-bordered > .ant-table-container {
    border: none !important;
  }
  .nr-list-table-panel .ant-table.ant-table-bordered > .ant-table-container > .ant-table-content > table,
  .nr-list-table-panel .ant-table.ant-table-bordered > .ant-table-container > .ant-table-header > table {
    border: none !important;
  }
  @media (max-width: 1100px) {
    .nr-toolbar-form {
      grid-template-columns: 1fr 1fr !important;
    }
    .nr-toolbar-form .nr-toolbar-actions {
      grid-column: 1 / -1;
    }
    .nr-toolbar-form .nr-keyword-row {
      grid-column: 1 / -1;
    }
  }
  .new-reports-theme-dark .nr-list-chrome,
  .new-reports-theme-dark .nr-list-table-panel {
    background: #0a0a0a;
    border-color: #2e2e2e;
  }
  .new-reports-theme-dark .nr-list-chrome-title {
    color: #86efac;
  }
  .new-reports-theme-dark .nr-list-chrome .nr-toolbar-card,
  .new-reports-theme-dark .nr-bulk-bar--chrome {
    background: #141414 !important;
    border-color: #444444 !important;
  }
  .new-reports-theme-dark .nr-list-chrome-tabs .ant-tabs-nav-list {
    background: #1a1a1a;
    border-color: #444444;
  }
  .new-reports-theme-dark .nr-bulk-bar-hint {
    color: #9a9a9a;
  }
  .new-reports-theme-dark .nr-toolbar-form .nr-btn-new.ant-btn {
    background: #1a1a1a !important;
    border-color: #4ade80 !important;
    color: #86efac !important;
  }
`;

const renderClamp2 = (text: unknown) => {
  const full = text == null ? "" : String(text).trim();
  if (!full) return EM_DASH;
  return (
    <Tooltip title={full}>
      <span className="nr-clamp-2">{full}</span>
    </Tooltip>
  );
};

/** Mobile card list — $dark sets explicit colors (no CSS-variable fallbacks to white). */
const MobileReportsList = styled.div<MobileStyledDark>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$dark ? "18px" : "16px")};
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  background: ${(p) => (p.$dark ? "#000000" : "#e4e7eb")};
  border: none;
  border-radius: 0;
`;

const MobileReportCardShell = styled.article<MobileStyledDark & { $highlight?: boolean }>`
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  background: ${(p) => (p.$dark ? "#1e1e1e" : "#ffffff")};
  border: 2px solid ${(p) => (p.$dark ? "#525252" : "#c8c8c8")};
  border-radius: 12px;
  box-shadow: ${(p) =>
    p.$dark
      ? "0 0 0 1px #3d3d3d, 0 8px 28px rgba(0, 0, 0, 0.85)"
      : "0 4px 14px rgba(0, 0, 0, 0.12)"};
  overflow: hidden;

  ${(p) =>
    p.$highlight &&
    css`
      border-color: #52c41a;
      box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.45),
        ${p.$dark ? "0 8px 28px rgba(0, 0, 0, 0.85)" : "0 4px 14px rgba(0, 0, 0, 0.12)"};
    `}
`;

const MobileReportCardHead = styled.div<MobileStyledDark>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#404040" : "#e8e8e8")};
  background: ${(p) => (p.$dark ? "#1e1e1e" : "#ffffff")};
`;

const MobileReportCardHeadMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const MobileReportCardTitle = styled.div<MobileStyledDark>`
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: ${(p) => (p.$dark ? "#ffffff" : "#141414")};
  word-break: break-word;
`;

const MobileReportCardSite = styled.div<MobileStyledDark>`
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: ${(p) => (p.$dark ? "#b0b0b0" : "#595959")};
  word-break: break-word;
`;

const MobileReportCardDetails = styled.div<MobileStyledDark>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${(p) => (p.$dark ? "#141414" : "#f5f5f5")};
  border-top: 1px solid ${(p) => (p.$dark ? "#404040" : "#ebebeb")};
  border-bottom: 1px solid ${(p) => (p.$dark ? "#404040" : "#ebebeb")};
`;

const MobileReportCardDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  line-height: 1.4;
`;

const MobileReportCardLabel = styled.span<MobileStyledDark>`
  flex-shrink: 0;
  color: ${(p) => (p.$dark ? "#d0d6de" : "#8c8c8c")};
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const MobileReportCardValue = styled.span<MobileStyledDark>`
  text-align: right;
  color: ${(p) => (p.$dark ? "#ffffff" : "#262626")};
  font-weight: ${(p) => (p.$dark ? 600 : 400)};
  word-break: break-word;
`;

const MobileReportCardActions = styled.div<MobileStyledDark>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: ${(p) => (p.$dark ? "#1e1e1e" : "#ffffff")};
`;

const MobileReportCardActionsIcons = styled.div<MobileStyledDark>`
  display: flex;
  flex: 1;
  justify-content: flex-end;

  .ant-space {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px !important;
  }

  .ant-btn-link {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 38px !important;
    height: 38px !important;
    padding: 0 !important;
    border: 1px solid ${(p) => (p.$dark ? "#3a3a3a" : "#d9d9d9")} !important;
    border-radius: 8px !important;
    background: ${(p) => (p.$dark ? "#1a1a1a" : "#ffffff")} !important;
    color: ${(p) => (p.$dark ? "#e8e8e8" : "rgba(0, 0, 0, 0.85)")} !important;
  }

  .ant-btn-link .anticon {
    color: ${(p) => (p.$dark ? "#e8e8e8" : "inherit")} !important;
  }

  .ant-btn-link.ant-btn-dangerous {
    border-color: ${(p) => (p.$dark ? "#5c2a2a" : "#ffa39e")} !important;
    background: ${(p) => (p.$dark ? "#2a1515" : "#fff2f0")} !important;
    color: #ff7875 !important;
  }
`;

function isReportReadForViewer(row: any, viewerType: number): boolean {
  if (+viewerType === userType.ADMIN) return Boolean(row?.adminOpenedAt);
  if (+viewerType === userType.CUSTOMER) return Boolean(row?.customerOpenedAt);
  if (+viewerType === userType.STAFF) return Boolean(row?.staffOpenedAt);
  return false;
}

/** Closed book with a notification-style cross badge (unread). */
const UnreadBookIcon: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
    <defs>
      <filter id="unreadBookShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="0.75" stdDeviation="0.55" floodColor="#003a8c" floodOpacity="0.22" />
      </filter>
      <linearGradient id="unreadBookCover" x1="10.6" y1="4.25" x2="22.5" y2="19.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#69b1ff" />
        <stop offset="1" stopColor="#1677ff" />
      </linearGradient>
    </defs>
    <g filter="url(#unreadBookShadow)">
      <path
        d="M4 4.25h5.35c.69 0 1.25.56 1.25 1.25v14.5c0 .69-.56 1.25-1.25 1.25H4.75A1.75 1.75 0 0 1 3 19.5V4.25z"
        fill="#0958d9"
      />
      <path
        d="M10.6 4.25h9.65c1.24 0 2.25 1.01 2.25 2.25v12.75c0 1.24-1.01 2.25-2.25 2.25H10.6V4.25z"
        fill="url(#unreadBookCover)"
        stroke="#1677ff"
        strokeWidth="0.35"
      />
      <path d="M10.6 4.25v17.5" stroke="#0958d9" strokeWidth="0.85" />
      <path
        d="M19.05 6.55v11.05c0 .42-.33.75-.75.75"
        stroke="#0958d9"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M12.85 8.35h4.95M12.85 11.05h4.95M12.85 13.75h3.85M12.85 16.15h2.55"
        stroke="#fff"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
    <circle cx="18.25" cy="6.15" r="5.35" fill="#ff4d4f" stroke="#fff" strokeWidth="1.4" />
    <path
      d="M15.4 6.15h5.7M18.25 3.3v5.7"
      stroke="#fff"
      strokeWidth="1.65"
      strokeLinecap="round"
    />
  </svg>
);

/** Above Ant Design tooltips (~1070) so row action hovers do not cover confirm dialogs. */
const POPCONFIRM_ABOVE_TOOLTIP_Z = 1100;

const stopReadStatusEvent = (e: React.MouseEvent | React.SyntheticEvent) => {
  e.stopPropagation();
  e.nativeEvent?.stopImmediatePropagation?.();
};

const ReadUnreadStatusIcon: React.FC<{ read: boolean; showTooltip?: boolean }> = ({
  read,
  showTooltip = true,
}) => {
  const inner = read ? (
    <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} aria-label="Read" />
  ) : (
    <span aria-label="Unread" style={{ display: "inline-flex", lineHeight: 0 }}>
      <UnreadBookIcon />
    </span>
  );
  if (!showTooltip) return inner;
  return (
    <Tooltip title={read ? "Read" : "Unread"}>
      <span style={{ display: "inline-flex", lineHeight: 0 }}>{inner}</span>
    </Tooltip>
  );
};

const ReportReadStatusCell: React.FC<{
  row: any;
  viewerType: number;
  markingUnread?: boolean;
  onMarkUnread?: (row: any) => void;
}> = ({ row, viewerType, markingUnread, onMarkUnread }) => {
  const [markUnreadOpen, setMarkUnreadOpen] = useState(false);

  if (+viewerType === userType.CUSTOMER && +row.status === dJobStatus.DELETED) {
    return <Tag color="default">Removed</Tag>;
  }
  const read = isReportReadForViewer(row, viewerType);
  const canMarkUnread =
    read &&
    onMarkUnread &&
    (+viewerType === userType.ADMIN || +viewerType === userType.CUSTOMER);

  const icon = <ReadUnreadStatusIcon read={read} showTooltip={!canMarkUnread} />;

  const markUnreadConfirm = (
    <Popconfirm
      overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
      title={
        <span>
          Mark as unread?
          <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
            {+viewerType === userType.ADMIN
              ? "This report will show as unread for admin only."
              : "This report will show as unread for you only."}
          </div>
        </span>
      }
      okText="Mark unread"
      cancelText="Cancel"
      onOpenChange={setMarkUnreadOpen}
      onConfirm={() => onMarkUnread(row)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={stopReadStatusEvent}
        onMouseDown={stopReadStatusEvent}
        onKeyDown={stopReadStatusEvent}
        style={{
          cursor: markingUnread ? "wait" : "pointer",
          display: "inline-flex",
          lineHeight: 0,
          opacity: markingUnread ? 0.6 : 1,
        }}
        aria-label="Read — click to mark unread"
      >
        {markingUnread ? <Spin size="small" /> : icon}
      </span>
    </Popconfirm>
  );

  const inner = !canMarkUnread ? (
    icon
  ) : (
    <Tooltip title="Read" open={markUnreadOpen ? false : undefined}>
      <span style={{ display: "inline-flex", lineHeight: 0 }}>{markUnreadConfirm}</span>
    </Tooltip>
  );

  return (
    <div
      className="new-report-read-status"
      onClick={stopReadStatusEvent}
      onMouseDown={stopReadStatusEvent}
      style={{ display: "inline-flex", lineHeight: 0 }}
    >
      {inner}
    </div>
  );
};

const submittedDeleteFooterBtn: React.CSSProperties = {
  background: "#fafafa",
  borderColor: "#d9d9d9",
  color: "#8c8c8c",
  height: 40,
  borderRadius: 6,
  fontWeight: 400,
};
const submittedYesGreen = "#52c41a";

function buildSubmittedReportBlocks(reports: any[] | undefined) {
  const sorted = mergeReportMediaRowsForForm(reports || [])
    .filter((r) => !isJunkTemplateField({ name: r.name, type: r.type }))
    .sort((a, b) => (+a.order || 0) - (+b.order || 0));
  let n = 0;
  const blocks: Array<{ kind: "photos" | "field"; num: number; report: any; urls: string[] }> = [];
  for (const r of sorted) {
    const t = String(r.type || "").toUpperCase();
    n += 1;
    if (isJsonMediaFieldType(t)) {
      blocks.push({ kind: "photos", num: n, report: r, urls: parseMediaListValue(r.value) });
    } else {
      blocks.push({ kind: "field", num: n, report: r, urls: [] });
    }
  }
  return blocks;
}

function renderSubmittedReportValue(report: any): React.ReactNode {
  const v = report?.value;
  const t = String(report?.type || "").toUpperCase();
  if (v == null || v === "") return "—";
  if (t === "YES_NO") {
    const yes = String(v).toLowerCase() === "yes";
    return (
      <span style={{ color: yes ? submittedYesGreen : "#000", fontWeight: yes ? 600 : undefined }}>{String(v)}</span>
    );
  }
  if (t === "RICH_TEXT" || t === "RICHTEXT") {
    return (
      <div
        className="submitted-report-rich"
        dangerouslySetInnerHTML={{ __html: String(v) }}
        style={{ fontSize: 14 }}
      />
    );
  }
  if (t === "TABLE") {
    try {
      const p = JSON.parse(String(v));
      return <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(p, null, 2)}</pre>;
    } catch {
      return String(v);
    }
  }
  if (t === "VIDEOS" || t === "VIDEO") {
    const urls = parseMediaListValue(v);
    return (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {urls.map((u) =>
          isVideoMediaUrl(u) ? (
            <video
              key={u}
              src={u}
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", maxWidth: 480, maxHeight: 320, background: "#000", borderRadius: 4 }}
            />
          ) : (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              {(u.split("/").pop() || u).slice(0, 80)}
            </a>
          ),
        )}
      </Space>
    );
  }
  if (t === "DATE" || t === "DATE_PICKER" || t === "[REPORT_DATE]") {
    return formatReportViewDate(v);
  }
  if (t === "TIME" || t === "[REPORT_TIME]") {
    return formatReportViewTime(v);
  }
  if (t === "DATETIME" || t === "[REPORT_DATETIME]") {
    const m = moment(String(v));
    return m.isValid() ? m.format(`${REPORT_DISPLAY_DATE} ${REPORT_TIME_PICKER_FORMAT}`) : String(v);
  }
  return String(v);
}

function filterReportRowsByKeyword(rows: any[], draft: string): any[] {
  const kw = draft.trim().toLowerCase();
  if (!kw) return rows;
  return rows.filter((r) => {
    const site = String(r.siteName || "").toLowerCase();
    const service = String(r.serviceName || "").toLowerCase();
    return site.includes(kw) || service.includes(kw);
  });
}

const NewReports: React.FC<{
  lockedTemplateCategory?: string;
  pageTitle?: string;
}> = ({ lockedTemplateCategory, pageTitle = "sidebar.newReports" }) => {
  const intl = useIntl();
  const isIncidentReportMode =
    String(lockedTemplateCategory || "").toUpperCase() === INCIDENT_REPORT_CATEGORY;
  const isSafetyAuditMode =
    String(lockedTemplateCategory || "").toUpperCase() === SAFETY_AUDIT_CATEGORY;
  const dispatch = useDispatch();
  const refreshDashboard = useCallback(() => {
    dispatch(dashboardActions.getData({ startDate: "", endDate: "" }));
  }, [dispatch]);
  const location = useLocation();
  const history = useHistory();
  const [init, setInit] = useState<InitData>({});
  /** Table/list fetch only — not report submit (progress uses progressOpen). */
  const [listLoading, setListLoading] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{
    percent: number;
    label: string;
    photoCurrent?: number;
    photoTotal?: number;
  }>({ percent: 0, label: "" });
  const saveProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaUploadRefs = useRef<Record<string, UploadImageMultilHandle | null>>({});

  const clearSaveProgressTimer = useCallback(() => {
    if (saveProgressTimerRef.current) {
      clearInterval(saveProgressTimerRef.current);
      saveProgressTimerRef.current = null;
    }
  }, []);

  const resetSubmitUi = useCallback(() => {
    clearSaveProgressTimer();
    setProgressOpen(false);
    setSubmitProgress({ percent: 0, label: "" });
  }, [clearSaveProgressTimer]);

  const setSubmitStep = useCallback(
    (percent: number, label: string, photos?: { current: number; total: number }) => {
      setSubmitProgress({
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        label,
        photoCurrent: photos?.current,
        photoTotal: photos?.total,
      });
    },
    [],
  );
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [listFilters, setListFilters] = useState<ListQueryFilters>({});
  const [reportListTab, setReportListTab] = useState<ReportListTab>("active");
  const [deletedReportCount, setDeletedReportCount] = useState(0);
  const [listSort, setListSort] = useState({ orderBy: "submittedAt", orderValue: "DESC" });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [clearingDeleted, setClearingDeleted] = useState(false);
  const [filterServices, setFilterServices] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [viewPhotoKeys, setViewPhotoKeys] = useState<Set<string>>(() => new Set());
  const [markingUnreadId, setMarkingUnreadId] = useState<number | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [reportStaffId, setReportStaffId] = useState(0);
  const [listForm] = Form.useForm();
  const [listFiltersOpen, setListFiltersOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
  });
  const [sites, setSites] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  /** Site id that `services` was loaded for (avoids stale template list when changing sites). */
  const [servicesSiteId, setServicesSiteId] = useState<number | null>(null);
  const [loadingSiteServices, setLoadingSiteServices] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [mobilePdfUrl, setMobilePdfUrl] = useState<string | null>(null);
  const isMobilePortrait = useMobilePortrait();
  const { isDark } = useColorModeOptional();
  const showMobileCards = useNarrowViewport();
  const tableSearchKeywordRef = useRef("");
  const listSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listSearchDraft, setListSearchDraft] = useState("");

  useEffect(() => {
    if (!isMobilePortrait) setListFiltersOpen(true);
  }, [isMobilePortrait]);

  /** Mobile/portrait dark UI (top bar toggle + card list + bulk select). */
  const reportsPageDark = isDark && (isMobilePortrait || showMobileCards);
  // Keep modal dark mode consistent on mobile portrait regardless of list/card breakpoints.
  const modalUiDark = isDark && isMobilePortrait;

  useEffect(() => {
    const layoutDarkClass = "new-reports-layout-dark";
    const bodyDarkClass = "new-reports-page-body-dark";
    if (!reportsPageDark) {
      document.body.classList.remove(bodyDarkClass);
      document.querySelectorAll(`.${layoutDarkClass}`).forEach((el) => {
        el.classList.remove(layoutDarkClass);
      });
      return;
    }
    document.body.classList.add(bodyDarkClass);
    const wrap = document.querySelector(".new-reports-list-wrap");
    let node = wrap?.parentElement ?? null;
    while (node) {
      if (
        node.classList.contains("isoBoxWrapper") ||
        node.classList.contains("isoLayoutContentWrapper") ||
        node.classList.contains("isoExampleWrapper") ||
        node.id === "main-content" ||
        node.classList.contains("isomorphicContent")
      ) {
        node.classList.add(layoutDarkClass);
      }
      node = node.parentElement;
    }
    return () => {
      document.body.classList.remove(bodyDarkClass);
      document.querySelectorAll(`.${layoutDarkClass}`).forEach((el) => {
        el.classList.remove(layoutDarkClass);
      });
    };
  }, [reportsPageDark]);
  const mobileUiDark = reportsPageDark;
  const mobileDarkFieldStyle: React.CSSProperties | undefined = mobileUiDark
    ? { background: "#141414", borderColor: "#444444", color: "#ffffff" }
    : undefined;
  const mobileDarkBtnDefaultStyle: React.CSSProperties | undefined = mobileUiDark
    ? { background: "#141414", borderColor: "#333333", color: "#ffffff" }
    : undefined;

  const profile = useMemo(() => {
    try {
      const raw = localStorage.getItem("profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const profileId = profile?.id;
  const profileType = profile?.type;
  const isStaffUser = +profileType === userType.STAFF;
  const isAdminUser = +profileType === userType.ADMIN;
  const isCustomerUser = +profileType === userType.CUSTOMER;
  const showReportDeletedTabs = isCustomerUser || isStaffUser || isAdminUser;
  const isDeletedReportTab = showReportDeletedTabs && reportListTab === "deleted";

  const patchRowReadState = useCallback(
    (id: number) => {
      const field =
        +profileType === userType.ADMIN
          ? "adminOpenedAt"
          : +profileType === userType.CUSTOMER
            ? "customerOpenedAt"
            : "staffOpenedAt";
      const now = new Date().toISOString();
      setRows((prev) => {
        const target = prev.find((r) => r.id === id);
        if (!target || target[field]) return prev;
        return prev.map((r) => (r.id === id ? { ...r, [field]: now } : r));
      });
      setViewRow((prev) => {
        if (!prev || prev.id !== id || prev[field]) return prev;
        return { ...prev, [field]: now };
      });
    },
    [profileType],
  );

  const clearRowReadState = useCallback(
    (id: number) => {
      const field =
        +profileType === userType.ADMIN
          ? "adminOpenedAt"
          : +profileType === userType.CUSTOMER
            ? "customerOpenedAt"
            : "staffOpenedAt";
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: null } : r)),
      );
      setViewRow((prev) => (prev?.id === id ? { ...prev, [field]: null } : prev));
    },
    [profileType],
  );

  const markReportUnread = useCallback(
    async (row: { id?: number }) => {
      const id = row?.id;
      if (!id) return;
      setMarkingUnreadId(+id);
      try {
        const res = await markCustomReportUnread(+id, +profileType);
        if (res?.code === 1) {
          clearRowReadState(+id);
          refreshDashboard();
          message.success("Marked as unread");
        } else {
          message.error(res?.message || "Could not mark as unread");
        }
      } finally {
        setMarkingUnreadId(null);
      }
    },
    [profileType, clearRowReadState, refreshDashboard],
  );

  const linkedReportAutoOpenedRef = useRef<number | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const markReportOpenedInFlightRef = useRef<Set<number>>(new Set());
  const markReportOpenedDoneRef = useRef<Set<number>>(new Set());

  const markReportOpenedForViewer = useCallback(
    async (rowOrId: { id?: number } | number | null | undefined) => {
      const id = typeof rowOrId === "number" ? rowOrId : rowOrId?.id;
      if (!id) return false;
      if (markReportOpenedDoneRef.current.has(id)) return true;
      if (markReportOpenedInFlightRef.current.has(id)) return false;

      const openedField =
        +profileType === userType.ADMIN
          ? "adminOpenedAt"
          : +profileType === userType.CUSTOMER
            ? "customerOpenedAt"
            : +profileType === userType.STAFF
              ? "staffOpenedAt"
              : null;
      const row =
        typeof rowOrId === "number" ? rowsRef.current.find((r) => +r.id === id) : rowOrId;
      if (openedField && row?.[openedField]) {
        markReportOpenedDoneRef.current.add(id);
        return true;
      }

      if (![+userType.ADMIN, +userType.CUSTOMER, +userType.STAFF].includes(+profileType)) return false;

      markReportOpenedInFlightRef.current.add(id);
      if (
        +profileType === userType.ADMIN ||
        +profileType === userType.CUSTOMER ||
        +profileType === userType.STAFF
      ) {
        patchRowReadState(id);
      }
      try {
        const res = await markCustomReportOpened(id, +profileType);
        if (res?.code === 1) {
          markReportOpenedDoneRef.current.add(id);
          return true;
        }
        return false;
      } finally {
        markReportOpenedInFlightRef.current.delete(id);
      }
    },
    [profileType, patchRowReadState],
  );

  const linkedReportId = useMemo(() => {
    const id = new URLSearchParams(location.search).get("reportId");
    return id ? +id : null;
  }, [location.search]);

  const scrollToHighlightedRow = useCallback(() => {
    window.setTimeout(() => {
      document.querySelector("tr.report-row-highlight")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);
  }, []);

  const reportTemplates = useMemo(() => {
    const all = init.reportTemplates || [];
    let filtered = all;
    if (lockedTemplateCategory) {
      const locked = lockedTemplateCategory.toUpperCase();
      filtered = filtered.filter(
        (t: any) => String(t?.category || "").toUpperCase() === locked,
      );
    } else {
      // Own-page types (Incident, Monthly Safety Audit) live under their sidebar routes.
      const excluded = new Set(
        NEW_REPORTS_OWN_PAGE_CATEGORIES.map((c) => String(c).toUpperCase()),
      );
      filtered = filtered.filter(
        (t: any) => !excluded.has(String(t?.category || "").toUpperCase()),
      );
    }
    return filtered;
  }, [init.reportTemplates, lockedTemplateCategory]);

  const safetyAuditTemplateIds = useMemo(() => {
    if (!lockedTemplateCategory) return null as Set<number> | null;
    return new Set(
      reportTemplates
        .map((t: any) => +t.id)
        .filter((n: number) => Number.isFinite(n) && n > 0),
    );
  }, [lockedTemplateCategory, reportTemplates]);

  const loadInit = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.PRODUCTS_INIT_DATA}?items=REPORT_TEMPLATES`,
      "GET",
    );
    setInit((res?.data || {}) as InitData);
  }, []);

  const loadFilterServices = useCallback(async (siteId?: number) => {
    const params: Record<string, number> = {};
    if (siteId != null && +siteId > 0) params.siteId = +siteId;
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.JOB_SITES}/getServicesBySite`,
      "GET",
      params,
    );
    setFilterServices(res?.data || []);
  }, []);

  const loadSites = useCallback(async () => {
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getSites`, "GET");
    setSites(res?.data || []);
    await loadFilterServices();
  }, [loadFilterServices]);

  const loadDeletedReportCount = useCallback(async (filters: ListQueryFilters = listFilters) => {
    if (!showReportDeletedTabs || !profileId) return;
    try {
      const staffId = +profileType === userType.STAFF ? +profileId : undefined;
      const n = await fetchCustomReportDeletedCount(
        { ...filters, templateCategory: lockedTemplateCategory || undefined },
        staffId,
      );
      setDeletedReportCount(n);
    } catch {
      /* ignore */
    }
  }, [showReportDeletedTabs, profileId, profileType, listFilters, lockedTemplateCategory]);

  const loadRows = useCallback(
    async (
      nextPage = page,
      nextLimit = limit,
      filters: ListQueryFilters = listFilters,
      sort = listSort,
      tab: ReportListTab = reportListTab,
    ) => {
      setListLoading(true);
      try {
        const reportIdFromUrl = new URLSearchParams(location.search).get("reportId");
        let list: any[] = [];
        let total = 0;

        if (reportIdFromUrl) {
          const rid = +reportIdFromUrl;
          const listed = await fetchCustomReportsList({ reportId: rid });
          list = listed.rows;
          total = list.length;
          if (!list.length) {
            const one = await fetchCustomReportById(rid);
            if (one) list = [one];
            total = list.length;
          }
        } else {
          const listed = await fetchCustomReportsList({
            page: nextPage,
            limit: nextLimit,
            tab,
            staffId: profileId && +profileType === userType.STAFF ? +profileId : undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
            siteId: filters.siteId,
            serviceId: filters.serviceId,
            keyword: filters.keyword,
            sort: sort.orderBy ? sort : undefined,
            templateCategory: lockedTemplateCategory || undefined,
          });
          list = listed.rows;
          total = listed.count;
        }

        if (safetyAuditTemplateIds) {
          const allTemplatesLoaded = Array.isArray(init.reportTemplates);
          if (!allTemplatesLoaded) {
            list = [];
            total = 0;
          } else if (safetyAuditTemplateIds.size === 0) {
            list = [];
            total = 0;
          } else {
            list = list.filter((r: any) =>
              safetyAuditTemplateIds.has(+r.reportTemplateId),
            );
            if (!reportIdFromUrl) total = list.length;
          }
        }

        setRows(list);
        setCount(reportIdFromUrl ? list.length : total);
        if (reportIdFromUrl) setPage(1);
        const visibleIds = new Set(list.map((r: any) => r.id));
        setSelectedRowKeys((prev) => prev.filter((k) => visibleIds.has(k)));
        if (showReportDeletedTabs && !reportIdFromUrl) {
          void loadDeletedReportCount(filters);
        }
      } finally {
        setListLoading(false);
      }
    },
    [
      page,
      limit,
      listFilters,
      listSort,
      reportListTab,
      profileId,
      profileType,
      location.search,
      showReportDeletedTabs,
      loadDeletedReportCount,
      safetyAuditTemplateIds,
      init.reportTemplates,
      lockedTemplateCategory,
    ],
  );

  useEffect(() => {
    loadInit();
    loadSites();
  }, [loadInit, loadSites]);

  useEffect(() => {
    if (showReportDeletedTabs) void loadDeletedReportCount();
  }, [showReportDeletedTabs, loadDeletedReportCount]);

  useEffect(() => {
    const type = profile ? +profile.type : 0;
    if (type !== userType.ADMIN && type !== userType.CUSTOMER) return;
    void (async () => {
      const res = await markAllCustomReportsOpened();
      if (res?.code === 1) {
        refreshDashboard();
      }
    })();
  }, [profile, refreshDashboard]);

  useEffect(() => {
    const reportIdFromUrl = new URLSearchParams(location.search).get("reportId");
    if (reportIdFromUrl) {
      loadRows(1, limit, listFilters);
      return;
    }
    loadRows(page, limit, listFilters);
  }, [page, limit, listFilters, listSort, reportListTab, loadRows, location.search]);

  const onTableChange = (pagination: any, _filters: any, sorter: any, extra?: { action?: string }) => {
    if (extra?.action === "paginate") {
      setPage(pagination.current);
      if (pagination.pageSize !== limit) setLimit(pagination.pageSize);
      return;
    }

    const colSorter = Array.isArray(sorter)
      ? [...sorter].reverse().find((s: { order?: string }) => s?.order) ?? sorter[sorter.length - 1]
      : sorter;
    const rawField = colSorter?.columnKey ?? colSorter?.field;
    if (rawField == null) return;

    setPage(1);
    const field = String(Array.isArray(rawField) ? rawField[rawField.length - 1] : rawField);
    const allowed = new Set([
      "staffFullName",
      "siteName",
      "serviceName",
      "customerName",
      "submittedAt",
      "updatedAt",
      "status",
      "readStatus",
    ]);
    if (!allowed.has(field)) return;
    const orderField = field === "updatedAt" ? "submittedAt" : field;

    if (colSorter.order === "ascend") {
      setListSort({ orderBy: orderField, orderValue: "ASC" });
      return;
    }
    if (colSorter.order === "descend") {
      setListSort({ orderBy: orderField, orderValue: "DESC" });
      return;
    }
    // readStatus: two-state only (unread first → read first), no "clear sort"
    if (field === "readStatus") {
      setListSort((prev) =>
        prev.orderBy === "readStatus"
          ? { orderBy: "readStatus", orderValue: prev.orderValue === "ASC" ? "DESC" : "ASC" }
          : { orderBy: "readStatus", orderValue: "ASC" },
      );
      return;
    }
    setListSort({ orderBy: "submittedAt", orderValue: "DESC" });
  };

  useEffect(() => {
    if (!linkedReportId || listLoading) return;
    if (linkedReportAutoOpenedRef.current === linkedReportId) return;
    const row = rows.find((r) => +r.id === linkedReportId);
    if (row) {
      linkedReportAutoOpenedRef.current = linkedReportId;
      scrollToHighlightedRow();
      void markReportOpenedForViewer(linkedReportId);
    }
  }, [linkedReportId, listLoading, rows, scrollToHighlightedRow, markReportOpenedForViewer]);

  const applyListFiltersFromForm = async () => {
    try {
      await listForm.validateFields();
    } catch {
      /* filter with current values */
    }
    const v = listForm.getFieldsValue();
    const next: ListQueryFilters = {};
    if (v.dateRange?.[0] && v.dateRange?.[1]) {
      next.startDate = v.dateRange[0].format("YYYY-MM-DD");
      next.endDate = v.dateRange[1].format("YYYY-MM-DD");
    }
    if (v.siteId != null && v.siteId !== "") next.siteId = +v.siteId;
    if (v.serviceId != null && v.serviceId !== "") next.serviceId = String(v.serviceId);
    const kw = tableSearchKeywordRef.current.trim();
    if (kw) next.keyword = kw;
    setListFilters(next);
    setPage(1);
  };

  const applyKeywordFilter = (raw: string) => {
    tableSearchKeywordRef.current = raw;
    const kw = raw.trim();
    setListFilters((prev) => {
      const prevKw = (prev.keyword || "").trim();
      if (kw === prevKw) return prev;
      const next = { ...prev };
      if (kw) next.keyword = kw;
      else delete next.keyword;
      return next;
    });
    setPage(1);
  };

  const onListSearchInputChange = (raw: string) => {
    setListSearchDraft(raw);
    tableSearchKeywordRef.current = raw;
    if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    if (!raw.trim()) {
      applyKeywordFilter(raw);
      return;
    }
    listSearchDebounceRef.current = setTimeout(() => applyKeywordFilter(raw), 200);
  };

  const onListSearchInputSearch = (raw: string) => {
    if (listSearchDebounceRef.current) {
      clearTimeout(listSearchDebounceRef.current);
      listSearchDebounceRef.current = null;
    }
    setListSearchDraft(raw);
    applyKeywordFilter(raw);
  };

  const onListFilterSiteChange = async (siteId: number | undefined) => {
    listForm.setFieldsValue({ siteId: siteId ?? undefined, serviceId: undefined });
    await loadFilterServices(siteId);
    await applyListFiltersFromForm();
  };

  const onListFilterServiceChange = async (serviceId?: string) => {
    listForm.setFieldsValue({ serviceId: serviceId ?? undefined });
    await applyListFiltersFromForm();
  };

  const onSearchList = async () => {
    await applyListFiltersFromForm();
  };

  const openView = useCallback(async (row: any) => {
    let viewData = row;
    try {
      const one = await fetchCustomReportById(+row.id);
      if (one) viewData = one;
    } catch {
      /* list row fallback */
    }
    const mergedReports = mergeReportMediaRowsForForm(
      Array.isArray(viewData.reports) ? viewData.reports : [],
    );
    setViewRow({ ...viewData, reports: mergedReports });
    setViewOpen(true);
    await markReportOpenedForViewer(row);
  }, [markReportOpenedForViewer]);

  const viewRowId = viewRow?.id;
  useEffect(() => {
    if (viewOpen && viewRowId) setViewPhotoKeys(new Set());
  }, [viewOpen, viewRowId]);

  const viewBannerTitle = useMemo(() => {
    if (!viewRow) return "";
    const tpl = reportTemplates.find((x: any) => +x.id === +viewRow.reportTemplateId);
    const fromTpl = tpl?.name && String(tpl.name).trim();
    return fromTpl || buildReportDisplayTitle(viewRow);
  }, [viewRow, reportTemplates]);

  const viewReports = viewRow?.reports;
  const viewReportBlocks = useMemo(() => buildSubmittedReportBlocks(viewReports), [viewReports]);

  const viewStatusPill = useMemo(() => {
    if (!viewRow) return null;
    if (+profileType === userType.ADMIN || +profileType === userType.CUSTOMER) {
      return (
        <ReportReadStatusCell
          row={viewRow}
          viewerType={+profileType}
          markingUnread={markingUnreadId === +viewRow.id}
          onMarkUnread={markReportUnread}
        />
      );
    }
    return null;
  }, [viewRow, profileType, markingUnreadId, markReportUnread]);

  const viewPdfHref = useMemo(
    () => (viewRow ? resolveReportPdfHref(getReportPdfField(viewRow)) : ""),
    [viewRow],
  );

  const openMobilePdf = useCallback((href: string) => {
    if (href) setMobilePdfUrl(href);
  }, []);

  const closeMobilePdf = useCallback(() => {
    setMobilePdfUrl(null);
  }, []);

  const handleOpenReportPdf = useCallback(
    (href: string, row?: any) => {
      if (!href) return;
      if (row) void markReportOpenedForViewer(row);
      if (isMobilePortrait) {
        openMobilePdf(href);
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [isMobilePortrait, openMobilePdf, markReportOpenedForViewer],
  );

  useEffect(() => {
    if (!isMobilePortrait || !mobilePdfUrl) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobilePortrait, mobilePdfUrl]);

  const toggleViewPhoto = (url: string, checked: boolean) => {
    setViewPhotoKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(url);
      else next.delete(url);
      return next;
    });
  };

  const confirmDeleteViewReport = () => {
    if (!viewRow?.id) return;
    const isAdmin = +profileType === userType.ADMIN;
    const isCustomer = +profileType === userType.CUSTOMER;
    const isStaff = +profileType === userType.STAFF;
    if (!isAdmin && !isCustomer && !isStaff) return;
    // Admin hard-delete only from Deleted; active list is always soft-delete.
    const adminHardDelete = isAdmin && isDeletedReportTab;
    Modal.confirm({
      title: adminHardDelete
        ? "Permanently delete this report?"
        : isAdmin
          ? "Move this report to Deleted?"
          : "Remove this report from your list?",
      content: adminHardDelete
        ? "This permanently removes the report and its submitted data. This cannot be undone."
        : isAdmin
          ? "You can permanently delete it later from the Deleted tab (admin only)."
          : "The report moves to Deleted. You can restore it from the Deleted tab.",
      okText: adminHardDelete ? "Delete permanently" : isAdmin ? "Move to Deleted" : "Remove",
      okType: "danger",
      onOk: async () => {
        const res = await deleteCustomReport(+viewRow.id);
        if (res?.code === 1) {
          message.success(
            adminHardDelete
              ? "Report permanently deleted"
              : isAdmin
                ? "Report moved to Deleted"
                : "Report moved to Deleted",
          );
          setViewOpen(false);
          setViewRow(null);
          await loadRows(page, limit, listFilters);
          refreshDashboard();
        } else {
          message.error(res?.message || "Could not delete this report");
        }
      },
    });
  };

  const selectedTemplateId = Form.useWatch("reportTemplateId", form);
  const watchedSiteId = Form.useWatch("siteId", form);
  const watchedCustomerId = Form.useWatch("customerId", form);
  const watchedServiceId = Form.useWatch("serviceId", form);
  const isOtherSite = isOtherJobSite(watchedSiteId);
  const editingReportTemplateId = editing?.reportTemplateId;
  const allInitReportTemplates = init.reportTemplates;

  const activeFormTemplate = useMemo(() => {
    const id =
      selectedTemplateId != null && selectedTemplateId !== ""
        ? selectedTemplateId
        : editingReportTemplateId;
    if (id == null || id === "") return null;
    return (
      reportTemplates.find((t: any) => +t.id === +id) ||
      (allInitReportTemplates || []).find((t: any) => +t.id === +id) ||
      null
    );
  }, [selectedTemplateId, editingReportTemplateId, reportTemplates, allInitReportTemplates]);

  /** Modal/create title: "New Incident Report", "New Adhoc Report", etc. */
  const formReportKindLabel = useMemo(() => {
    if (isIncidentReportMode) return "Incident Report";
    if (isSafetyAuditMode) return "Safety Audit";
    const cat = String(activeFormTemplate?.category || "").toUpperCase();
    if (cat === INCIDENT_REPORT_CATEGORY) return "Incident Report";
    if (cat === SAFETY_AUDIT_CATEGORY) return "Safety Audit";
    const name = String(activeFormTemplate?.name || "").trim();
    return name || "";
  }, [isIncidentReportMode, isSafetyAuditMode, activeFormTemplate]);

  const formModalTitle = editing
    ? formReportKindLabel
      ? `Update ${formReportKindLabel}`
      : "Update report"
    : formReportKindLabel
      ? `New ${formReportKindLabel}`
      : "New report";

  const newReportButtonLabel = isIncidentReportMode
    ? "New Incident Report"
    : isSafetyAuditMode
      ? "New Safety Audit"
      : "New";

  /** Form copy for incident fields even when opened from New Reports. */
  const isIncidentForm =
    isIncidentReportMode ||
    String(activeFormTemplate?.category || "").toUpperCase() === INCIDENT_REPORT_CATEGORY;
  const filteredReportTemplates = useMemo(() => {
    const staffStyleCreate = isStaffUser || (isAdminUser && !editing?.id);
    if (!staffStyleCreate || !watchedSiteId) return reportTemplates;
    if (isOtherJobSite(watchedSiteId)) return reportTemplates;
    const siteId = +watchedSiteId;
    if (
      loadingSiteServices ||
      servicesSiteId == null ||
      servicesSiteId !== siteId
    ) {
      return [];
    }
    const siteDeptIds = services
      .map((d: any) => +d.id)
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (!siteDeptIds.length) return [];
    return reportTemplates.filter((t) => templateMatchesSiteServices(t, siteDeptIds));
  }, [
    reportTemplates,
    isStaffUser,
    isAdminUser,
    editing,
    watchedSiteId,
    services,
    servicesSiteId,
    loadingSiteServices,
  ]);
  const selectedTemplate = useMemo(
    () => reportTemplates.find((t: any) => +t.id === +selectedTemplateId),
    [reportTemplates, selectedTemplateId],
  );

  const selectedTemplateName = selectedTemplate?.name ? String(selectedTemplate.name).trim() : "";

  const templateItemsForSubmit = useMemo((): TemplateItem[] => {
    if (!Array.isArray(selectedTemplate?.items)) return [];
    return selectedTemplate.items
      .slice()
      .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0))
      .filter((it: TemplateItem) => !isJunkTemplateField(it));
  }, [selectedTemplate]);

  const isHiddenFromStaffCreate = useCallback((it: TemplateItem): boolean => {
    const t = String(it?.type || "").toUpperCase();
    if (t === "DATE" || t === "DATE_PICKER" || t === "TIME" || t === "DATETIME" || t === "[REPORT_DATE]" || t === "[REPORT_TIME]" || t === "[REPORT_DATETIME]") {
      const visibleToStaff = it?.config?.visibleToStaff;
      if (typeof visibleToStaff === "boolean") return !visibleToStaff;
      return false; // default = visible
    }
    return false;
  }, []);

  const templateItemsForRender = useMemo((): TemplateItem[] => {
    if (!templateItemsForSubmit.length) return [];
    if (!isStaffUser) return templateItemsForSubmit;
    return templateItemsForSubmit.filter((it) => !isHiddenFromStaffCreate(it));
  }, [templateItemsForSubmit, isStaffUser, isHiddenFromStaffCreate]);


  const applyTemplateFieldDefaults = useCallback(
    (tpl: { items?: TemplateItem[] } | null | undefined) => {
      if (!tpl?.items?.length || editing) return;
      const patch: Record<string, string | moment.Moment | undefined> = {};
      const sorted = tpl.items
        .slice()
        .sort((a: TemplateItem, b: TemplateItem) => (+a.order || 0) - (+b.order || 0));
      const baseValues = form.getFieldsValue();
      sorted.forEach((it: TemplateItem, idx: number) => {
        if (isJunkTemplateField(it)) return;
        const fieldKey = getTemplateFieldKey(it, idx);
        patch[fieldKey] = undefined;
        const fieldType = String(it.type || "").toUpperCase();
        if (fieldType === "YES_NO") {
          const preset = getYesNoPreset(it);
          if (preset) patch[fieldKey] = preset;
        } else if (
          fieldType === "DATE" ||
          fieldType === "DATE_PICKER" ||
          fieldType === "TIME" ||
          fieldType === "DATETIME"
        ) {
          // Staff wants Date/Time prefilled with "now" on new reports (but never overwrite).
          const current = baseValues[fieldKey];
          if (current === undefined || current === null || current === "") {
            patch[fieldKey] = moment();
          }
        } else if (isAutoMergeTemplateField(it)) {
          if (autoMergeUsesPicker(it, isStaffUser)) {
            const current = baseValues[fieldKey];
            if (current === undefined || current === null || current === "") {
              patch[fieldKey] = moment();
            }
          } else {
            patch[fieldKey] = resolveAutoMergeFieldValue(it, baseValues, profile);
          }
        }
      });
      form.setFieldsValue(patch);
    },
    [form, editing, profile, isStaffUser],
  );

  const refreshAutoMergeTemplateFields = useCallback(() => {
    const patch: Record<string, string> = {};
    const vals = form.getFieldsValue();
    templateItemsForSubmit.forEach((it, idx) => {
      if (!isAutoMergeTemplateField(it)) return;
      if (autoMergeUsesPicker(it, isStaffUser)) return;
      patch[getTemplateFieldKey(it, idx)] = resolveAutoMergeFieldValue(it, vals, profile);
    });
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [form, templateItemsForSubmit, profile, isStaffUser]);

  const openCreate = () => {
    resetSubmitUi();
    setEditing(null);
    form.resetFields();
    setServices([]);
    setServicesSiteId(null);
    setLoadingSiteServices(false);
    setCustomers([]);
    setReportStaffId(isStaffUser && profile?.id ? +profile.id : 0);
    setVisible(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") !== "1") return;
    if (+profileType === userType.CUSTOMER) {
      history.replace({ pathname: "/new-reports", search: "" });
      return;
    }
    openCreate();
    history.replace({ pathname: "/new-reports", search: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const applyStaffSiteAssignment = useCallback(async (
    siteId: number,
    serviceId?: number,
    opts?: { silent?: boolean; ignoreStoredStaffId?: boolean },
  ): Promise<boolean> => {
    const fetchAssignment = async (staffIdParam?: number) => {
      const params: Record<string, number> = { siteId };
      if (serviceId != null && Number.isFinite(+serviceId) && +serviceId > 0) {
        params.serviceId = +serviceId;
      }
      if (
        isAdminUser &&
        staffIdParam != null &&
        Number.isFinite(+staffIdParam) &&
        +staffIdParam > 0
      ) {
        params.staffId = +staffIdParam;
      }
      const assignRes = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/getStaffReportAssignmentBySite`,
        "GET",
        params,
      );
      return assignRes?.data;
    };

    const storedStaffId =
      !opts?.ignoreStoredStaffId && isAdminUser && reportStaffId > 0
        ? reportStaffId
        : undefined;

    // Admin: try with current staff filter first, then any site assignment
    // (changing Job site must not keep a previous site's staffId locked in).
    let a = await fetchAssignment(storedStaffId);
    if (!a?.customerId && storedStaffId) {
      a = await fetchAssignment(undefined);
    }

    if (!a?.customerId) {
      if (!opts?.silent) {
        message.warning(
          isAdminUser
            ? "No customer or Service is linked to this job site assignment."
            : "No customer is linked to your assignment for this job site.",
        );
      }
      return false;
    }
    const patch: Record<string, unknown> = {
      serviceId: String(a.serviceId),
      serviceName: a.serviceName || "",
      customerId: +a.customerId,
      customerName: a.customerName || "",
      companyName: a.companyName || "",
    };
    if (a.staffId != null && +a.staffId > 0) setReportStaffId(+a.staffId);
    else if (isStaffUser && profile?.id) setReportStaffId(+profile.id);
    else if (isAdminUser && profile?.id) setReportStaffId(+profile.id);
    form.setFieldsValue(patch);
    return true;
  }, [form, isAdminUser, isStaffUser, profile, reportStaffId]);

  const openEdit = useCallback(async (row: any) => {
    resetSubmitUi();
    await markReportOpenedForViewer(row);

    let editRow = row;
    try {
      const one = await fetchCustomReportById(+row.id);
      if (one) editRow = one;
    } catch {
      /* list row fallback */
    }

    const mergedReports = mergeReportMediaRowsForForm(
      Array.isArray(editRow.reports) ? editRow.reports : [],
    );
    setEditing({ ...editRow, reports: mergedReports });
    form.resetFields();
    const reportValues: Record<string, any> = {};
    const editTpl =
      reportTemplates.find((t: any) => +t.id === +editRow.reportTemplateId) ||
      (init.reportTemplates || []).find((t: any) => +t.id === +editRow.reportTemplateId);
    if (editTpl?.items?.length && mergedReports.length) {
      const sortedTpl = editTpl.items
        .slice()
        .filter((it: TemplateItem) => !isJunkTemplateField(it))
        .sort((a: TemplateItem, b: TemplateItem) => (+a.order || 0) - (+b.order || 0));
      sortedTpl.forEach((it: TemplateItem, idx: number) => {
        const fieldKey = getTemplateFieldKey(it, idx);
        const rep = matchReportItemForTemplate(mergedReports, it, idx);
        let parsed = parseReportItemValueForForm(rep);
        if (isTimeLikeTemplateItem(it)) {
          if (moment.isMoment(parsed) && parsed.isValid()) {
            parsed = moment(moment().format(`YYYY-MM-DD ${parsed.format("HH:mm:ss")}`));
          } else if (parsed != null && String(parsed).trim() !== "") {
            const s = String(parsed).trim();
            const strict = moment(s, ["HH:mm:ss", "HH:mm", "h:mm:ss a", "h:mm a"], true);
            const m = strict.isValid() ? strict : moment(new Date(s));
            if (m.isValid()) {
              parsed = moment(moment().format(`YYYY-MM-DD ${m.format("HH:mm:ss")}`));
            } else {
              parsed = undefined;
            }
          }
        }
        // Site auto fields: fall back to task columns when report snapshot omitted them.
        if (parsed === undefined || parsed === null || parsed === "") {
          const t = String(it.type || "").toUpperCase();
          if (t === "[SITE_NAME]" && editRow.siteName) parsed = String(editRow.siteName);
          if (t === "[SITE_ADDRESS]" && editRow.siteAddress) parsed = String(editRow.siteAddress);
        }
        if (parsed !== undefined && parsed !== null && parsed !== "") {
          reportValues[fieldKey] = parsed;
        }
      });

      const coveredKeys = new Set<string>();
      sortedTpl.forEach((it: TemplateItem, idx: number) => {
        const rep = matchReportItemForTemplate(mergedReports, it, idx);
        if (rep) {
          coveredKeys.add(reportFieldStorageKey(rep.name));
          const synthesized = (rep as any).__synthesizedFrom;
          if (Array.isArray(synthesized)) {
            synthesized.forEach((n: string) => coveredKeys.add(reportFieldStorageKey(n)));
          }
        }
      });
      mergedReports.forEach((r: any, idx: number) => {
        if (coveredKeys.has(reportFieldStorageKey(r.name))) return;
        if (isObsoleteCombinedDateTimeRow(r, sortedTpl)) return;
        if (isObsoleteSeparateDateOrTimeRow(r, sortedTpl)) return;
        const parsed = parseReportItemValueForForm(r);
        if (parsed !== undefined) {
          reportValues[legacyFieldKey(r, idx)] = parsed;
        }
      });
    } else if (mergedReports.length) {
      mergedReports
        .slice()
        .filter((r: any) => !isJunkTemplateField({ name: r?.name, type: r?.type }))
        .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0))
        .forEach((r: any, idx: number) => {
          reportValues[legacyFieldKey(r, idx)] = parseReportItemValueForForm(r);
        });
    }

    const siteId = editRow.siteId;
    const serviceId = editRow.serviceId;

    setServices([]);
    setServicesSiteId(null);
    setLoadingSiteServices(Boolean(siteId));
    try {
      if (siteId) {
        const depRes = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.JOB_SITES}/getServicesBySite`,
          "GET",
          { siteId },
        );
        const deptRows = depRes?.data || [];
        setServices(deptRows);
        setServicesSiteId(+siteId);
      }
    } finally {
      setLoadingSiteServices(false);
    }

    let customerRows: any[] = [];
    if (siteId && serviceId != null && serviceId !== "") {
      const custRes = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getCustomersBySite`, "GET", {
        siteId,
        serviceId: String(serviceId),
      });
      customerRows = custRes?.data || [];
    }

    const cid = editRow.customerId;
    if (cid != null && !customerRows.some((c: any) => +c.id === +cid)) {
      customerRows = [
        ...customerRows,
        {
          id: cid,
          fullName: editRow.customerName || editRow.customer?.fullName,
          customerName: editRow.customerName || editRow.customer?.fullName,
          companyName: editRow.companyName,
          customerInfo: editRow.companyName ? { companyName: editRow.companyName } : editRow.customer?.customerInfo,
        },
      ];
    }
    setCustomers(customerRows);

    form.setFieldsValue({
      ...reportValues,
      description: editRow.description,
      siteId: editRow.siteId,
      siteName: editRow.siteName,
      siteLocation: editRow.siteLocation,
      siteAddress: editRow.siteAddress,
      serviceId: editRow.serviceId != null ? String(editRow.serviceId) : undefined,
      serviceName: editRow.serviceName,
      customerId: editRow.customerId != null ? +editRow.customerId : undefined,
      customerName: editRow.customerName,
      companyName: editRow.companyName,
      reportTemplateId: editRow.reportTemplateId,
      });
    setReportStaffId(editRow.staffId ?? (profile?.id ? +profile.id : 0));

    if (isStaffUser && editRow.siteId && (editRow.customerId == null || editRow.customerId === "")) {
      await applyStaffSiteAssignment(+editRow.siteId);
    }

    setVisible(true);
    // Re-apply after mount so DatePicker / AM-PM selects pick up saved moments.
    const fullValues = {
      ...reportValues,
      description: editRow.description,
      siteId: editRow.siteId,
      siteName: editRow.siteName,
      siteLocation: editRow.siteLocation,
      siteAddress: editRow.siteAddress,
      serviceId: editRow.serviceId != null ? String(editRow.serviceId) : undefined,
      serviceName: editRow.serviceName,
      customerId: editRow.customerId != null ? +editRow.customerId : undefined,
      customerName: editRow.customerName,
      companyName: editRow.companyName,
      reportTemplateId: editRow.reportTemplateId,
    };
    const reapply = () => form.setFieldsValue(fullValues);
    setTimeout(reapply, 0);
    setTimeout(reapply, 50);
  }, [
    resetSubmitUi,
    markReportOpenedForViewer,
    reportTemplates,
    form,
    isStaffUser,
    applyStaffSiteAssignment,
    profile,
    init.reportTemplates,
  ]);

  const onPickSite = async (siteId?: number | string) => {
    if (siteId == null || siteId === "") {
      setServices([]);
      setServicesSiteId(null);
      setLoadingSiteServices(false);
      setCustomers([]);
      form.setFieldsValue({
        serviceId: undefined,
        serviceName: "",
        customerId: undefined,
        customerName: "",
        companyName: "",
        siteName: "",
        siteAddress: "",
        siteLocation: "",
        reportTemplateId: undefined,
      });
      return;
    }

    if (isOtherJobSite(siteId)) {
      setServices([]);
      setServicesSiteId(null);
      setLoadingSiteServices(true);
      setCustomers([]);
      form.setFieldsValue({
        siteName: "",
        siteAddress: "",
        siteLocation: "",
        serviceId: undefined,
        serviceName: "",
        customerId: undefined,
        customerName: "",
        companyName: "",
      });
      try {
        const svcRes = await callAPIAsync(serviceType.COMMON, `${endPoint.SERVICES}/getAll`, "GET");
        setServices(Array.isArray(svcRes?.data) ? svcRes.data : svcRes?.data?.rows || []);

        if (isStaffUser) {
          // Staff already assigned to client sites — fill client from default assignment; no Client picker.
          const assignRes = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.JOB_SITES}/getStaffDefaultReportAssignment`,
            "GET",
            {},
          );
          const a = assignRes?.data;
          if (a?.customerId) {
            form.setFieldsValue({
              customerId: +a.customerId,
              customerName: a.customerName || "",
              companyName: a.companyName || "",
              ...(a.serviceId
                ? {
                    serviceId: String(a.serviceId),
                    serviceName: a.serviceName || "",
                  }
                : {}),
            });
            if (a.staffId != null && +a.staffId > 0) setReportStaffId(+a.staffId);
            else if (profile?.id) setReportStaffId(+profile.id);
          } else {
            message.warning(
              "No client is linked to your staff assignments. Contact your administrator.",
            );
          }
        } else {
          // Admin Other: still pick Client (+ Service) manually.
          const [companiesRes, usersRes] = await Promise.all([
            callAPIAsync(serviceType.COMMON, `${endPoint.COMPANIES}/options`, "GET"),
            callAPIAsync(serviceType.COMMON, endPoint.USERS, "GET", {
              type: userType.CUSTOMER,
              limit: 500,
              page: 1,
              keyword: "",
              orderBy: "fullName",
              orderValue: "ASC",
            }),
          ]);
          const companyList = Array.isArray(companiesRes?.data) ? companiesRes.data : [];
          const userRows =
            usersRes?.code === 1 && Array.isArray(usersRes?.data?.rows) ? usersRes.data.rows : [];
          setCustomers(buildCompanyCustomerOptions(companyList, userRows));
        }
        refreshAutoMergeTemplateFields();
      } finally {
        setLoadingSiteServices(false);
      }
      return;
    }

    const s = sites.find((x: any) => +x.id === +siteId);
    if (s) {
      form.setFieldsValue({
        siteName: s.name || s.siteName || "",
        siteAddress: s.addressName || s.siteAddress || "",
        siteLocation: s.location || s.siteLocation || "",
      });
    }

    setServices([]);
    setServicesSiteId(null);
    setLoadingSiteServices(true);
    setCustomers([]);
    // Drop previous site's staff filter so the new site can resolve its own customer/Service.
    if (isAdminUser) setReportStaffId(0);
    form.setFieldsValue({
      serviceId: undefined,
      serviceName: "",
      customerId: undefined,
      customerName: "",
      companyName: "",
      reportTemplateId: undefined,
    });

    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.JOB_SITES}/getServicesBySite`,
        "GET",
        { siteId },
      );
      const deptRows = res?.data || [];
      setServices(deptRows);
      setServicesSiteId(+siteId);

      if (isStaffUser || (isAdminUser && !editing)) {
        if (deptRows.length === 0) {
          message.warning(
            "This job site has no Service on file, so customer and Service cannot be filled automatically.",
          );
        } else if (deptRows.length === 1) {
          form.setFieldsValue({
            serviceId: String(deptRows[0].id),
            serviceName: deptRows[0].name || "",
          });
          await applyStaffSiteAssignment(+siteId, +deptRows[0].id, {
            ignoreStoredStaffId: true,
          });
        } else {
          // Fill customer/service from the staff site assignment even when several Services exist.
          await applyStaffSiteAssignment(+siteId, undefined, {
            ignoreStoredStaffId: true,
          });
        }
      }
      refreshAutoMergeTemplateFields();
    } finally {
      setLoadingSiteServices(false);
    }
  };

  const applyServiceFromTemplate = useCallback(
    async (tpl: any, siteId: number) => {
      const candidates = serviceCandidatesForTemplateAtSite(tpl, services);
      if (!candidates.length) {
        if (!isIncidentReportMode) {
          message.warning("This template is not linked to a Service at this job site.");
        }
        // Do not clear an existing site assignment — customer/service may already be set from the job site.
        return false;
      }
      for (const deptId of candidates) {
        const ok = await applyStaffSiteAssignment(siteId, deptId, { silent: true });
        if (ok) {
          const d = services.find((x: any) => +x.id === +deptId);
          form.setFieldsValue({
            serviceId: String(deptId),
            serviceName: d?.name || d?.serviceName || "",
          });
          refreshAutoMergeTemplateFields();
          return true;
        }
      }
      message.warning("No customer assignment found for this template at this job site.");
      return false;
    },
    [services, applyStaffSiteAssignment, form, refreshAutoMergeTemplateFields, isIncidentReportMode],
  );

  const onPickService = async (serviceId: string) => {
    const d = services.find((x: any) => String(x.id) === String(serviceId));
    const otherSite = isOtherJobSite(form.getFieldValue("siteId"));
    form.setFieldsValue({
      ...(otherSite ? {} : { reportTemplateId: undefined }),
      ...(d
        ? { serviceName: d.name || d.serviceName || "" }
        : { serviceName: "" }),
    });

    const siteId = form.getFieldValue("siteId");
    if (!siteId || otherSite) {
      if (otherSite) {
        form.setFieldsValue({ serviceId: String(serviceId) });
      }
      refreshAutoMergeTemplateFields();
      return;
    }

    // Staff-style create: choosing a Service determines the site assignment row (customer + dept).
    if (useStaffStyleCreate) {
      form.setFieldsValue({ serviceId: String(serviceId) });
      const ok = await applyStaffSiteAssignment(+siteId, +serviceId);
      if (!ok) {
        form.setFieldsValue({
          customerId: undefined,
          customerName: "",
          companyName: "",
        });
        refreshAutoMergeTemplateFields();
        return;
      }
      refreshAutoMergeTemplateFields();
      return;
    }

    setCustomers([]);
    form.setFieldsValue({
      customerId: undefined,
      customerName: "",
      companyName: "",
    });
    const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getCustomersBySite`, "GET", { siteId, serviceId });
    setCustomers(res?.data || []);
  };

  const onPickCustomer = (customerId: number) => {
    const c = customers.find((x: any) => +x.id === +customerId);
    if (!c) return;
    const company = String(c.companyName || c.customerInfo?.companyName || "").trim();
    const person = String(c.fullName || c.customerName || "").trim();
    form.setFieldsValue({
      // Other-site options are company rows (name = company); keep company as display name.
      customerName: isOtherJobSite(form.getFieldValue("siteId"))
        ? company || person
        : person || company,
      companyName: company || person,
    });
    refreshAutoMergeTemplateFields();
  };

  const uploadPendingMediaFields = async (): Promise<boolean> => {
    const templateMedia = templateItemsForSubmit
      .map((it, idx) => ({ it, idx, fieldKey: getTemplateFieldKey(it, idx) }))
      .filter(({ it }) => isJsonMediaFieldType(String(it.type || "").toUpperCase()));
    const extraMedia = extraSavedReportRowsForEdit
      .map((r, idx) => ({ r, fieldKey: legacyFieldKey(r, idx) }))
      .filter(({ r }) => isJsonMediaFieldType(String(r.type || "").toUpperCase()));
    const mediaFields = [
      ...templateMedia,
      ...extraMedia.map(({ r, fieldKey }) => ({ it: r, idx: 0, fieldKey })),
    ];
    const withPending = mediaFields.filter(({ fieldKey }) =>
      mediaUploadRefs.current[fieldKey]?.hasPending(),
    );
    if (!withPending.length) {
      setSubmitStep(8, "Preparing report");
      return true;
    }

    const totalPhotos = withPending.reduce(
      (sum, { fieldKey }) => sum + (mediaUploadRefs.current[fieldKey]?.getPendingCount() ?? 0),
      0,
    );
    setSubmitStep(2, "Uploading photos", { current: totalPhotos > 0 ? 1 : 0, total: totalPhotos });
    try {
      let photosDone = 0;
      for (let i = 0; i < withPending.length; i++) {
        const { fieldKey } = withPending[i];
        const handle = mediaUploadRefs.current[fieldKey];
        if (!handle) continue;
        const fieldPending = handle.getPendingCount();
        const slice = SUBMIT_PROGRESS_MEDIA_MAX / withPending.length;
        const base = (i / withPending.length) * SUBMIT_PROGRESS_MEDIA_MAX;
        const photosDoneBefore = photosDone;
        const urls = await handle.uploadAllPending((detail) => {
          const globalCompleted = photosDoneBefore + detail.completed;
          const stillUploading = detail.percent < 100 || detail.completed < detail.total;
          const photoCurrent = stillUploading
            ? Math.min(totalPhotos, Math.max(1, globalCompleted + 1))
            : Math.min(totalPhotos, globalCompleted);
          setSubmitStep(base + (detail.percent / 100) * slice, "Uploading photos", {
            current: photoCurrent,
            total: totalPhotos,
          });
        });
        photosDone += fieldPending;
        form.setFieldsValue({ [fieldKey]: urls.length ? JSON.stringify(urls) : undefined });
      }
      setSubmitStep(SUBMIT_PROGRESS_MEDIA_MAX, "Photos uploaded", {
        current: totalPhotos,
        total: totalPhotos,
      });
      return true;
    } catch {
      return false;
    }
  };

  const startSaveProgressTicker = useCallback(() => {
    clearSaveProgressTimer();
    setSubmitStep(SUBMIT_PROGRESS_SAVE_START, "Saving report");
    saveProgressTimerRef.current = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev.percent >= SUBMIT_PROGRESS_SAVE_CAP) return prev;
        return {
          percent: prev.percent + 1,
          label: "Saving report",
        };
      });
    }, 120);
  }, [clearSaveProgressTimer, setSubmitStep]);

  const buildReportItems = (values: Record<string, any>) => {
    if (!templateItemsForSubmit.length && Array.isArray(editing?.reports) && editing.reports.length) {
      const legacy = editing.reports
        .slice()
        .filter((r: any) => !isJunkTemplateField({ name: r?.name, type: r?.type }))
        .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0));
      return legacy
        .map((r: any, idx: number) => {
          const fieldKey = legacyFieldKey(r, idx);
          const fieldType = String(r.type || "").toUpperCase();
          const raw = values[fieldKey];
          if (raw === undefined || raw === null || raw === "") return null;

          let value: any = raw;
          if (fieldType === "TIME" && moment.isMoment(raw)) value = raw.format("HH:mm:ss");
          if ((fieldType === "DATE" || fieldType === "DATE_PICKER") && moment.isMoment(raw)) {
            value = raw.format("YYYY-MM-DD");
          }
          if ((fieldType === "DATETIME" || fieldType === "[REPORT_DATETIME]") && moment.isMoment(raw)) {
            value = raw.format("YYYY-MM-DD HH:mm:ss");
          }
          if (isJsonMediaFieldType(fieldType)) {
            const arr = parseMediaListValue(raw);
            if (!arr.length) return null;
            value = JSON.stringify(arr);
          }
          return {
            name: String(r.name ?? "").trim() || `field_${idx + 1}`,
            type: r.type,
            order: r.order ?? idx + 1,
            value,
          };
        })
        .filter(Boolean);
    }

    const usedNames = new Set<string>();
    const allocateStorageName = (it: TemplateItem, idx: number) => {
      const base = String(it.name ?? "").trim() || `field_${idx + 1}`;
      const label = getTemplateLabel(it) || base;
      const candidates: string[] = [];
      if (label && label !== base) candidates.push(label);
      candidates.push(base);
      for (const candidate of candidates) {
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          return candidate;
        }
      }
      let suffix = 2;
      let next = `${base} (${suffix})`;
      while (usedNames.has(next)) {
        suffix += 1;
        next = `${base} (${suffix})`;
      }
      usedNames.add(next);
      return next;
    };

    return templateItemsForSubmit
      .map((it, idx) => {
        const fieldKey = getTemplateFieldKey(it, idx);
        const fieldType = String(it.type || "").toUpperCase();
        let raw = values[fieldKey];
        const hasFormValue = Object.prototype.hasOwnProperty.call(values, fieldKey);

        if ((raw === undefined || raw === null) && !hasFormValue && editing?.reports) {
          raw = parseReportItemValueForForm(
            matchReportItemForTemplate(editing.reports, it, idx),
          );
        }

        if (isAutoMergeTemplateField(it)) {
          if (!autoMergeUsesPicker(it, isStaffUser)) {
            raw = raw ?? resolveAutoMergeFieldValue(it, values, profile);
          }
        }

        const fieldTypeUpper = String(it.type || "").toUpperCase();
        const isSiteAutoMerge =
          fieldTypeUpper === "[SITE_NAME]" || fieldTypeUpper === "[SITE_ADDRESS]";
        if (isSiteAutoMerge) {
          if (raw === undefined || raw === null || raw === "") {
            raw = resolveAutoMergeFieldValue(it, values, profile);
          }
          // Always persist site rows so PDFs keep Site Name / Address even when blank.
          raw = raw == null ? "" : String(raw);
        } else if (raw === undefined || raw === null || raw === "") {
          return null;
        }

        let value: any = raw;
        if (fieldType === "TIME" && moment.isMoment(raw)) value = raw.format("HH:mm:ss");
        if (isTimeLikeTemplateItem(it) && moment.isMoment(raw)) {
          value = raw.format("HH:mm:ss");
        }
        if ((fieldType === "DATE" || fieldType === "DATE_PICKER") && moment.isMoment(raw)) {
          value = raw.format("YYYY-MM-DD");
        }
        if ((fieldType === "DATETIME" || fieldType === "[REPORT_DATETIME]") && moment.isMoment(raw)) {
          value = raw.format("YYYY-MM-DD HH:mm:ss");
        }
        if ((fieldType === "[REPORT_DATE]" || fieldType === "[REPORT_TIME]") && moment.isMoment(raw)) {
          value = fieldType === "[REPORT_DATE]" ? raw.format("YYYY-MM-DD") : raw.format("HH:mm:ss");
        }
        if (fieldType === "NUMBER" || fieldType === "PERCENTAGE" || fieldType === "CURRENCY") {
          value = raw === "" || raw === undefined ? null : String(raw);
        }
        if (fieldType === "CHECKLIST" && Array.isArray(raw)) {
          value = raw.join("; ");
        }
        if (isJsonMediaFieldType(fieldType)) {
          const arr = parseMediaListValue(raw);
          if (!arr.length) return null;
          value = JSON.stringify(arr);
        }

        return {
          name: allocateStorageName(it, idx),
          type: it.type,
          order: it.order ?? idx + 1,
          value,
        };
      })
      .concat(
        extraSavedReportRowsForEdit
          .map((r: any, idx: number) => {
            const fieldKey = legacyFieldKey(r, idx);
            const fieldType = String(r.type || "").toUpperCase();
            const raw = values[fieldKey];
            if (raw === undefined || raw === null || raw === "") return null;

            let value: any = raw;
            if (fieldType === "TIME" && moment.isMoment(raw)) value = raw.format("HH:mm:ss");
            if ((fieldType === "DATE" || fieldType === "DATE_PICKER") && moment.isMoment(raw)) {
              value = raw.format("YYYY-MM-DD");
            }
            if ((fieldType === "DATETIME" || fieldType === "[REPORT_DATETIME]") && moment.isMoment(raw)) {
              value = raw.format("YYYY-MM-DD HH:mm:ss");
            }
            if (isJsonMediaFieldType(fieldType)) {
              const arr = parseMediaListValue(raw);
              if (!arr.length) return null;
              value = JSON.stringify(arr);
            }
            return {
              name: String(r.name ?? "").trim() || `field_${idx + 1}`,
              type: r.type,
              order: r.order ?? idx + 1,
              value,
            };
          })
          .filter(Boolean) as Array<{ name: string; type: string; order: number; value: any }>,
      )
      .filter(Boolean);
  };

  const ensureUniqueReportItemNames = (items: Array<{ name: string }>) => {
    const used = new Set<string>();
    return items.map((it) => {
      const base = String(it.name ?? "").trim() || "Field";
      if (!used.has(base)) {
        used.add(base);
        return { ...it, name: base };
      }
      let suffix = 2;
      let next = `${base} (${suffix})`;
      while (used.has(next)) {
        suffix += 1;
        next = `${base} (${suffix})`;
      }
      used.add(next);
      return { ...it, name: next };
    });
  };

  const submit = async () => {
    const mediaFields = templateItemsForSubmit
      .map((it, idx) => ({ it, fieldKey: getTemplateFieldKey(it, idx) }))
      .filter(({ it }) => isJsonMediaFieldType(String(it.type || "").toUpperCase()));
    for (const { it, fieldKey } of mediaFields) {
      if (!it.required) continue;
      const existing = parseMediaListValue(form.getFieldValue(fieldKey));
      const pending = mediaUploadRefs.current[fieldKey]?.hasPending();
      if (!existing.length && !pending) {
        message.error(`Please add ${getTemplateLabel(it) || it.name || "required media"}.`);
        return;
      }
      // Pending camera/gallery files are not written into Form until upload.
      // Seed a placeholder so Ant Design `required` does not fail before upload runs.
      if (!existing.length && pending) {
        form.setFieldsValue({ [fieldKey]: JSON.stringify(["__pending_upload__"]) });
      }
    }

    let values: Record<string, any>;
    try {
      values = await form.validateFields();
    } catch {
      message.error("Please complete all required fields before uploading.");
      return;
    }

    if (values.customerId == null || values.customerId === "") {
      if (isStaffUser || (isAdminUser && !editing)) {
        if (isOtherJobSite(values.siteId)) {
          message.error(
            isStaffUser
              ? "Could not resolve a client from your site assignments. Contact your administrator."
              : "Select a client and Service for this custom site.",
          );
        } else if (!values.siteId) {
          message.error("Select a job site so customer and Service can be filled from the site assignment.");
        } else {
          message.error(
            "This job site has no customer linked to the site assignment. Choose another site or contact your administrator.",
          );
        }
      } else {
        message.error("Please select a customer.");
      }
      return;
    }
    if (isOtherJobSite(values.siteId)) {
      if (!String(values.siteName || "").trim()) {
        message.error("Enter the custom site name.");
        return;
      }
      if (!String(values.siteAddress || "").trim()) {
        message.error("Enter the custom site address.");
        return;
      }
      if (values.serviceId == null || values.serviceId === "") {
        if (isIncidentReportMode) {
          // Service is hidden on Incident Report — take first site service or assignment silently.
          const fallbackService =
            services[0] ||
            null;
          if (fallbackService?.id) {
            values = {
              ...values,
              serviceId: String(fallbackService.id),
              serviceName: fallbackService.name || fallbackService.serviceName || "",
            };
          } else {
            // Allow submit without service for incident reports when none is available.
            values = { ...values, serviceId: 0, serviceName: "" };
          }
        } else {
          message.error("Select a Service for this custom site.");
          return;
        }
      }
      values = { ...values, siteId: 0 };
    }
    let effectiveStaffId = reportStaffId;
    if (
      (!Number.isFinite(effectiveStaffId) || effectiveStaffId <= 0) &&
      profile?.id
    ) {
      // Staff always has self; admin create falls back to admin profile when the
      // site assignment has customer/service but no staff row (or Other site).
      effectiveStaffId = +profile.id;
      setReportStaffId(effectiveStaffId);
    }
    const customerIdNum = Number(values.customerId);
    if (!Number.isFinite(customerIdNum) || customerIdNum <= 0) {
      message.error("Please select a valid customer.");
      return;
    }

    setProgressOpen(true);
    setSubmitStep(1, "Starting");

    const mediaOk = await uploadPendingMediaFields();
    if (!mediaOk) {
      resetSubmitUi();
      return;
    }

    const customerIdBeforeMedia = customerIdNum;
    const customerNameBeforeMedia = values.customerName;
    const companyNameBeforeMedia = values.companyName;
    const serviceIdBeforeMedia = values.serviceId;
    values = form.getFieldsValue();
    // Media uploads can remount fields; keep assignment fields from the validated snapshot.
    if (values.customerId == null || values.customerId === "") {
      values = {
        ...values,
        customerId: customerIdBeforeMedia,
        customerName: customerNameBeforeMedia,
        companyName: companyNameBeforeMedia,
        serviceId: values.serviceId ?? serviceIdBeforeMedia,
      };
    }
    if (isOtherJobSite(values.siteId)) {
      values = { ...values, siteId: 0 };
    }

    // Auto-fill hidden DATE/TIME items for staff at submit time (create) or restore on edit.
    if (isStaffUser && templateItemsForSubmit.length) {
      const patch: Record<string, moment.Moment> = {};
      templateItemsForSubmit.forEach((it, idx) => {
        if (!isHiddenFromStaffCreate(it)) return;
        const t = String(it?.type || "").toUpperCase();
        if (t !== "DATE" && t !== "DATE_PICKER" && t !== "TIME" && t !== "DATETIME" && t !== "[REPORT_DATE]" && t !== "[REPORT_TIME]" && t !== "[REPORT_DATETIME]") return;
        const fieldKey = getTemplateFieldKey(it, idx);
        const current = values[fieldKey];
        if (current === undefined || current === null || current === "") {
          const existing = editing?.reports
            ? parseReportItemValueForForm(matchReportItemForTemplate(editing.reports, it, idx))
            : undefined;
          if (existing != null && existing !== "" && moment.isMoment(existing)) {
            patch[fieldKey] = existing;
          } else if (existing != null && existing !== "") {
            /* non-moment hidden values handled via buildReportItems fallback */
          } else {
            patch[fieldKey] = moment();
          }
        }
      });
      if (Object.keys(patch).length) {
        form.setFieldsValue(patch);
        values = { ...values, ...patch };
      }
    }

    const items = ensureUniqueReportItemNames(buildReportItems(values) as any);

    const payload = buildCustomReportSavePayload({
      values,
      items,
      profile,
      staffId: effectiveStaffId,
      editing,
      templateLabel: selectedTemplateName,
    });

    startSaveProgressTicker();
    try {
      let res: any;
      if (editing?.id) {
        res = await updateCustomReport(+editing.id, payload);
      } else {
        res = await createCustomReport(payload);
      }
      clearSaveProgressTimer();
      if (res?.code !== 1) {
        if (isDuplicateReportFieldNameError(res)) {
          message.error(
            "This template has duplicate field names (e.g. two items named the same). Rename duplicate items in Report Templates (Items step) and try again.",
          );
        } else {
          const pg = res?.details?.pg;
          const detailMsg = [res?.message, pg?.detail, pg?.column && `column=${pg.column}`, pg?.table && `table=${pg.table}`]
            .filter(Boolean)
            .join(REPORT_LIST_SEP);
          message.error(detailMsg || res?.error || "Could not save report. Check required fields and try again.");
        }
        if (res?.details) {
          console.error("createCustomerReports / updateCustomerReports API details", res.details);
        }
        resetSubmitUi();
        return;
      }
      setSubmitStep(100, "Report saved");
      await delay(800);
      setVisible(false);
      resetSubmitUi();
      message.success(editing ? "Report updated successfully" : "Report created successfully");
      await loadRows(page, limit);
      refreshDashboard();
    } catch {
      clearSaveProgressTimer();
      message.error("Could not save report. Please try again.");
      resetSubmitUi();
    }
  };

  const profileIdNum = profile?.id != null ? +profile.id : 0;
  const profileTypeNum = profileType != null ? +profileType : 0;
  /** Staff/customer may soft-delete or restore only their own custom reports. */
  const canSoftDeleteReport = useCallback(
    (row: any) => canUserSoftDeleteCustomReport(row, profileIdNum, profileTypeNum),
    [profileIdNum, profileTypeNum],
  );

  const deleteReport = useCallback(
    async (row: any) => {
      const isAdmin = +profileType === userType.ADMIN;
      const res = await deleteCustomReport(+row.id);
      if (res?.code === 1) {
        message.success(
          isAdmin
            ? isDeletedReportTab
              ? "Report permanently deleted"
              : "Report moved to Deleted"
            : "Report moved to Deleted",
        );
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not delete this report");
      }
    },
    [loadRows, page, limit, listFilters, profileType, refreshDashboard, isDeletedReportTab],
  );

  const restoreReport = useCallback(
    async (row: any) => {
      const res = await restoreCustomReport(+row.id);
      if (res?.code === 1) {
        message.success(
          isAdminUser ? "Report restored to Reports" : "Report restored",
        );
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        if (viewRow?.id === row.id) {
          setViewOpen(false);
          setViewRow(null);
        }
        await loadRows(page, limit, listFilters, listSort, reportListTab);
        void loadDeletedReportCount();
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not restore this report");
      }
    },
    [loadRows, page, limit, listFilters, listSort, reportListTab, viewRow, refreshDashboard, isAdminUser, loadDeletedReportCount],
  );

  const restoreSelectedReports = useCallback(async () => {
    const ids = selectedRowKeys.map((k) => +k).filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) {
      message.warning("Select at least one report to restore");
      return;
    }
    setBulkDeleting(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const res = await restoreCustomReport(id);
        if (res?.code === 1) succeeded += 1;
        else failed += 1;
      }
      setSelectedRowKeys([]);
      await loadRows(page, limit, listFilters, listSort, reportListTab);
      void loadDeletedReportCount();
      refreshDashboard();
      if (succeeded && !failed) {
        message.success(
          `${succeeded} report${succeeded === 1 ? "" : "s"} restored to Reports`,
        );
      } else if (succeeded && failed) {
        message.warning(`${succeeded} restored, ${failed} failed`);
      } else {
        message.error("Could not restore selected reports");
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [
    selectedRowKeys,
    loadRows,
    page,
    limit,
    listFilters,
    listSort,
    reportListTab,
    loadDeletedReportCount,
    refreshDashboard,
  ]);

  const permanentlyDeleteSelectedReports = useCallback(async () => {
    const ids = selectedRowKeys
      .map((k) => +k)
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      message.warning("Select at least one deleted report");
      return;
    }
    setBulkDeleting(true);
    try {
      const res: any = await clearDeletedCustomReports(ids);
      if (res?.code === 1) {
        const clearedCount = +res?.data?.clearedCount || ids.length;
        message.success(
          `Permanently deleted ${clearedCount} report${clearedCount === 1 ? "" : "s"}`,
        );
        setSelectedRowKeys([]);
        await loadRows(page, limit, listFilters, listSort, reportListTab);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not permanently delete selected reports");
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [
    selectedRowKeys,
    loadRows,
    page,
    limit,
    listFilters,
    listSort,
    reportListTab,
    refreshDashboard,
  ]);

  const canUseBulkDelete =
    (isDeletedReportTab && isAdminUser) ||
    (!isDeletedReportTab &&
      (+profileType === userType.ADMIN ||
        +profileType === userType.CUSTOMER ||
        +profileType === userType.STAFF));

  const displayRows = filterReportRowsByKeyword(rows, listSearchDraft);

  const deleteSelectedReports = useCallback(async () => {
    const ids = selectedRowKeys
      .map((k) => rows.find((r) => +r.id === +k))
      .filter((r) => r && canSoftDeleteReport(r))
      .map((r) => +r.id);
    if (!ids.length) {
      message.warning("Select at least one report you are allowed to delete");
      return;
    }
    const isAdmin = +profileType === userType.ADMIN;
    setBulkDeleting(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const res = await deleteCustomReport(id);
        if (res?.code === 1) succeeded += 1;
        else failed += 1;
      }
      setSelectedRowKeys([]);
      await loadRows(page, limit, listFilters);
      refreshDashboard();
      if (succeeded && !failed) {
        message.success(
          isAdmin
            ? isDeletedReportTab
              ? `${succeeded} report${succeeded === 1 ? "" : "s"} permanently deleted`
              : `${succeeded} report${succeeded === 1 ? "" : "s"} moved to Deleted`
            : `${succeeded} report${succeeded === 1 ? "" : "s"} removed from your list`,
        );
      } else if (succeeded && failed) {
        message.warning(`${succeeded} succeeded, ${failed} failed`);
      } else {
        message.error("Could not delete selected reports");
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [
    selectedRowKeys,
    profileType,
    loadRows,
    page,
    limit,
    listFilters,
    refreshDashboard,
    rows,
    canSoftDeleteReport,
    isDeletedReportTab,
  ]);

  const clearDeletedReports = useCallback(async () => {
    setClearingDeleted(true);
    try {
      // Clear exactly what is visible on this Deleted tab page.
      // This guarantees the toast count always matches what the user sees.
      const visibleIds = rows.map((r: any) => +r?.id).filter((n) => Number.isFinite(n) && n > 0);
      if (!visibleIds.length) {
        message.success("Deleted folder is already empty");
        return;
      }
      const res: any = await clearDeletedCustomReports(visibleIds);
      if (res?.code === 1) {
        const clearedCount = +res?.data?.clearedCount || 0;
        const shownCount = visibleIds.length;
        const safeCount = Math.max(0, Math.min(clearedCount, shownCount));
        message.success(
          safeCount
            ? isAdminUser
              ? `Permanently deleted ${safeCount} report${safeCount === 1 ? "" : "s"}`
              : `Cleared ${safeCount} deleted report${safeCount === 1 ? "" : "s"}`
            : "Deleted folder is already empty",
        );
        setSelectedRowKeys([]);
        await loadRows(page, limit, listFilters, listSort, reportListTab);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not clear deleted reports");
      }
    } finally {
      setClearingDeleted(false);
    }
  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows, isAdminUser]);

  const rowSelection = canUseBulkDelete
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
        getCheckboxProps: (record: any) => ({
          disabled:
            isDeletedReportTab && isAdminUser
              ? !record?.id
              : !canSoftDeleteReport(record),
        }),
        selections: [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
          Table.SELECTION_NONE,
        ],
      }
    : undefined;

  const supportsTableSort =
    +profileType === userType.CUSTOMER ||
    +profileType === userType.ADMIN ||
    +profileType === userType.STAFF;
  const tableSorter = supportsTableSort ? { sorter: true as const } : {};
  const submittedColumnSorter = supportsTableSort
    ? {
        sorter: true as const,
        sortDirections: ["descend", "ascend"] as ("descend" | "ascend")[],
        showSorterTooltip: true,
      }
    : {};
  const reportSortOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "submittedAt:DESC", label: "Submitted (newest first)" },
      { value: "submittedAt:ASC", label: "Submitted (oldest first)" },
      { value: "siteName:ASC", label: "Job site (A–Z)" },
      { value: "siteName:DESC", label: "Job site (Z–A)" },
    ];
    if (!isIncidentReportMode) {
      opts.push(
        { value: "serviceName:ASC", label: "Service (A–Z)" },
        { value: "serviceName:DESC", label: "Service (Z–A)" },
      );
    }
    if (+profileType === userType.ADMIN) {
      opts.splice(2, 0,
        {
          value: "staffFullName:ASC",
          label: isIncidentReportMode ? "Reported by (A–Z)" : "Submitted by (A–Z)",
        },
        {
          value: "staffFullName:DESC",
          label: isIncidentReportMode ? "Reported by (Z–A)" : "Submitted by (Z–A)",
        },
      );
    }
    if (+profileType === userType.ADMIN || +profileType === userType.CUSTOMER) {
      opts.push(
        { value: "readStatus:ASC", label: "Read (unread first)" },
        { value: "readStatus:DESC", label: "Read (read first)" },
      );
    }
    return opts;
  }, [profileType, isIncidentReportMode]);
  const onMobileSortChange = useCallback((value: string) => {
    const [orderBy, orderValue] = value.split(":");
    if (!orderBy || !orderValue) return;
    setPage(1);
    setListSort({ orderBy, orderValue });
  }, []);

  const isEditMode = Boolean(editing?.id);
  const templateChosen = Boolean(selectedTemplateId);

  /** Saved rows with no matching template item (e.g. report from AWS, older template on localhost). */
  const extraSavedReportRowsForEdit = useMemo(() => {
    if (!isEditMode || !Array.isArray(editing?.reports) || !templateItemsForSubmit.length) {
      return [];
    }
    const covered = new Set<string>();
    templateItemsForSubmit.forEach((it, idx) => {
      const rep = matchReportItemForTemplate(editing.reports, it, idx);
      if (rep) covered.add(reportFieldStorageKey(rep.name));
    });
    return editing.reports
      .slice()
      .filter((r: any) => !isJunkTemplateField({ name: r?.name, type: r?.type }))
      .filter((r: any) => !covered.has(reportFieldStorageKey(r.name)))
      .filter((r: any) => !isObsoleteCombinedDateTimeRow(r, templateItemsForSubmit))
      .filter((r: any) => !isObsoleteSeparateDateOrTimeRow(r, templateItemsForSubmit))
      .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0));
  }, [isEditMode, editing, templateItemsForSubmit]);

  const legacyReportsForRender = useMemo(() => {
    if (!isEditMode || templateChosen) return [];
    if (!Array.isArray(editing?.reports)) return [];
    return editing.reports
      .slice()
      .filter((r: any) => !isJunkTemplateField({ name: r?.name, type: r?.type }))
      .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0));
  }, [editing, isEditMode, templateChosen]);

  const sortOrderFor = (field: string) =>
    supportsTableSort && listSort.orderBy === field
      ? (listSort.orderValue === "ASC" ? ("ascend" as const) : ("descend" as const))
      : undefined;

  const toggleRowSelected = useCallback((rowId: number, checked: boolean) => {
    setSelectedRowKeys((prev) =>
      checked ? [...prev, rowId] : prev.filter((k) => +k !== +rowId),
    );
  }, []);

  const popconfirmTrigger = (label: string, button: React.ReactNode) => (
    <span onClick={(e) => e.stopPropagation()} role="presentation">
      {React.isValidElement(button)
        ? React.cloneElement(button, { "aria-label": label } as Record<string, string>)
        : button}
    </span>
  );

  const renderReportActions = useCallback(
    (r: any) => (
      <Space
        size={4}
        wrap={false}
        className="new-reports-row-actions"
        style={{ width: "100%", justifyContent: "space-evenly" }}
      >
        {+profileType !== userType.CUSTOMER && !isDeletedReportTab ? (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            aria-label="Edit report"
            title={intl.formatMessage({ id: "button.Edit" }, { defaultMessage: "Edit" })}
            onClick={() => openEdit(r)}
          />
        ) : null}
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          aria-label="View report"
          title="View report"
          onClick={() => openView(r)}
        />
        {(+profileType === userType.CUSTOMER || +profileType === userType.ADMIN) && !isDeletedReportTab ? (
          <Link to={`/messages?reportId=${r.id}`} title="Message about this report">
            <Button type="link" size="small" icon={<MailOutlined />} aria-label="Message about this report" />
          </Link>
        ) : null}
        {+profileType === userType.ADMIN && !isDeletedReportTab ? (
          <Popconfirm
            overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
            title={
              <span>
                Move this report to Deleted?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  You can permanently delete it later from the Deleted tab.
                </div>
              </span>
            }
            okText="Move to Deleted"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteReport(r)}
          >
            {popconfirmTrigger(
              "Delete report",
              <Button type="link" danger size="small" icon={<DeleteOutlined />} />,
            )}
          </Popconfirm>
        ) : null}
        {isDeletedReportTab && isAdminUser ? (
          <Popconfirm
            overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
            title={
              <span>
                Permanently delete this report?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  This cannot be undone.
                </div>
              </span>
            }
            okText="Delete permanently"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => deleteReport(r)}
          >
            {popconfirmTrigger(
              "Permanently delete report",
              <Button type="link" danger size="small" icon={<DeleteOutlined />} />,
            )}
          </Popconfirm>
        ) : null}
        {isDeletedReportTab &&
        (isAdminUser || ((isCustomerUser || isStaffUser) && canSoftDeleteReport(r))) ? (
          <Popconfirm
            overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
            title={
              isAdminUser
                ? "Restore this report to the Reports list?"
                : "Restore this report to your list?"
            }
            okText="Restore"
            cancelText="Cancel"
            onConfirm={() => restoreReport(r)}
          >
            {popconfirmTrigger(
              "Restore report",
              <Button type="link" size="small" icon={<UndoOutlined />} />,
            )}
          </Popconfirm>
        ) : null}
        {!isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (
          canSoftDeleteReport(r) ? (
            <Popconfirm
              overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
              title={
                <span>
                  Remove this report from your list?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    The report moves to Deleted. You can restore it from the Deleted tab.
                  </div>
                </span>
              }
              okText="Remove"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => deleteReport(r)}
            >
              {popconfirmTrigger(
                "Remove report",
                <Button type="link" danger size="small" icon={<DeleteOutlined />} />,
              )}
            </Popconfirm>
          ) : null
        ) : null}
      </Space>
    ),
    [
      profileType,
      isDeletedReportTab,
      isCustomerUser,
      isStaffUser,
      intl,
      openEdit,
      openView,
      isAdminUser,
      deleteReport,
      restoreReport,
      canSoftDeleteReport,
    ],
  );

  const renderMobileReportCard = useCallback(
    (r: any) => {
      const pdfHref = resolveReportPdfHref(getReportPdfField(r));
      const title = formatMobileReportCardTitle(r);
      const submittedLabel = formatReportSubmittedAt(r);
      const highlighted = linkedReportId != null && +r.id === +linkedReportId;
      const selectable = canUseBulkDelete && canSoftDeleteReport(r);

      const siteDept = isIncidentReportMode
        ? String(r.siteName || "").trim() || "—"
        : [r.siteName, r.serviceName].filter(Boolean).join(REPORT_LIST_SEP) || "—";

      return (
        <MobileReportCardShell key={r.id} $dark={mobileUiDark} $highlight={highlighted}>
          <MobileReportCardHead $dark={mobileUiDark}>
            {selectable ? (
              <Checkbox
                className={mobileUiDark ? "nr-mobile-checkbox" : undefined}
                checked={selectedRowKeys.some((k) => +k === +r.id)}
                onChange={(e) => toggleRowSelected(+r.id, e.target.checked)}
                aria-label={`Select report ${title}`}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
            ) : null}
            <MobileReportCardHeadMain>
              <MobileReportCardTitle $dark={mobileUiDark}>{title}</MobileReportCardTitle>
              <MobileReportCardSite $dark={mobileUiDark}>{siteDept}</MobileReportCardSite>
            </MobileReportCardHeadMain>
            {(+profileType === userType.ADMIN || +profileType === userType.CUSTOMER) ? (
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                <ReportReadStatusCell
                  row={r}
                  viewerType={+profileType}
                  markingUnread={markingUnreadId === +r.id}
                  onMarkUnread={
                    +profileType === userType.ADMIN || +profileType === userType.CUSTOMER
                      ? markReportUnread
                      : undefined
                  }
                />
              </div>
            ) : null}
          </MobileReportCardHead>

          <MobileReportCardDetails $dark={mobileUiDark}>
            {+profileType === userType.ADMIN ? (
              <>
                <MobileReportCardDetailRow>
                  <MobileReportCardLabel
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                  >
                    {isIncidentReportMode ? "Reported by" : "Submitted by"}
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatSubmittedByRow(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
                {isIncidentReportMode ? (
                <MobileReportCardDetailRow>
                  <MobileReportCardLabel
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                  >
                    Incident type
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatIncidentType(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
                ) : null}
                {!isIncidentReportMode ? (
                <MobileReportCardDetailRow>
                  <MobileReportCardLabel
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                  >
                    Customer
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatCustomerDisplayName(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
                ) : null}
              </>
            ) : +profileType === userType.STAFF ? (
              <>
                <MobileReportCardDetailRow>
                  <MobileReportCardLabel
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                  >
                    {isIncidentReportMode ? "Reported by" : "Submitted by"}
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatSubmittedByRow(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
                {isIncidentReportMode ? (
                <MobileReportCardDetailRow>
                  <MobileReportCardLabel
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                  >
                    Incident type
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatIncidentType(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
                ) : null}
              </>
            ) : null}
            <MobileReportCardDetailRow>
              <MobileReportCardLabel
                $dark={mobileUiDark}
                className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
              >
                Submitted
              </MobileReportCardLabel>
              <MobileReportCardValue
                $dark={mobileUiDark}
                className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
              >
                {submittedLabel}
              </MobileReportCardValue>
            </MobileReportCardDetailRow>
          </MobileReportCardDetails>

          <MobileReportCardActions $dark={mobileUiDark}>
            {pdfHref ? (
              <Button
                size="small"
                type="default"
                className={mobileUiDark ? "nr-mobile-btn-dark nr-mobile-pdf-btn" : undefined}
                icon={<FilePdfOutlined />}
                style={mobileDarkBtnDefaultStyle}
                onClick={() => handleOpenReportPdf(pdfHref, r)}
              >
                PDF
              </Button>
            ) : null}
            <MobileReportCardActionsIcons $dark={mobileUiDark}>
              {renderReportActions(r)}
            </MobileReportCardActionsIcons>
          </MobileReportCardActions>
        </MobileReportCardShell>
      );
    },
    [
      linkedReportId,
      canUseBulkDelete,
      canSoftDeleteReport,
      selectedRowKeys,
      toggleRowSelected,
      profileType,
      renderReportActions,
      markingUnreadId,
      markReportUnread,
      mobileUiDark,
      mobileDarkBtnDefaultStyle,
      handleOpenReportPdf,
      isIncidentReportMode,
    ],
  );

  const columns = [
    ...(Number(profileType) !== userType.CUSTOMER
      ? [
          {
            title: isIncidentReportMode
              ? "Reported by"
              : +profileType === userType.ADMIN
                ? "Submitted by"
                : "Staff",
            key: "staffFullName",
            dataIndex: "staffFullName",
            width: 150,
            ellipsis: true,
            ...(+profileType === userType.ADMIN ? tableSorter : {}),
            sortOrder: +profileType === userType.ADMIN ? sortOrderFor("staffFullName") : undefined,
            render: (_: unknown, r: any) => formatSubmittedByRow(r),
          },
        ]
      : []),
    {
      title: "Job Site",
      dataIndex: "siteName",
      width: 280,
      ...tableSorter,
      sortOrder: sortOrderFor("siteName"),
      render: (_: unknown, r: any) => renderClamp2(r.siteName),
    },
    ...(isIncidentReportMode
      ? [
          {
            title: "Incident type",
            key: "incidentType",
            width: 160,
            ellipsis: true,
            render: (_: unknown, r: any) => renderClamp2(formatIncidentType(r)),
          },
        ]
      : []),
    ...(!isIncidentReportMode
      ? [
          {
            title: "Service",
            dataIndex: "serviceName",
            width: 200,
            ...tableSorter,
            sortOrder: sortOrderFor("serviceName"),
            render: (_: unknown, r: any) => renderClamp2(r.serviceName),
          },
        ]
      : []),
    ...(Number(profileType) === userType.ADMIN && !isIncidentReportMode
      ? [
          {
            title: "Customer",
            key: "customerName",
            dataIndex: "customerName",
            width: 240,
            ...tableSorter,
            sortOrder: sortOrderFor("customerName"),
            render: (_: unknown, r: any) => renderClamp2(formatCustomerDisplayName(r)),
          },
        ]
      : []),
    {
      title: "Submitted",
      key: "submittedAt",
      columnKey: "submittedAt",
      dataIndex: "submittedAt",
      width: 155,
      ...submittedColumnSorter,
      sortOrder: sortOrderFor("submittedAt"),
      render: (_: unknown, r: any) => formatReportSubmittedAt(r),
    },
    {
      title: "Report file",
      key: "reportPdf",
      width: 56,
      align: "center" as const,
      render: (_: unknown, r: any) => {
        const href = resolveReportPdfHref(getReportPdfField(r));
        if (!href) {
          return <span style={{ color: "#bfbfbf" }}>{EM_DASH}</span>;
        }
        const label = reportPdfLinkLabel(r, href);
        return (
          <Tooltip title={label || "Open or download PDF"}>
            <Button
              type="link"
              size="small"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label || "Open report PDF"}
              icon={<FilePdfOutlined />}
              style={tableLinkIconBtnStyle}
              onClick={() => {
                void markReportOpenedForViewer(r);
              }}
            />
          </Tooltip>
        );
      },
    },
    ...(Number(profileType) === userType.ADMIN || Number(profileType) === userType.CUSTOMER
      ? [
          {
            title: "Read",
            key: "readStatus",
            columnKey: "readStatus",
            dataIndex: "readStatus",
            width: 72,
            align: "center" as const,
            sorter: true,
            sortDirections: ["ascend", "descend"],
            sortOrder: sortOrderFor("readStatus"),
            render: (_: unknown, r: any) => (
              <ReportReadStatusCell
                row={r}
                viewerType={+profileType}
                markingUnread={markingUnreadId === +r.id}
                onMarkUnread={
                  +profileType === userType.ADMIN || +profileType === userType.CUSTOMER
                    ? markReportUnread
                    : undefined
                }
              />
            ),
          },
        ]
      : []),
    {
      title: "Action",
      key: "actions",
      width: 140,
      align: "right" as const,
      render: (_: any, r: any) => renderReportActions(r),
    },
  ];

  const controlSize = "large" as const;
  const modalFieldColSpan = isMobilePortrait ? 24 : 12;
  const selectProps = {
    size: controlSize,
    showSearch: true,
    optionFilterProp: "label" as const,
    style: { borderRadius: 8, width: isMobilePortrait || mobileUiDark ? "100%" : undefined },
    className: mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined,
    popupClassName: mobileUiDark ? "nr-mobile-dark-dropdown" : undefined,
    getPopupContainer: (triggerNode: any) => triggerNode?.parentElement || document.body,
  };

  const useStaffStyleCreate = isStaffUser || (isAdminUser && !isEditMode);
  // Staff edit: lock site/template only when the report already has them saved.
  // Older legacy rows can have missing reportTemplateId and must allow selection.
  const lockStaffEditContext =
    isStaffUser &&
    isEditMode &&
    editing?.siteId != null &&
    String(editing.siteId).trim() !== "" &&
    editing?.reportTemplateId != null &&
    String(editing.reportTemplateId).trim() !== "";
  const hadSubmittedCustomer =
    isEditMode && editing?.customerId != null && String(editing.customerId).trim() !== "";
  const hadSubmittedSite = isEditMode && editing?.siteId != null && String(editing.siteId).trim() !== "";
  const hadSubmittedService =
    isEditMode && editing?.serviceId != null && String(editing.serviceId).trim() !== "";

  const showCustomerField =
    !useStaffStyleCreate && templateChosen && (!isEditMode || hadSubmittedCustomer);
  const showSiteField =
    useStaffStyleCreate || (templateChosen && (!isEditMode || hadSubmittedSite));
  const showServiceField =
    !isIncidentReportMode &&
    !useStaffStyleCreate &&
    templateChosen &&
    (!isEditMode || hadSubmittedService);
  /** Other site: Service picker for staff/admin; Client picker only for admin (staff uses default assignment). */
  const showOtherClientServiceFields = useStaffStyleCreate && isOtherSite && !isEditMode;
  const showOtherClientField = showOtherClientServiceFields && isAdminUser;
  const showOtherServiceField = !isIncidentReportMode && showOtherClientServiceFields;

  const whereWhoHint = !templateChosen && !isEditMode
    ? useStaffStyleCreate
      ? isOtherSite
            ? isStaffUser
              ? isIncidentForm
                ? "Other site: enter the site name and address, then choose the incident template."
                : "Other site: enter the site name and address, then choose Service and template. Client comes from your site assignments."
              : isIncidentForm
                ? "Other site: enter the site name and address, then choose client and template."
                : "Other site: enter the site name and address, then choose client, Service, and template."
        : isIncidentForm
          ? "Select the job site, then choose an incident report template. Choose Other for a custom site."
          : "Select the job site, then choose a report template. Only templates linked to that site's services are shown. Choose Other for a custom site."
      : isIncidentForm
        ? "Choose an incident report template first. Customer and site appear after a template is selected."
        : "Choose a report template first. Customer, site, and Service appear after a template is selected."
    : isEditMode && !hadSubmittedCustomer && !hadSubmittedSite && !hadSubmittedService
      ? isIncidentForm
        ? "This report has no saved customer or site on file."
        : "This report has no saved customer, site, or Service on file."
      : !isEditMode
        ? useStaffStyleCreate
          ? isOtherSite
            ? isStaffUser
              ? isIncidentForm
                ? "Enter the custom site name and address. Client is filled from your assignments."
                : "Enter the custom site name and address. Client is filled from your assignments; choose Service if needed."
              : isIncidentForm
                ? "Enter the custom site name and address. Client must be selected manually."
                : "Enter the custom site name and address. Client and Service must be selected manually."
            : isIncidentForm
              ? "Select the job site for this incident report. Customer is filled from the site assignment."
              : "Select the job site for this report. Customer and Service are filled from the site assignment."
          : isIncidentForm
            ? "Choose customer and site for this incident report."
            : "Choose customer, site, and Service for this report."
        : isStaffUser
          ? isIncidentForm
            ? "Only the job site is shown below; customer stays on file for this report."
            : "Only the job site is shown below; customer and Service stay on file for this report."
          : isIncidentForm
            ? "Only customer and site that were saved on this report are shown below."
            : "Only customer, site, and Service that were saved on this report are shown below.";

  const showTemplateField =
    !useStaffStyleCreate ||
    !isMobilePortrait ||
    isEditMode ||
    Boolean(watchedSiteId);

  const jobSiteSelectOptions = [
    ...sites.map((s: any) => ({ value: s.id, label: s.name || s.siteName || `#${s.id}` })),
    { value: OTHER_JOB_SITE, label: "Other (custom site)" },
  ];

  const siteFieldCol = showSiteField ? (
    <Col span={modalFieldColSpan}>
      <Fieldset>
        <Form.Item
          name="siteId"
          label={useStaffStyleCreate ? "Job site" : "Site"}
          rules={[{ required: true, message: useStaffStyleCreate ? "Select a job site" : "Select a site" }]}
        >
          <Select
            {...selectProps}
            placeholder={useStaffStyleCreate ? "Select job site" : "Select site"}
            options={jobSiteSelectOptions}
            onChange={(id) => void onPickSite(id as number | string | undefined)}
            disabled={lockStaffEditContext}
          />
        </Form.Item>
      </Fieldset>
    </Col>
  ) : null;

  const customSiteFieldsCol = isOtherSite && !isEditMode ? (
    <>
      <Col span={modalFieldColSpan}>
        <Fieldset>
          <Form.Item
            name="siteName"
            label="Site name"
            rules={[{ required: true, message: "Enter the site name" }]}
          >
            <Input
              size={controlSize}
              className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
              style={{ borderRadius: 8 }}
              placeholder="Enter site name"
              onChange={() => {
                setTimeout(() => refreshAutoMergeTemplateFields(), 0);
              }}
            />
          </Form.Item>
        </Fieldset>
      </Col>
      <Col span={modalFieldColSpan}>
        <Fieldset>
          <Form.Item
            name="siteAddress"
            label="Site address"
            rules={[{ required: true, message: "Enter the site address" }]}
          >
            <Input
              size={controlSize}
              className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
              style={{ borderRadius: 8 }}
              placeholder="Enter site address"
              onChange={() => {
                setTimeout(() => refreshAutoMergeTemplateFields(), 0);
              }}
            />
          </Form.Item>
        </Fieldset>
      </Col>
    </>
  ) : null;

  const templateFieldCol = showTemplateField ? (
    <Col span={modalFieldColSpan}>
      <Fieldset>
        <Form.Item
          name="reportTemplateId"
          label="Report template"
          rules={[{ required: !isEditMode }]}
        >
          <Select
            key={
              useStaffStyleCreate
                ? `report-template-site-${watchedSiteId ?? "none"}-${servicesSiteId ?? "pending"}`
                : "report-template-admin"
            }
            {...selectProps}
            loading={useStaffStyleCreate && loadingSiteServices}
            placeholder={
              !watchedSiteId
                ? "Select a job site first"
                : loadingSiteServices
                  ? "Loading templates..."
                  : isEditMode
                    ? "Select a template (optional for legacy reports)"
                    : "Select a template"
            }
            disabled={
              lockStaffEditContext ||
              (useStaffStyleCreate && !watchedSiteId) ||
              (useStaffStyleCreate && loadingSiteServices)
            }
            options={filteredReportTemplates.map((t: any) => ({ value: t.id, label: t.name }))}
            onChange={(tplId) => {
              setTimeout(() => {
                const tpl = reportTemplates.find((t: any) => +t.id === +tplId);
                applyTemplateFieldDefaults(tpl);
                if (useStaffStyleCreate) {
                  const siteId = form.getFieldValue("siteId");
                  if (siteId && tpl && !isOtherJobSite(siteId)) {
                    void applyServiceFromTemplate(tpl, +siteId);
                  } else if (tpl) {
                    refreshAutoMergeTemplateFields();
                  }
                }
              }, 0);
            }}
          />
        </Form.Item>
      </Fieldset>
    </Col>
  ) : null;

  const mobilePortraitBleed: React.CSSProperties = reportsPageDark
    ? {
        paddingTop: 0,
        paddingBottom: 16,
        paddingLeft: isMobilePortrait ? 12 : 0,
        paddingRight: isMobilePortrait ? 12 : 0,
        margin: 0,
        width: "100%",
        boxSizing: "border-box",
        background: "#000000",
      }
    : isMobilePortrait
      ? {
          paddingTop: 8,
          paddingBottom: 16,
          marginLeft: -20,
          marginRight: -20,
          paddingLeft: 20,
          paddingRight: 20,
          width: "calc(100% + 40px)",
          boxSizing: "border-box",
          background: "#ffffff",
        }
      : { paddingTop: 8 };

  return (
    <Layout title={pageTitle}>
      <ReportTimePickerPopupStyles />
      <NewReportModalMobilePortraitStyles />
      <NewReportsListChromeStyles />
      {reportsPageDark ? <ReportsMobileDarkPageStyles /> : null}
      <UsersDiv
        style={mobilePortraitBleed}
        className={`new-reports-list-wrap${showMobileCards ? " new-reports-list-wrap--mobile-cards" : ""}${
          isMobilePortrait ? " new-reports-list-wrap--mobile-portrait" : ""
        }${reportsPageDark ? " new-reports-page-dark new-reports-theme-dark" : ""}`}
      >
        <div className="nr-list-page">
        <div
          className={`nr-list-chrome${mobileUiDark ? " nr-list-chrome--dark" : ""}${
            isMobilePortrait ? " nr-list-chrome--mobile" : ""
          }`}
        >
        {showReportDeletedTabs ? (
          <div className={isMobilePortrait ? undefined : "nr-list-chrome-top"}>
            {!isMobilePortrait ? (
              <div>
                <h2 className="nr-list-chrome-title">
                  {intl.formatMessage({ id: pageTitle })}
                </h2>
                <p className="nr-list-chrome-sub">
                  {isIncidentReportMode
                    ? "Submitted incident reports"
                    : isSafetyAuditMode
                      ? "Submitted safety audits"
                      : "Submitted field reports"}
                </p>
              </div>
            ) : null}
            <Tabs
              className={
                isMobilePortrait || showMobileCards
                  ? `new-reports-mobile-tabs${mobileUiDark ? " new-reports-mobile-tabs--dark" : ""}`
                  : "nr-list-chrome-tabs"
              }
              activeKey={reportListTab}
              onChange={(k) => {
                setReportListTab(k as ReportListTab);
                setPage(1);
                setSelectedRowKeys([]);
              }}
              style={isMobilePortrait ? { marginBottom: 12 } : { marginBottom: 0 }}
              items={[
                { key: "active", label: "Reports" },
                { key: "deleted", label: `Deleted (${deletedReportCount})` },
              ]}
            />
          </div>
        ) : !isMobilePortrait ? (
          <div className="nr-list-chrome-top">
            <div>
              <h2 className="nr-list-chrome-title">
                {intl.formatMessage({ id: pageTitle })}
              </h2>
              <p className="nr-list-chrome-sub">
                {isIncidentReportMode
                  ? "Submitted incident reports"
                  : isSafetyAuditMode
                    ? "Submitted safety audits"
                    : "Submitted field reports"}
              </p>
            </div>
          </div>
        ) : null}
        <div
          className={`new-reports-list-filters${mobileUiDark ? " new-reports-list-filters--dark" : ""}${
            !isMobilePortrait ? " nr-toolbar-card" : ""
          }`}
        >
          {isMobilePortrait ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: listFiltersOpen ? 12 : 16,
              }}
            >
              <Button
                type="default"
                className={mobileUiDark ? "nr-mobile-btn-dark" : undefined}
                icon={<FilterOutlined />}
                onClick={() => setListFiltersOpen((open) => !open)}
                style={{ flex: 1, ...mobileDarkBtnDefaultStyle }}
                aria-expanded={listFiltersOpen}
              >
                Filters {listFiltersOpen ? <UpOutlined /> : <DownOutlined />}
              </Button>
              {+profileType !== userType.CUSTOMER ? (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  style={staffPrimaryGreen}
                  onClick={openCreate}
                  loading={listLoading}
                >
                  {newReportButtonLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
          <Form
            form={listForm}
            layout="vertical"
            className={[
              !isMobilePortrait ? "nr-toolbar-form" : "",
              !isMobilePortrait && isIncidentReportMode ? "nr-toolbar-form--no-service" : "",
              isMobilePortrait && !listFiltersOpen ? "new-reports-list-filters-form--collapsed" : "",
              mobileUiDark ? "new-reports-list-filters-form--dark" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              isMobilePortrait
                ? {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px 16px",
                    alignItems: "flex-end",
                    marginBottom: 0,
                  }
                : { marginBottom: 0 }
            }
          >
            <Form.Item
              name="dateRange"
              label="Date range"
              className={mobileUiDark ? "nr-dark-picker-shell" : undefined}
              style={isMobilePortrait ? { width: "100%" } : undefined}
            >
              <RangePicker
                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                format="DD/MM/YYYY"
                style={{
                  width: "100%",
                  ...mobileDarkFieldStyle,
                }}
                onChange={() => {
                  setTimeout(() => void applyListFiltersFromForm(), 0);
                }}
              />
            </Form.Item>
            <Form.Item name="siteId" label="Job site" style={isMobilePortrait ? { width: "100%" } : undefined}>
              <div className={mobileUiDark ? "nr-dark-select-shell" : undefined}>
                <Select
                  className={mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined}
                  popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                  dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                  allowClear
                  placeholder="All sites"
                  options={sites.map((s: any) => ({ value: +s.id, label: s.name || s.siteName || String(s.id) }))}
                  onChange={(v) => onListFilterSiteChange(v as number | undefined)}
                  showSearch
                  optionFilterProp="label"
                  style={{
                    width: "100%",
                    minWidth: isMobilePortrait ? undefined : 140,
                    ...(mobileUiDark ? {} : mobileDarkFieldStyle),
                  }}
                />
              </div>
            </Form.Item>
            {!isIncidentReportMode ? (
            <Form.Item name="serviceId" label="Service" style={isMobilePortrait ? { width: "100%" } : undefined}>
              <div className={mobileUiDark ? "nr-dark-select-shell" : undefined}>
                <Select
                  className={mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined}
                  popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                  dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                  allowClear
                  placeholder="All services"
                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  onChange={(v) => void onListFilterServiceChange(v as string | undefined)}
                  showSearch
                  optionFilterProp="label"
                  style={{
                    width: "100%",
                    minWidth: isMobilePortrait ? undefined : 140,
                    ...(mobileUiDark ? {} : mobileDarkFieldStyle),
                  }}
                />
              </div>
            </Form.Item>
            ) : null}
            {supportsTableSort && (showMobileCards || isMobilePortrait) ? (
              <Form.Item label="Sort by" style={isMobilePortrait ? { width: "100%" } : undefined}>
                <div className={mobileUiDark ? "nr-dark-select-shell" : undefined}>
                  <Select
                    className={mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined}
                    popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                    dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                    value={`${listSort.orderBy}:${listSort.orderValue}`}
                    options={reportSortOptions}
                    onChange={onMobileSortChange}
                    style={{
                      width: "100%",
                      minWidth: isMobilePortrait ? undefined : 220,
                      ...(mobileUiDark ? {} : mobileDarkFieldStyle),
                    }}
                  />
                </div>
              </Form.Item>
            ) : null}
            <Form.Item
              className="nr-keyword-row"
              label={!isMobilePortrait ? "Keyword" : undefined}
              style={isMobilePortrait ? { width: "100%", marginBottom: 0 } : undefined}
            >
              <ReportListKeywordSearch
                value={listSearchDraft}
                disabled={bulkDeleting}
                mobileUiDark={mobileUiDark}
                isMobilePortrait={isMobilePortrait}
                fullWidth={!isMobilePortrait}
                fieldStyle={mobileDarkFieldStyle}
                onChange={onListSearchInputChange}
                onSearch={onListSearchInputSearch}
              />
            </Form.Item>
            {isMobilePortrait ? (
              <Form.Item className="nr-search-row" style={{ width: "100%", marginBottom: 0 }}>
                <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button type="primary" icon={<SearchOutlined />} style={staffPrimaryGreen} onClick={onSearchList}>
                    Search
                  </Button>
                </Space>
              </Form.Item>
            ) : (
              <Form.Item className="nr-toolbar-actions">
                <Button
                  type="primary"
                  className="nr-btn-search"
                  icon={<SearchOutlined />}
                  onClick={onSearchList}
                >
                  Search
                </Button>
                {+profileType !== userType.CUSTOMER ? (
                  <Button
                    className="nr-btn-new"
                    icon={<FileTextOutlined />}
                    onClick={openCreate}
                    loading={listLoading}
                  >
                    {newReportButtonLabel}
                  </Button>
                ) : null}
              </Form.Item>
            )}
          </Form>
        </div>

        {canUseBulkDelete ? (
          <div
            className={[
              showMobileCards
                ? `new-reports-bulk-bar--mobile${mobileUiDark ? " new-reports-bulk-bar--dark" : ""}`
                : "nr-bulk-bar--chrome",
              mobileUiDark && !showMobileCards ? "new-reports-bulk-bar--dark" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              showMobileCards || isMobilePortrait
                ? {
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "stretch",
                    gap: 12,
                    marginTop: 10,
                    marginBottom: 0,
                    padding: "12px 14px",
                    borderRadius: mobileUiDark ? 8 : 10,
                    flexDirection: "column",
                    ...(mobileUiDark
                      ? {
                          background: "#1a1a1a",
                          border: "1px solid #444444",
                          boxShadow: "none",
                        }
                      : {
                          background: "#ffffff",
                          border: "2px solid #d9d9d9",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        }),
                  }
                : undefined
            }
          >
            {!showMobileCards && !isMobilePortrait ? (
              <span className="nr-bulk-bar-hint">
                {selectedRowKeys.length
                  ? `${selectedRowKeys.length} selected`
                  : "0 selected · choose rows for bulk actions"}
              </span>
            ) : null}
            <Space
              wrap={!showMobileCards}
              style={showMobileCards ? { width: "100%", justifyContent: "stretch" } : undefined}
            >
              {isDeletedReportTab && isAdminUser ? (
                <Popconfirm
                  title={`Restore ${selectedRowKeys.length} selected report${selectedRowKeys.length === 1 ? "" : "s"} to the Reports list?`}
                  okText="Restore"
                  cancelText="Cancel"
                  disabled={!selectedRowKeys.length || bulkDeleting}
                  onConfirm={restoreSelectedReports}
                >
                  <Button
                    icon={<UndoOutlined />}
                    loading={bulkDeleting}
                    disabled={!selectedRowKeys.length || bulkDeleting}
                    block={showMobileCards}
                    style={isMobilePortrait ? { width: "100%" } : undefined}
                  >
                    Restore selected
                    {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                  </Button>
                </Popconfirm>
              ) : null}
              <Popconfirm
                title={
                  isDeletedReportTab && isAdminUser ? (
                    <span>
                      Permanently delete {selectedRowKeys.length} selected report
                      {selectedRowKeys.length === 1 ? "" : "s"}?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                        This cannot be undone.
                      </div>
                    </span>
                  ) : +profileType === userType.ADMIN ? (
                    <span>
                      Move {selectedRowKeys.length} selected report
                      {selectedRowKeys.length === 1 ? "" : "s"} to Deleted?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                        You can permanently delete them later from the Deleted tab.
                      </div>
                    </span>
                  ) : (
                    <span>
                      Remove {selectedRowKeys.length} selected report
                      {selectedRowKeys.length === 1 ? "" : "s"} from your list?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                        Reports move to Deleted. You can restore them from the Deleted tab.
                      </div>
                    </span>
                  )
                }
                okText={
                  isDeletedReportTab && isAdminUser
                    ? "Delete permanently"
                    : +profileType === userType.ADMIN
                      ? "Move to Deleted"
                      : "Remove"
                }
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                disabled={!selectedRowKeys.length || bulkDeleting}
                onConfirm={
                  isDeletedReportTab && isAdminUser
                    ? permanentlyDeleteSelectedReports
                    : deleteSelectedReports
                }
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={bulkDeleting}
                  disabled={!selectedRowKeys.length || bulkDeleting}
                  block={showMobileCards}
                  className={mobileUiDark ? "nr-mobile-bulk-remove-btn" : undefined}
                  style={
                    showMobileCards
                      ? {
                          flex: 1,
                          ...(mobileUiDark
                            ? {
                                background: selectedRowKeys.length
                                  ? "#3a1f1f"
                                  : "#2a1515",
                                borderColor: selectedRowKeys.length
                                  ? "#6b3030"
                                  : "#4a2a2a",
                                color: selectedRowKeys.length
                                  ? "#ff9c9c"
                                  : "#8c5a5a",
                              }
                            : {}),
                        }
                      : mobileUiDark
                        ? {
                            background: selectedRowKeys.length
                              ? "#3a1f1f"
                              : "#2a1515",
                            borderColor: selectedRowKeys.length
                              ? "#6b3030"
                              : "#4a2a2a",
                            color: selectedRowKeys.length ? "#ff9c9c" : "#8c5a5a",
                          }
                        : undefined
                  }
                >
                  {isDeletedReportTab && isAdminUser
                    ? "Delete permanently"
                    : +profileType === userType.ADMIN
                      ? "Move to Deleted"
                      : "Remove selected"}
                  {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                </Button>
              </Popconfirm>
              <Button
                type="link"
                disabled={!selectedRowKeys.length || bulkDeleting}
                onClick={() => setSelectedRowKeys([])}
                block={showMobileCards}
                style={mobileUiDark ? { color: "#9a9a9a" } : undefined}
              >
                Clear selection
              </Button>
            </Space>
          </div>
        ) : null}
        </div>

        {isDeletedReportTab && (isCustomerUser || isStaffUser || isAdminUser) ? (
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
            <Popconfirm
              title={
                <span>
                  {isAdminUser
                    ? "Permanently delete all reports on this page?"
                    : "Clear all deleted reports?"}
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    {isAdminUser
                      ? "This permanently removes the reports and cannot be undone. Only admins can hard-delete."
                      : "This hides them from your Deleted tab (soft clear). The data stays until an admin permanently deletes it."}
                  </div>
                </span>
              }
              okText={isAdminUser ? "Delete permanently" : "Clear deleted"}
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              disabled={clearingDeleted || listLoading || deletedReportCount === 0}
              onConfirm={clearDeletedReports}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={clearingDeleted}
                disabled={clearingDeleted || listLoading || deletedReportCount === 0}
                className={mobileUiDark ? "nr-mobile-bulk-remove-btn" : undefined}
              >
                {isAdminUser ? "Delete all on page" : "Clear deleted"}
              </Button>
            </Popconfirm>
          </div>
        ) : null}

        <div className={`nr-list-table-panel${showMobileCards ? " nr-list-table-panel--mobile" : ""}`}>
        {showMobileCards ? (
          <Spin spinning={listLoading}>
            {!listLoading && displayRows.length === 0 ? (
              <Empty
                description={
                  listSearchDraft.trim()
                    ? "No reports match your search"
                    : isDeletedReportTab
                      ? "No deleted reports"
                      : "No reports found"
                }
                style={{ margin: "32px 0" }}
              />
            ) : (
              <MobileReportsList $dark={mobileUiDark}>
                {displayRows.map(renderMobileReportCard)}
              </MobileReportsList>
            )}
            {count > 0 ? (
              <Pagination
                className="new-reports-mobile-pagination"
                current={page}
                pageSize={limit}
                total={count}
                size="small"
                showSizeChanger={false}
                showTotal={(t) => `${t} reports`}
                onChange={(p) => setPage(p)}
                style={{ marginTop: 16, textAlign: "center" }}
              />
            ) : null}
          </Spin>
        ) : (
          <Table
            rowKey="id"
            loading={listLoading}
            dataSource={displayRows}
            columns={columns as any}
            rowSelection={rowSelection}
            bordered
            size="middle"
            showSorterTooltip={supportsTableSort}
            onChange={supportsTableSort ? onTableChange : undefined}
            rowClassName={(record) =>
              linkedReportId && +record.id === linkedReportId ? "report-row-highlight" : ""
            }
            scroll={{ x: true }}
            pagination={{
              current: page,
              pageSize: limit,
              total: count,
              showSizeChanger: true,
              showTotal: (t) => `${t} reports`,
              ...(supportsTableSort
                ? {}
                : {
                    onChange: (p, ps) => {
                      setPage(p);
                      if (ps !== limit) setLimit(ps);
                    },
                  }),
            }}
          />
        )}
        </div>
        </div>
      </UsersDiv>

      <Modal
        className={`submitted-report-view-modal${
          mobileUiDark ? " submitted-report-view-modal--mobile-dark" : ""
        }`}
        open={viewOpen}
        title={
          viewRow ? (
            <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{viewBannerTitle}</span>
          ) : (
            "Submitted Reports"
          )
        }
        onCancel={() => setViewOpen(false)}
        footer={
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              paddingTop: 16,
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            {+profileType === userType.ADMIN ? (
              <Button icon={<DeleteOutlined />} style={submittedDeleteFooterBtn} onClick={confirmDeleteViewReport}>
                {isDeletedReportTab ? "Delete permanently" : "Move to Deleted"}
              </Button>
            ) : null}
            {isDeletedReportTab &&
            viewRow &&
            (isAdminUser || canSoftDeleteReport(viewRow)) ? (
              <Popconfirm
                title={
                  isAdminUser
                    ? "Restore this report to the Reports list?"
                    : "Restore this report to your list?"
                }
                okText="Restore"
                cancelText="Cancel"
                onConfirm={() => restoreReport(viewRow)}
              >
                <Button icon={<UndoOutlined />} style={staffPrimaryGreen}>
                  Restore
                </Button>
              </Popconfirm>
            ) : null}
            {!isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (
              viewRow && canSoftDeleteReport(viewRow) ? (
                <Button icon={<DeleteOutlined />} style={submittedDeleteFooterBtn} onClick={confirmDeleteViewReport}>
                  Remove
                </Button>
              ) : null
            ) : null}
            <Button type="primary" icon={<CloseOutlined />} style={staffPrimaryGreen} onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </div>
        }
        width={showMobileCards ? "calc(100vw - 24px)" : 960}
        style={showMobileCards ? { top: 8, maxWidth: "100vw", paddingBottom: 0 } : undefined}
        destroyOnClose
        bodyStyle={{
          maxHeight: "75vh",
          overflow: "auto",
          padding: "20px 24px 16px",
          background: "#fff",
        }}
      >
        <style>
          {`
            .submitted-report-view-modal .ant-modal-header {
              background: #389e0d;
              border-bottom: none;
              padding: 14px 48px 14px 24px;
            }
            .submitted-report-view-modal .ant-modal-title {
              width: 100%;
              text-align: center;
            }
            .submitted-report-view-modal .ant-modal-close {
              color: rgba(255, 255, 255, 0.88);
            }
            .submitted-report-view-modal .ant-modal-close:hover {
              color: #fff;
            }
            .submitted-report-gallery-cb .ant-checkbox-inner,
            .submitted-report-gallery-cb.ant-checkbox-wrapper .ant-checkbox-inner {
              border: none !important;
            }
            @media (max-width: 768px) {
              .submitted-report-photo-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
            }
          `}
        </style>
        {viewRow ? (
          <>
            <Row gutter={[40, 8]}>
              <Col xs={24} sm={12}>
                <div style={submittedMetaLabel}>Site</div>
                <span style={submittedMetaValue}>{viewRow.siteName || EM_DASH}</span>
                <div style={{ ...submittedMetaLabel, marginTop: 18 }}>Submitted by</div>
                <span style={submittedGreenPill}>{formatSubmittedByRow(viewRow)}</span>
                {viewPdfHref ? (
                  <div style={{ marginTop: 12 }}>
                    <Typography.Link
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenReportPdf(viewPdfHref);
                      }}
                      style={{ fontSize: 13 }}
                    >
                      <FilePdfOutlined /> Download PDF
                    </Typography.Link>
                  </div>
                ) : null}
              </Col>
              <Col xs={24} sm={12}>
                {!isIncidentReportMode ? (
                  <>
                    <div style={submittedMetaLabel}>Service</div>
                    <span style={submittedMetaValue}>{viewRow.serviceName || EM_DASH}</span>
                  </>
                ) : null}
                <div style={{ ...submittedMetaLabel, marginTop: isIncidentReportMode ? 0 : 18 }}>Submitted date</div>
                <span
                  style={{
                    ...submittedMetaValue,
                    display: "inline-flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    whiteSpace: "nowrap",
                  }}
                >
                  {resolveReportSubmittedDisplayMoment(viewRow) ? (
                    <>
                      <span>{resolveReportSubmittedDisplayMoment(viewRow)!.format(REPORT_DISPLAY_DATE)}</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginLeft: 20,
                          flexShrink: 0,
                        }}
                      >
                        <ClockCircleOutlined style={{ fontSize: 12, color: "#8c8c8c" }} aria-hidden />
                        <span>{resolveReportSubmittedDisplayMoment(viewRow)!.format("HH:mm")}</span>
                      </span>
                    </>
                  ) : (
                    EM_DASH
                  )}
                </span>
                {+profileType !== userType.STAFF ? (
                  <>
                    <div style={{ ...submittedMetaLabel, marginTop: 18 }}>Read status</div>
                    <div>{viewStatusPill}</div>
                  </>
                ) : null}
              </Col>
            </Row>

            <div style={{ fontSize: 14, marginTop: 20 }}>
              {viewReportBlocks.map((block) => {
                if (block.kind === "field") {
                  const r = block.report;
                  return (
                    <div key={`${r.name}-${block.num}`} style={{ marginBottom: 18 }}>
                      <span style={{ color: "#000", fontSize: 14, fontWeight: 700 }}>
                        {block.num}. {r.name}:
                      </span>
                      <div style={{ marginTop: 8, paddingLeft: 2, color: "#000" }}>{renderSubmittedReportValue(r)}</div>
                    </div>
                  );
                }
                const r = block.report;
                const urls = block.urls;
                return (
                  <div key={`${r.name}-photos-${block.num}`} style={{ marginBottom: 22 }}>
                    <span style={{ color: "#000", fontSize: 14, fontWeight: 700 }}>
                      {block.num}. {r.name}
                    </span>
                    {urls.length ? (
                      <Image.PreviewGroup>
                        <div
                          className="submitted-report-photo-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                            gap: 10,
                            marginTop: 12,
                          }}
                        >
                          {urls.map((url, idx) => (
                            <div
                              key={`${url}-${idx}`}
                              style={{
                                position: "relative",
                                borderRadius: 4,
                                overflow: "hidden",
                                background: "#f5f5f5",
                                width: "100%",
                                height: 0,
                                paddingBottom: "100%",
                              }}
                            >
                              <div
                                role="presentation"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  zIndex: 10,
                                  background: "rgba(255,255,255,0.88)",
                                  borderRadius: 2,
                                  padding: "2px 4px",
                                  lineHeight: 1,
                                }}
                              >
                                <Checkbox
                                  className="submitted-report-gallery-cb"
                                  checked={viewPhotoKeys.has(url)}
                                  onChange={(e) => toggleViewPhoto(url, e.target.checked)}
                                />
                              </div>
                              <div
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                {isVideoMediaUrl(url) ? (
                                  <video
                                    src={url}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                      background: "#000",
                                    }}
                                  />
                                ) : (
                                  <Image
                                    src={url}
                                    alt=""
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    wrapperStyle={{ width: "100%", height: "100%", display: "block" }}
                                    preview={{
                                      mask: (
                                        <span
                                          style={{
                                            color: "#fff",
                                            fontWeight: 700,
                                            fontSize: 14,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                          }}
                                        >
                                          <EyeOutlined style={{ fontSize: 18 }} />
                                          Preview
                                        </span>
                                      ),
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : (
                      <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                        No photos
                      </Typography.Text>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        className={mobileUiDark ? "new-report-progress-modal--dark" : undefined}
        open={progressOpen}
        closable={false}
        maskClosable={false}
        footer={null}
        zIndex={1100}
        centered
        width={480}
        maskStyle={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
        title={editing ? "Saving report" : "Uploading report"}
      >
        <div style={{ padding: "8px 4px 16px" }}>
          <Typography.Title
            level={4}
            style={{
              marginBottom: 8,
              textAlign: "center",
              fontWeight: 600,
              color: mobileUiDark ? "#ffffff" : undefined,
            }}
          >
            {submitProgress.label}
          </Typography.Title>
          {submitProgress.photoTotal != null && submitProgress.photoTotal > 0 ? (
            <Typography.Text
              strong
              style={{
                display: "block",
                marginBottom: 20,
                textAlign: "center",
                fontSize: 16,
                color: mobileUiDark ? "#85c179" : "#135200",
              }}
            >
              Photo {submitProgress.photoCurrent ?? 0} of {submitProgress.photoTotal}
            </Typography.Text>
          ) : null}
          <Progress
            percent={submitProgress.percent}
            status={submitProgress.percent >= 100 ? "success" : "active"}
            strokeColor="#397d36"
            strokeWidth={12}
            format={(pct) => `${pct}%`}
          />
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 16, textAlign: "center" }}>
            {submitProgress.percent}% complete. Please keep this window open until finished.
          </Typography.Text>
        </div>
      </Modal>

      <Modal
        className={`new-report-form-modal${modalUiDark ? " new-report-form-modal--dark" : ""}`}
        open={visible}
        closable={!progressOpen}
        maskClosable={!progressOpen}
        style={
          progressOpen
            ? { visibility: "hidden" }
            : showMobileCards || isMobilePortrait
              ? { top: 8, maxWidth: "100vw", paddingBottom: 0 }
              : undefined
        }
        wrapClassName={
          [
            progressOpen ? "new-report-form-modal-hidden" : "",
            modalUiDark ? "new-report-form-modal-wrap--dark" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        maskStyle={modalUiDark ? { backgroundColor: "rgba(0, 0, 0, 0.82)" } : undefined}
        zIndex={1050}
        onCancel={() => {
          if (!progressOpen) setVisible(false);
        }}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button
              size="large"
              icon={<CloseOutlined />}
              onClick={() => setVisible(false)}
                className={modalUiDark ? "nr-mobile-btn-dark" : undefined}
              style={{ borderRadius: 8, ...mobileDarkBtnDefaultStyle }}
              disabled={progressOpen}
            >
              {intl.formatMessage({ id: "button.Close" }, { defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={submit}
              disabled={progressOpen}
              style={{ borderRadius: 8, minWidth: 140, ...staffPrimaryGreen }}
            >
              {editing
                ? intl.formatMessage({ id: "button.Save" }, { defaultMessage: "Save changes" })
                : intl.formatMessage({ id: "button.Upload" }, { defaultMessage: "Upload" })}
            </Button>
          </div>
        }
        width={showMobileCards || isMobilePortrait ? "calc(100vw - 24px)" : 980}
        title={
          <Space size={10}>
            <FileTextOutlined style={{ color: modalUiDark ? "#ffffff" : "#1890ff" }} />
            <span style={{ color: modalUiDark ? "#ffffff" : undefined }}>
              {formModalTitle}
            </span>
          </Space>
        }
        destroyOnClose
        bodyStyle={{
          paddingTop: 8,
          ...(modalUiDark ? { background: "#262626" } : {}),
        }}
      >
        <Form layout="vertical" form={form} requiredMark="optional" preserve>
          <Row gutter={12}>
            <Form.Item name="customerName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="companyName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            {!isOtherSite ? (
              <>
                <Form.Item name="siteName" style={{ display: "none" }}>
                  <Input />
                </Form.Item>
                <Form.Item name="siteAddress" style={{ display: "none" }}>
                  <Input />
                </Form.Item>
              </>
            ) : null}
            <Form.Item name="siteLocation" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="serviceName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            {useStaffStyleCreate ? (
              <>
                {/* Always mounted so Other ↔ real site switches do not wipe assignment values */}
                <Form.Item name="customerId" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="serviceId" hidden>
                  <Input />
                </Form.Item>
              </>
            ) : null}
            <Form.Item name="description" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            {isStaffUser && isEditMode
              ? templateItemsForSubmit.map((it, idx) => {
                  if (!isHiddenFromStaffCreate(it)) return null;
                  const fieldKey = getTemplateFieldKey(it, idx);
                  return (
                    <Form.Item key={`staff-hidden-${fieldKey}`} name={fieldKey} hidden>
                      <Input />
                    </Form.Item>
                  );
                })
              : null}
            <Col span={24}>
              <Typography.Text
                strong
                style={{ fontSize: 15, color: mobileUiDark ? "#f0f0f0" : undefined }}
              >
                Where & who
              </Typography.Text>
              <Typography.Paragraph
                type="secondary"
                style={{
                  marginBottom: 12,
                  marginTop: 4,
                  fontSize: 13,
                  color: mobileUiDark ? "#9a9a9a" : undefined,
                }}
              >
                {whereWhoHint}
              </Typography.Paragraph>
            </Col>
            {useStaffStyleCreate ? (
              <>
                {siteFieldCol}
                {customSiteFieldsCol}
                {templateFieldCol}
              </>
            ) : (
              <>
                {templateFieldCol}
                {siteFieldCol}
                {customSiteFieldsCol}
              </>
            )}

            {showCustomerField ? (
              <Col span={modalFieldColSpan}>
                <Fieldset>
                  <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
                    <Select
                      {...selectProps}
                      placeholder="Select customer"
                      options={customers.map((c: any) => ({
                        value: +c.id,
                        label: `${c.fullName || c.customerName || ""}${
                          c.companyName || c.customerInfo?.companyName
                            ? ` (${c.companyName || c.customerInfo?.companyName})`
                            : ""
                        }`.trim() || `Customer #${c.id}`,
                      }))}
                      onChange={onPickCustomer}
                    />
                  </Form.Item>
                </Fieldset>
              </Col>
            ) : null}
            {showServiceField ? (
              <Col span={modalFieldColSpan}>
                <Fieldset>
                  <Form.Item name="serviceId" label="Service" rules={[{ required: true }]}>
                    <Select
                      {...selectProps}
                      placeholder="Select Service"
                      options={services.map((d: any) => ({ value: String(d.id), label: d.name || d.serviceName || `#${d.id}` }))}
                      onChange={onPickService}
                    />
                  </Form.Item>
                </Fieldset>
              </Col>
            ) : null}
            {showOtherClientServiceFields ? (
              <>
                {showOtherClientField ? (
                  <Col span={modalFieldColSpan}>
                    <Fieldset>
                      <Typography.Text style={{ display: "block", marginBottom: 8 }}>
                        Client <span style={{ color: "#ff4d4f" }}>*</span>
                      </Typography.Text>
                      <Select
                        {...selectProps}
                        placeholder="Select client"
                        value={watchedCustomerId != null && watchedCustomerId !== "" ? +watchedCustomerId : undefined}
                        options={customers.map((c: any) => {
                          const company =
                            String(c.companyName || c.fullName || c.customerName || "").trim() ||
                            `Client #${c.id}`;
                          return { value: +c.id, label: company };
                        })}
                        onChange={(id) => {
                          form.setFieldsValue({ customerId: id != null ? +id : undefined });
                          if (id != null) onPickCustomer(+id);
                        }}
                      />
                    </Fieldset>
                  </Col>
                ) : null}
                {showOtherServiceField ? (
                  <Col span={modalFieldColSpan}>
                    <Fieldset>
                      <Typography.Text style={{ display: "block", marginBottom: 8 }}>
                        Service <span style={{ color: "#ff4d4f" }}>*</span>
                      </Typography.Text>
                      <Select
                        {...selectProps}
                        placeholder="Select Service"
                        value={watchedServiceId != null && watchedServiceId !== "" ? String(watchedServiceId) : undefined}
                        options={services.map((d: any) => ({
                          value: String(d.id),
                          label: d.name || d.serviceName || `#${d.id}`,
                        }))}
                        onChange={(id) => {
                          form.setFieldsValue({ serviceId: id != null ? String(id) : undefined });
                          if (id != null) void onPickService(String(id));
                        }}
                      />
                    </Fieldset>
                  </Col>
                ) : null}
              </>
            ) : null}

            {/* notifiesStaff is required by API but hidden from staff UI */}
          </Row>

          {(templateItemsForRender.length > 0 || extraSavedReportRowsForEdit.length > 0) ? (
            <div
              className={isMobilePortrait ? "nr-template-fields-mobile" : undefined}
              style={{ marginTop: 20 }}
            >
              <Divider orientation="left" plain style={{ margin: "8px 0 16px", fontSize: 15, fontWeight: 600 }}>
                Template fields
              </Divider>
              <Row gutter={[16, 8]}>
                {templateItemsForRender.map((it: TemplateItem, idx: number) => {
                  const required = !!it.required;
                  const fieldKey = getTemplateFieldKey(it, idx);
                  const key = fieldKey;
                  const options = getOptions(it);
                  const label = getTemplateLabel(it) || it.name;
                  const fieldType = String(it.type || "").toUpperCase();
                  const templateFieldColSpan = isMobilePortrait ? 24 : 12;
                  const timeLike = isTimeLikeTemplateItem(it) || isTimeLikeLabel(label);

                  if (isAutoMergeTemplateField(it)) {
                    if (
                      (fieldType === "[REPORT_DATE]" ||
                        fieldType === "[REPORT_TIME]" ||
                        fieldType === "[REPORT_DATETIME]") &&
                      // Staff: only show picker when allowed (otherwise read-only auto-merge).
                      (!isStaffUser || !isHiddenFromStaffCreate(it))
                    ) {
                      return (
                        <Col span={templateFieldColSpan} key={key}>
                          <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                            {fieldType === "[REPORT_DATETIME]" ? (
                              <ReportAmPmDateTimePicker
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                              />
                            ) : fieldType === "[REPORT_DATE]" ? (
                              <DatePicker
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                                style={{ width: "100%", borderRadius: 8 }}
                                format="YYYY-MM-DD"
                              />
                            ) : (
                              <ReportAmPmTimePicker
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                              />
                            )}
                          </Form.Item>
                        </Col>
                      );
                    }
                    // Custom Other site: name/address are entered under Where & who.
                    if (
                      isOtherSite &&
                      (fieldType === "[SITE_NAME]" || fieldType === "[SITE_ADDRESS]")
                    ) {
                      return null;
                    }
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item
                          name={fieldKey}
                          label={label}
                          tooltip="Filled automatically from the report context"
                        >
                          <Input
                            size={controlSize}
                            readOnly
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            style={{ borderRadius: 8, color: "rgba(0,0,0,0.65)" }}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "DATETIME") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmDateTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  // Some templates incorrectly define the "Time" field as TEXT.
                  // Always show it as a time picker when the label/name is time-like.
                  if (timeLike) {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "DATE" || fieldType === "DATE_PICKER") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <DatePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="YYYY-MM-DD"
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "TIME") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "YES_NO") {
                    const preset = getYesNoPreset(it);
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item
                          name={fieldKey}
                          label={label}
                          initialValue={preset}
                          rules={[{ required }]}
                          tooltip={
                            preset
                              ? `Template default is ${preset}. You can change this before submitting.`
                              : undefined
                          }
                        >
                          <Select
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                            getPopupContainer={(node) => (node as any)?.parentElement || document.body}
                            style={{ borderRadius: 8, minWidth: 120, width: "100%" }}
                            placeholder="Choose yes or no"
                            options={[
                              { value: "YES", label: "YES" },
                              { value: "NO", label: "NO" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if ((fieldType === "SELECT" || fieldType === "CHECKLIST") && options.length) {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <Select
                            {...selectProps}
                            mode={fieldType === "CHECKLIST" ? "multiple" : undefined}
                            placeholder={fieldType === "CHECKLIST" ? "Select one or more" : "Select an option"}
                            options={options.map((o) => ({ value: o, label: o }))}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "TEXTAREA" || fieldType === "RICH_TEXT") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <Input.TextArea
                            autoSize={{ minRows: fieldType === "RICH_TEXT" ? 6 : 3 }}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            style={{ borderRadius: 8, overflow: "hidden" }}
                            placeholder="Enter details"
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "GPS") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item label={label} required={required}>
                          <Input.Group compact style={{ display: "flex", width: "100%" }}>
                            <Form.Item name={fieldKey} noStyle rules={[{ required }]}>
                              <Input
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                style={{ flex: 1, borderRadius: "8px 0 0 8px" }}
                                placeholder="lat,lng or tap Capture"
                                allowClear
                              />
                            </Form.Item>
                            <Button
                              size={controlSize}
                              icon={<EnvironmentOutlined />}
                              className={mobileUiDark ? "nr-mobile-btn-dark" : undefined}
                              style={{
                                borderRadius: "0 8px 8px 0",
                                ...mobileDarkBtnDefaultStyle,
                              }}
                              onClick={async () => {
                                message.loading({
                                  content: "Getting GPS location…",
                                  key: `gps-${fieldKey}`,
                                  duration: 0,
                                });
                                const { location: loc, error: gpsError } =
                                  await getStaffLocationDetailed();
                                message.destroy(`gps-${fieldKey}`);
                                if (!loc) {
                                  message.error(
                                    gpsError ||
                                      "Could not get GPS. On your phone, allow Location for this site (Safari/Chrome), then try again.",
                                  );
                                  return;
                                }
                                form.setFieldsValue({ [fieldKey]: loc });
                                message.success("GPS location captured");
                              }}
                            >
                              Capture
                            </Button>
                          </Input.Group>
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "NUMBER" || fieldType === "PERCENTAGE" || fieldType === "CURRENCY") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <InputNumber
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "IMAGES" || fieldType === "PHOTOS") {
                    return (
                      <Col xs={24} sm={24} md={12} span={templateFieldColSpan} key={key}>
                        <Form.Item
                          name={fieldKey}
                          label={label}
                          rules={[
                            {
                              validator: async () => {
                                if (!required) return;
                                const existing = parseMediaListValue(
                                  form.getFieldValue(fieldKey),
                                );
                                const pending =
                                  mediaUploadRefs.current[fieldKey]?.hasPending();
                                if (existing.length || pending) return;
                                throw new Error(
                                  `Please add ${label || "required photos"}`,
                                );
                              },
                            },
                          ]}
                        >
                          <TemplateImageUpload
                            multiple
                            ref={(instance) => {
                              mediaUploadRefs.current[fieldKey] = instance;
                            }}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "PHOTO" || fieldType === "IMAGE") {
                    return (
                      <Col xs={24} sm={24} md={12} span={templateFieldColSpan} key={key}>
                        <Form.Item
                          name={fieldKey}
                          label={label}
                          rules={[
                            {
                              validator: async () => {
                                if (!required) return;
                                const existing = parseMediaListValue(
                                  form.getFieldValue(fieldKey),
                                );
                                const pending =
                                  mediaUploadRefs.current[fieldKey]?.hasPending();
                                if (existing.length || pending) return;
                                throw new Error(
                                  `Please add ${label || "required photo"}`,
                                );
                              },
                            },
                          ]}
                        >
                          <TemplateImageUpload
                            multiple={false}
                            ref={(instance) => {
                              mediaUploadRefs.current[fieldKey] = instance;
                            }}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "VIDEOS" || fieldType === "VIDEO") {
                    return (
                      <Col xs={24} sm={24} md={12} span={templateFieldColSpan} key={key}>
                        <Form.Item
                          name={fieldKey}
                          label={label}
                          rules={[
                            {
                              validator: async () => {
                                if (!required) return;
                                const existing = parseMediaListValue(
                                  form.getFieldValue(fieldKey),
                                );
                                const pending =
                                  mediaUploadRefs.current[fieldKey]?.hasPending();
                                if (existing.length || pending) return;
                                throw new Error(
                                  `Please add ${label || "required video"}`,
                                );
                              },
                            },
                          ]}
                        >
                          <TemplateVideoUpload
                            ref={(instance) => {
                              mediaUploadRefs.current[fieldKey] = instance;
                            }}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "FILE" || fieldType === "FILES" || fieldType === "UPLOAD") {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateFileUpload />
                        </Form.Item>
                      </Col>
                    );
                  }
                  return (
                    <Col span={templateFieldColSpan} key={key}>
                      <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                        <Input
                          size={controlSize}
                          className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                          style={{ borderRadius: 8 }}
                          placeholder="Enter value"
                        />
                      </Form.Item>
                    </Col>
                  );
                })}
                {extraSavedReportRowsForEdit.length > 0 ? (
                  <>
                    <Col span={24}>
                      <Divider
                        orientation="left"
                        plain
                        style={{ margin: "16px 0 8px", fontSize: 14, fontWeight: 600 }}
                      >
                        Additional saved fields
                      </Divider>
                    </Col>
                    {extraSavedReportRowsForEdit.map((r: any, idx: number) => {
                      const fieldKey = legacyFieldKey(r, idx);
                      const label = fixTextEncoding(String(r?.name || "").trim()) || `Field ${idx + 1}`;
                      const fieldType = String(r?.type || "").toUpperCase();
                      const templateFieldColSpan = isMobilePortrait ? 24 : 12;

                      if (isJsonMediaFieldType(fieldType)) {
                        const multiple = fieldType === "IMAGES" || fieldType === "PHOTOS";
                        return (
                          <Col xs={24} sm={24} md={12} span={24} key={fieldKey}>
                            <Form.Item name={fieldKey} label={label}>
                              {multiple ? (
                                <TemplateImageUpload
                                  multiple
                                  ref={(instance) => {
                                    mediaUploadRefs.current[fieldKey] = instance;
                                  }}
                                />
                              ) : (
                                <TemplateVideoUpload
                                  ref={(instance) => {
                                    mediaUploadRefs.current[fieldKey] = instance;
                                  }}
                                />
                              )}
                            </Form.Item>
                          </Col>
                        );
                      }

                      if (fieldType === "FILE" || fieldType === "FILES" || fieldType === "UPLOAD") {
                        return (
                          <Col span={templateFieldColSpan} key={fieldKey}>
                            <Form.Item name={fieldKey} label={label}>
                              <TemplateFileUpload />
                            </Form.Item>
                          </Col>
                        );
                      }

                      if (fieldType === "YES_NO") {
                        return (
                          <Col span={templateFieldColSpan} key={fieldKey}>
                            <Form.Item name={fieldKey} label={label}>
                              <Select
                                {...selectProps}
                                placeholder="Select"
                                options={[
                                  { value: "YES", label: "YES" },
                                  { value: "NO", label: "NO" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        );
                      }

                      return (
                        <Col span={templateFieldColSpan} key={fieldKey}>
                          <Form.Item name={fieldKey} label={label}>
                            <Input
                              size={controlSize}
                              className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                              style={{ borderRadius: 8 }}
                            />
                          </Form.Item>
                        </Col>
                      );
                    })}
                  </>
                ) : null}
              </Row>
            </div>
          ) : legacyReportsForRender.length > 0 ? (
            <div
              className={isMobilePortrait ? "nr-template-fields-mobile" : undefined}
              style={{ marginTop: 20 }}
            >
              <Divider orientation="left" plain style={{ margin: "8px 0 16px", fontSize: 15, fontWeight: 600 }}>
                Saved fields (legacy report)
              </Divider>
              <Row gutter={[16, 8]}>
                {legacyReportsForRender.map((r: any, idx: number) => {
                  const required = false;
                  const fieldKey = legacyFieldKey(r, idx);
                  const label = fixTextEncoding(String(r?.name || "").trim()) || `Field ${idx + 1}`;
                  const fieldType = String(r?.type || "").toUpperCase();
                  const templateFieldColSpan = isMobilePortrait ? 24 : 12;

                  if (isTimeLikeLabel(label) && fieldType !== "DATETIME" && fieldType !== "[REPORT_DATETIME]") {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "DATE" || fieldType === "DATE_PICKER") {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <DatePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="YYYY-MM-DD"
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "DATETIME" || fieldType === "[REPORT_DATETIME]") {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmDateTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "TIME") {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <ReportAmPmTimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "IMAGES" || fieldType === "PHOTOS") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateImageUpload multiple />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "PHOTO" || fieldType === "IMAGE") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateImageUpload multiple={false} />
                        </Form.Item>
                      </Col>
                    );
                  }
                  if (fieldType === "VIDEOS" || fieldType === "VIDEO") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateVideoUpload />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "FILE" || fieldType === "FILES" || fieldType === "UPLOAD") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TemplateFileUpload />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "TEXTAREA" || fieldType === "TEXT_AREA") {
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <Input.TextArea
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            style={{ borderRadius: 8, overflow: "hidden" }}
                            autoSize={{ minRows: 3 }}
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  return (
                    <Col span={templateFieldColSpan} key={fieldKey}>
                      <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                        <Input
                          size={controlSize}
                          className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                          style={{ borderRadius: 8 }}
                        />
                      </Form.Item>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ) : null}

        </Form>
      </Modal>

      {isMobilePortrait && mobilePdfUrl ? (
        <MobileReportPdfOverlay url={mobilePdfUrl} onClose={closeMobilePdf} />
      ) : null}
    </Layout>
  );
};

export default NewReports;

