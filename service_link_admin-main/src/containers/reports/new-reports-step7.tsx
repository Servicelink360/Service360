import Layout from "@app/components/layout/Layout";
import { Fieldset } from "@app/components/common/Common.styles";
import UploadImageMultil, { UploadImageMultilHandle } from "@app/components/common/upload-image-multi";
import { UsersDiv } from "@app/components/common/container.style";
import endPoint from "@app/constants/endPoint";
import serviceType from "@app/constants/serviceType";
import urlConfig from "@app/config/site.config";
import { CheckCircleFilled, ClockCircleOutlined, CloseOutlined, DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, FileTextOutlined, FilterOutlined, MailOutlined, SaveOutlined, SearchOutlined, UndoOutlined, UpOutlined, UploadOutlined } from "@ant-design/icons";
import { Link, useHistory, useLocation } from "react-router-dom";
import { callAPIAsync, callAPIUploadAsync } from "../../library/helpers/api";
import { dateFormat, dateTimeFormat } from "@app/config/data.config";
import { AU_UTC_OFFSET, momentAu } from "@app/library/helpers/australianDatetime";
import type { UploadFile } from "antd/es/upload/interface";
import { Button, Checkbox, Col, DatePicker, Divider, Empty, Form, Image, Input, InputNumber, message, Modal, Pagination, Popconfirm, Progress, Row, Select, Space, Spin, Table, Tabs, Tag, TimePicker, Tooltip, Typography, Upload } from "antd";
import moment from "moment";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import { ReportsMobileDarkPageStyles } from "./reports-mobile-dark-styles";
import MobileReportPdfOverlay from "@app/components/common/MobileReportPdfOverlay";
import useMobilePortrait from "@app/lib/hooks/useMobilePortrait";
import { useColorModeOptional } from "@app/context/ColorModeContext";
import { useDispatch } from "react-redux";
import { useIntl } from "react-intl";
import dashboardActions from "@app/redux/dashboard/actions";
import { dJobStatus, userType } from "../../constants/statusUser";
import { fixTextEncoding } from "@app/library/report-templates/templateItemUtils";

const { RangePicker } = DatePicker;

type InitData = {
  reportTemplates?: any[];
};

type TemplateItem = {
  id?: number;
  name: string;
  type: string;
  order?: number;
  required?: boolean;
  value?: string;
  config?: Record<string, any>;
};

/** Unique Ant Design form keys � duplicate template item `name` values would otherwise hide fields. */
const getTemplateFieldKey = (it: TemplateItem, idx: number) => {
  if (it.id != null && Number.isFinite(+it.id)) return `_tpl_${it.id}`;
  const base = String(it.name || "field").trim() || "field";
  return `${base}__${it.order ?? idx + 1}`;
};

const AUTO_MERGE_FIELD_TYPES = new Set([
  "[REPORT_DATE]",
  "[REPORT_TIME]",
  "[SITE_NAME]",
  "[SITE_ADDRESS]",
  "[CUSTOMER_NAME]",
  "[REPORT_BY]",
]);

const isAutoMergeTemplateField = (it: TemplateItem) =>
  AUTO_MERGE_FIELD_TYPES.has(String(it?.type || "").toUpperCase());

const autoMergeUsesPicker = (it: TemplateItem, isStaffUser: boolean): boolean => {
  const t = String(it?.type || "").toUpperCase();
  if (t !== "[REPORT_DATE]" && t !== "[REPORT_TIME]") return false;
  if (!isStaffUser) return true;
  const visibleToStaff = it?.config?.visibleToStaff;
  if (typeof visibleToStaff === "boolean") return visibleToStaff;
  return true;
};

const resolveAutoMergeFieldValue = (
  it: TemplateItem,
  values: Record<string, any>,
  profile?: { fullName?: string; username?: string },
): string => {
  const t = String(it?.type || "").toUpperCase();
  if (t === "[REPORT_DATE]") return moment().format("YYYY-MM-DD");
  if (t === "[REPORT_TIME]") return moment().format("HH:mm:ss");
  if (t === "[SITE_NAME]") return String(values.siteName || "").trim();
  if (t === "[SITE_ADDRESS]") return String(values.siteAddress || "").trim();
  if (t === "[CUSTOMER_NAME]") {
    return String(values.companyName || values.customerName || "").trim();
  }
  if (t === "[REPORT_BY]") {
    return String(
      values.staffDisplayName ||
        values.reportBy ||
        profile?.fullName ||
        profile?.username ||
        "",
    ).trim();
  }
  return "";
};

const isJunkTemplateField = (it: TemplateItem) => {
  const name = String(it?.name || "").trim().toLowerCase();
  const junkNames = [
    "section one - excutive summary",
    "section one - executive summary",
    "section two - contract review",
    "section three - inspections",
    "section four - staffing",
    "sective five - financials",
    "section five - financials",
    "section six- appendix",
    "section six - appendix",
    "description",
  ];
  if (junkNames.includes(name)) return true;
  if (name.startsWith("section one") || name.startsWith("section two") || name.startsWith("section three")) return true;
  if (name.startsWith("section four") || name.startsWith("section five") || name.startsWith("sective five") || name.startsWith("section six")) return true;
  // Some templates encode section headers as special types
  const t = String(it?.type || "").toUpperCase();
  if (t === "SECTION" || t === "TITLE" || t === "HEADER" || t === "DIVIDER") return true;
  return false;
};

