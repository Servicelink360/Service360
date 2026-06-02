import { CloseCircleOutlined, SaveOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset, FooterModalWrap } from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/sites/actions'
import { Col, Form, Modal, Row, Popconfirm, Button, Tag, Select, Space } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import { ButtonMR, InformationDiv } from '../common/container.style'
import { ColDef } from 'ag-grid-community'
import TableComponent from "@app/components/common/Table/index";
import ItemModal from '@app/components/sites/item'
import { serializeSiteItemsForApi } from '@app/lib/helpers/siteItemPayload';
import useDesktopViewport from '@app/lib/hooks/useDesktopViewport';
import {
    SITE_ITEM_FREQUENCY_NA,
    SITE_ITEM_FREQUENCY_UNITS,
    formatSiteItemFrequency,
    frequencyCountOptions,
    frequencyTimesSelectOptions,
    isSiteItemFrequencyNa,
    resolveFrequencyPerCount,
    resolveFrequencyTimes,
} from '@app/lib/helpers/siteItemFrequency';

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string,
    services: any,
    customers: any,
    getDataInit: any,
    staffs: any
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, services, customers, staffs, } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const isDesktop = useDesktopViewport()
    const [changed, setChanged] = useState(false)
    const [items, setItems] = useState(data && data.items ? data.items : [])
    const [showModal, setShowModal] = useState(false)
    const [form] = Form.useForm()
    const [infoModal, setInfoModal] = useState(null)

    useEffect(() => {
        dispatch(actions.getDataInit("SITES"))
    }, [dispatch])

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data })
        }
    }, [data?.id, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        try {
            const values = await form.validateFields();
            const tmp = { ...values, items: serializeSiteItemsForApi(items) };
            if (!data) {
                dispatch(actions.saveInto(tmp, modalType, closeable));
            } else {
                dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            }
            setChanged(false);
        } catch {
            /* validation errors shown on form */
        }
    }

    const updateItemFrequency = useCallback(
        (
            itemId: number,
            patch: {
                frequencyTimes?: number | null;
                frequencyCount?: number | null;
                frequencyPeriod?: string | null;
            },
        ) => {
            setItems((prev) =>
                prev.map((r) => (+r.id === +itemId ? { ...r, ...patch } : r)),
            );
            setChanged(true);
        },
        [],
    );

    const columns: ColDef[] | any = useMemo(() => {
        const cols: ColDef[] | any = [
        {
            title: 'Service',
            dataIndex: "services",
            width: 280,
            render: (text: string, row: any) => {
                return row.service && row.service.name
            },
        },
        {
            title: 'Customer',
            dataIndex: "customer",
            width: 120,
            render: (text: string, row: any) => {
                if (row?.customer?.customerInfo?.companyName) {
                    return row.customer.customerInfo.companyName
                }
                if (row?.customer?.fullName) {
                    return row.customer.fullName
                }
                return ""
            },
        },
        {
            title: 'Staffs',
            dataIndex: "staffs",
            width: 120,
            render: (text: string, row: any) => {
                if (row?.staffs && row?.staffs.length > 0)
                    return row.staffs.map((r) => {
                        if (!r.staff) {
                            return "";
                        }
                       return <Tag key={r.id ?? r.staffId}>{r.staff.fullName}</Tag>})
                return ""
            },
        },
        ];

        if (isDesktop) {
            cols.push({
                title: 'Frequency',
                key: 'frequency',
                width: 380,
                render: (_text: string, row: any) => {
                    const frequencyNa = isSiteItemFrequencyNa(row);
                    const times = resolveFrequencyTimes(row);
                    const perCount = resolveFrequencyPerCount(row);
                    const period = row.frequencyPeriod;
                    return (
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Space size={4} wrap align="center">
                                <Select
                                    value={frequencyNa ? SITE_ITEM_FREQUENCY_NA : times}
                                    options={frequencyTimesSelectOptions(30)}
                                    onChange={(v) => {
                                        if (v === SITE_ITEM_FREQUENCY_NA) {
                                            updateItemFrequency(row.id, {
                                                frequencyTimes: null,
                                                frequencyCount: null,
                                                frequencyPeriod: null,
                                            });
                                        } else {
                                            updateItemFrequency(row.id, {
                                                frequencyTimes: +v,
                                                frequencyCount: perCount,
                                                frequencyPeriod:
                                                    period && period !== SITE_ITEM_FREQUENCY_NA
                                                        ? period
                                                        : 'week',
                                            });
                                        }
                                    }}
                                    style={{ width: 72 }}
                                    aria-label="Times"
                                />
                                {!frequencyNa ? (
                                    <>
                                        <span style={{ fontSize: 12 }}>times,</span>
                                        <span style={{ fontSize: 12 }}>per</span>
                                        <Select
                                            value={perCount}
                                            options={frequencyCountOptions(30)}
                                            onChange={(v) =>
                                                updateItemFrequency(row.id, {
                                                    frequencyCount: +v,
                                                })
                                            }
                                            style={{ width: 56 }}
                                            aria-label="Per interval number"
                                        />
                                        <Select
                                            value={period}
                                            options={[...SITE_ITEM_FREQUENCY_UNITS]}
                                            onChange={(v) =>
                                                updateItemFrequency(row.id, {
                                                    frequencyPeriod: v,
                                                })
                                            }
                                            style={{ width: 88 }}
                                            aria-label="Period"
                                        />
                                    </>
                                ) : null}
                            </Space>
                            <span style={{ fontSize: 12, color: '#595959', lineHeight: 1.3 }}>
                                {formatSiteItemFrequency(
                                    row.frequencyTimes,
                                    row.frequencyCount,
                                    row.frequencyPeriod,
                                )}
                            </span>
                        </Space>
                    );
                },
            });
        }

        cols.push({
            title: intl.formatMessage({ id: "table.column.action" }),
            width: 120,
            fixed: "right",
            dataIndex: "action",
            render: (text: string, record: any) => (
                <div>
                    <ButtonMR
                        onClick={() => {
                            setInfoModal(record);
                            setShowModal(true)

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
                            const nItems = items.filter(c => c.id !== record.id)
                            setItems(nItems);
                            setChanged(true)
                        }}
                    >
                        <button className="btnDelete"  ><DeleteOutlined /> </button>
                    </Popconfirm>
                </div>
            ),
        });

        return cols;
    }, [items, intl, isDesktop, updateItemFrequency]);

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                <ActionBtn
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                        onFinishSave(false)
                    }}
                    disabled={!changed}
                    loading={loadingAction}
                >
                    {intl.formatMessage({ id: 'button.Save' })}
                </ActionBtn>
                <ActionBtn
                    type="secondary"
                    icon={<CloseCircleOutlined />}
                    onClick={() =>
                        dispatch({ type: actions.MODAL, payload: { modalType: null, row: {} } })
                    }
                >
                    {intl.formatMessage({ id: 'button.Close' })}
                </ActionBtn>
            </ActionHeaderModalWrap>
        </>)
    }

    const closeSiteModal = () => {
        dispatch({ type: actions.MODAL, payload: { modalType: null, row: {} } });
    };

    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={closeSiteModal}
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
                    <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>


                    <Row>
                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="name"
                                    label={intl.formatMessage({ id: 'form.label.name' })}
                                    isRequired={true}
                                    Max={200}
                                />
                            </Fieldset>
                        </Col>
                        <Col md={12} sm={12} xs={24} >
                            <Fieldset>
                                <TextArea
                                    className="break-line"
                                    name="description"
                                    label={intl.formatMessage({ id: 'form.label.description' })}
                                    isRequired={false}
                                    Max={300}
                                />
                            </Fieldset>
                        </Col>
                    </Row>



                    <Row>
                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="location"
                                    label={"Location (lat,lng)"}
                                    isRequired={false}
                                    Max={200}
                                />
                            </Fieldset>
                        </Col>
                        <Col md={12} sm={12} xs={24}>
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="checkInDistance"
                                    label={"Check-in radius (metres)"}
                                    isRequired={false}
                                    Max={10}
                                    type="number"
                                />
                            </Fieldset>
                        </Col>
                        <Col md={12} sm={12} xs={24} >
                            <Fieldset>
                                <TextArea
                                    className="break-line"
                                    name="addressName"
                                    label={"Address"}
                                    isRequired={false}
                                    Max={300}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row className='pt-3 pb-2'>
                        <Col md={12} sm={12} xs={24} >
                            Services
                        </Col>
                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }} >
                            <Button
                                onClick={() => {
                                    setShowModal(true)
                                    setInfoModal(null)
                                }}
                                type="primary"
                            >
                                <PlusOutlined /> Add new Service
                            </Button>
                        </Col>
                    </Row>
                    <InformationDiv>
                        <TableComponent
                            heightTable="350px"
                            onTableChange={() => {

                            }}
                            pagination={false}
                            columns={columns}
                            keys="id"
                            page={1}
                            count={items.length}
                            limit={100}
                            data={items}
                            loading={false}
                        />
                    </InformationDiv>
                </Form>
                {
                    showModal ? <ItemModal
                        loadingAction={false}
                        setShowModal={setShowModal}
                        setChanged={setChanged}
                        data={infoModal}
                        title={infoModal ? "Update" : "Add"}
                        setItems={setItems}
                        items={items}
                        customers={customers}
                        services={services}
                        staffs={staffs}
                    /> : ""
                }

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
