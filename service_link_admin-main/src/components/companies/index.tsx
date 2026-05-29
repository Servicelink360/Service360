import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset, FooterModalWrap } from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import actions from '@app/redux/companies/actions'
import { Col, Form, Modal, Row } from 'antd'
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

const CompanyModal = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [form] = Form.useForm()

    useEffect(() => {
        if (isSuccess) {
            form.resetFields()
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            form.setFieldsValue({ name: data.name })
        } else {
            form.resetFields()
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async () => {
        const values = await form.validateFields()
        if (!data?.id) {
            dispatch(actions.saveInto(values, actionType.ADD, false))
        } else {
            dispatch(actions.saveInto({ ...values, id: data.id }, actionType.UPDATE, false))
        }
        setChanged(false)
    }

    const ActionBTN = () => (
        <ActionHeaderModalWrap>
            <ActionBtn
                type="primary"
                icon={<SaveOutlined />}
                onClick={onFinishSave}
                disabled={!changed}
                loading={loadingAction}
            >
                {intl.formatMessage({ id: 'button.Save' })}
            </ActionBtn>
            <ActionBtn
                type="secondary"
                icon={<CloseCircleOutlined />}
                onClick={() => dispatch({ type: actions.MODAL, payload: { modalType: null, row: null } })}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </ActionBtn>
        </ActionHeaderModalWrap>
    )

    return (
        <Modal
            visible={!!modalType}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={520}
            footer={null}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => setChanged(true)}
                    validateMessages={validateMessages}
                    layout="vertical"
                >
                    <Row>
                        <Col span={24}>
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="name"
                                    label="Company name"
                                    isRequired
                                    Max={255}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="end">
                    <ActionBTN />
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default CompanyModal
