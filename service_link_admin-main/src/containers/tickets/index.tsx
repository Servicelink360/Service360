import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined,
    FileSyncOutlined,
    CheckCircleOutlined,
    MessageOutlined,
    UndoOutlined,
} from "@ant-design/icons";
import {
    ActionBtn,
    ActionListBtn,
    TableWrapper,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { limitData, pageData, dateTimeFormat } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input, Tag, Image, Tabs, message } from "antd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tickets/actions";
import dashboardActions from "@app/redux/dashboard/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset } from "@app/components/common/container.style";
import TicketModal from "@app/components/tickets";
import TicketAnswerModal from "@app/components/tickets/answer";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { checkRole } from "../../library/helpers/utility";
import endPoint from "../../constants/endPoint";
import serviceType from "../../constants/serviceType";
import { callAPIAsync } from "../../library/helpers/api";
import { ticketStatus, userType } from "../../constants/statusUser";
import moment from "moment";

const ticketCustomerLabel = (row: any): string => {
    const company = String(
        row?.companyName
        || row?.customer?.customerInfo?.company?.name
        || row?.customer?.customerInfo?.companyName
        || row?.createdUser?.customerInfo?.companyName
        || "",
    ).trim();
    const person = String(
        row?.customerName
        || row?.customer?.fullName
        || row?.createdUser?.fullName
        || "",
    ).trim();
    return company || person;
};

const ticketAnswerSenderName = (row: any, ticket?: any): string => {
    const fromUser = String(
        row?.createdUser?.fullName
        || row?.user?.fullName
        || row?.createdUser?.username
        || row?.user?.username
        || "",
    ).trim();
    if (fromUser) return fromUser;
    if (+row?.type === 1 && ticket) {
        const person = String(
            ticket.customerName
            || ticket.customer?.fullName
            || ticket.createdUser?.fullName
            || "",
        ).trim();
        if (person) return person;
        return ticketCustomerLabel(ticket) || "Customer";
    }
    if (+row?.type === 2) return "Support";
    return "—";
};

type TicketListTab = "active" | "deleted";

const canDeleteTicket = (profile: any, isDeletedTab: boolean) => {
    if (!profile?.type) return false;
    if (+profile.type === userType.ADMIN) {
        return checkRole("DELETE");
    }
    if (+profile.type === userType.CUSTOMER && !isDeletedTab) {
        return true;
    }
    return false;
};

