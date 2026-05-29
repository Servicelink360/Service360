import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { Modal, Tabs, List, Tag, Button, Space, Typography } from 'antd'
import moment from 'moment'
import React, { useMemo } from 'react'
import { reportTemplateTypes } from '../../constants/statusUser'

type ReportPreviewProps = {
    visible: boolean
    data: any
    onClose: () => void
}

const { Paragraph, Text } = Typography
const { TabPane } = Tabs

const buildTypeLookup = () => {
    return reportTemplateTypes.reduce((acc, item) => {
        acc[item.id] = item.name
        return acc
    }, {} as Record<string, string>)
}

const getSampleValue = (item: any) => {
    const type = item?.type
    const options = Array.isArray(item?.options) ? item.options : []
    switch (type) {
        case 'TEXT':
        case 'TEXTAREA':
        case 'RICH_TEXT':
            return 'Lorem ipsum dolor sit amet'
        case 'NUMBER':
            return `${Math.floor(Math.random() * 500) + 1}`
        case 'PERCENTAGE':
            return `${Math.floor(Math.random() * 100)}%`
        case 'CURRENCY':
            return `$${(Math.random() * 1000).toFixed(2)}`
        case 'DATE':
        case '[REPORT_DATE]':
            return moment().format('YYYY-MM-DD')
        case 'TIME':
        case '[REPORT_TIME]':
            return moment().format('HH:mm:ss')
        case 'YES_NO':
            return Math.random() > 0.5 ? 'Yes' : 'No'
        case 'SELECT':
            return options[0] || 'Option 1'
        case 'CHECKLIST':
            return options.length ? options.join(', ') : 'Item A, Item B'
        case 'TABLE':
            return 'Table preview (columns auto-generated)'
        case 'SIGNATURE':
            return 'Signed by John Doe'
        case 'GPS':
            return '-33.8688, 151.2093'
        case 'IMAGES':
            return 'Image attachment placeholder'
        case 'VIDEOS':
            return 'Video attachment placeholder'
        case '[SITE_NAME]':
            return 'Sample Site'
        case '[SITE_ADDRESS]':
            return '123 Example Street'
        case '[CUSTOMER_NAME]':
            return 'Acme Corp.'
        case '[REPORT_BY]':
            return 'Automation Bot'
        default:
            return item?.defaultValue || ''
    }
}

const normalizePreviewItems = (rawItems?: any[]) => {
    if (!Array.isArray(rawItems)) {
        return []
    }
    return rawItems.map((item) => {
        const config = item?.config || {}
        const resolvedOptions = Array.isArray(item?.options) && item.options.length
            ? item.options
            : (Array.isArray(config.options) ? config.options : [])
        const resolvedRequired = typeof item?.required === 'boolean'
            ? item.required
            : (typeof config.required === 'boolean' ? config.required : false)
        return {
            ...item,
            label: config.label ?? item.label ?? item.name,
            required: resolvedRequired,
            options: resolvedOptions,
            placeholder: config.placeholder ?? item.placeholder,
            defaultValue: config.defaultValue ?? item.defaultValue,
        }
    })
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ visible, data, onClose }) => {
    const typeLookup = useMemo(() => buildTypeLookup(), [])
    const items = useMemo(() => {
        // Use backend array order, do not sort
        return normalizePreviewItems(data?.items)
    }, [data])

    const renderedTitle = data?.name || 'Report Preview'

    const downloadTemplate = () => {
        if (data?.fileUrl) {
            window.open(data.fileUrl, '_blank')
        }
    }

    const designView = (
        <List
            dataSource={items}
            renderItem={(item: any) => (
                <List.Item>
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong>{item.label || item.name}</strong>
                            <Space>
                                <Tag>{typeLookup[item.type] || item.type}</Tag>
                                {item.required ? <Tag color="volcano">Required</Tag> : <Tag color="green">Optional</Tag>}
                            </Space>
                        </div>
                        {Array.isArray(item.options) && item.options.length ? (
                            <Paragraph style={{ marginBottom: 0 }}>
                                <Text strong>Options:</Text> {item.options.join(', ')}
                            </Paragraph>
                        ) : null}
                        {item.placeholder ? (
                            <Paragraph style={{ marginBottom: 0 }}>
                                <Text strong>Placeholder:</Text> {item.placeholder}
                            </Paragraph>
                        ) : null}
                    </div>
                </List.Item>
            )}
        />
    )

    const previewView = (
        <List
            dataSource={items}
            renderItem={(item: any) => (
                <List.Item>
                    <div style={{ width: '100%' }}>
                        <Text strong>{item.label || item.name}</Text>
                        <Paragraph style={{ marginBottom: 0 }}>{getSampleValue(item)}</Paragraph>
                    </div>
                </List.Item>
            )}
        />
    )

    return (
        <Modal
            visible={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            title={renderedTitle}
        >
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                    Print Preview
                </Button>
                <Button icon={<DownloadOutlined />} onClick={downloadTemplate} disabled={!data?.fileUrl}>
                    Download Template
                </Button>
            </Space>
            <Tabs defaultActiveKey="design">
                <TabPane tab="Design View" key="design">
                    {designView}
                </TabPane>
                <TabPane tab="Preview Data" key="preview">
                    {previewView}
                </TabPane>
            </Tabs>
        </Modal>
    )
}

export default ReportPreview
