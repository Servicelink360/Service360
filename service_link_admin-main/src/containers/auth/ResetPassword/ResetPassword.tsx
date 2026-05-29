import logo_mini from '@app/assets/images/signin/logo.jpg'
import Button from '@app/components/uielements/button';
import Input from '@app/components/uielements/input';
import IntlMessages from '@app/components/utility/intlMessages';
import authAction from '@app/redux/auth/actions';
import { Form } from 'antd';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ResetPasswordStyleWrapper from './ResetPassword.styles';
import { useIntl } from 'react-intl'
const { resetPassword, resetStore } = authAction
export default function () {
  const dispatch = useDispatch();
  let history = useHistory();
  const intl = useIntl();
  const loading = useSelector((state: any) => state.Auth.loading);
  const isSuccess = useSelector((state: any) => state.Auth.isSuccess_reset);
  const onFinish = (values: any) => {
    dispatch(resetPassword(values))
  };
  const back = () => {
    dispatch(resetStore())
    history.push("/forgotpassword")
  }
  useEffect(() => {
    if (isSuccess) {
      history.push("/signin")
    }
  }, [isSuccess, history])
  return (
    <ResetPasswordStyleWrapper className="isoResetPassPage">
      <ArrowLeftOutlined className='backIcon' onClick={back} />
      <div className="isoFormContentWrapper">
        <div className="isoFormContent">
          <div className="isoLogoWrapper">
            <Link to="/dashboard">
              {/* <IntlMessages id="e" /> */}
              <img width={150} srcSet={`${logo_mini} 2x`} alt='' />
            </Link>
          </div>

          <div className="isoFormHeadText">
            <h3>
              <IntlMessages id="page.resetPassSubTitle" />
            </h3>
            <p>
              <IntlMessages id="page.resetPassDescription" />
            </p>
          </div>

          <div className="isoResetPassForm">
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              onFinish={onFinish}
            >
               <Form.Item
                name="disableAutoComplete"
                style={{ display: 'none' }}
              >
                <Input autoComplete="off" name='cp' />
              </Form.Item>
              <div className="isoInputWrapper">
                <Form.Item
                  name="code"
                  wrapperCol={{ span: 24 }}
                  rules={[{ required: true}]}
                // noStyle
                >

                  <Input size="large" autoComplete='off' placeholder={intl.formatMessage({id: 'sidebar.forgotPw_Code'})} />
                </Form.Item>
              </div>
              <div className="isoInputWrapper">
              <Form.Item name="password" rules={[
                  { 
                    required: true, 
                    message: intl.formatMessage({ id: "form.validate.Password"  })
                  },
                  {
                    min: 6,
                    max: 20,
                    message: intl.formatMessage({ id: 'form.validate.username6_20' })
                  },
                  () => ({
                    validator(_, value) {
                      let upper = /[A-Z]/;
                      let number = /[0-9]/;
                      let special = /[:;,?~[\]{}/!@#$%^*)(+=._-]/;
                      let notSpecial = /[<>'"\\&|]/;
                      let spaceCharacter = /\s/;

                      let counterUppercase = 0; 
                       if (value.search(spaceCharacter) >= 0)
                        return Promise.reject(new Error(intl.formatMessage({
                          id: 'sidebar.users.password.space',
                        })));
                      if (value.search(notSpecial) >= 0) {
                        return Promise.reject(new Error(intl.formatMessage({
                          id: 'sidebar.users.password.notSpecial',
                        })));
                      }
                      if (value.search(special) < 0) {
                        return Promise.reject(new Error(intl.formatMessage({
                          id: 'sidebar.users.password.special',
                        })));
                      }
                      for (let i = 0; i < value.length; i++) {
                        value.charAt(i)
                        if (upper.test(value.charAt(i))) {
                          counterUppercase++;
                          break;
                        }
                      }

                      if (counterUppercase < 1)
                        return Promise.reject(new Error(intl.formatMessage({
                          id: 'sidebar.users.password.capital',
                        })));
                      if (!number.test(value)) {
                        return Promise.reject(new Error(intl.formatMessage({
                          id: 'sidebar.users.password.digit',
                        })));
                      }
                      if (value) {
                        return Promise.resolve();
                      }
                    },
                  })
                ]}>
                  <Input size="large" type="password" placeholder={intl.formatMessage({ id: 'sidebar.users.password' })} maxLength ={25}/>
                </Form.Item>
              </div>

              <div className="isoInputWrapper">
                <Form.Item
                  name="confirm"
                  dependencies={['password']}
                  wrapperCol={{ span: 24 }}
                  rules={[{ required: true, message: <IntlMessages id={'profile.error_confirm_password'} />  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(intl.formatMessage({id: 'form.validate.ConfirmPassword'})));
                    },
                  }),]}
                // noStyle
                >

                  <Input
                    size="large"
                    type="password"
                    autoComplete='newpassword'
                    placeholder= {intl.formatMessage({id: 'profile.confirm_password'})}
                  />
                </Form.Item>
              </div>

              <div className="isoInputWrapper">
                <Button type="primary btn100" htmlType="submit" loading={loading}>
                  <IntlMessages id="page.resetPassSave" />
                </Button>
              </div>
            </Form>

          </div>
        </div>
      </div>
    </ResetPasswordStyleWrapper>
  );
}
