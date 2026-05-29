import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset, FooterModalWrap } from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import endPoint from '@app/constants/endPoint'
import serviceType from '@app/constants/serviceType'
import errorCode from '@app/constants/errorCode'
import { callAPIAsync } from '@app/lib/helpers/api'
import { notificationComponent } from '@app/components/common/Notification/index'
import adminActions from '@app/redux/admins/actions'
import { Form, Modal, Row } from 'antd'
import React, { useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'

type IProps = {
    visible: boolean
    onClose: () => void
    onCreated: (company: { id: number; name: string; companyName?: string }) => void
}

const CompanyQuickAdd = ({ visible, onClose, onCreated }: IProps) => {
    const intl = useIntl()
    const dispatch = useDispatch()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)

    const onSave = async () => {
        const values = await form.validateFields()
        setSaving(true)
        try {
            const res = await callAPIAsync(serviceType.COMMON, endPoint.COMPANIES, 'POST', {
                name: values.name?.trim(),
            })
            if (res?.code === errorCode.SUCCESS && res.data) {
                notificationComponent('success', 3, intl.formatMessage({ id: 'notification.success' }), '')
                dispatch(adminActions.getDataInit({}))
                onCreated(res.data)
                form.resetFields()
                onClose()
            } else {
                notificationComponent('error', 3, res?.message || 'Could not create company', '')
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            visible={visible}
            onCancel={onClose}
            title="Add company"
            closable={false}
            width={480}
            footer={null}
            destroyOnClose
        >
            <BodyModalWrap>
                <Form form={form} layout="vertical">
                    <Fieldset>
                        <InputForm name="name" label="Company name" isRequired Max={255} />
                    </Fieldset>
                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="end">
                    <ActionHeaderModalWrap>
                        <ActionBtn type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
                            {intl.formatMessage({ id: 'button.Save' })}
                        </ActionBtn>
                        <ActionBtn type="secondary" icon={<CloseCircleOutlined />} onClick={onClose}>
                            {intl.formatMessage({ id: 'button.Close' })}
                        </ActionBtn>
                    </ActionHeaderModalWrap>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default CompanyQuickAdd
