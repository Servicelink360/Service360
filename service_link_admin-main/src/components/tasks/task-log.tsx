import { CloseCircleOutlined, FilePdfOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, FooterModalWrap} from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateFormat } from '@app/config/data.config'
import actions from '@app/redux/sites/actions'
import { Col, DatePicker, Form, Modal, Row, Tag } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import { InformationDiv } from '../common/container.style'
import { ColDef } from 'ag-grid-community'
import TableComponent from "@app/components/common/Table/index";
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIAsync } from '../../library/helpers/api'
import { dJobStatus } from '../../constants/statusUser'
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    userId: number,
    taskId: number,
    taskShiftId: number,
    title: string,
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, userId, taskId, taskShiftId, title } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [form] = Form.useForm()
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    const getUserTasks = useCallback(async (month: number, year: number) => {
        const dataLog = await callAPIAsync(serviceType.COMMON, endPoint.USER_TASKS + "/getAllUserTasksByUserId", 'GET', { userId, taskId, taskShiftId, month, year })
        if (dataLog.data) {
            setItems(dataLog.data.rows)
        }
    }, [userId, taskId, taskShiftId])
    useEffect(() => {
        getUserTasks(new Date().getMonth() + 1, new Date().getFullYear())
    }, [getUserTasks])



    const columns: ColDef[] | any = useMemo(() => [
        {
            title: 'Day',
            dataIndex: "day",
            width: 50,
            render: (text: string, row: any) => {
                return <b> {moment(row.startTime).zone("+10:00").format('DD')}</b>
            },
        },
        {
            title: 'Month',
            dataIndex: "month",
            width: 50,
            render: (text: string, row: any) => {
                return <b> {moment(row.startTime).zone("+10:00").format('MMM')}</b>
            },
        },
        {
            title: 'Task name',
            dataIndex: "taskName",
            width: 250,
            render: (text: string, row: any) => {
                return row.taskName
            },
        },
        {
            title: "Time",
            dataIndex: "taskName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
                return <>
                    <p>Day: <b> {moment(row.startTime).zone("+10:00").format(dateFormat)}</b></p>
                    <p>Time:<b> {moment(row.startTime).zone("+10:00").format('HH:mm') + " - " + moment(row.endTime).zone("+10:00").format('HH:mm')}</b></p>
                </>
            },
            width: 150,
        },
        {
            title: "Report file",
            dataIndex: "taskName",
            className: 'noWrapCell',
            render: (text: string, row: any) => {
                return row.pdfFile ? <a target="_blank" rel="noopener noreferrer" href={row.pdfFile}><FilePdfOutlined size={30} /></a> : ""
            },
            width: 150,
        },
        {
            title: 'Status',
            dataIndex: "status",
            width: 100,
            render: (text: string, row: any) => {
                if (row.status === dJobStatus.NEW)
                    return <Tag style={{ cursor: 'pointer' }} color="#ffc107">Pending</Tag>
                else if (row.status === dJobStatus.INPROGRESS)
                    return <Tag style={{ cursor: 'pointer' }} color="#F44336">In progress</Tag>
                else
                    return <Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag>
            },
        },

    ], []);


    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() => dispatch({ type: actions.MODAL, payload: '' })}
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>
            </ActionHeaderModalWrap>
        </>)
    }

    const onChange = (date, dateString) => {
        getUserTasks(+moment(date).format('MM'), +moment(date).format('YYYY'))
    };

    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={'60%'}
            style={{ top: 0 }}
            footer={null}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    style={{ width: '100%' }} layout="vertical"
                >
                    <Row className='pt-3 pb-2'>

                        <Col md={12} sm={12} xs={24} >
                            <DatePicker onChange={onChange} picker="month" />
                        </Col>
                    </Row>
                    <InformationDiv>
                        <TableComponent
                            heightTable="650px"
                            columns={columns}
                            keys="id"
                            page={1}
                            count={items.length}
                            limit={100}
                            data={items}
                            loading={false}
                            pagination={false}
                        />
                    </InformationDiv>
                </Form>


            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="start" align="bottom">
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                    </Col>
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {/* <Divider  /> */}
                        <Row justify="end">
                            <ActionBTN />
                        </Row>
                    </Col>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default Index
