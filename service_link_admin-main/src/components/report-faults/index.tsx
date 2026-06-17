import { CloseCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap,
    Label
} from '@app/components/common/Common.styles'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { getBase64, sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/report-faults/actions'
import { Button, Col, Form, Modal, Row, Upload, Image } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIAsync } from '../../library/helpers/api'
import { notificationComponent } from '@app/components/common/Notification/index'
import FormSelect from "@app/components/common/FormItem/Select";
import SvCheckBox from '../common/FormItem/Checkbox'
import { userType } from '../../constants/statusUser'
import { REPORT_FAULT_ISSUE_OPTIONS } from '../../constants/reportFaultIssues'
import {
    isOtherSiteId,
    OTHER_SITE_ID,
    OTHER_SITE_OPTION,
} from '../../constants/reportFaultSites'

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
    sites: any[]
    issueOptions?: { id: string; name: string }[]
    uiDark?: boolean
}

const ReportFaultModal = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, sites, issueOptions, uiDark } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [open, setOpen] = useState(true)
    const [form] = Form.useForm()
    const [services, setServices] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>()
    const [isOtherSite, setIsOtherSite] = useState(false)
    const [staffAssignment, setStaffAssignment] = useState<any>(null)

    const tmpFileList: any[] = [];
    if (data && data.attachFiles) {
        try {
            for (const element of JSON.parse(data.attachFiles)) {
                tmpFileList.push({
                    uid: element,
                    percent: 50,
                    name: element.split('/')[element.split('/').length - 1],
                    status: 'done',
                    url: element,
                })
            }
        } catch {
            // ignore invalid attachFiles JSON
        }
    }

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [fileList, setFileList] = useState<any>(tmpFileList)
    const [files, setFiles] = useState<string[]>(data && data.attachFiles ? (() => {
        try { return JSON.parse(data.attachFiles); } catch { return []; }
    })() : [])

    const profileRaw = localStorage.getItem('profile');
    let profile: any = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    const isStaffUser = profile && +profile.type === userType.STAFF
    const hideDeptCustomerForStaff = isStaffUser && !data

    const handlePreview = async (file: any) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    };

    useEffect(() => {
        if (modalType) {
            setOpen(true);
        }
    }, [modalType]);

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
            setFileList([]);
            setFiles([]);
            setOpen(false);
        }
    }, [isSuccess, form])

    const handleChangeFile = async ({ fileList: nextList }: any) => {
        setFileList(nextList);
        setChanged(true)
    };

    const handleUpdaloadImage = async (options: any) => {
        const { onSuccess, onError, onProgress, file } = options;
        const raw = file.originFileObj ?? file;
        try {
            const response: any = await callAPIAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                "POST",
                { file: raw },
                {
                    onUploadProgress: (pct: number) => {
                        onProgress?.({ percent: pct });
                    },
                },
                true,
            );
            if (response?.code === 1) {
                setFiles((prev) => [...prev, response?.data]);
                setChanged(true);
                onSuccess?.(response, file);
            } else {
                onError?.(new Error(response?.message || "Upload failed"));
            }
        } catch (error: any) {
            onError?.(error);
        }
    };

    const loadServices = useCallback(async (siteId: number) => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getServicesBySite`, 'GET', { siteId });
        if (res?.data) setServices(res.data);
    }, []);

    const loadCustomers = useCallback(async (siteId: number, serviceId: string | number) => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getCustomersBySite`, 'GET', { siteId, serviceId });
        if (res?.data) setCustomers(res.data);
    }, []);

    const loadAllServices = useCallback(async () => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.SERVICES}/getAll`, 'GET', {});
        const list = Array.isArray(res?.data) ? res.data : res?.data?.rows;
        if (list) setServices(list);
    }, []);

    const loadCustomersForService = useCallback(async (serviceId: string | number) => {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.CUSTOMERS, 'GET', {
            limit: 500,
            serviceId,
        });
        const list = res?.data?.rows ?? res?.data;
        if (Array.isArray(list)) setCustomers(list);
    }, []);

    const applyStaffDefaultAssignment = useCallback(async () => {
        const res = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.JOB_SITES}/getStaffDefaultReportAssignment`,
            'GET',
            {},
        );
        const assignment = res?.data;
        if (!assignment?.customerId || !assignment?.serviceId) {
            setStaffAssignment(null);
            form.setFieldsValue({ serviceId: undefined, customerId: undefined });
            notificationComponent(
                'warning',
                3,
                'No customer or Service is linked to your staff profile for reporting.',
                '',
            );
            return false;
        }
        setStaffAssignment(assignment);
        form.setFieldsValue({
            serviceId: String(assignment.serviceId),
            customerId: +assignment.customerId,
        });
        return true;
    }, [form]);

    const applyStaffSiteAssignment = useCallback(async (siteId: number) => {
        const res = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.JOB_SITES}/getStaffReportAssignmentBySite`,
            'GET',
            { siteId },
        );
        const assignment = res?.data;
        if (!assignment?.customerId || !assignment?.serviceId) {
            setStaffAssignment(null);
            form.setFieldsValue({ serviceId: undefined, customerId: undefined });
            notificationComponent(
                'warning',
                3,
                'No customer or Service is linked to your assignment for this job site.',
                '',
            );
            return false;
        }
        setStaffAssignment(assignment);
        form.setFieldsValue({
            serviceId: String(assignment.serviceId),
            customerId: +assignment.customerId,
        });
        return true;
    }, [form]);

    const handleSiteChange = useCallback(async (option: any) => {
        const rawId = option?.id;
        if (rawId == null || option === null) {
            setIsOtherSite(false);
            setSelectedSiteId(undefined);
            form.setFieldsValue({
                serviceId: undefined,
                customerId: undefined,
                otherSiteName: undefined,
            });
            setServices([]);
            setCustomers([]);
            setStaffAssignment(null);
            return;
        }

        if (isOtherSiteId(rawId)) {
            setIsOtherSite(true);
            setSelectedSiteId(undefined);
            form.setFieldsValue({
                siteId: OTHER_SITE_ID,
                serviceId: undefined,
                customerId: undefined,
                otherSiteName: undefined,
            });
            setServices([]);
            setCustomers([]);
            setStaffAssignment(null);
            if (hideDeptCustomerForStaff) {
                try {
                    await applyStaffDefaultAssignment();
                } catch {
                    // ignore load errors so the modal stays usable
                }
            } else {
                try {
                    await loadAllServices();
                } catch {
                    // ignore load errors so the modal stays usable
                }
            }
            return;
        }

        const siteId = Number(rawId);
        setIsOtherSite(false);
        setSelectedSiteId(siteId);
        form.setFieldsValue({
            serviceId: undefined,
            customerId: undefined,
            otherSiteName: undefined,
        });
        setServices([]);
        setCustomers([]);
        setStaffAssignment(null);
        if (!siteId) return;
        if (hideDeptCustomerForStaff) {
            try {
                await applyStaffSiteAssignment(siteId);
            } catch {
                // ignore load errors so the modal stays usable
            }
            return;
        }
        try {
            await loadServices(siteId);
        } catch {
            // ignore load errors so the modal stays usable
        }
    }, [form, loadServices, loadAllServices, hideDeptCustomerForStaff, applyStaffSiteAssignment, applyStaffDefaultAssignment]);

    const handleServiceChange = useCallback(async (option: any) => {
        form.setFieldsValue({ customerId: undefined });
        setCustomers([]);
        if (option?.id == null) return;
        const siteId = form.getFieldValue('siteId');
        try {
            if (isOtherSiteId(siteId)) {
                await loadCustomersForService(option.id);
            } else if (siteId) {
                await loadCustomers(siteId, option.id);
            }
        } catch {
            // ignore load errors so the modal stays usable
        }
    }, [form, loadCustomers, loadCustomersForService]);

    useEffect(() => {
        if (!data) return;
        const siteId = data.siteId != null ? Number(data.siteId) : undefined;
        const customerId = data.customerId != null ? Number(data.customerId) : undefined;
        setSelectedSiteId(siteId);
        const initForm = async () => {
            try {
                if (siteId) {
                    await loadServices(siteId);
                }
                if (siteId && data.serviceId) {
                    await loadCustomers(siteId, data.serviceId);
                }
                form.setFieldsValue({
                    ...data,
                    siteId,
                    customerId,
                    serviceId: data.serviceId ?? undefined,
                    priority: +data.priority === 1,
                });
            } catch {
                // ignore init errors so the modal stays usable
            }
        };
        initForm();
    }, [data, form, loadServices, loadCustomers])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const handleClose = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setOpen(false);
        setChanged(false);
        setSelectedSiteId(undefined);
        setIsOtherSite(false);
        setServices([]);
        setCustomers([]);
        setStaffAssignment(null);
        dispatch(actions.closeModal());
    };

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        if (!isStaffUser && !files.length) {
            notificationComponent('error', 3, 'At least one media file is required', '');
            return;
        }

        const otherSite = isOtherSiteId(values.siteId);
        const site = otherSite
            ? null
            : siteOptionsWithOther.find((c) => Number(c.id) === Number(values.siteId));

        let serviceId: string;
        let serviceName: string;
        let customerId: number;
        let customerName: string;
        let companyName: string;

        if (hideDeptCustomerForStaff) {
            const assignment = staffAssignment;
            if (!assignment?.customerId || !assignment?.serviceId) {
                notificationComponent(
                    'error',
                    3,
                    otherSite
                        ? 'Unable to resolve customer and Service for this report. Contact your administrator.'
                        : 'Select a job site with a valid customer assignment.',
                    '',
                );
                return;
            }
            serviceId = String(assignment.serviceId);
            serviceName = assignment.serviceName || '';
            customerId = +assignment.customerId;
            customerName = assignment.customerName || '';
            companyName = assignment.companyName || '';
        } else {
            const Service = services.find(
                (c) => String(c.id) === String(values.serviceId),
            );
            const customer = customers.find((c) => Number(c.id) === Number(values.customerId));
            serviceId = Service ? String(Service.id) : String(values.serviceId);
            serviceName = Service?.name || Service?.serviceName || '';
            customerId = Number(values.customerId);
            customerName = customer?.fullName || customer?.name || customer?.customerName || '';
            companyName = customer?.companyName || customer?.customerInfo?.companyName || '';
        }

        const issue = values.issue?.trim();
        const otherSiteName = values.otherSiteName?.trim() ?? '';
        if (otherSite && !otherSiteName) {
            notificationComponent('error', 3, 'Site name is required', '');
            return;
        }

        const payload = {
            subject: issue,
            issue,
            message: values.message?.trim() ?? '',
            siteId: otherSite ? OTHER_SITE_ID : Number(values.siteId),
            isOtherSite: otherSite,
            siteName: otherSite ? otherSiteName : site?.name || site?.siteName || '',
            serviceId,
            serviceName,
            customerId,
            customerName,
            companyName,
            priority: values.priority === true ? 1 : 2,
            attachFiles: JSON.stringify(files),
        };

        if (!data) {
            dispatch(actions.saveInto(payload, modalType, closeable));
        } else {
            dispatch(actions.saveInto({ ...payload, id: data?.reportFaultId ?? data?.id }, modalType, closeable));
        }
        setChanged(false);
    };

    const modalFooter = (
        <ActionHeaderModalWrap>
            {profile && +profile.type === userType.STAFF ? (
                <ActionBtn
                    type="primary"
                    htmlType="button"
                    icon={<SaveOutlined />}
                    onClick={() => onFinishSave(false)}
                    disabled={!changed}
                    loading={loadingAction}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
            ) : null}
            <Button
                className="ant-btn ant-btn-secondary"
                htmlType="button"
                icon={<CloseCircleOutlined />}
                onClick={handleClose}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </Button>
        </ActionHeaderModalWrap>
    );

    const customerOptions = customers.map((c: any) => ({
        ...c,
        companyName: c.companyName || c.customerInfo?.companyName || c.fullName || `#${c.id}`,
    }));

    const issueSelectOptions = useMemo(
        () => (issueOptions?.length ? issueOptions : [...REPORT_FAULT_ISSUE_OPTIONS]),
        [issueOptions],
    );

    const siteOptionsWithOther = useMemo(() => {
        let base = sites;
        if (data?.siteId) {
            const siteId = Number(data.siteId);
            if (!sites.some((s: any) => Number(s.id) === siteId)) {
                base = [{ id: siteId, name: data.siteName || `Site #${siteId}` }, ...sites];
            }
        }
        return [...base, OTHER_SITE_OPTION];
    }, [sites, data]);

    return (
        <Modal
            visible={open}
            open={open}
            onCancel={handleClose}
            title={title}
            closable={false}
            width={900}
            footer={modalFooter}
            destroyOnClose
            maskClosable
            keyboard
            className={`new-report-form-modal${uiDark ? " new-report-form-modal--dark" : ""}`}
            wrapClassName={uiDark ? "new-report-form-modal-wrap--dark" : undefined}
            maskStyle={uiDark ? { backgroundColor: "rgba(0, 0, 0, 0.82)" } : undefined}
            style={uiDark ? { top: 8, maxWidth: "100vw", paddingBottom: 0 } : undefined}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => setChanged(true)}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }}
                    layout="vertical"
                >
                    <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>
                    <Row>
                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name="siteId"
                                    allowClear={true}
                                    label="Sites"
                                    options={siteOptionsWithOther}
                                    className="break-line"
                                    optionValue="id"
                                    optionLabel="name"
                                    isRequired={true}
                                    onChange={handleSiteChange}
                                />
                                {isOtherSite ? (
                                    <TextArea
                                        className="break-line"
                                        name="otherSiteName"
                                        label="Site name"
                                        isRequired={true}
                                        Max={500}
                                    />
                                ) : null}
                            </Fieldset>
                        </Col>
                        {!hideDeptCustomerForStaff && (selectedSiteId || isOtherSite) ? (
                            <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                <Fieldset>
                                    <FormSelect
                                        name="serviceId"
                                        allowClear={true}
                                        label="Service"
                                        options={services}
                                        className="break-line"
                                        optionValue="id"
                                        optionLabel="name"
                                        isRequired={true}
                                        onChange={handleServiceChange}
                                    />
                                </Fieldset>
                            </Col>
                        ) : null}
                        {!hideDeptCustomerForStaff ? (
                            <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                <Fieldset>
                                    <FormSelect
                                        name="customerId"
                                        allowClear={false}
                                        label="Customer"
                                        options={customerOptions}
                                        className="break-line"
                                        optionValue="id"
                                        optionLabel="companyName"
                                        isRequired={true}
                                    />
                                </Fieldset>
                            </Col>
                        ) : (
                            <>
                                <Form.Item name="serviceId" hidden>
                                    <Input type="hidden" />
                                </Form.Item>
                                <Form.Item name="customerId" hidden>
                                    <Input type="hidden" />
                                </Form.Item>
                            </>
                        )}
                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name="issue"
                                    allowClear={false}
                                    label="Issues"
                                    options={issueSelectOptions}
                                    className="break-line"
                                    optionValue="id"
                                    optionLabel="name"
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <TextArea
                                    className="break-line"
                                    name="message"
                                    label="Message"
                                    isRequired={false}
                                    Max={300}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <SvCheckBox
                                    className="break-line"
                                    name="priority"
                                    label="Urgent"
                                    isRequired={false}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <Fieldset>
                                    <Label style={uiDark ? { color: "#d9d9d9" } : undefined}>
                                        Media files
                                        {!isStaffUser ? (
                                            <span style={{ color: uiDark ? "#ff7875" : "red" }}> *</span>
                                        ) : null}
                                    </Label>
                                    <Upload
                                        className={uiDark ? "report-fault-media-upload--dark" : undefined}
                                        fileList={fileList}
                                        multiple={true}
                                        accept="image/jpeg,image/gif,image/png,application/pdf,image/x-eps,video/*"
                                        listType="text"
                                        onPreview={handlePreview}
                                        onRemove={(value) => {
                                            const nFiles = [...files].filter((c) => c !== value.url);
                                            setFiles(nFiles)
                                            setChanged(true)
                                        }}
                                        customRequest={handleUpdaloadImage}
                                        onChange={handleChangeFile}
                                    >
                                        <button
                                            type="button"
                                            style={
                                                uiDark
                                                    ? undefined
                                                    : { border: 0, background: "none" }
                                            }
                                        >
                                            <PlusOutlined />
                                            <div style={{ marginTop: 8 }}>Upload</div>
                                        </button>
                                    </Upload>
                                    {previewImage ? (
                                        <Image
                                            wrapperStyle={{ display: 'none' }}
                                            preview={{
                                                visible: previewOpen,
                                                onVisibleChange: (visible) => setPreviewOpen(visible),
                                            }}
                                            src={previewImage}
                                        />
                                    ) : null}
                                </Fieldset>
                            </Fieldset>
                        </Col>
                    </Row>
                </Form>
            </BodyModalWrap>
            <FooterModalWrap
                style={{
                    borderTop: uiDark ? "1px solid #404040" : "1px solid rgb(240, 240, 240)",
                    color: uiDark ? "#b0b0b0" : undefined,
                }}
            >
                <Row justify="start" align="bottom">
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                        {data ? (
                            <div>
                                <p style={{ fontSize: 12 }}>
                                    {data?.createdUser &&
                                        sprintf(intl.formatMessage({ id: 'modal.createdInformation' }), {
                                            name: data?.createdUser?.fullName,
                                            datetime: moment(data?.createdAt).utcOffset(600).format(dateTimeFormat),
                                        })}
                                </p>
                                <p style={{ fontSize: 12 }}>
                                    {data?.updatedUser
                                        ? sprintf(intl.formatMessage({ id: 'modal.updatedInformation' }), {
                                            name: data?.updatedUser?.fullName,
                                            datetime: moment(data?.updatedAt).utcOffset(600).format(dateTimeFormat),
                                        })
                                        : null}
                                </p>
                            </div>
                        ) : null}
                    </Col>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default ReportFaultModal
