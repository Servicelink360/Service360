import { LockOutlined } from '@ant-design/icons'
import React from 'react'
import profileActions from '@app/redux/profile/actions'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Col, Form, Input, Row } from 'antd'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import { SIZE_1680 } from '../../library/hooks/useResponsive'
import { SectionForm, SubmitButton } from './profile2.styles'
type IProps = {
  gender: any[]
  uiLanguage: any[]
  idType: any[]
  setCheckSubmit: Function
}
export default function ChangePassword() {
  const [form]: any = Form.useForm()
  const intl = useIntl()
  const dispatch = useDispatch()

  const onFinishChangePass = (values: any) => {
    let item = {
      oldPassword: values?.oldPassword,
      newPassword: values?.newPassword,
    }
    dispatch(profileActions.changePassword(item))
    form.resetFields()
  }
  return (
    <Form form={form} onFinish={onFinishChangePass}>
      <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
        <Input autoComplete="off" name="cp" />
      </Form.Item>

      <SubmitButton>
        <SectionForm>
          <div style={{ marginBottom: '1rem' }} className="left">
            <h3>
              {' '}
              {intl.formatMessage({
                id: 'sidebar.users.password_change',
              })}
            </h3>

            <Row className="left__input">
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 10 : 8} xl={SIZE_1680('max') ? 10 : 8}>
                <span>
                  <LockOutlined className="left__input__icon" />
                </span>
                <span className="left__input__title">
                  {intl.formatMessage({
                    id: 'profile.current_password',
                  })}
                  <span className="left__input__title__star">*</span>
                </span>
              </Col>
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 13 : 15} xl={SIZE_1680('max') ? 13 : 15}>
                <Form.Item
                  // label="Username"
                  name="oldPassword"
                  rules={[
                    {
                      required: true,
                      message: intl.formatMessage({
                        id: 'profile.enter_current_password',
                      }),
                    },
                    // ,
                    // {
                    //     pattern:  /^\S+$ |^[a-zA-Z0-9:;,?~[\]{}/!@#$%^*)(+=._-]+$/g,
                    //     message: intl.formatMessage({id: 'sidebar.users.password.whitespace'})
                    //   }
                  ]}
                >
                  <Input.Password
                    iconRender={(visible) => (visible ? null : null)}
                    autoComplete="new-password"
                    className="left__input__main"
                  //  placeholder="Enter a Current Password"
                  />
                </Form.Item>
              </Col>
            </Row>
            <p className="divide"></p>
            <Row className="left__input">
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 10 : 8} xl={SIZE_1680('max') ? 10 : 8}>
                <span>
                  <LockOutlined className="left__input__icon" />
                </span>
                <span className="left__input__title">
                  {intl.formatMessage({
                    id: 'profile.new_password',
                  })}
                  <span className="left__input__title__star">*</span>
                </span>
              </Col>
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 13 : 15} xl={SIZE_1680('max') ? 13 : 15}>
                <Form.Item
                  // label="Username"
                  name="newPassword"
                  rules={[
                    () => ({
                      validator(_, value) {
                        // let upper = /[A-Z]/
                        // let number = /[0-9]/
                        // let special = /[:;,?~[\]{}/!@#$%^*)(+=._-]/
                        // let notSpecial = /[<>'"\\&|]/
                        let spaceCharacter = /\s/

                        // let counterUppercase = 0

                        if (!value)
                          return Promise.reject(
                            new Error(
                              intl.formatMessage({
                                id: 'sidebar.users.enter_password_new',
                              })
                            )
                          )
                        if (value.length > 50)
                          return Promise.reject(
                            new Error(
                              intl.formatMessage({
                                id: 'profile.exceed_new_password',
                              })
                            )
                          )
                        if (value?.length < 6)
                          return Promise.reject(
                            new Error(
                              intl.formatMessage({
                                id: 'profile.exceed_new_password',
                              })
                            )
                          )
                        if (value?.search(spaceCharacter) >= 0)
                          return Promise.reject(
                            new Error(
                              intl.formatMessage({
                                id: 'sidebar.users.password.space',
                              })
                            )
                          )
                        // if (value?.search(notSpecial) >= 0) {
                        //   return Promise.reject(
                        //     new Error(
                        //       intl.formatMessage({
                        //         id: 'sidebar.users.password.notSpecial',
                        //       })
                        //     )
                        //   )
                        // }
                        // if (value?.search(special) < 0) {
                        //   return Promise.reject(
                        //     new Error(
                        //       intl.formatMessage({
                        //         id: 'sidebar.users.password.special',
                        //       })
                        //     )
                        //   )
                        // }
                        // for (let i = 0; i < value?.length; i++) {
                        //   value?.charAt(i)
                        //   if (upper.test(value?.charAt(i))) {
                        //     counterUppercase++
                        //     break
                        //   }
                        // }

                        // if (counterUppercase < 1)
                        //   return Promise.reject(
                        //     new Error(
                        //       intl.formatMessage({
                        //         id: 'sidebar.users.password.capital',
                        //       })
                        //     )
                        //   )
                        // if (!number.test(value)) {
                        //   return Promise.reject(
                        //     new Error(
                        //       intl.formatMessage({
                        //         id: 'sidebar.users.password.digit',
                        //       })
                        //     )
                        //   )
                        // }
                        if (value) {
                          return Promise.resolve()
                        }
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    className="left__input__main"
                    autoComplete="new-password"
                    iconRender={(visible) => (visible ? null : null)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row className="left__input">
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 10 : 8} xl={SIZE_1680('max') ? 10 : 8}>
                <span>
                  <LockOutlined className="left__input__icon" />
                </span>
                <span className="left__input__title">
                  {intl.formatMessage({
                    id: 'profile.confirm_password',
                  })}
                  <span className="left__input__title__star">*</span>
                </span>
              </Col>
              <Col xs={24} sm={11} md={11} lg={SIZE_1680('max') ? 13 : 15} xl={SIZE_1680('max') ? 13 : 15}>
                <Form.Item
                  // label="Username"
                  dependencies={['Password']}
                  name="confirm"
                  rules={[
                    {
                      required: true,
                      message: intl.formatMessage({
                        id: 'profile.enter_confirm',
                      }),
                    },
                    {
                      max: 50,
                      message: intl.formatMessage({
                        id: 'profile.exceed_new_password',
                      }),
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(
                          new Error(
                            intl.formatMessage({
                              id: 'passwordnotmatch',
                            })
                          )
                        )
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    className="left__input__main"
                    autoComplete="new-password"
                    iconRender={(visible) => (visible ? null : null)}
                    visibilityToggle={false}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="change__password" style={{ marginTop: 20 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                className="btn__parent"
              >
                Lưu
              </Button>
            </div>
          </div>
        </SectionForm>
      </SubmitButton>
    </Form>
  )
}
