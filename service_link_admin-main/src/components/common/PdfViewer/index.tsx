import React, { useState } from "react";
import { Modal, Button, Popconfirm } from "antd";
import { ZoomInOutlined, ZoomOutOutlined, DeleteOutlined, } from '@ant-design/icons';

import { useIntl } from 'react-intl';
import PDF from "@mikecousins/react-pdf";


const PdfViewer = (props: any) => {
    const intl = useIntl();
    const pdf = props.pdf;
    const onCancel = props.onCancel;
    const visible = props.visible;
    const hidden = props?.hidden || false;
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [scale, setScale] = useState(1);

    const onDocumentComplete = (obj: any) => {
        setPages(obj._pdfInfo.numPages);
    }

    const onDocumentError = () => {
        console.error('pdf viewer error:');
    }

    const onSetScale = (type: any) => {

        var newScale = type ? scale + 0.1 : scale - 0.1;

        if (newScale > 2) {
            newScale = 2
        } else if (newScale < 0.1) {
            newScale = 0.1
        }

        setScale(newScale)

    }

    const onPage = (type: any) => {
        var newPage = type ? page + 1 : page - 1
        if (newPage > pages) {
            newPage = 1
        } else if (newPage < 1) {
            newPage = pages
        }
        setPage(newPage)
    }

    const zoomStyle = {
        marginLeft: 10,
        cursor: 'pointer'
    }

    const footer = <div className="footer-pdf-attachment" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => onPage(0)}>{intl.formatMessage({ id: "button.Previous" })}</Button>
        <div>
            <span style={{ textAlign: 'center' }}>Page {page} of {pages}</span>
            <ZoomOutOutlined style={{ ...zoomStyle, opacity: scale === 0.1 ? 0.5 : 1 }} onClick={() => onSetScale(0)} />
            <ZoomInOutlined style={{ ...zoomStyle, opacity: scale === 2 ? 0.5 : 1 }} onClick={() => onSetScale(1)} />
            <span>{Math.round(scale * 100)}%</span>
        </div>
        <Button onClick={() => onPage(1)}>{intl.formatMessage({ id: "button.Next" })}</Button>
    </div>

    const header = <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 60, paddingTop: 5 }}>{props.allowRemove ? <Popconfirm
        title={intl.formatMessage({ id: "message.confirmDeleteAttachment" })}
        okText={intl.formatMessage({ id: "button.Yes" })}
        cancelText={intl.formatMessage({ id: "button.No" })}
        placement="topRight"
        onConfirm={() => {
            props.onRemove(props.file);
        }
        }
    >
        <button className='trash-attachment pdf'><DeleteOutlined style={{ fontSize: 15, color: "#FF4D4F" }} /></button>
    </Popconfirm> : null}</div>

    return (<Modal maskClosable={false}
        onCancel={onCancel}
        visible={visible}
        title={hidden ? "" : header}
        width={'900px'}
        centered
        bodyStyle={{ height: '100%', overflowY: 'auto' }}
        footer={footer}
    >
        <div className="pdfWrapper" style={{textAlign:
        'center'}}>
            <PDF
                file={pdf}
                onDocumentLoadSuccess={onDocumentComplete}
                onDocumentLoadFail={onDocumentError}
                page={page}
                scale={scale}
            />
        </div>
    </Modal>)

};
export default PdfViewer;