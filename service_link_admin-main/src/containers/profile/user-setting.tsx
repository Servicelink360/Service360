import { LockOutlined } from '@ant-design/icons';
import profileActions from '@app/redux/profile/actions';
import { Button, Col, Form, Row, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons'
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { SIZE_1680 } from '../../library/hooks/useResponsive';
import { SectionForm, SubmitButton } from './profile2.styles';
import React from 'react';
type IProps = {
  data: any
}
export default function UserSetting({  data }: IProps) {
  const [form]: any = Form.useForm();
  const intl = useIntl();
  const dispatch = useDispatch()

  const onFinishChangePass = (values: any) => {
    let item = {
      email: data?.email,
      firstName: data?.firstName,
      lastName: data?.lastName,
      phone: data?.phone,
    
    }
    dispatch(profileActions.changeProfile(item))
    form.resetFields()
  }
  return (
    <Form onFinish={onFinishChangePass} >
      <SubmitButton>
        <SectionForm>
          <div style={{ marginBottom: '1rem' }} className="left left__autoHeight">
            <h3> {intl.formatMessage({
              id: 'sidebar.userSetting',
            })}</h3>

            <Row className="left__input">
              <Col
                xs={24}
                sm={11}
                md={11}
                lg={SIZE_1680('max') ? 10 : 8}
                xl={SIZE_1680('max') ? 10 : 8}
              >
                <span>
                  <LockOutlined className="left__input__icon" />
                </span>
                <span className="left__input__title">
                  {intl.formatMessage({
                    id: 'sidebar.dashboard',
                  })}
                  <span className="left__input__title__star">*</span>
                </span>
              </Col>
              
            </Row>

            <div className="change__password">
              <Button
                type="primary"
                htmlType="submit"
                className="btn__parent"
                icon={<SaveOutlined />}
              >
                {intl.formatMessage({
                  id: 'sidebar.users.save',
                })}
              </Button>
            </div>
          </div>
        </SectionForm>
      </SubmitButton>
    </Form>
  )
}
