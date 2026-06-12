import { FilePdfOutlined, SearchOutlined, FileAddOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { ActionBtn, Fieldset } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, pageData } from "@app/config/data.config";
import { Col, Form, Tag, Row, Popconfirm } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tasks/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsersDiv } from "@app/components/common/container.style";
import { dJobStatus, userType } from "../../constants/statusUser";
import endPoint from "../../constants/endPoint";
import serviceType from "../../constants/serviceType";
import { callAPIAsync } from "../../library/helpers/api";
import FormSelect from "@app/components/common/FormItem/Select";
import DateTimePicker from "../../components/common/FormItem/DateTimePicker";
import actionType from "../../constants/actionType";
import intl from "../../library/helpers/intlProvider";
import { notification } from "../../components";
import UserTaskModal from "@app/components/schedule-tasks/user-job-create-report";
import TaskModal from "@app/components/schedule-tasks";
import { checkRole } from "../../library/helpers/utility";
const TaskToday: React.FC = () => {
    const [form] = Form.useForm();
    const { loading, count, modalType, row, loadingAction, reportTemplates, success, customers, rows } = useSelector((state: any) => state?.tasks);
    const dispatch = useDispatch();
    const [sites, setSites] = useState([]);
    const [services, setServices] = useState([]);
    const [limit, setLimit] = useState(100);
    const [page, setPage] = useState(pageData);
    const [date, setDate] = useState(new Date());
    const getFilter = async () => {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getSites", 'GET');
        if (res && res.data) {
            setSites(res.data)
        }
    }

    useEffect(() => {
        if (success) {
            handleOnClick(actionType.SEARCH)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);


    const getUserTasks = async (siteId: number, serviceId: string, month: number, year: number, ipage?: number, ilimit?: number) => {
        // const dataLog = await callAPIAsync(serviceType.COMMON, endPoint.USER_TASKS + "/getAllUserTasksByUserId", 'GET', { siteId: siteId ? siteId : 0, serviceId: serviceId ? serviceId : '', month, year })
        // if (dataLog.data) {
        //     setItems(dataLog.data.rows)
        // }
        dispatch(actions.getData({ siteId: siteId ? siteId : 0, serviceId: serviceId ? serviceId : '', month, year, page: ipage ? ipage : page, limit: ilimit ? ilimit : limit }));
    }
    useEffect(() => {


    }, [])


    useEffect(() => {
        getFilter()
        form.setFieldsValue({ month: moment() })
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        handleOnClick(actionType.SEARCH)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    let userColumn = [];
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    if (profile && profile.type === userType.STAFF) {
        userColumn = [{
            title: 'Action',
            align: 'center',
            dataIndex: "action",
            width: 120,
            className: 'nowarp',
            render: (text: string, row: any) => {
                if (+row.status === 0)
                    return <Popconfirm
                        title={"do you want to check in?"}

                        okText={intl.formatMessage({ id: "button.Yes" })}
                        cancelText={intl.formatMessage({ id: "button.No" })}
                        placement="topRight"
                        onConfirm={(e) => { dispatch(actions.saveInto({ ...row, status: 3 }, actionType.CHECK_IN, false)); }}
                    >
                        <ActionBtn type="primary" >Check in</ActionBtn>
                    </Popconfirm>
                else if (row.status === dJobStatus.INPROGRESS)
                    return <>
                        <ActionBtn type="secondary" style={{ marginBottom: 6 }} onClick={() => { handleOnClick(actionType.CREATE_REPORT, row); }} >{row.items && row.items.length > 0 ? "Update report" : "Create report"}</ActionBtn>
                        <Popconfirm
                            title={"Are you sure you want to change to completed?"}
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => {
                                if (!row.items || row.items.length === 0) {
                                    notification('error', 'Please create a report first')
                                    return;
                                }
                                dispatch(actions.saveInto({ ...row, status: 1 }, actionType.CHECK_OUT, false));
                            }}
                        >
                            <ActionBtn type="secondary" style={{ backgroundColor: "#F44336" }}>Check out</ActionBtn>
                        </Popconfirm>

                    </>
                else return <ActionBtn type="secondary" style={{ marginBottom: 6 }} onClick={() => { handleOnClick(actionType.VIEW, row); }} >{"View report"}</ActionBtn>

            },
        }];
    } else {
        userColumn = [{
            title: 'Staff',
            dataIndex: "staff.fullName",
            width: 200,
            render: (text: string, row: any) => {
                return row?.staff?.fullName
            }
        }]
    }

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.CREATE_REPORT || modalType === actionType.VIEW || modalType === actionType.ADD || modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else {
            const siteId = form.getFieldValue('siteId');
            const serviceId = form.getFieldValue('serviceId');
            getUserTasks(siteId, serviceId, +moment(date).format('MM'), +moment(date).format('YYYY'))
        }
    };
    const actionColumn = profile && profile.type !== userType.ADMIN ? [] : [{
        title: intl.formatMessage({ id: "table.column.action" }),
        width: 120,
        fixed: "right",
        align: 'center',
        dataIndex: "action",
        render: (text: string, record: any) => {
            if (record.type !== 'DYNAMIC')
                return "";
            return <div>
                {
                    checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
                        onClick={() => { handleOnClick(actionType.UPDATE, record); }}
                        className="btnLink"
                    >
                        <EditOutlined />
                    </ButtonMR> : ""
                }
                <Popconfirm
                    title={intl.formatMessage({ id: "notification.confirm_delete", })}
                    okText={intl.formatMessage({ id: "button.Yes" })}
                    cancelText={intl.formatMessage({ id: "button.No" })}
                    placement="topRight"
                    onConfirm={(e) => {
                        dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false));
                    }}
                >
                    <button className="btnDelete"  ><DeleteOutlined /> </button>
                </Popconfirm>
            </div>
        },
    }]
    const columns: ColDef[] | any = useMemo(() => userColumn.concat([
        {
            title: 'Task',
            dataIndex: "taskName",
            width: 250,
            render: (text: string, row: any) => {
                return row.taskName
            },
        },
        {
            title: 'Job Site',
            dataIndex: "siteName",
            width: 250,
            render: (text: string, row: any) => {
                return row.siteName
            },
        },
        {
            title: 'Service',
            dataIndex: "serviceName",
            width: 250,
            render: (text: string, row: any) => {
                return row.serviceName
            },
        },
        {
            title: 'Customer',
            dataIndex: "customerName",
            width: 250,
            render: (text: string, row: any) => {
                return row.customerName
            },
        },
        {
            title: "Time",
            dataIndex: "taskName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
                if (row.type === 'DYNAMIC') {
                    return <>
                        <p>Start:<b>  {moment(row.startTime).utcOffset("+10:00").format(dateTimeFormat)}</b></p>
                        <p>End:<b>  {moment(row.endTime).utcOffset("+10:00").format(dateTimeFormat)}</b></p>
                    </>
                }
                return <>
                    <p>Day: <b> {moment(row.startTime).utcOffset("+10:00").format(dateFormat)}</b></p>
                    <p>Time:<b> {moment(row.startTime).utcOffset("+10:00").format('HH:mm') + " - " + moment(row.endTime).utcOffset("+10:00").format('HH:mm')}</b></p>
                </>
            },
            width: 180,
        },
        {
            title: "Report file",
            dataIndex: "taskName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
                return row.pdfFile ? <a target="_blank" rel="noopener noreferrer" href={row.pdfFile}><FilePdfOutlined size={30} /></a> : ""
            },
            width: 80,
        },
        {
            title: 'Status',
            dataIndex: "status",
            width: 100,
            render: (text: string, row: any) => {
                if (row.status === dJobStatus.NEW)
                    return <Tag style={{ cursor: 'pointer' }} color="gray">New</Tag>
                if (row.status === dJobStatus.PENDING)
                    return <Tag style={{ cursor: 'pointer' }} color="#ffc107">Pending</Tag>
                else if (row.status === dJobStatus.INPROGRESS)
                    return <Tag style={{ cursor: 'pointer' }} color="#F44336">In progress</Tag>
                else
                    return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
            },
        }
    ].concat(actionColumn)), [actionColumn, userColumn]);

    const onChange = (date) => {
        setDate(date);

    }

    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        const siteId = form.getFieldValue('siteId');
        const serviceId = form.getFieldValue('serviceId');
        getUserTasks(siteId, serviceId, +moment(date).format('MM'), +moment(date).format('YYYY'), pagination.current, pagination.pageSize)
    };

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
                        profile.type === +3 ? <ActionBtn onClick={() => {
                            handleOnClick(actionType.ADD);
                        }}
                            type="primary"
                            icon={<FileAddOutlined />}
                        >
                            {intl.formatMessage({ id: "sidebar.users.new" })}
                        </ActionBtn> : ""
                    }
                </ButtonDiv>
            </>
        );
    }

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };

    return (
        <Layout title="sidebar.Categories">
            <UsersDiv>

                <Form
                    form={form}
                    style={{ width: '100%' }} layout="vertical"
                >
                    <StatusRow>
                        <Col md={20} sm={20} xs={24}>
                            <Row>

                                <Col md={5} sm={5} xs={24} style={{ marginRight: 10 }}>
                                    <Fieldset>
                                        <DateTimePicker onChange={onChange} picker="month" name={"month"} label={"Month"} className="break-line" format="" />
                                    </Fieldset>
                                </Col>
                                <Col md={5} sm={5} xs={24} style={{ marginRight: 10 }}>
                                    <Fieldset>
                                        <FormSelect
                                            name='siteId'
                                            allowClear={true}
                                            label={"Job Site"}
                                            options={sites}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={false}
                                            onChange={async (value) => {
                                                form.setFieldsValue({ serviceId: null })
                                                if (value) {
                                                    const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: value.id });
                                                    if (res && res.data) {
                                                        setServices(res.data)
                                                    }
                                                }

                                            }}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={5} sm={5} xs={24} style={{ marginRight: 10 }}>
                                    <Fieldset>
                                        <FormSelect
                                            name='serviceId'
                                            allowClear={true}
                                            label={"Service"}
                                            options={services}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={false}

                                            onChange={async (value) => {
                                                // let serviceId = 0;
                                                // if (value)
                                                //     serviceId = value.id
                                                // const res = await callAPIAsync(serviceType.COMMON, endPoint.FJOBS + "/getCustomersBySite", 'GET', { siteId: form.getFieldValue('siteId'), serviceId });
                                                // if (res && res.data) {
                                                //     setCustomers(res.data)

                                                // }
                                            }}
                                        />
                                    </Fieldset>
                                </Col>



                            </Row>
                        </Col>
                        <Col
                            md={4} sm={4} xs={24}
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
                <InformationDiv>
                    <TableComponent
                        heightTable="650px"
                        pagination={true}
                        columns={columns}
                        onTableChange={onTableChange}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        data={rows}
                        loading={loading}
                    />
                </InformationDiv>
            </UsersDiv>
            {modalType && (modalType === actionType.ADD || modalType === actionType.UPDATE) ?
                <TaskModal
                    title={modalType === actionType.UPDATE ? "Update Task" : modalType === actionType.ADD ? "Add new Task" : "Update Task"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                    reportTemplates={reportTemplates}
                    getDataInit={getDataInit} services={services} sites={sites} customers={customers} />
                : ""}

            {modalType && (modalType === actionType.CREATE_REPORT || modalType === actionType.VIEW) && row ?
                (
                    <UserTaskModal
                        title={"Report"}
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        getDataInit={getDataInit}
                        reportTemplate={reportTemplates.find(c => c.id === row?.reportTemplateId)}
                        isSuccess={success} />
                ) : ""}

        </Layout>
    );
};
export default TaskToday;
