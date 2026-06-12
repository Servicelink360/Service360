import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined,
    EyeOutlined,
    UserOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import { ActionListBtn, TableWrapper } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/sites/actions";
import TableComponent from "@app/components/common/Table/index";
import { checkRole, formatTime } from "../../library/helpers/utility";
import TaskLogModal from "@app/components/tasks/task-log";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset, ActionsWrapper } from "@app/components/common/container.style";
import SiteModal from "@app/components/sites";
import TaskModal from "@app/components/tasks";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { Link } from "react-router-dom";
import "./job-sites-table.css";
import SiteItemFrequencySection from "@app/components/sites/site-item-frequency-section";
import SiteItemFrequencyPanel from "@app/components/sites/site-item-frequency-panel";
import { isPersistedDbId } from "@app/library/helpers/persistedRecordId";

type IProps = {
    staffId?: number
}

const SITE_SORT_FIELDS = new Set([
    "name",
    "location",
    "addressName",
    "createdAt",
    "staffCount",
    "serviceCount",
    "customer",
    "checkInDistance",
]);

/** Fetch all sites once, paginate in UI — guarantees 33×2-service sites stay grouped. */
const FULL_LIST_SORT_FIELDS = new Set(["serviceCount", "staffCount", "customer"]);
const FETCH_ALL_SITES_LIMIT = 0;

const usesFullListSort = (orderBy: string) => FULL_LIST_SORT_FIELDS.has(orderBy);

const apiListLimit = (orderBy: string, pageLimit: number) =>
    usesFullListSort(orderBy) ? FETCH_ALL_SITES_LIMIT : pageLimit;

const apiListPage = (orderBy: string, pageNum: number) =>
    usesFullListSort(orderBy) ? 1 : pageNum;

const siteServiceCount = (row: any): number => {
    if (typeof row.serviceCount === "number") {
        return row.serviceCount;
    }
    return (row.items ?? []).filter((item: any) => {
        const hasService = !!(item?.service?.id ?? item?.serviceId ?? item?.Service?.id);
        const hasCustomer = !!(item?.customer?.id ?? item?.customerId ?? item?.customer);
        return hasService && hasCustomer;
    }).length;
};

const siteServiceNames = (row: any): string =>
    (row.items ?? [])
        .map((item: any) => item?.service?.name ?? item?.Service?.name)
        .filter(Boolean)
        .join(", ");

const resolveSortField = (sorter: any): string | null => {
    if (!sorter) {
        return null;
    }
    const raw =
        sorter.columnKey ??
        sorter.field ??
        sorter.column?.key ??
        sorter.column?.dataIndex;
    if (raw == null) {
        return null;
    }
    const field = String(Array.isArray(raw) ? raw[raw.length - 1] : raw);
    if (field === "customers") {
        return "customer";
    }
    return field;
};

const pickActiveSorter = (sorter: any): any => {
    if (!sorter) {
        return null;
    }
    if (Array.isArray(sorter)) {
        return (
            sorter.find((s: { order?: string }) => s?.order) ??
            sorter[sorter.length - 1]
        );
    }
    return sorter;
};

const siteCustomerLabels = (row: any): string => {
    const names = new Set<string>();
    for (const item of row.items ?? []) {
        const name =
            item.customer?.customerInfo?.companyName?.trim() ||
            item.customer?.fullName?.trim();
        if (name) {
            names.add(name);
        }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b)).join(", ");
};

const sortSiteRowsFullList = (
    siteRows: any[],
    orderBy: string,
    orderValue: string,
): any[] => {
    if (!siteRows?.length) {
        return siteRows;
    }
    const dir = orderValue === "ASC" ? 1 : -1;
    const sorted = [...siteRows];
    sorted.sort((a, b) => {
        let cmp = 0;
        switch (orderBy) {
            case "serviceCount":
                cmp = siteServiceCount(a) - siteServiceCount(b);
                break;
            case "staffCount": {
                const staffA =
                    typeof a.staffCount === "number"
                        ? a.staffCount
                        : new Set(
                              (a.items ?? []).flatMap((it: any) =>
                                  (it.staffs ?? [])
                                      .filter((s: any) => s.staff)
                                      .map((s: any) => s.staffId),
                              ),
                          ).size;
                const staffB =
                    typeof b.staffCount === "number"
                        ? b.staffCount
                        : new Set(
                              (b.items ?? []).flatMap((it: any) =>
                                  (it.staffs ?? [])
                                      .filter((s: any) => s.staff)
                                      .map((s: any) => s.staffId),
                              ),
                          ).size;
                cmp = staffA - staffB;
                break;
            }
            case "customer":
                cmp = siteCustomerLabels(a).localeCompare(siteCustomerLabels(b), undefined, {
                    sensitivity: "base",
                });
                break;
            default:
                return 0;
        }
        if (cmp === 0) {
            cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
                sensitivity: "base",
            });
        }
        return cmp * dir;
    });
    return sorted;
};

