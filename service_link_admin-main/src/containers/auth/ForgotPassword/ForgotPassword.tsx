import logo_mini from '@app/assets/images/signin/logo.png'
import Button from '@app/components/uielements/button';
import Input from '@app/components/uielements/input';
import IntlMessages from '@app/components/utility/intlMessages';
import authAction from '@app/redux/auth/actions';
import { Form } from 'antd';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ForgotPasswordStyleWrapper from './ForgotPassword.styles';
import { useIntl } from 'react-intl';
const { forgotPassword } = authAction
export default function () {
  const dispatch = useDispatch();
  let history = useHistory();
  const intl = useIntl()
  const loading = useSelector((state: any) => state.Auth.loading);
  const isSuccess = useSelector((state: any) => state.Auth.isSuccess);
  const onFinish = (values: any) => {
    dispatch(forgotPassword(values))
  };
  useEffect(() => {
    if (isSuccess) {
      history.push("/resetpassword")
    }
  }, [isSuccess, history])
  return (
    <ForgotPasswordStyleWrapper className="isoForgotPassPage">
      <ArrowLeftOutlined className='backIcon' onClick={() => history.push("/signin")} />
      <div className="isoFormContentWrapper">
        <div className="isoFormContent">
          <div className="isoLogoWrapper">
            <Link to="/">
              <img width={150} srcSet={`${logo_mini} 2x`} alt='' />
            </Link>
          </div>
          <div className="isoFormHeadText">
            <h3>
              <IntlMessages id="page.forgetPassSubTitle" />
            </h3>
            <p>
              <IntlMessages id="page.forgetPassDescription" />
            </p>
          </div>

          <div className="isoForgotPassForm">
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              initialValues={{ email: "" }}
              onFinish={onFinish}
              autoComplete="off"
            >
              <div className="isoInputWrapper">

                <Form.Item
                  name="email"
                  wrapperCol={{ span: 24 }}
                  rules={[
                    { required: true, message: <IntlMessages id='form.error.validEmail' /> }, 
                    { type: 'email', message: <IntlMessages id='form.error.validEmail'/> }]}
                >
                  <Input size="large" autoComplete='off' placeholder={intl.formatMessage({ id: 'form.email' })} />
                </Form.Item>
              </div>
              <Form.Item wrapperCol={{ span: 24 }}>

                <Button type="primary" className="btn100" htmlType="submit" loading={loading}>
                  <IntlMessages id="page.sendRequest" />
                </Button>
              </Form.Item>
            </Form>

          </div>
        </div>
      </div>

    </ForgotPasswordStyleWrapper >
  );
}
