import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined} from "@ant-design/icons";
import { ActionListBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input, Tag } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/sites/actions";
import TableComponent from "@app/components/common/Table/index";
import { formatTime } from "../../library/helpers/utility";
import TaskLogModal from "@app/components/tasks/task-log";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset, ActionsWrapper } from "@app/components/common/container.style";
import SiteModal from "@app/components/sites";
import TaskModal from "@app/components/tasks";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import ItemJobSiteModal from "@app/components/sites/item-shift";
type IProps = {
    staffId?: number
}
const JobSite = (props: IProps) => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { staffId } = props;
    const { loading, rows, row, success, modalType, customers, count, loadingAction, services, staffs, reportTemplates,sites } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();


    // Restore main handler functions (single instance, not duplicated)

    const handleResetSearch = React.useCallback(async (page: any = 1, limit: any = 100, orderBy: string = 'createdAt', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, orderBy, orderValue, staffId: staffId ? staffId : 0, isFromStaff: true }));
    }, [dispatch, form, staffId]);

    const handleOnClick = React.useCallback((modalType: string, row?: any): void => {
        if (modalType === actionType.ADD_ITEM) {
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
            handleResetSearch(page, limit);
        } else {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        }
    }, [dispatch, page, handleResetSearch]);

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Job site name",
            dataIndex: "name",
            sorter: true,
            width: 200,
            render: (text, row) => {
                return row.site && row.site.name
            }
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            dataIndex: "action",
            render: (text: string, row: any) => (
                <div>
                    <ButtonMR
                        onClick={() => { handleOnClick(actionType.UPDATE_SITE_ITEM, row); }}
                        className="btnLink"
                    >
                        <EditOutlined />
                    </ButtonMR>
                    <Popconfirm
                        title={intl.formatMessage({ id: "notification.confirm_delete", })}
                        okText={intl.formatMessage({ id: "button.Yes" })}
                        cancelText={intl.formatMessage({ id: "button.No" })}
                        placement="topRight"
                        onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id }, actionType.DELETE_SITE_ITEM, false)); }}
                    >
                        <button className="btnDelete"  ><DeleteOutlined /> </button>
                    </Popconfirm>
                </div>
            ),
        }
    ], [intl, handleOnClick, dispatch]);

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };



    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    }, [success, handleResetSearch, page, limit]);



    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'createdAt', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    }

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        handleResetSearch(page, limit);
        getDataInit("SITES");
        return () => {
            dispatch(actions.clearData());
        };
    }, [dispatch, handleResetSearch, page, limit, getDataInit]);

    // const expandedRowRender = (item) => {
    //     const columnItems: ColDef[] | any = [
    //         {
    //             title: "Service",
    //             dataIndex: "Service",
    //             render: (text: string, row: any) => {
    //                 return row.service && row.service.name
    //             },
    //             width: 200,
    //         },
    //         {
    //             title: "Customer",
    //             dataIndex: "customer",
    //             render: (text: string, row: any) => {
    //                 return row.customer && row.customer.fullName
    //             },
    //             width: 200,
    //         },
    //         {
    //             title: 'Staffs',
    //             dataIndex: "staffs",

    //             render: (text: string, row: any) => {
    //                 if (row?.staffs && row?.staffs.length > 0)
    //                     return row.staffs.map((r) => {
    //                         if (!r.staff)
    //                             return "";
    //                         return <Tag key={row.id + "-s"} style={{ marginBottom: 6 }}>{r.staff.fullName}</Tag>
    //                     })
    //                 return ""
    //             },
    //         },

    //         {
    //             title: 'Shifts',
    //             dataIndex: "shifts",

    //             render: (text: string, row: any) => {
    //                 if (row?.staffs && row?.staffs.length > 0)
    //                     return row.staffs.map((r) => {
    //                         if (!r.staff)
    //                             return "";
    //                         return r.staffShifts.map((rr) => {
    //                             const t = row.type === "E" ? <Tag>Everyday</Tag> : rr.type === "W" ? <Tag>Working day</Tag> : rr?.typeValue && rr?.typeValue.split(',').map((k) => <Tag key={row.id + "-" + r}>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);
    //                             return <p style={{ marginBottom: 6 }} key={r.id + "-" + rr.id}>
    //                                 <p>{r.staff.fullName} {formatTime(rr.startTime) + "-" + formatTime(rr.endTime) + "  "} {t}</p>
    //                             </p>
    //                         })
    //                     })
    //                 return ""
    //             },
    //         },
    //     ];

    //     const data = [];
    //     for (let i = 0; i < item?.items?.length; ++i) {
    //         data.push({
    //             ...item?.items[i],
    //             key: i,
    //         });
    //     }
    //     return <TableWrapper
    //         columns={columnItems}
    //         dataSource={data}
    //         pagination={false}

    //     />;
    // }

    // const expandedRowRenderTask = (item) => {
    //     const columns = [
    //         {
    //             title: "Task name",
    //             dataIndex: "name",
    //             width: 250,
    //             render: (text: string, row: any) => {
    //                 return <span style={{ cursor: 'pointer' }}> {row && row.name}</span>
    //             },
    //         },
    //         {
    //             title: "Staff",
    //             dataIndex: "staff",
    //             render: (text: string, row: any) => {
    //                 return row.staff && row.staff.fullName
    //             },
    //             width: 200,
    //         },

    //         // {
    //         //     title: "Shift",
    //         //     dataIndex: "shift",
    //         //     render: (text: string, row: any) => {
    //         //         return row.shift && row.shift.name
    //         //     },
    //         //     width: 200,
    //         // },
    //         {
    //             title: 'Start date - Finish date',
    //             dataIndex: "type",
    //             width: 200,
    //             render: (text: string, row: any) => {
    //                 return row?.shifts.map((h, j) => {
    //                     return <p key={h.id} onClick={async () => {
    //                         handleOnClick(actionType.VIEW_LOG, row);
    //                     }}>{moment(row.startDate).format(dateFormat) + " " + formatTime(h.from) + " - " + (moment(row.endDate).format(dateFormat) + " " + formatTime(h.to)) + "  "}</p>
    //                 })
    //             },
    //         },
    //         {
    //             title: "Repeat",
    //             dataIndex: "shift",
    //             render: (text: string, row: any) => {
    //                 if (row?.type)
    //                     return row.type === "E" ? <Tag>Everyday</Tag> : row.type === "W" ? <Tag>Working day</Tag> : row?.typeValue && row?.typeValue.split(',').map((r) => <Tag key={row.id + "-" + r}>{+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}</Tag>)
    //                 return ""
    //             },
    //             width: 120,
    //         },
    //         // {
    //         //     title: 'Status',
    //         //     dataIndex: "status",
    //         //     width: 120,
    //         //     render: (text: string, row: any) => {
    //         //         if (row.status === 1)
    //         //             return <Popconfirm
    //         //                 title={"Are you sure you want to change to inactive?"}
    //         //                 okText={intl.formatMessage({ id: "button.Yes" })}
    //         //                 cancelText={intl.formatMessage({ id: "button.No" })}
    //         //                 placement="topRight"
    //         //                 onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id, status: 2 }, actionType.CHANGE_STATUS, false)); }}
    //         //             >
    //         //                 <Tag style={{ cursor: 'pointer' }} color="#4caf50">{TaskStatus.find(c => c.id === row.status)?.name}</Tag>
    //         //             </Popconfirm>
    //         //         if (row.status === 2)
    //         //             return <Popconfirm
    //         //                 title={"Are you sure you want to change to active?"}
    //         //                 okText={intl.formatMessage({ id: "button.Yes" })}
    //         //                 cancelText={intl.formatMessage({ id: "button.No" })}
    //         //                 placement="topRight"
    //         //                 onConfirm={(e) => { dispatch(actions.saveInto({ id: row?.id, status: 1 }, actionType.CHANGE_STATUS, false)); }}
    //         //             >
    //         //                 <Tag style={{ cursor: 'pointer' }} color="#F44336">{TaskStatus.find(c => c.id === row.status)?.name}</Tag>
    //         //             </Popconfirm>
    //         //     },
    //         // },
    //         {
    //             title: 'Action',
    //             align: 'center',
    //             dataIndex: "action",
    //             width: 80,
    //             render: (text: string, row: any) => {
    //                 return <>
    //                     {/* <button className="btnLink" style={{ marginLeft: 10 }} onClick={() => { handleOnClick(actionType.VIEW, row); }}> <EyeOutlined /> </button> */}
    //                     <ButtonMR className="btnLink" style={{ marginLeft: 10 }} onClick={() => { handleOnClick(actionType.UPDATE_ITEM, { ...row, staffs: item.staffs }); }}> <EditOutlined /> </ButtonMR>
    //                     <Popconfirm
    //                         title={"Are you sure you want to change to active?"}
    //                         okText={intl.formatMessage({ id: "button.Yes" })}
    //                         cancelText={intl.formatMessage({ id: "button.No" })}
    //                         placement="topRight"
    //                         onConfirm={(e) => { dispatch(actions.saveInto({ taskId: row?.id }, actionType.DELETE_ITEM, false)); }}
    //                     >
    //                         <button className="btnDelete"  ><DeleteOutlined /> </button>
    //                     </Popconfirm>
    //                 </>
    //             },
    //         },
    //     ];

    //     const data = [];
    //     for (let i = 0; i < item.tasks.length; ++i) {
    //         for (let j = 0; j < item.tasks[i].shifts.length; ++j) {

    //         }
    //         data.push({
    //             ...item.tasks[i],
    //             // ...item.tasks[i].shifts[j],
    //             key: "task" + i.toString()
    //         });

    //     }
    //     return <TableWrapper columns={columns} dataSource={data} pagination={false}
    //         footer={() => {
    //             return checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
    //                 onClick={() => {
    //                     handleOnClick(actionType.ADD_ITEM, item);
    //                 }}
    //                 className="btnLink"
    //             ><FileAddOutlined /> Create recurring task</ButtonMR> : ""
    //         }} />;
    // }


    const contentShift = () => {
        return <>
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
                <InformationDiv>
                    <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        // expandedRowRender={expandedRowRender}
                        pagination={true}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
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
                        : modalType === actionType.UPDATE_SITE_ITEM  || modalType === actionType.ADD_SITE_ITEM ? <ItemJobSiteModal
                            loadingAction={false}
                            staffId={staffId}
                            data={row}
                            title={"Update Shifts"}
                            customers={customers}
                            services={services}
                            staffs={staffs} modalType={modalType} sites={sites}/> : (
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

        </>
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
                                handleOnClick(actionType.ADD_SITE_ITEM);
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

    if (staffId) {
        return contentShift()
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
            {contentShift()}


        </Layout>
    );
};
export default JobSite;
