import React, { useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Input from '@app/components/uielements/input';
import Checkbox from '@app/components/uielements/checkbox';
import Button from '@app/components/uielements/button';
import authAction from '@app/redux/auth/actions';
// import appActions from '@app/redux/app/actions';
import IntlMessages from '@app/components/utility/intlMessages';
import logo_mini from '@app/assets/images/signin/logo.jpg'
import { Form } from 'antd'
import SignUpStyleWrapper from './SignUp.styles';
import { useIntl } from 'react-intl'
// const { login } = authAction;
// const { clearMenu } = appActions;

export default function SignUp() {
  const dispatch = useDispatch();
  const history = useHistory();
  const [form] = Form.useForm();
  const intl = useIntl()
  const {
    loadingRegister,
    isRegisterSuccess
  } = useSelector((state: any) => state?.Auth);

  // const handleLogin = (token = false) => {
  //   if (token) {
  //     dispatch(login(token));
  //   } else {
  //     // dispatch(login());
  //   }
  //   dispatch(clearMenu());
  //   history.push('/dashboard');
  // };

  useEffect(() => {
    dispatch(authAction.regiterClear())

    return () => {
      dispatch(authAction.regiterClear())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [])

  useEffect(() => {
    if (isRegisterSuccess) {
      form.resetFields()
      history.push('/signin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isRegisterSuccess])

  const validateMessages = {
    required: intl.formatMessage({ id: 'form.error.short.Required' }),
    whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
  }

  const onFinishSave = async (closeable: boolean = true) => {
    const values = await form.validateFields();
    let temp = {
      Password: values?.Password || "",
      // FirstName: values?.FirstName || "",
      // LastName: values?.LastName || "",
      Email: values?.Email || "",
    }
    dispatch(authAction.registerStart(temp))
  }


  return (
    <Form
      form={form}
      validateMessages={validateMessages}
      style={{ width: '100%' }}
    >
      <SignUpStyleWrapper className="isoSignUpPage">
        <div className="isoSignUpContentWrapper">
          <div className="isoSignUpContent">
            <div className="isoLogoWrapper">
              <Link to="/dashboard">
                {/* <IntlMessages id="page.signUpTitle" /> */}
                <img width={150} src={logo_mini} alt='' />
              </Link>
            </div>

            <div className="isoSignUpForm">
              {/* <div className="isoInputWrapper isoLeftRightComponent">
                <Form.Item name="FirstName" rules={[{ required: true }]} style={{ width: '100%' }}>
                  <Input size="large" placeholder={intl.formatMessage({ id: 'sidebar.users.first_name' })} />
                </Form.Item>
                <Form.Item name="LastName" rules={[{ required: true }]} style={{ width: '100%' }}>
                  <Input size="large" placeholder={intl.formatMessage({ id: 'sidebar.users.last_name' })} />
                </Form.Item>
              </div> */}

              <div className="isoInputWrapper">
                <Form.Item name="Email"
                  rules={[
                    {
                      required: true,
                    },
                    {
                      type: 'email',
                      message: intl.formatMessage({ id: 'form.error.validEmail' })
                    }]}>
                  <Input size="large" placeholder={intl.formatMessage({ id: 'form.email' })} />
                </Form.Item>
              </div>

              <div className="isoInputWrapper">
                <Form.Item name="Password" rules={[
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
                <Form.Item name="confirm" dependencies={['Password']}
                  rules={[{ required: true, message: <IntlMessages id={'profile.error_confirm_password'} /> },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('Password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Confirm password does not match'));
                    },
                  })]}>
                  <Input
                    size="large"
                    type="password"
                    placeholder={intl.formatMessage({ id: 'profile.confirm_password' })}
                  />
                </Form.Item>
              </div>

              <div className="isoInputWrapper" style={{ marginBottom: '50px' }}>
                <Form.Item name="signUpTermsConditions" valuePropName="checked"
                  rules={[() => ({
                    validator(_, value) {
                      if (value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Please agree with terms and condtions!'));
                    },
                  })]}>
                  <Checkbox>
                    {intl.formatMessage({ id: 'page.signUpTermsConditions' })}
                  </Checkbox>
                </Form.Item>
              </div>

              <div className="isoInputWrapper">
                <Button loading={loadingRegister} type="primary" onClick={() => onFinishSave()}>
                  <IntlMessages id="page.signUpButton" />
                </Button>
              </div>
              
              <div className="isoInputWrapper isoCenterComponent isoHelperWrapper">
                <Link to="/signin">
                  <strong><IntlMessages id="page.signUpAlreadyAccount" /></strong>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SignUpStyleWrapper>
    </Form>
  );
}
