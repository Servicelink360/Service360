import profileActions from '@app/redux/profile/actions'
import React, { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch, useSelector } from 'react-redux'
import Background from './../../assets/images/profile/background.png'
import { BackgroundImage, BackgroundMain, SectionInformation } from './profile2.styles.js'
import ChangePassword from './change-password'
import EmailNotifications from './email-notifications'
import Infomation from './infomation'
import { userType } from '../../constants/statusUser'
const MyProfile: React.FC = () => {
  const intl = useIntl()
  const [tab, setTab] = useState<number>(1)
  const data = useSelector((state: any) => state.profile.data)
  const [image, setImage] = useState<string>(data?.avatar)
  const success = useSelector((state: any) => state.profile.success)
  const loading = useSelector((state: any) => state.profile.loading)
  const dispatch = useDispatch()
  const getProfile = useCallback(
    () => dispatch(profileActions.fetchProfileDataStart()),
    [dispatch],
  )

  useEffect(() => {
    setImage(data?.avatar);
  }, [data])

  useEffect(() => {
    loading ? document.body.style.cursor = 'progress' : document.body.style.cursor = 'default';
  }, [loading])
  useEffect(() => {
    getProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (success) {
      getProfile()
      setImage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProfile, success])

  const isCustomer = +data?.type === userType.CUSTOMER
  const isAdmin = +data?.type === userType.ADMIN
  const showEmailNotifications = isCustomer || isAdmin

  return (
    <main>
      <BackgroundMain>
        <BackgroundImage src={Background} alt="Background" />
      </BackgroundMain>
      <SectionInformation>
        <div className="choose" style={{ height: 60 }}>
          <div className="choose__tab">
            <span
              onClick={() => setTab(1)}
              className={
                tab === 1 ? 'choose__tab-active' : 'choose__tab-deactive'
              }
            >
              {intl.formatMessage({
                id: 'profile.user_profile',
              })}
            </span>
            <span
              onClick={() => setTab(2)}
              className={
                tab === 2 ? 'choose__tab-active' : 'choose__tab-deactive'
              }
            >
              {intl.formatMessage({
                id: 'sidebar.users.password_change',
              })}
            </span>
            {showEmailNotifications ? (
              <span
                onClick={() => setTab(3)}
                className={
                  tab === 3 ? 'choose__tab-active' : 'choose__tab-deactive'
                }
              >
                {intl.formatMessage({
                  id: 'profile.email_notifications',
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          {tab === 1 ? (
            <Infomation image={image} data={data} />
          ) : tab === 2 ? (
            <ChangePassword />
          ) : showEmailNotifications ? (
            <EmailNotifications data={data} isAdmin={isAdmin} />
          ) : null}
        </div>
      </SectionInformation>

    </main>
  )
}

export default MyProfile
