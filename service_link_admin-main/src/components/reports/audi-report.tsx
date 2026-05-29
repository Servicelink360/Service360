import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, FooterModalWrap } from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/tasks/actions'
import { Col, Form, Modal, Row, Tag, Image } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import actionType from '../../constants/actionType'

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    getDataInit: Function,
    isAnother?: boolean,

    reportTemplate: any
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, getDataInit, reportTemplate } = props;
    console.log('data', data);
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [items, setItems] = useState(data ? data.items : [])
    const [form] = Form.useForm()


    useEffect(() => {
        getDataInit()
    }, [getDataInit])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            setItems(data.items || []);
            const fieldValues: Record<string, unknown> = {};
            if (data.items?.length > 0) {
                for (const it of data.items) {
                    fieldValues[it.name] = it.value;
                }
            }
            form.setFieldsValue({ ...data, ...fieldValues });
        }
    }, [data, form]);

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        let tmp: any = { description: values.description, items: [] }
        if (items.length === 0)
            return;
        tmp.items = items;
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, actionType.CREATE_REPORT, closeable));
            setChanged(false)
        }
    }

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                {
                    (modalType !== actionType.VIEW ||
                      (modalType === actionType.VIEW && data.items.length === 0)) && (
                    <ActionBtn
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => {
                            onFinishSave(false)
                            // setChanged(false)
                        }}
                        disabled={!changed}
                        loading={loadingAction}
                    >
                        {intl.formatMessage({ id: 'button.Save' })}
                    </ActionBtn>
                    )}
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
    let j = 0;
    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={'60%'}
            style={{ top: 10 }}
            footer={null}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => {
                        setChanged(true)
                    }}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }} layout="vertical"
                >
                    <Row>

                        <Col md={8} sm={8} xs={24} >
                            <p><b>SITE</b></p>
                            <p>{data.siteName}</p>
                        </Col>
                        <Col md={8} sm={8} xs={24} >
                            <p><b>Service</b></p>
                            <p>{data.serviceName}</p>
                        </Col>
                       
                        <Col md={8} sm={8} xs={24} >
                            <p><b>TASK NAME</b></p>
                            <p>{data.taskName}</p>
                        </Col>
                        <Col md={8} sm={8} xs={24} >
                            <p><b>SUBMITTED BY</b></p>
                            <p><Tag style={{ cursor: 'pointer' }} color="#4caf50">{data.staff.fullName }</Tag></p>
                        </Col>
                        <Col md={8} sm={8} xs={24} >
                            <p><b>SUBMITTED DATE</b></p>
                            <p>{moment(data.checkOut).format('DD MMM, YYYY')}</p>
                        </Col>
                        <Col md={8} sm={8} xs={24} >
                            <p><b>STATUS</b></p>
                            <p><Tag style={{ cursor: 'pointer' }} color="#4caf50">Completed</Tag></p>
                        </Col>
                    </Row>
                    {
                        reportTemplate && <>
                            <Row className='pt-3 pb-2' style={{ width: '100%', padding: 10, marginTop: 20, marginBottom: 10, backgroundColor: 'red', color: 'white' }}>
                                <Col md={24} sm={24} xs={24} >
                                    <b>{reportTemplate.name}</b>
                                </Col>
                            </Row>
                            <Row className='pt-3 pb-2'>
                                {
                                    reportTemplate.items && reportTemplate.items.sort((a, b) => a.id - b.id).map((r) => {

                                        if (r.type === 'YES_NO') {
                                            j++;
                                            return (
                                                <React.Fragment key={`${r.name}-yesno`}>
                                                {reportTemplate.items.length > 0 ? <hr /> : ""}
                                                <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                                    <p>{(j)}. {r.name}: <span>{r.value === 'yes' ? <span style={{ color: 'green' }}>Yes</span> : <span style={{ color: 'red' }}>No</span>}</span>
                                                    </p>
                                                </Col>
                                                </React.Fragment>
                                            );
                                        }
                                        if (r.type === 'TEXT') {
                                            j++;
                                            return (
                                                <React.Fragment key={`${r.name}-text`}>
                                                {reportTemplate.items.length > 0 ? <hr /> : ""} <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                                    <p>{(j)}. {r.name}: {r.value}</p>
                                                </Col>
                                                </React.Fragment>
                                            );
                                        }
                                        if (r.type === 'IMAGES') {
                                            j++;
                                            const itemVal = items?.find((c) => c.name === r.name)?.value;
                                            const arr = itemVal ? JSON.parse(itemVal) : [];
                                            return (
                                                <React.Fragment key={`${r.name}-images`}>
                                                {reportTemplate.items.length > 0 ? <hr /> : ""} <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                                    <p>{(j)}. {r.name}: </p>
                                                    <p>{arr.map((image: string, idx: number) => (
                                                        <Image key={`${r.name}-${idx}`} src={image} height={120} width={120} style={{ objectFit: 'cover' }} />
                                                    ))}</p>
                                                </Col>
                                                </React.Fragment>
                                            );
                                        }
                                        return null;
                                    })
                                }
                            </Row>
                        </>
                    }

                    {/* <Row>
                        <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <Label>
                                    File
                                </Label>
                                <Dragger fileList={fileList} onChange={(e) => handleChangeFile(e, -1)}
                                    onRemove={() => {
                                        setFileList([]);
                                        setFile('')
                                        setChanged(true)
                                    }}
                                    beforeUpload={() => false} style={{ cursor: 'pointer' }}>
                                    <p style={{ textAlign: 'center' }}>
                                        <InboxOutlined style={{ fontSize: 36 }} />
                                    </p>
                                    <p style={{ textAlign: 'center' }}>Click or drag file to this area to upload</p>
                                </Dragger>
                            </Fieldset>
                        </Col>
                    </Row> */}
                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
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
