import { EditOutlined, SearchOutlined, EyeOutlined, FilePdfOutlined, FileAddOutlined, CopyOutlined } from "@ant-design/icons";
import { DeleteOutlined } from "@ant-design/icons";
import { ActionBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import { Col, Row, Form, Input, Tag, Select, Button, message, Tooltip } from "antd";
import { Popconfirm } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import FormInput from "@app/components/common/FormItem/Input";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/report-templates/actions";
import TableComponent from "@app/components/common/Table/index";
import { checkRole } from "../../library/helpers/utility";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv, Fieldset } from "@app/components/common/container.style";
import ReportTemplateModal from "@app/components/report-templates";
import UserTaskModal from "@app/components/tasks/user-task-create-report";
import ReportPreview from "@app/components/report-templates/report-preview";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import { reportTemplateCategories } from "../../constants/statusUser";
import { callAPIAsync } from "../../library/helpers/api";
import serviceType from "@app/constants/serviceType";
import endPoint from "@app/constants/endPoint";

const Unit: React.FC = () => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const intl = useIntl();
    const { loading, rows, row, info, success, modalType, count, loadingAction, loadingDetail } = useSelector((state: any) => state?.reportTemplates);
    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null)
    const dispatch = useDispatch();
    const [previewRecord, setPreviewRecord] = useState<any>(null)
    const [previewVisible, setPreviewVisible] = useState(false)
    const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>(reportTemplateCategories)
    const [showStaffReportModal, setShowStaffReportModal] = useState(false);
    const [staffReportTemplate, setStaffReportTemplate] = useState<any>(null);
    const [staffOptions, setStaffOptions] = useState<{ value: number; label: string }[]>([]);
    const [ServiceOptions, setServiceOptions] = useState<{ value: number; label: string }[]>([]);

    const staffLabelById = useMemo(() => {
        return staffOptions.reduce((acc, s) => {
            acc[s.value] = s.label;
            return acc;
        }, {} as Record<number, string>);
    }, [staffOptions]);

    const categoryLookup = useMemo(() => {
        return categoryOptions.reduce((acc, item) => {
            acc[item.id] = item.name
            return acc
        }, {} as Record<string, string>)
    }, [categoryOptions])

    const fetchCategories = useCallback(async () => {
        try {
            const response = await callAPIAsync(serviceType.COMMON, `${endPoint.REPORT_TEMPLATES}/categories`, "GET");
            if (response?.code === 1 && Array.isArray(response?.data)) {
                setCategoryOptions(response.data);
                return;
            }
            if (response?.message) {
                message.error(response.message);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to load report template categories', error);
            message.error('Unable to load categories.');
        }
    }, []);

    const handleCategoryAdded = useCallback((value: string, label?: string) => {
        setCategoryOptions((prev) => {
            const exists = prev.some((item) => item.id.toLowerCase() === value.toLowerCase());
            if (exists) {
                return prev;
            }
            const updated = [...prev, { id: value, name: label || value }];
            return updated.sort((a, b) => a.name.localeCompare(b.name));
        });
    }, []);

    const handleCategoryAddedAndRefresh = useCallback((value: string, label?: string) => {
        handleCategoryAdded(value, label);
        fetchCategories();
    }, [handleCategoryAdded, fetchCategories]);

    const columns: ColDef[] | any = useMemo(() => [
        {
            title: intl.formatMessage({ id: "table.column.name" }),
            dataIndex: "name",
            sorter: true
        },
        {
            title: 'Description',
            dataIndex: "description",
            width: 300,
        },
        {
            title: 'Category',
            dataIndex: "category",
            width: 180,
            render: (value: string) => value ? <Tag color="blue">{categoryLookup[value] || value}</Tag> : null,
        },
        {
            title: 'Assign to',
            dataIndex: 'assignedStaffId',
            width: 160,
            render: (staffId: number | null) => {
                if (staffId == null) {
                    return <Tag>None</Tag>;
                }
                if (+staffId === 0) {
                    return <Tag color="green">All</Tag>;
                }
                return staffLabelById[staffId] || `Staff #${staffId}`;
            },
        },
        {
            title: "Created by",
            width: 160,
            dataIndex: "createdAt",
            sorter: true,
            render: (text: string, row: any) => {
                return <>
                    <p>{row.createdUser ? row.createdUser?.fullName : ""}</p>
                    <p>{moment(row.createdAt).utcOffset(600).format(dateTimeFormat)}</p>
                </>
            }
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 140,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    <Tooltip title="Preview template">
                        <ButtonMR
                            onClick={() => {
                                setPreviewRecord(record);
                                setPreviewTemplateId(Number(record.id));
                                setPreviewVisible(true);
                                if (record?.id) {
                                    dispatch(actions.getInfo(record.id));
                                }
                            }}
                            className="btnLink"
                        >
                            <FilePdfOutlined />
                        </ButtonMR>
                    </Tooltip>
                    {
                        checkRole('ADMIN') || checkRole('EDIT') ? (
                            <Tooltip title="Edit template">
                                <ButtonMR
                                    onClick={() => {
                                        handleOnClick(actionType.UPDATE, record);
                                    }}
                                    className="btnLink"
                                >
                                    <EditOutlined />
                                </ButtonMR>
                            </Tooltip>
                        ) : ""
                    }

                    {
                        checkRole('ADMIN') || checkRole('EDIT') ? (
                            <Tooltip title="Duplicate template">
                                <ButtonMR
                                    onClick={() => {
                                        dispatch(actions.saveInto({ id: record?.id }, actionType.DUPLICATE, false));
                                    }}
                                    className="btnLink"
                                >
                                    <CopyOutlined />
                                </ButtonMR>
                            </Tooltip>
                        ) : ""
                    }

                    <Tooltip title="View details">
                        <ButtonMR
                            onClick={() => {
                                handleOnClick(actionType.VIEW, record);
                            }}
                            className="btnLink"
                        >
                            <EyeOutlined />
                        </ButtonMR>
                    </Tooltip>

                    {
                        checkRole('ADMIN') || checkRole('DELETE') ? (
                            <Popconfirm
                                title={intl.formatMessage({ id: "notification.confirm_delete", })}
                                okText={intl.formatMessage({ id: "button.Yes" })}
                                cancelText={intl.formatMessage({ id: "button.No" })}
                                placement="topRight"
                                onConfirm={() => { dispatch(actions.saveInto({ id: record?.id }, actionType.DELETE, false)); }}
                            >
                                <button className="btnDelete"  ><DeleteOutlined /> </button>
                            </Popconfirm>
                        ) : ""
                    }
                </div>
            ),
        },
    ], [categoryLookup, staffLabelById, dispatch, intl]);

    const templateModalData = useMemo(() => {
        if (!row?.id) {
            return row ?? {}
        }
        const rowId = Number(row.id)
        if (Number(info?.id) === rowId) {
            return info
        }
        return row
    }, [row, info])

    const previewData = useMemo(() => {
        if (!previewTemplateId) {
            return previewRecord
        }
        if (Number(info?.id) === previewTemplateId) {
            return info
        }
        return previewRecord
    }, [previewTemplateId, previewRecord, info])

    const handleOnClick = (modalType: string, row?: any): void => {
        if (modalType === actionType.ADD_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row: { ReportTemplateItemId: row.id } } });
        } else if (modalType === actionType.UPDATE_ITEM) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
        } else if (modalType === actionType.ADD || modalType === actionType.UPDATE || modalType === actionType.VIEW) {
            dispatch({ type: actions.MODAL, payload: { modalType, row } });
            if ((modalType === actionType.UPDATE || modalType === actionType.VIEW) && row?.id) {
                dispatch(actions.getInfo(row.id));
            }
        } else {
            handleResetSearch(page, limit);
        }
    };

    const handleResetSearch = useCallback(async (page: any = 1, limit: any = 100, orderBy: string = 'id', orderValue: string = 'DESC') => {
        const formData = await form.validateFields();
        dispatch(
            actions.getData({
                keyword: formData?.Name ? formData?.Name?.trim() : '',
                category: formData?.Category || undefined,
                page,
                limit,
                orderBy,
                orderValue
            })
        );
    }, [dispatch, form])

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        (async () => {
            const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.COMMON}/getInitData?items=USERS`,
                'GET',
            );
            if (res?.code === 1 && Array.isArray(res?.data?.users)) {
                const opts = res.data.users
                    .filter((u: any) => +u.type === 2)
                    .map((u: any) => ({
                        value: +u.id,
                        label: u.fullName || u.username || `Staff #${u.id}`,
                    }))
                    .sort((a: { label: string }, b: { label: string }) =>
                        a.label.localeCompare(b.label),
                    );
                setStaffOptions(opts);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            const res = await callAPIAsync(serviceType.COMMON, `${endPoint.SERVICES}/getAll`, 'GET');
            if (res?.code === 1 && Array.isArray(res?.data)) {
                const opts = res.data
                    .map((d: any) => ({
                        value: +d.id,
                        label: d.name || `Service #${d.id}`,
                    }))
                    .filter((d: { value: number }) => Number.isFinite(d.value) && d.value > 0)
                    .sort((a: { label: string }, b: { label: string }) =>
                        a.label.localeCompare(b.label),
                    );
                setServiceOptions(opts);
            }
        })();
    }, []);

    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
            fetchCategories();
        }
    }, [success, page, limit, handleResetSearch, fetchCategories]);

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
    }, [])

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
                        (checkRole('ADMIN') || checkRole('EDIT')) ? (
                            <ActionBtn
                                onClick={() => {
                                    handleOnClick(actionType.ADD);
                                }}
                                type="primary"
                                icon={<FileAddOutlined />}
                            >
                                {intl.formatMessage({ id: "sidebar.users.new" })}
                            </ActionBtn>
                        ) : checkRole('STAFF') ? (
                            <ActionBtn
                                onClick={async () => {
                                    // Fetch or select the default report template for staff
                                    // For now, just pick the first available template
                                    if (rows && rows.length > 0) {
                                        setStaffReportTemplate(rows[0]);
                                    } else {
                                        setStaffReportTemplate(null);
                                    }
                                    setShowStaffReportModal(true);
                                }}
                                type="primary"
                                icon={<FileAddOutlined />}
                            >
                                {intl.formatMessage({ id: "sidebar.users.new" })}
                            </ActionBtn>
                        ) : ""
                    }
                </ButtonDiv>
            </>
        );
    };

    return (
        <Layout title="Report templates">
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
                                <Col lg={12} md={12} sm={24} xs={24}>
                                    <Fieldset>
                                        <Form.Item name="Category" label="Category">
                                            <Select
                                                allowClear
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="Select category"
                                                options={categoryOptions.map(item => ({ label: item.name, value: item.id }))}
                                            />
                                        </Form.Item>
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
                        heightTable="450px"
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
                (
                    <ReportTemplateModal
                        title={
                            modalType === actionType.ADD
                                ? "Add new template"
                                : modalType === actionType.VIEW
                                    ? "View template"
                                    : "Edit template"
                        }
                        loadingAction={loadingAction}
                        loadingDetail={loadingDetail}
                        data={templateModalData}
                        modalType={modalType}
                        isSuccess={success}
                        categoryOptions={categoryOptions}
                        staffOptions={staffOptions}
                        ServiceOptions={ServiceOptions}
                        onCategoryAdded={handleCategoryAddedAndRefresh}
                    />
                ) : null}
            {showStaffReportModal && (
                <UserTaskModal
                    loadingAction={false}
                    isSuccess={false}
                    modalType={"STAFF_REPORT"}
                    data={null}
                    title={"Submit Report"}
                    getDataInit={() => {}}
                    reportTemplate={staffReportTemplate}
                />
            )}
            {previewVisible && previewData ? (
                <ReportPreview
                    visible={previewVisible}
                    data={previewData}
                    onClose={() => {
                        setPreviewVisible(false)
                        setPreviewRecord(null)
                        setPreviewTemplateId(null)
                    }}
                />
            ) : null}
        </Layout>
    );
};
export default Unit;
