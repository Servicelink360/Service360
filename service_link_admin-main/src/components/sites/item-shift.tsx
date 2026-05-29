import { CloseCircleOutlined, SaveOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset } from '@app/components/common/Common.styles'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { Button, Col, Form, Modal, Popconfirm, Row, Tag } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import FormSelect from "@app/components/common/FormItem/Select";
import moment from 'moment'
import { ColDef } from 'ag-grid-community'
import { ButtonMR, InformationDiv } from '../common/container.style'
import TableComponent from "@app/components/common/Table/index";
import ItemStaffModal from "@app/components/sites/item-staff";
import { useDispatch } from 'react-redux'
import actions from "@app/redux/sites/actions";
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    data: any
    title: string,
    customers: any
    services: any
    staffs: any,
    modalType: any,
    sites: any
    
    staffId:number
}
const ItemModal = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, services, customers, staffs, sites ,staffId} = props

    const intl = useIntl()
    const [showShiftModal, setShowShiftModal] = useState(false)
    const [staffShifts, setStaffShifts] = useState(data && data.staffs ? data.staffs : [])
    const [staffShiftInfo, setStaffShiftInfo] = useState(null)
    const [form] = Form.useForm()
    const dispatch = useDispatch();
    const [, setChanged] = useState(false)

    useEffect(() => {
        dispatch(actions.getDataInit('SITES'));
    }, [dispatch])
    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])
    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data,staffId:data.id})
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        let values = await form.validateFields();
        let tmp = { ...values }
        tmp.staffs = staffShifts;
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            setChanged(false)
        }
        // if (data && data.id) {
        //     const n = [];
        //     items.forEach((r, i) => {
        //         if (r.id === data.id) {
        //             r = { ...r, ...values, Service, customer, staffs: staffShifts }
        //         }
        //         n.push(r);
        //     })
        //     setItems(n)
        //     setShowModal(false)
        // } else {

        //     const n = { ...values, Service, customer, id: Date.now(), staffs: staffShifts }
        //     setItems([...items, n])
        //     setShowModal(false)
        // }

    }

    const columns: ColDef[] | any = useMemo(() => [

        {
            title: 'Staff',
            dataIndex: "staff",
            width: 120,
            render: (text: string, row: any) => {
                return row?.staff?.fullName
            },
        },
        {
            title: 'Shifts',
            dataIndex: "shifts",
            width: 250,
            render: (text: string, row: any) => {
                if (row?.staffShifts)
                    return row?.staffShifts.map((r) => {
                        const t = row.type === "E" ? <Tag>Everyday</Tag> : r.type === "W" ? <Tag>Working day</Tag> : r?.typeValue && r?.typeValue.split(',').map((k) => <Tag>{+k === 0 ? "Mon" : +k === 1 ? "Tue" : +k === 2 ? "Wed" : +k === 3 ? "Thu" : +k === 4 ? "Fki" : +k === 5 ? "Sat" : +k === 6 ? "Sun" : ""}</Tag>);

                        return <p>{moment(moment().format("YYYY-MM-DD " + r.startTime)).format("HH:mm") + " - " + moment(moment().format("YYYY-MM-DD " + r.endTime)).format("HH:mm")} {t}</p>
                    })
                return ""
            },
        },
        {
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    <ButtonMR
                        onClick={() => {
                            setStaffShiftInfo(record);
                            setShowShiftModal(true);
                        }}
                        className="btnLink"
                    >
                        <EditOutlined />
                    </ButtonMR>
                    <Popconfirm
                        title={intl.formatMessage({ id: "notification.confirm_delete", })}
                        okText={intl.formatMessage({ id: "button.Yes" })}
                        cancelText={intl.formatMessage({ id: "button.No" })}
                        placement="topRight"
                        onConfirm={(e) => {
                            const nItems = staffShifts.filter(c => c.id !== record.id)
                            setStaffShifts(nItems);
                            setChanged(true)
                        }}
                    >
                        <button className="btnDelete"  ><DeleteOutlined /> </button>
                    </Popconfirm>
                </div>
            ),
        },
    ], [staffShifts, intl]);

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                        onFinishSave(false);
                    }}
                    disabled={false}
                    loading={loadingAction}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
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



    const TitleNew = () => {
        return (
            <>
                <div className='left div-flex-col-center'>{title}</div>
            </>
        );
    };
    const title_new = <TitleNew />;
    return (
        <Modal
            visible={true}
            onCancel={() => {  dispatch({ type: actions.MODAL, payload: '' }) }}
            title={title_new}
            closable={false}
            width={'60%'}
            style={{ top: 10 }}
            footer={<ActionBTN />}
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
                    <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='siteId'
                                    allowClear={false}
                                    label={"Site"}
                                    options={sites && sites.map(c => {
                                        const n = { ...c };
                                        return n;
                                    })}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col>
                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='serviceId'
                                    allowClear={false}
                                    label={"Service"}
                                    options={services && services.map(c => {
                                        const n = { ...c };
                                        return n;
                                    })}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col>
                        <Col md={12} sm={12} xs={24}className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='customerId'
                                    allowClear={false}
                                    label={"Customer"}
                                    options={customers && customers.map(c => {
                                        const n = { ...c };
                                        return n;
                                    })}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col>
                        {/* <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='staffs'
                                    allowClear={false}
                                    mode='multiple'
                                    label={"Staffs"}
                                    options={staffs}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'fullName'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col> */}


                    </Row>
                    <Row className='pt-3 pb-2'>
                        <Col md={12} sm={12} xs={24} >
                            Staff
                        </Col>
                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }} >
                            <Button
                                onClick={() => { setShowShiftModal(true) }}
                                type="primary"
                            >
                                <PlusOutlined /> Add new Staff
                            </Button>
                        </Col>
                    </Row>
                    <InformationDiv>
                        <TableComponent
                            heightTable="350px"
                            pagination={false}
                            columns={columns}
                            keys="id"
                            page={1}
                            count={staffShifts.length}
                            limit={100}
                            data={staffShifts.filter(c => c.staff)}
                            loading={false}
                        />
                    </InformationDiv>
                    {showShiftModal && <ItemStaffModal
                        staffId={staffId}
                        loadingAction={false} data={staffShiftInfo}
                        title={staffShiftInfo ? "Add Shift" : "Update Shift"}
                        setShowModal={setShowShiftModal} setChanged={setChanged} items={staffShifts} setItems={setStaffShifts} staffs={staffs} />}
                </Form>
            </BodyModalWrap>
        </Modal>
    )
}

export default ItemModal