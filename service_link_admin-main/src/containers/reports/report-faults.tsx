/* eslint-disable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps */
import {
    CheckCircleFilled,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FileAddOutlined,
    MailOutlined,
    MessageOutlined,
    SearchOutlined,
    FilterOutlined,
    DownOutlined,
    UpOutlined,
    UndoOutlined,
} from "@ant-design/icons";
import {
    ActionBtn,
    ActionListBtn,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Image, DatePicker, Input, Tooltip, Spin, message, Button, Select, Typography, Table, Empty, Pagination, Checkbox, Tabs } from "antd";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import TasksFaultsPanel from "@app/components/report-faults/tasks-faults-panel";
import { FaultListStatusBadge } from "@app/components/report-faults/delegation-outcome";
import { FaultPriorityCell } from "@app/components/report-faults/fault-priority-cell";
import { FaultMedia, isFaultVideoUrl } from "@app/components/report-faults/fault-media";
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

type ReportFaultMainTab = "list" | "urgent" | "deleted";

const faultTabFromUrl = (tab: string | null): ReportFaultMainTab => {
    if (tab === "urgent" || tab === "tasks-faults") return "urgent";
    if (tab === "deleted") return "deleted";
    return "list";
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

type FaultListSort = { orderBy: string; orderValue: string };

const faultColumnSortOrder = (
    listSort: FaultListSort,
    field: string,
): "ascend" | "descend" | undefined => {
    if (listSort.orderBy !== field) return undefined;
    return listSort.orderValue === "ASC" ? "ascend" : "descend";
};

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
    const { loading, rows: reduxRows, row, success, modalType, count, loadingAction, lastQuery } =
        useSelector((state: any) => state?.reportFaults);
    const dispatch = useDispatch();
    const [sites, setSites] = useState<any[]>([]);
    const [viewFaultOpen, setViewFaultOpen] = useState(false);
    const [viewFaultRow, setViewFaultRow] = useState<any | null>(null);
    const [listRows, setListRows] = useState<any[]>([]);
    const [markingUnreadFaultId, setMarkingUnreadFaultId] = useState<number | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [mainFaultTab, setMainFaultTab] = useState<ReportFaultMainTab>(() => {
        if (typeof window === "undefined") return "list";
        const tab = new URLSearchParams(window.location.search).get("tab");
        return faultTabFromUrl(tab);
    });
    const [deletedFaultCount, setDeletedFaultCount] = useState(0);
    const [clearingDeleted, setClearingDeleted] = useState(false);
    const [listSort, setListSort] = useState({ orderBy: "createdAt", orderValue: "DESC" });
    const isMobilePortrait = useMobilePortrait();
    const showMobileFaultCards = isMobilePortrait || useNarrowViewport();
    const { isDark } = useColorModeOptional();
    const faultsPageDark = isDark && showMobileFaultCards;
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

    const profileRaw = localStorage.getItem('profile');
    let profile: any = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    const refreshDashboard = useCallback(() => {
        dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
    }, [dispatch]);

    const loadSitesFilter = useCallback(async () => {
        const sitesRes = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getSites`, 'GET');
        if (sitesRes?.data) {
            setSites(sitesRes.data);
        }
    }, []);

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
            setListRows((prev) => {
                const target = prev.find((r) => reportFaultIdOf(r) === faultId);
                if (!target || target[field]) return prev;
                return prev.map((r) =>
                    reportFaultIdOf(r) === faultId ? { ...r, [field]: now } : r,
                );
            });
            setViewFaultRow((prev) => {
                if (!prev || reportFaultIdOf(prev) !== faultId || prev[field]) return prev;
                return { ...prev, [field]: now };
            });
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

    const listRowsRef = useRef(listRows);
    listRowsRef.current = listRows;
    const markFaultOpenedInFlightRef = useRef<Set<number>>(new Set());
    const markFaultOpenedDoneRef = useRef<Set<number>>(new Set());
    const markedModalFaultIdRef = useRef<number | null>(null);

    const markFaultOpenedForViewer = useCallback(
        async (recordOrId: any) => {
            const faultId =
                typeof recordOrId === 'number' ? recordOrId : reportFaultIdOf(recordOrId);
            if (!faultId) return false;
            if (markFaultOpenedDoneRef.current.has(faultId)) return true;
            if (markFaultOpenedInFlightRef.current.has(faultId)) return false;

            const userTypeNum = +profile?.type;
            const openedField =
                userTypeNum === userType.ADMIN
                    ? 'adminOpenedAt'
                    : userTypeNum === userType.CUSTOMER
                        ? 'customerOpenedAt'
                        : null;
            const record =
                typeof recordOrId === 'number'
                    ? listRowsRef.current.find((r) => reportFaultIdOf(r) === faultId)
                    : recordOrId;
            if (openedField && record?.[openedField]) {
                markFaultOpenedDoneRef.current.add(faultId);
                return true;
            }

            let markPath: string | null = null;
            if (faultId && userTypeNum === userType.ADMIN) {
                markPath = `${endPoint.REPORT_FAULTS}/markAdminOpened/${faultId}`;
            } else if (faultId && userTypeNum === userType.CUSTOMER) {
                markPath = `${endPoint.REPORT_FAULTS}/markCustomerOpened/${faultId}`;
            }
            if (!markPath) return false;

            markFaultOpenedInFlightRef.current.add(faultId);
            patchFaultReadState(faultId);
            try {
                const res = await callAPIAsync(serviceType.COMMON, markPath, 'PATCH', {});
                if (res?.code === 1) {
                    markFaultOpenedDoneRef.current.add(faultId);
                    refreshDashboard();
                    return true;
                }
                return false;
            } finally {
                markFaultOpenedInFlightRef.current.delete(faultId);
            }
        },
        [profile, patchFaultReadState, refreshDashboard],
    );

    const linkedFaultAutoOpenedRef = useRef<number | null>(null);

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
        const params = new URLSearchParams(location.search);
        if (params.get('faultId')) {
            const returnTo = params.get('returnTo');
            if (returnTo === 'urgent' || returnTo === 'tasks-faults') {
                setMainFaultTab('urgent');
                history.replace({ pathname: '/report-faults', search: 'tab=urgent' });
            } else {
                history.replace({ pathname: '/report-faults', search: '' });
            }
        }
    }, [history, location.search]);

    const profileType = profile ? +profile.type : 0;
    const isAdminUser = profileType === userType.ADMIN;
    const hasSearchFilters = useMemo(() => {
        if (!lastQuery || lastQuery.faultId) return false;
        const keyword = String(lastQuery.keyword ?? "").trim();
        const hasDates = Boolean(
            String(lastQuery.startDate ?? "").trim() && String(lastQuery.endDate ?? "").trim(),
        );
        return Boolean(keyword || hasDates);
    }, [lastQuery]);
    const searchResultsSummary =
        hasSearchFilters && !loading ? (
            <p
                style={{
                    margin: "0 0 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: mobileUiDark ? "rgba(255,255,255,0.72)" : "#595959",
                }}
            >
                {count === 0
                    ? "No faults match your search"
                    : `${count.toLocaleString()} fault${count === 1 ? "" : "s"} found`}
            </p>
        ) : null;
    const showReportFaultMainTabs =
        profileType === userType.CUSTOMER || profileType === userType.ADMIN;
    const isUrgentReportsTab = showReportFaultMainTabs && mainFaultTab === "urgent";
    const isDeletedFaultTab = isAdminUser && mainFaultTab === "deleted";
    const showFaultDeletedTabs = isAdminUser;

    useEffect(() => {
        const raw = reduxRows || [];
        setListRows(
            isDeletedFaultTab
                ? raw.filter((r) => +r.status === reportFaultStatus.DELETED)
                : raw.filter((r) => +r.status !== reportFaultStatus.DELETED),
        );
    }, [reduxRows, isDeletedFaultTab]);

    const showReadUnread =
        profileType === userType.ADMIN || profileType === userType.CUSTOMER;

    const canUseBulkDelete =
        (isDeletedFaultTab && isAdminUser) ||
        (!isDeletedFaultTab &&
            (profileType === userType.ADMIN ||
                profileType === userType.CUSTOMER ||
                profileType === userType.STAFF));

    const canBulkDeleteRow = useCallback(
        (record: any) => {
            if (isDeletedFaultTab && isAdminUser) {
                return Boolean(reportFaultIdOf(record));
            }
            return canDeleteReportFault(profile, record);
        },
        [profile, isDeletedFaultTab, isAdminUser],
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

    const onPriorityUpdated = useCallback((payload?: { id?: number; priority?: number }) => {
        if (payload?.id == null || payload.priority == null) return;
        const faultId = +payload.id;
        setListRows((prev) =>
            prev.map((r) => (reportFaultIdOf(r) === faultId ? { ...r, priority: payload.priority } : r)),
        );
        setViewFaultRow((prev) =>
            prev && reportFaultIdOf(prev) === faultId ? { ...prev, priority: payload.priority } : prev,
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
                                        ".report-fault-read-status, .report-fault-priority-cell, .ant-checkbox-wrapper, .report-faults-row-actions, .ant-btn, .btnLink, button",
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
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
                                <div className="report-fault-priority-cell" onClick={stopRowOpen} onMouseDown={stopRowOpen}>
                                    <FaultPriorityCell
                                        record={record}
                                        profileType={profileType}
                                        staffUserId={profile?.id}
                                        isDeletedTab={isDeletedFaultTab}
                                        onUpdated={onPriorityUpdated}
                                        small
                                    />
                                </div>
                                <FaultListStatusBadge record={record} />
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
            isDeletedFaultTab,
            onPriorityUpdated,
            profile?.id,
        ],
    );

    const renderFaultActionCell = (record: any) => (
        <div className="report-faults-row-actions" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View">
                <ButtonMR className="btnLink" onClick={() => openFaultView(record)}>
                    <EyeOutlined />
                </ButtonMR>
            </Tooltip>
            {+profile?.type === userType.STAFF && checkRole("EDIT") ? (
                <ButtonMR onClick={() => handleOnClick(actionType.UPDATE, record)} className="btnLink">
                    <EditOutlined />
                </ButtonMR>
            ) : null}
            {+profile?.type === userType.STAFF &&
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
            {(+profile?.type === userType.CUSTOMER || +profile?.type === userType.ADMIN) ? (
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
            {isDeletedFaultTab && isAdminUser ? (
                <Popconfirm
                    title="Restore this fault to the Report faults list?"
                    okText="Restore"
                    cancelText={intl.formatMessage({ id: "button.No" })}
                    placement="topRight"
                    onConfirm={() => void restoreFault(record)}
                >
                    <button type="button" className="btnLink" title="Restore fault">
                        <UndoOutlined />
                    </button>
                </Popconfirm>
            ) : null}
            {canDeleteReportFault(profile, record) ? (
                <Popconfirm
                    title={
                        isDeletedFaultTab && isAdminUser
                            ? "Permanently delete this fault?"
                            : profileType === userType.ADMIN
                              ? "Move this fault to Deleted?"
                              : intl.formatMessage({ id: "notification.confirm_delete" })
                    }
                    okText={
                        isDeletedFaultTab && isAdminUser
                            ? "Delete permanently"
                            : profileType === userType.ADMIN
                              ? "Move to Deleted"
                              : intl.formatMessage({ id: "button.Yes" })
                    }
                    cancelText={intl.formatMessage({ id: "button.No" })}
                    placement="topRight"
                    onConfirm={() => {
                        dispatch(
                            actions.saveInto(
                                {
                                    id: reportFaultIdOf(record),
                                    // Admin always deletes the whole fault (→ Deleted tab), not one message row.
                                    ...(profileType === userType.ADMIN
                                        ? {}
                                        : { answerId: record?.answerId }),
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
        title: isMobilePortrait ? "" : "Read",
        key: "readStatus",
        columnKey: "readStatus",
        dataIndex: "readStatus",
        width: isMobilePortrait ? 44 : 72,
        align: "center" as const,
        sorter: true,
        sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
        sortOrder: faultColumnSortOrder(listSort, "readStatus"),
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

    const statusColumn = {
        title: "Status",
        key: "listStatus",
        columnKey: "listStatus",
        dataIndex: "listStatus",
        width: isMobilePortrait ? 88 : 120,
        sorter: true,
        sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
        sortOrder: faultColumnSortOrder(listSort, "listStatus"),
        render: (_: unknown, r: any) => <FaultListStatusBadge record={r} />,
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
                    title: "Date",
                    key: "createdAt",
                    columnKey: "createdAt",
                    dataIndex: "createdAt",
                    width: 84,
                    sorter: true,
                    sortOrder: faultColumnSortOrder(listSort, "createdAt"),
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
                    key: "issue",
                    columnKey: "issue",
                    dataIndex: "issue",
                    width: 88,
                    ellipsis: true,
                    sorter: true,
                    sortOrder: faultColumnSortOrder(listSort, "issue"),
                    render: (_: string, r: any) => r.issue || r.subject || "—",
                },
                {
                    title: "Message",
                    key: "message",
                    columnKey: "message",
                    dataIndex: "message",
                    ellipsis: true,
                    sorter: true,
                    sortOrder: faultColumnSortOrder(listSort, "message"),
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
                            return isFaultVideoUrl(urls[0]) ? (
                                <FaultMedia url={urls[0]} width={48} height={32} controls={false} />
                            ) : (
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
                {
                    title: "Priority",
                    key: "priority",
                    columnKey: "priority",
                    dataIndex: "priority",
                    width: 88,
                    sorter: true,
                    sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
                    sortOrder: faultColumnSortOrder(listSort, "priority"),
                    onCell: () => ({
                        className: "report-fault-priority-cell",
                        onClick: stopRowOpen,
                        onMouseDown: stopRowOpen,
                    }),
                    render: (_: string, r: any) => (
                        <FaultPriorityCell
                            record={r}
                            profileType={profileType}
                            staffUserId={profile?.id}
                            isDeletedTab={isDeletedFaultTab}
                            onUpdated={onPriorityUpdated}
                            small
                        />
                    ),
                },
                statusColumn,
                actionColumn,
            ];
        }

        return [
            {
                title: "Date",
                key: "createdAt",
                columnKey: "createdAt",
                dataIndex: "createdAt",
                width: 155,
                sorter: true,
                sortOrder: faultColumnSortOrder(listSort, "createdAt"),
                render: (_: string, r: any) => {
                    const t = r?.createdAt;
                    return t ? moment(t).utcOffset(600).format(dateTimeFormat) : "—";
                },
            },
            { title: "Site name", key: "siteName", columnKey: "siteName", dataIndex: "siteName", sorter: true, sortOrder: faultColumnSortOrder(listSort, "siteName") },
            ...(profileType === userType.ADMIN
                ? [
                    {
                        title: "Customer name",
                        key: "companyName",
                        columnKey: "companyName",
                        dataIndex: "companyName",
                        sorter: true,
                        sortOrder: faultColumnSortOrder(listSort, "companyName"),
                        render: (_: string, r: any) => r.companyName || r.customerName || "",
                    },
                ]
                : []),
            {
                title: "Issue",
                key: "issue",
                columnKey: "issue",
                dataIndex: "issue",
                sorter: true,
                sortOrder: faultColumnSortOrder(listSort, "issue"),
                render: (_: string, r: any) => r.issue || r.subject || "—",
            },
            {
                title: "Message",
                key: "message",
                columnKey: "message",
                dataIndex: "message",
                width: 320,
                sorter: true,
                sortOrder: faultColumnSortOrder(listSort, "message"),
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
                        return JSON.parse(r.attachFiles).map((url: string, i: number) =>
                            isFaultVideoUrl(url) ? (
                                <FaultMedia key={i} url={url} width={90} height={50} />
                            ) : (
                                <Image key={i} src={url} width={50} height={50} />
                            ),
                        );
                    } catch {
                        return null;
                    }
                },
            },
            ...(+profile?.type !== userType.STAFF
                ? [{
                    title: "Service name",
                    key: "serviceName",
                    columnKey: "serviceName",
                    dataIndex: "serviceName",
                    sorter: true,
                    sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
                    sortOrder: faultColumnSortOrder(listSort, "serviceName"),
                }]
                : []),
            ...(showReadUnread ? [readStatusColumn] : []),
            {
                title: "Priority",
                key: "priority",
                columnKey: "priority",
                dataIndex: "priority",
                width: 120,
                sorter: true,
                sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
                sortOrder: faultColumnSortOrder(listSort, "priority"),
                onCell: () => ({
                    className: "report-fault-priority-cell",
                    onClick: stopRowOpen,
                    onMouseDown: stopRowOpen,
                }),
                render: (_: string, r: any) => (
                    <FaultPriorityCell
                        record={r}
                        profileType={profileType}
                        staffUserId={profile?.id}
                        isDeletedTab={isDeletedFaultTab}
                        onUpdated={onPriorityUpdated}
                    />
                ),
            },
            statusColumn,
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
        listSort,
        readStatusColumn,
        statusColumn,
        isDeletedFaultTab,
        onPriorityUpdated,
    ]);

    const handleOnClick = (action: string, rowData?: any): void => {
        if (action === actionType.SEARCH) {
            handleResetSearch(1, limit);
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
        tab: ReportFaultMainTab = mainFaultTab,
    ) => {
        const formData = form.getFieldsValue();
        const useDateRange = !options?.clearDateFilter && !options?.faultId && formData.rangeDate?.length > 1;
        const startDate = useDateRange ? moment(formData.rangeDate[0]).format('YYYY-MM-DD') : '';
        const endDate = useDateRange ? moment(formData.rangeDate[1]).format('YYYY-MM-DD') : '';
        const listTab = tab === "urgent" ? "list" : tab;
        return {
            keyword: formData?.keyword ? formData.keyword.trim() : '',
            page: pageNum,
            limit: limitNum,
            orderBy,
            orderValue,
            status: listTab === "deleted" ? reportFaultStatus.DELETED : 0,
            startDate,
            endDate,
            ...(options?.faultId ? { faultId: options.faultId } : {}),
        };
    };

    const loadDeletedFaultCount = useCallback(async () => {
        if (+profileType !== userType.ADMIN) return;
        try {
            const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.REPORT_FAULTS}/findAllGroupByDate`,
                "GET",
                {
                    keyword: "",
                    page: 1,
                    limit: 1,
                    orderBy: "createdAt",
                    orderValue: "DESC",
                    status: reportFaultStatus.DELETED,
                    startDate: "",
                    endDate: "",
                },
            );
            if (res?.code === 1) setDeletedFaultCount(res?.data?.count ?? 0);
        } catch {
            /* ignore */
        }
    }, [profileType]);

    const fetchList = (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = listSort.orderBy,
        orderValue: string = listSort.orderValue,
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
        if (showFaultDeletedTabs) void loadDeletedFaultCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);

    useEffect(() => {
        if (!showFaultDeletedTabs) return;
        void loadDeletedFaultCount();
    }, [showFaultDeletedTabs, loadDeletedFaultCount]);

    const linkedFetchOptions = useCallback(() => {
        const faultIdParam = new URLSearchParams(location.search).get("faultId");
        return faultIdParam
            ? { clearDateFilter: true as const, faultId: +faultIdParam }
            : undefined;
    }, [location.search]);

    const handleResetSearch = async (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = listSort.orderBy,
        orderValue: string = listSort.orderValue,
        options?: { clearDateFilter?: boolean; faultId?: number },
    ) => {
        try {
            await form.validateFields();
        } catch {
            // Allow search/refresh even when optional filter fields are empty
        }
        setPage(pageNum);
        setLimit(limitNum);
        fetchList(
            pageNum,
            limitNum,
            orderBy,
            orderValue,
            options ?? linkedFetchOptions(),
        );
    };

    useEffect(() => {
        if (new URLSearchParams(location.search).get("faultId")) return;
        setPage(1);
        setSelectedRowKeys([]);
        void handleResetSearch(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainFaultTab]);

    const onTableChange = (pagination: any, _filters: any, sorter: any, extra?: { action?: string }): void => {
        const nextPage = pagination?.current ?? page;
        const nextLimit = pagination?.pageSize ?? limit;

        if (extra?.action === "paginate") {
            setPage(nextPage);
            setLimit(nextLimit);
            fetchList(
                nextPage,
                nextLimit,
                listSort.orderBy,
                listSort.orderValue,
                { clearDateFilter: true },
            );
            return;
        }

        const colSorter = Array.isArray(sorter)
            ? [...sorter].reverse().find((s: { order?: string }) => s?.order) ?? sorter[sorter.length - 1]
            : sorter;
        const rawField =
            colSorter?.columnKey ??
            colSorter?.field ??
            (colSorter?.column as { dataIndex?: string | string[] } | undefined)?.dataIndex;
        if (rawField == null) return;

        const field = String(
            Array.isArray(rawField) ? rawField.join(".") : rawField,
        );
        const allowed = new Set([
            "createdAt",
            "issue",
            "siteName",
            "serviceName",
            "companyName",
            "customerName",
            "message",
            "priority",
            "readStatus",
            "listStatus",
        ]);
        if (!allowed.has(field)) return;

        let orderBy = field;
        let orderValue = "DESC";

        if (colSorter.order === "ascend") {
            orderValue = "ASC";
        } else if (colSorter.order === "descend") {
            orderValue = "DESC";
        } else if (field === "readStatus") {
            orderBy = "readStatus";
            orderValue =
                listSort.orderBy === "readStatus" && listSort.orderValue === "ASC"
                    ? "DESC"
                    : "ASC";
        } else if (field === "listStatus") {
            orderBy = "listStatus";
            orderValue =
                listSort.orderBy === "listStatus" && listSort.orderValue === "ASC"
                    ? "DESC"
                    : "ASC";
        } else if (colSorter.order == null || colSorter.order === false) {
            if (field === listSort.orderBy) {
                orderBy = "createdAt";
                orderValue = "DESC";
            } else {
                orderBy = field;
                orderValue = "ASC";
            }
        }

        const nextSort = { orderBy, orderValue };
        setListSort(nextSort);
        setPage(1);
        setLimit(nextLimit);
        fetchList(1, nextLimit, orderBy, orderValue, { clearDateFilter: true });
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
            if (isDeletedFaultTab && isAdmin) {
                const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.REPORT_FAULTS}/clear-deleted`,
                    "PATCH",
                    { ids: faultIds },
                );
                if (res?.code === 1) {
                    succeeded = +res?.data?.clearedCount || faultIds.length;
                } else {
                    failed = faultIds.length;
                }
            } else {
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
            }
            setSelectedRowKeys([]);
            await handleResetSearch(page, limit);
            void loadDeletedFaultCount();
            refreshDashboard();
            if (succeeded && !failed) {
                message.success(
                    isAdmin
                        ? isDeletedFaultTab
                            ? `${succeeded} fault${succeeded === 1 ? "" : "s"} permanently deleted`
                            : `${succeeded} fault${succeeded === 1 ? "" : "s"} moved to Deleted`
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
        isDeletedFaultTab,
        page,
        limit,
        refreshDashboard,
        handleResetSearch,
        loadDeletedFaultCount,
    ]);

    const clearDeletedFaults = useCallback(async () => {
        const faultIds = [
            ...new Set(
                listRows
                    .map((r) => reportFaultIdOf(r))
                    .filter((id) => Number.isFinite(+id) && +id > 0),
            ),
        ];
        if (!faultIds.length) {
            message.success("Deleted folder is already empty");
            return;
        }
        setClearingDeleted(true);
        try {
            const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.REPORT_FAULTS}/clear-deleted`,
                "PATCH",
                { ids: faultIds },
            );
            if (res?.code === 1) {
                const clearedCount = +res?.data?.clearedCount || faultIds.length;
                message.success(
                    `Permanently deleted ${clearedCount} fault${clearedCount === 1 ? "" : "s"}`,
                );
                setSelectedRowKeys([]);
                await handleResetSearch(page, limit);
                void loadDeletedFaultCount();
                refreshDashboard();
            } else {
                message.error(res?.message || "Could not permanently delete faults");
            }
        } finally {
            setClearingDeleted(false);
        }
    }, [listRows, page, limit, handleResetSearch, loadDeletedFaultCount, refreshDashboard]);

    const restoreFault = useCallback(
        async (record: any) => {
            const faultId = reportFaultIdOf(record);
            if (!faultId) return;
            const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.REPORT_FAULTS}/${faultId}/restore`,
                "PATCH",
                {},
            );
            if (res?.code === 1) {
                message.success("Fault restored to Report faults");
                setSelectedRowKeys((prev) =>
                    prev.filter((k) => {
                        const row = listRows.find((r) => r.listRowId === k);
                        return reportFaultIdOf(row) !== faultId;
                    }),
                );
                await handleResetSearch(page, limit);
                void loadDeletedFaultCount();
                refreshDashboard();
            } else {
                message.error(res?.message || "Could not restore this fault");
            }
        },
        [listRows, page, limit, handleResetSearch, loadDeletedFaultCount, refreshDashboard],
    );

    const restoreSelectedFaults = useCallback(async () => {
        const selectedRecords = selectedRowKeys
            .map((key) => listRows.find((r) => r.listRowId === key))
            .filter((r): r is NonNullable<typeof r> => Boolean(r && canBulkDeleteRow(r)));
        const faultIds = [...new Set(selectedRecords.map((r) => reportFaultIdOf(r)))];
        if (!faultIds.length) {
            message.warning("Select at least one fault to restore");
            return;
        }
        setBulkDeleting(true);
        let succeeded = 0;
        let failed = 0;
        try {
            for (const faultId of faultIds) {
                const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.REPORT_FAULTS}/${faultId}/restore`,
                    "PATCH",
                    {},
                );
                if (res?.code === 1) succeeded += 1;
                else failed += 1;
            }
            setSelectedRowKeys([]);
            await handleResetSearch(page, limit);
            void loadDeletedFaultCount();
            refreshDashboard();
            if (succeeded && !failed) {
                message.success(
                    `${succeeded} fault${succeeded === 1 ? "" : "s"} restored to Report faults`,
                );
            } else if (succeeded && failed) {
                message.warning(`${succeeded} restored, ${failed} failed`);
            } else {
                message.error("Could not restore selected faults");
            }
        } finally {
            setBulkDeleting(false);
        }
    }, [
        selectedRowKeys,
        listRows,
        canBulkDeleteRow,
        page,
        limit,
        handleResetSearch,
        loadDeletedFaultCount,
        refreshDashboard,
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
        void loadSitesFilter();
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
            const faultId = reportFaultIdOf(row);
            if (!faultId || markedModalFaultIdRef.current === faultId) return;
            markedModalFaultIdRef.current = faultId;
            void markFaultOpenedForViewer(faultId);
        }
    }, [modalType, row, markFaultOpenedForViewer]);

    useEffect(() => {
        if (!showReportFaultMainTabs) return;
        setMainFaultTab(faultTabFromUrl(new URLSearchParams(location.search).get("tab")));
    }, [location.search, showReportFaultMainTabs]);

    useEffect(() => {
        if (isUrgentReportsTab) return;
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        const faultIdParam = new URLSearchParams(location.search).get("faultId");
        if (faultIdParam) {
            setPage(1);
        }
        fetchList(
            faultIdParam ? 1 : page,
            limit,
            listSort.orderBy,
            listSort.orderValue,
            faultIdParam
                ? { clearDateFilter: true, faultId: +faultIdParam }
                : { clearDateFilter: true },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, isUrgentReportsTab]);

    useEffect(() => {
        if (isUrgentReportsTab) return;
        if (!linkedFaultId || loading) return;
        if (linkedFaultAutoOpenedRef.current === linkedFaultId) return;
        const match = listRows.find((r: any) => reportFaultIdOf(r) === linkedFaultId);
        if (match) {
            linkedFaultAutoOpenedRef.current = linkedFaultId;
            scrollToHighlightedRow();
            void openFaultView(match);
        }
    }, [linkedFaultId, loading, listRows, scrollToHighlightedRow, openFaultView, isUrgentReportsTab]);

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
        +profile?.type === userType.STAFF && !isDeletedFaultTab ? (
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

    const reportFaultMainTabsEl = showReportFaultMainTabs ? (
        <Tabs
            className={
                isMobilePortrait
                    ? `new-reports-mobile-tabs${mobileUiDark ? " new-reports-mobile-tabs--dark" : ""}`
                    : undefined
            }
            activeKey={mainFaultTab}
            onChange={(k) => {
                const next = k as ReportFaultMainTab;
                setMainFaultTab(next);
                setPage(1);
                setSelectedRowKeys([]);
                const params = new URLSearchParams(location.search);
                if (next === "urgent") {
                    params.set("tab", "urgent");
                    params.delete("faultId");
                } else if (next === "deleted") {
                    params.set("tab", "deleted");
                    params.delete("faultId");
                } else {
                    params.delete("tab");
                }
                const search = params.toString();
                history.replace({
                    pathname: "/report-faults",
                    search: search ? `?${search}` : "",
                });
            }}
            style={{ marginBottom: 12 }}
            items={[
                { key: "list", label: "Report faults" },
                { key: "urgent", label: "Urgent reports" },
                ...(isAdminUser
                    ? [{ key: "deleted", label: `Deleted (${deletedFaultCount})` }]
                    : []),
            ]}
        />
    ) : null;

    const onDelegationSaved = (delegation?: Record<string, unknown>) => {
        if (delegation?.id == null) return;
        const faultId = +delegation.id;
        const patch = {
            delegatedToType: delegation.delegatedToType,
            delegatedToPersonnelId: delegation.delegatedToPersonnelId,
            delegatedToStaffId: delegation.delegatedToStaffId,
            delegatedUntil: delegation.delegatedUntil,
            delegationNote: delegation.delegationNote,
            delegatedAt: delegation.delegatedAt,
            delegatedBy: delegation.delegatedBy,
            delegatedActedAt: delegation.delegatedActedAt,
            delegationViewedAt: delegation.delegationViewedAt,
            delegationOutcome: delegation.delegationOutcome,
            delegatedAssigneeName: delegation.delegatedAssigneeName,
            delegatedAssigneeRole: delegation.delegatedAssigneeRole,
        };
        setListRows((prev) =>
            prev.map((r) => (reportFaultIdOf(r) === faultId ? { ...r, ...patch } : r)),
        );
        setViewFaultRow((prev) =>
            prev && reportFaultIdOf(prev) === faultId ? { ...prev, ...patch } : prev,
        );
    };

    const onFaultCompleted = (payload?: Record<string, unknown>) => {
        if (payload?.id == null) return;
        const faultId = +payload.id;
        const patch = {
            status: payload.status,
            delegatedActedAt: payload.delegatedActedAt,
            delegationViewedAt: payload.delegationViewedAt,
            delegationOutcome: payload.delegationOutcome,
        };
        setListRows((prev) =>
            prev.map((r) => (reportFaultIdOf(r) === faultId ? { ...r, ...patch } : r)),
        );
        setViewFaultRow((prev) =>
            prev && reportFaultIdOf(prev) === faultId ? { ...prev, ...patch } : prev,
        );
    };

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
                    showMobileFaultCards ? " report-faults-list-wrap--mobile-portrait" : ""
                }${faultsPageDark ? " new-reports-page-dark new-reports-theme-dark" : ""}`}
            >
                {isUrgentReportsTab ? (
                    <TasksFaultsPanel tabsAboveTable={reportFaultMainTabsEl} />
                ) : (
                <>
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
                    {searchResultsSummary}
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
                            {isDeletedFaultTab && isAdminUser ? (
                                <Popconfirm
                                    title={`Restore ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"} to the Report faults list?`}
                                    okText="Restore"
                                    cancelText={intl.formatMessage({ id: "button.No" })}
                                    disabled={!selectedRowKeys.length || bulkDeleting}
                                    onConfirm={restoreSelectedFaults}
                                >
                                    <Button
                                        icon={<UndoOutlined />}
                                        loading={bulkDeleting}
                                        disabled={!selectedRowKeys.length || bulkDeleting}
                                        block={isMobilePortrait}
                                        style={isMobilePortrait ? { width: "100%" } : undefined}
                                    >
                                        Restore selected
                                        {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                    </Button>
                                </Popconfirm>
                            ) : null}
                            <Popconfirm
                                title={
                                    isDeletedFaultTab && isAdminUser
                                        ? `Permanently delete ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"}?`
                                        : profileType === userType.ADMIN
                                          ? `Move ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"} to Deleted?`
                                          : `Remove ${selectedRowKeys.length} selected fault${selectedRowKeys.length === 1 ? "" : "s"} from your list?`
                                }
                                okText={
                                    isDeletedFaultTab && isAdminUser
                                        ? "Delete permanently"
                                        : profileType === userType.ADMIN
                                          ? "Move to Deleted"
                                          : intl.formatMessage({ id: "button.Yes" })
                                }
                                cancelText={intl.formatMessage({ id: "button.No" })}
                                okButtonProps={
                                    isDeletedFaultTab && isAdminUser ? { danger: true } : undefined
                                }
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
                                    {isDeletedFaultTab && isAdminUser
                                        ? "Delete permanently"
                                        : profileType === userType.ADMIN
                                          ? "Move to Deleted"
                                          : "Remove selected"}
                                    {selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                </Button>
                            </Popconfirm>
                        </div>
                    ) : null}
                    {isDeletedFaultTab && isAdminUser ? (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                            <Popconfirm
                                title="Permanently delete all faults on this page?"
                                okText="Delete permanently"
                                okButtonProps={{ danger: true }}
                                cancelText="Cancel"
                                disabled={clearingDeleted || loading || deletedFaultCount === 0}
                                onConfirm={clearDeletedFaults}
                            >
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={clearingDeleted}
                                    disabled={clearingDeleted || loading || deletedFaultCount === 0}
                                    className={mobileUiDark ? "nr-mobile-bulk-remove-btn" : undefined}
                                >
                                    Delete all on page
                                </Button>
                            </Popconfirm>
                        </div>
                    ) : null}
                    {showReportFaultMainTabs ? reportFaultMainTabsEl : null}
                    {showMobileFaultCards ? (
                        <Spin spinning={loading}>
                            {!loading && listRows.length === 0 ? (
                                <Empty
                                    description={
                                        hasSearchFilters
                                            ? "No faults match your search"
                                            : isDeletedFaultTab
                                              ? "No deleted faults"
                                              : intl.formatMessage({ id: "sidebar.users.no_data" })
                                    }
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
                                    onChange={(p) => {
                                        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                                        void handleResetSearch(p, limit, listSort.orderBy, listSort.orderValue, {
                                            clearDateFilter: true,
                                        });
                                    }}
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
                        totalUnit="faults"
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
                </>
                )}
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
                onPriorityUpdated={onPriorityUpdated}
                isDeletedTab={isDeletedFaultTab}
                staffUserId={profile?.id}
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
                onDelegationSaved={onDelegationSaved}
                onFaultCompleted={onFaultCompleted}
            />
        </Layout>
    );
};

export default ReportFaults;
