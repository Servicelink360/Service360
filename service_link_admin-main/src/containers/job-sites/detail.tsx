import { EditOutlined, FileAddOutlined, ReloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { ActionBtn, TableWrapper, } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import TaskLogModal from "@app/components/tasks/task-log";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/sites/actions";
import TableComponent from "@app/components/common/Table/index";
import { checkRole, formatTime } from "../../library/helpers/utility";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv } from "@app/components/common/container.style";
import SiteModal from "@app/components/sites";
import TaskModal from "@app/components/tasks";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
const Unit: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id") ? urlParams.get("id") : 0;
    const { loading, row, success, modalType, customers, count, loadingAction, services, staffs, info, reportTemplates } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();

    const handleOnClick = useCallback((modalType: string, row?: any): void => {
        if (modalType === actionType.ADD || modalType === actionType.VIEW_LOG) {
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
        } else if (modalType === actionType.UPDATE_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else {
            dispatch(actions.getInfo(id));
        }
    }, [dispatch, id]);

    const handleResetSearch = useCallback(async (_page: any = 1, _limit: any = 100) => {
        dispatch(actions.getInfo(id));
    }, [dispatch, id]);

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: intl.formatMessage({ id: "table.column.name" }),
            dataIndex: "name",
            width: 200,
        },
        {
            title: 'Location',
            dataIndex: "location",
            width: 120,
        },
        {
            title: intl.formatMessage({ id: "table.column.address" }),
            dataIndex: "addressName",
            width: 200,
        },
        {
            title: "Created by",
            width: 160,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
                    <p>{moment(row.createdAt).zone("+10:00").format(dateTimeFormat)}</p>
                </>
            },
        },
        {
            title: "Updated by",
            width: 160,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.updatedUser ? row.updatedUser?.fullName : ""}</p>
                    <p>{moment(row.updatedAt).zone("+10:00").format(dateTimeFormat)}</p>
                </>
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 83,
            fixed: "right",
            dataIndex: "action",
            align: 'center',
            render: (text: string, record: any) => (
                <div>
                    {
                        checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.UPDATE, record);
                            }}
                            className="btnLink"
                        >
                            <EditOutlined />
                        </ButtonMR> : ""
                    }


                    {/* {
                        checkRole('ADMIN') || checkRole('DELETE') ? <Popconfirm
                            title={intl.formatMessage({ id: "notification.confirm_delete", })}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => { dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false)); }}
                        >
                            <button className="btnDelete"  ><DeleteOutlined /> </button>
                        </Popconfirm> : ""
                    } */}
                </div>
            ),
        },
    ], [intl, handleOnClick]);

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };
    const onTableChange = (pageNumber: any): void => {
        setPage(pageNumber.current);
        setLimit(pageNumber.pageSize);
        handleResetSearch(pageNumber.current, pageNumber.pageSize);
    };

    useEffect(() => {
        if (success) {
            dispatch(actions.getInfo(id));
        }
    }, [success, dispatch, id]);

    useEffect(() => {
        dispatch(actions.getInfo(id));
        return () => {
            dispatch(actions.clearData());
        };
    }, [dispatch, id]);

    const columnItems: ColDef[] | any = useMemo(() => [
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
            title: 'Staff',
            dataIndex: "staff",
            render: (text: string, row: any) => {
                if (row?.staffs && row?.staffs.length > 0)
                    return row.staffs.map((r) => {
                        if (!r.staff)
                            return "";
                        return <Tag style={{ marginBottom: 6 }}>{r.staff.fullName}</Tag>
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
                            const t = row.type === "E" ? <Tag>Everyday</Tag> : rr.type === "W" ? <Tag>Working day</Tag> : rr?.typeValue && rr?.typeValue.split(',').map((k) => <Tag>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);
                            return <p style={{ marginBottom: 6 }} key={r.id + "-" + rr.id}>
                                <p>{r.staff.fullName} {formatTime(rr.startTime) + "-" + formatTime(rr.endTime) + "  "} {t}</p>
                            </p>
                        })
                    })
                return ""
            },
        },
    ], []);

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
                render: (text: string, row: any) => {
                    return row?.shifts.map((h, j) => {
                        return <p key={h.id} onClick={async () => {
                            handleOnClick(actionType.VIEW_LOG, row);
                        }}>{moment(row.startDate).format(dateFormat) + " " + formatTime(h.from) + " - " + (moment(row.endDate).format(dateFormat) + " " + formatTime(h.to)) + "  "}</p>
                    })
                },
            },
            {
                title: "Repeat",
                dataIndex: "shift",
                render: (text: string, row: any) => {
                    if (row?.type)
                        return row.type === "E" ? <Tag>Everyday</Tag> : row.type === "W" ? <Tag>Working day</Tag> : row?.typeValue && row?.typeValue.split(',').map((r) => <Tag>{+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}</Tag>)
                    return ""
                },
                width: 120,
            },
            {
                title: 'Action',
                align: 'center',
                dataIndex: "action",
                width: 80,
                render: (text: string, row: any) => {
                    return <>
                        <button className="btnLink" style={{ marginLeft: 10 }} onClick={() => { handleOnClick(actionType.UPDATE_ITEM, { ...row, staffs: item.staffs }); }}> <EditOutlined /> </button>
                        <Popconfirm
                            title={"Are you sure you want to change to active?"}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => { dispatch(actions.saveInto({ taskId: row?.id }, actionType.DELETE_ITEM, false)); }}
                        >
                            <button className="btnLink" style={{ marginLeft: 10 }}> <DeleteOutlined /> </button>
                        </Popconfirm>
                    </>
                },
            },
        ];

        const data = [];
        for (let i = 0; i < item.tasks.length; ++i) {
            data.push({
                ...item.tasks[i],
                key: "task" + i.toString()
            });

        }
        return <TableWrapper columns={columns} dataSource={data} pagination={false} footer={() => {
            return checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
                onClick={() => {
                    handleOnClick(actionType.ADD_ITEM, item);
                }}
                className="btnLink"
            ><FileAddOutlined /> Create recurring task</ButtonMR> : ""
        }} />;
    }


    const ActionBTN = () => {
        return (
            <>
                <ButtonDiv>
                    <ActionBtn
                        style={{
                            gridColumnStart: "auto",
                        }}
                        type="primary"
                        onClick={() => handleOnClick(actionType.SEARCH)}
                        loading={loading}
                        icon={<ReloadOutlined />}
                    >
                        {intl.formatMessage({ id: "sidebar.users.refresh" })}
                    </ActionBtn>
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
                <UsernameRow>
                    Job Site Information
                </UsernameRow>
                <InformationDiv>
                    <TableComponent
                        onTableChange={() => { }}
                        columns={columns}
                        keys="id"
                        page={1}
                        count={1}
                        limit={1}
                        data={info ? [info] : []}
                        loading={loading}
                        heightTable={110}
                        pagination={false}
                    />
                </InformationDiv>
                <UsernameRow>Service & Task</UsernameRow>
                <InformationDiv>
                    {info?.items?.length > 0 ?
                        <TableComponent
                            onTableChange={onTableChange}
                            columns={columnItems}
                            keys="id"
                            page={page}
                            count={count}
                            limit={limit}
                            data={info ? info?.items : []}
                            loading={loading}
                            expandedRowRender={expandedRowRenderTask}
                        /> : ""}
                </InformationDiv>
            </UsersDiv>
            {modalType ?
                modalType === actionType.ADD_ITEM || modalType === actionType.UPDATE_ITEM ?
                    <TaskModal
                        title={modalType === actionType.ADD_ITEM ? "Add new task" : "Update task"}
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
                            modalType={modalType}
                            isSuccess={success} userId={0} taskId={0} taskShiftId={0} />
                        :
                        (
                            <SiteModal
                                title={modalType === actionType.ADD ? "Add new Job site" : "Update Job site"}
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
export default Unit;