/** Server-side sort only � avoid Ant Design client re-sort; cycle ASC ? DESC only. */
const serverTableSorter = {
    sorter: () => 0,
    sortDirections: ["ascend", "descend"] as const,
};

const serverCountColumnSorter = {
    sorter: () => 0,
    sortDirections: ["descend", "ascend"] as const,
};

const JOB_SITES_LIST_LIMIT = 50;

const JobSite = (props: IProps) => {
    const [limit, setLimit] = useState(JOB_SITES_LIST_LIMIT);
    const [page, setPage] = useState(pageData);
    const [listSort, setListSort] = useState({ orderBy: "createdAt", orderValue: "DESC" });
    const [form] = Form.useForm();
    const intl = useIntl();
    const { staffId } = props;
    const { loading, rows, row, success, modalType, customers, count, loadingAction, services, staffs, reportTemplates } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();

    const sortOrderFor = useCallback(
        (field: string) =>
            listSort.orderBy === field
                ? (listSort.orderValue === "ASC" ? ("ascend" as const) : ("descend" as const))
                : undefined,
        [listSort.orderBy, listSort.orderValue],
    );

    const fetchSites = useCallback(
        (
            pageNum: number,
            limitNum: number,
            orderBy: string,
            orderValue: string,
        ) => {
            const keyword = (form.getFieldValue("Name") as string | undefined)?.trim() ?? "";
            dispatch(actions.getData({
                keyword,
                page: apiListPage(orderBy, pageNum),
                limit: apiListLimit(orderBy, limitNum),
                orderBy,
                orderValue,
                staffId: staffId ? staffId : 0,
            }));
        },
        [dispatch, form, staffId],
    );

    const loadSites = useCallback(
        (
            pageNum: number = page,
            limitNum: number = limit,
            orderBy: string = listSort.orderBy,
            orderValue: string = listSort.orderValue,
        ) => {
            fetchSites(pageNum, limitNum, orderBy, orderValue);
        },
        [fetchSites, limit, listSort.orderBy, listSort.orderValue, page],
    );

    const canEditSite = checkRole('ADMIN') || checkRole('EDIT');

    const sortedFullList = useMemo(() => {
        if (!usesFullListSort(listSort.orderBy) || !rows?.length) {
            return null;
        }
        return sortSiteRowsFullList(rows, listSort.orderBy, listSort.orderValue);
    }, [rows, listSort.orderBy, listSort.orderValue]);

    const displayRows = useMemo(() => {
        if (sortedFullList) {
            const start = (page - 1) * limit;
            return sortedFullList.slice(start, start + limit);
        }
        return rows ?? [];
    }, [sortedFullList, rows, page, limit]);

    const displayCount = sortedFullList ? sortedFullList.length : count;

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Job site name",
            key: "name",
            columnKey: "name",
            dataIndex: "name",
            ...serverTableSorter,
            sortOrder: sortOrderFor("name"),
            width: 200,
            render: (text, row) => {
                return text; //<Link to={"/site-detail?id=" + row.id}>{text}</Link>
            }
        },
        {
            title: 'Location',
            key: 'location',
            columnKey: 'location',
            dataIndex: "location",
            ...serverTableSorter,
            sortOrder: sortOrderFor('location'),
            width: 160,
        },
        {
            title: 'Check-in Distance',
            key: 'checkInDistance',
            columnKey: 'checkInDistance',
            dataIndex: 'checkInDistance',
            ...serverTableSorter,
            sortOrder: sortOrderFor('checkInDistance'),
            width: 130,
            render: (_text: string, row: any) => {
                const metres = row.checkInDistance ?? 500;
                return `${metres}m`;
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.address" }),
            key: "addressName",
            columnKey: "addressName",
            dataIndex: "addressName",
            ...serverTableSorter,
            sortOrder: sortOrderFor("addressName"),
            width: 200,
        },
        {
            title: "Staff",
            key: "staffCount",
            columnKey: "staffCount",
            dataIndex: "staffCount",
            ...serverCountColumnSorter,
            sortOrder: sortOrderFor("staffCount"),
            width: 100,
            render: (_text: string, row: any) => {
                let count = row.staffCount;
                if (typeof count !== "number") {
                    const ids = new Set<number>();
                    for (const item of row.items ?? []) {
                        for (const s of item.staffs ?? []) {
                            if (s.staff) ids.add(s.staffId);
                        }
                    }
                    count = ids.size;
                }
                return (
                    <span style={{ fontSize: 16 }}>
                        {count} <UserOutlined />
                    </span>
                );
            },
        },
        {
            title: "Services",
            key: "serviceCount",
            columnKey: "serviceCount",
            dataIndex: "serviceCount",
            ...serverCountColumnSorter,
            sortOrder: sortOrderFor("serviceCount"),
            width: 100,
            render: (_text: string, row: any) => {
                const count = siteServiceCount(row);
                const names = siteServiceNames(row);
                return (
                    <span style={{ fontSize: 16 }} title={names || undefined}>
                        {count} <AppstoreOutlined />
                    </span>
                );
            },
        },
        {
            title: "Customer",
            key: "customer",
            columnKey: "customer",
            dataIndex: "customers",
            ...serverTableSorter,
            sortOrder: sortOrderFor("customer"),
            width: 200,
            render: (_text: string, row: any) => siteCustomerLabels(row) || "",
        },
        {
            title: "Created by",
            width: 160,
            key: "createdAt",
            columnKey: "createdAt",
            dataIndex: "createdAt",
            ...serverTableSorter,
            sortOrder: sortOrderFor("createdAt"),
            render: (text: string, row: any) => {
                return (
                    <div>
                        <div>{row.createdUser ? row.createdUser?.fullName : ""}</div>
                        <div>{moment(row.createdAt).utcOffset(600).format(dateTimeFormat)}</div>
                    </div>
                );
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 83,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, row: any) => (
                <div>
                    {
                        checkRole('ADMIN') || checkRole('EDIT') ? <Link
                            to={"/site-detail?id=" + row.id}
                            target="_blank"
                            className="btnLink"
                            style={{ marginRight: 16 }}
                        >
                            <EyeOutlined />
                        </Link> : ""
                    }
                    {
                        checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.UPDATE, row);
                            }}
                            className="btnLink"
                        >
                            <EditOutlined />
                        </ButtonMR> : ""
                    }
                    {
                        checkRole('ADMIN') || checkRole('DELETE') ? <Popconfirm
                            title={intl.formatMessage({ id: "notification.confirm_delete", })}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id }, actionType.DELETE, false)); }}
                        >
                            <button className="btnDelete"  ><DeleteOutlined /> </button>
                        </Popconfirm> : ""
                    }
                </div>
            ),
        },
    ], [intl, sortOrderFor]); // eslint-disable-line react-hooks/exhaustive-deps

    const getDataInit = useCallback(
        (payload: string) => {
            dispatch(actions.getDataInit(payload));
        },
        [dispatch],
    );

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.ADD || modalType === actionType.VIEW || modalType === actionType.UPDATE_ITEM || modalType === actionType.UPDATE
            || modalType === actionType.SHIFT_MANAGEMENT || modalType === actionType.VIEW_LOG || modalType === actionType.UPDATE_TASK) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.ADD_ITEM) {

            dispatch({
                type: actions.MODAL, payload: {
                    modalType, row: {
                        siteItemId: row.id,
                        siteItem: { siteId: row.siteId },
                        staffs: row.staffs
                    }
                }
            });
        } else if (modalType === actionType.SEARCH) {
            setPage(1);
            loadSites(1, limit);
        } else {
            loadSites(page, limit);
        }
    };

    useEffect(() => {
        if (!success) {
            return;
        }
        loadSites(page, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);

    const handleResetSearch = async (
        pageNum: any = 1,
        limitNum: any = 100,
        orderBy: string = listSort.orderBy,
        orderValue: string = listSort.orderValue,
    ) => {
        try {
            await form.validateFields();
        } catch {
            return;
        }
        loadSites(pageNum, limitNum, orderBy, orderValue);
    };

    const onTableChange = (
        pagination: any,
        _filters: any,
        sorter: any,
        extra?: { action?: string },
    ): void => {
        const pageNum = pagination?.current ?? page;
        const limitNum = pagination?.pageSize ?? limit;
        setPage(pageNum);
        if (limitNum !== limit) {
            setLimit(limitNum);
        }

        if (extra?.action === "paginate") {
            if (!usesFullListSort(listSort.orderBy)) {
                fetchSites(pageNum, limitNum, listSort.orderBy, listSort.orderValue);
            }
            return;
        }

        const colSorter = pickActiveSorter(sorter);
        const sortField = resolveSortField(colSorter);
        const isSortClick =
            extra?.action === "sort" ||
            (!!colSorter?.order && sortField != null);

        if (!isSortClick || !sortField || !SITE_SORT_FIELDS.has(sortField)) {
            fetchSites(pageNum, limitNum, listSort.orderBy, listSort.orderValue);
            return;
        }

        const orderValue = colSorter.order === "ascend" ? "ASC" : "DESC";
        const nextSort = { orderBy: sortField, orderValue };
        setPage(1);
        setListSort(nextSort);
        fetchSites(1, limitNum, nextSort.orderBy, nextSort.orderValue);
    };

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        loadSites(page, limit);
        return () => {
            dispatch(actions.clearData());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const expandedRowRender = (item) => {
        const columnItems: ColDef[] | any = [
            {
                title: "Service",
                dataIndex: "Service",
                render: (text: string, row: any) => {
                    return row.service && row.service.name
                },
                width: 200,
            },
            {
                title: "Customer",
                dataIndex: "customer",
                render: (text: string, row: any) => {
                    return (
                        row.customer?.customerInfo?.companyName ||
                        (row.customer && row.customer.fullName)
                    )
                },
                width: 200,
            },
            {
                title: 'Staffs',
                dataIndex: "staffs",

                render: (text: string, row: any) => {
                    if (row?.staffs && row?.staffs.length > 0)
                        return row.staffs.map((r) => {
                            if (!r.staff)
                                return "";
                            return <Tag key={row.id + "-s"} style={{ marginBottom: 6 }}>{r.staff.fullName}</Tag>
                        })
                    return ""
                },
            },

            {
                title: 'Frequency',
                key: 'frequency',
                width: 220,
                render: (_text: string, row: any) => (
                    <SiteItemFrequencySection
                        row={row}
                        canExpandSchedule={!!row.id}
                    />
                ),
            },

            {
                title: 'Shifts',
                dataIndex: "shifts",

                render: (text: string, row: any) => {
                    if (row?.staffs && row?.staffs.length > 0)
                        return row.staffs.map((r) => {
                            if (!r.staff)
                                return "";
                            return r.staffShifts.map((rr) => {
                                const t = row.type === "E" ? <Tag>Everyday</Tag> : rr.type === "W" ? <Tag>Working day</Tag> : rr?.typeValue && rr?.typeValue.split(',').map((k) => <Tag key={row.id + "-" + r}>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);
                                return (
                                    <div style={{ marginBottom: 6 }} key={r.id + "-" + rr.id}>
                                        {r.staff.fullName}{" "}
                                        {formatTime(rr.startTime) + "-" + formatTime(rr.endTime)}{" "}
                                        {t}
                                    </div>
                                );
                            })
                        })
                    return ""
                },
            },

            // {
            //     title: 'Action',
            //     align: 'center',
            //     dataIndex: "action",
            //     width: 160,
            //     render: (text: string, row: any) => {
            //         return <>
            //             <ButtonMR onClick={() => { router.push('/schedule-tasks?itemId=' + row.id) }} className="btnLink" ><FileAddOutlined /> View tasks </ButtonMR>
            //         </>
            //     },
            // },

        ];

        const data = (item?.items ?? []).map((siteItem: any, i: number) => ({
            ...siteItem,
            key: siteItem.id ?? i,
            parentSiteId: item.id,
        }));
        return (
            <div className="job-sites-expanded-services">
                <p className="job-sites-expanded-services__title">Services</p>
                <TableWrapper
                    className="job-sites-items-table"
                    columns={columnItems}
                    dataSource={data}
                    pagination={false}
                    expandable={{
                        expandedRowRender: expandedRowRenderTask,
                        rowExpandable: (siteItem: any) => isPersistedDbId(siteItem?.id),
                    }}
                />
            </div>
        );
    }

    const expandedRowRenderTask = (siteItem) => {
        const frequencyPanel = (
            <SiteItemFrequencyPanel
                siteId={+siteItem.parentSiteId}
                siteItemId={+siteItem.id}
                row={siteItem}
                disabled={!canEditSite}
                onUpdated={() => loadSites()}
            />
        );

        const tasksTable = (
            <TableWrapper
                className="job-sites-tasks-table"
                columns={[
                    {
                        title: "Task name",
                        dataIndex: "name",
                        width: 250,
                        render: (text: string, taskRow: any) => (
                            <span style={{ cursor: 'pointer' }}> {taskRow && taskRow.name}</span>
                        ),
                    },
                    {
                        title: "Staff",
                        dataIndex: "staff",
                        render: (text: string, taskRow: any) =>
                            taskRow.staff && taskRow.staff.fullName,
                        width: 200,
                    },
                    {
                        title: 'Start date - Finish date',
                        dataIndex: "type",
                        width: 200,
                        render: (_text: string, taskRow: any) =>
                            (taskRow?.shifts ?? []).map((h: any) => (
                                <p
                                    key={h.id}
                                    onClick={async () => {
                                        handleOnClick(actionType.VIEW_LOG, taskRow);
                                    }}
                                >
                                    {moment(taskRow.startDate).format(dateFormat) +
                                        ' ' +
                                        formatTime(h.from) +
                                        ' - ' +
                                        moment(taskRow.endDate).format(dateFormat) +
                                        ' ' +
                                        formatTime(h.to)}
                                </p>
                            )),
                    },
                    {
                        title: "Repeat",
                        dataIndex: "shift",
                        render: (text: string, taskRow: any) => {
                            if (taskRow?.type) {
                                return taskRow.type === "E" ? (
                                    <Tag>Everyday</Tag>
                                ) : taskRow.type === "W" ? (
                                    <Tag>Working day</Tag>
                                ) : (
                                    taskRow?.typeValue &&
                                    taskRow.typeValue.split(',').map((r: string) => (
                                        <Tag key={taskRow.id + "-" + r}>
                                            {+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}
                                        </Tag>
                                    ))
                                );
                            }
                            return "";
                        },
                        width: 120,
                    },
                    {
                        title: 'Action',
                        align: 'center' as const,
                        dataIndex: "action",
                        width: 80,
                        render: (text: string, taskRow: any) => (
                            <>
                                <ButtonMR
                                    className="btnLink"
                                    style={{ marginLeft: 10 }}
                                    onClick={() => {
                                        handleOnClick(actionType.UPDATE_ITEM, {
                                            ...taskRow,
                                            staffs: siteItem.staffs,
                                        });
                                    }}
                                >
                                    <EditOutlined />
                                </ButtonMR>
                                <Popconfirm
                                    title={"Are you sure you want to change to active?"}
                                    okText={intl.formatMessage({ id: "button.Yes" })}
                                    cancelText={intl.formatMessage({ id: "button.No" })}
                                    placement="topRight"
                                    onConfirm={() => {
                                        dispatch(
                                            actions.saveInto(
                                                { taskId: taskRow?.id },
                                                actionType.DELETE_ITEM,
                                                false,
                                            ),
                                        );
                                    }}
                                >
                                    <button className="btnDelete"><DeleteOutlined /></button>
                                </Popconfirm>
                            </>
                        ),
                    },
                ]}
                dataSource={(siteItem?.tasks ?? []).map((task: any, i: number) => ({
                    ...task,
                    key: task.id ?? `task-${i}`,
                }))}
                pagination={false}
                footer={() =>
                    checkRole('ADMIN') || checkRole('EDIT') ? (
                        <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.ADD_ITEM, siteItem);
                            }}
                            className="btnLink"
                        >
                            <FileAddOutlined /> Create recurring task
                        </ButtonMR>
                    ) : (
                        ""
                    )
                }
            />
        );

        return (
            <div className="job-sites-service-expand">
                {frequencyPanel}
                <div className="job-sites-service-expand__tasks">
                    <p className="job-sites-recurring-tasks__title">Recurring tasks</p>
                    <p className="job-sites-recurring-tasks__help">
                        Separate from frequency above — scheduled work orders for this service.
                    </p>
                    {tasksTable}
                </div>
            </div>
        );
    }

    const ActionBTN = () => {
        return (
            <>
                <ButtonDiv>
                    <ActionsWrapper>
                        <ActionListBtn
                            style={{
                                gridColumnStart: "auto",
                            }}
                            type="primary"
                            onClick={() => handleOnClick(actionType.SEARCH)}
                            loading={loading}
                            icon={<SearchOutlined />}
                        >
                            {intl.formatMessage({ id: "sidebar.users.search" })}
                        </ActionListBtn>

                        <ActionListBtn
                            onClick={() => {
                                handleOnClick(actionType.ADD);
                            }}
                            type="primary"
                            icon={<FileAddOutlined />}
                        >
                            {intl.formatMessage({ id: "sidebar.users.new" })}
                        </ActionListBtn>

                    </ActionsWrapper>
                </ButtonDiv>
            </>
        );
    };

    return (
        <Layout title="sidebar.jobSites">
            <GlobalHotKeys
                keyMap={{ SEARCH_CATEGORIES: "ctrl+alt+f" }}
                handlers={{
                    SEARCH_CATEGORIES: (e: any) => {
                        e.preventDefault();
                        setPage(1);
                        handleResetSearch(1, limit);
                    },
                }}
                allowChanges={true}
            ></GlobalHotKeys>
            <UsersDiv className="job-sites-page">
                <Form
                    form={form}
                    layout="horizontal"
                    labelCol={{ flex: "140px !important" }}
                    style={{ width: "100%" }}
                >
                    <Form.Item name="disableAutoComplete" style={{ display: "none" }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>
                    <StatusRow>
                        <Col lg={15} md={24} xs={24}>
                            <Row gutter={10}>
                                <Col lg={12} md={12} sm={24} xs={24}>
                                    <Fieldset>
                                        <FormInput
                                            name="Name"
                                            label={intl.formatMessage({ id: "form.filter.keyword" })}
                                            Max={200}
                                            onChange={(e) => {
                                                if (e?.target?.value === "") {
                                                    setPage(1);
                                                    loadSites(1, limit);
                                                }
                                            }}
                                        />

                                    </Fieldset>
                                </Col>
                            </Row>
                        </Col>
                        <Col
                            xs={24}
                            sm={24}
                            md={24}
                            lg={9}
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                flexDirection: "row",
                                alignItems: "flex-end",
                            }}
                        >
                            <ActionBTN />
                        </Col>
                    </StatusRow>
                </Form>
                <UsernameRow></UsernameRow>
                <InformationDiv>
                    <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        expandedRowRender={expandedRowRender}
                        expandRowByClick={false}
                        pagination={true}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={displayCount}
                        limit={limit}
                        totalUnit="sites"
                        data={displayRows}
                        loading={loading}
                        tableClassName="job-sites-main-table"
                    />
                </InformationDiv>
            </UsersDiv>
            {modalType ?
                modalType === actionType.ADD_ITEM || modalType === actionType.UPDATE_ITEM || modalType === actionType.UPDATE_TASK ?
                    <TaskModal
                        title={modalType === actionType.UPDATE_TASK ? "Update shift" : modalType === actionType.ADD_ITEM ? "Add new task" : "Update task"}
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        isSuccess={success}
                        reportTemplates={reportTemplates}
                        getDataInit={getDataInit}
                    />
                    : modalType === actionType.VIEW_LOG ?
                        <TaskLogModal
                            title={"Logs"}
                            loadingAction={loadingAction}
                            userId={0}
                            taskId={0}
                            taskShiftId={0}
                            modalType={modalType}
                            isSuccess={success}
                        />
                        : (
                            <SiteModal
                                title={modalType === actionType.ADD ? "Add new job site" : "Update job site"}
                                loadingAction={loadingAction}
                                data={row}
                                modalType={modalType}
                                isSuccess={success}
                                services={services}
                                customers={customers}
                                staffs={staffs}
                                getDataInit={getDataInit}
                            />
                        ) : ""}
        </Layout>
    );
};
export default JobSite;
