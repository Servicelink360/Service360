import {
    CheckCircleFilled,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FileAddOutlined,
    FlagOutlined,
    MailOutlined,
    MessageOutlined,
    SearchOutlined,
    FilterOutlined,
    DownOutlined,
    UpOutlined,
    SyncOutlined,
    ThunderboltFilled,
    UserOutlined,
} from "@ant-design/icons";
import {
    ActionBtn,
    ActionListBtn,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Image, DatePicker, Input, Tooltip, Spin, message, Button, Select, Typography, Table, Empty, Pagination, Checkbox } from "antd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import useMobilePortrait from "@app/lib/hooks/useMobilePortrait";
import { useColorModeOptional } from "@app/context/ColorModeContext";
import { useHistory, useLocation } from "react-router-dom";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/report-faults/actions";
import dashboardActions from "@app/redux/dashboard/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset } from "@app/components/common/container.style";
import ReportFaultModal from "@app/components/report-faults";
import ReportFaultAnswerModal from "@app/components/report-faults/answer";
import FaultReportViewModal from "@app/components/report-faults/fault-report-view";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { checkRole } from "../../library/helpers/utility";
import endPoint from "../../constants/endPoint";
import serviceType from "../../constants/serviceType";
import { callAPIAsync } from "../../library/helpers/api";
import { reportFaultSender, reportFaultStatus, userType } from "../../constants/statusUser";
import moment from "moment";
import { Link } from "react-router-dom";
import { ReportsMobileDarkPageStyles } from "./reports-mobile-dark-styles";

const { RangePicker } = DatePicker;

const staffPrimaryGreen = { background: "#389e0d", borderColor: "#389e0d" };

type PillTone = { bg: string; border: string; color: string };

/** Semantic colors aligned with Ant Design tokens (warning / processing / success / danger / geekblue) */
const BADGE_PALETTE = {
    new: { bg: "#fffbe6", border: "#faad14", color: "#ad6800" } satisfies PillTone,
    active: { bg: "#fff2e8", border: "#fa8c16", color: "#d46b08" } satisfies PillTone,
    completed: { bg: "#f6ffed", border: "#52c41a", color: "#389e0d" } satisfies PillTone,
    urgent: { bg: "#fff1f0", border: "#ff4d4f", color: "#cf1322" } satisfies PillTone,
    normal: { bg: "#f0f5ff", border: "#adc6ff", color: "#1d39c4" } satisfies PillTone,
    customer: { bg: "#fff7e6", border: "#ffa940", color: "#d46b08" } satisfies PillTone,
    support: { bg: "#e6f4ff", border: "#4096ff", color: "#0958d9" } satisfies PillTone,
} as const;

const pillBadge = (
    icon: React.ReactNode,
    label: string,
    tone: PillTone,
    title?: string,
    large?: boolean,
    small?: boolean,
) => {
    const textSize = small ? 9.6 : large ? 14.4 : 12;
    const iconSize = small ? 11.2 : large ? 16.8 : 14;
    const pad = small ? "3px 8px" : large ? "5px 12px" : "4px 10px";
    const gap = small ? 4 : 6;
    return (
        <Tooltip title={title ?? label}>
            <span
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap,
                    padding: pad,
                    borderRadius: 16,
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.color,
                    fontSize: textSize,
                    fontWeight: 600,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                }}
            >
                <span style={{ display: "inline-flex", fontSize: iconSize, color: tone.color }}>
                    {icon}
                </span>
                {label}
            </span>
        </Tooltip>
    );
};

const canDeleteReportFault = (profile: any, record: any) => {
    if (!profile?.id || !record) return false;
    const userId = +profile.id;
    if (+profile.type === userType.ADMIN) {
        return checkRole('DELETE');
    }
    if (+profile.type === userType.STAFF) {
        return +record.staffId === userId;
    }
    if (+profile.type === userType.CUSTOMER) {
        return Boolean(reportFaultIdOf(record));
    }
    return false;
};

const renderFaultStatus = (r: any, viewerType?: number, large?: boolean) => {
    if (r.status === reportFaultStatus.DELETED || r.isDeleted) {
        return pillBadge(<DeleteOutlined />, "Deleted", BADGE_PALETTE.urgent, undefined, large);
    }
    if (r.status === reportFaultStatus.PENDING) {
        return pillBadge(<ClockCircleOutlined />, "New", BADGE_PALETTE.new, undefined, large);
    }
    if (r.status === reportFaultStatus.INPROGRESS) {
        if (+viewerType !== userType.STAFF) {
            return pillBadge(<SyncOutlined />, "In progress", BADGE_PALETTE.active, undefined, large);
        }
        const sender = +r.sender;
        const waiting =
            sender === reportFaultSender.CUSTOMER
                ? "Waiting for customer"
                : sender === reportFaultSender.ADMIN
                    ? "With admin"
                    : "Waiting for support";
        const hintColor =
            sender === reportFaultSender.CUSTOMER
                ? BADGE_PALETTE.new.color
                : BADGE_PALETTE.support.color;
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                {pillBadge(<SyncOutlined />, "In progress", BADGE_PALETTE.active, undefined, large)}
                <span
                    style={{
                        fontSize: large ? 13.2 : 11,
                        color: hintColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 500,
                    }}
                >
                    <UserOutlined style={{ fontSize: large ? 13.2 : 11 }} />
                    {waiting}
                </span>
            </div>
        );
    }
    return pillBadge(<CheckCircleOutlined />, "Completed", BADGE_PALETTE.completed, undefined, large);
};

const renderFaultPriority = (priority: number | undefined, large?: boolean, small?: boolean) => {
    if (priority && +priority === 1) {
        return pillBadge(<ThunderboltFilled />, "Urgent", BADGE_PALETTE.urgent, undefined, large, small);
    }
    if (priority && +priority === 2) {
        return pillBadge(<FlagOutlined />, "Normal", BADGE_PALETTE.normal, undefined, large, small);
    }
    return "—";
};

function isFaultReadForViewer(row: any, viewerType: number): boolean {
    if (+viewerType === userType.ADMIN) return Boolean(row?.adminOpenedAt);
    if (+viewerType === userType.CUSTOMER) return Boolean(row?.customerOpenedAt);
    return false;
}

type MobileStyledDark = { $dark?: boolean };

const MobileFaultsList = styled.div<MobileStyledDark>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$dark ? "18px" : "16px")};
  width: 100%;
  box-sizing: border-box;
  padding: 4px 0 12px;
