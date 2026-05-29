import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset, FooterModalWrap } from '@app/components/common/Common.styles'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/tasks/actions'
import { Col, Form, Modal, Row } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import FormSelect from "@app/components/common/FormItem/Select";
import InputForm from '@app/components/common/FormItem/Input'
import UploadImageMultil from '../common/upload-image-multi'
import actionType from '../../constants/actionType'
import TimePickerForm from '../common/FormItem/TimePicker'
import DatePickerForm from '../common/FormItem/DatePicker'

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    getDataInit: Function,
    isAnother?: boolean,

    reportTemplate: any
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, getDataInit, reportTemplate } = props;
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [items, setItems] = useState(data ? data.items : [])
    const [form] = Form.useForm()

    useEffect(() => {
        getDataInit()
    }, [getDataInit])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            const items = [];
            if (data && data.items && data.items.length > 0)
                for (const it of data.items) {
                    if (it.type === 'DATE') {
                        items[it.name] = moment(it.value)
                    }
                    else if (it.type === 'TIME') {
                        items[it.name] = moment(moment().format("YYYY-MM-DD " + it.value))
                    }
                    else
                    {
                        items[it.name] = it.value
                    }
                }
            
            console.log(items);
            form.setFieldsValue({ ...data, ...items })
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        let tmp: any = { description: values.description, items: [] }
        if (items.length === 0)
            return;
        tmp.items = items;
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            setChanged(false)
        }
    }

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                {
                    modalType !== actionType.VIEW &&
                    <ActionBtn
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => {
                            onFinishSave(false)
                        }}
                        disabled={!changed}
                        loading={loadingAction}
                    >
                        {intl.formatMessage({ id: 'button.Save' })}
                    </ActionBtn>
                }
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

    const onChangeItem = (value: string, name: string, type: string) => {
        const nItems = items ? [...items] : [];
        console.log('nItems[itemIndex]', items, name, type);
        const itemIndex = items.findIndex(c => c.name === name && c.type === type);
        if (itemIndex > -1) {

            if (nItems[itemIndex].type === 'DATE') {
                nItems[itemIndex].value = moment(value).format('YYYY-MMM-DD')
            }
            else if (nItems[itemIndex].type === 'TIME') {
                nItems[itemIndex].value = moment(value).format('HH:mm')
            }
            else
                nItems[itemIndex].value = value
        } else {
            let t = value;
            if (type === 'DATE') {
                t = moment(value).format('YYYY-MM-DD')
            }
            else if (type === 'TIME') {
                t = moment(value).format('HH:mm')
            }
            nItems.push({
                name,
                value: t,
                type
            })
        }
        setItems(nItems);
        setChanged(true);
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
                    <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>
                    <Row>
                        <Col md={24} sm={24} xs={24} >
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
                    {
                        reportTemplate && <>
                            <Row className='pt-3 pb-2'>
                                <Col md={12} sm={12} xs={24} >
                                    Report: {reportTemplate.name}
                                </Col>
                            </Row>
                            <Row className='pt-3 pb-2'>
                                {
                                    reportTemplate.items && reportTemplate.items.sort((a, b) => a.id - b.id).map((r) => {
                                        if (r.type === 'YES_NO') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <Fieldset>
                                                    <FormSelect
                                                        name={r.name}
                                                        allowClear={false}
                                                        label={r.name}
                                                        options={[{ id: 1, name: 'YES' }, { id: 2, name: 'NO' }]}
                                                        className="break-line"
                                                        optionValue={'id'}
                                                        optionLabel={'name'}
                                                        isRequired={true}
                                                        onChange={(value) => {
                                                            onChangeItem(value.name, r.name, r.type)
                                                        }}
                                                    />
                                                </Fieldset>
                                            </Col>
                                        }
                                        else if (r.type === 'SELECT') {
                                            const arr = r.value.split(';');
                                            const newOptions = [];
                                            for (const element of arr) {
                                                newOptions.push({ id: element, name: element })
                                            }
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <Fieldset>
                                                    <FormSelect
                                                        name={r.name}
                                                        allowClear={false}
                                                        label={r.name}
                                                        options={newOptions}
                                                        className="break-line"
                                                        optionValue={'id'}
                                                        optionLabel={'name'}
                                                        isRequired={true}
                                                        onChange={(value) => {
                                                            onChangeItem(value.name, r.name, r.type)
                                                        }}
                                                    />
                                                </Fieldset>
                                            </Col>
                                        }
                                        else if (r.type === 'TEXT') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <Fieldset>
                                                    <InputForm
                                                        className="break-line"
                                                        name={r.name}
                                                        label={r.name}
                                                        isRequired={true}
                                                        Max={200}
                                                        onChange={(e) => {
                                                            onChangeItem(e.target.value, r.name, r.type)
                                                        }}
                                                    />
                                                </Fieldset>
                                            </Col>
                                        } 
                                        else if (r.type === 'DATE') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <Fieldset>
                                                    <DatePickerForm
                                                        className="break-line"
                                                        name={r.name}
                                                        label={r.name}
                                                        isRequired={true}
                                                        onChange={(value) => {
                                                            onChangeItem(value, r.name, r.type)
                                                        }}
                                                    />
                                                </Fieldset>
                                            </Col>
                                        }
                                        else if (r.type === 'TIME') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <Fieldset>
                                                    <TimePickerForm
                                                        className="break-line"
                                                        name={r.name}
                                                        label={r.name}
                                                        isRequired={true}
                                                        onChange={(value) => {
                                                            onChangeItem(value, r.name, r.type)
                                                        }}
                                                    />
                                                </Fieldset>
                                            </Col>
                                        }
                                        else if (r.type === 'IMAGES') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <UploadImageMultil
                                                    multiple={true}
                                                    title={r.name}
                                                    isImage={true}
                                                    files={items && items.find(c => c.name === r.name)?.value ? JSON.parse(items.find(c => c.name === r.name)?.value) : []}
                                                    onChange={(images) => { onChangeItem(JSON.stringify(images), r.name, r.type) }} />
                                            </Col>
                                        } else if (r.type === 'VIDEOS') {
                                            return <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                                <UploadImageMultil
                                                    multiple={false}
                                                    isImage={false}
                                                    title={r.name}
                                                    files={items && items.find(c => c.name === r.name)?.value ? JSON.parse(items.find(c => c.name === r.name)?.value) : []}
                                                    onChange={(files) => { onChangeItem(JSON.stringify(files), r.name, r.type) }} />
                                            </Col>
                                        }
                                        return null;
                                    })
                                }
                            </Row>
                        </>
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
