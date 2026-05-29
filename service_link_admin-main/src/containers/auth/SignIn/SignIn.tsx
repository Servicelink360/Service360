import A from '@app/assets/images/signin/p1.webp'
import B from '@app/assets/images/signin/p2.png'
import C from "@app/assets/images/signin/p4.jpeg"
import D from "@app/assets/images/signin/p3.png"
import { notificationComponent } from '@app/components/common/Notification'
import appAction from '@app/redux/app/actions'
import { default as actions, default as authAction } from '@app/redux/auth/actions'
import { Col, Row } from 'antd'
import React, { useEffect, useState, useCallback } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useIntl } from 'react-intl'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import LogoV2 from '@app/assets/images/signin/logo.jpg'

import {
  EmailIcon,
  FormDiv,
  MainParent,
  PasswordIcon,
  SubmitButton,
  WrapperForm
} from './SignIn.styles'
import BlockScreen from '@app/components/common/BlockScreen'
import siteConfig from '@app/config/site.config'
const { login } = authAction
const { clearMenu } = appAction

export default function SignIn() {
  const intl = useIntl()
  const [data, setData] = useState<any>({
    email: '',
    password: '',
    save: false,
  })
  const [email, setEmail] = useState<number>(-1)
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((state: any) => state.Auth.idToken)
  const isLoading = useSelector((state: any) => state.Auth.loading)

  const [currIndex, setCurrIndex] = useState(-1);

  const autoNextBackground = useCallback(() => {
    if ((currIndex + 1) < 4) {
      setCurrIndex(currIndex + 1);
    } else {
      setCurrIndex(0);
    }
  }, [currIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      autoNextBackground();
    }, 6000)
    return () => clearInterval(interval)
  }, [autoNextBackground])

  useEffect(() => {
    setCurrIndex(0)
  }, [isLoggedIn])
  useEffect(() => {
    const data = localStorage.getItem('signin')
    const signin: any = data && JSON.parse(data)
    if (signin && JSON.stringify(signin).length > 0) {
      setData(signin)
    }
    if (!signin || signin?.email === '') {
      setEmail(-1)
    } else {
      if (signin?.email && signin?.email.length >= 5) {
        setEmail(1)
      } else {
        setEmail(0)
      }
    }
  }, [])
  // function handleLogin(e: any, token = false) {
  //   e.preventDefault();
  //   if (token) {
  //     dispatch(login(token));
  //   } else {
  //     dispatch(login());
  //   }
  //   dispatch(clearMenu());
  //   history.push('/dashboard');
  // }

  const handleSubmit = (): void => {
    if (data && data?.email && data?.email !== '' && email === 1) {
      if (data && data?.password && data?.password !== '') {
        const obj = {
          username: data?.email,
          password: data?.password,
        }
        if (data?.save) {
          localStorage.setItem('signin', JSON.stringify(data))
          dispatch({ type: actions.RESET_SIGNIN, payload: data })
        } else {
          localStorage.removeItem('signin')
          dispatch({ type: actions.RESET_SIGNIN, payload: '' })
        }
        dispatch(
          login(obj, () => {
          const publicUrl =
            typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL
              ? process.env.PUBLIC_URL
              : ''
          window.location.href = `${publicUrl}/dashboard`
            // history.push('/')
          }),
        )
        dispatch(clearMenu())
      } else {
        notificationComponent(
          'warning',
          3,
          intl.formatMessage({ id: 'sidebar.users.warning' }),
          intl.formatMessage({ id: 'signin.forget_password' }),
        )
      }
    }
    else {
      if (email === -1) {
        notificationComponent(
          'warning',
          3,
          intl.formatMessage({ id: 'sidebar.users.warning' }),
          intl.formatMessage({ id: 'signin.forget_email' }),
        )
      }
      else {
        notificationComponent(
          'warning',
          3,
          intl.formatMessage({ id: 'sidebar.users.warning' }),
          intl.formatMessage({ id: 'sidebar.signin.exceed_email' }),
        )
      }
    }
  }

  // let { from } = location.state || { from: { pathname: '/dashboard' } }

  // if (redirectToReferrer) {
  //   debugger
  //   return <Redirect to={from} />
  // }
  const handleOnChangeEmail = (e: any): void => {
    let { value } = e.target
    value = value.trim()
    if (value === '') {
      setEmail(-1)
    }
    else {
      // if (value && value.length >= 5) {
      //   setEmail(1)
      // } else {
      //   setEmail(0)
      // }
      setEmail(1)
    }
    setData({ ...data, email: value })
  }

  useEffect(() => {
    isLoading ? document.body.style.cursor = 'progress' : document.body.style.cursor = 'default'
  }, [isLoading])
  return (
    <MainParent>
      {isLoading ? <BlockScreen /> : null}
      <section id="sign_in_section">
        <Row className="signin">
          <Col
            xs={24}
            sm={24}
            md={24}
            lg={24}
            xl={24}
            className="signin__background"
          >
            <span className={currIndex === 0 ? 'span-bg active' : 'span-bg'}><img
              className="signin__background__img"
              src={A}
              alt="Background"
            /></span>
            <span className={currIndex === 1 ? 'span-bg move-right active' : 'span-bg move-right'}><img
              className="signin__background__img"
              src={B}
              alt="Background"
            /></span>
            <span className={currIndex === 2 ? 'span-bg active' : 'span-bg'}><img
              className="signin__background__img"
              src={C}
              alt="Background"
            /></span>
             <span className={currIndex === 3 ? 'span-bg active' : 'span-bg'}><img
              className="signin__background__img"
              src={D}
              alt="Background"
            /></span>
            <div className="signin__signature">
            </div>
            <WrapperForm onFinish={handleSubmit}>
              <FormDiv>
                <div className="title">
                  <div style={{ width: 'unset' }}>
                    <img
                      className="title__img"
                      srcSet={`${LogoV2} 2x`}
                      alt="SigninImage"
                    />
                  </div>
                  <span>CRM</span>
                </div>
                <Row className="wrapperForm">
                  <h2 className="header">
                    {intl.formatMessage({ id: 'sidebar.signin.member' })}
                    <span>
                      {intl.formatMessage({ id: 'sidebar.signin.member_signin' })}
                    </span>
                  </h2>
                  <div className="email">
                    <div>
                      <EmailIcon />
                      <span>
                        {intl.formatMessage({ id: 'signin.email' })}
                      </span>
                    </div>
                    <div className="email__child">
                      <input
                        value={data?.email || ''}
                        onChange={handleOnChangeEmail}
                        placeholder={intl.formatMessage({
                          id: 'profile.enter_username',
                        })}
                      />
                      {email === 1 ? (
                        <FaCheck
                          style={{
                            fontSize: '0.75rem',
                            marginLeft: '0.25rem',
                            color: '#52C41A',
                          }}
                        />
                      ) : email === 0 ? (
                        <FaTimes
                          onClick={() => {
                            setData({ ...data, email: '' })
                            setEmail(-1)
                          }}
                          style={{
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            marginLeft: '0.25rem',
                            color: '#FF4343',
                          }}
                        />
                      ) : (
                        ''
                      )}
                    </div>
                  </div>
                  <div className="email__password">
                    <div>
                      <PasswordIcon />
                      <span>
                        {intl.formatMessage({ id: 'sidebar.users.password' })}
                      </span>
                    </div>
                    <div className="email__password__child">
                      <input
                        value={data?.password || ''}
                        onChange={(e) =>
                          setData({ ...data, password: e.target.value })
                        }
                        type="password"
                        //  onChange={handleOnChangeEmail}
                        placeholder={intl.formatMessage({
                          id: 'sidebar.users.enter_password',
                        })}
                      />

                    </div>
                  </div>
                  <div className="save">
                    <SubmitButton type='primary' htmlType='submit'>
                      {intl.formatMessage({ id: 'sidebar.signin.login' })}
                    </SubmitButton>
                  </div>

                  <Link className="forgot" to="/forgotpassword">
                    <strong>{intl.formatMessage({ id: 'signin.forgot_password' })}</strong>
                  </Link>
                  <span className="endOfForm">{siteConfig.footerText}</span>
                </Row>
              </FormDiv>
            </WrapperForm>
          </Col>
          {/* <Col xs={21} sm={21} md={21} lg={21} xl={21}>
            <div className="signin__copyright">
              <div className="signin__copyright-center">
                <CopyrightOutlined className="signin__copyright-center-icon" />
                <h3> RINIST 2021, Emerse Solutions Pte Ltd</h3>
              </div>

              <div className="signin__copyright__struck">
                <img
                  className="signin__copyright__struck-icon"
                  srcSet={`${Struck} 2x`}
                  alt="StruckImage"
                />
              </div>
            </div>
          </Col> */}
        </Row>
      </section>
    </MainParent >
  )
}
