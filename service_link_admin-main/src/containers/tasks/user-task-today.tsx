import { SearchOutlined, FilePdfOutlined } from "@ant-design/icons";
import { ActionBtn, ActionListBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tasks/actions";
import TableComponent from "@app/components/common/Table/index";
import UserTaskModal from "@app/components/tasks/user-task-create-report";
import { ButtonDiv, InformationDiv, StatusRow, UsernameRow, UsersDiv } from "@app/components/common/container.style";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { dJobStatus, userType } from "../../constants/statusUser";
import { notification } from "../../components";
const TaskToday: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, success, modalType, count, loadingAction, reportTemplates } = useSelector((state: any) => state?.tasks);
    const dispatch = useDispatch();
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') ? urlParams.get('status') : ''

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
                if (+row.status === 0 || +row.status === 2)
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
                        <ActionBtn type="secondary" style={{ marginBottom: 6 }} onClick={() => { handleOnClick(actionType.CREATE_REPORT, row); }} >{row.items.length > 0 ? "Update report" : "Create report"}</ActionBtn>
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
        userColumn=[{
            title: 'Staff',
            dataIndex: "user.fullName",
            width: 200,
            render: (text: string, row: any) => {
                return row?.staff?.fullName
            }
        }]
    }

    const columns: ColDef[] | any = useMemo(() => userColumn.concat([
        {
            title: "Job site",
            sorter: true,
            dataIndex: "siteName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
                return <>
                    <p>Job site: {row.siteName}</p>
                    <p>Service: {row.serviceName}</p>
                </>
            },
            width: 200,
        },
        {
            title: "Task",
            dataIndex: "taskName",
            className: 'noWrapCell',
            sorter: true,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.taskName}</p>
                </>
            },
            width: 200,
        },
        {
            title: "Time",
            dataIndex: "taskName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
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
                return row.pdfFile ? <a target="_blank" rel="noopener noreferrer" href={row.pdfFile}><FilePdfOutlined size={20} /></a> : ""
            },
            width: 150,
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
                    return <Tag style={{ cursor: 'pointer' }} color="#F44336">Inprogress</Tag>
                else
                    return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
            },
        },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    ]), []);

    useEffect(() => {
        if (status) {
            handleResetSearch(page, limit);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);
    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.CREATE_REPORT || modalType === actionType.VIEW) {
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


    const handleResetSearch = async (page: any = 1, limit: any = 100, orderBy: string = 'id', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, status, orderBy, orderValue })
        );
    };
    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'id', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    };
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        handleResetSearch(page, limit);
        return () => {
            dispatch(actions.clearData());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const ActionBTN = () => {
        return (
            <>
                <ButtonDiv>
                    <ActionListBtn
                        style={{
                            gridColumnStart: "auto",
                        }}
                        type="primary"
                        onClick={() => handleOnClick(actionType.SEARCH)}
                        loading={loading}
                        icon={<SearchOutlined />}
                    >
                        Refresh
                    </ActionListBtn>
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
                <UsernameRow></UsernameRow>
                <InformationDiv>
                    <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        pagination={false}
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
            {modalType && row ?
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
