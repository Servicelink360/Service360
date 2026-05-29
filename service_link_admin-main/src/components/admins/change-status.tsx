import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap
} from '@app/components/common/Common.styles'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/admins/actions'
import { Col, Form, Modal, Row } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import FormSelect from "@app/components/common/FormItem/Select";
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
                status: data.status
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
        tmp.id = data.id
        dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
        setChanged(false)
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
                            {data && <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <FormSelect
                                        name='status'
                                        allowClear={false}
                                        label={"Status"}
                                        options={[{ id: 1, name: "Active" }, { id: 3, name: "inactive" }]}
                                        className="break-line"
                                        defaultValue={1}
                                        optionValue={'id'}
                                        optionLabel={'name'}
                                        isRequired={true}
                                    />
                                </Fieldset>
                            </Col>}
                        </Row>
                    </>}
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
