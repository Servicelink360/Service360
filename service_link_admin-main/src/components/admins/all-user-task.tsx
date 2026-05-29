import { CloseCircleOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, FooterModalWrap } from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/admins/actions'
import { Col, Form, Modal, Row, Tabs } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import Shifts from '@app/containers/job-sites/shifts'
import Task from '@app/containers/tasks'
import UserModal from '@app/components/admins'
import actionType from '../../constants/actionType'


type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    staffId: any,
    roles: any,
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, staffId, roles } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [form] = Form.useForm()

    useEffect(() => {
        dispatch(actions.getDataInit({}))
    }, [dispatch])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            let nData = { ...data, ...data?.customerInfo, ...data?.staffInfo };
            if (data?.staffInfo?.startDate) {
                nData.startDate = moment(data?.staffInfo?.startDate);
            }
            form.setFieldsValue(nData)
            form.setFieldsValue({ roleId: data?.roles?.[0]?.roleId })
            form.setFieldsValue({
                groups: (data?.groups ?? []).map((r) => r.groupId),
            })
            form.setFieldsValue({
                roleIds: (data?.roles ?? []).map((r) => r.roleId),
            })
            form.setFieldsValue({
                password: ''
            })

        }
    }, [data, form])

    const [tab, setTab] = useState(1);
    const onChange = (key: string) => {
        console.log(key);
        setTab(+key);
    };


    const items = [
        {
            key: '1',
            label: 'Info',
            children: <div style={{ width: '100%' }}>
                <UserModal
                    loadingAction={loadingAction}
                    modalType={actionType.UPDATE}
                    data={data}
                    title={''}
                    roles={roles}
                    type={2}
                    isDetail={true}
                />
            </div>,
        },
        {
            key: '2',
            label: 'Tasks',
            children: <div style={{ width: '100%' }}><Task staffId={staffId} /></div>,
        },
        {
            key: '3',
            label: 'Shifts',
            children: <div style={{ width: '100%' }}><Shifts staffId={staffId}/></div>,
        },
    ]

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() => dispatch(actions.closeModal())}
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>

            </ActionHeaderModalWrap>
        </>)
    }


    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch(actions.closeModal())}
            title={title}
            closable={false}
            style={{ top: 0 }}
            width={'100%'}
            footer={null}
        >
            <BodyModalWrap style={{padding:0}}>
                <Tabs defaultActiveKey={"" + tab} items={items} onChange={onChange} style={{ width: '100%' }} />
            </BodyModalWrap>
            {
                +tab !== 1 ? <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                    <Row justify="start" align="bottom">
                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                            {data ? (
                                <div>
                                    <p style={{ fontSize: 12 }}>
                                        {data?.createdUser &&
                                            sprintf(intl.formatMessage({ id: 'modal.createdInformation' }), {
                                                name: data?.createdUser?.fullName,
                                                datetime: moment(data?.createdAt).zone("+10:00").format(dateTimeFormat),
                                            })}
                                    </p>
                                    <p style={{ fontSize: 12 }}>
                                        {data?.updatedUser
                                            ? sprintf(intl.formatMessage({ id: 'modal.updatedInformation' }), {
                                                name: data?.createdUser?.fullName,
                                                datetime: moment(data?.updatedAt).zone("+10:00").format(dateTimeFormat),
                                            })
                                            : null}
                                    </p>
                                </div>
                            ) : null}
                        </Col>
                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Row justify="end">
                                <ActionBTN />
                            </Row>
                        </Col>
                    </Row>
                </FooterModalWrap> : ""
            }
        </Modal>
    )
}

export default Index