/** Stored report values: JSON array string (admin IMAGES/VIDEOS), or legacy URL / comma-separated. */
const parseMediaListValue = (v: unknown): string[] => {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v).trim();
  if (!s || s === "[]") return [];
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p)) return p.map(String).filter(Boolean);
    if (typeof p === "string" && p) return [p];
  } catch {
    if (/^https?:\/\//i.test(s) || s.startsWith("/")) return [s];
    return s.split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

const isJsonMediaFieldType = (fieldType: string) =>
  ["IMAGES", "PHOTOS", "PHOTO", "IMAGE", "VIDEOS", "VIDEO"].includes(fieldType);

/** Single progress scale: photos 1�80%, save report 80�100% (same modal, no page jump). */
const SUBMIT_PROGRESS_MEDIA_MAX = 80;
const SUBMIT_PROGRESS_SAVE_START = 80;
const SUBMIT_PROGRESS_SAVE_CAP = 97;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TemplateImageUpload = forwardRef<
  UploadImageMultilHandle,
  { value?: string; onChange?: (v: string | undefined) => void; multiple?: boolean }
>(({ value, onChange, multiple = true }, ref) => {
  const files = useMemo(() => parseMediaListValue(value), [value]);
  return (
    <UploadImageMultil
      ref={ref}
      deferUpload
      multiple={multiple}
      isImage={true}
      title=""
      files={files}
      onChange={(urls: string[]) => {
        const clean = (urls ?? []).filter(Boolean);
        onChange?.(clean.length ? JSON.stringify(clean) : undefined);
      }}
    />
  );
});

const TemplateVideoUpload = forwardRef<
  UploadImageMultilHandle,
  { value?: string; onChange?: (v: string | undefined) => void }
>(({ value, onChange }, ref) => {
  const files = useMemo(() => parseMediaListValue(value), [value]);
  return (
    <UploadImageMultil
      ref={ref}
      deferUpload
      multiple={false}
      isImage={false}
      title=""
      files={files}
      onChange={(urls: string[]) => {
        const clean = (urls ?? []).filter(Boolean);
        onChange?.(clean.length ? JSON.stringify(clean) : undefined);
      }}
    />
  );
});

const TemplateFileUpload: React.FC<{ value?: string; onChange?: (v: string | undefined) => void }> = ({ value, onChange }) => {
  const [uploadBar, setUploadBar] = useState<{ show: boolean; percent: number }>({ show: false, percent: 0 });
  const [fileList, setFileList] = useState<UploadFile[]>(() => {
    if (!value || !String(value).trim()) return [];
    const name = String(value).split("/").pop() || "file";
    return [{ uid: "template-file", name, status: "done", url: value }];
  });
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (uploadingRef.current) return;
    if (!value || !String(value).trim()) {
      setFileList([]);
      return;
    }
    const name = String(value).split("/").pop() || "file";
    setFileList([{ uid: "template-file", name, status: "done", url: value }]);
  }, [value]);

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    const raw = (file as any)?.originFileObj ?? file;
    if (!(raw instanceof Blob)) {
      message.error("Invalid file");
      onError?.(new Error("Invalid file"));
      return;
    }
    const uid = file.uid || "template-file-upload";
    const fileSize = raw.size || 0;
    uploadingRef.current = true;
    setFileList([
      {
        uid,
        name: (raw as File).name || "upload",
        status: "uploading",
      },
    ]);
    try {
      const formData = new FormData();
      formData.append("file", raw, (raw as File).name || "upload");
      const response: any = await callAPIUploadAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        "POST",
        formData,
        {
          uploadFileSize: fileSize,
          onUploadProgress: (pct: number) => {
            if (pct < 1) return;
            const clamped = Math.min(100, Math.max(1, Math.round(pct)));
            setUploadBar({ show: true, percent: clamped });
            onProgress?.({ percent: clamped });
            setFileList((prev) =>
              prev.map((row) =>
                row.uid === uid ? { ...row, status: "uploading", percent: clamped } : row,
              ),
            );
          },
        }
      );
      if (response?.code === 1 && response.data) {
        const url = String(response.data);
        onChange?.(url);
        setFileList([{ uid: "template-file", name: url.split("/").pop() || "file", status: "done", url, percent: 100 }]);
        onSuccess?.(response.data, file);
      } else {
        message.error(response?.message || "Upload failed");
        onError?.(new Error(response?.message || "Upload failed"));
      }
    } catch {
      message.error("Upload failed");
      onError?.(new Error("Upload failed"));
    } finally {
      uploadingRef.current = false;
      setUploadBar({ show: false, percent: 0 });
    }
  };

  return (
    <div>
      {uploadBar.show ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Typography.Text strong style={{ color: "#135200" }}>Uploading�</Typography.Text>
            <Typography.Text strong style={{ color: "#135200" }}>{uploadBar.percent}%</Typography.Text>
          </div>
          <Progress
            percent={uploadBar.percent}
            status={uploadBar.percent >= 100 ? "success" : "active"}
            showInfo={false}
            strokeColor="#397d36"
            strokeWidth={10}
          />
        </div>
      ) : null}
      <Upload
        maxCount={1}
        fileList={fileList}
        customRequest={customRequest}
        onRemove={() => {
          onChange?.(undefined);
          setFileList([]);
        }}
        disabled={uploadBar.show}
        showUploadList={{ showRemoveIcon: true }}
      >
        <Button type="default" icon={<UploadOutlined />} loading={uploadBar.show} size="large" style={{ borderRadius: 8 }}>
          Choose file
        </Button>
      </Upload>
    </div>
  );
};

const getTemplateLabel = (it: TemplateItem) => {
  const raw = String(it?.config?.label || (it as any)?.label || it?.name || "").trim();
  return fixTextEncoding(raw);
};

const isTimeLikeTemplateItem = (it: TemplateItem): boolean => {
  // Some templates have "Time", "Time " or "Time (optional)" as label/name.
  const raw = String(getTemplateLabel(it) || it?.name || "");
  const normalized = raw
    // Strip icons / punctuation / zero-width chars etc.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("time and date")) return false;
  return /\btime\b/.test(normalized);
};

const isTimeLikeLabel = (label: unknown): boolean => {
  const raw = String(label ?? "");
  const normalized = raw
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("time and date")) return false;
  return /\btime\b/.test(normalized);
};

const legacyFieldKey = (r: any, idx: number) =>
  `_legacy_${r?.id != null && Number.isFinite(+r.id) ? +r.id : r?.order != null && Number.isFinite(+r.order) ? +r.order : idx}`;

function matchReportItemForTemplate(
  reports: any[],
  it: TemplateItem,
  idx: number,
): any | undefined {
  if (!Array.isArray(reports) || !reports.length) return undefined;
  const sorted = [...reports].sort((a, b) => (+a.order || 0) - (+b.order || 0));
  const label = getTemplateLabel(it);
  const typeMatch = (rep: any) =>
    String(rep.type || "").toUpperCase() === String(it.type || "").toUpperCase();
  // Prefer name+type match. Index-based mapping breaks when older rows have chunked media parts.
  return (
    sorted.find((rep) => rep.name === it.name && typeMatch(rep)) ??
    (label ? sorted.find((rep) => rep.name === label && typeMatch(rep)) : undefined) ??
    (sorted[idx] && typeMatch(sorted[idx]) ? sorted[idx] : undefined)
  );
}

