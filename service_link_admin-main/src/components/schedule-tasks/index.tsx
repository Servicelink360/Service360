import { CloseCircleOutlined, QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap
} from '@app/components/common/Common.styles'
import TextArea from '@app/components/common/FormItem/TextArea'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateServerFormat, dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/tasks/actions'
import { Button, Checkbox, Col, Form, Modal, Row, DatePicker, Tooltip, Input } from 'antd'
import moment from 'moment'
import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import FormSelect from "@app/components/common/FormItem/Select";
import type { Moment } from 'moment'
import actionType from '../../constants/actionType'
import { callAPIAsync } from '../../library/helpers/api'
import serviceType from '../../constants/serviceType'
import endPoint from '../../constants/endPoint'
import { boolStatus, userType } from '../../constants/statusUser'
import { notification } from '@app/components'

/** Job site Select value for a custom / free-text site (not a real sites.id). */
const OTHER_JOB_SITE = '__other__'

const isOtherJobSite = (siteId: unknown): boolean =>
    siteId === OTHER_JOB_SITE || siteId === 'other' || siteId === 'Other'

function normalizeCompanyKey(name: string | undefined | null): string {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

/** One customer user id per company — for Other-site company dropdown. */
function buildCompanyCustomerOptions(
    companies: Array<{ id: number; name?: string; companyName?: string }>,
    users: Array<{
        id: number
        customerInfo?: {
            companyId?: number | null
            companyName?: string
            company?: { id?: number; name?: string }
        }
    }>,
): Array<{
    id: number
    fullName: string
    name: string
    companyName: string
    companyId: number
}> {
    const map: Record<number, number> = {}
    const nameToCompanyId = new Map<string, number>()
    for (const c of companies) {
        const key = normalizeCompanyKey(c.name || c.companyName)
        if (key) nameToCompanyId.set(key, +c.id)
    }
    for (const u of users) {
        let companyId = +(u.customerInfo?.companyId ?? u.customerInfo?.company?.id ?? 0)
        if (!companyId) {
            const key = normalizeCompanyKey(
                u.customerInfo?.companyName || u.customerInfo?.company?.name,
            )
            if (key) companyId = nameToCompanyId.get(key) || 0
        }
        if (companyId && !map[companyId]) {
            map[companyId] = +u.id
        }
    }
    return companies
        .map((c) => {
            const companyId = +c.id
            const userId = map[companyId]
            if (!userId) return null
            const companyName = String(c.name || c.companyName || '').trim() || `Company #${companyId}`
            return {
                id: userId,
                fullName: companyName,
                name: companyName,
                companyName,
                companyId,
            }
        })
        .filter(Boolean) as Array<{
        id: number
        fullName: string
        name: string
        companyName: string
        companyId: number
    }>
}

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    isAnother?: boolean,
    getDataInit: any,
    reportTemplates: any,
    services: any,
    sites: any,
    customers: any
}

