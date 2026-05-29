import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset, FooterModalWrap } from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import TextArea from '@app/components/common/FormItem/TextArea'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateServerFormat, dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/sites/actions'
import { Col, Form, Modal, Row, Button, DatePicker, TimePicker } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import FormSelect from "@app/components/common/FormItem/Select";
import { boolStatus } from '../../constants/statusUser'
import { RangePickerProps } from 'antd/lib/date-picker'
import actionType from '../../constants/actionType'
const { RangePicker } = DatePicker;

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    isAnother?: boolean,
    getDataInit: any,
    reportTemplates: any
}

const Index = (props: IProps) => {
    const { modalType, getDataInit, isSuccess, loadingAction, data, title,  reportTemplates } = props;
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [form] = Form.useForm()
    const [dayInWeek, setDayInWeek] = useState<string[]>([])
    const [isCustom, setIsCustom] = useState(data ? data.type === 'C' ? true : false : false)

    useEffect(() => {
        getDataInit("TASKS")
    }, [getDataInit])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            form.setFieldsValue({
                ...data,
                startDateEndDate: [moment(data.startDate), moment(data.endDate)]
                , from: data.shifts && data.shifts.length > 0 ? moment(moment().format("YYYY-MM-DD " + data.shifts[0].from)) : null
                , to: data.shifts && data.shifts.length > 0 ? moment(moment().format("YYYY-MM-DD " + data.shifts[0].to)) : null
            })
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        let tmp = { ...values }
        if (!data.taskId) {

            data.taskId = data.id;
        }
        tmp.startDate = moment(values.startDateEndDate[0]).format(dateServerFormat + " 00:00:00");
        tmp.endDate = moment(values.startDateEndDate[1]).format(dateServerFormat + " 23:59:59");
        tmp.typeValue = dayInWeek.sort((a, b) => parseFloat(a) - parseFloat(b)).join(',');
        tmp.taskId = data.taskId
        tmp.siteItemId = data.siteItemId
        tmp.shifts = [{ from: moment(values.from).format("HH:mm:ss"), to: moment(values.to).format("HH:mm:ss") }];
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.taskId }, modalType, closeable));
            setChanged(false)
        }
    }

    const disabledDate: RangePickerProps['disabledDate'] = current => {
        return current && current < moment().endOf('day').subtract('1', 'days');
    }

    const setDay = (day) => {
        if (!dayInWeek.includes(day)) {
            let idayInWeek = [...dayInWeek]
            idayInWeek.push(day);
            setDayInWeek(idayInWeek)
        } else {
            let idayInWeek =dayInWeek? [...dayInWeek].filter(c => c !== day):[];
            setDayInWeek(idayInWeek)
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
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name='staffId'
                                            allowClear={true}
                                            label={"Staff"}
                                            options={data.staffs ? data.staffs.filter(c => c.staff).map(c => {
                                                if (c?.staff) return c.staff;
                                                return null;
                                            }).filter(Boolean) : []}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'fullName'}
                                            isRequired={true}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="name"
                                            label={intl.formatMessage({ id: 'form.label.name' })}
                                            isRequired={true}
                                            Max={200}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
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
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name='reportTemplateId'
                                            allowClear={true}
                                            label={"Report template"}
                                            options={reportTemplates ? reportTemplates.map(c => {
                                                const n = { ...c };
                                                // if (items.findIndex(t => t.reportTemplateId === c.id) > -1) {
                                                //     n.disabled = true
                                                // }
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
                                        <FormSelect
                                            name='type'
                                            options={[{ id: 'E', name: "Everyday" }, { id: 'W', name: "Working day" }, { id: 'C', name: 'Custom' }]}
                                            allowClear={false}
                                            label={"Type"}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            onChange={(value) => {
                                                if (value.id === 'C') {
                                                    setIsCustom(true)
                                                } else
                                                    setIsCustom(false)
                                            }}
                                        />
                                    </Fieldset>
                                </Col>

                                {isCustom && <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <div>
                                            <div style={{ marginBottom: 5 }}>
                                                Day in week
                                            </div>
                                            <div style={{ display: 'flex' }}>
                                                <Button onClick={() => setDay('0')} style={dayInWeek.includes('0') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Mon </Button>
                                                <Button onClick={() => setDay('1')} style={dayInWeek.includes('1') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Tue </Button>
                                                <Button onClick={() => setDay('2')} style={dayInWeek.includes('2') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Wed </Button>
                                                <Button onClick={() => setDay('3')} style={dayInWeek.includes('3') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Thu </Button>
                                                <Button onClick={() => setDay('4')} style={dayInWeek.includes('4') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Fri </Button>
                                                <Button onClick={() => setDay('5')} style={dayInWeek.includes('5') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Sat </Button>
                                                <Button onClick={() => setDay('6')} style={dayInWeek.includes('6') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Sun </Button>
                                            </div>
                                        </div>

                                    </Fieldset>
                                </Col>}
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
                                            <RangePicker disabledDate={disabledDate} />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col md={6} sm={6} xs={24} >
                                    <Fieldset>
                                        <Form.Item
                                            initialValue={''}
                                            name={'from'}
                                            label={'Start time'}
                                            className={'break-line'}
                                            style={{ maxWidth: '100%' }}
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}

                                        >
                                            <TimePicker format={"HH:mm"} onChange={(e) => { console.log(e); }} />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col md={6} sm={6} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <Form.Item
                                            initialValue={''}
                                            name={'to'}
                                            label={'End time'}
                                            className={'break-line'}
                                            style={{ maxWidth: '100%' }}
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <TimePicker format={"HH:mm"} />
                                        </Form.Item>
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
