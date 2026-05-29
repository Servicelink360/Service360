import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap
} from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import TextArea from '@app/components/common/FormItem/TextArea'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateServerFormat, dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/tasks/actions'
import { Col, Form, Modal, Row, DatePicker } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import FormSelect from "@app/components/common/FormItem/Select";
import { RangePickerProps } from 'antd/lib/date-picker'
import actionType from '../../constants/actionType'
import { callAPIAsync } from '../../library/helpers/api'
import serviceType from '../../constants/serviceType'
import endPoint from '../../constants/endPoint'
import { boolStatus } from '../../constants/statusUser'
const { RangePicker } = DatePicker;

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
    const items = (data && data.items) ? data.items : [];
    const [staffs, setStaffs] = useState([])
    const [services, setServices] = useState([])
    const [customers, setCustomers] = useState([])
    useEffect(() => {
        getDataInit("TASKS")
    }, [getDataInit])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    const getInitData = async () => {
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: data ? data.siteId : 0 });
        if (res && res.data) {
            setServices(res.data)
        }
        const res1 = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getCustomersBySite", 'GET', { siteId: data ? data.siteId : 0, serviceId: data ? data.serviceId : 0 });
        if (res1 && res1.data) {
            setCustomers(res1.data)
        }
    }

    useEffect(() => {
        getInitData()
    }, [data?.siteId, data?.serviceId])

    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data, startDateEndDate: [moment(data.startDate), moment(data.endDate)] })
            getStaff(data.siteId, data.serviceId, data.customerId)
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        let tmp = { ...values }
        tmp.startTime = moment(values.startDateEndDate[0]).format(dateServerFormat + " HH:mm:ss");
        tmp.endTime = moment(values.startDateEndDate[1]).format(dateServerFormat + " HH:mm:ss");
        const siteInfo = sites.find(c => +c.id === +values.siteId);
        if (siteInfo) {
            tmp.siteName = siteInfo.name;
            tmp.siteAddress = siteInfo.address;
        }
        const ServiceInfo = services.find(c => c.id === values.serviceId);
        if (ServiceInfo) {
            tmp.serviceName = ServiceInfo.name;
        }

        const customerInfo = customers.find(c => +c.id === +values.customerId);
        if (customerInfo) {

            tmp.customerName = customerInfo.name;
        }
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            setChanged(false)
        }
    }

    const disabledDate: RangePickerProps['disabledDate'] = current => {
        // Can not select days before today and today
        return current && current < moment().endOf('day').subtract('1', 'days');
    };

    const getStaff = async (siteId: number, serviceId: string, customerId: number) => {
        if (!serviceId || !siteId)
            return;
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getStaffsBySite", 'GET', { siteId, serviceId, customerId });
        if (res && res.data) {
            setStaffs(res.data.map(c => {
                return c.staff;
            }))

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
            visible={modalType ? true : false}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={'60%'}
            style={{ top: 10 }}
            footer={null}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => {
                        setChanged(true)
                    }}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }} layout="vertical"
                >
                    {
                        modalType !== actionType.UPDATE_TASK ? <>
                            <Row>
                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name='siteId'
                                            allowClear={true}
                                            label={"Sites"}
                                            options={sites}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            onChange={async (value) => {
                                                // getStaff(data.id, form.getFieldValue('serviceId'), form.getFieldValue('customerId'));
                                                form.setFieldsValue({ staffId: null });
                                                form.setFieldsValue({ serviceId: null });
                                                form.setFieldsValue({ customerId: null });


                                                const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: value.id });
                                                if (res && res.data) {
                                                    setServices(res.data)

                                                }
                                            }}
                                        />
                                    </Fieldset>
                                </Col>
                                {form.getFieldValue('siteId') ? <Col md={12} sm={12} xs={24} className="padding-media-max-576">
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
                                            onChange={async (value) => {
                                                form.setFieldsValue({ staffId: null });
                                                form.setFieldsValue({ customerId: null });
                                                const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getCustomersBySite", 'GET', { siteId: form.getFieldValue('siteId'), serviceId: value.id });
                                                if (res && res.data) {
                                                    setCustomers(res.data)
                                                }
                                            }}

                                        />
                                    </Fieldset>
                                </Col> : ""}

                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name='customerId'
                                            allowClear={false}
                                            label={"Customer"}
                                            options={customers.map(c => {
                                                const n = { ...c };
                                                if (items.findIndex(t => t.customerId === c.id) > -1) {
                                                    n.disabled = true
                                                }
                                                return n;
                                            })}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            onChange={(data) => {
                                                form.setFieldsValue({ staffId: null });
                                                getStaff(form.getFieldValue('siteId'), form.getFieldValue('serviceId'), data.id)
                                            }}
                                        />
                                    </Fieldset>
                                </Col>

                                {form.getFieldValue('serviceId') ? <Col md={12} sm={12} xs={24} className="padding-media-max-576">
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
                                        />
                                    </Fieldset>
                                </Col> : ""
                                }

                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="taskName"
                                            label={intl.formatMessage({ id: 'form.label.name' })}
                                            isRequired={true}
                                            Max={200}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
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
                                            isRequired={true}
                                        />
                                    </Fieldset>
                                </Col>

                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <Form.Item
                                            initialValue={''}
                                            name={'startDateEndDate'}
                                            label={'Start Date - End Date'}
                                            className={'break-line'}
                                            style={{ maxWidth: '100%' }}
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <RangePicker
                                                showTime={{ format: 'HH:mm' }}
                                                format="YYYY-MM-DD HH:mm"
                                                disabledDate={disabledDate} />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
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
                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <TextArea
                                            className="break-line"
                                            name="description"
                                            label={intl.formatMessage({ id: 'form.label.description' })}
                                            isRequired={false}
                                            Max={300}
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
                                            datetime: moment(data?.createdAt).zone("+10:00").format(dateTimeFormat),
                                        })}
                                </p>
                                <p style={{ fontSize: 12 }}>
                                    {data?.updatedUser
                                        ? sprintf(intl.formatMessage({ id: 'modal.updatedInformation' }), {
                                            name: data?.createdUser?.fullName,
                                            datetime: moment(data?.updatedAt).zone("+10:00").format(dateTimeFormat),
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