`;

const MobileFaultCard = styled.article<MobileStyledDark & { $highlight?: boolean }>`
  display: block;
  width: 100%;
  box-sizing: border-box;
  background: ${(p) => (p.$dark ? "#1e1e1e" : "#ffffff")};
  border: 2px solid ${(p) => (p.$dark ? "#525252" : "#c8c8c8")};
  border-radius: 12px;
  box-shadow: ${(p) =>
    p.$dark
      ? "0 0 0 1px #3d3d3d, 0 8px 28px rgba(0, 0, 0, 0.85)"
      : "0 4px 14px rgba(0, 0, 0, 0.12)"};
  overflow: hidden;
  cursor: pointer;

  ${(p) =>
    p.$highlight &&
    css`
      border-color: #52c41a;
      box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.45);
    `}
`;

const MobileFaultCardHead = styled.div<MobileStyledDark>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 14px 10px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#404040" : "#e8e8e8")};
`;

const MobileFaultCardTitle = styled.div<MobileStyledDark>`
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: ${(p) => (p.$dark ? "#f5f5f5" : "#262626")};
  word-break: break-word;
`;

const MobileFaultCardMeta = styled.div<MobileStyledDark>`
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.35;
  color: ${(p) => (p.$dark ? "#b0b0b0" : "#595959")};
`;

const MobileFaultCardBody = styled.div<MobileStyledDark>`
  padding: 12px 14px;
  color: ${(p) => (p.$dark ? "#e8e8e8" : "#434343")};
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
`;

