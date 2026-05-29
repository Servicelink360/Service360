import {
    DeleteOutlined,
    EditOutlined,
    FileAddOutlined,
    SearchOutlined,
    FileSyncOutlined,
    CheckCircleOutlined,
    MessageOutlined
} from "@ant-design/icons";
import {
    ActionBtn,
    ActionListBtn,
    TableWrapper,
} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { limitData, pageData } from "@app/config/data.config";
import { Col, Popconfirm, Row, Form, Input, Tag, Image } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tickets/actions";
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
import { ticketStatus } from "../../constants/statusUser";
const Index: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, success, modalType, count, loadingAction } = useSelector((state: any) => state?.tickets);
    const dispatch = useDispatch();
    const [sites, setSites] = useState([]);
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') ? urlParams.get('status') : ''
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }
    const getFilter = async () => {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getSites", 'GET');
        if (res && res.data) {
            setSites(res.data)
        }
    }

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Customer name",
            dataIndex: "companyName",
            sorter: true,
            render: (_: string, row: any) => row.companyName || row.customerName || "",
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
                        (+profile.type === 1) && (checkRole('ADMIN') || checkRole('EDIT')) ? <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.UPDATE, record);
                            }}
                            className="btnLink"
                        >
                            <EditOutlined />
                        </ButtonMR> : ""
                    }

                    {
                        (+profile.type === 3) && record.status === ticketStatus.PENDING &&
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
                        (+profile.type === 3) && (record.status === ticketStatus.INPROGRESS) &&
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
    ], [intl, profile]);

    const expandedRowRender = (item) => {
        const columnItems: ColDef[] | any = [
            {
                title: "Sender",
                dataIndex: "type",
                render: (text: string, row: any) => {
                    if (row.type === 1) {
                        return <Tag color="#ffc107">Customer</Tag>
                    }
                    if (row.type === 2) {
                        return <Tag color="#F44336">Support</Tag>
                    }
                },
                width: 120,
            },
            {
                title: "Message",
                dataIndex: "message",

            },

            {
                title: "Media files",
                dataIndex: "attachFiles",
                render: (text: string, row: any) => {
                    return row.attachFiles && JSON.parse(row.attachFiles).map((r): any => {
                        return <Image src={r} width={50} height={50} />
                    })
                },
                width: 220,
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
                if (+item.status === 1) {
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
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [success]);

    useEffect(() => {
        handleResetSearch(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);


    const handleResetSearch = async (page: any = 1, limit: any = 100, orderBy: string = 'createdAt', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, orderBy, orderValue, status })
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
        getFilter()
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