const Index: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, success, modalType, count, loadingAction } = useSelector((state: any) => state?.tickets);
    const dispatch = useDispatch();
    const [sites, setSites] = useState([]);
    const [ticketListTab, setTicketListTab] = useState<TicketListTab>("active");
    const [deletedTicketCount, setDeletedTicketCount] = useState(0);
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') ? urlParams.get('status') : ''
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }
    const profileType = +profile?.type || 0;
    const isAdminUser = profileType === userType.ADMIN;
    const isCustomerUser = profileType === userType.CUSTOMER;
    const showTicketDeletedTabs = isAdminUser || isCustomerUser;
    const isDeletedTicketTab = showTicketDeletedTabs && ticketListTab === "deleted";
    const getFilter = async () => {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getSites", 'GET');
        if (res && res.data) {
            setSites(res.data)
        }
    }

    const loadDeletedTicketCount = useCallback(async () => {
        if (!showTicketDeletedTabs) return;
        try {
            const res = await callAPIAsync(serviceType.COMMON, endPoint.TICKETS, "GET", {
                keyword: "",
                page: 1,
                limit: 1,
                status: ticketStatus.DELETED,
                orderBy: "createdAt",
                orderValue: "DESC",
            });
            setDeletedTicketCount(+res?.data?.count || 0);
        } catch {
            setDeletedTicketCount(0);
        }
    }, [showTicketDeletedTabs]);

    const refreshTicketList = useCallback(async (pageNum = page, limitNum = limit) => {
        let keyword = "";
        try {
            const formData = await form.validateFields();
            keyword = formData?.Name ? String(formData.Name).trim() : "";
        } catch {
            keyword = "";
        }
        const listStatus = isDeletedTicketTab ? ticketStatus.DELETED : (status || "");
        dispatch(
            actions.getData({
                keyword,
                page: pageNum,
                limit: limitNum,
                orderBy: "createdAt",
                orderValue: "DESC",
                status: listStatus,
            }),
        );
    }, [dispatch, form, isDeletedTicketTab, limit, page, status]);

    const restoreTicket = useCallback(async (record: any) => {
        if (!record?.id) return;
        const res = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.TICKETS}/${record.id}/restore`,
            "PATCH",
            {},
        );
        if (res?.code === 1) {
            message.success(isAdminUser ? "Ticket restored to Tickets" : "Ticket restored");
            await refreshTicketList(page, limit);
            void loadDeletedTicketCount();
        } else {
            message.error(res?.message || "Could not restore this ticket");
        }
    }, [isAdminUser, page, limit, loadDeletedTicketCount, refreshTicketList]);

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Customer name",
            dataIndex: "companyName",
            sorter: true,
            render: (_: string, row: any) => ticketCustomerLabel(row),
        },
        {
            title: "Submitted",
            dataIndex: "createdAt",
            sorter: true,
            width: 160,
            className: "noWrapCell",
            render: (_: string, row: any) => {
                if (!row?.createdAt) return "";
                return moment(row.createdAt).utcOffset(600).format(dateTimeFormat);
            },
        },
        {
            title: "Subject",
            dataIndex: "subject",
            sorter: true,
        },
        {
            title: "Message",
            dataIndex: "message",
        },
        {
            title: "Site name",
            dataIndex: "siteName",
            sorter: true,
        },
        {
            title: "Service name",
            dataIndex: "serviceName",
            sorter: true,
        },
        {
            title: 'Status',
            dataIndex: "status",
            width: 160,
            render: (text: string, row: any) => {
                if (+row.status === ticketStatus.DELETED) {
                    return <Tag color="default">Deleted</Tag>
                }
                if (row.status === ticketStatus.PENDING) {
                    return <Tag style={{ cursor: 'pointer' }} color="#ffc107">New</Tag>
                }
                if (row.status === ticketStatus.INPROGRESS) {
                    return <>
                        <Tag style={{ cursor: 'pointer' }} color="#F44336">In progress</Tag>
                        {+row.sender === 1 ? <p>Waiting for customer</p> : null}
                        {+row.sender !== 1 ? <p>Waiting for support</p> : null}
                    </>
                }
                return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
            },
        },
        {
            title: "Priority",
            dataIndex: "priority",
            width: 160,
            render: (_: string, row: any) => {
                if (row.priority && +row.priority === 1) {
                    return <div style={{ marginTop: 6 }}><Tag color="#F44336">Urgent</Tag></div>
                }
                if (row.priority && +row.priority === 2) {
                    return <div style={{ marginTop: 6 }}><Tag color="#ffc107">Normal</Tag></div>
                }
                return ""
            },
        },
        // {
        //     title: "Created by",
        //     width: 160,
        //     dataIndex: "createdAt",
        //     sorter: true,
        //     render: (text: string, row: any) => {
        //         return <>
        //             <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
        //             <p>{moment(row.createdAt).zone("+10:00").format(dateTimeFormat)}</p>
        //         </>
        //     },

        // },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    {
                        (+profile.type === 1) && !isDeletedTicketTab && (checkRole('ADMIN') || checkRole('EDIT')) ? <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.UPDATE, record);
                            }}
                            className="btnLink"
                        >
                            <EditOutlined />
                        </ButtonMR> : ""
                    }

                    {
                        (+profile.type === 3) && !isDeletedTicketTab && record.status === ticketStatus.PENDING &&
                        < Popconfirm
                            title={"Are you sure you want to change to processing status?"}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => {
                                dispatch(actions.saveInto({ id: record?.id, status: ticketStatus.INPROGRESS }, actionType.CHANGE_STATUS, false));
                                // notification('error','Bạn không thể xóa, vui lòng thông báo tới quản trị viên')
                            }}
                        >
                            <ButtonMR className="btnLink"  ><FileSyncOutlined /> </ButtonMR>
                        </Popconfirm>
                    }

                    {
                        (+profile.type === 3) && !isDeletedTicketTab && (record.status === ticketStatus.INPROGRESS) &&
                        < Popconfirm
                            title={"Are you sure you want to change to completed status?"}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => {
                                dispatch(actions.saveInto({ id: record?.id, status: ticketStatus.COMPLETED }, actionType.CHANGE_STATUS, false));
                                // notification('error','Bạn không thể xóa, vui lòng thông báo tới quản trị viên')
                            }}
                        >
                            <ButtonMR className="btnLink"  ><CheckCircleOutlined /> </ButtonMR>
                        </Popconfirm>
                    }


                    {isDeletedTicketTab && (isAdminUser || isCustomerUser) ? (
                        <Popconfirm
                            title="Restore this ticket to the Tickets list?"
                            okText="Restore"
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={() => void restoreTicket(record)}
                        >
                            <button type="button" className="btnLink" title="Restore ticket">
                                <UndoOutlined />
                            </button>
                        </Popconfirm>
                    ) : null}

                    {canDeleteTicket(profile, isDeletedTicketTab) ? (
                        <Popconfirm
                            title={
                                isDeletedTicketTab && isAdminUser
                                    ? "Permanently delete this ticket?"
                                    : isAdminUser
                                      ? "Move this ticket to Deleted?"
                                      : "The ticket moves to Deleted. You can restore it from the Deleted tab."
                            }
                            okText={
                                isDeletedTicketTab && isAdminUser
                                    ? "Delete permanently"
                                    : isAdminUser
                                      ? "Move to Deleted"
                                      : intl.formatMessage({ id: "button.Yes" })
                            }
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={() => {
                                dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false));
                            }}
                        >
                            <button type="button" className="btnDelete">
                                <DeleteOutlined />
                            </button>
                        </Popconfirm>
                    ) : null}
                </div>
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [intl, profile, isDeletedTicketTab, isAdminUser, isCustomerUser, restoreTicket]);

    const expandedRowRender = (item) => {
        const columnItems: ColDef[] | any = [
            {
                title: "Sender",
                dataIndex: "type",
                width: 220,
                className: "noWrapCell",
                render: (_text: string, row: any) => {
                    const role = +row.type === 1 ? "Customer" : +row.type === 2 ? "Support" : "";
                    const name = ticketAnswerSenderName(row, item);
                    return (
                        <div>
                            {role ? <Tag color={+row.type === 1 ? "#ffc107" : "#F44336"}>{role}</Tag> : null}
                            <p style={{ margin: "6px 0 0" }}>
                                <strong>Sender:</strong> {name}
                            </p>
                        </div>
                    );
                },
            },
            {
                title: "Sent",
                dataIndex: "createdAt",
                width: 160,
                className: "noWrapCell",
                render: (_text: string, row: any) => {
                    if (!row?.createdAt) return "";
                    return (
                        <p style={{ margin: 0 }}>
                            <strong>Sent:</strong>{" "}
                            {moment(row.createdAt).utcOffset(600).format(dateTimeFormat)}
                        </p>
                    );
                },
            },
            {
                title: "Message",
                dataIndex: "message",
            },
            {
                title: "Media files",
                dataIndex: "attachFiles",
                render: (_text: string, row: any) => {
                    if (!row.attachFiles) return null;
                    try {
                        return JSON.parse(row.attachFiles).map((r: string, idx: number) => (
                            <Image key={`${r}-${idx}`} src={r} width={50} height={50} />
                        ));
                    } catch {
                        return null;
                    }
                },
                width: 220,
            },
        ];

        const data = [];
        for (let i = 0; i < item?.answers?.length; ++i) {
            data.push({
                ...item?.answers[i],
                key: i,
            });
        }
        return <TableWrapper
            columns={columnItems}
            dataSource={data}
            pagination={false}

            footer={() => {
                if (isDeletedTicketTab || +item.status === 1) {
                    return ""
                }
                return ((+item.sender === 1 && +profile.type === 3) || (+item.sender === 2 && +profile.type === 1)) ? <ButtonMR
                    onClick={() => {
                        handleOnClick(actionType.ADD_ITEM, { ticketId: item.id });
                    }}
                    className="btnLink"
                ><MessageOutlined /> Answer</ButtonMR> : ""
            }}
        />;
    }

    const handleOnClick = (action: string, row?: any): void => {
        console.log('action', action)
        if (action === actionType.SEARCH) {
            handleResetSearch(page, limit);
        } else {
            dispatch({ type: actions.MODAL, payload: { modalType: action, row } });
        }
    };

    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
            if (showTicketDeletedTabs) void loadDeletedTicketCount();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);

    useEffect(() => {
        handleResetSearch(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    useEffect(() => {
        setPage(1);
        handleResetSearch(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketListTab]);

    useEffect(() => {
        if (showTicketDeletedTabs) void loadDeletedTicketCount();
    }, [showTicketDeletedTabs, loadDeletedTicketCount]);

    useEffect(() => {
        if (!loading && showTicketDeletedTabs) void loadDeletedTicketCount();
    }, [loading, showTicketDeletedTabs, loadDeletedTicketCount]);


    const handleResetSearch = async (page: any = 1, limit: any = 100, orderBy: string = 'createdAt', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        const listStatus = isDeletedTicketTab ? ticketStatus.DELETED : (status || "");
        dispatch(
            actions.getData({
                keyword: formData?.Name ? formData?.Name?.trim() : '',
                page,
                limit,
                orderBy,
                orderValue,
                status: listStatus,
            })
        );
    };

    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'createdAt', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    };
    const refreshDashboard = useCallback(() => {
        dispatch(dashboardActions.getData({ startDate: '', endDate: '' }));
    }, [dispatch]);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        getFilter();
        handleResetSearch(page, limit);
        if (isAdminUser || isCustomerUser) {
            void (async () => {
                const res = await callAPIAsync(
                    serviceType.COMMON,
                    `${endPoint.TICKETS}/markAllTicketsOpened`,
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

    const ActionBTN = () => {
        return (
            <>
                <ButtonDiv>
                    <ActionBtn

                        type="primary"
                        onClick={() => handleOnClick(actionType.SEARCH)}
                        loading={loading}
                        icon={<SearchOutlined />}
                    >
                        {intl.formatMessage({ id: "sidebar.users.search" })}
                    </ActionBtn>

                    {
                        (+status === 2 && +profile.type === 1) && <ActionListBtn
                            onClick={() => {
                                handleOnClick(actionType.ADD);
                            }}
                            type="primary"
                            icon={<FileAddOutlined />}
                        >
                            {intl.formatMessage({ id: "sidebar.users.new" })}
                        </ActionListBtn>

                    }

                </ButtonDiv>
            </>
        );
    };

    return (
        <Layout title="sidebar.Categories">
            <GlobalHotKeys
                keyMap={{ SEARCH_CATEGORIES: "ctrl+alt+f" }}
                handlers={{
                    SEARCH_CATEGORIES: (e: any) => {
                        e.preventDefault();
                        handleResetSearch(page, limit);
                    },
                }}
                allowChanges={true}
            ></GlobalHotKeys>
            <UsersDiv>
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
                {showTicketDeletedTabs ? (
                    <Tabs
                        activeKey={ticketListTab}
                        onChange={(key) => setTicketListTab(key as TicketListTab)}
                        style={{ marginBottom: 12 }}
                        items={[
                            { key: "active", label: "Tickets" },
                            { key: "deleted", label: `Deleted (${deletedTicketCount})` },
                        ]}
                    />
                ) : null}
                <InformationDiv>
                    <TableComponent
                        // widthTable="1600px"
                        heightTable="650px"
                        onTableChange={onTableChange}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        data={rows}
                        loading={loading}
                        expandedRowRender={expandedRowRender}
                    />
                </InformationDiv>
            </UsersDiv>
            {console.log('modalType', modalType)}
            {modalType && (modalType === actionType.ADD || modalType === actionType.UPDATE) ?
                <TicketModal
                    title={modalType === actionType.ADD ? "Add new ticket" : "Update ticket"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                    sites={sites}
                /> : modalType && (modalType === actionType.ADD_ITEM || modalType === actionType.UPDATE_ITEM) ? <>
                    <TicketAnswerModal
                        title={modalType === actionType.ADD_ITEM ? "Add new answer" : "Update answer"}
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        isSuccess={success}
                    />
                </> : ""
            }
        </Layout>
    );
};
export default Index;