const Index = (props: IProps) => {
    const { modalType, getDataInit, isSuccess, loadingAction, data, title, reportTemplates, sites } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [form] = Form.useForm()
    const siteIdWatch = Form.useWatch('siteId', form)
    const serviceIdWatch = Form.useWatch('serviceId', form)
    const customerIdWatch = Form.useWatch('customerId', form)
    const isOtherSite = isOtherJobSite(siteIdWatch)
    const items = (data && data.items) ? data.items : [];
    const [staffs, setStaffs] = useState([])
    const [services, setServices] = useState([])
    const [customers, setCustomers] = useState([])
    const [recurring, setRecurring] = useState(false)
    const siteOptions = useMemo(
        () => [...(sites || []), { id: OTHER_JOB_SITE, name: 'Other' }],
        [sites],
    )
    /** JS getDay(): 0=Sun … 6=Sat */
    const [recurDays, setRecurDays] = useState<string[]>([])

    const WEEK_DAYS = [
        { id: '1', label: 'Mon' },
        { id: '2', label: 'Tue' },
        { id: '3', label: 'Wed' },
        { id: '4', label: 'Thu' },
        { id: '5', label: 'Fri' },
        { id: '6', label: 'Sat' },
        { id: '0', label: 'Sun' },
    ]

    const toggleRecurDay = (day: string) => {
        setChanged(true)
        setRecurDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        )
    }
    useEffect(() => {
        getDataInit("TASKS")
        // Mount-only: parent used to pass a new getDataInit every render → freeze loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: data ? data.siteId : 0 });
            if (!cancelled && res && res.data) {
                setServices(res.data)
            }
            const res1 = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getCustomersBySite", 'GET', { siteId: data ? data.siteId : 0, serviceId: data ? data.serviceId : 0 });
            if (!cancelled && res1 && res1.data) {
                setCustomers(res1.data)
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [data?.siteId, data?.serviceId])

    useEffect(() => {
        if (data?.id) {
            const otherSite = !(+data.siteId > 0)
            form.setFieldsValue({
                ...data,
                siteId: otherSite ? OTHER_JOB_SITE : data.siteId,
                startAt: moment(data.startTime || data.startDate),
                endAt: moment(data.endTime || data.endDate),
                mediaRequired: +data.mediaRequired === 1,
            })
            if (otherSite) {
                void (async () => {
                    await loadAllServices()
                    await loadOtherSiteCustomers()
                    getStaff(0, data.serviceId, data.customerId)
                })()
            } else {
                getStaff(data.siteId, data.serviceId, data.customerId)
            }
        } else if (modalType === actionType.ADD) {
            form.resetFields()
            setRecurring(false)
            setRecurDays([])
            form.setFieldsValue({ mediaRequired: false })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id, modalType])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const pickId = (value: any): number => {
        if (value == null || value === '') return 0;
        if (typeof value === 'object') {
            if (isOtherJobSite(value.id) || isOtherJobSite(value.value)) return 0;
            return +(value.id ?? value.value ?? 0) || 0;
        }
        if (isOtherJobSite(value)) return 0;
        return +value || 0;
    };

    const loadOtherSiteCustomers = async () => {
        const [companiesRes, usersRes] = await Promise.all([
            callAPIAsync(serviceType.COMMON, `${endPoint.COMPANIES}/options`, 'GET'),
            callAPIAsync(serviceType.COMMON, endPoint.USERS, 'GET', {
                type: userType.CUSTOMER,
                limit: 500,
                page: 1,
                keyword: '',
                orderBy: 'fullName',
                orderValue: 'ASC',
            }),
        ]);
        const companyList = Array.isArray(companiesRes?.data) ? companiesRes.data : [];
        const userRows =
            usersRes?.code === 1 && Array.isArray(usersRes?.data?.rows) ? usersRes.data.rows : [];
        setCustomers(buildCompanyCustomerOptions(companyList, userRows));
    };

    const loadAllServices = async () => {
        const svcRes = await callAPIAsync(serviceType.COMMON, `${endPoint.SERVICES}/getAll`, 'GET');
        setServices(Array.isArray(svcRes?.data) ? svcRes.data : svcRes?.data?.rows || []);
    };

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        const siteId = pickId(values.siteId);
        const serviceId = pickId(values.serviceId);
        const customerId = pickId(values.customerId);
        const staffId = pickId(values.staffId);
        if (!staffId) {
            notification('error', 'Please select a staff member', '');
            return;
        }
        if (modalType === actionType.ADD && recurring && recurDays.length === 0) {
            notification('error', 'Select at least one day to recur', '');
            return;
        }
        let tmp: any = {
            ...values,
            siteId,
            serviceId,
            customerId,
            staffId,
            notifiesStaff: pickId(values.notifiesStaff) || 2,
            mediaRequired: values.mediaRequired ? 1 : 2,
        };
        // Recurrence only applies when creating; editing one instance must not clear siblings
        if (modalType === actionType.ADD) {
            tmp.recurring = recurring ? 1 : 2;
            tmp.recurDays = recurring ? recurDays.slice().sort((a, b) => +a - +b).join(',') : '';
        }
        if (!values.startAt || !values.endAt) {
            notification('error', 'Please select start and end date/time', '');
            return;
        }
        if (moment(values.endAt).isBefore(moment(values.startAt))) {
            notification('error', 'End must be after start', '');
            return;
        }
        tmp.startTime = moment(values.startAt).format(dateServerFormat + " HH:mm:ss");
        tmp.endTime = moment(values.endAt).format(dateServerFormat + " HH:mm:ss");
        delete tmp.startAt;
        delete tmp.endAt;
        if (isOtherJobSite(values.siteId)) {
            tmp.siteId = 0;
            tmp.siteName = String(values.siteName || '').trim() || 'Other';
            tmp.siteAddress = String(values.siteAddress || '').trim();
        } else {
            const siteInfo = sites.find(c => +c.id === siteId);
            if (siteInfo) {
                tmp.siteName = siteInfo.name;
                tmp.siteAddress = siteInfo.address || siteInfo.addressName;
            }
        }
        const ServiceInfo = services.find(c => +c.id === serviceId);
        if (ServiceInfo) {
            tmp.serviceName = ServiceInfo.name;
        }

        const customerInfo = customers.find(c => +c.id === customerId);
        if (customerInfo) {
            tmp.customerName =
                customerInfo.companyName || customerInfo.name || customerInfo.fullName || '';
            if (customerInfo.companyName) tmp.companyName = customerInfo.companyName;
        }
        // Add new task: name / report template not collected — use service name as task name
        if (modalType === actionType.ADD) {
            tmp.taskName = tmp.serviceName || 'Task';
            delete tmp.reportTemplateId;
        } else if (data) {
            tmp.taskName = data.taskName || tmp.serviceName || 'Task';
            if (tmp.reportTemplateId == null) {
                tmp.reportTemplateId = data.reportTemplateId;
            }
        }
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            setChanged(false)
        }
    }

    const disabledStartDate = (current: Moment) =>
        !!current && current < moment().startOf('day');

    const disabledEndDate = (current: Moment) => {
        const start = form.getFieldValue('startAt');
        if (!current) return false;
        if (start) return current < moment(start).startOf('day');
        return current < moment().startOf('day');
    };

    const getStaff = async (siteId: number | string, serviceId: number | string, customerId: number | string) => {
        const sid = pickId(siteId);
        const svc = pickId(serviceId);
        const cid = pickId(customerId);
        if (!svc || !sid)
            return;
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getStaffsBySite", 'GET', {
            siteId: sid,
            serviceId: svc,
            customerId: cid || 0,
        });
        if (res && res.data) {
            setStaffs(res.data.map((c: any) => c.staff).filter(Boolean))
        } else {
            setStaffs([])
        }
    }


    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                        onFinishSave(false)
                        // setChanged(false)
                    }}
                    disabled={!changed}
                    loading={loadingAction}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() => dispatch({ type: actions.MODAL, payload: '' })}
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>
            </ActionHeaderModalWrap>
        </>)
    }

    return (
        <Modal
            open={Boolean(modalType)}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={560}
            style={{ top: 24 }}
            footer={null}
            destroyOnClose
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => {
                        setChanged(true)
                    }}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }} layout="vertical"
                    className="add-task-form"
                >
                    {
                        modalType !== actionType.UPDATE_TASK ? <>
                            <Row gutter={[12, 4]}>
                                {/* 1–2: place */}
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <FormSelect
                                            name='siteId'
                                            allowClear={true}
                                            label={"Sites"}
                                            options={siteOptions}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            onChange={async (value) => {
                                                form.setFieldsValue({
                                                    staffId: null,
                                                    serviceId: null,
                                                    customerId: null,
                                                    siteName: '',
                                                    siteAddress: '',
                                                });
                                                setStaffs([]);
                                                setCustomers([]);
                                                if (!value) {
                                                    setServices([]);
                                                    return;
                                                }
                                                if (isOtherJobSite(value.id)) {
                                                    await loadAllServices();
                                                    return;
                                                }
                                                const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: value.id });
                                                if (res && res.data) {
                                                    setServices(res.data)
                                                } else {
                                                    setServices([])
                                                }
                                            }}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <FormSelect
                                            name='serviceId'
                                            allowClear={true}
                                            label={"Service"}
                                            options={services.map(c => {
                                                const n = { ...c };
                                                if (items.findIndex(t => t.serviceId === c.id) > -1) {
                                                    n.disabled = true
                                                }
                                                return n;
                                            })}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            disable={!siteIdWatch}
                                            onChange={async (value) => {
                                                form.setFieldsValue({ staffId: null, customerId: null });
                                                setStaffs([]);
                                                if (!value) {
                                                    setCustomers([]);
                                                    return;
                                                }
                                                if (isOtherJobSite(form.getFieldValue('siteId'))) {
                                                    await loadOtherSiteCustomers();
                                                    return;
                                                }
                                                const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getCustomersBySite", 'GET', { siteId: form.getFieldValue('siteId'), serviceId: value.id });
                                                if (res && res.data) {
                                                    setCustomers(res.data)
                                                } else {
                                                    setCustomers([])
                                                }
                                            }}
                                        />
                                    </Fieldset>
                                </Col>

                                {isOtherSite ? (
                                    <>
                                        <Col span={12} xs={24} sm={12}>
                                            <Fieldset>
                                                <Form.Item name="siteName" label="Site name">
                                                    <Input
                                                        placeholder="Enter site name"
                                                        onChange={() => setChanged(true)}
                                                    />
                                                </Form.Item>
                                            </Fieldset>
                                        </Col>
                                        <Col span={12} xs={24} sm={12}>
                                            <Fieldset>
                                                <Form.Item name="siteAddress" label="Site address">
                                                    <Input
                                                        placeholder="Enter site address"
                                                        onChange={() => setChanged(true)}
                                                    />
                                                </Form.Item>
                                            </Fieldset>
                                        </Col>
                                    </>
                                ) : null}

                                {/* 3–4: who */}
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <FormSelect
                                            name='customerId'
                                            allowClear={false}
                                            label={"Customer"}
                                            options={customers.map(c => {
                                                const label =
                                                    String(c.companyName || c.name || c.fullName || '').trim();
                                                const n = {
                                                    ...c,
                                                    name: label,
                                                    companyName: label,
                                                };
                                                if (items.findIndex(t => t.customerId === c.id) > -1) {
                                                    n.disabled = true
                                                }
                                                return n;
                                            })}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'companyName'}
                                            isRequired={true}
                                            disable={!serviceIdWatch}
                                            onChange={(data) => {
                                                form.setFieldsValue({ staffId: null });
                                                getStaff(form.getFieldValue('siteId'), form.getFieldValue('serviceId'), data.id)
                                            }}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <FormSelect
                                            name='staffId'
                                            allowClear={true}
                                            label={"Staff"}
                                            options={staffs}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'fullName'}
                                            isRequired={true}
                                            disable={!customerIdWatch}
                                        />
                                    </Fieldset>
                                </Col>

                                {modalType === actionType.UPDATE ? (
                                    <Col span={24}>
                                        <Fieldset>
                                            <FormSelect
                                                name='reportTemplateId'
                                                allowClear={true}
                                                label={"Report template"}
                                                options={reportTemplates ? reportTemplates.map(c => {
                                                    const n = { ...c };
                                                    if (items.findIndex(t => t.reportTemplateId === c.id) > -1) {
                                                        n.disabled = true
                                                    }
                                                    return n;
                                                }) : []}
                                                className="break-line"
                                                optionValue={'id'}
                                                optionLabel={'name'}
                                                isRequired={false}
                                            />
                                        </Fieldset>
                                    </Col>
                                ) : null}

                                {/* 5: when — two compact pickers */}
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <Form.Item
                                            name="startAt"
                                            label={recurring ? 'First day start' : 'Start'}
                                            className="break-line"
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <DatePicker
                                                showTime={{ format: 'HH:mm' }}
                                                format="DD/MM/YYYY HH:mm"
                                                style={{ width: '100%' }}
                                                disabledDate={disabledStartDate}
                                                placeholder="Start"
                                            />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col span={12} xs={24} sm={12}>
                                    <Fieldset>
                                        <Form.Item
                                            name="endAt"
                                            label={recurring ? 'Last day end' : 'End'}
                                            className="break-line"
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <DatePicker
                                                showTime={{ format: 'HH:mm' }}
                                                format="DD/MM/YYYY HH:mm"
                                                style={{ width: '100%' }}
                                                disabledDate={disabledEndDate}
                                                placeholder="End"
                                            />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>

                                {/* 6–7: recurrence + notify */}
                                {modalType === actionType.ADD ? (
                                    <>
                                        <Col span={12} xs={24} sm={12}>
                                            <Fieldset>
                                                <FormSelect
                                                    name='recurring'
                                                    allowClear={false}
                                                    defaultValue={2}
                                                    label="Recurring"
                                                    options={boolStatus}
                                                    className="break-line"
                                                    optionValue={'id'}
                                                    optionLabel={'name'}
                                                    isRequired={true}
                                                    onChange={(option) => {
                                                        const yes = pickId(option) === 1 || option?.id === 1;
                                                        setRecurring(yes);
                                                        if (!yes) setRecurDays([]);
                                                        setChanged(true);
                                                    }}
                                                />
                                            </Fieldset>
                                        </Col>
                                        <Col span={12} xs={24} sm={12}>
                                            <Fieldset>
                                                <FormSelect
                                                    name='notifiesStaff'
                                                    allowClear={true}
                                                    defaultValue={2}
                                                    label={"Notifies the staff"}
                                                    options={boolStatus}
                                                    className="break-line"
                                                    optionValue={'id'}
                                                    optionLabel={'name'}
                                                    isRequired={true}
                                                />
                                            </Fieldset>
                                        </Col>
                                        {recurring ? (
                                            <Col span={24}>
                                                <Fieldset>
                                                    <div style={{ marginBottom: 8, fontWeight: 500 }}>Days to recur</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {WEEK_DAYS.map((day) => (
                                                            <Button
                                                                key={day.id}
                                                                size="small"
                                                                type={recurDays.includes(day.id) ? 'primary' : 'default'}
                                                                onClick={() => toggleRecurDay(day.id)}
                                                            >
                                                                {day.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </Fieldset>
                                            </Col>
                                        ) : null}
                                    </>
                                ) : (
                                    <Col span={12} xs={24} sm={12}>
                                        <Fieldset>
                                            <FormSelect
                                                name='notifiesStaff'
                                                allowClear={true}
                                                defaultValue={2}
                                                label={"Notifies the staff"}
                                                options={boolStatus}
                                                className="break-line"
                                                optionValue={'id'}
                                                optionLabel={'name'}
                                                isRequired={true}
                                            />
                                        </Fieldset>
                                    </Col>
                                )}

                                <Col span={24}>
                                    <Fieldset>
                                        <Form.Item
                                            name="mediaRequired"
                                            valuePropName="checked"
                                            initialValue={false}
                                            style={{ marginBottom: 8 }}
                                        >
                                            <Checkbox onChange={() => setChanged(true)}>
                                                Media required{' '}
                                                <Tooltip title="If selected, the staff will need to attach media images upon completing the task.">
                                                    <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                                                </Tooltip>
                                            </Checkbox>
                                        </Form.Item>
                                    </Fieldset>
                                </Col>

                                {/* notes */}
                                <Col span={24}>
                                    <Fieldset>
                                        <TextArea
                                            className="break-line"
                                            name="description"
                                            label={intl.formatMessage({ id: 'form.label.description' })}
                                            isRequired={false}
                                            Max={300}
                                            rows={3}
                                        />
                                    </Fieldset>
                                </Col>
                            </Row>
                        </> : <></>
                    }

                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="start" align="bottom">
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                        {data ? (
                            <div>
                                <p style={{ fontSize: 12 }}>
                                    {data?.createdUser &&
                                        sprintf(intl.formatMessage({ id: 'modal.createdInformation' }), {
                                            name: data?.createdUser?.fullName,
                                            datetime: moment(data?.createdAt).utcOffset("+10:00").format(dateTimeFormat),
                                        })}
                                </p>
                                <p style={{ fontSize: 12 }}>
                                    {data?.updatedUser
                                        ? sprintf(intl.formatMessage({ id: 'modal.updatedInformation' }), {
                                            name: data?.createdUser?.fullName,
                                            datetime: moment(data?.updatedAt).utcOffset("+10:00").format(dateTimeFormat),
                                        })
                                        : null}
                                </p>
                            </div>
                        ) : null}
                    </Col>
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {/* <Divider  /> */}
                        <Row justify="end">
                            <ActionBTN />
                        </Row>
                    </Col>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default Index
