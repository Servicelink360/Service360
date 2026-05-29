import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap
} from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
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
import FormDatePicker from '@app/components/common/FormItem/DatePicker'
import TextArea from '@app/components/common/FormItem/TextArea'
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    isAnother?: boolean,
    roles: any,
    type: number,
    isDetail?: boolean
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, roles, type, isDetail } = props
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

    const isNewUser = !data?.id

    useEffect(() => {
        if (data?.id) {
            let nData = { ...data, ...data?.customerInfo, ...data?.staffInfo };
            if (data?.staffInfo?.startDate) {
                nData.startDate = moment(data?.staffInfo?.startDate);
            }
            form.setFieldsValue(nData)
            form.setFieldsValue({ roleId: data?.roles?.[0]?.roleId })
            form.setFieldsValue({
                groups: (data?.groups ?? []).map((r) => r.groupId),
            })
            form.setFieldsValue({
                roleIds: (data?.roles ?? []).map((r) => r.roleId),
            })
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
        tmp.username = String(values.email ?? '').trim()
        tmp.userRoles = tmp.roleIds
        tmp.type = type;
        if (isNewUser) {
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


    const userContent = () => {
        return <>
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
                        <>

                            <Row>
                                <Col md={24} sm={24} xs={24}>
                                    <h3>Login information</h3>
                                </Col>
                            </Row>
                            <Row>
                                {
                                    isNewUser && <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                        <Fieldset>
                                            <InputForm
                                                className="break-line"
                                                name="password"
                                                type="password"
                                                label={"Password"}
                                                Max={50}
                                                rules={[
                                                    { required: true },
                                                    { whitespace: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) },
                                                    () => ({
                                                        validator(_, value) {
                                                            if (value.length < 6)
                                                                return Promise.reject(new Error(intl.formatMessage({
                                                                    id: 'profile.exceed_new_password',
                                                                })));
                                                            if (value?.length > 50)
                                                                return Promise.reject(new Error(intl.formatMessage({
                                                                    id: 'profile.exceed_new_password',
                                                                })));
                                                            if (value) {
                                                                return Promise.resolve();
                                                            }
                                                        },
                                                    })
                                                ]}
                                            />
                                        </Fieldset>
                                    </Col>
                                }
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="email"
                                            label={"Email"}
                                            Max={200}
                                            isRequired={true}
                                            rules={
                                                [
                                                    { required: true },
                                                    {
                                                        type: 'email',
                                                        message: intl.formatMessage({ id: 'form.error.validEmail' })
                                                    }
                                                ]
                                            }
                                        />
                                    </Fieldset>
                                </Col>
                                {isNewUser ? <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <FormSelect
                                            name='sendLoginInfo'
                                            allowClear={false}
                                            label={"Send Login Details"}
                                            options={[{ id: 1, name: 'Yes' }, { id: 2, name: 'No' }]}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                        />
                                    </Fieldset>
                                </Col> : ""}
                            </Row>
                            <Row>
                                <Col md={24} sm={24} xs={24}>
                                    <h3>Personal information</h3>
                                </Col>
                            </Row>
                            <Row>
                                {/* {type === 2 ? <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                <Fieldset>
                    <InputForm
                        className="break-line"
                        name="companyName"
                        label={"Company name"}
                        isRequired={false}
                        Max={1000}
                    />
                </Fieldset>
            </Col> : ""} */}
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="firstName"
                                            label={"First name"}
                                            isRequired={true}
                                            Max={300}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} >
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="lastName"
                                            label={"Last name"}
                                            isRequired={false}
                                            Max={300}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="phone"
                                            label={"phone"}
                                            Max={200}
                                            isRequired={false}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} >
                                    <Fieldset>
                                        <FormSelect
                                            name='gender'
                                            allowClear={false}
                                            label={"Gender"}
                                            options={[{ id: '1', name: 'Male' }, { id: '2', name: 'Female' }]}
                                            className="break-line"
                                            optionValue={'id'}
                                            optionLabel={'name'}
                                            isRequired={true}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="address"
                                            label={"Address"}
                                            Max={200}
                                            isRequired={false}
                                        />
                                    </Fieldset>
                                </Col>
                                <Col md={12} sm={12} xs={24}>
                                    <Fieldset>
                                        <InputForm
                                            className="break-line"
                                            name="position"
                                            label={"Position"}
                                            Max={200}
                                            isRequired={false}
                                        />
                                    </Fieldset>
                                </Col>
                                {type === 2 ? <>
                                    <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                        <Fieldset>
                                            <FormDatePicker
                                                className="break-line"
                                                name='startDate'
                                                isRequired={true}
                                                label={'Start date'}
                                                format='YYYY/MM/DD'
                                            />
                                        </Fieldset>
                                    </Col>
                                    <Col md={12} sm={12} xs={24} >
                                        <Fieldset>
                                            <FormSelect
                                                name='ratings'
                                                allowClear={false}
                                                label={"Ratings"}
                                                options={[{ id: 1, name: '1' }, { id: 2, name: '2' }, { id: 3, name: '3' }]}
                                                className="break-line"
                                                optionValue={'id'}
                                                optionLabel={'name'}
                                                isRequired={true}
                                            />
                                        </Fieldset>
                                    </Col>
                                </> : ""}
                            </Row>


                            {
                                type === 1 ? <>
                                    <Row>
                                        <Col md={24} sm={24} xs={24}>
                                            <h3>More information</h3>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="city"
                                                    label={"City"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                        <Col md={12} sm={12} xs={24} >
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="state"
                                                    label={"State"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="postCode"
                                                    label={"Post Code"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                        <Col md={12} sm={12} xs={24} >
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="country"
                                                    label={"Country"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="landLine"
                                                    label={"Land line"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                        <Col md={12} sm={12} xs={24} >
                                            <Fieldset>
                                                <InputForm
                                                    className="break-line"
                                                    name="website"
                                                    label={"Website"}
                                                    Max={200}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                            <Fieldset>
                                                <TextArea
                                                    className="break-line"
                                                    name="description"
                                                    label={"Description"}
                                                    Max={200}
                                                    rows={6}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                        <Col md={12} sm={12} xs={24} >
                                            <Fieldset>
                                                <FormSelect
                                                    name='showQrCode'
                                                    allowClear={false}
                                                    defaultValue={2}
                                                    label={"Show QR Code Log Details"}
                                                    options={[{ id: 1, name: 'Yes' }, { id: 2, name: 'No' }]}
                                                    className="break-line"
                                                    optionValue={'id'}
                                                    optionLabel={'name'}
                                                    isRequired={false}
                                                />
                                            </Fieldset>
                                        </Col>
                                    </Row>
                                </> : ''
                            }

                            {
                                type === 3 ? <Row>
                                    <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                        <Fieldset>
                                            <FormSelect
                                                mode="multiple"
                                                name='roleIds'
                                                allowClear={false}
                                                label={"Roles"}
                                                options={roles}
                                                className="break-line"
                                                optionValue={'id'}
                                                optionLabel={'name'}
                                                isRequired={true}
                                            />
                                        </Fieldset>
                                    </Col>
                                </Row> : ""
                            }
                            <Row>
                                {/* <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                <Fieldset>
                    <FormSelect
                        mode="multiple"
                        name='roleIds'
                        allowClear={false}
                        label={"Quyền"}
                        options={roles}
                        className="break-line"
                        optionValue={'id'}
                        optionLabel={'name'}
                        isRequired={true}
                    />
                </Fieldset>
            </Col> */}
                                {/* {data && <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                <Fieldset>
                    <FormSelect
                        name='status'
                        allowClear={false}
                        label={"Trạng thái"}
                        options={[{ id: 1, name: "Active" }, { id: 3, name: "inactive" }]}
                        className="break-line"
                        defaultValue={1}
                        optionValue={'id'}
                        optionLabel={'name'}
                        isRequired={true}
                    />
                </Fieldset>
            </Col>} */}
                            </Row>

                        </>
                    }


                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="start" align="bottom">
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                        {data?.id ? (
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
        </>
    }
    if (isDetail) {
        return userContent()
    }


    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch(actions.closeModal())}
            title={title}
            closable={false}
            style={{ top: type === 1 ? 0 : 60 }}
            width={'60%'}
            footer={null}
        >

            {userContent()}

        </Modal>
    )
}

export default Index
