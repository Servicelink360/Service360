import { SearchOutlined, FilePdfOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, EyeOutlined, FormOutlined, FileAddOutlined, SaveOutlined } from "@ant-design/icons";
import { ActionListBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Form, Input, Popconfirm, Tag } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tasks/actions";
import TableComponent from "@app/components/common/Table/index";
import UserTaskModal from "@app/components/tasks/user-task-create-report";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv } from "@app/components/common/container.style";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { dJobStatus, userType } from "../../constants/statusUser";
import { checkRole } from "../../library/helpers/utility";
import intl from "../../library/helpers/intlProvider";
import { notification } from "../../components";
interface IProps {
    staffId?: number
}
const Task = (props: IProps) => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const { staffId } = props;
    console.log('staffId', staffId)
    const { loading, rows, row, success, modalType, count, loadingAction, reportTemplates } = useSelector((state: any) => state?.tasks);
    const dispatch = useDispatch();
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') ? urlParams.get('status') : ''
    let actionColumn = [];
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    // Restore main handler functions (single instance, not duplicated)

    const handleResetSearch = React.useCallback(async (page: any = 1, limit: any = 100, orderBy: string = 'id', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, status, orderBy, orderValue, isAdmin: 1, staffId: staffId ? staffId : 0 })
        );
    }, [dispatch, form, status, staffId]);

    const handleOnClick = React.useCallback((modalType: string, row?: any): void => {
        if (modalType === actionType.CREATE_REPORT || modalType === actionType.VIEW || modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else {
            // case search
            handleResetSearch(page, limit);
        }
    }, [dispatch, page, handleResetSearch]);

    const columns: ColDef[] | any = useMemo(() => {
        let userColumn: any[] = [];
        if (profile && profile.type === userType.ADMIN) {
            userColumn = [{
                title: 'Staff',
                dataIndex: "staff.fullName",
                width: 200,
                render: (_: string, row: any) => row?.staff?.fullName,
            }];
        }
        const adminSiteColumns = profile && profile.type === userType.ADMIN ? [
            {
                title: 'Job Site',
                dataIndex: "siteName",
                width: 250,
                render: (_: string, row: any) => row.siteName,
            },
            {
                title: 'Service',
                dataIndex: "serviceName",
                width: 250,
                render: (_: string, row: any) => row.serviceName,
            },
            {
                title: 'Customer',
                dataIndex: "companyName",
                width: 250,
                render: (_: string, row: any) => row.companyName,
            },
        ] : [];

        return userColumn.concat(adminSiteColumns).concat([
        {
            title: 'Task',
            dataIndex: "taskName",
            width: 250,
            render: (text: string, row: any) => {
                return row.taskName
            },
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
                    return <Tag style={{ cursor: 'pointer' }} color="gray">NEW</Tag>
                else if (row.status === dJobStatus.PENDING)
                    return <Tag style={{ cursor: 'pointer' }} color="#ffc107">Pending</Tag>
                else if (row.status === dJobStatus.INPROGRESS)
                    return <Tag style={{ cursor: 'pointer' }} color="#F44336">In progress</Tag>
                else if (row.status === dJobStatus.COMPLETED)
                    return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
                return ""
            },
        }, {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, row: any) => {
                if (profile && +profile.type === userType.ADMIN && row.type !== "CUSTOM") {
                    return <div />;
                }

                return <div>

                    {
                         +profile.type === userType.ADMIN ? "" :
                            (+row.status === 0 || +row.status === 2) ?
                                <Popconfirm
                                    title={"do you want to check in?"}

                                    okText={intl.formatMessage({ id: "button.Yes" })}
                                    cancelText={intl.formatMessage({ id: "button.No" })}
                                    placement="topRight"
                                    onConfirm={(e) => { dispatch(actions.saveInto({ ...row, status: 3 }, actionType.CHECK_IN, false)); }}
                                >
                                    <ButtonMR className="btnLink" ><SaveOutlined /></ButtonMR>
                                </Popconfirm>
                                : (row.status === 3) ?
                                    <>
                                        <ButtonMR className="btnLink" style={{ marginBottom: 6 }} onClick={() => { handleOnClick(actionType.CREATE_REPORT, row); }} >{row.items && row.items.length > 0 ? <FormOutlined /> : <FileAddOutlined />}</ButtonMR>
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
                                            <ButtonMR className="btnLink" ><CheckCircleOutlined /></ButtonMR>
                                        </Popconfirm>

                                    </>
                                    : <ButtonMR className="btnLink" style={{ marginBottom: 6 }} onClick={() => { handleOnClick(actionType.VIEW, row); }} ><EyeOutlined /></ButtonMR>

                    }

                    {
                        ( +profile.type === userType.ADMIN ) ? <>
                            {
                                checkRole('ADMIN') || checkRole('EDIT') ? <ButtonMR
                                    onClick={() => { handleOnClick(actionType.CREATE_REPORT, row); }}
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
                                    dispatch(actions.saveInto({ id: row?.id }, actionType.DELETE, false));
                                }}
                            >
                                <button className="btnDelete"  ><DeleteOutlined /> </button>
                            </Popconfirm>
                        </> : ""
                    }

                </div>
            },
        },
    ].concat(actionColumn));
    }, [profile, actionColumn, dispatch, handleOnClick, intl]);

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };



    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    }, [success, handleResetSearch, page, limit]);

    useEffect(() => {
        if (status) {
            handleResetSearch(page, limit);
        }
    }, [status, handleResetSearch, page, limit]);


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
    }, [dispatch, handleResetSearch, page, limit]);

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
    }

    
    const contentTask = () => {
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
        </>
    }

    if (staffId) {
        return contentTask()
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
           {contentTask()}
        </Layout>
    );
};
export default Task;
