import { CloseCircleOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset } from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { Button, Col, Form, Modal, Row, TimePicker } from 'antd'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import FormSelect from "@app/components/common/FormItem/Select";
import moment from 'moment'
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    data: any
    title: string,
    setShowModal: any,
    setChanged: any,
    items: any
    setItems: any,
    staffs: any,
    staffId?:number
}
const ItemStaffModal = (props: IProps) => {
    const { isSuccess, data, title, setShowModal, setChanged, items, setItems, staffs,staffId } = props

    const intl = useIntl()
    const [shifts, setShifts] = useState(data && data.staffShifts ? data.staffShifts :
        [{
            id: Date.now(),
            startTime: '',
            endTime: '',
            type: 'C',
            typeValue: ''
        }])
    const [form] = Form.useForm()

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            if (data.staffShifts) {
                form.setFieldsValue({
                    ...data,
                })
                const input = {};
                for (const item of data.staffShifts) {
                    input['startTime' + item.id] = item.startTime ? moment(moment().format("YYYY-MM-DD " + item.startTime)) : null
                    input['endTime' + item.id] = item.endTime ? moment(moment().format("YYYY-MM-DD " + item.endTime)) : null
                }
                form.setFieldsValue(input)
            }

        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        try {
            const values = await form.validateFields();
            const staff = staffs.find(c => c.id === values.staffId);
            if (data && data.id) {
                const n = [];
                items.forEach((r) => {
                    if (r.id === data.id) {
                        n.push({ ...r, staffId: values.staffId, staff, staffShifts: shifts });
                    } else {
                        n.push(r);
                    }
                });
                setItems(n);
                setShowModal(false);
            } else {
                const n = { id: Date.now(), staffId: values.staffId, staff, staffShifts: shifts };
                setItems([...items, n]);
                setShowModal(false);
            }
        } catch {
            /* form validation */
        }
    }

    const setDay = (day, r) => {
        const nShifts = [...shifts]
        const rIndex = nShifts.findIndex(c => c.id === r.id)
        if (rIndex === -1) {
            return;
        }
        if (!nShifts[rIndex]) {
            return;
        }
        if (!nShifts[rIndex]?.typeValue) {
            nShifts[rIndex].typeValue = '';
        }
        if (!nShifts[rIndex].typeValue.split(',').includes(day)) {
            let idayInWeek = nShifts[rIndex].typeValue.split(',')
            idayInWeek.push(day);
            nShifts[rIndex].typeValue = idayInWeek.filter(c => c !== '').sort((a, b) => parseFloat(a) - parseFloat(b)).join(',');
            nShifts[rIndex].type = 'C'
            setShifts(nShifts)

        } else {
            let idayInWeek = nShifts[rIndex].typeValue.split(',').filter(c => c !== day);
            nShifts[rIndex].typeValue = idayInWeek.filter(c => c !== '').sort((a, b) => parseFloat(a) - parseFloat(b)).join(',');
            nShifts[rIndex].type = 'C'
            setShifts(nShifts)
        }
    }

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                        onFinishSave(false);
                    }}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                        setShowModal(false)
                    }}
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>
            </ActionHeaderModalWrap>
        </>)
    }

    const TitleNew = () => {
        return <div className='left div-flex-col-center'>{title}</div>;
    }
    
    return (
        <Modal
            visible={true}
            onCancel={() => { setShowModal(false) }}
            title={<TitleNew />}
            closable={false}
            width={'60%'}
            footer={<ActionBTN />}
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
                    <Row>
                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='staffId'
                                    allowClear={false}
                                    label={"Staffs"}
                                    options={staffs}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'fullName'}
                                    isRequired={true}
                                    disable={staffId?true:false}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row className='pt-3 pb-2'>
                        <Col md={12} sm={12} xs={24} >
                            Shifts
                        </Col>
                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }} >
                            <Button
                                onClick={() => {
                                    const nShifts = [...shifts];
                                    nShifts.push({
                                        id: Date.now(),
                                        startTime: '',
                                        endTime: '',
                                        type: 'C',
                                        typeValue: ''
                                    })
                                    setShifts(nShifts);
                                }}
                                type="primary"
                            >
                                <PlusOutlined /> Add new shift
                            </Button>
                        </Col>
                    </Row>

                    {
                        shifts.map((r) => {
                            return <Row key={r.id}>
                                <Col md={12} sm={12} xs={24} >
                                    <Fieldset>
                                        <Form.Item
                                            initialValue={''}
                                            name={'startTime' + r.id}
                                            label={'Start time'}
                                            className={'break-line'}
                                            style={{ maxWidth: '100%' }}
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <TimePicker format={"HH:mm"} onChange={(value) => {
                                                const nShifts = [...shifts];
                                                nShifts.map((rr, i) => {
                                                    if (+rr.id === +r.id) {
                                                        rr.startTime = moment(value).format('HH:mm');
                                                    }
                                                    return rr;
                                                })
                                                setShifts(nShifts)
                                            }} />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <Form.Item
                                            initialValue={''}
                                            name={'endTime' + r.id}
                                            label={'End time'}
                                            className={'break-line'}
                                            style={{ maxWidth: '100%' }}
                                            rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                        >
                                            <TimePicker format={"HH:mm"}
                                                onChange={(value) => {
                                                    const nShifts = [...shifts];
                                                    nShifts.map((rr, i) => {
                                                        if (+rr.id === +r.id) {
                                                            rr.endTime = moment(value).format('HH:mm');
                                                        }
                                                        return rr;
                                                    })
                                                    setShifts(nShifts)
                                                }}
                                            />
                                        </Form.Item>
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name={'type' + r.id}
                                            options={[{ id: 'E', name: "Everyday" }, { id: 'W', name: "Working day" }, { id: 'C', name: 'Custom' }]}
                                            allowClear={false}
                                            defaultValue={r.type}
                                            label={"Type"}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                            onChange={(value) => {
                                                const nShifts = [];
                                                for (const element of shifts) {
                                                    const nItem = { ...element };
                                                    if (element.id === r.id) {
                                                        nItem.type = value.id
                                                    }
                                                    nShifts.push(nItem);
                                                }
                                                setShifts(nShifts)
                                            }}
                                        />
                                    </Fieldset>
                                </Col>
                                {
                                    r.type === 'C' ? <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                                        <Fieldset>
                                            <div>
                                                <div style={{ marginBottom: 5 }}>
                                                    Day in week
                                                </div>
                                                <div style={{ display: 'flex' }}>
                                                    <Button onClick={() => setDay('0', r)} style={r.typeValue && r.typeValue.split(',').includes('0') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Mon </Button>
                                                    <Button onClick={() => setDay('1', r)} style={r.typeValue && r.typeValue.split(',').includes('1') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Tue </Button>
                                                    <Button onClick={() => setDay('2', r)} style={r.typeValue && r.typeValue.split(',').includes('2') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Wed </Button>
                                                    <Button onClick={() => setDay('3', r)} style={r.typeValue && r.typeValue.split(',').includes('3') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Thu </Button>
                                                    <Button onClick={() => setDay('4', r)} style={r.typeValue && r.typeValue.split(',').includes('4') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Fri </Button>
                                                    <Button onClick={() => setDay('5', r)} style={r.typeValue && r.typeValue.split(',').includes('5') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Sat </Button>
                                                    <Button onClick={() => setDay('6', r)} style={r.typeValue && r.typeValue.split(',').includes('6') ? { backgroundColor: '#397d36', color: 'white' } : {}}> Sun </Button>
                                                </div>
                                            </div>
                                        </Fieldset>
                                    </Col> : ""
                                }
                            </Row>
                        })
                    }
                </Form>
            </BodyModalWrap>
        </Modal>
    )
}

export default ItemStaffModal