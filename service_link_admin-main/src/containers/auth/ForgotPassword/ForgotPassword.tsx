import MarketingLogo from '@app/containers/marketing/MarketingLogo';
import MarketingNavbar from '@app/containers/marketing/MarketingNavbar';
import { notificationComponent } from '@app/components/common/Notification';
import authAction from '@app/redux/auth/actions';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import {
  EmailIcon,
  FormDiv,
  MainParent,
  SignInBody,
  SignInShell,
  SubmitButton,
  WrapperForm,
} from '../SignIn/SignIn.styles';
import '@app/containers/marketing/marketing.css';

const { forgotPassword } = authAction;

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const history = useHistory();
  const intl = useIntl();
  const loading = useSelector((state: any) => state.Auth.loading);
  const isSuccess = useSelector((state: any) => state.Auth.isSuccess);
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      notificationComponent(
        'warning',
        3,
        intl.formatMessage({ id: 'sidebar.users.warning' }),
        intl.formatMessage({ id: 'form.error.validEmail' }),
      );
      return;
    }
    dispatch(forgotPassword({ email: trimmed }));
  };

  useEffect(() => {
    if (isSuccess) {
      history.push('/resetpassword');
    }
  }, [isSuccess, history]);

  return (
    <MainParent>
      <div className="marketing-site marketing-site--nav-only">
        <MarketingNavbar />
      </div>
      <SignInBody>
        <SignInShell>
          <WrapperForm onFinish={handleSubmit}>
            <FormDiv>
              <div className="form-header">
                <div className="logo-row">
                  <div className="logo-mark">
                    <MarketingLogo variant="light" />
                  </div>
                  <div className="logo-type">
                    <strong>Service360</strong>
                    <span>Facility management platform</span>
                  </div>
                </div>
                <h2>{intl.formatMessage({ id: 'page.forgetPassSubTitle' })}</h2>
                <p className="subtitle">{intl.formatMessage({ id: 'page.forgetPassDescription' })}</p>
              </div>

              <div className="wrapperForm">
                <div className="field">
                  <label htmlFor="forgot-email">
                    <EmailIcon />
                    {intl.formatMessage({ id: 'form.email' })}
                  </label>
                  <div className="field-input">
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'form.email' })}
                    />
                  </div>
                </div>

                <div className="save">
                  <SubmitButton type="primary" htmlType="submit" loading={loading}>
                    {intl.formatMessage({ id: 'page.sendRequest' })}
                  </SubmitButton>
                </div>
              </div>

              <Link className="forgot" to="/signin">
                {intl.formatMessage({ id: 'sidebar.signIn' })}
              </Link>
            </FormDiv>
          </WrapperForm>
        </SignInShell>
      </SignInBody>
    </MainParent>
  );
}
