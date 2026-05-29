import { SIZE_1680 } from '../../library/hooks/useResponsive'
import { Button, Col, Form, Input, InputNumber, Row } from 'antd';
import React, { useEffect } from 'react'
import { useIntl } from 'react-intl'
import { PhoneOutlined, UserOutlined, EditOutlined } from '@ant-design/icons'
import { SectionForm, SubmitButton } from './profile2.styles';
import profileActions from '@app/redux/profile/actions';
import { useDispatch } from 'react-redux';
type IProps = {
    data: any,
    image: string
}
export default function Infomation({ data, image }: IProps) {
    const [form]: any = Form.useForm();
    const intl = useIntl()
    const dispatch = useDispatch()
    useEffect(() => {
        if (data) {
            form.setFieldsValue({
                firstName: data?.firstName,
                lastName: data?.lastName,
                username: data?.username,
                phone: data?.phone,
            })
        }
    }, [data, form])

    const onFinish = (values: any) => {
        const obj: any = {
            email: data?.email,
            fullName: values?.fullName,
            phone: values?.phone,
        }
        dispatch(profileActions.changeProfile(obj))
    }
    const validateMessages = {
        required: intl.formatMessage({ id: "form.error.Required" }),
        whitespace: intl.formatMessage({ id: "form.error.Whitespace" })
    };
    return (
        <Form form={form} onFinish={onFinish} validateMessages={validateMessages}>
            <Form.Item
                name="disableAutoComplete"
                style={{ display: 'none' }}
            >
                <Input autoComplete="off" name='cp' />
            </Form.Item>
            <SubmitButton>
                <SectionForm>
                    <div className="left">
                        <h3>
                            {intl.formatMessage({ id: 'profile.user_profile_basic' })}
                        </h3>
                        <Row className="left__input">
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 9 : 8}
                                xl={SIZE_1680('max') ? 9 : 8}
                            >
                                <span>
                                    <UserOutlined className="left__input__icon" />
                                </span>
                                <span className="left__input__title">
                                    {'First name'}
                                    <span className="left__input__title__star">*</span>
                                </span>
                            </Col>
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 14 : 15}
                                xl={SIZE_1680('max') ? 14 : 15}
                            >
                                <Form.Item
                                    // label="username"
                                    name="firstName"
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true
                                        },
                                        {
                                            max: 50,
                                            message: intl.formatMessage({ id: 'form.error.Max' })
                                        }
                                    ]}
                                >
                                    <Input
                                        autoComplete='newpassword'
                                        className="left__input__main"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row className="left__input">
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 9 : 8}
                                xl={SIZE_1680('max') ? 9 : 8}
                            >
                                <span>
                                    <UserOutlined className="left__input__icon" />
                                </span>
                                <span className="left__input__title">
                                    {'Last name'}
                                    <span className="left__input__title__star">*</span>
                                </span>
                            </Col>
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 14 : 15}
                                xl={SIZE_1680('max') ? 14 : 15}
                            >
                                <Form.Item
                                    // label="username"
                                    name="lastName"
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true
                                        },
                                        {
                                            max: 50,
                                            message: intl.formatMessage({ id: 'form.error.Max' })
                                        }
                                    ]}
                                >
                                    <Input
                                        autoComplete='newpassword'
                                        className="left__input__main"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row className="left__input">
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 9 : 8}
                                xl={SIZE_1680('max') ? 9 : 8}
                            >
                                <span>
                                    <UserOutlined className="left__input__icon" />
                                </span>
                                <span className="left__input__title">
                                    {intl.formatMessage({ id: 'sidebar.signin.user_name' })}{' '}
                                    <span className="left__input__title__star">*</span>
                                </span>
                            </Col>
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 14 : 15}
                                xl={SIZE_1680('max') ? 14 : 15}
                            >
                                <Form.Item
                                    name="username"
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'profile.enter_username',
                                            }),
                                        },
                                    ]}
                                >
                                    <Input
                                        disabled
                                        className="left__input__main"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row className="left__input">
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 9 : 8}
                                xl={SIZE_1680('max') ? 9 : 8}
                            >
                                <span>
                                    <PhoneOutlined className="left__input__icon" />
                                </span>
                                <span className="left__input__title">
                                    {intl.formatMessage({ id: 'profile.mobile_number' })}
                                    <span className="left__input__title__star">*</span>
                                </span>
                            </Col>
                            <Col
                                xs={24}
                                sm={11}
                                md={11}
                                lg={SIZE_1680('max') ? 14 : 15}
                                xl={SIZE_1680('max') ? 14 : 15}
                            >
                                <Form.Item
                                    name="phone"
                                    rules={[
                                        {
                                            required: true,
                                            message: intl.formatMessage({
                                                id: 'profile.enter_mobile_number',
                                            }),
                                        },
                                    ]}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        className="left__input__main"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div className="change__password" style={{ marginTop: 20 }}>
                            <Form.Item className="submit">
                                <Button
                                    icon={<EditOutlined />}
                                    className="btn__parent"
                                    type="primary"
                                    htmlType="submit"
                                >
                                    Save
                                </Button>
                            </Form.Item>
                        </div>
                    </div>
                </SectionForm>
            </SubmitButton>
        </Form>
    )
}
