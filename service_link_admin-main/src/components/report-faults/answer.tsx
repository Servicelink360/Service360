import { CloseCircleOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import {
    ActionBtn,
    ActionHeaderModalWrap,
    Fieldset,
    FooterModalWrap,
    Label
} from '@app/components/common/Common.styles'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { dateTimeFormat } from '@app/config/data.config'
import { getBase64, sprintf } from '@app/lib/helpers/utility'
import actions from '@app/redux/report-faults/actions'
import { Button, Col, Form, Modal, Row, Upload, Image } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIAsync } from '../../library/helpers/api'
import { isFaultVideoUrl } from './fault-media'

type IProps = {
    loadingAction: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
}

const ReportFaultAnswerModal = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, data, title } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [open, setOpen] = useState(true)
    const [form] = Form.useForm()

    const tmpFileList: any[] = [];
    if (data && data.attachFiles) {
        try {
            for (const element of JSON.parse(data.attachFiles)) {
                tmpFileList.push({
                    uid: element,
                    percent: 50,
                    name: element.split('/')[element.split('/').length - 1],
                    status: 'done',
                    url: element,
                })
            }
        } catch {
            // ignore
        }
    }

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [fileList, setFileList] = useState<any>(tmpFileList)
    const [files, setFiles] = useState<string[]>(data?.attachFiles ? (() => {
        try { return JSON.parse(data.attachFiles); } catch { return []; }
    })() : [])

    const handlePreview = async (file: any) => {
        const mediaUrl = file.url || file.response?.data;
        if (isFaultVideoUrl(mediaUrl || file.name)) {
            const videoUrl = mediaUrl || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
            if (videoUrl) window.open(videoUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    };

    useEffect(() => {
        if (modalType) {
            setOpen(true);
        }
    }, [modalType]);

    useEffect(() => {
        if (isSuccess) {
            form.resetFields();
            setFileList([]);
            setFiles([]);
            setOpen(false);
        }
    }, [isSuccess, form])

    const handleChangeFile = async ({ fileList: nextList }: any) => {
        setFileList(nextList);
        setChanged(true)
    };

    const handleUpdaloadImage = async (options: any) => {
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

    useEffect(() => {
        if (data) {
            form.setFieldsValue({ ...data })
        }
    }, [data, form])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const handleClose = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setOpen(false);
        setChanged(false);
        dispatch(actions.closeModal());
    };

    const onFinishSave = async (closeable: boolean = true) => {
        const values = await form.validateFields();
        const tmp: any = { ...values }
        tmp.reportFaultId = data.reportFaultId;
        tmp.attachFiles = JSON.stringify(files)
        if (!data?.id) {
            dispatch(actions.saveInto(tmp, modalType, closeable))
        } else {
            dispatch(actions.saveInto({ ...tmp, id: data?.id }, modalType, closeable));
        }
        setChanged(false)
    }

    const modalFooter = (
        <ActionHeaderModalWrap>
            <ActionBtn
                type="primary"
                htmlType="button"
                icon={<SaveOutlined />}
                onClick={() => onFinishSave(false)}
                disabled={!changed}
                loading={loadingAction}
            >
                {intl.formatMessage({ id: 'button.Save' })}
            </ActionBtn>
            <Button
                className="ant-btn ant-btn-secondary"
                htmlType="button"
                icon={<CloseCircleOutlined />}
                onClick={handleClose}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </Button>
        </ActionHeaderModalWrap>
    );

    return (
        <Modal
            visible={open}
            open={open}
            onCancel={handleClose}
            title={title}
            closable={false}
            width={900}
            footer={modalFooter}
            destroyOnClose
            maskClosable
            keyboard
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    onFieldsChange={() => setChanged(true)}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }}
                    layout="vertical"
                >
                    <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="padding-media-max-576">
                            <Fieldset>
                                <TextArea
                                    className="break-line"
                                    name="message"
                                    label="Message"
                                    isRequired={false}
                                    Max={300}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <Fieldset>
                                    <Label>Media files</Label>
                                    <Upload
                                        fileList={fileList}
                                        multiple={true}
                                        accept="image/jpeg,image/gif,image/png,application/pdf,image/x-eps,video/*"
                                        listType="text"
                                        onPreview={handlePreview}
                                        onRemove={(value) => {
                                            const nFiles = [...files].filter((c) => c !== value.url);
                                            setFiles(nFiles)
                                            setChanged(true)
                                        }}
                                        customRequest={handleUpdaloadImage}
                                        onChange={handleChangeFile}
                                    >
                                        <button style={{ border: 0, background: 'none' }} type="button">
                                            <PlusOutlined />
                                            <div style={{ marginTop: 8 }}>Upload</div>
                                        </button>
                                    </Upload>
                                    {previewImage ? (
                                        <Image
                                            wrapperStyle={{ display: 'none' }}
                                            preview={{
                                                visible: previewOpen,
                                                onVisibleChange: (visible) => setPreviewOpen(visible),
                                            }}
                                            src={previewImage}
                                        />
                                    ) : null}
                                </Fieldset>
                            </Fieldset>
                        </Col>
                    </Row>
                </Form>
            </BodyModalWrap>
            <FooterModalWrap style={{ borderTop: '1px solid rgb(240, 240, 240)' }}>
                <Row justify="start" align="bottom">
                    <Col md={12} sm={12} xs={24} style={{ display: 'flex', alignItems: 'center' }}>
                        {data?.id ? (
                            <div>
                                <p style={{ fontSize: 12 }}>
                                    {data?.createdUser &&
                                        sprintf(intl.formatMessage({ id: 'modal.createdInformation' }), {
                                            name: data?.createdUser?.fullName,
                                            datetime: moment(data?.createdAt).utcOffset(600).format(dateTimeFormat),
                                        })}
                                </p>
                            </div>
                        ) : null}
                    </Col>
                </Row>
            </FooterModalWrap>
        </Modal>
    )
}

export default ReportFaultAnswerModal
