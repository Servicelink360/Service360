import { ReloadOutlined} from "@ant-design/icons";
import { ActionBtn, TableWrapper,} from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, pageData } from "@app/config/data.config";
import { Col, Row, Form, Input, Tag } from "antd";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/sites/actions";
import TableComponent from "@app/components/common/Table/index";
import { ButtonDiv, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset } from "@app/components/common/container.style";
import SiteModal from "@app/components/sites";
import TaskModal from "@app/components/tasks";
import TaskLogModal from "@app/components/tasks/task-log";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { formatTime } from "../../library/helpers/utility";

const JOB_SITES_LIST_LIMIT = 50;

const Unit: React.FC = () => {
    const [limit, setLimit] = useState(JOB_SITES_LIST_LIMIT);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, success, modalType, customers, count, loadingAction, services, staffs, reportTemplates } = useSelector((state: any) => state?.sites);
    const dispatch = useDispatch();
    const columns: ColDef[] | any = useMemo(() => [
        {
            title: "Job site name",
            dataIndex: "name",
            sorter: true,
            render: (text, row) => {
                return text
            }
        },
        {
            title: 'Location',
            dataIndex: "location",
        },
        {
            title: intl.formatMessage({ id: "table.column.address" }),
            dataIndex: "addressName",
            sorter: true,
        },
    ], [intl]);

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };
 

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.ADD) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.VIEW_LOG) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.ADD_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row: { siteItemId: row.id } } });
        } else if (modalType === actionType.UPDATE_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.UPDATE) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.SEARCH) {
            setPage(1);
            handleResetSearch(1, limit);
        } else {
            handleResetSearch(page, limit);
        }
    };

    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleResetSearch = async (page: any = 1, limit: any = 100, orderBy: string = 'id', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({ keyword: formData?.Name ? formData?.Name?.trim() : '', page, limit, orderBy, orderValue })
        );
    }

    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'id', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    }

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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    }

   
    const expandedRowRender = (item) => {
        const columnItems: ColDef[] | any = [
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
                title: 'Staffs',
                dataIndex: "staffs",

                render: (text: string, row: any) => {
                    if (row?.staffs && row?.staffs.length > 0)
                        return row.staffs.map((r) => {
                            if (!r.staff)
                                return "";
                            return <Tag  key={"s"+r.id} style={{ marginBottom: 6 }}>{r.staff.fullName}</Tag>
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
                                const t = row.type === "E" ? <Tag>Everyday</Tag> : rr.type === "W" ? <Tag>Working day</Tag> : rr?.typeValue && rr?.typeValue.split(',').map((k) => <Tag  key={row.id+"-"+r}>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);
                                return <p style={{ marginBottom: 6 }} key={r.id + "-" + rr.id}>
                                    <p>{r.staff.fullName} {formatTime(rr.startTime) + "-" + formatTime(rr.endTime) + "  "} {t}</p>
                                </p>
                            })
                        })
                    return ""
                },
            },

        ];

        const data = [];
        for (let i = 0; i < item?.items?.length; ++i) {
            data.push({
                ...item?.items[i],
                key: i,
            });
        }
        return <TableWrapper
            columns={columnItems}
            dataSource={data}
            pagination={false}
            expandable={{ expandedRowRender: expandedRowRenderTask }}

        />;
    }

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
                        }}>{moment(row.startDate).format(dateFormat) + " " + formatTime(h.from) + " - " + (moment(row.startDate).format(dateFormat) + " " + formatTime(h.to)) + "  "}</p>
                    })
                },
            },
            {
                title: "Repeat",
                dataIndex: "shift",
                render: (text: string, row: any) => {
                    if (row?.type)
                        return row.type === "E" ? <Tag>Everyday</Tag> : row.type === "W" ? <Tag>Working day</Tag> : row?.typeValue && row?.typeValue.split(',').map((r) => <Tag key={row.id+"-"+r}>{+r === 0 ? "Mon" : +r === 1 ? "Tue" : +r === 2 ? "Wed" : +r === 3 ? "Thu" : +r === 4 ? "Fri" : +r === 5 ? "Sat" : +r === 6 ? "Sun" : ""}</Tag>)
                    return ""
                },
                width: 120,
            }
        ];

        const data = [];
        for (let i = 0; i < item.tasks.length; ++i) {
            for (let j = 0; j < item.tasks[i].shifts.length; ++j) {

            }
            data.push({
                ...item.tasks[i],
                // ...item.tasks[i].shifts[j],
                key: "task" + i.toString()
            });

        }
        return <TableWrapper columns={columns} dataSource={data} pagination={false} />;
    }

    return (
        <Layout title="sidebar.jobSites">
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
                <UsernameRow>
                    <span className="gFontSize" style={{ fontWeight: 500 }}>
                        {intl.formatMessage({ id: "jobSites.total" }, { count: count ?? 0 })}
                    </span>
                </UsernameRow>
                <InformationDiv>
                    {rows.length > 0 ? <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        expandedRowRender={expandedRowRender}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        totalUnit="sites"
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
                            isSuccess={success} userId={0} taskId={0} taskShiftId={0}                  />
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
