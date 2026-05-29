import { FilePdfOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { ActionBtn, Fieldset } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, pageData } from "@app/config/data.config";
import { Col, Form, Tag, Row } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tasks/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsersDiv } from "@app/components/common/container.style";
import endPoint from "../../constants/endPoint";
import serviceType from "../../constants/serviceType";
import { callAPIAsync } from "../../library/helpers/api";
import FormSelect from "@app/components/common/FormItem/Select";
import DateTimePicker from "../../components/common/FormItem/DateTimePicker";
import actionType from "../../constants/actionType";
import intl from "../../library/helpers/intlProvider";
import AudiReportModal from "@app/components/reports/audi-report";
import { dJobStatus } from "../../constants/statusUser";
const TaskToday: React.FC = () => {
    const [form] = Form.useForm();
    const { loading, count, modalType, row, loadingAction, reportTemplates, success, rows } = useSelector((state: any) => state?.tasks);
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
    }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

    const getUserTasks = async (siteId: number, serviceId: string, month: number, year: number, ipage?: number, ilimit?: number) => {
        dispatch(actions.getData({ siteId: siteId ? siteId : 0, serviceId: serviceId ? serviceId : '', status: 1, month, year, page: ipage ? ipage : page, limit: ilimit ? ilimit : limit }));
    }

    useEffect(() => {
        getFilter()
        form.setFieldsValue({ month: moment() })
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        handleOnClick(actionType.SEARCH)
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    let userColumn = [{
        title: 'Staff',
        dataIndex: "staff.fullName",
        width: 200,
        render: (text: string, row: any) => {
            return row?.staff?.fullName
        }
    }]

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.CREATE_REPORT || modalType === actionType.VIEW || modalType === actionType.ADD || modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else {
            const siteId = form.getFieldValue('siteId');
            const serviceId = form.getFieldValue('serviceId');
            getUserTasks(siteId, serviceId, +moment(date).format('MM'), +moment(date).format('YYYY'))
        }
    };
    const actionColumn = [{
        title: intl.formatMessage({ id: "table.column.action" }),
        width: 120,
        fixed: "right",
        align: 'center',
        dataIndex: "action",
        render: (text: string, record: any) => {
            return <ButtonMR
                onClick={() => { handleOnClick(actionType.VIEW, record); }}
                className="btnLink"
            >
                <EyeOutlined />
            </ButtonMR>
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
                        <p>Start:<b>  {moment(row.startTime).zone("+10:00").format(dateTimeFormat)}</b></p>
                        <p>End:<b>  {moment(row.endTime).zone("+10:00").format(dateTimeFormat)}</b></p>
                    </>
                }
                return <>
                    <p>Day: <b> {moment(row.startTime).zone("+10:00").format(dateFormat)}</b></p>
                    <p>Time:<b> {moment(row.startTime).zone("+10:00").format('HH:mm') + " - " + moment(row.endTime).zone("+10:00").format('HH:mm')}</b></p>
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
                else  if (row.status === dJobStatus.PENDING)
                    return <Tag style={{ cursor: 'pointer' }} color="#ffc107">Pending</Tag>
                else if (row.status === dJobStatus.INPROGRESS)
                    return <Tag style={{ cursor: 'pointer' }} color="#F44336">In progress</Tag>
                else
                    return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
            },
        }
    ].concat(actionColumn)), []); // eslint-disable-line react-hooks/exhaustive-deps

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
            {modalType && (modalType === actionType.VIEW) && row ?
                (
                    <AudiReportModal
                        title={"Audit Report"}
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
