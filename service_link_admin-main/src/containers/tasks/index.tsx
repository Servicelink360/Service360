import { SearchOutlined, FilePdfOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, EyeOutlined, FormOutlined, FileAddOutlined, SaveOutlined, MailOutlined, UndoOutlined } from "@ant-design/icons";
import { ActionListBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { dateFormat, dateTimeFormat, limitData, pageData } from "@app/config/data.config";
import urlConfig from "@app/config/site.config";
import { FaultMedia, isFaultVideoUrl } from "@app/components/report-faults/fault-media";
import { Button, Col, Form, Image, Input, Modal, Popconfirm, Tag, Tooltip, message } from "antd";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom";
import { ColDef } from "ag-grid-community";
import actions from "@app/redux/tasks/actions";
import TableComponent from "@app/components/common/Table/index";
import UserTaskModal from "@app/components/tasks/user-task-create-report";
import { ButtonDiv, ButtonMR, InformationDiv, StatusRow, UsernameRow, UsersDiv } from "@app/components/common/container.style";
import { GlobalHotKeys } from "react-hotkeys";
import actionType from "../../constants/actionType";
import endPoint from "../../constants/endPoint";
import { dJobStatus, userType } from "../../constants/statusUser";
import { checkRole } from "../../library/helpers/utility";
import intl from "../../library/helpers/intlProvider";
import { notification } from "../../components";
import "../staff-my-tasks/staff-my-tasks.css";

const closeTaskModal = { modalType: null, row: null };

const cleanText = (value?: string | null) => String(value || "").trim();

const parseMediaUrls = (task: any): string[] => {
    const urls: string[] = [];
    const push = (value: unknown) => {
        if (!value) return;
        if (Array.isArray(value)) {
            value.forEach((item) => {
                if (typeof item === "string" && item.trim()) urls.push(item.trim());
                else if (item && typeof item === "object" && (item as any).url) {
                    urls.push(String((item as any).url).trim());
                }
            });
            return;
        }
        if (typeof value === "string") {
            const raw = value.trim();
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                push(parsed);
            } catch {
                if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) urls.push(raw);
            }
        }
    };
    push(task?.images);
    push(task?.attachFiles);
    if (Array.isArray(task?.items)) {
        for (const item of task.items) {
            const type = String(item?.type || "").toUpperCase();
            if (type === "IMAGE" || type === "IMAGES" || type === "PHOTO" || type === "MEDIA") {
                push(item?.value);
            }
        }
    }
    return [...new Set(urls.filter(Boolean))];
};

const scheduleWhen = (task: any) => {
    if (!task?.startTime) return "—";
    const day = moment(task.startTime).utcOffset("+10:00").format(dateFormat);
    const from = moment(task.startTime).utcOffset("+10:00").format("HH:mm");
    const to = task.endTime ? moment(task.endTime).utcOffset("+10:00").format("HH:mm") : "";
    return to ? `${day} · ${from}–${to}` : `${day} · ${from}`;
};

const scheduleStatusTag = (status: number) => {
    if (status === dJobStatus.NEW || status === dJobStatus.PENDING) {
        return <Tag color="#ffc107">Pending</Tag>;
    }
    if (status === dJobStatus.INPROGRESS) return <Tag color="#F44336">In progress</Tag>;
    if (status === dJobStatus.COMPLETED) return <Tag color="#4caf50">Completed</Tag>;
    return <Tag>—</Tag>;
};

const taskStaffName = (task: any) =>
    cleanText(task?.staff?.fullName) ||
    cleanText(task?.updatedUser?.fullName) ||
    '—';

const completedAtLabel = (task: any) => {
    const at = task?.checkOut || task?.updatedAt;
    return at ? moment(at).utcOffset('+10:00').format(dateTimeFormat) : '';
};

