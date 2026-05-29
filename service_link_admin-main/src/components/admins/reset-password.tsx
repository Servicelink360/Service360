import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap
} from '@app/components/common/Common.styles'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import actions from '@app/redux/admins/actions'
import { Col, Form, Input as AntInput, Modal, Row } from 'antd'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import actionType from '../../constants/actionType'
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [form] = Form.useForm()

    useEffect(() => {
        dispatch(actions.getDataInit({}))
    }, [dispatch])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            form.setFieldsValue({
                password: ''
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
        tmp.userId = data.id
        dispatch(actions.saveInto(tmp, actionType.RESET_PASSWORD, closeable))
        setChanged(false)
    }

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                {!data && modalType === 'Add' ? (
                    <ActionBtn
                        icon={<SaveOutlined />}
                        type="primary"
                        onClick={() => {
                            onFinishSave()
                        }}
                        disabled={!changed}
                        loading={loadingAction}
                    >
                        {intl.formatMessage({ id: 'button.save&Continue' })}
                    </ActionBtn>
                ) : null}
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
                    onClick={() => dispatch(actions.closeModal())}
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>
            </ActionHeaderModalWrap>
        </>)
    }

    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch(actions.closeModal())}
            title={title}
            closable={false}
            width={900}
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
                    <Input autoComplete="off" name="cp" style={{ display: 'none' }} />
                    {<>
                        <Row>

                            <Col md={12} sm={12} xs={24} className="l-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item
                                        className="break-line"
                                        name="newPassword"
                                        label="New password"
                                        rules={[
                                            { required: true, message: 'New password is required' },
                                            { whitespace: true, message: 'New password is required' },
                                            () => ({
                                                validator(_, value) {
                                                    if (value.length < 6)
                                                        return Promise.reject(new Error('Password must be 6-50 characters'));
                                                    if (value?.length > 50)
                                                        return Promise.reject(new Error('Password must be 6-50 characters'));
                                                    if (value) {
                                                        return Promise.resolve();
                                                    }
                                                },
                                            })
                                        ]}
                                    >
                                        <AntInput.Password
                                            maxLength={50}
                                            autoComplete="new-password"
                                            visibilityToggle
                                        />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        </Row>
                    </>}
                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="end" align="middle">
                    <Col style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <ActionBTN />
                    </Col>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default Index
