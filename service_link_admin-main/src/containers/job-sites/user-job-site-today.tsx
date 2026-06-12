import { ReloadOutlined} from "@ant-design/icons";
import { ActionBtn, TableWrapper,} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import TaskLogModal from "@app/components/tasks/task-log";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/sites/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, InformationDiv, StatusRow, UsernameRow, UsersDiv } from "@app/components/common/container.style";
import SiteModal from "@app/components/sites";
import TaskModal from "@app/components/tasks";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { Link } from "react-router-dom";
import { formatTime } from "../../library/helpers/utility";

const Unit: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, success, modalType, customers, count, loadingAction, services, staffs, reportTemplates } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();
    const [userId, setUserId] = useState(0);
    const [taskId, setTaskId] = useState(0);
    const [taskShiftId, setTaskShiftId] = useState(0);

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Job site name",
            dataIndex: "name",
            width: 200,
            render: (text, row) => {
                return <>Job site name: <Link to={"/site-detail?id=" + row.id}>{text}</Link></>
            }
        },
        // {
        //     title: 'Location',
        //     dataIndex: "location",
        //     width: 120,
        // },
        {
            title: intl.formatMessage({ id: "table.column.address" }),
            dataIndex: "addressName",
            width: 200,
            render: (text, row) => {
                return <>Address: {text}</>
            }
        },
    ], [intl]);

    const handleResetSearch = async (page: any = 1, limit: any = 100) => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, filter: 'TODAY' })
        );
    };

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };
    const onTableChange = (pageNumber: any): void => {
        setPage(pageNumber.current);
        setLimit(pageNumber.pageSize);
        handleResetSearch(pageNumber.current, pageNumber.pageSize);
    };

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.ADD) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } if (modalType === actionType.VIEW_LOG) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } if (modalType === actionType.ADD_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row: { siteItemId: row.id } } });
        } if (modalType === actionType.UPDATE_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else {
            // case search
            handleResetSearch(page, limit);
        }
    };

    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);


    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        dispatch(
            actions.getData({ keyword: '', page, limit, filter: 'TODAY' }));
        return () => {
            dispatch(actions.clearData());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const expandedRowRender = (item) => {
        const columnss: ColDef[] | any = [
            {
                title: "Service",
                dataIndex: "Service",
                render: (text: string, row: any) => {
                    return "Service: " + (row.service ? row.service.name : "")
                },
                width: 200,
            },
            {
                title: "Customer",
                dataIndex: "customer",
                render: (text: string, row: any) => {
                    return (
                        "Customer: " +
                        (row.customer?.customerInfo?.companyName ||
                            (row.customer ? row.customer.fullName : ""))
                    )
                },
                width: 200,
            },

        ];

        const data = [];
        for (let i = 0; i < item?.items?.length; ++i) {
            data.push({
                ...item?.items[i],
                key: i,
            });
        }
        return <TableWrapper style={{ margin: '0px' }} showHeader={false} columns={columnss} dataSource={data} pagination={false} expandable={{ expandedRowRender: expandedRowRenderTask, defaultExpandAllRows: true }} />;
    };

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
                        {intl.formatMessage({ id: "sidebar.users.search" })}
                    </ActionBtn>
                </ButtonDiv>
            </>
        );
    };
    
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
                title: 'Start date - End date',
                dataIndex: "type",
                width: 200,
                render: (text: string, row: any) => {
                    if (row?.type)
                        return moment(row.startDate).format(dateFormat) + "-" + moment(row.endDate).format(dateFormat)
                    return ""
                },
            },
            {
                title: 'Time',
                dataIndex: "time",
                width: 200,
                render: (text: string, row: any) => {
                    return row?.shifts.map((h, j) => {
                        return <p key={h.id}><Tag onClick={async () => {
                            setUserId(row.staffId)
                            setTaskId(row.id)
                            setTaskShiftId(h.id)
                            handleOnClick(actionType.VIEW_LOG, row);
                        }}>{j + 1}{". "} {formatTime(h.from) + "-" + formatTime(h.to) + "  "}</Tag></p>
                    })
                },
            },
            {
                title: "Repeat",
                dataIndex: "shift",
                render: (text: string, row: any) => {
                    if (row?.type)
                        return row.type === "E" ? <Tag>Everyday</Tag> : row.type === "W" ? <Tag>Working day</Tag> : row?.typeValue && row?.typeValue.split(',').map((r) => <Tag  key={row.id+"-"+r}>{+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}</Tag>)
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
        ];

        const data = [];
        for (let i = 0; i < item.tasks.length; ++i) {
            data.push({
                ...item.tasks[i],
                key: "task" + i.toString()
            });

        }
        return <TableWrapper columns={columns} dataSource={data} pagination={false} />;
    }

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
                <UsernameRow></UsernameRow>
                <InformationDiv>
                    {rows.length > 0 ? <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        expandedRowRender={expandedRowRender}
                        columns={columns}
                        pagination={false}
                        showHeader={false}
                        expandable
                        defaultExpandAllRows
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        data={rows}
                        loading={loading}
                    /> : ""}

                </InformationDiv>
            </UsersDiv>
            {modalType ?
                modalType === actionType.ADD_ITEM || modalType === actionType.UPDATE_ITEM ?
                    <TaskModal
                        title={modalType === actionType.ADD_ITEM ? "Add new" : "Update"}
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        isSuccess={success}
                        reportTemplates={reportTemplates}
                        getDataInit={getDataInit}
                    />
                    :modalType === actionType.VIEW_LOG?
                    <TaskLogModal
                            title={"Logs"}
                            loadingAction={loadingAction}
                            modalType={modalType}
                            isSuccess={success} userId={userId} taskId={taskId} taskShiftId={taskShiftId}                    />
                    :
                    (
                        <SiteModal
                            title={modalType === actionType.ADD ? "Add new" : "Update"}
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
