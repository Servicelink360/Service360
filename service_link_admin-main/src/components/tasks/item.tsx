import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset } from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { Col, Form, Modal, Row, TimePicker } from 'antd'
import React, { useEffect } from 'react'
import { useIntl } from 'react-intl'
import moment from 'moment'

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    data: any
    title: string,
    setShowModal: any,
    setChanged: any,
    items: any
    setItems: any
}

const ItemModal = (props: IProps) => {
    const { isSuccess, loadingAction, data, title, setShowModal, setChanged, items, setItems } = props
    const intl = useIntl()
    const [form] = Form.useForm()

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])
    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data, from: moment(moment().format("YYYY-MM-DD "+data.from)), to: moment(moment().format("YYYY-MM-DD "+data.to))})
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();

        if (data && data.id) {
            const n = [];
            items.forEach((r, i) => {
                if (r.id === data.id) {
                    r = { ...r, ...values, from: moment(values.from).format("HH:mm:ss"), to: moment(values.to).format("HH:mm:ss") }
                }
                n.push(r);
            })
            setItems(n)
            setShowModal(0)
        } else {

            const n = { ...values, id: Date.now(), from: moment(values.from).format("HH:mm:ss"), to: moment(values.to).format("HH:mm:ss") }
            setItems([...items, n])
            setShowModal(0)
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
                    disabled={false}
                    loading={loadingAction}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                        setShowModal(0)
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

    const title_new = <TitleNew />;
    return (
        <Modal
            visible={true}
            onCancel={() => { setShowModal(0) }}
            title={title_new}
            closable={false}
            width={'40%'}
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
                                    <TimePicker format={"HH:mm"}  onChange={(e)=>{console.log(e);}} />
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
                                    <TimePicker  format={"HH:mm"}  />
                                </Form.Item>
                            </Fieldset>
                        </Col>

                        {/* <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='status'
                                    options={TaskStatus}
                                    allowClear={false}
                                    label={"Status"}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col> */}

                    </Row>
                </Form>
            </BodyModalWrap>
        </Modal>
    )
}

export default ItemModal