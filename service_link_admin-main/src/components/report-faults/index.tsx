import { CloseCircleOutlined, CloseOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons'
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
import { Button, Col, Form, Modal, Row, Upload, Image, Tooltip, Checkbox } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIAsync, callAPIUploadAsync } from '../../library/helpers/api'
import { notificationComponent } from '@app/components/common/Notification/index'
import { isFaultVideoUrl } from './fault-media'
import FormSelect from "@app/components/common/FormItem/Select";
import { userType } from '../../constants/statusUser'
import {
    isOtherSiteId,
    OTHER_SITE_ID,
    OTHER_SITE_OPTION,
} from '../../constants/reportFaultSites'
import {
    isPublicAmenitiesCleaningService,
    REPORT_FAULT_TOILET_AREA_OPTIONS,
} from '../../constants/reportFaultToiletArea'
import { FaultUploadProgressModal, useFaultUploadProgress } from './fault-upload-progress'

type IssueOption = { id: string; name: string }

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
    sites: any[]
    uiDark?: boolean
    mobilePortrait?: boolean
}

const ReportFaultModal = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, sites, uiDark, mobilePortrait } = props
    const mobileLayout = Boolean(mobilePortrait || uiDark)
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [open, setOpen] = useState(true)
    const [form] = Form.useForm()
    const watchedServiceId = Form.useWatch('serviceId', form)
    const [services, setServices] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>()
    const [isOtherSite, setIsOtherSite] = useState(false)
    const [staffAssignment, setStaffAssignment] = useState<any>(null)
    const [serviceIssueOptions, setServiceIssueOptions] = useState<IssueOption[]>([])
    const [issuesLoading, setIssuesLoading] = useState(false)
    const [resolvedServiceId, setResolvedServiceId] = useState<string | number | undefined>()

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
    const uploadProgress = useFaultUploadProgress()

    const profileRaw = localStorage.getItem('profile');
    let profile: any = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }

    const isStaffUser = profile && +profile.type === userType.STAFF
    const hideDeptCustomerForStaff = isStaffUser && !data

    const activeServiceName = useMemo(() => {
        if (hideDeptCustomerForStaff && staffAssignment?.serviceName) {
            return staffAssignment.serviceName
        }
        const serviceId = watchedServiceId ?? resolvedServiceId ?? form.getFieldValue('serviceId')
        const match = services.find((s) => String(s.id) === String(serviceId))
        return match?.name || match?.serviceName || data?.serviceName || ''
    }, [
        hideDeptCustomerForStaff,
        staffAssignment,
        watchedServiceId,
        resolvedServiceId,
        services,
        data,
        form,
    ])

    const showToiletArea = isPublicAmenitiesCleaningService(activeServiceName)

    useEffect(() => {
        if (!showToiletArea) {
            form.setFieldsValue({ toiletArea: undefined })
        }
    }, [showToiletArea, form])

    const handlePreview = async (file: any) => {
        const mediaUrl = file.url || file.response?.data;
        if (isFaultVideoUrl(mediaUrl || file.name)) {
            const videoUrl = mediaUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
            if (videoUrl) window.open(videoUrl, '_blank', 'noopener,noreferrer');
            return;
        }
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

    const enrichUploadFilesSync = (nextList: any[]) => {
        return (nextList || []).map((f: any) => {
            const serverUrl =
                f.url ||
                (typeof f.response === "string" ? f.response : undefined) ||
                f.response?.data;
            let thumb = f.thumbUrl || f.preview || serverUrl;
            if (!thumb && f.originFileObj) {
                try {
                    thumb = URL.createObjectURL(f.originFileObj);
                } catch {
                    /* ignore */
                }
            }
            return {
                ...f,
                url: serverUrl || f.url,
                thumbUrl: thumb,
                preview: thumb || f.preview,
            };
        });
    };

    const handleChangeFile = ({ fileList: nextList }: any) => {
        // Must update fileList synchronously — async setState breaks Ant Upload
        setFileList(enrichUploadFilesSync(nextList));
        setChanged(true);
    };

    const handleUpdaloadImage = async (options: any) => {
        const { onSuccess, onError, onProgress, file } = options;
        const raw = file.originFileObj ?? file;
        const jobId = String(file?.uid || `${raw?.name || "upload"}-${Date.now()}`);
        uploadProgress.begin(jobId);
        try {
            const formData = new FormData();
            formData.append("file", raw, raw.name || "upload");
            const response: any = await callAPIUploadAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                "POST",
                formData,
                {
                    uploadFileSize: raw.size || 0,
                    onUploadProgress: (pct: number) => {
                        const percent = Math.min(100, Math.round(pct));
                        uploadProgress.update(jobId, percent);
                        onProgress?.({ percent });
                    },
                },
            );
            if (response?.code === 1 && response?.data) {
                const url = String(response.data);
                setFiles((prev) => [...prev, url]);
                setChanged(true);
                onSuccess?.(url, raw);
            } else {
                const err = new Error(response?.message || "Upload failed");
                notificationComponent("error", 3, "Upload failed", err.message);
                onError?.(err);
            }
        } catch (error: any) {
            notificationComponent("error", 3, "Upload failed", error?.message || "Upload failed");
            onError?.(error);
        } finally {
            uploadProgress.end(jobId);
        }
    };

    const loadIssueOptionsForService = useCallback(async (serviceId: string | number | undefined) => {
        if (serviceId == null || serviceId === '') {
            setServiceIssueOptions([])
            setResolvedServiceId(undefined)
            form.setFieldsValue({ issue: undefined })
            return
        }
        setIssuesLoading(true)
        setResolvedServiceId(serviceId)
        try {
            const res = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.REPORT_FAULTS}/issueOptions`,
                'GET',
                { serviceId },
            )
            const list = Array.isArray(res?.data) ? res.data : []
            setServiceIssueOptions(list)
            const currentIssue = form.getFieldValue('issue')
            if (currentIssue && !list.some((opt: IssueOption) => opt.id === currentIssue)) {
                form.setFieldsValue({ issue: undefined })
            }
        } catch {
            setServiceIssueOptions([])
            form.setFieldsValue({ issue: undefined })
        } finally {
            setIssuesLoading(false)
        }
    }, [form])

    const loadServices = useCallback(async (siteId: number) => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getServicesBySite`, 'GET', { siteId });
        const list = (Array.isArray(res?.data) ? res.data : []).map((s: any) => ({
            ...s,
            id: s?.id != null ? String(s.id) : s?.id,
            name: s?.name || s?.serviceName || (s?.id != null ? `Service #${s.id}` : ''),
        }));
        setServices(list);
        return list;
    }, []);

    const loadCustomers = useCallback(async (siteId: number, serviceId: string | number) => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.JOB_SITES}/getCustomersBySite`, 'GET', { siteId, serviceId });
        if (res?.data) setCustomers(res.data);
    }, []);

    const loadAllServices = useCallback(async () => {
        const res = await callAPIAsync(serviceType.COMMON, `${endPoint.SERVICES}/getAll`, 'GET', {});
        const raw = Array.isArray(res?.data) ? res.data : res?.data?.rows;
        if (Array.isArray(raw)) {
            setServices(
                raw.map((s: any) => ({
                    ...s,
                    id: s?.id != null ? String(s.id) : s?.id,
                    name: s?.name || s?.serviceName || (s?.id != null ? `Service #${s.id}` : ''),
                })),
            );
        }
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
            await loadIssueOptionsForService(undefined);
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
        await loadIssueOptionsForService(assignment.serviceId);
        return true;
    }, [form, loadIssueOptionsForService]);

    const applyStaffSiteAssignment = useCallback(async (siteId: number, serviceId?: number) => {
        const params: Record<string, number> = { siteId };
        if (serviceId != null && Number.isFinite(+serviceId) && +serviceId > 0) {
            params.serviceId = +serviceId;
        }
        const res = await callAPIAsync(
            serviceType.COMMON,
            `${endPoint.JOB_SITES}/getStaffReportAssignmentBySite`,
            'GET',
            params,
        );
        const assignment = res?.data;
        if (!assignment?.customerId || !assignment?.serviceId) {
            setStaffAssignment(null);
            form.setFieldsValue({ serviceId: undefined, customerId: undefined });
            await loadIssueOptionsForService(undefined);
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
        await loadIssueOptionsForService(assignment.serviceId);
        return true;
    }, [form, loadIssueOptionsForService]);

    const handleSiteChange = useCallback(async (option: any) => {
        const rawId = option?.id;
        if (rawId == null || option === null) {
            setIsOtherSite(false);
            setSelectedSiteId(undefined);
            form.setFieldsValue({
                serviceId: undefined,
                customerId: undefined,
                otherSiteName: undefined,
                toiletArea: undefined,
            });
            setServices([]);
            setCustomers([]);
            setStaffAssignment(null);
            await loadIssueOptionsForService(undefined);
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
                toiletArea: undefined,
            });
            setServices([]);
            setCustomers([]);
            setStaffAssignment(null);
            await loadIssueOptionsForService(undefined);
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
            toiletArea: undefined,
        });
        setServices([]);
        setCustomers([]);
        setStaffAssignment(null);
        await loadIssueOptionsForService(undefined);
        if (!siteId) return;
        if (hideDeptCustomerForStaff) {
            try {
                const siteServices = await loadServices(siteId);
                if (!siteServices.length) {
                    notificationComponent(
                        'warning',
                        3,
                        'No Service is linked to your assignment for this job site.',
                        '',
                    );
                    return;
                }
                if (siteServices.length === 1) {
                    await applyStaffSiteAssignment(siteId, siteServices[0].id);
                }
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
    }, [form, loadServices, loadAllServices, hideDeptCustomerForStaff, applyStaffSiteAssignment, applyStaffDefaultAssignment, loadIssueOptionsForService]);

    const handleStaffServiceChange = useCallback(async (option: any) => {
        form.setFieldsValue({ issue: undefined, toiletArea: undefined });
        if (!selectedSiteId || option?.id == null) {
            setStaffAssignment(null);
            await loadIssueOptionsForService(undefined);
            return;
        }
        try {
            await applyStaffSiteAssignment(selectedSiteId, option.id);
        } catch {
            // ignore load errors so the modal stays usable
        }
    }, [selectedSiteId, applyStaffSiteAssignment, form, loadIssueOptionsForService]);

    const handleServiceChange = useCallback(async (option: any) => {
        form.setFieldsValue({ customerId: undefined, issue: undefined, toiletArea: undefined });
        setCustomers([]);
        if (option?.id == null) {
            await loadIssueOptionsForService(undefined);
            return;
        }
        await loadIssueOptionsForService(option.id);
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
    }, [form, loadCustomers, loadCustomersForService, loadIssueOptionsForService]);

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
                if (data.serviceId) {
                    await loadIssueOptionsForService(data.serviceId);
                }
                form.setFieldsValue({
                    ...data,
                    siteId,
                    customerId,
                    serviceId: data.serviceId ?? undefined,
                    toiletArea: data.toiletArea ?? undefined,
                    priority: +data.priority === 1,
                });
            } catch {
                // ignore init errors so the modal stays usable
            }
        };
        initForm();
    }, [data, form, loadServices, loadCustomers, loadIssueOptionsForService])

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
        setServiceIssueOptions([]);
        setResolvedServiceId(undefined);
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
                        : services.length > 1 && selectedSiteId
                            ? 'Select a service for this job site.'
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
            ...(showToiletArea ? { toiletArea: values.toiletArea } : {}),
        };

        if (!data) {
            dispatch(actions.saveInto(payload, modalType, closeable));
        } else {
            dispatch(actions.saveInto({ ...payload, id: data?.reportFaultId ?? data?.id }, modalType, closeable));
        }
        setChanged(false);
    };

    const modalFooter = (
        <ActionHeaderModalWrap style={{ width: '100%', justifyContent: 'flex-end', gap: 8 }}>
            <Button
                className="ant-btn ant-btn-secondary"
                htmlType="button"
                icon={<CloseCircleOutlined />}
                onClick={handleClose}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </Button>
            {profile && +profile.type === userType.STAFF ? (
                <ActionBtn
                    type="primary"
                    htmlType="button"
                    onClick={() => onFinishSave(false)}
                    disabled={!changed}
                    loading={loadingAction}
                >
                    Submit
                </ActionBtn>
            ) : null}
        </ActionHeaderModalWrap>
    );

    const customerOptions = customers.map((c: any) => ({
        ...c,
        companyName: c.companyName || c.customerInfo?.companyName || c.fullName || `#${c.id}`,
    }));

    const issueSelectOptions = serviceIssueOptions;
    const issuesReady = Boolean(resolvedServiceId) && !issuesLoading;
    const showStaffServiceSelect =
        hideDeptCustomerForStaff && Boolean(selectedSiteId) && !isOtherSite && services.length > 1;

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
        <>
        <Modal
            visible={open}
            open={open}
            onCancel={handleClose}
            title={title}
            closable={false}
            width={mobileLayout ? "calc(100vw - 24px)" : 900}
            footer={modalFooter}
            destroyOnClose
            maskClosable
            keyboard
            className={`new-report-form-modal${uiDark ? " new-report-form-modal--dark" : ""}`}
            wrapClassName={uiDark ? "new-report-form-modal-wrap--dark" : undefined}
            maskStyle={uiDark ? { backgroundColor: "rgba(0, 0, 0, 0.82)" } : undefined}
            style={{
                ...(mobileLayout ? { top: 8, maxWidth: "100vw", paddingBottom: 0 } : {}),
                ...(uploadProgress.ui.open ? { visibility: "hidden" as const } : {}),
            }}
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
                        {((!hideDeptCustomerForStaff && (selectedSiteId || isOtherSite)) || showStaffServiceSelect) ? (
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
                                        onChange={showStaffServiceSelect ? handleStaffServiceChange : handleServiceChange}
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
                        ) : showStaffServiceSelect ? (
                            <Form.Item name="customerId" hidden>
                                <Input type="hidden" />
                            </Form.Item>
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
                                    disable={!issuesReady}
                                />
                                {!issuesReady ? (
                                    <p style={{ fontSize: 12, color: uiDark ? '#8c8c8c' : '#595959', marginTop: 4 }}>
                                        {issuesLoading
                                            ? 'Loading issues…'
                                            : hideDeptCustomerForStaff
                                                ? showStaffServiceSelect
                                                    ? 'Select a service to load issues.'
                                                    : 'Select a site to load issues for your assigned service.'
                                                : 'Select a service to load issues.'}
                                    </p>
                                ) : null}
                            </Fieldset>
                        </Col>
                        {showToiletArea ? (
                            <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                <Fieldset>
                                    <FormSelect
                                        name="toiletArea"
                                        allowClear={false}
                                        label="Toilet"
                                        options={REPORT_FAULT_TOILET_AREA_OPTIONS}
                                        className="break-line"
                                        optionValue="id"
                                        optionLabel="name"
                                        isRequired={true}
                                    />
                                </Fieldset>
                            </Col>
                        ) : null}
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <TextArea
                                    className="break-line report-fault-message-item"
                                    name="message"
                                    label="Message"
                                    isRequired={false}
                                    Max={300}
                                    rows={4}
                                    classNameInput="report-fault-message-box"
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <Form.Item
                                    name="priority"
                                    valuePropName="checked"
                                    className="report-fault-urgent-row"
                                    style={{ marginBottom: 12 }}
                                >
                                    <Checkbox>
                                        <span
                                            className="report-fault-urgent-label"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 8,
                                                color: uiDark ? "#f0f0f0" : "#143d24",
                                                fontWeight: 600,
                                                fontSize: 15,
                                            }}
                                        >
                                            Mark as Urgent
                                            <Tooltip title="Flags this fault as urgent for faster attention.">
                                                <InfoCircleOutlined
                                                    style={{
                                                        color: uiDark ? "#85c179" : "#1f6b3a",
                                                        fontSize: 15,
                                                        cursor: "help",
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                />
                                            </Tooltip>
                                        </span>
                                    </Checkbox>
                                </Form.Item>
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
                                    <div className="report-fault-media-tile-wrap">
                                        <div
                                            className="report-fault-media-grid"
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                alignItems: "flex-start",
                                                gap: 8,
                                                width: "100%",
                                            }}
                                        >
                                            {fileList.map((file: any) => {
                                                const src =
                                                    file.thumbUrl ||
                                                    file.url ||
                                                    file.preview ||
                                                    file.response?.data ||
                                                    (typeof file.response === "string" ? file.response : undefined);
                                                return (
                                                    <div
                                                        key={file.uid}
                                                        className="report-fault-media-thumb"
                                                        style={{
                                                            position: "relative",
                                                            width: 104,
                                                            height: 104,
                                                            flex: "0 0 104px",
                                                            borderRadius: 8,
                                                            overflow: "hidden",
                                                            background: "#1a1a1a",
                                                            border: "1px solid #404040",
                                                        }}
                                                    >
                                                        {src ? (
                                                            <img
                                                                src={src}
                                                                alt=""
                                                                className="report-fault-media-thumb__img"
                                                                style={{
                                                                    display: "block",
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => handlePreview(file)}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="report-fault-media-thumb__fallback"
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    padding: 6,
                                                                    color: "#d9d9d9",
                                                                    fontSize: 11,
                                                                    textAlign: "center",
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                {file.name || "File"}
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="report-fault-media-thumb__x"
                                                            aria-label="Remove photo"
                                                            style={{
                                                                position: "absolute",
                                                                top: 4,
                                                                right: 4,
                                                                zIndex: 10,
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                width: 24,
                                                                height: 24,
                                                                margin: 0,
                                                                padding: 0,
                                                                border: "none",
                                                                borderRadius: "50%",
                                                                background: "rgba(0,0,0,0.78)",
                                                                color: "#fff",
                                                                fontSize: 11,
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const removedUrl =
                                                                    file?.url ||
                                                                    file?.response?.data ||
                                                                    (typeof file?.response === "string"
                                                                        ? file.response
                                                                        : undefined) ||
                                                                    file?.uid;
                                                                setFiles((prev) =>
                                                                    prev.filter(
                                                                        (c) => c !== removedUrl && c !== file?.uid,
                                                                    ),
                                                                );
                                                                setFileList((prev: any[]) =>
                                                                    prev.filter((f) => f.uid !== file.uid),
                                                                );
                                                                setChanged(true);
                                                            }}
                                                        >
                                                            <CloseOutlined />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <Upload
                                                className={`report-fault-media-tile${uiDark ? " report-fault-media-tile--dark" : ""}`}
                                                fileList={fileList}
                                                multiple={true}
                                                accept="image/jpeg,image/gif,image/png,application/pdf,image/x-eps,video/*"
                                                showUploadList={false}
                                                customRequest={handleUpdaloadImage}
                                                onChange={handleChangeFile}
                                                style={{ width: 104, height: 104 }}
                                            >
                                                <div
                                                    className="report-fault-media-tile__btn"
                                                    role="button"
                                                    aria-label="Upload"
                                                    style={{
                                                        width: 104,
                                                        height: 104,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        background: "#f5f5f5",
                                                        border: "1px solid #d9d9d9",
                                                        borderRadius: 2,
                                                        cursor: "pointer",
                                                        boxSizing: "border-box",
                                                    }}
                                                >
                                                    <PlusOutlined style={{ fontSize: 22, color: "#52c41a" }} />
                                                </div>
                                            </Upload>
                                        </div>
                                    </div>
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
        <FaultUploadProgressModal
            open={uploadProgress.ui.open}
            percent={uploadProgress.ui.percent}
            current={uploadProgress.ui.current}
            total={uploadProgress.ui.total}
            dark={uiDark}
        />
    </>
    )
}

export default ReportFaultModal
