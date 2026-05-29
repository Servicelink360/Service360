import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import {
    ActionListBtn,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/roles/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset, ActionsWrapper } from "@app/components/common/container.style";
import UnitModal from "@app/components/roles";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { checkRole } from "../../library/helpers/utility";
const Index: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const {
        loading,
        rows,
        row,
        success,
        modalType,
        count,
        loadingAction
    } = useSelector((state: any) => state?.roles);
    const dispatch = useDispatch();

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: 'Id',
            dataIndex: "id",
            width: 150,
            sorter: true,
        },
        {
            title: intl.formatMessage({ id: "table.column.name" }),
            dataIndex: "name",
           
            sorter: true,
        },
        {
            title: intl.formatMessage({ id: "table.column.description" }),
            dataIndex: "description",
        },
        {
            title: "Created by",
            width: 160,
            dataIndex: "createdAt",
            sorter: true,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
                    <p>{moment(row.createdAt).utcOffset("+10:00").format(dateTimeFormat)}</p>
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
                    <p>{moment(row.updatedAt).utcOffset("+10:00").format(dateTimeFormat)}</p>
                </>
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            align:'center',
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    {
                        checkRole('ADMIN') || checkRole('EDIT') ?<ButtonMR
                        onClick={() => {
                            handleOnClick(actionType.UPDATE, record);
                        }}
                        className="btnLink"
                    >
                        <EditOutlined />
                    </ButtonMR>:""
                    }
                    <Popconfirm
                        title={intl.formatMessage({ id: "notification.confirm_delete", })}
                        okText={intl.formatMessage({ id: "button.Yes" })}
                        cancelText={intl.formatMessage({ id: "button.No" })}
                        placement="topRight"
                        onConfirm={(e) => {
                             dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false));
                           // notification('error','Bạn không thể xóa, vui lòng thông báo tới quản trị viên')
                        }}
                    >
                        <button className="btnDelete"  ><DeleteOutlined /> </button>
                    </Popconfirm>
                </div>
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);


    const handleOnClick = (data: string, row?: any): void => {
        if (data === actionType.ADD) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.ADD, row } });
        } else if (data === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType: actionType.UPDATE, row } });
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


    const handleResetSearch = async (page: any = 1, limit: any = 100, orderBy: string = 'createdAt', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, orderBy, orderValue })
        );
    };
    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'createdAt', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
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
            {modalType && (
                <UnitModal
                    title={modalType === actionType.ADD ? "Add new" : "Update"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                />
            )}
        </Layout>
    );
};
export default Index;
