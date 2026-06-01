import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined,
    EyeOutlined,
    UserOutlined
} from "@ant-design/icons";
import { ActionListBtn, TableWrapper } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type IProps = {
    staffId?: number
}
const SITE_SORT_FIELDS = new Set([
    "name",
    "addressName",
    "createdAt",
    "staffCount",
    "customer",
    "checkInDistance",
]);

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

/** Server-side sort only � avoid Ant Design client re-sort; cycle ASC ? DESC only. */
const serverTableSorter = {
    sorter: () => 0,
    sortDirections: ["ascend", "descend"] as const,
};

const JobSite = (props: IProps) => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [listSort, setListSort] = useState({ orderBy: "createdAt", orderValue: "DESC" });
    const [form] = Form.useForm();
    const intl = useIntl();
    const { staffId } = props;
    const { loading, rows, row, success, modalType, customers, count, loadingAction, services, staffs, reportTemplates } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();
    const appliedSortRef = useRef({ field: "", orderValue: "", at: 0 });

    const sortOrderFor = useCallback(
        (field: string) =>
            listSort.orderBy === field
                ? (listSort.orderValue === "ASC" ? ("ascend" as const) : ("descend" as const))
                : undefined,
        [listSort.orderBy, listSort.orderValue],
    );

    const loadSites = useCallback(
        (
            pageNum: number = page,
            limitNum: number = limit,
            orderBy: string = listSort.orderBy,
            orderValue: string = listSort.orderValue,
        ) => {
            const keyword = (form.getFieldValue("Name") as string | undefined)?.trim() ?? "";
            dispatch(actions.getData({
                keyword,
                page: pageNum,
                limit: limitNum,
                orderBy,
                orderValue,
                staffId: staffId ? staffId : 0,
            }));
        },
        [dispatch, form, limit, listSort.orderBy, listSort.orderValue, page, staffId],
    );

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
            dataIndex: "location",
            width: 120,
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
            ...serverTableSorter,
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
                return <>
                    <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
                    <p>{moment(row.createdAt).utcOffset(600).format(dateTimeFormat)}</p>
                </>
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
        if (extra?.action === "paginate") {
            setPage(pagination.current);
            if (pagination.pageSize !== limit) {
                setLimit(pagination.pageSize);
            }
            loadSites(pagination.current, pagination.pageSize);
            return;
        }
        if (extra?.action !== "sort") {
            return;
        }

        setPage(pagination.current);
        if (pagination.pageSize !== limit) {
            setLimit(pagination.pageSize);
        }

        const colSorter = Array.isArray(sorter)
            ? [...sorter].reverse().find((s: { order?: string }) => s?.order) ?? sorter[sorter.length - 1]
            : sorter;
        const rawField =
            colSorter?.columnKey ??
            colSorter?.column?.key ??
            colSorter?.field;
        if (rawField == null) {
            return;
        }
        const field = String(Array.isArray(rawField) ? rawField[rawField.length - 1] : rawField);
        if (!SITE_SORT_FIELDS.has(field)) {
            return;
        }

        let orderValue: string;
        if (colSorter.order === "ascend") {
            orderValue = "ASC";
        } else if (colSorter.order === "descend") {
            orderValue = "DESC";
        } else if (listSort.orderBy === field) {
            if (Date.now() - appliedSortRef.current.at < 200 && appliedSortRef.current.field === field) {
                return;
            }
            orderValue = listSort.orderValue === "ASC" ? "DESC" : "ASC";
        } else {
            orderValue = "DESC";
        }

        appliedSortRef.current = { field, orderValue, at: Date.now() };
        if (listSort.orderBy === field && listSort.orderValue === orderValue) {
            return;
        }
        setListSort({ orderBy: field, orderValue });
        loadSites(pagination.current, pagination.pageSize, field, orderValue);
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
                title: 'Shifts',
                dataIndex: "shifts",

                render: (text: string, row: any) => {
                    if (row?.staffs && row?.staffs.length > 0)
                        return row.staffs.map((r) => {
                            if (!r.staff)
                                return "";
                            return r.staffShifts.map((rr) => {
                                const t = row.type === "E" ? <Tag>Everyday</Tag> : rr.type === "W" ? <Tag>Working day</Tag> : rr?.typeValue && rr?.typeValue.split(',').map((k) => <Tag key={row.id + "-" + r}>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);
                                return <p style={{ marginBottom: 6 }} key={r.id + "-" + rr.id}>
                                    <p>{r.staff.fullName} {formatTime(rr.startTime) + "-" + formatTime(rr.endTime) + "  "} {t}</p>
                                </p>
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
        }));
        return (
            <TableWrapper
                className="job-sites-items-table"
                columns={columnItems}
                dataSource={data}
                pagination={false}
                expandable={{ expandedRowRender: expandedRowRenderTask }}
            />
        );
    }

    const expandedRowRenderTask = (item) => {
        const columns = [
            {
                title: "Task name",
                dataIndex: "name",
                width: 250,
                render: (text: string, row: any) => {
                    return <span style={{ cursor: 'pointer' }}> {row && row.name}</span>
                },
            },
            {
                title: "Staff",
                dataIndex: "staff",
                render: (text: string, row: any) => {
                    return row.staff && row.staff.fullName
                },
                width: 200,
            },

            // {
            //     title: "Shift",
            //     dataIndex: "shift",
            //     render: (text: string, row: any) => {
            //         return row.shift && row.shift.name
            //     },
            //     width: 200,
            // },
            {
                title: 'Start date - Finish date',
                dataIndex: "type",
                width: 200,
                render: (_text: string, row: any) => {
                    return (row?.shifts ?? []).map((h: any) => (
                        <p
                            key={h.id}
                            onClick={async () => {
                                handleOnClick(actionType.VIEW_LOG, row);
                            }}
                        >
                            {moment(row.startDate).format(dateFormat) +
                                ' ' +
                                formatTime(h.from) +
                                ' - ' +
                                moment(row.endDate).format(dateFormat) +
                                ' ' +
                                formatTime(h.to)}
                        </p>
                    ));
                },
            },
            {
                title: "Repeat",
                dataIndex: "shift",
                render: (text: string, row: any) => {
                    if (row?.type)
                        return row.type === "E" ? <Tag>Everyday</Tag> : row.type === "W" ? <Tag>Working day</Tag> : row?.typeValue && row?.typeValue.split(',').map((r) => <Tag key={row.id + "-" + r}>{+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}</Tag>)
                    return ""
                },
                width: 120,
            },
            // {
            //     title: 'Status',
            //     dataIndex: "status",
            //     width: 120,
            //     render: (text: string, row: any) => {
            //         if (row.status === 1)
            //             return <Popconfirm
            //                 title={"Are you sure you want to change to inactive?"}
            //                 okText={intl.formatMessage({ id: "button.Yes" })}
            //                 cancelText={intl.formatMessage({ id: "button.No" })}
            //                 placement="topRight"
            //                 onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id, status: 2 }, actionType.CHANGE_STATUS, false)); }}
            //             >
            //                 <Tag style={{ cursor: 'pointer' }} color="#4caf50">{TaskStatus.find(c => c.id === row.status)?.name}</Tag>
            //             </Popconfirm>
            //         if (row.status === 2)
            //             return <Popconfirm
            //                 title={"Are you sure you want to change to active?"}
            //                 okText={intl.formatMessage({ id: "button.Yes" })}
            //                 cancelText={intl.formatMessage({ id: "button.No" })}
            //                 placement="topRight"
            //                 onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id, status: 1 }, actionType.CHANGE_STATUS, false)); }}
            //             >
            //                 <Tag style={{ cursor: 'pointer' }} color="#F44336">{TaskStatus.find(c => c.id === row.status)?.name}</Tag>
            //             </Popconfirm>
            //     },
            // },
            {
                title: 'Action',
                align: 'center',
                dataIndex: "action",
                width: 80,
                render: (text: string, row: any) => {
                    return <>
                        {/* <button className="btnLink" style={{ marginLeft: 10 }} onClick={() => { handleOnClick(actionType.VIEW, row); }}> <EyeOutlined /> </button> */}
                        <ButtonMR className="btnLink" style={{ marginLeft: 10 }} onClick={() => { handleOnClick(actionType.UPDATE_ITEM, { ...row, staffs: item.staffs }); }}> <EditOutlined /> </ButtonMR>
                        <Popconfirm
                            title={"Are you sure you want to change to active?"}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => { dispatch(actions.saveInto({ taskId: row?.id }, actionType.DELETE_ITEM, false)); }}
                        >
                            <button className="btnDelete"  ><DeleteOutlined /> </button>
                        </Popconfirm>
                    </>
                },
            },
        ];

        const data = (item?.tasks ?? []).map((task: any, i: number) => ({
            ...task,
            key: task.id ?? `task-${i}`,
        }));
        return (
            <TableWrapper
                className="job-sites-tasks-table"
                columns={columns}
                dataSource={data}
                pagination={false}
                footer={() =>
                    checkRole('ADMIN') || checkRole('EDIT') ? (
                        <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.ADD_ITEM, item);
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
                        pagination={true}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        totalUnit="sites"
                        data={rows}
                        loading={loading}
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