const MobileFaultCardActions = styled.div<MobileStyledDark>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid ${(p) => (p.$dark ? "#404040" : "#e8e8e8")};
`;

const UnreadBookIcon: React.FC = () => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
        <defs>
            <filter id="faultUnreadBookShadow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="0.75" stdDeviation="0.55" floodColor="#003a8c" floodOpacity="0.22" />
            </filter>
            <linearGradient id="faultUnreadBookCover" x1="10.6" y1="4.25" x2="22.5" y2="19.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#69b1ff" />
                <stop offset="1" stopColor="#1677ff" />
            </linearGradient>
        </defs>
        <g filter="url(#faultUnreadBookShadow)">
            <path
                d="M4 4.25h5.35c.69 0 1.25.56 1.25 1.25v14.5c0 .69-.56 1.25-1.25 1.25H4.75A1.75 1.75 0 0 1 3 19.5V4.25z"
                fill="#0958d9"
            />
            <path
                d="M10.6 4.25h9.65c1.24 0 2.25 1.01 2.25 2.25v12.75c0 1.24-1.01 2.25-2.25 2.25H10.6V4.25z"
                fill="url(#faultUnreadBookCover)"
                stroke="#1677ff"
                strokeWidth="0.35"
            />
            <path d="M10.6 4.25v17.5" stroke="#0958d9" strokeWidth="0.85" />
            <circle cx="18.25" cy="6.15" r="5.35" fill="#ff4d4f" stroke="#fff" strokeWidth="1.4" />
            <path
                d="M15.4 6.15h5.7M18.25 3.3v5.7"
                stroke="#fff"
                strokeWidth="1.65"
                strokeLinecap="round"
            />
        </g>
    </svg>
);

const ReadUnreadStatusIcon: React.FC<{ read: boolean }> = ({ read }) =>
    read ? (
        <Tooltip title="Read">
            <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} aria-label="Read" />
        </Tooltip>
    ) : (
        <Tooltip title="Unread">
            <span aria-label="Unread" style={{ display: "inline-flex", lineHeight: 0 }}>
                <UnreadBookIcon />
            </span>
        </Tooltip>
    );

const stopRowOpen = (e: React.MouseEvent | React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
};

const FaultReadStatusCell: React.FC<{
    row: any;
    viewerType: number;
    markingUnread?: boolean;
    onMarkUnread?: (row: any) => void;
}> = ({ row, viewerType, markingUnread, onMarkUnread }) => {
    const read = isFaultReadForViewer(row, viewerType);
    const canMarkUnread =
        read &&
        onMarkUnread &&
        (+viewerType === userType.ADMIN || +viewerType === userType.CUSTOMER);

    const icon = <ReadUnreadStatusIcon read={read} />;

    const inner = !canMarkUnread ? (
        icon
    ) : (
        <Popconfirm
            title={
                <span>
                    Mark as unread?
                    <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                        {+viewerType === userType.ADMIN
                            ? "This fault will show as unread for admin only."
                            : "This fault will show as unread for you only."}
                    </div>
                </span>
            }
            okText="Mark unread"
            cancelText="Cancel"
            onConfirm={() => onMarkUnread(row)}
        >
            <span
                role="button"
                tabIndex={0}
                onClick={stopRowOpen}
                onMouseDown={stopRowOpen}
                onKeyDown={stopRowOpen}
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

    return (
        <div
            className="report-fault-read-status"
            onClick={stopRowOpen}
            onMouseDown={stopRowOpen}
            style={{ display: "inline-flex", lineHeight: 0 }}
        >
            {inner}
        </div>
    );
};

const reportFaultIdOf = (record: any) => record?.reportFaultId ?? record?.id;

const MESSAGE_PREVIEW_LINES = 3;

const renderWrappedMessage = (text: unknown) => {
    const full = text == null ? "" : String(text).trim();
    if (!full) return "—";
    const cellStyle: React.CSSProperties = {
        display: "-webkit-box",
        WebkitLineClamp: MESSAGE_PREVIEW_LINES,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
        lineHeight: 1.5,
        fontSize: 13,
        maxHeight: MESSAGE_PREVIEW_LINES * 1.5 * 13,
    };
    return (
        <Tooltip
            title={<span style={{ whiteSpace: "pre-wrap", display: "block" }}>{full}</span>}
            overlayStyle={{ maxWidth: 420 }}
        >
            <span className="report-fault-message-cell" style={cellStyle}>
                {full}
            </span>
        </Tooltip>
    );
};

const ReportFaults: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const location = useLocation();
    const history = useHistory();
    const linkedFaultId = useMemo(() => {
        const id = new URLSearchParams(location.search).get("faultId");
        return id ? +id : null;
    }, [location.search]);
    const scrollToHighlightedRow = useCallback(() => {
        window.setTimeout(() => {
            document
                .querySelector("tr.report-row-highlight, .report-fault-mobile-card--highlight")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
        }, 150);
    }, []);
    const { loading, rows: reduxRows, row, success, modalType, count, loadingAction } = useSelector((state: any) => state?.reportFaults);
    const dispatch = useDispatch();
    const [sites, setSites] = useState<any[]>([]);
    const [viewFaultOpen, setViewFaultOpen] = useState(false);
    const [viewFaultRow, setViewFaultRow] = useState<any | null>(null);
    const [listRows, setListRows] = useState<any[]>([]);
    const [markingUnreadFaultId, setMarkingUnreadFaultId] = useState<number | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const isMobilePortrait = useMobilePortrait();
    const { isDark } = useColorModeOptional();
    const faultsPageDark = isDark && isMobilePortrait;
    const modalUiDark = faultsPageDark;
    const mobileUiDark = faultsPageDark;
    const [listFiltersOpen, setListFiltersOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        return !window.matchMedia("(max-width: 768px) and (orientation: portrait)").matches;
    });

    useEffect(() => {
        if (!isMobilePortrait) setListFiltersOpen(true);
    }, [isMobilePortrait]);

    useEffect(() => {
        const layoutDarkClass = "new-reports-layout-dark";
        const bodyDarkClass = "new-reports-page-body-dark";
        if (!faultsPageDark) {
            document.body.classList.remove(bodyDarkClass);
            document.querySelectorAll(`.${layoutDarkClass}`).forEach((el) => {
                el.classList.remove(layoutDarkClass);
            });
            return;
        }
        document.body.classList.add(bodyDarkClass);
        const wrap = document.querySelector(".report-faults-list-wrap");
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
    }, [faultsPageDark]);

    useEffect(() => {
        setListRows(reduxRows || []);
    }, [reduxRows]);

    const profileRaw = localStorage.getItem('profile');
    let profile: any = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    const refreshDashboard = useCallback(() => {
        dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
    }, [dispatch]);

    const patchFaultReadState = useCallback(
        (faultId: number) => {
            const field =
                +profile?.type === userType.ADMIN
                    ? 'adminOpenedAt'
                    : +profile?.type === userType.CUSTOMER
                        ? 'customerOpenedAt'
                        : null;
            if (!field) return;
            const now = new Date().toISOString();
            setListRows((prev) =>
                prev.map((r) =>
                    reportFaultIdOf(r) === faultId ? { ...r, [field]: r[field] || now } : r,
                ),
            );
            setViewFaultRow((prev) =>
                prev && reportFaultIdOf(prev) === faultId
                    ? { ...prev, [field]: prev[field] || now }
                    : prev,
            );
        },
        [profile],
    );

    const clearFaultReadState = useCallback(
        (faultId: number) => {
            const field =
                +profile?.type === userType.ADMIN
                    ? 'adminOpenedAt'
                    : +profile?.type === userType.CUSTOMER
                        ? 'customerOpenedAt'
                        : null;
            if (!field) return;
            setListRows((prev) =>
                prev.map((r) =>
                    reportFaultIdOf(r) === faultId ? { ...r, [field]: null } : r,
                ),
            );
            setViewFaultRow((prev) =>
                prev && reportFaultIdOf(prev) === faultId ? { ...prev, [field]: null } : prev,
            );
        },
        [profile],
    );

    const markFaultUnread = useCallback(
        async (record: any) => {
            const faultId = reportFaultIdOf(record);
            if (!faultId) return;
            const markPath =
                +profile?.type === userType.ADMIN
                    ? `${endPoint.REPORT_FAULTS}/markAdminUnread/${faultId}`
                    : +profile?.type === userType.CUSTOMER
                        ? `${endPoint.REPORT_FAULTS}/markCustomerUnread/${faultId}`
                        : null;
            if (!markPath) return;
            setMarkingUnreadFaultId(faultId);
            try {
                const res = await callAPIAsync(serviceType.COMMON, markPath, 'PATCH', {});
                if (res?.code === 1) {
                    clearFaultReadState(faultId);
                    refreshDashboard();
                    message.success('Marked as unread');
                } else {
                    message.error(res?.message || 'Could not mark as unread');
                }
            } finally {
                setMarkingUnreadFaultId(null);
            }
        },
        [profile, clearFaultReadState, refreshDashboard],
    );

    const markFaultOpenedForViewer = useCallback(
        async (recordOrId: any) => {
            const faultId =
                typeof recordOrId === 'number' ? recordOrId : reportFaultIdOf(recordOrId);
            const userTypeNum = +profile?.type;
            let markPath: string | null = null;
            if (faultId && userTypeNum === userType.ADMIN) {
                markPath = `${endPoint.REPORT_FAULTS}/markAdminOpened/${faultId}`;
            } else if (faultId && userTypeNum === userType.CUSTOMER) {
                markPath = `${endPoint.REPORT_FAULTS}/markCustomerOpened/${faultId}`;
            }
            if (!markPath) return false;
            const res = await callAPIAsync(serviceType.COMMON, markPath, 'PATCH', {});
            if (res?.code === 1) {
                patchFaultReadState(faultId);
                refreshDashboard();
                return true;
            }
            return false;
        },
        [profile, refreshDashboard, patchFaultReadState],
    );

    const openFaultView = useCallback(
        (record: any) => {
            setViewFaultRow(record);
            setViewFaultOpen(true);
            void markFaultOpenedForViewer(record);
        },
        [markFaultOpenedForViewer],
    );

    const closeFaultView = useCallback(() => {
        setViewFaultOpen(false);
        setViewFaultRow(null);
    }, []);

    const getFilter = async () => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getSites`, 'GET');
        if (res?.data) {
            setSites(res.data)
        }
    }

    const profileType = profile ? +profile.type : 0;
    const showReadUnread =
        profileType === userType.ADMIN || profileType === userType.CUSTOMER;

    const canUseBulkDelete =
        profileType === userType.ADMIN ||
        profileType === userType.CUSTOMER ||
        profileType === userType.STAFF;

    const canBulkDeleteRow = useCallback(
        (record: any) => canDeleteReportFault(profile, record),
        [profile],
    );

    const deletableRowsOnPage = useMemo(
        () => listRows.filter((r) => canBulkDeleteRow(r)),
        [listRows, canBulkDeleteRow],
    );

    const faultSelectOptions = useMemo(
        () =>
            deletableRowsOnPage.map((r) => ({
                value: r.listRowId,
                label: `${r.issue || r.subject || "Fault"} — ${r.siteName || "—"} (#${reportFaultIdOf(r)})`,
            })),
        [deletableRowsOnPage],
    );

    const toggleFaultRowSelected = useCallback((listRowId: React.Key, checked: boolean) => {
        setSelectedRowKeys((prev) =>
            checked ? [...prev, listRowId] : prev.filter((k) => k !== listRowId),
        );
    }, []);

    const renderMobileFaultCard = useCallback(
        (record: any) => {
            const faultId = reportFaultIdOf(record);
            const highlighted = linkedFaultId != null && faultId === linkedFaultId;
            const title = record.issue || record.subject || `Fault #${faultId}`;
            const siteLine = [record.siteName, record.serviceName].filter(Boolean).join(" · ") || "—";
            const timeLabel = record.createdAt
                ? moment(record.createdAt).utcOffset(600).format(dateTimeFormat)
                : "—";
            const messageText =
                record.message == null ? "" : String(record.message).trim();
            const selectable = canUseBulkDelete && canBulkDeleteRow(record);

            return (
                <MobileFaultCard
                    key={record.listRowId}
                    $dark={mobileUiDark}
                    $highlight={highlighted}
                    className={highlighted ? "report-fault-mobile-card--highlight" : undefined}
                    onClick={(e) => {
                        const el = e.target as HTMLElement;
                        if (
                            el.closest(
                                ".report-fault-read-status, .ant-checkbox-wrapper, .report-faults-row-actions, .ant-btn, .btnLink, button",
                            )
                        ) {
                            return;
                        }
                        openFaultView(record);
                    }}
                >
                    <MobileFaultCardHead $dark={mobileUiDark}>
                        {selectable ? (
                            <Checkbox
                                checked={selectedRowKeys.includes(record.listRowId)}
                                onChange={(e) =>
                                    toggleFaultRowSelected(record.listRowId, e.target.checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select fault ${title}`}
                                style={{ marginTop: 2, flexShrink: 0 }}
                            />
                        ) : null}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <MobileFaultCardTitle $dark={mobileUiDark}>{title}</MobileFaultCardTitle>
                            <MobileFaultCardMeta $dark={mobileUiDark}>{siteLine}</MobileFaultCardMeta>
                            <MobileFaultCardMeta $dark={mobileUiDark}>{timeLabel}</MobileFaultCardMeta>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                {renderFaultStatus(record, profileType, false)}
                                {renderFaultPriority(record.priority, false, true)}
                            </div>
                        </div>
                        {showReadUnread ? (
                            <div style={{ flexShrink: 0 }} onClick={stopRowOpen}>
                                <FaultReadStatusCell
                                    row={record}
                                    viewerType={profileType}
                                    markingUnread={markingUnreadFaultId === faultId}
                                    onMarkUnread={markFaultUnread}
                                />
                            </div>
                        ) : null}
                    </MobileFaultCardHead>
                    {messageText ? (
                        <MobileFaultCardBody $dark={mobileUiDark}>
                            {messageText.length > 220
                                ? `${messageText.slice(0, 220)}…`
                                : messageText}
                        </MobileFaultCardBody>
                    ) : null}
                    <MobileFaultCardActions $dark={mobileUiDark}>
                        {renderFaultActionCell(record)}
                    </MobileFaultCardActions>
                </MobileFaultCard>
            );
        },
        [
            linkedFaultId,
            mobileUiDark,
            profileType,
            showReadUnread,
            markingUnreadFaultId,
            markFaultUnread,
            openFaultView,
            canUseBulkDelete,
            canBulkDeleteRow,
            selectedRowKeys,
            toggleFaultRowSelected,
        ],
    );

    const renderFaultActionCell = (record: any) => (
        <div className="report-faults-row-actions" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View">
                <ButtonMR className="btnLink" onClick={() => openFaultView(record)}>
                    <EyeOutlined />
                </ButtonMR>
            </Tooltip>
            {+profile?.type === userType.STAFF && record.status === reportFaultStatus.PENDING && checkRole("EDIT") ? (
                <ButtonMR onClick={() => handleOnClick(actionType.UPDATE, record)} className="btnLink">
                    <EditOutlined />
                </ButtonMR>
            ) : null}
            {+profile?.type === userType.STAFF &&
            record.status !== reportFaultStatus.COMPLETED &&
            +record.sender === reportFaultSender.STAFF ? (
                <ButtonMR
                    onClick={() =>
                        handleOnClick(actionType.ADD_ITEM, {
                            reportFaultId: reportFaultIdOf(record),
                        })
                    }
                    className="btnLink"
                >
                    <MessageOutlined />
                </ButtonMR>
            ) : null}
            {(+profile?.type === userType.CUSTOMER || +profile?.type === userType.ADMIN) &&
            record.status !== reportFaultStatus.COMPLETED ? (
                <Link
                    to={`/messages?reportFaultId=${reportFaultIdOf(record)}`}
                    className="btnLink"
                    title="Message about this report"
                >
                    <ButtonMR className="btnLink">
                        <MailOutlined />
                    </ButtonMR>
                </Link>
            ) : null}
            {canDeleteReportFault(profile, record) ? (
                <Popconfirm
                    title={
                        +profile?.type === userType.ADMIN
                            ? "Permanently delete this message?"
                            : intl.formatMessage({ id: "notification.confirm_delete" })
                    }
                    okText={intl.formatMessage({ id: "button.Yes" })}
                    cancelText={intl.formatMessage({ id: "button.No" })}
                    placement="topRight"
                    onConfirm={() => {
                        dispatch(
                            actions.saveInto(
                                {
                                    id: reportFaultIdOf(record),
                                    answerId: record?.answerId,
                                },
                                actionType.DELETE,
                                false,
                            ),
                        );
                    }}
                >
                    <button type="button" className="btnDelete">
                        <DeleteOutlined />
                    </button>
                </Popconfirm>
            ) : null}
        </div>
    );

    const readStatusColumn = {
        title: "Status",
        key: "readStatus",
        dataIndex: "readStatus",
        width: isMobilePortrait ? 44 : 72,
        align: "center" as const,
        onCell: () => ({
            className: "report-fault-read-status-cell",
            onClick: stopRowOpen,
            onMouseDown: stopRowOpen,
        }),
        render: (_: string, r: any) => (
            <FaultReadStatusCell
                row={r}
                viewerType={profileType}
                markingUnread={markingUnreadFaultId === reportFaultIdOf(r)}
                onMarkUnread={markFaultUnread}
            />
        ),
    };

    const columns: ColDef[] | any = useMemo(() => {
        const actionColumn = {
            title: isMobilePortrait ? "" : intl.formatMessage({ id: "table.column.action" }),
            width: isMobilePortrait ? 104 : 180,
            ...(isMobilePortrait ? {} : { fixed: "right" as const }),
            align: "center" as const,
            dataIndex: "action",
            render: (_: string, record: any) => renderFaultActionCell(record),
        };

        if (isMobilePortrait) {
            return [
                {
                    title: "Time",
                    dataIndex: "createdAt",
                    width: 84,
                    sorter: true,
                    render: (_: string, r: any) => {
                        const t = r?.createdAt;
                        if (!t) return "—";
                        const m = moment(t).utcOffset(600);
                        return (
                            <span style={{ fontSize: 11, lineHeight: 1.35, display: "block", whiteSpace: "nowrap" }}>
                                {m.format("DD/MM/YY")}
                                <br />
                                {m.format("HH:mm")}
                            </span>
                        );
                    },
                },
                {
                    title: "Issue",
                    dataIndex: "issue",
                    width: 88,
                    ellipsis: true,
                    sorter: true,
                    render: (_: string, r: any) => r.issue || r.subject || "—",
                },
                {
                    title: "Message",
                    dataIndex: "message",
                    ellipsis: true,
                    render: (_: string, r: any) => {
                        const full = r.message == null ? "" : String(r.message).trim();
                        if (!full) return "—";
                        return (
                            <Tooltip title={full}>
                                <span
                                    className="report-fault-message-cell"
                                    style={{
                                        display: "block",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        fontSize: 12,
                                    }}
                                >
                                    {full}
                                </span>
                            </Tooltip>
                        );
                    },
                },
                {
                    title: "Files",
                    dataIndex: "attachFiles",
                    width: 52,
                    align: "center" as const,
                    render: (_: string, r: any) => {
                        if (!r.attachFiles) return null;
                        try {
                            const urls = JSON.parse(r.attachFiles);
                            if (!Array.isArray(urls) || !urls.length) return null;
                            return (
                                <Image
                                    src={urls[0]}
                                    width={28}
                                    height={28}
                                    style={{ objectFit: "cover", borderRadius: 4 }}
                                />
                            );
                        } catch {
                            return null;
                        }
                    },
                },
                ...(showReadUnread ? [readStatusColumn] : []),
                actionColumn,
            ];
        }

        return [
            ...(Number(profile?.type) !== userType.STAFF
                ? [
                    {
                        title: "Customer name",
                        dataIndex: "companyName",
                        sorter: true,
                        render: (_: string, r: any) => r.companyName || r.customerName || "",
                    },
                ]
                : []),
            {
                title: "Time",
                dataIndex: "createdAt",
                width: 155,
                sorter: true,
                render: (_: string, r: any) => {
                    const t = r?.createdAt;
                    return t ? moment(t).utcOffset(600).format(dateTimeFormat) : "—";
                },
            },
            { title: "Issue", dataIndex: "issue", sorter: true, render: (_: string, r: any) => r.issue || r.subject || "—" },
            {
                title: "Message",
                dataIndex: "message",
                width: 320,
                onCell: () => ({
                    style: {
                        verticalAlign: "top",
                        whiteSpace: "normal",
                        overflow: "hidden",
                    },
                }),
                render: (_: string, r: any) => renderWrappedMessage(r.message),
            },
            {
                title: "Media files",
                dataIndex: "attachFiles",
                width: 180,
                render: (_: string, r: any) => {
                    if (!r.attachFiles) return null;
                    try {
                        return JSON.parse(r.attachFiles).map((url: string, i: number) => (
                            <Image key={i} src={url} width={50} height={50} />
                        ));
                    } catch {
                        return null;
                    }
                },
            },
            { title: "Site name", dataIndex: "siteName", sorter: true },
            ...(+profile?.type !== userType.STAFF
                ? [{ title: "Service name", dataIndex: "serviceName", sorter: true }]
                : []),
            ...(showReadUnread ? [readStatusColumn] : []),
            {
                title: "Priority",
                dataIndex: "priority",
                width: 120,
                sorter: true,
                render: (_: string, r: any) => renderFaultPriority(r.priority),
            },
            actionColumn,
        ];
    }, [
        intl,
        profile,
        profileType,
        showReadUnread,
        markingUnreadFaultId,
        markFaultUnread,
        openFaultView,
        isMobilePortrait,
        dispatch,
    ]);

    const handleOnClick = (action: string, rowData?: any): void => {
        if (action === actionType.SEARCH) {
            handleResetSearch(page, limit);
        } else {
            if (
                rowData &&
                (action === actionType.UPDATE ||
                    action === actionType.ADD_ITEM ||
                    action === actionType.UPDATE_ITEM)
            ) {
                void markFaultOpenedForViewer(rowData);
            }
            dispatch({ type: actions.MODAL, payload: { modalType: action, row: rowData } });
        }
    };

    const buildListQuery = (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = 'createdAt',
        orderValue: string = 'DESC',
        options?: { clearDateFilter?: boolean; faultId?: number },
    ) => {
        const formData = form.getFieldsValue();
        const useDateRange = !options?.clearDateFilter && !options?.faultId && formData.rangeDate?.length > 1;
        const startDate = useDateRange ? moment(formData.rangeDate[0]).format('YYYY-MM-DD') : '';
        const endDate = useDateRange ? moment(formData.rangeDate[1]).format('YYYY-MM-DD') : '';
        return {
            keyword: formData?.keyword ? formData.keyword.trim() : '',
            page: pageNum,
            limit: limitNum,
            orderBy,
            orderValue,
            status: 0,
            startDate,
            endDate,
            ...(options?.faultId ? { faultId: options.faultId } : {}),
        };
    };

    const fetchList = (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = 'createdAt',
        orderValue: string = 'DESC',
        options?: { clearDateFilter?: boolean; faultId?: number },
    ) => {
        dispatch(actions.getData(buildListQuery(pageNum, limitNum, orderBy, orderValue, options)));
    };

    useEffect(() => {
        if (!success) return;
        setSelectedRowKeys([]);
        setPage(1);
        const faultIdParam = new URLSearchParams(location.search).get("faultId");
        fetchList(
            1,
            limit,
            "createdAt",
            "DESC",
            faultIdParam
                ? { clearDateFilter: true, faultId: +faultIdParam }
                : { clearDateFilter: true },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);

    const linkedFetchOptions = useCallback(() => {
        const faultIdParam = new URLSearchParams(location.search).get("faultId");
        return faultIdParam
            ? { clearDateFilter: true as const, faultId: +faultIdParam }
            : undefined;
    }, [location.search]);

    const handleResetSearch = async (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = 'createdAt',
        orderValue: string = 'DESC',
    ) => {
        try {
            await form.validateFields();
        } catch {
            // Allow search/refresh even when optional filter fields are empty
        }
        fetchList(pageNum, limitNum, orderBy, orderValue, linkedFetchOptions());
    };

    const onTableChange = (pagination: any, _filters: any, sorter: any): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(
            pagination.current,
            pagination.pageSize,
            sorter?.field ?? 'createdAt',
            sorter?.order ? (sorter.order === 'ascend' ? "ASC" : "DESC") : 'DESC',
        );
    };

    const deleteSelectedFaults = useCallback(async () => {
        const selectedRecords = selectedRowKeys
            .map((key) => listRows.find((r) => r.listRowId === key))
            .filter((r): r is NonNullable<typeof r> => Boolean(r && canBulkDeleteRow(r)));
        const faultIds = [...new Set(selectedRecords.map((r) => reportFaultIdOf(r)))];
        if (!faultIds.length) {
            message.warning("Select at least one fault you are allowed to delete");
            return;
        }
        const isAdmin = profileType === userType.ADMIN;
        setBulkDeleting(true);
        let succeeded = 0;
        let failed = 0;
        try {
            for (const faultId of faultIds) {
                const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.REPORT_FAULTS}/${faultId}`,
                    "DELETE",
                    null,
                );
                if (res?.code === 1) succeeded += 1;
                else failed += 1;
            }
            setSelectedRowKeys([]);
            await handleResetSearch(page, limit);
            refreshDashboard();
            if (succeeded && !failed) {
                message.success(
                    isAdmin
                        ? `${succeeded} fault${succeeded === 1 ? "" : "s"} deleted`
                        : `${succeeded} fault${succeeded === 1 ? "" : "s"} removed from your list`,
                );
            } else if (succeeded && failed) {
                message.warning(`${succeeded} succeeded, ${failed} failed`);
            } else {
                message.error("Could not delete selected faults");
            }
        } finally {
            setBulkDeleting(false);
        }
    }, [
        selectedRowKeys,
        listRows,
        canBulkDeleteRow,
        profileType,
        page,
        limit,
        refreshDashboard,
        handleResetSearch,
    ]);

    const rowSelection = canUseBulkDelete
        ? {
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
            getCheckboxProps: (record: any) => ({
                disabled: !canBulkDeleteRow(record),
            }),
            selections: [
                Table.SELECTION_ALL,
                Table.SELECTION_INVERT,
                Table.SELECTION_NONE,
            ],
        }
        : undefined;

    useEffect(() => {
        getFilter();
        const userTypeNum = profile ? +profile.type : 0;
        if (userTypeNum === userType.ADMIN || userTypeNum === userType.CUSTOMER) {
            void (async () => {
                const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.REPORT_FAULTS}/markAllReportFaultsOpened`,
                    'PATCH',
                    {},
                );
                if (res?.code === 1) {
                    refreshDashboard();
                }
            })();
        }
        return () => {
            dispatch(actions.clearData());
            refreshDashboard();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!modalType || !row) return;
        if (
            modalType === actionType.UPDATE ||
            modalType === actionType.ADD_ITEM ||
            modalType === actionType.UPDATE_ITEM
        ) {
            void markFaultOpenedForViewer(row);
        }
    }, [modalType, row, markFaultOpenedForViewer]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        const faultIdParam = new URLSearchParams(location.search).get("faultId");
        if (faultIdParam) {
            setPage(1);
        }
        fetchList(
            faultIdParam ? 1 : page,
            limit,
            "createdAt",
            "DESC",
            faultIdParam
                ? { clearDateFilter: true, faultId: +faultIdParam }
                : { clearDateFilter: true },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (!linkedFaultId || loading) return;
        const match = listRows.find((r: any) => reportFaultIdOf(r) === linkedFaultId);
        if (match) {
            scrollToHighlightedRow();
            void openFaultView(match);
        }
    }, [linkedFaultId, loading, listRows, scrollToHighlightedRow, openFaultView]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("create") !== "1") return;
        if (+profile?.type === userType.STAFF) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.ADD, row: undefined } });
        }
        history.replace({ pathname: "/report-faults", search: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    const searchButton = (
        <ActionBtn
            type="primary"
            onClick={() => handleOnClick(actionType.SEARCH)}
            loading={loading}
            icon={<SearchOutlined />}
            style={isMobilePortrait ? { width: "100%" } : undefined}
        >
            {intl.formatMessage({ id: "sidebar.users.search" })}
        </ActionBtn>
    );

    const mobileDarkFieldStyle: React.CSSProperties | undefined = mobileUiDark
        ? { background: "#141414", borderColor: "#444444", color: "#ffffff" }
        : undefined;
    const mobileDarkBtnDefaultStyle: React.CSSProperties | undefined = mobileUiDark
        ? { background: "#141414", borderColor: "#333333", color: "#ffffff" }
        : undefined;

    const newFaultButton =
        +profile?.type === userType.STAFF ? (
            <ActionListBtn
                onClick={() => handleOnClick(actionType.ADD)}
                type="primary"
                icon={<FileAddOutlined />}
                style={isMobilePortrait ? staffPrimaryGreen : undefined}
            >
                {intl.formatMessage({ id: "sidebar.users.new" })}
            </ActionListBtn>
        ) : null;

    const ActionBTN = () => (
        <ButtonDiv>
            {searchButton}
            {!isMobilePortrait ? newFaultButton : null}
        </ButtonDiv>
    );

    const mobilePortraitBleed: React.CSSProperties = isMobilePortrait
        ? {
              paddingTop: faultsPageDark ? 0 : 8,
              paddingBottom: 16,
              marginLeft: 0,
              marginRight: 0,
              paddingLeft: 8,
              paddingRight: 8,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              background: faultsPageDark ? "#000000" : "#ffffff",
          }
        : { paddingTop: 8 };

    return (
        <Layout title="sidebar.reportFaults">
            {faultsPageDark ? <ReportsMobileDarkPageStyles /> : null}
            <GlobalHotKeys
                keyMap={{ SEARCH_REPORT_FAULTS: "ctrl+alt+f" }}
                handlers={{
                    SEARCH_REPORT_FAULTS: (e: any) => {
                        e.preventDefault();
                        handleResetSearch(page, limit);
                    },
                }}
                allowChanges={true}
            />
            <UsersDiv
                style={mobilePortraitBleed}
                className={`report-faults-list-wrap${
                    isMobilePortrait ? " report-faults-list-wrap--mobile-portrait" : ""
                }${faultsPageDark ? " new-reports-page-dark new-reports-theme-dark" : ""}`}
            >
                <div
                    className={`new-reports-list-filters${
                        mobileUiDark ? " new-reports-list-filters--dark" : ""
                    }`}
                    style={{ width: "100%" }}
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
                            {newFaultButton}
                        </div>
                    ) : null}
                    <Form
                        form={form}
                        layout="vertical"
                        style={
                            isMobilePortrait && !listFiltersOpen
                                ? { display: "none", width: "100%", marginBottom: 0 }
                                : {
                                      width: "100%",
                                      marginBottom: 16,
                                      ...(isMobilePortrait
                                          ? { display: "flex", flexDirection: "column", gap: 0 }
                                          : {}),
                                  }
                        }
                        className={[
                            isMobilePortrait && !listFiltersOpen
                                ? "new-reports-list-filters-form--collapsed"
                                : "",
                            mobileUiDark ? "new-reports-list-filters-form--dark" : "",
                            isMobilePortrait ? "report-faults-mobile-filters-form" : "",
                        ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                    >
                        {isMobilePortrait ? (
                            <>
                                <Form.Item
                                    name={["rangeDate", 0]}
                                    label="Date from"
                                    className="break-line report-faults-filter-date"
                                    style={{ width: "100%", marginBottom: 12 }}
                                >
                                    <div className={mobileUiDark ? "nr-dark-picker-shell" : undefined}>
                                        <DatePicker
                                            className={
                                                mobileUiDark ? "nr-mobile-dark-field" : undefined
                                            }
                                            popupClassName={
                                                mobileUiDark ? "nr-mobile-dark-calendar" : undefined
                                            }
                                            format="DD/MM/YYYY"
                                            placeholder="Start date"
                                            style={{ width: "100%", ...mobileDarkFieldStyle }}
                                        />
                                    </div>
                                </Form.Item>
                                <Form.Item
                                    name={["rangeDate", 1]}
                                    label="Date to"
                                    className="break-line report-faults-filter-date"
                                    style={{ width: "100%", marginBottom: 12 }}
                                >
                                    <div className={mobileUiDark ? "nr-dark-picker-shell" : undefined}>
                                        <DatePicker
                                            className={
                                                mobileUiDark ? "nr-mobile-dark-field" : undefined
                                            }
                                            popupClassName={
                                                mobileUiDark ? "nr-mobile-dark-calendar" : undefined
                                            }
                                            format="DD/MM/YYYY"
                                            placeholder="End date"
                                            style={{ width: "100%", ...mobileDarkFieldStyle }}
                                        />
                                    </div>
                                </Form.Item>
                                <Form.Item
                                    name="keyword"
                                    label={intl.formatMessage({ id: "form.filter.keyword" })}
                                    className="break-line report-faults-filter-keyword"
                                    style={{ width: "100%", marginBottom: 12 }}
                                >
                                    <Input
                                        className={
                                            mobileUiDark ? "nr-mobile-dark-field" : undefined
                                        }
                                        maxLength={200}
                                        allowClear={false}
                                        autoComplete="off"
                                        placeholder={intl.formatMessage({ id: "form.filter.keyword" })}
                                        style={{ width: "100%", ...mobileDarkFieldStyle }}
                                    />
                                </Form.Item>
                                <div className="report-faults-filter-search">{searchButton}</div>
                            </>
                        ) : (
                            <StatusRow>
                                <Col md={20} sm={20} xs={24}>
                                    <Row gutter={12}>
                                        <Col md={10} sm={12} xs={24}>
                                            <Fieldset>
                                                <Form.Item
                                                    name="rangeDate"
                                                    label="Date from - Date to"
                                                    className="break-line"
                                                >
                                                    <RangePicker
                                                        className={
                                                            mobileUiDark
                                                                ? "range-picker nr-mobile-dark-field"
                                                                : "range-picker"
                                                        }
                                                        popupClassName={
                                                            mobileUiDark ? "nr-mobile-dark-calendar" : undefined
                                                        }
                                                        style={{
                                                            width: "100%",
                                                            ...mobileDarkFieldStyle,
                                                        }}
                                                        ranges={{
                                                            Today: [moment(), moment()],
                                                            Yesterday: [
                                                                moment().subtract(1, "days"),
                                                                moment().subtract(1, "days"),
                                                            ],
                                                            "Last 3 days": [
                                                                moment().subtract(3, "days"),
                                                                moment(),
                                                            ],
                                                            "This month": [
                                                                moment().startOf("month"),
                                                                moment().endOf("month"),
                                                            ],
                                                        }}
                                                    />
                                                </Form.Item>
                                            </Fieldset>
                                        </Col>
                                        <Col md={10} sm={12} xs={24}>
                                            <Fieldset>
                                                <FormInput
                                                    name="keyword"
                                                    label={intl.formatMessage({
                                                        id: "form.filter.keyword",
                                                    })}
                                                    Max={200}
                                                    classNameInput={
                                                        mobileUiDark ? "nr-mobile-dark-field" : undefined
                                                    }
                                                    style={mobileDarkFieldStyle}
                                                />
                                            </Fieldset>
                                        </Col>
                                    </Row>
                                </Col>
                                <Col
                                    md={4}
                                    sm={4}
                                    xs={24}
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        alignItems: "flex-end",
                                    }}
                                >
                                    <ActionBTN />
                                </Col>
                            </StatusRow>
                        )}
                    </Form>
                </div>
                {!isMobilePortrait ? <UsernameRow /> : null}
                <InformationDiv style={isMobilePortrait ? { overflow: "visible" } : undefined}>
                    {canUseBulkDelete ? (
                        <div
                            className={
                                isMobilePortrait
                                    ? `new-reports-bulk-bar--mobile${mobileUiDark ? " new-reports-bulk-bar--dark" : ""}`
                                    : mobileUiDark
                                      ? "new-reports-bulk-bar--dark"
                                      : undefined
                            }
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: isMobilePortrait ? "stretch" : "center",
                                flexDirection: isMobilePortrait ? "column" : undefined,
                                gap: 12,
                                marginBottom: 12,
                                padding: "12px 14px",
                                borderRadius: mobileUiDark ? 8 : 10,
                                ...(mobileUiDark
                                    ? {
                                          background: "#1a1a1a",
                                          border: "1px solid #444444",
                                          boxShadow: "none",
                                      }
                                    : isMobilePortrait
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
                                Select faults:
                            </Typography.Text>
                            <div
                                className={
                                    mobileUiDark ? "nr-bulk-select-wrap nr-dark-select-shell" : undefined
                                }
                                style={
                                    isMobilePortrait
                                        ? { width: "100%", minWidth: 0, maxWidth: "none" }
                                        : { minWidth: 280, flex: 1, maxWidth: 560 }
                                }
                            >
                                <Select
                                    mode="multiple"
                                    allowClear
                                    placeholder="Select one or more faults on this page"
                                    className={
                                        mobileUiDark
                                            ? "nr-mobile-dark-field nr-mobile-select-dark nr-bulk-select-dark"
                                            : undefined
                                    }
                                    popupClassName={mobileUiDark ? "nr-mobile-dark-dropdown" : undefined}
                                    dropdownStyle={mobileUiDark ? { background: "#141414" } : undefined}
                                    maxTagCount="responsive"
                                    style={
                                        isMobilePortrait || mobileUiDark
                                            ? { width: "100%", maxWidth: "none" }
                                            : { width: "100%" }
                                    }
                                    options={faultSelectOptions}
                                    value={selectedRowKeys}
                                    onChange={(keys) => setSelectedRowKeys(keys)}
                                    disabled={bulkDeleting || loading || !faultSelectOptions.length}
                                    optionFilterProp="label"
                                />
                            </div>
                            <Popconfirm
                                title={
                                    profileType === userType.ADMIN
                                        ? `Delete ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"}?`
                                        : `Remove ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"} from your list?`
                                }
                                okText={intl.formatMessage({ id: "button.Yes" })}
                                cancelText={intl.formatMessage({ id: "button.No" })}
                                disabled={!selectedRowKeys.length || bulkDeleting}
                                onConfirm={deleteSelectedFaults}
                            >
                                <Button
                                    danger
                                    block={isMobilePortrait}
                                    className={mobileUiDark ? "nr-mobile-bulk-remove-btn" : undefined}
                                    icon={<DeleteOutlined />}
                                    loading={bulkDeleting}
                                    disabled={!selectedRowKeys.length || bulkDeleting}
                                    style={isMobilePortrait ? { width: "100%" } : undefined}
                                >
                                    {profileType === userType.ADMIN ? "Delete selected" : "Remove selected"}
                                    {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                </Button>
                            </Popconfirm>
                        </div>
                    ) : null}
                    {isMobilePortrait ? (
                        <Spin spinning={loading}>
                            {!loading && listRows.length === 0 ? (
                                <Empty
                                    description={intl.formatMessage({ id: "sidebar.users.no_data" })}
                                    style={{ margin: "32px 0" }}
                                />
                            ) : (
                                <MobileFaultsList $dark={mobileUiDark}>
                                    {listRows.map(renderMobileFaultCard)}
                                </MobileFaultsList>
                            )}
                            {count > 0 ? (
                                <Pagination
                                    className="new-reports-mobile-pagination"
                                    current={page}
                                    pageSize={limit}
                                    total={count}
                                    size="small"
                                    showSizeChanger={false}
                                    showTotal={(t) => `${t} faults`}
                                    onChange={(p) => handleResetSearch(p, limit)}
                                    style={{ marginTop: 16, textAlign: "center" }}
                                />
                            ) : null}
                        </Spin>
                    ) : (
                    <TableComponent
                        heightTable="650px"
                        tableClassName={
                            [
                                isMobilePortrait ? "report-faults-table--mobile-portrait" : "",
                                mobileUiDark ? "report-faults-table--dark" : "",
                            ]
                                .filter(Boolean)
                                .join(" ") || undefined
                        }
                        onTableChange={onTableChange}
                        columns={columns}
                        keys="listRowId"
                        page={page}
                        count={count}
                        limit={limit}
                        data={listRows}
                        loading={loading}
                        rowSelection={rowSelection}
                        onRow={(record) => ({
                            onClick: (e: React.MouseEvent) => {
                                const el = e.target as HTMLElement;
                                if (
                                    el.closest(
                                        ".report-fault-read-status, .report-fault-read-status-cell, .ant-checkbox-wrapper, .ant-table-selection-column",
                                    )
                                ) {
                                    return;
                                }
                                openFaultView(record);
                            },
                            style: { cursor: "pointer" },
                        })}
                        rowClassName={(record) =>
                            linkedFaultId && reportFaultIdOf(record) === linkedFaultId
                                ? "report-row-highlight"
                                : ""
                        }
                    />
                    )}
                </InformationDiv>
            </UsersDiv>

            {modalType && (modalType === actionType.ADD || modalType === actionType.UPDATE) ? (
                <ReportFaultModal
                    title={modalType === actionType.ADD ? "Create Report Fault" : "Update Report Fault"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                    sites={sites}
                    uiDark={modalUiDark}
                />
            ) : null}

            {modalType &&
            (modalType === actionType.ADD_ITEM || modalType === actionType.UPDATE_ITEM) &&
            +profile?.type === userType.STAFF ? (
                <ReportFaultAnswerModal
                    title={modalType === actionType.ADD_ITEM ? "Add new answer" : "Update answer"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                />
            ) : null}

            <FaultReportViewModal
                open={viewFaultOpen}
                onClose={closeFaultView}
                record={viewFaultRow}
                viewerType={profile ? +profile.type : 0}
                renderStatus={(r, vt) => renderFaultStatus(r, vt, false)}
                renderPriority={(p) => renderFaultPriority(p, false, true)}
                readStatusNode={
                    showReadUnread && viewFaultRow ? (
                        <FaultReadStatusCell
                            row={viewFaultRow}
                            viewerType={profileType}
                            markingUnread={markingUnreadFaultId === reportFaultIdOf(viewFaultRow)}
                            onMarkUnread={markFaultUnread}
                        />
                    ) : null
                }
            />
        </Layout>
    );
};

export default ReportFaults;
