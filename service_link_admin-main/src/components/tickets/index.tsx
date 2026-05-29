import { CloseCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap,
    Label
} from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { getBase64, sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/tickets/actions'
import { Col, Form, Modal, Row, Upload, Image } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIAsync } from '../../library/helpers/api'
import FormSelect from "@app/components/common/FormItem/Select";
import SvCheckBox from '../common/FormItem/Checkbox'
type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
    sites: any
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title, sites } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [form] = Form.useForm()
    const [services, setServices] = useState([])
    const tmpFileList = [];
    if (data && data.attachFiles) {
        for (const element of JSON.parse(data.attachFiles)) {
            tmpFileList.push({
                uid: element,
                percent: 50,
                name: element.split('/')[element.split('/').length - 1],
                status: 'done',
                url: element,
            })
        }
    }
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [fileList, setFileList] = useState<any>(tmpFileList)
    const [files, setFiles] = useState(data && data.attachFiles ? JSON.parse(data.attachFiles) : [])
    const profileRaw = localStorage.getItem('profile');
    let profile = null;
    if (profileRaw) {
        profile = JSON.parse(profileRaw)
    }
    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }

        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    };

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
        }
    }, [isSuccess, form])

    const handleChangeFile = async ({ fileList }) => {
        setFileList(fileList);
        setChanged(true)
    };

    const handleUpdaloadImage = async (options) => {
        const { onSuccess, onError, onProgress, file } = options;
        const raw = file.originFileObj ?? file;
        try {
            const response: any = await callAPIAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                "POST",
                { file: raw },
                {
                    onUploadProgress: (pct: number) => {
                        onProgress?.({ percent: pct });
                    },
                },
                true,
            );
            if (response?.code === 1) {
                setFiles((prev) => [...prev, response?.data]);
                setChanged(true);
                onSuccess?.(response, file);
            } else {
                onError?.(new Error(response?.message || "Upload failed"));
            }
        } catch (error: any) {
            onError?.(error);
        }
    };
    const siteId = data?.siteId;
    const getService = useCallback(async () => {
        if (siteId == null) return;
        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId });
        if (res && res.data) {
            setServices(res.data)
        }
    }, [siteId])
    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data })
            form.setFieldsValue({ priority: +data.priority === 1 ? true : false })
            getService()

        }
    }, [data, form, getService])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        let tmp = { ...values }
        if (values.priority === true) {
            tmp.priority = 1;
        } else {
            tmp.priority = 2;
        }
        const Service = services.find(c => c.id === values.serviceId);
        if (Service) {
            tmp.serviceName = Service.name
        }
        const site = sites.find(c => c.id === values.siteId);
        if (site) {
            tmp.siteName = site.name
        }


        if (profile && +profile.type === 1) {
            tmp.customerName = profile.fullName
        }

        tmp.attachFiles = JSON.stringify(files)
        if (!data) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
            setChanged(false)
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
            setChanged(false)
        }
    }

    const ActionBTN = () => {
        return (<>
            <ActionHeaderModalWrap>
                {
                    profile && +profile.type === 1 ? <ActionBtn
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
                    </ActionBtn> : ""
                }
                
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

    return (
        <Modal
            visible={modalType ? true : false}
            onCancel={() => dispatch({ type: actions.MODAL, payload: null })}
            title={title}
            closable={false}
            width={900}
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
                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='siteId'
                                    allowClear={true}
                                    label={"Sites"}
                                    options={sites}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                    onChange={async (value) => {
                                        // getStaff(data.id, form.getFieldValue('serviceId'), form.getFieldValue('customerId'));
                                        form.setFieldsValue({ staffId: null });
                                        form.setFieldsValue({ serviceId: null });

                                        const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getServicesBySite", 'GET', { siteId: value.id });
                                        if (res && res.data) {
                                            setServices(res.data)
                                        }
                                    }}
                                />
                            </Fieldset>
                        </Col>
                        {form.getFieldValue('siteId') || data?.serviceId ? <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='serviceId'
                                    allowClear={true}
                                    label={"Service"}
                                    options={services}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                    onChange={async (value) => {
                                        form.setFieldsValue({ staffId: null });
                                        form.setFieldsValue({ customerId: null });
                                        // const res = await callAPIAsync(serviceType.COMMON, endPoint.JOB_SITES + "/getCustomersBySite", 'GET', { siteId: form.getFieldValue('siteId'), serviceId: value.id });
                                        // if (res && res.data) {
                                        //     setCustomers(res.data)
                                        // }
                                    }}

                                />
                            </Fieldset>
                        </Col> : ""}

                        <Col md={12} sm={12} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="subject"
                                    label={"Subject"}
                                    isRequired={true}
                                    Max={200}
                                />
                            </Fieldset>
                        </Col>

                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <TextArea
                                    className="break-line"
                                    name="message"
                                    label={"Message"}
                                    isRequired={false}
                                    Max={300}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <SvCheckBox
                                    className="break-line"
                                    name="priority"
                                    label={"Ugrent"}
                                    isRequired={false}
                                // defaultValue={data.priority===1?true:false}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <Fieldset style={{}}>
                                    <Label>
                                        Media files
                                        <span style={{ color: "red" }}> *</span>
                                    </Label>
                                    <Upload
                                        fileList={fileList}
                                        multiple={true}
                                        listType="picture-card"
                                        onPreview={handlePreview}
                                        onRemove={(value) => {
                                            const nFiles = [...files].filter(c => c !== value.url);
                                            setFiles(nFiles)
                                            setChanged(true)
                                        }}
                                        customRequest={(option) => {
                                            handleUpdaloadImage(option)
                                        }}
                                        onChange={(info) => {
                                            handleChangeFile(info)
                                        }}
                                    >
                                        <button style={{ border: 0, background: 'none' }} type="button">
                                            <PlusOutlined />
                                            <div style={{ marginTop: 8 }}>Upload</div>
                                        </button>
                                    </Upload>
                                    {previewImage && (
                                        <Image
                                            wrapperStyle={{ display: 'none' }}
                                            preview={{
                                                visible: previewOpen,
                                                onVisibleChange: (visible) => setPreviewOpen(visible),
                                                // afterOpenChange: (visible) => !visible && setPreviewImage(''),
                                            }}
                                            src={previewImage}
                                        />
                                    )}
                                </Fieldset>
                            </Fieldset>
                        </Col>
                    </Row>


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