interface IProps {
    staffId?: number
    /** Render list only (no page Layout) — used inside unified /my-tasks */
    embedded?: boolean
}
const Task = (props: IProps) => {
    const [limit, setLimit] = useState(limitData);
    const [page, setPage] = useState(pageData);
    const [form] = Form.useForm();
    const { staffId, embedded } = props;
    const { loading, rows, row, success, modalType, count, loadingAction, reportTemplates } = useSelector((state: any) => state?.tasks);
    const dispatch = useDispatch();
    const location = useLocation();
    const status = new URLSearchParams(location.search).get('status') || '';
    const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    const history = useHistory();
    // Staff: schedule tasks live under /my-tasks — keep old /task-today links working
    useEffect(() => {
        if (embedded || staffId) return;
        if (profile && +profile.type === userType.STAFF) {
            history.replace(status === 's' ? '/my-tasks?view=done' : '/my-tasks');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history, status]);

    const openTaskPdfFromDb = useCallback(async (taskId: number) => {
        if (!taskId) return;
        setPdfBusyId(taskId);
        const hide = message.loading('Generating PDF from database…', 0);
        try {
            const token = localStorage.getItem('id_token') || '';
            const res = await fetch(
                `${urlConfig.orderApiURL}${endPoint.USER_TASKS}/${taskId}/pdf`,
                {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            if (!res.ok) {
                let msg = 'Could not generate PDF';
                try {
                    const body = await res.json();
                    if (body?.message) msg = body.message;
                } catch {
                    /* ignore */
                }
                notification('error', msg, '');
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (e) {
            notification('error', (e as Error)?.message || 'Could not generate PDF', '');
        } finally {
            hide();
            setPdfBusyId(null);
        }
    }, []);

    // Restore main handler functions (single instance, not duplicated)

    const handleResetSearch = React.useCallback((page: any = 1, limit: any = 100, orderBy: string = 'id', orderValue: string = 'DESC') => {
        const formData = form.getFieldsValue();
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
    }, [dispatch, page, limit, handleResetSearch]);

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
            width: 160,
            fixed: "right",
            align: 'center',
            dataIndex: "action",
            render: (text: string, row: any) => {
                if (profile && +profile.type === userType.ADMIN) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Tooltip title="View">
                                <ButtonMR
                                    className="btnLink"
                                    onClick={() => handleOnClick(actionType.VIEW, row)}
                                >
                                    <EyeOutlined />
                                </ButtonMR>
                            </Tooltip>
                            <Tooltip title="Generate PDF from database">
                                <Button
                                    type="link"
                                    icon={<FilePdfOutlined />}
                                    loading={pdfBusyId === +row.id}
                                    disabled={!row?.id || pdfBusyId === +row.id}
                                    onClick={() => void openTaskPdfFromDb(+row.id)}
                                />
                            </Tooltip>
                            <Tooltip title="Message about this task">
                                <Link to={`/messages?userTaskId=${row.id}`}>
                                    <Button
                                        type="link"
                                        icon={<MailOutlined />}
                                        aria-label="Message about this task"
                                    />
                                </Link>
                            </Tooltip>
                            {(checkRole('ADMIN') || checkRole('EDIT')) &&
                            +row.status !== dJobStatus.COMPLETED &&
                            row.reportTemplateId ? (
                                <Tooltip title="Edit report">
                                    <ButtonMR
                                        onClick={() => { handleOnClick(actionType.CREATE_REPORT, row); }}
                                        className="btnLink"
                                    >
                                        <EditOutlined />
                                    </ButtonMR>
                                </Tooltip>
                            ) : null}
                            {+row.status === dJobStatus.COMPLETED &&
                            (checkRole('ADMIN') || checkRole('EDIT')) ? (
                                <Tooltip title="Reopen task">
                                    <Popconfirm
                                        title="Reopen this completed task?"
                                        okText={intl.formatMessage({ id: "button.Yes" })}
                                        cancelText={intl.formatMessage({ id: "button.No" })}
                                        placement="topRight"
                                        onConfirm={() => {
                                            dispatch(
                                                actions.saveInto(
                                                    { id: row?.id, status: dJobStatus.PENDING },
                                                    actionType.UPDATE,
                                                    false,
                                                ),
                                            );
                                        }}
                                    >
                                        <Button type="link" icon={<UndoOutlined />} aria-label="Reopen task" />
                                    </Popconfirm>
                                </Tooltip>
                            ) : null}
                            <Popconfirm
                                title={intl.formatMessage({ id: "notification.confirm_delete", })}
                                okText={intl.formatMessage({ id: "button.Yes" })}
                                cancelText={intl.formatMessage({ id: "button.No" })}
                                placement="topRight"
                                onConfirm={() => {
                                    dispatch(actions.saveInto({ id: row?.id }, actionType.DELETE, false));
                                }}
                            >
                                <button className="btnDelete"><DeleteOutlined /></button>
                            </Popconfirm>
                        </div>
                    );
                }

                return <div>
                    {
                        (+row.status === 0 || +row.status === 2) ?
                            <Popconfirm
                                title={"do you want to check in?"}
                                okText={intl.formatMessage({ id: "button.Yes" })}
                                cancelText={intl.formatMessage({ id: "button.No" })}
                                placement="topRight"
                                onConfirm={() => { dispatch(actions.saveInto({ ...row, status: 3 }, actionType.CHECK_IN, false)); }}
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
                                        onConfirm={() => {
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
                </div>
            },
        },
    ]);
    }, [profile, dispatch, handleOnClick, openTaskPdfFromDb, pdfBusyId]);

    const getDataInit = async (payload) => {
        dispatch(actions.getDataInit(payload));
    };



    useEffect(() => {
        if (success) {
            handleResetSearch(page, limit);
        }
    }, [success, handleResetSearch, page, limit]);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
        setPage(pageData);
        handleResetSearch(pageData, limit);
    }, [status, handleResetSearch, limit]);

    useEffect(() => {
        return () => {
            dispatch(actions.clearData());
        };
    }, [dispatch]);

    const onTableChange = (pagination: any, filters, sorter, extra): void => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
        handleResetSearch(pagination.current, pagination.pageSize, sorter?.field ?? 'id', sorter?.order ? (sorter?.order === 'ascend' ? "ASC" : "DESC") : 'DESC');
    };

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
            {(modalType === actionType.VIEW ||
                (modalType === actionType.CREATE_REPORT && row && !row.reportTemplateId)) && row ? (
                <Modal
                    open
                    title={row.taskName || row.serviceName || "Task"}
                    onCancel={() => dispatch({ type: actions.MODAL, payload: closeTaskModal })}
                    footer={
                        <Button type="primary" onClick={() => dispatch({ type: actions.MODAL, payload: closeTaskModal })}>
                            Close
                        </Button>
                    }
                    width={640}
                >
                    <dl className="staff-my-tasks-view">
                        <div>
                            <dt>Site</dt>
                            <dd>{row.siteName || "—"}</dd>
                        </div>
                        <div>
                            <dt>Service</dt>
                            <dd>{row.serviceName || "—"}</dd>
                        </div>
                        <div>
                            <dt>Description</dt>
                            <dd>{cleanText(row.description) || "—"}</dd>
                        </div>
                        <div>
                            <dt>When</dt>
                            <dd>{scheduleWhen(row)}</dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd>{scheduleStatusTag(+row.status)}</dd>
                        </div>
                        {+row.status === dJobStatus.COMPLETED ? (
                            <div>
                                <dt>Completed by</dt>
                                <dd>
                                    {taskStaffName(row)}
                                    {completedAtLabel(row) ? ` · ${completedAtLabel(row)}` : ''}
                                </dd>
                            </div>
                        ) : null}
                        {+row.mediaRequired === 1 ? (
                            <div>
                                <dt>Media</dt>
                                <dd><Tag color="orange">Media required</Tag></dd>
                            </div>
                        ) : null}
                    </dl>
                    <div className="staff-my-tasks-media">
                        <div className="staff-my-tasks-media__label">Media files</div>
                        {(() => {
                            const mediaUrls = parseMediaUrls(row);
                            if (!mediaUrls.length) {
                                return <p className="staff-my-tasks-media__empty">No media files</p>;
                            }
                            return (
                                <Image.PreviewGroup>
                                    <div className="staff-my-tasks-media__grid">
                                        {mediaUrls.map((url) =>
                                            isFaultVideoUrl(url) ? (
                                                <FaultMedia key={url} url={url} width={120} height={120} />
                                            ) : (
                                                <Image
                                                    key={url}
                                                    src={url}
                                                    width={88}
                                                    height={88}
                                                    style={{ objectFit: "cover", borderRadius: 4 }}
                                                />
                                            ),
                                        )}
                                    </div>
                                </Image.PreviewGroup>
                            );
                        })()}
                    </div>
                </Modal>
            ) : null}
            {modalType &&
            modalType !== actionType.VIEW &&
            !(modalType === actionType.CREATE_REPORT && row && !row.reportTemplateId) &&
            row ? (
                <UserTaskModal
                    title={"Completed task report"}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    getDataInit={getDataInit}
                    reportTemplate={reportTemplates.find(c => c.id === row?.reportTemplateId)}
                    isSuccess={success} />
            ) : null}
        </>
    }

    if (staffId || embedded) {
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