function parseReportItemValueForForm(r: any): any {
  if (!r) return undefined;
  const rt = String(r.type || "").toUpperCase();
  const isTimeLabel = isTimeLikeLabel(r?.name);
  if (rt === "TIME") {
    const v = String(r.value ?? "").trim();
    // Corrupt legacy values: TIME field sometimes stored photo JSON/URLs.
    if (!v || v.startsWith("[") || /^https?:\/\//i.test(v)) return undefined;
    return moment(moment().format(`YYYY-MM-DD ${v}`));
  }
  if (rt === "DATE" || rt === "DATE_PICKER") {
    return r.value ? moment(r.value) : undefined;
  }
  if (rt === "[REPORT_DATE]") {
    return r.value ? moment(r.value, "YYYY-MM-DD") : undefined;
  }
  if (rt === "[REPORT_TIME]") {
    const v = String(r.value ?? "").trim();
    if (!v || v.startsWith("[") || /^https?:\/\//i.test(v)) return undefined;
    return moment(moment().format(`YYYY-MM-DD ${v}`));
  }
  if ((rt === "TEXT" || rt === "DATETIME") && isTimeLabel) {
    const s = String(r.value ?? "").trim();
    if (!s || s.startsWith("[") || /^https?:\/\//i.test(s)) return undefined;
    const strict = moment(s, ["HH:mm:ss", "HH:mm", "h:mm:ss a", "h:mm a"], true);
    if (strict.isValid()) return strict;
    const loose = moment(new Date(s));
    return loose.isValid() ? loose : undefined;
  }
  return r.value;
}

/** Admin preset on YES_NO template fields (stored in item.value / config.defaultValue). */
const getYesNoPreset = (item: TemplateItem): "YES" | "NO" | undefined => {
  const raw = String(item.value ?? item.config?.defaultValue ?? "")
    .trim()
    .toUpperCase();
  if (raw === "YES" || raw === "NO") return raw;
  return undefined;
};

function templateServiceIds(tpl: any): number[] {
  const raw = tpl?.serviceIds;
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => +v).filter((n) => Number.isFinite(n) && n > 0);
}

/** Whether a template may be used at a site given that site's Service ids. */
function templateMatchesSiteServices(tpl: any, siteDeptIds: number[]): boolean {
  if (!siteDeptIds.length) return false;
  const tplIds = templateServiceIds(tpl);
  if (!tplIds.length) return true;
  return tplIds.some((id) => siteDeptIds.includes(id));
}

function serviceCandidatesForTemplateAtSite(
  tpl: any,
  siteServices: { id: number | string }[],
): number[] {
  const siteDeptIds = siteServices
    .map((d) => +d.id)
    .filter((n) => Number.isFinite(n) && n > 0);
  const tplIds = templateServiceIds(tpl);
  if (!tplIds.length) return siteDeptIds;
  return tplIds.filter((id) => siteDeptIds.includes(id));
}

const getOptions = (item: TemplateItem): string[] => {
  const configOptions = Array.isArray(item?.config?.options) ? item.config?.options : [];
  if (configOptions.length) return configOptions;
  const t = String(item.type || "").toUpperCase();
  if (typeof item.value === "string" && (t === "SELECT" || t === "CHECKLIST")) {
    return item.value.split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
};

type ListQueryFilters = {
  startDate?: string;
  endDate?: string;
  siteId?: number;
  serviceId?: string;
  keyword?: string;
};

type ReportListTab = "active" | "deleted";

/** PDF URLs from the API are usually absolute; older rows may store `public/pdf/...` only � resolve against the API origin so links work from the admin SPA. */
function resolveReportPdfHref(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(urlConfig.orderApiURL || "").replace(/\/+$/, "");
  const path = s.replace(/^\/+/, "");
  return path ? `${base}/${path}` : "";
}

function getUserTaskPdfField(row: any): string {
  const v = row?.pdfFile ?? row?.pdf_file;
  return typeof v === "string" ? v.trim() : "";
}

/** Prefer task name; then template name; then PDF filename from URL � avoids a generic label when `taskName` is blank. */
function reportPdfLinkLabel(row: any, href: string): string {
  const taskName = String(row?.taskName || "").trim();
  if (taskName) return taskName;
  const tpl = String(row?.reportTemplate?.name || "").trim();
  if (tpl) return tpl;
  try {
    const pathOnly = href.split(/[?#]/)[0];
    const last = pathOnly.split("/").filter(Boolean).pop() || "";
    const base = decodeURIComponent(last.replace(/\.pdf$/i, ""));
    if (base) return base.replace(/-/g, " ");
  } catch {
    /* ignore */
  }
  return "PDF";
}

/** Admin uploads embed epoch ms in filenames; use when check_in predates actual submit. */
function inferSubmissionFromReportMedia(row: any): moment.Moment | null {
  const reports = row?.reports;
  if (!Array.isArray(reports)) return null;
  let maxTs = 0;
  for (const r of reports) {
    const val = String(r?.value ?? "");
    const re = /\/(\d{13})(?:-|\.)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(val)) !== null) {
      const ts = Number(match[1]);
      if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
    }
  }
  if (maxTs <= 0) return null;
  const m = moment(maxTs);
  return m.isValid() ? m : null;
}

/** When the report was submitted — align with PDF reference time, not PDF regen / bad check_in. */
function getReportSubmittedAt(row: any): string | Date | null | undefined {
  const checkIn = row?.checkIn ?? row?.check_in ?? null;
  const createdAt = row?.createdAt ?? row?.created_at ?? null;
  const media = inferSubmissionFromReportMedia(row);

  let ref: string | Date | null = createdAt ?? checkIn;

  if (checkIn && createdAt) {
    const ci = moment(checkIn);
    const ca = moment(createdAt);
    if (ci.isValid() && ca.isValid()) {
      const forwardSkewMin = ci.diff(ca, "minutes");
      // check_in stored as AU wall clock tagged Z (~+10h ahead of real created_at).
      if (forwardSkewMin >= 540 && forwardSkewMin <= 660) ref = createdAt;
    }
  }

  if (media && ref) {
    const refM = moment(ref);
    if (refM.isValid()) {
      const aheadMin = media.diff(refM, "minutes");
      const behindMin = refM.diff(media, "minutes");
      if (aheadMin > 30 || behindMin > 30) ref = media.toDate();
    }
  } else if (media && !ref) {
    ref = media.toDate();
  }

  return ref;
}

function resolveReportSubmittedDisplayMoment(row: any): moment.Moment | null {
  const t = getReportSubmittedAt(row);
  if (!t) return null;
  const checkIn = row?.checkIn ?? row?.check_in ?? null;
  const createdAt = row?.createdAt ?? row?.created_at ?? null;
  const wallClockStorage =
    checkIn &&
    createdAt &&
    Math.abs(moment(checkIn).diff(moment(createdAt), "minutes")) <= 2;
  const m = wallClockStorage
    ? moment(t).utcOffset(AU_UTC_OFFSET, true)
    : momentAu(t);
  return m && m.isValid() ? m : null;
}

function formatReportSubmittedAt(row: any): string {
  const m = resolveReportSubmittedDisplayMoment(row);
  return m ? m.format(dateTimeFormat) : "—";
}

/** e.g. "26 May 2026" — view modal and PDF body dates. */
const REPORT_DISPLAY_DATE = "D MMM YYYY";
const REPORT_LIST_SEP = " · ";

function formatReportViewDate(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (moment(s, "YYYY-MM-DD", true).isValid()) {
    return moment(s, "YYYY-MM-DD", true).format(REPORT_DISPLAY_DATE);
  }
  const m = moment(s);
  return m.isValid() ? m.format(REPORT_DISPLAY_DATE) : s;
}

function formatReportViewTime(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "Invalid date") return "";
  const strict = moment(s, ["HH:mm:ss", "HH:mm"], true);
  if (strict.isValid()) return strict.format("HH:mm");
  const m = moment(s);
  return m.isValid() ? m.format("HH:mm") : s;
}

const AUTO_TASK_NAME_SUFFIX = / - \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}$/;
const AUTO_TASK_NAME_PREFIX = /^New Report - \d{4}-\d{2}-\d{2}/;

function isAutoGeneratedTaskName(name: string): boolean {
  const s = String(name || "").trim();
  if (!s) return false;
  return AUTO_TASK_NAME_PREFIX.test(s) || AUTO_TASK_NAME_SUFFIX.test(s);
}

/** e.g. "Bayside Public Amenities Cleaning Report" */
function buildReportDisplayTitle(row: {
  siteName?: string;
  serviceName?: string;
  taskName?: string;
  reportTemplate?: { name?: string };
}): string {
  const site = String(row.siteName || "").trim();
  const service = String(row.serviceName || "").trim();
  const tpl = String(row.reportTemplate?.name || "").trim();

  if (site && service) {
    let suffix = service;
    const siteLower = site.toLowerCase();
    const svcLower = service.toLowerCase();
    if (siteLower.endsWith("public amenities") && svcLower.startsWith("public amenities ")) {
      suffix = service.slice("Public Amenities ".length).trim() || service;
    } else if (svcLower.startsWith(`${siteLower} `)) {
      suffix = service.slice(site.length).trim() || service;
    }
    const base = `${site} ${suffix}`.replace(/\s+/g, " ").trim();
    return / report$/i.test(base) ? base : `${base} Report`;
  }
  if (site && tpl) {
    const base = `${site} ${tpl}`.replace(/\s+/g, " ").trim();
    return / report$/i.test(base) ? base : `${base} Report`;
  }
  if (site) {
    return / report$/i.test(site) ? site : `${site} Report`;
  }

  const taskName = String(row.taskName || "").trim();
  if (taskName && !isAutoGeneratedTaskName(taskName)) {
    return taskName.replace(AUTO_TASK_NAME_SUFFIX, "").trim();
  }
  if (tpl) return tpl;
  return "Report";
}

/** Mobile card title: "Bayside Public Amenities Cleaning Report 25 May 18:25" */
function formatMobileReportCardTitle(row: any): string {
  const base = buildReportDisplayTitle(row);
  const m = resolveReportSubmittedDisplayMoment(row);
  if (!m) return base;
  return `${base} ${m.format("D MMM")} ${m.format("HH:mm")}`;
}

/** List/view: staff name for field submissions; "Admin" when submitted via admin portal. */
function formatSubmittedByRow(row: any): string {
  const staffName = String(row?.staff?.fullName || row?.staff?.username || "").trim();
  const creatorType = row?.createdUser?.type != null ? +row.createdUser.type : 0;
  const createdBy = row?.createdBy != null ? +row.createdBy : 0;
  const staffId = row?.staffId != null ? +row.staffId : 0;

  if (creatorType === userType.ADMIN || (createdBy > 0 && staffId > 0 && createdBy !== staffId)) {
    return "Admin";
  }
  return staffName || "�";
}

/** Customer / company label for admin list (denormalized fields + joined user). */
function formatCustomerDisplayName(row: any): string {
  const company =
    String(row?.companyName || row?.customer?.customerInfo?.companyName || "").trim();
  const person = String(
    row?.customer?.fullName || row?.customerName || row?.customer?.username || "",
  ).trim();
  if (company) return company;
  if (person) return person;
  return "�";
}

const staffPrimaryGreen = { background: "#389e0d", borderColor: "#389e0d" };
/** Submitted Reports modal � reference UI */
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

/** Mobile card list � $dark sets explicit colors (no CSS-variable fallbacks to white). */
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
        aria-label="Read � click to mark unread"
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
  const sorted = [...(reports || [])]
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
      <Space direction="vertical" size={4}>
        {urls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer">
            {(u.split("/").pop() || u).slice(0, 80)}
          </a>
        ))}
      </Space>
    );
  }
  if (t === "DATE" || t === "DATE_PICKER" || t === "[REPORT_DATE]") {
    return formatReportViewDate(v);
  }
  if (t === "TIME" || t === "[REPORT_TIME]") {
    return formatReportViewTime(v);
  }
  if (t === "DATETIME") {
    const m = moment(String(v));
    return m.isValid() ? m.format(`${REPORT_DISPLAY_DATE} HH:mm`) : String(v);
  }
  return String(v);
}

