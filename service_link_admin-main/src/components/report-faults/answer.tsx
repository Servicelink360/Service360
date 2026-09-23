import { CloseCircleOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons'
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
import { FaultUploadProgressModal, useFaultUploadProgress } from './fault-upload-progress'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { callAPIUploadAsync } from '../../library/helpers/api'
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

    const enrichUploadFilesSync = (nextList: any[]) => {
        return (nextList || []).map((f: any) => {
            const serverUrl =
                f.url ||
                (typeof f.response === "string" ? f.response : undefined) ||
                f.response?.data;
            let thumb = f.thumbUrl || f.preview || serverUrl;
            if (!thumb && f.originFileObj) {
                try {
                    thumb = URL.createObjectURL(f.originFileObj);
                } catch {
                    /* ignore */
                }
            }
            return {
                ...f,
                url: serverUrl || f.url,
                thumbUrl: thumb,
                preview: thumb || f.preview,
            };
        });
    };

    const handleChangeFile = ({ fileList: nextList }: any) => {
        setFileList(enrichUploadFilesSync(nextList));
        setChanged(true);
    };

    const uploadProgress = useFaultUploadProgress();

    const handleUpdaloadImage = async (options: any) => {
        const { onSuccess, onError, onProgress, file } = options;
        const raw = file.originFileObj ?? file;
        const jobId = String(file?.uid || `${raw?.name || "upload"}-${Date.now()}`);
        uploadProgress.begin(jobId);
        try {
            const formData = new FormData();
            formData.append("file", raw, raw.name || "upload");
            const response: any = await callAPIUploadAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                "POST",
                formData,
                {
                    uploadFileSize: raw.size || 0,
                    onUploadProgress: (pct: number) => {
                        const percent = Math.min(100, Math.round(pct));
                        uploadProgress.update(jobId, percent);
                        onProgress?.({ percent });
                    },
                },
            );
            if (response?.code === 1 && response?.data) {
                const url = String(response.data);
                setFiles((prev) => [...prev, url]);
                setChanged(true);
                onSuccess?.(url, raw);
            } else {
                onError?.(new Error(response?.message || "Upload failed"));
            }
        } catch (error: any) {
            onError?.(error);
        } finally {
            uploadProgress.end(jobId);
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
        <ActionHeaderModalWrap style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button
                className="ant-btn ant-btn-secondary"
                htmlType="button"
                icon={<CloseCircleOutlined />}
                onClick={handleClose}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </Button>
            <ActionBtn
                type="primary"
                htmlType="button"
                onClick={() => onFinishSave(false)}
                disabled={!changed}
                loading={loadingAction}
            >
                Submit
            </ActionBtn>
        </ActionHeaderModalWrap>
    );

    return (
        <>
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
            style={uploadProgress.ui.open ? { visibility: "hidden" } : undefined}
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
                                    <div className="report-fault-media-tile-wrap">
                                        <div
                                            className="report-fault-media-grid"
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                alignItems: "flex-start",
                                                gap: 8,
                                                width: "100%",
                                            }}
                                        >
                                            {fileList.map((file: any) => {
                                                const src =
                                                    file.thumbUrl ||
                                                    file.url ||
                                                    file.preview ||
                                                    file.response?.data ||
                                                    (typeof file.response === "string" ? file.response : undefined);
                                                return (
                                                    <div
                                                        key={file.uid}
                                                        className="report-fault-media-thumb"
                                                        style={{
                                                            position: "relative",
                                                            width: 104,
                                                            height: 104,
                                                            flex: "0 0 104px",
                                                            borderRadius: 8,
                                                            overflow: "hidden",
                                                            background: "#1a1a1a",
                                                            border: "1px solid #404040",
                                                        }}
                                                    >
                                                        {src ? (
                                                            <img
                                                                src={src}
                                                                alt=""
                                                                className="report-fault-media-thumb__img"
                                                                style={{
                                                                    display: "block",
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => handlePreview(file)}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="report-fault-media-thumb__fallback"
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    padding: 6,
                                                                    color: "#d9d9d9",
                                                                    fontSize: 11,
                                                                    textAlign: "center",
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                {file.name || "File"}
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="report-fault-media-thumb__x"
                                                            aria-label="Remove photo"
                                                            style={{
                                                                position: "absolute",
                                                                top: 4,
                                                                right: 4,
                                                                zIndex: 10,
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                width: 24,
                                                                height: 24,
                                                                margin: 0,
                                                                padding: 0,
                                                                border: "none",
                                                                borderRadius: "50%",
                                                                background: "rgba(0,0,0,0.78)",
                                                                color: "#fff",
                                                                fontSize: 11,
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const removedUrl =
                                                                    file?.url ||
                                                                    file?.response?.data ||
                                                                    (typeof file?.response === "string"
                                                                        ? file.response
                                                                        : undefined) ||
                                                                    file?.uid;
                                                                setFiles((prev) =>
                                                                    prev.filter(
                                                                        (c) => c !== removedUrl && c !== file?.uid,
                                                                    ),
                                                                );
                                                                setFileList((prev: any[]) =>
                                                                    prev.filter((f) => f.uid !== file.uid),
                                                                );
                                                                setChanged(true);
                                                            }}
                                                        >
                                                            <CloseOutlined />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <Upload
                                                className="report-fault-media-tile"
                                                fileList={fileList}
                                                multiple={true}
                                                accept="image/jpeg,image/gif,image/png,application/pdf,image/x-eps,video/*"
                                                showUploadList={false}
                                                customRequest={handleUpdaloadImage}
                                                onChange={handleChangeFile}
                                                style={{ width: 104, height: 104 }}
                                            >
                                                <div
                                                    className="report-fault-media-tile__btn"
                                                    role="button"
                                                    aria-label="Upload"
                                                    style={{
                                                        width: 104,
                                                        height: 104,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        background: "#f5f5f5",
                                                        border: "1px solid #d9d9d9",
                                                        borderRadius: 2,
                                                        cursor: "pointer",
                                                        boxSizing: "border-box",
                                                    }}
                                                >
                                                    <PlusOutlined style={{ fontSize: 22, color: "#52c41a" }} />
                                                </div>
                                            </Upload>
                                        </div>
                                    </div>
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
        <FaultUploadProgressModal
            open={uploadProgress.ui.open}
            percent={uploadProgress.ui.percent}
            current={uploadProgress.ui.current}
            total={uploadProgress.ui.total}
        />
    </>
    )
}

export default ReportFaultAnswerModal
