import { notificationComponent } from '@app/components/common/Notification';
import BlockScreen from '@app/components/common/BlockScreen';
import siteConfig from '@app/config/site.config';
import MarketingLogo from '@app/containers/marketing/MarketingLogo';
import MarketingNavbar from '@app/containers/marketing/MarketingNavbar';
import appAction from '@app/redux/app/actions';
import { default as actions, default as authAction } from '@app/redux/auth/actions';
import React, { useEffect, useState } from 'react';
import { FaCheck, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  EmailIcon,
  FormDiv,
  MainParent,
  PasswordIcon,
  SignInBody,
  SignInShell,
  SubmitButton,
  WrapperForm,
} from './SignIn.styles';
import '@app/containers/marketing/marketing.css';

const { login } = authAction;
const { clearMenu } = appAction;

export default function SignIn() {
  const intl = useIntl();
  const [data, setData] = useState<any>({
    email: '',
    password: '',
    save: false,
  });
  const [email, setEmail] = useState<number>(-1)
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const isLoading = useSelector((state: any) => state.Auth.loading);

  useEffect(() => {
    const stored = localStorage.getItem('signin');
    const signin: any = stored && JSON.parse(stored);
    if (signin && JSON.stringify(signin).length > 0) {
      setData(signin);
    }
    if (!signin || signin?.email === '') {
      setEmail(-1);
    } else if (signin?.email && signin?.email.length >= 5) {
      setEmail(1);
    } else {
      setEmail(0);
    }
  }, []);

  const readFieldValues = () => {
    const emailInput = document.getElementById('signin-email') as HTMLInputElement | null;
    const passwordInput = document.getElementById('signin-password') as HTMLInputElement | null;
    const emailValue = (emailInput?.value ?? data?.email ?? '').trim();
    const passwordValue = passwordInput?.value ?? data?.password ?? '';
    return { emailValue, passwordValue };
  };

  const handleSubmit = (): void => {
    const { emailValue, passwordValue } = readFieldValues();
    const emailStatus =
      emailValue === '' ? -1 : emailValue.length >= 5 ? 1 : 0;

    if (emailValue && emailStatus === 1) {
      if (passwordValue) {
        const submitData = { ...data, email: emailValue, password: passwordValue };
        const obj = {
          username: emailValue,
          password: passwordValue,
        };
        if (submitData?.save) {
          localStorage.setItem('signin', JSON.stringify(submitData));
          dispatch({ type: actions.RESET_SIGNIN, payload: submitData });
        } else {
          localStorage.removeItem('signin');
          dispatch({ type: actions.RESET_SIGNIN, payload: '' });
        }
        dispatch(
          login(obj, () => {
            const publicUrl =
              typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL
                ? process.env.PUBLIC_URL
                : '';
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect');
            const safeRedirect =
              redirect && redirect.startsWith('/') && !redirect.startsWith('//')
                ? redirect
                : '/dashboard';
            window.location.href = `${publicUrl}${safeRedirect}`;
          }),
        );
        dispatch(clearMenu());
      } else {
        notificationComponent(
          'warning',
          3,
          intl.formatMessage({ id: 'sidebar.users.warning' }),
          intl.formatMessage({ id: 'signin.forget_password' }),
        );
      }
    } else if (emailStatus === -1) {
      notificationComponent(
        'warning',
        3,
        intl.formatMessage({ id: 'sidebar.users.warning' }),
        intl.formatMessage({ id: 'signin.forget_email' }),
      );
    } else {
      notificationComponent(
        'warning',
        3,
        intl.formatMessage({ id: 'sidebar.users.warning' }),
        intl.formatMessage({ id: 'sidebar.signin.exceed_email' }),
      );
    }
  };

  const handleOnChangeEmail = (e: any): void => {
    let { value } = e.target;
    value = value.trim();
    if (value === '') {
      setEmail(-1);
    } else {
      setEmail(1);
    }
    setData({ ...data, email: value });
  };

  useEffect(() => {
    isLoading ? (document.body.style.cursor = 'progress') : (document.body.style.cursor = 'default');
  }, [isLoading]);

  useEffect(() => {
    document.title = 'Sign in — Service360';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      robots?.setAttribute('content', 'index, follow');
    };
  }, []);

  return (
    <MainParent>
      {isLoading ? <BlockScreen /> : null}
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
                <h2>{intl.formatMessage({ id: 'sidebar.signin.member_signin' })}</h2>
                <p className="subtitle">Access your workspace with your member account</p>
              </div>

              <div className="wrapperForm">
                <div className="field">
                  <label htmlFor="signin-email">
                    <EmailIcon />
                    {intl.formatMessage({ id: 'signin.email' })}
                  </label>
                  <div className="field-input">
                    <input
                      id="signin-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={data?.email || ''}
                      onChange={handleOnChangeEmail}
                      onInput={handleOnChangeEmail}
                      placeholder={intl.formatMessage({ id: 'profile.enter_username' })}
                      autoComplete="username"
                    />
                    {email === 1 ? (
                      <FaCheck style={{ fontSize: '0.75rem', color: '#52C41A', flexShrink: 0 }} />
                    ) : email === 0 ? (
                      <FaTimes
                        onClick={() => {
                          setData({ ...data, email: '' });
                          setEmail(-1);
                        }}
                        style={{ fontSize: '0.75rem', cursor: 'pointer', color: '#FF4343', flexShrink: 0 }}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signin-password">
                    <PasswordIcon />
                    {intl.formatMessage({ id: 'sidebar.users.password' })}
                  </label>
                  <div className="field-input">
                    <input
                      id="signin-password"
                      value={data?.password || ''}
                      onChange={(e) => setData({ ...data, password: e.target.value })}
                      onInput={(e) => setData({ ...data, password: e.currentTarget.value })}
                      type={showPassword ? 'text' : 'password'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={intl.formatMessage({ id: 'sidebar.users.enter_password' })}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="save">
                  <SubmitButton type="primary" htmlType="submit">
                    {intl.formatMessage({ id: 'sidebar.signin.login' })}
                  </SubmitButton>
                </div>
              </div>

              <Link className="forgot" to="/forgotpassword">
                {intl.formatMessage({ id: 'signin.forgot_password' })}
              </Link>
              <span className="endOfForm">{siteConfig.footerText}</span>
            </FormDiv>
          </WrapperForm>
        </SignInShell>
      </SignInBody>
    </MainParent>
  );
};
