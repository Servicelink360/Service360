import { MailOutlined, SaveOutlined } from '@ant-design/icons';
import profileActions from '@app/redux/profile/actions';
import { Button, Col, Form, Row, Switch } from 'antd';
import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { SIZE_1680 } from '../../library/hooks/useResponsive';
import { SectionForm, SubmitButton } from './profile2.styles';

type NotificationPrefs = {
  emailNotifyNormalFaultReports?: boolean;
  emailNotifyUrgentFaultReports?: boolean;
  emailNotifyNewReports?: boolean;
  emailNotifyMessages?: boolean;
  emailNotifyTickets?: boolean;
};

type IProps = {
  isAdmin?: boolean;
  data: {
    notificationPrefs?: NotificationPrefs;
  } | null;
};

export default function EmailNotifications({ data, isAdmin }: IProps) {
  const [form] = Form.useForm();
  const intl = useIntl();
  const dispatch = useDispatch();
  const prefs = data?.notificationPrefs;

  useEffect(() => {
    form.setFieldsValue({
      emailNotifyNormalFaultReports: !!prefs?.emailNotifyNormalFaultReports,
      emailNotifyUrgentFaultReports: !!prefs?.emailNotifyUrgentFaultReports,
      emailNotifyNewReports: !!prefs?.emailNotifyNewReports,
      emailNotifyMessages: !!prefs?.emailNotifyMessages,
      emailNotifyTickets: !!prefs?.emailNotifyTickets,
    });
  }, [prefs, form]);

  const onFinish = (values: NotificationPrefs) => {
    dispatch(profileActions.updateNotificationSettings(values));
  };

  return (
    <Form form={form} onFinish={onFinish} layout="vertical">
      <SubmitButton>
        <SectionForm>
          <div className="left left__autoHeight">
            <h3>
              <MailOutlined style={{ marginRight: 8 }} />
              {intl.formatMessage({ id: 'profile.email_notifications' })}
            </h3>
            <p style={{ marginBottom: '1.25rem', color: '#666', maxWidth: 640 }}>
              {intl.formatMessage({ id: 'profile.email_notifications_hint' })}
            </p>

            <h4 style={{ marginBottom: 12, fontWeight: 600 }}>
              {intl.formatMessage({ id: 'profile.email_notify_fault_reports' })}
            </h4>

            <Row className="left__input" align="middle">
              <Col
                xs={24}
                sm={16}
                md={16}
                lg={SIZE_1680('max') ? 14 : 12}
                xl={SIZE_1680('max') ? 14 : 12}
              >
                <span className="left__input__title" style={{ paddingLeft: 16 }}>
                  {intl.formatMessage({ id: 'profile.email_notify_normal_faults' })}
                </span>
              </Col>
              <Col xs={24} sm={8} md={8} lg={6} xl={6}>
                <Form.Item name="emailNotifyNormalFaultReports" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row className="left__input" align="middle" style={{ marginTop: 8 }}>
              <Col
                xs={24}
                sm={16}
                md={16}
                lg={SIZE_1680('max') ? 14 : 12}
                xl={SIZE_1680('max') ? 14 : 12}
              >
                <span className="left__input__title" style={{ paddingLeft: 16 }}>
                  {intl.formatMessage({ id: 'profile.email_notify_urgent_faults' })}
                </span>
              </Col>
              <Col xs={24} sm={8} md={8} lg={6} xl={6}>
                <Form.Item name="emailNotifyUrgentFaultReports" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row className="left__input" align="middle" style={{ marginTop: 24 }}>
              <Col
                xs={24}
                sm={16}
                md={16}
                lg={SIZE_1680('max') ? 14 : 12}
                xl={SIZE_1680('max') ? 14 : 12}
              >
                <h4 style={{ margin: 0, fontWeight: 600 }}>
                  {intl.formatMessage({ id: 'profile.email_notify_new_reports' })}
                </h4>
              </Col>
              <Col xs={24} sm={8} md={8} lg={6} xl={6}>
                <Form.Item name="emailNotifyNewReports" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row className="left__input" align="middle" style={{ marginTop: 16 }}>
              <Col
                xs={24}
                sm={16}
                md={16}
                lg={SIZE_1680('max') ? 14 : 12}
                xl={SIZE_1680('max') ? 14 : 12}
              >
                <h4 style={{ margin: 0, fontWeight: 600 }}>
                  {intl.formatMessage({ id: 'profile.email_notify_messages' })}
                </h4>
              </Col>
              <Col xs={24} sm={8} md={8} lg={6} xl={6}>
                <Form.Item name="emailNotifyMessages" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            {isAdmin ? (
              <Row className="left__input" align="middle" style={{ marginTop: 16 }}>
                <Col
                  xs={24}
                  sm={16}
                  md={16}
                  lg={SIZE_1680('max') ? 14 : 12}
                  xl={SIZE_1680('max') ? 14 : 12}
                >
                  <h4 style={{ margin: 0, fontWeight: 600 }}>
                    {intl.formatMessage({ id: 'profile.email_notify_tickets' })}
                  </h4>
                </Col>
                <Col xs={24} sm={8} md={8} lg={6} xl={6}>
                  <Form.Item name="emailNotifyTickets" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            ) : null}

            <div className="change__password" style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                className="btn__parent"
                icon={<SaveOutlined />}
              >
                {intl.formatMessage({ id: 'profile.update_profile' })}
              </Button>
            </div>
          </div>
        </SectionForm>
      </SubmitButton>
    </Form>
  );
}
