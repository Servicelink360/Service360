import { EditOutlined, FileAddOutlined, SearchOutlined, ToolOutlined, UserSwitchOutlined, DeleteOutlined, CopyOutlined } from "@ant-design/icons";
import {
    ActionBtn,
    StatusTag,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Row, Form, Input, Popconfirm, Tooltip } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/admins/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset } from "@app/components/common/container.style";
import AdminModal from "@app/components/admins";
import CustomerModal from "@app/components/admins/customer";
import ResetPasswordModal from "@app/components/admins/reset-password";
import ChangeStatusModal from "@app/components/admins/change-status";
import AllUserModal from "@app/components/admins/all-user-task";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { useLocation } from 'react-router-dom';
import { userType } from "../../constants/statusUser";

const USERS_LIST_PAGE_LIMIT = 100;
/** Australia/Sydney-style display (+10:00), matches other admin screens. */
const AEST_OFFSET_MINUTES = 600;

function formatListDateTime(value?: string | Date | null): string {
    if (value == null || value === "") {
        return "—";
    }
    const m = moment(value);
    if (!m.isValid()) {
        return "—";
    }
    return m.utcOffset(AEST_OFFSET_MINUTES).format(dateTimeFormat);
}

/** Map URL path to users API type (1 customer, 2 staff, 3 admin). Sidebar uses /admins. */
function userListTypeFromPath(pathname: string): number {
    if (pathname === "/staff" || pathname === "/staffs") {
        return userType.STAFF;
    }
    if (pathname === "/customers" || pathname === "/customer") {
        return userType.CUSTOMER;
    }
    if (pathname === "/admin" || pathname === "/admins") {
        return userType.ADMIN;
    }
    return 0;
}