const NewReports: React.FC = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const refreshDashboard = useCallback(() => {
    dispatch(dashboardActions.getData({ startDate: "", endDate: "" }));
  }, [dispatch]);
  const location = useLocation();
  const history = useHistory();
  const [init, setInit] = useState<InitData>({});
  /** Table/list fetch only � not report submit (progress uses progressOpen). */
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
  const listSearchDebounceRef = useRef(null);

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
      const markPath =
        +profileType === userType.ADMIN
          ? `${endPoint.USER_TASKS}/markAdminUnread/${id}`
          : +profileType === userType.CUSTOMER
            ? `${endPoint.USER_TASKS}/markCustomerUnread/${id}`
            : null;
      if (!markPath) return;
      setMarkingUnreadId(+id);
      try {
        const res = await callAPIAsync(serviceType.COMMON, markPath, "PATCH", {});
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

      const markPath =
        +profileType === userType.ADMIN
          ? `${endPoint.USER_TASKS}/markAdminOpened/${id}`
          : +profileType === userType.CUSTOMER
            ? `${endPoint.USER_TASKS}/markCustomerOpened/${id}`
            : +profileType === userType.STAFF
              ? `${endPoint.USER_TASKS}/markStaffOpened/${id}`
              : null;
      if (!markPath) return false;

      markReportOpenedInFlightRef.current.add(id);
      if (
        +profileType === userType.ADMIN ||
        +profileType === userType.CUSTOMER ||
        +profileType === userType.STAFF
      ) {
        patchRowReadState(id);
      }
      try {
        const res = await callAPIAsync(serviceType.COMMON, markPath, "PATCH", {});
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

  const reportTemplates = useMemo(() => init.reportTemplates || [], [init.reportTemplates]);

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
      const params: Record<string, unknown> = {
        type: "CUSTOM",
        status: "deleted",
      };
      if (+profileType === userType.STAFF) params.staffId = +profileId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.siteId) params.siteId = filters.siteId;
      if (filters.serviceId) params.serviceId = filters.serviceId;
      if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/getCountUserTasksByUserId`,
        "GET",
        params,
      );
      if (res?.code === 1) {
        const n = typeof res.data === "number" ? res.data : +(res?.data?.count ?? 0);
        setDeletedReportCount(Number.isFinite(n) ? n : 0);
      }
    } catch {
      /* ignore */
    }
  }, [showReportDeletedTabs, profileId, profileType, listFilters]);

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
        let params: Record<string, any>;

        if (reportIdFromUrl) {
          params = {
            type: "CUSTOM",
            reportId: +reportIdFromUrl,
            page: 1,
            limit: 1,
          };
        } else {
          params = {
            type: "CUSTOM",
            status: tab === "deleted" ? "deleted" : "s",
            page: nextPage,
            limit: nextLimit,
          };
          if (sort.orderBy) {
            params.orderBy = sort.orderBy;
            params.orderValue = sort.orderValue;
          }
          if (profileId && +profileType === userType.STAFF) params.staffId = +profileId;
          if (filters.startDate) params.startDate = filters.startDate;
          if (filters.endDate) params.endDate = filters.endDate;
          if (filters.siteId) params.siteId = filters.siteId;
          if (filters.serviceId) params.serviceId = filters.serviceId;
          if (filters.keyword?.trim()) params.keyword = filters.keyword.trim();
        }

        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/getAllUserTasksByUserId`, "GET", params);
        let list = res?.code === 1 ? res?.data?.rows || [] : [];

        if (reportIdFromUrl && list.length === 0) {
          const one = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.USER_TASKS}/${reportIdFromUrl}`,
            "GET",
          );
          if (one?.code === 1 && one?.data) list = [one.data];
        }

        setRows(list);
        setCount(reportIdFromUrl ? list.length : res?.data?.count || 0);
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
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/markAllNewReportsOpened`,
        "PATCH",
        {},
      );
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
    // readStatus: two-state only (unread first ? read first), no �clear sort�
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
    const v = await listForm.validateFields();
    const next: ListQueryFilters = {};
    if (v.dateRange?.[0] && v.dateRange[1]) {
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
    let changed = false;
    setListFilters((prev) => {
      const prevKw = (prev.keyword || "").trim();
      if (kw === prevKw) return prev;
      changed = true;
      const next = { ...prev };
      if (kw) next.keyword = kw;
      else delete next.keyword;
      return next;
    });
    if (changed) setPage(1);
  };

  const onListSearchInputChange = (raw: string) => {
    tableSearchKeywordRef.current = raw;
    if (listSearchDebounceRef.current) clearTimeout(listSearchDebounceRef.current);
    listSearchDebounceRef.current = setTimeout(() => applyKeywordFilter(raw), 400);
  };

  const onListSearchInputSearch = (raw: string) => {
    if (listSearchDebounceRef.current) {
      clearTimeout(listSearchDebounceRef.current);
      listSearchDebounceRef.current = null;
    }
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
    setViewRow(row);
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
    return fromTpl || viewRow.reportTemplate?.name || viewRow.taskName || "Report";
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
    () => (viewRow ? resolveReportPdfHref(getUserTaskPdfField(viewRow)) : ""),
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
    Modal.confirm({
      title: isAdmin ? "Delete this report?" : "Remove this report from your list?",
      content: isAdmin
        ? "This permanently removes the report and its submitted data."
        : "The report moves to Deleted. You can restore it from the Deleted tab.",
      okText: isAdmin ? "Delete" : "Remove",
      okType: "danger",
      onOk: async () => {
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.USER_TASKS}/${viewRow.id}`,
          "DELETE",
          null,
        );
        if (res?.code === 1) {
          message.success(
            isAdmin ? "Report deleted" : "Report moved to Deleted",
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
  const filteredReportTemplates = useMemo(() => {
    const staffStyleCreate = isStaffUser || (isAdminUser && !editing?.id);
    if (!staffStyleCreate || !watchedSiteId) return reportTemplates;
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
    if (t === "DATE" || t === "DATE_PICKER" || t === "TIME" || t === "[REPORT_DATE]" || t === "[REPORT_TIME]") {
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

  const ensureAutoTaskName = useCallback(() => {
    const current = form.getFieldValue("taskName");
    if (current && String(current).trim()) return;
    const tplName = selectedTemplateName || "New Report";
    // Task name must be unique (DB constraint). Include time to avoid collisions.
    const auto = `${tplName} - ${moment().format("YYYY-MM-DD HH-mm-ss")}`;
    form.setFieldsValue({ taskName: auto });
  }, [form, selectedTemplateName]);

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
        } else if (fieldType === "DATE" || fieldType === "DATE_PICKER" || fieldType === "TIME") {
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
    [form, editing, profile, isStaffUser, isHiddenFromStaffCreate],
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
    form.setFieldsValue({
      notifiesStaff: 1,
      staffId: isStaffUser && profile?.id ? +profile.id : 0,
    });
    ensureAutoTaskName();
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
  ): Promise<boolean> => {
    const params: Record<string, number> = { siteId };
    if (serviceId != null && Number.isFinite(+serviceId) && +serviceId > 0) {
      params.serviceId = +serviceId;
    }
    const formStaffId = form.getFieldValue("staffId");
    if (isAdminUser && formStaffId != null && formStaffId !== "" && +formStaffId > 0) {
      params.staffId = +formStaffId;
    }
    const assignRes = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.JOB_SITES}/getStaffReportAssignmentBySite`,
      "GET",
      params,
    );
    const a = assignRes?.data;
    if (!a?.customerId) {
      message.warning(
        isAdminUser
          ? "No customer or Service is linked to this job site assignment."
          : "No customer is linked to your assignment for this job site.",
      );
      form.setFieldsValue({
        serviceId: undefined,
        serviceName: "",
        customerId: undefined,
        customerName: "",
        companyName: "",
        staffId: isStaffUser && profile?.id ? +profile.id : undefined,
      });
      return false;
    }
    const patch: Record<string, unknown> = {
      serviceId: String(a.serviceId),
      serviceName: a.serviceName || "",
      customerId: +a.customerId,
      customerName: a.customerName || "",
      companyName: a.companyName || "",
    };
    if (a.staffId != null && +a.staffId > 0) {
      patch.staffId = +a.staffId;
    } else if (isStaffUser && profile?.id) {
      patch.staffId = +profile.id;
    }
    form.setFieldsValue(patch);
    return true;
  }, [form, isAdminUser, isStaffUser, profile]);

  const openEdit = useCallback(async (row: any) => {
    resetSubmitUi();
    await markReportOpenedForViewer(row);

    let editRow = row;
    try {
      const one = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/${row.id}`,
        "GET",
      );
      if (one?.code === 1 && one?.data) editRow = one.data;
    } catch {
      /* list row fallback */
    }

    setEditing(editRow);
    form.resetFields();
    const reportValues: Record<string, any> = {};
    const editTpl = reportTemplates.find((t: any) => +t.id === +editRow.reportTemplateId);
    if (editTpl?.items?.length && Array.isArray(editRow.reports)) {
      const sortedTpl = editTpl.items
        .slice()
        .filter((it: TemplateItem) => !isJunkTemplateField(it))
        .sort((a: TemplateItem, b: TemplateItem) => (+a.order || 0) - (+b.order || 0));
      sortedTpl.forEach((it: TemplateItem, idx: number) => {
        const fieldKey = getTemplateFieldKey(it, idx);
        const rep = matchReportItemForTemplate(editRow.reports, it, idx);
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
        if (parsed !== undefined) reportValues[fieldKey] = parsed;
      });
    } else if (Array.isArray(editRow.reports)) {
      editRow.reports
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
      taskName: editRow.taskName,
      description: editRow.description,
      siteId: editRow.siteId,
      siteName: editRow.siteName,
      siteLocation: editRow.siteLocation,
      siteAddress: editRow.siteAddress,
      staffId: editRow.staffId ?? (profile?.id ? +profile.id : 0),
      serviceId: editRow.serviceId != null ? String(editRow.serviceId) : undefined,
      serviceName: editRow.serviceName,
      customerId: editRow.customerId != null ? +editRow.customerId : undefined,
      customerName: editRow.customerName,
      companyName: editRow.companyName,
      reportTemplateId: editRow.reportTemplateId,
      notifiesStaff: editRow.notifiesStaff ?? 1,
    });

    if (isStaffUser && editRow.siteId && (editRow.customerId == null || editRow.customerId === "")) {
      await applyStaffSiteAssignment(+editRow.siteId);
    }

    setVisible(true);
  }, [
    resetSubmitUi,
    markReportOpenedForViewer,
    reportTemplates,
    form,
    isStaffUser,
    applyStaffSiteAssignment,
    profile,
  ]);

  const onPickSite = async (siteId?: number) => {
    if (siteId == null) {
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
        reportTemplateId: undefined,
      });
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
        if (deptRows.length === 1) {
          form.setFieldsValue({
            serviceId: String(deptRows[0].id),
            serviceName: deptRows[0].name || "",
          });
          await applyStaffSiteAssignment(siteId, +deptRows[0].id);
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
        message.warning("This template is not linked to a Service at this job site.");
        form.setFieldsValue({
          serviceId: undefined,
          serviceName: "",
          customerId: undefined,
          customerName: "",
          companyName: "",
        });
        return false;
      }
      for (const deptId of candidates) {
        const ok = await applyStaffSiteAssignment(siteId, deptId);
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
    [services, applyStaffSiteAssignment, form, refreshAutoMergeTemplateFields],
  );

  const onPickService = async (serviceId: string) => {
    const d = services.find((x: any) => String(x.id) === String(serviceId));
    form.setFieldsValue({
      reportTemplateId: undefined,
      ...(d
        ? { serviceName: d.name || d.serviceName || "" }
        : { serviceName: "" }),
    });

    const siteId = form.getFieldValue("siteId");
    if (!siteId) return;

    // Staff-style create: choosing a Service determines the site assignment row (customer + dept).
    if (useStaffStyleCreate) {
      const ok = await applyStaffSiteAssignment(+siteId, +serviceId);
      if (!ok) {
        // Keep the existing warning message from applyStaffSiteAssignment.
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
    form.setFieldsValue({
      customerName: c.fullName || c.customerName || "",
      companyName: c.companyName || c.customerInfo?.companyName || "",
    });
    refreshAutoMergeTemplateFields();
  };

  const uploadPendingMediaFields = async (): Promise<boolean> => {
    const mediaFields = templateItemsForSubmit
      .map((it, idx) => ({ it, idx, fieldKey: getTemplateFieldKey(it, idx) }))
      .filter(({ it }) => isJsonMediaFieldType(String(it.type || "").toUpperCase()));
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

        if ((raw === undefined || raw === null || raw === "") && editing?.reports) {
          raw = parseReportItemValueForForm(
            matchReportItemForTemplate(editing.reports, it, idx),
          );
        }

        if (isAutoMergeTemplateField(it)) {
          if (!autoMergeUsesPicker(it, isStaffUser)) {
            raw = raw ?? resolveAutoMergeFieldValue(it, values, profile);
          }
        }

        if (raw === undefined || raw === null || raw === "") return null;

        let value: any = raw;
        if (fieldType === "TIME" && moment.isMoment(raw)) value = raw.format("HH:mm:ss");
        if (isTimeLikeTemplateItem(it) && moment.isMoment(raw)) {
          value = raw.format("HH:mm:ss");
        }
        if ((fieldType === "DATE" || fieldType === "DATE_PICKER") && moment.isMoment(raw)) {
          value = raw.format("YYYY-MM-DD");
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
        if (!values.siteId) {
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
    if (isAdminUser && !editing) {
      const submitStaffId = values.staffId != null && values.staffId !== "" ? +values.staffId : 0;
      if (!Number.isFinite(submitStaffId) || submitStaffId <= 0) {
        message.error("This job site has no staff assignment. Choose another site or update the site setup.");
        return;
      }
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

    values = form.getFieldsValue();

    // Auto-fill hidden DATE/TIME items for staff at submit time (create) or restore on edit.
    if (isStaffUser && templateItemsForSubmit.length) {
      const patch: Record<string, moment.Moment> = {};
      templateItemsForSubmit.forEach((it, idx) => {
        if (!isHiddenFromStaffCreate(it)) return;
        const t = String(it?.type || "").toUpperCase();
        if (t !== "DATE" && t !== "DATE_PICKER" && t !== "TIME" && t !== "[REPORT_DATE]" && t !== "[REPORT_TIME]") return;
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

    const now = new Date();
    const startTime = editing?.startTime ? new Date(editing.startTime) : now;
    const endTime = editing?.endTime ? new Date(editing.endTime) : now;
    const checkIn = editing?.checkIn ? new Date(editing.checkIn) : now;
    const completed = editing?.checkOut ? new Date(editing.checkOut) : now;

    const payload = {
      taskName: values.taskName,
      description: values.description || "",
      siteId: +values.siteId,
      siteName: values.siteName || "",
      siteLocation: values.siteLocation || "",
      siteAddress: values.siteAddress || "",
      staffId: values.staffId ? +values.staffId : profile?.id ? +profile.id : 0,
      serviceId: values.serviceId || "",
      serviceName: values.serviceName || "",
      customerName: values.customerName || "",
      companyName: values.companyName || "",
      customerId: customerIdNum,
      startTime,
      endTime,
      checkIn,
      completed,
      status: 1,
      reportTemplateId: +values.reportTemplateId,
      notifiesStaff: +values.notifiesStaff || 1,
      items,
    };

    startSaveProgressTicker();
    try {
      let res: any;
      if (editing?.id) {
        res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/updateCustomerReports/${editing.id}`, "PUT", payload);
      } else {
        res = await callAPIAsync(serviceType.COMMON, `${endPoint.USER_TASKS}/createCustomerReports`, "POST", payload);
      }
      clearSaveProgressTimer();
      if (res?.code !== 1) {
        const pg = res?.details?.pg;
        const pgDetail = String(pg?.detail || res?.message || "");
        if (pgDetail.includes("uq_user_task_reports_task_name")) {
          message.error(
            "This template has duplicate field names (e.g. two items named the same). Rename duplicate items in Report Templates (Items step) and try again.",
          );
        } else {
          const detailMsg = [res?.message, pg?.detail, pg?.column && `column=${pg.column}`, pg?.table && `table=${pg.table}`]
            .filter(Boolean)
            .join(" � ");
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
    (row: any) => {
      if (!profileIdNum || !row?.id) return false;
      if (profileTypeNum === userType.ADMIN) return true;
      if (profileTypeNum === userType.CUSTOMER) {
        return (
          row?.type === "CUSTOM" &&
          (+row.customerId === profileIdNum || +row.createdBy === profileIdNum)
        );
      }
      if (profileTypeNum === userType.STAFF) {
        return (
          row.type === "CUSTOM" &&
          +row.staffId === profileIdNum &&
          +row.createdBy === profileIdNum
        );
      }
      return false;
    },
    [profileIdNum, profileTypeNum],
  );

  const deleteReport = useCallback(
    async (row: any) => {
      const isAdmin = +profileType === userType.ADMIN;
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/${row.id}`,
        "DELETE",
        null,
      );
      if (res?.code === 1) {
        message.success(isAdmin ? "Report deleted" : "Report moved to Deleted");
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        await loadRows(page, limit, listFilters);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not delete this report");
      }
    },
    [loadRows, page, limit, listFilters, profileType, refreshDashboard],
  );

  const restoreReport = useCallback(
    async (row: any) => {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/${row.id}/restore`,
        "PATCH",
        {},
      );
      if (res?.code === 1) {
        message.success("Report restored");
        setSelectedRowKeys((prev) => prev.filter((k) => k !== row.id));
        if (viewRow?.id === row.id) {
          setViewOpen(false);
          setViewRow(null);
        }
        await loadRows(page, limit, listFilters, listSort, reportListTab);
        refreshDashboard();
      } else {
        message.error(res?.message || "Could not restore this report");
      }
    },
    [loadRows, page, limit, listFilters, listSort, reportListTab, viewRow, refreshDashboard],
  );

  const canUseBulkDelete =
    !isDeletedReportTab &&
    (+profileType === userType.ADMIN ||
      +profileType === userType.CUSTOMER ||
      +profileType === userType.STAFF);

  const deletableRowsOnPage = useMemo(
    () => rows.filter((r) => canSoftDeleteReport(r)),
    [rows, canSoftDeleteReport],
  );

  const reportSelectOptions = useMemo(
    () =>
      deletableRowsOnPage.map((r) => ({
        value: r.id,
        label: `${r.taskName || "Report"} � ${r.siteName || "�"} (#${r.id})`,
      })),
    [deletableRowsOnPage],
  );

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
        const res = await callAPIAsync(
          serviceType.COMMON,
          `${endPoint.USER_TASKS}/${id}`,
          "DELETE",
          null,
        );
        if (res?.code === 1) succeeded += 1;
        else failed += 1;
      }
      setSelectedRowKeys([]);
      await loadRows(page, limit, listFilters);
      refreshDashboard();
      if (succeeded && !failed) {
        message.success(
          isAdmin
            ? `${succeeded} report${succeeded === 1 ? "" : "s"} deleted`
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
      const res: any = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.USER_TASKS}/clear-deleted`,
        "PATCH",
        { ids: visibleIds },
      );
      if (res?.code === 1) {
        const clearedCount = +res?.data?.clearedCount || 0;
        const shownCount = visibleIds.length;
        const safeCount = Math.max(0, Math.min(clearedCount, shownCount));
        message.success(
          safeCount
            ? `Cleared ${safeCount} deleted report${safeCount === 1 ? "" : "s"}`
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
  }, [loadRows, page, limit, listFilters, listSort, reportListTab, refreshDashboard, rows]);

  const rowSelection = canUseBulkDelete
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
        getCheckboxProps: (record: any) => ({
          disabled: !canSoftDeleteReport(record),
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
      { value: "serviceName:ASC", label: "Service (A–Z)" },
      { value: "serviceName:DESC", label: "Service (Z–A)" },
    ];
    if (+profileType === userType.ADMIN) {
      opts.splice(2, 0,
        { value: "staffFullName:ASC", label: "Submitted by (A–Z)" },
        { value: "staffFullName:DESC", label: "Submitted by (Z–A)" },
      );
    }
    if (+profileType === userType.ADMIN || +profileType === userType.CUSTOMER) {
      opts.push(
        { value: "readStatus:ASC", label: "Status (unread first)" },
        { value: "readStatus:DESC", label: "Status (read first)" },
      );
    }
    return opts;
  }, [profileType]);
  const onMobileSortChange = useCallback((value: string) => {
    const [orderBy, orderValue] = value.split(":");
    if (!orderBy || !orderValue) return;
    setPage(1);
    setListSort({ orderBy, orderValue });
  }, []);
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
      <Space size={4} wrap>
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
          <Link to={`/messages?userTaskId=${r.id}`} title="Message about this report">
            <Button type="link" size="small" icon={<MailOutlined />} aria-label="Message about this report" />
          </Link>
        ) : null}
        {+profileType === userType.ADMIN ? (
          <Popconfirm
            overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
            title={
              <span>
                Delete this report?
                <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                  This permanently removes the report and its submitted data.
                </div>
              </span>
            }
            okText="Delete"
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
        {isDeletedReportTab && canSoftDeleteReport(r) ? (
          <Popconfirm
            overlayStyle={{ zIndex: POPCONFIRM_ABOVE_TOOLTIP_Z }}
            title="Restore this report to your list?"
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
      deleteReport,
      restoreReport,
      canSoftDeleteReport,
    ],
  );

  const renderMobileReportCard = useCallback(
    (r: any) => {
      const pdfHref = resolveReportPdfHref(getUserTaskPdfField(r));
      const title = formatMobileReportCardTitle(r);
      const submittedLabel = formatReportSubmittedAt(r);
      const highlighted = linkedReportId != null && +r.id === +linkedReportId;
      const selectable = canUseBulkDelete && canSoftDeleteReport(r);

      const siteDept = [r.siteName, r.serviceName].filter(Boolean).join(REPORT_LIST_SEP) || "—";

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
                    Submitted by
                  </MobileReportCardLabel>
                  <MobileReportCardValue
                    $dark={mobileUiDark}
                    className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                  >
                    {formatSubmittedByRow(r)}
                  </MobileReportCardValue>
                </MobileReportCardDetailRow>
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
              </>
            ) : +profileType === userType.STAFF ? (
              <MobileReportCardDetailRow>
                <MobileReportCardLabel
                  $dark={mobileUiDark}
                  className={mobileUiDark ? "nr-mobile-report-meta-label" : undefined}
                >
                  Submitted by
                </MobileReportCardLabel>
                <MobileReportCardValue
                  $dark={mobileUiDark}
                  className={mobileUiDark ? "nr-mobile-report-meta-value" : undefined}
                >
                  {formatSubmittedByRow(r)}
                </MobileReportCardValue>
              </MobileReportCardDetailRow>
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
      markReportOpenedForViewer,
      mobileUiDark,
      mobileDarkBtnDefaultStyle,
      handleOpenReportPdf,
    ],
  );

  const columns = [
    ...(Number(profileType) !== userType.CUSTOMER
      ? [
          {
            title: +profileType === userType.ADMIN ? "Submitted by" : "Staff",
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
      ellipsis: true,
      width: 200,
      ...tableSorter,
      sortOrder: sortOrderFor("siteName"),
    },
    {
      title: "Service",
      dataIndex: "serviceName",
      ellipsis: true,
      width: 200,
      ...tableSorter,
      sortOrder: sortOrderFor("serviceName"),
    },
    ...(Number(profileType) === userType.ADMIN
      ? [
          {
            title: "Customer",
            key: "customerName",
            dataIndex: "customerName",
            ellipsis: true,
            width: 180,
            ...tableSorter,
            sortOrder: sortOrderFor("customerName"),
            render: (_: unknown, r: any) => formatCustomerDisplayName(r),
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
        const href = resolveReportPdfHref(getUserTaskPdfField(r));
        if (!href) {
          return <span style={{ color: "#bfbfbf" }}>�</span>;
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
            title: "Status",
            key: "readStatus",
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

  const isEditMode = Boolean(editing?.id);
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
  const templateChosen = Boolean(selectedTemplateId);
  const legacyReportsForRender = useMemo(() => {
    if (!isEditMode || templateChosen) return [];
    if (!Array.isArray(editing?.reports)) return [];
    return editing.reports
      .slice()
      .filter((r: any) => !isJunkTemplateField({ name: r?.name, type: r?.type }))
      .sort((a: any, b: any) => (+a.order || 0) - (+b.order || 0));
  }, [editing, isEditMode, templateChosen]);
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
    (
      // Admin / edit mode: keep existing behaviour.
      !useStaffStyleCreate &&
      templateChosen &&
      (!isEditMode || hadSubmittedService)
    );

  const whereWhoHint = !templateChosen && !isEditMode
    ? useStaffStyleCreate
      ? "Select the job site, then choose a report template. Only templates linked to that site's services are shown."
      : "Choose a report template first. Customer, site, and Service appear after a template is selected."
    : isEditMode && !hadSubmittedCustomer && !hadSubmittedSite && !hadSubmittedService
      ? "This report has no saved customer, site, or Service on file."
      : !isEditMode
        ? useStaffStyleCreate
          ? "Select the job site for this report. Customer and Service are filled from the site assignment."
          : "Choose customer, site, and Service for this report."
        : isStaffUser
          ? "Only the job site is shown below; customer and Service stay on file for this report."
          : "Only customer, site, and Service that were saved on this report are shown below.";

  const showTemplateField =
    !useStaffStyleCreate ||
    !isMobilePortrait ||
    isEditMode ||
    Boolean(watchedSiteId);

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
            options={sites.map((s: any) => ({ value: s.id, label: s.name || s.siteName || `#${s.id}` }))}
            onChange={onPickSite}
            disabled={lockStaffEditContext}
          />
        </Form.Item>
      </Fieldset>
    </Col>
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
                ensureAutoTaskName();
                const tpl = reportTemplates.find((t: any) => +t.id === +tplId);
                applyTemplateFieldDefaults(tpl);
                if (useStaffStyleCreate) {
                  const siteId = form.getFieldValue("siteId");
                  if (siteId && tpl) {
                    void applyServiceFromTemplate(tpl, +siteId);
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
    <Layout title="sidebar.newReports">
      <NewReportModalMobilePortraitStyles />
      {reportsPageDark ? <ReportsMobileDarkPageStyles /> : null}
      <UsersDiv
        style={mobilePortraitBleed}
        className={`new-reports-list-wrap${showMobileCards ? " new-reports-list-wrap--mobile-cards" : ""}${
          isMobilePortrait ? " new-reports-list-wrap--mobile-portrait" : ""
        }${reportsPageDark ? " new-reports-page-dark new-reports-theme-dark" : ""}`}
      >
        {showReportDeletedTabs ? (
          <Tabs
            className={
              isMobilePortrait || showMobileCards
                ? `new-reports-mobile-tabs${mobileUiDark ? " new-reports-mobile-tabs--dark" : ""}`
                : undefined
            }
            activeKey={reportListTab}
            onChange={(k) => {
              setReportListTab(k as ReportListTab);
              setPage(1);
              setSelectedRowKeys([]);
            }}
            style={{ marginBottom: 12 }}
            items={[
              { key: "active", label: "Reports" },
              { key: "deleted", label: `Deleted (${deletedReportCount})` },
            ]}
          />
        ) : null}
        <div
          className={`new-reports-list-filters${mobileUiDark ? " new-reports-list-filters--dark" : ""}`}
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
                  New
                </Button>
              ) : null}
            </div>
          ) : null}
          <Form
            form={listForm}
            layout={isMobilePortrait ? "vertical" : "inline"}
            className={[
              isMobilePortrait && !listFiltersOpen ? "new-reports-list-filters-form--collapsed" : "",
              mobileUiDark ? "new-reports-list-filters-form--dark" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              isMobilePortrait && !listFiltersOpen
                ? { display: "none", marginBottom: 0 }
                : {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px 16px",
                    alignItems: "flex-end",
                    marginBottom: 16,
                  }
            }
          >
            <Form.Item
              name="dateRange"
              label="Date from - Date to"
              className={mobileUiDark ? "nr-dark-picker-shell" : undefined}
              style={isMobilePortrait ? { width: "100%" } : undefined}
            >
              <RangePicker
                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                format="DD/MM/YYYY"
                style={isMobilePortrait || mobileUiDark ? { width: "100%" } : undefined}
                onChange={() => {
                  setTimeout(() => void applyListFiltersFromForm(), 0);
                }}
              />
            </Form.Item>
            <Form.Item name="siteId" label="Job Site" style={isMobilePortrait ? { width: "100%" } : undefined}>
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
                    minWidth: isMobilePortrait ? undefined : 200,
                    width: isMobilePortrait ? "100%" : undefined,
                    ...(mobileUiDark ? { width: "100%" } : mobileDarkFieldStyle),
                  }}
                />
              </div>
            </Form.Item>
            <Form.Item name="serviceId" label="Service" style={isMobilePortrait ? { width: "100%" } : undefined}>
              <div className={mobileUiDark ? "nr-dark-select-shell" : undefined}>
                <Select
                  className={mobileUiDark ? "nr-mobile-dark-field nr-mobile-select-dark" : undefined}
                  popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                  dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                  allowClear
                  placeholder="All Services"
                  options={filterServices.map((d: any) => ({
                    value: String(d.id),
                    label: d.name || d.serviceName || String(d.id),
                  }))}
                  onChange={(v) => void onListFilterServiceChange(v as string | undefined)}
                  showSearch
                  optionFilterProp="label"
                  style={{
                    minWidth: isMobilePortrait ? undefined : 200,
                    width: isMobilePortrait ? "100%" : undefined,
                    ...(mobileUiDark ? { width: "100%" } : mobileDarkFieldStyle),
                  }}
                />
              </div>
            </Form.Item>
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
                      minWidth: isMobilePortrait ? undefined : 220,
                      width: isMobilePortrait ? "100%" : undefined,
                      ...(mobileUiDark ? { width: "100%" } : mobileDarkFieldStyle),
                    }}
                  />
                </div>
              </Form.Item>
            ) : null}
            <Form.Item style={isMobilePortrait ? { width: "100%", marginBottom: 0 } : undefined}>
              <Space wrap style={isMobilePortrait ? { width: "100%", justifyContent: "flex-end" } : undefined}>
                <Button type="primary" icon={<SearchOutlined />} style={staffPrimaryGreen} onClick={onSearchList}>
                  Search
                </Button>
                {!isMobilePortrait && +profileType !== userType.CUSTOMER ? (
                  <Button type="primary" icon={<FileTextOutlined />} style={staffPrimaryGreen} onClick={openCreate} loading={listLoading}>
                    New
                  </Button>
                ) : null}
              </Space>
            </Form.Item>
          </Form>
        </div>

        {canUseBulkDelete ? (
          <div
            className={
              showMobileCards
                ? `new-reports-bulk-bar--mobile${mobileUiDark ? " new-reports-bulk-bar--dark" : ""}`
                : undefined
            }
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: showMobileCards || isMobilePortrait ? "stretch" : "center",
              gap: 12,
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: mobileUiDark ? 8 : 10,
              flexDirection: showMobileCards || isMobilePortrait ? "column" : undefined,
              ...(mobileUiDark
                ? {
                    background: "#1a1a1a",
                    border: "1px solid #444444",
                    boxShadow: "none",
                  }
                : showMobileCards || isMobilePortrait
                  ? {
                      background: "#ffffff",
                      border: "2px solid #d9d9d9",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }
                  : {
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      boxShadow: "none",
                    }),
            }}
          >
            <Typography.Text
              strong
              style={{
                marginRight: 4,
                color: mobileUiDark ? "#ffffff" : undefined,
              }}
            >
              Select reports:
            </Typography.Text>
            <div
              className={
                mobileUiDark ? "nr-bulk-select-wrap nr-dark-select-shell" : undefined
              }
            >
              <Select
                className={
                  mobileUiDark
                    ? "nr-mobile-dark-field nr-mobile-select-dark nr-bulk-select-dark"
                    : undefined
                }
                popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                mode="multiple"
                allowClear
                placeholder="Select one or more reports on this page"
                style={
                  showMobileCards || mobileUiDark
                    ? { width: "100%", maxWidth: "none" }
                    : { flex: "1 1 280px", minWidth: 220, maxWidth: 520 }
                }
                value={selectedRowKeys}
                onChange={(vals) => setSelectedRowKeys(vals)}
                options={reportSelectOptions}
                optionFilterProp="label"
                maxTagCount="responsive"
                disabled={bulkDeleting || listLoading || !reportSelectOptions.length}
              />
            </div>
            <Space
              wrap={!showMobileCards}
              style={showMobileCards ? { width: "100%", justifyContent: "stretch" } : undefined}
            >
              <Popconfirm
                title={
                  +profileType === userType.ADMIN ? (
                    <span>
                      Delete {selectedRowKeys.length} selected report
                      {selectedRowKeys.length === 1 ? "" : "s"}?
                      <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                        This permanently removes the reports and their submitted data.
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
                okText={+profileType === userType.ADMIN ? "Delete" : "Remove"}
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                disabled={!selectedRowKeys.length || bulkDeleting}
                onConfirm={deleteSelectedReports}
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
                  {+profileType === userType.ADMIN ? "Delete selected" : "Remove selected"}
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

        {isDeletedReportTab && (+profileType === userType.CUSTOMER || +profileType === userType.STAFF) ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Popconfirm
              title={
                <span>
                  Clear all deleted reports?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    This hides them from your Deleted tab (soft clear). You can�t restore after clearing.
                  </div>
                </span>
              }
              okText="Clear deleted"
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
                Clear deleted
              </Button>
            </Popconfirm>
          </div>
        ) : null}

        {showMobileCards ? (
          <Spin spinning={listLoading}>
            {!listLoading && rows.length === 0 ? (
              <Empty
                description={
                  isDeletedReportTab ? "No deleted reports" : "No reports found"
                }
                style={{ margin: "32px 0" }}
              />
            ) : (
              <MobileReportsList $dark={mobileUiDark}>
                {rows.map(renderMobileReportCard)}
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
            dataSource={rows}
            columns={columns as any}
            rowSelection={rowSelection}
            bordered
            size="middle"
            showSorterTooltip={supportsTableSort}
            onChange={supportsTableSort ? onTableChange : undefined}
            rowClassName={(record) =>
              linkedReportId && +record.id === linkedReportId ? "report-row-highlight" : ""
            }
            scroll={{ x: "max-content" }}
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
                Delete
              </Button>
            ) : null}
            {isDeletedReportTab && viewRow && canSoftDeleteReport(viewRow) ? (
              <Popconfirm
                title="Restore this report to your list?"
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
                <span style={submittedMetaValue}>{viewRow.siteName || "�"}</span>
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
                <div style={submittedMetaLabel}>Service</div>
                <span style={submittedMetaValue}>{viewRow.serviceName || "�"}</span>
                <div style={{ ...submittedMetaLabel, marginTop: 18 }}>Submitted date</div>
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
                    "�"
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
              {editing ? "Update report" : "New report"}
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
            <Form.Item name="staffId" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="taskName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="notifiesStaff" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="customerName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="companyName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="siteName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="siteLocation" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="siteAddress" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            <Form.Item name="serviceName" style={{ display: "none" }}>
              <Input />
            </Form.Item>
            {useStaffStyleCreate ? (
              <>
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
            {/* taskName is required by API but hidden from staff UI */}
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
                {templateFieldCol}
              </>
            ) : (
              <>
                {templateFieldCol}
                {siteFieldCol}
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
                          c.companyName || c.customerInfo?.companyName ? ` (${c.companyName || c.customerInfo?.companyName})` : ""
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

            {/* notifiesStaff is required by API but hidden from staff UI */}
          </Row>

          {templateItemsForRender.length > 0 ? (
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
                      (fieldType === "[REPORT_DATE]" || fieldType === "[REPORT_TIME]") &&
                      // Staff: only show picker when allowed (otherwise read-only auto-merge).
                      (!isStaffUser || !isHiddenFromStaffCreate(it))
                    ) {
                      return (
                        <Col span={templateFieldColSpan} key={key}>
                          <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                            {fieldType === "[REPORT_DATE]" ? (
                              <DatePicker
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                                style={{ width: "100%", borderRadius: 8 }}
                                format="YYYY-MM-DD"
                              />
                            ) : (
                              <TimePicker
                                size={controlSize}
                                className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                                popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                                style={{ width: "100%", borderRadius: 8 }}
                                format="HH:mm:ss"
                              />
                            )}
                          </Form.Item>
                        </Col>
                      );
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

                  // Some templates incorrectly define the "Time" field as TEXT/DATETIME.
                  // Always show it as a time picker when the label/name is time-like.
                  if (timeLike) {
                    return (
                      <Col span={templateFieldColSpan} key={key}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="HH:mm:ss"
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
                          <TimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="HH:mm:ss"
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
                            rows={fieldType === "RICH_TEXT" ? 6 : 3}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            style={{ borderRadius: 8 }}
                            placeholder="Enter details"
                          />
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
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
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
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
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
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
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

                  if (isTimeLikeLabel(label)) {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="HH:mm:ss"
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

                  if (fieldType === "TIME") {
                    return (
                      <Col span={templateFieldColSpan} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <TimePicker
                            size={controlSize}
                            className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
                            popupClassName={mobileUiDark ? "nr-mobile-dark-calendar" : undefined}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="HH:mm:ss"
                          />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (isJsonMediaFieldType(fieldType)) {
                    const multiple = fieldType === "IMAGES";
                    const UploadComp = multiple ? TemplateImageUpload : TemplateVideoUpload;
                    return (
                      <Col span={24} key={fieldKey}>
                        <Form.Item name={fieldKey} label={label} rules={[{ required }]}>
                          <UploadComp />
                        </Form.Item>
                      </Col>
                    );
                  }

                  if (fieldType === "FILE") {
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
                            style={{ borderRadius: 8 }}
                            autoSize={{ minRows: 3, maxRows: 8 }}
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