const Index: React.FC = () => {
    const [limit, setLimit] = useState(USERS_LIST_PAGE_LIMIT);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    let location = useLocation();
    const type = userListTypeFromPath(location.pathname);
    const {
        loading,
        rows,
        row,
        success,
        modalType,
        count,
        loadingAction,
        roles,
        companies,
    } = useSelector((state: any) => state?.admins);
    const dispatch = useDispatch();

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Full Name",
            dataIndex: "fullName",
            width: 200,
            sorter: true,
        },
        {
            title: "Email",
            dataIndex: "email",
            width: 200,
            sorter: true,
        },
        {
            title: "Status",
            render: (text: string, row: any) => {
                if (+row.status === 4) {
                    return <StatusTag className='draft'>Deleted</StatusTag>;
                }
                if (+row.status === 1) {
                    return <StatusTag className='publish'>Active</StatusTag>;
                }
                return <StatusTag className='draft'>Inactive</StatusTag>;
            },
            width: 100,
        },
        {
            title: "Created by",
            width: 160,
            dataIndex: "createdAt",
            sorter: true,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
                    <p>{formatListDateTime(row.createdAt)}</p>
                </>
            },

        },

        {
            title: "Updated by",
            width: 160,
            dataIndex: "updatedAt",
            sorter: true,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.updatedUser ? row.updatedUser?.fullName : ""}</p>
                    <p>{formatListDateTime(row.updatedAt)}</p>
                </>
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: type === 1 ? 130 : 100,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    {/* {
                        checkRole('ADMIN') ? <>
                            <ButtonMR
                                onClick={() => {
                                    handleOnClick(actionType.UPDATE, record);
                                }}
                                className="btnLink"
                            >
                                <EditOutlined />
                            </ButtonMR>

                            <ButtonMR
                                onClick={() => {
                                    handleOnClick(actionType.RESET_PASSWORD, record);
                                }}
                                className="btnLink"
                            >
                                <UserSwitchOutlined />
                            </ButtonMR>
                        </> : ""
                    } */}
                    <ButtonMR
                        onClick={() => {
                            handleOnClick(actionType.UPDATE, record);
                        }}
                        className="btnLink"
                    >
                        <EditOutlined />
                    </ButtonMR>

                    {type === 1 ? (
                        <Tooltip title="Duplicate customer">
                            <ButtonMR
                                onClick={() => {
                                    dispatch(
                                        actions.saveInto(
                                            { id: record?.id },
                                            actionType.DUPLICATE,
                                            false,
                                        ),
                                    );
                                }}
                                className="btnLink"
                            >
                                <CopyOutlined />
                            </ButtonMR>
                        </Tooltip>
                    ) : null}

                    <ButtonMR
                        onClick={() => {
                            handleOnClick(actionType.RESET_PASSWORD, record);
                        }}
                        className="btnLink"
                    >
                        <UserSwitchOutlined />
                    </ButtonMR>
                    <ButtonMR
                        onClick={() => {
                            handleOnClick(actionType.CHANGE_STATUS, record);
                        }}
                        className="btnLink"
                    >
                        <ToolOutlined />
                    </ButtonMR>
                    {
                        record?.username !== 'admin' && +record?.id !== 1 ? <Popconfirm
                            title={
                                +record?.type === userType.CUSTOMER
                                    ? "Permanently delete this customer? Only their job-site lines and reports are removed. Other customers are not affected."
                                    : +record?.type === userType.STAFF
                                    ? "Permanently delete this staff member? Their site assignments and tasks are removed. Other staff are not affected."
                                    : "Permanently delete this admin user?"
                            }
                            okText={intl.formatMessage({ id: "button.Yes" })}
                            cancelText={intl.formatMessage({ id: "button.No" })}
                            placement="topRight"
                            onConfirm={(e) => { dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false)); }}
                        >
                            <button className="btnDelete"  ><DeleteOutlined /> </button>
                        </Popconfirm>
                            : ""
                    }
                </div>
            ),
        },
    ], [type, dispatch, intl, loading]);

    const handleResetSearch = async (
        pageArg: number = 1,
        limitArg: number = USERS_LIST_PAGE_LIMIT,
        orderBy: string = 'id',
        orderValue: string = 'DESC',
    ) => {
        const formData = await form.validateFields();
        dispatch(actions.getData({
            keyword: formData?.Name ? formData?.Name?.trim() : '',
            page: pageArg,
            limit: limitArg,
            type,
            orderBy,
            orderValue,
            includeDeleted: true,
        }));
    };

    const onTableChange = (pagination: any, filters, sorter): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'id', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    };

    const handleOnClick = (data: string, row?: any): void => {
        if (data === actionType.ADD) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.ADD, row: null } });
        } else if (data === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.UPDATE, row } });
        } else if (data === actionType.RESET_PASSWORD) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.RESET_PASSWORD, row } });
        } else if (data === actionType.CHANGE_STATUS) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.CHANGE_STATUS, row } });
        } else if (data === actionType.VIEW_ALL) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.VIEW_ALL, row } });
        } else {
            handleResetSearch(page, limit);
        }
    };

    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    }, [success]);


    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        setPage(pageData);
        setLimit(USERS_LIST_PAGE_LIMIT);
        handleResetSearch(pageData, USERS_LIST_PAGE_LIMIT);
        return () => {
            dispatch(actions.clearData());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

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
                        icon={<SearchOutlined />}
                    >
                        {intl.formatMessage({ id: "sidebar.users.search" })}
                    </ActionBtn>
                    <ActionBtn
                        onClick={() => {
                            handleOnClick(actionType.ADD);
                        }}
                        type="primary"
                        icon={<FileAddOutlined />}
                    >
                        {intl.formatMessage({ id: "sidebar.users.new" })}
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
                    />
                </InformationDiv>
            </UsersDiv>
            {modalType ?
                modalType === actionType.RESET_PASSWORD ? (
                    <ResetPasswordModal
                        title="Change password"
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        isSuccess={success}
                    />
                ) : modalType === actionType.CHANGE_STATUS ? (
                    <ChangeStatusModal
                        title={"Change status"}
                        loadingAction={loadingAction}
                        data={row}
                        modalType={modalType}
                        isSuccess={success}
                    />
                ) : modalType === actionType.VIEW_ALL ? (
                    <AllUserModal
                                title={row.fullName}
                                loadingAction={loadingAction}
                                data={row}
                                modalType={modalType}
                                isSuccess={success} staffId={row.id} roles={undefined}                    />
                ) : type === 1 ?
                    (
                        <CustomerModal
                            type={type}
                            title={modalType === actionType.ADD ? "Add new customer" : "Update customer"}
                            loadingAction={loadingAction}
                            data={row}
                            roles={roles}
                            companies={companies}
                            modalType={modalType}
                            isSuccess={success}
                        />
                    )
                    : (
                        <AdminModal
                            type={type}
                            title={modalType === actionType.ADD ? (type === 2 ? "Add new Staff" : "Add new Admin") : (type === 2 ? "Update Staff" : "Update Admin")}
                            loadingAction={loadingAction}
                            data={row}
                            roles={roles}
                            modalType={modalType}
                            isSuccess={success}
                        />
                    )
                : ""}
        </Layout>
    );
};
export default Index;
