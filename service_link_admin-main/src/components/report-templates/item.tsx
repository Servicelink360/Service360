import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { ActionBtn, ActionHeaderModalWrap, Fieldset } from '@app/components/common/Common.styles'
import FormSelect from '@app/components/common/FormItem/Select'
import InputForm from '@app/components/common/FormItem/Input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import { Col, Form, Input, InputNumber, Drawer, Row, Select, Switch } from 'antd'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { reportTemplateTypes } from '../../constants/statusUser'

const { TextArea } = Input

const OPTION_TYPES = ['SELECT', 'CHECKLIST']
const NUMERIC_TYPES = ['NUMBER', 'PERCENTAGE', 'CURRENCY']
const PLACEHOLDER_TYPES = ['TEXT', 'TEXTAREA', 'RICH_TEXT']
const DEFAULT_VALUE_TYPES = ['TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'PERCENTAGE', 'CURRENCY', 'DATE', 'TIME', 'SELECT', 'CHECKLIST']
const STAFF_VISIBILITY_TYPES = ['DATE', 'TIME', '[REPORT_DATE]', '[REPORT_TIME]']
const YES_NO_PRESET_OPTIONS = [
    { id: '', name: 'None' },
    { id: 'YES', name: 'Yes' },
    { id: 'NO', name: 'No' },
]

const parseYesNoPreset = (record: any): string => {
    const raw = String(record?.value ?? record?.defaultValue ?? record?.config?.defaultValue ?? '').trim().toUpperCase()
    if (raw === 'YES' || raw === 'NO') return raw
    return ''
}

const splitByDelimiter = (value?: string) => {
    if (!value) return []
    return value.split(/[|,]/).map((entry) => entry.trim()).filter(Boolean)
}

const buildFormValuesFromData = (record: any, fallbackOrder: number) => {
    if (!record) {
        return {
            order: fallbackOrder,
            required: false,
        }
    }
    const formValues: any = {
        ...record,
        order: record.order ?? fallbackOrder,
        required: record.required ?? false,
        type: record.type ?? 'TEXT',
    }
    if (Array.isArray(record.options) && record.options.length) {
        formValues.optionsInput = record.options.join(', ')
    }
    if (record.validation) {
        if (record.validation.min !== undefined) formValues.minValue = record.validation.min
        if (record.validation.max !== undefined) formValues.maxValue = record.validation.max
    }
    if (record.config) {
        if (Array.isArray(record.config.columns)) {
            formValues.columns = record.config.columns.join(', ')
        } else if (record.config.columns) {
            formValues.columns = record.config.columns
        }
        if (record.config.allowMultipleLocations !== undefined) {
            formValues.allowMultipleLocations = record.config.allowMultipleLocations
        }
        if (typeof record.config.visibleToStaff === 'boolean') {
            formValues.visibleToStaff = record.config.visibleToStaff
        }
    }
    // Default: DATE/TIME fields are visible to staff unless explicitly hidden.
    if (STAFF_VISIBILITY_TYPES.includes(formValues.type) && typeof formValues.visibleToStaff !== 'boolean') {
        formValues.visibleToStaff = true
    }
    if (!formValues.label) {
        formValues.label = record.label ?? record.name
    }
    if (record.type === 'YES_NO') {
        formValues.yesNoPreset = parseYesNoPreset(record)
    }
    return formValues
}

const normalizeItemValues = (values: any, fallbackOrder: number) => {
    const options = values.optionsInput ? splitByDelimiter(values.optionsInput) : []
    const validation: Record<string, number> = {}
    if (values.minValue !== undefined && values.minValue !== null && values.minValue !== '') {
        validation.min = Number(values.minValue)
    }
    if (values.maxValue !== undefined && values.maxValue !== null && values.maxValue !== '') {
        validation.max = Number(values.maxValue)
    }
    const config: Record<string, any> = {}
    if (values.type === 'GPS' && typeof values.allowMultipleLocations === 'boolean') {
        config.allowMultipleLocations = values.allowMultipleLocations
    }
    if (values.type === 'TABLE' && values.columns) {
        config.columns = values.columns.split(',').map((column: string) => column.trim()).filter(Boolean)
    }
    if (STAFF_VISIBILITY_TYPES.includes(values.type)) {
        // Persist visibility flag; default true (visible).
        config.visibleToStaff = typeof values.visibleToStaff === 'boolean' ? values.visibleToStaff : true
    }
    const normalized: any = {
        name: values.name,
        label: values.label || values.name,
        type: values.type,
        order: values.order ?? fallbackOrder,
        required: values.required ?? false,
        placeholder: values.placeholder,
        defaultValue: values.defaultValue,
        value: values.value ?? '',
    }
    if (DEFAULT_VALUE_TYPES.includes(values.type) && values.defaultValue !== undefined && values.defaultValue !== null && values.defaultValue !== '') {
        normalized.defaultValue = values.defaultValue
    } else {
        delete normalized.defaultValue
    }
    if (PLACEHOLDER_TYPES.includes(values.type)) {
        if (!values.placeholder) {
            delete normalized.placeholder
        }
    } else {
        delete normalized.placeholder
    }
    if (OPTION_TYPES.includes(values.type) && options.length) {
        normalized.options = options
        if (!normalized.value) {
            normalized.value = options.join('|')
        }
    } else {
        delete normalized.options
    }
    if (Object.keys(validation).length) {
        normalized.validation = validation
    }
    if (Object.keys(config).length) {
        normalized.config = config
    }
    if (values.type === 'YES_NO') {
        const preset = String(values.yesNoPreset || '').trim().toUpperCase()
        if (preset === 'YES' || preset === 'NO') {
            normalized.value = preset
            normalized.defaultValue = preset
        } else {
            normalized.value = ''
            delete normalized.defaultValue
        }
    } else if (!normalized.value) {
        normalized.value = ''
    }
    return normalized
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

type ItemModalProps = {
    loadingAction: boolean
    setShowModal: (value: boolean) => void
    setChanged: (value: boolean) => void
    data?: any
    title: string
    setItems: React.Dispatch<React.SetStateAction<any[]>>
    items: any[]
}

const ItemModal: React.FC<ItemModalProps> = ({ loadingAction, setShowModal, setChanged, data, title, setItems, items }) => {
    const intl = useIntl()
    const [form] = Form.useForm()
    const computeModalWidth = useCallback(() => {
        if (typeof window === 'undefined') {
            return 600
        }
        const viewportWidth = Math.max(window.innerWidth, 520)
        const legacyModalWidth = Math.floor(viewportWidth * 0.6)
        return Math.max(480, Math.min(legacyModalWidth, 760))
    }, [])
    const [modalWidth, setModalWidth] = useState(() => computeModalWidth())

    const fallbackOrder = useMemo(() => {
        if (typeof data?.order === 'number') {
            return data.order
        }
        return items.length + 1
    }, [data, items.length])

    useEffect(() => {
        form.resetFields()
        form.setFieldsValue(buildFormValuesFromData(data, fallbackOrder))
    }, [data, fallbackOrder, form])

    useEffect(() => {
        setModalWidth(computeModalWidth())
        if (typeof window === 'undefined') {
            return
        }
        const handleResize = () => {
            setModalWidth(computeModalWidth())
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [computeModalWidth])

    const currentType = Form.useWatch('type', form) || data?.type || 'TEXT'

    const showPlaceholderField = PLACEHOLDER_TYPES.includes(currentType)
    const showDefaultValueField = DEFAULT_VALUE_TYPES.includes(currentType)
    const showOptionsField = OPTION_TYPES.includes(currentType)
    const showNumericFields = NUMERIC_TYPES.includes(currentType)
    const showTableConfigField = currentType === 'TABLE'
    const showGpsConfigField = currentType === 'GPS'
    const showYesNoPresetField = currentType === 'YES_NO'
    const showStaffVisibilityField = STAFF_VISIBILITY_TYPES.includes(currentType)
    const optionPlaceholder = currentType === 'CHECKLIST'
        ? 'Item A | Item B | Item C'
        : 'Option A | Option B | Option C'

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const closeModal = () => {
        setShowModal(false)
    }

    const persistItem = async () => {
        try {
            const values = await form.validateFields()
            const normalized = normalizeItemValues({ ...data, ...values }, fallbackOrder)
            const identifier = data?.id || data?.tempId || data?.d

            if (data?.id) normalized.id = data.id
            if (data?.tempId) normalized.tempId = data.tempId
            if (data?.d) normalized.d = data.d

            setItems((prev) => {
                if (identifier) {
                    return prev.map((item) => {
                        const itemIdentifier = item.id || item.tempId || item.d
                        if (itemIdentifier === identifier) {
                            return { ...item, ...normalized }
                        }
                        return item
                    })
                }
                const generatedId = generateTempId()
                return [...prev, { ...normalized, tempId: generatedId, d: generatedId }]
            })

            setChanged(true)
            closeModal()
        } catch (error) {
            // validation errors handled by antd form
        }
    }

    const ActionBTN = () => (
        <ActionHeaderModalWrap>
            <ActionBtn
                type="primary"
                icon={<SaveOutlined />}
                onClick={persistItem}
                loading={loadingAction}
            >
                {intl.formatMessage({ id: 'button.Save' })}
            </ActionBtn>
            <ActionBtn
                type="secondary"
                icon={<CloseCircleOutlined />}
                onClick={closeModal}
            >
                {intl.formatMessage({ id: 'button.Close' })}
            </ActionBtn>
        </ActionHeaderModalWrap>
    )

    return (
        <Drawer
            open
            placement="right"
            title={title}
            onClose={closeModal}
            width={modalWidth}
            destroyOnClose
            maskClosable={false}
            footer={<ActionBTN />}
        >
            <BodyModalWrap>
                <Form
                    form={form}
                    validateMessages={validateMessages}
                    style={{ width: '100%' }}
                    layout="vertical"
                >
                    <Row gutter={12}>
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
                        <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <InputForm
                                    className="break-line"
                                    name="label"
                                    label={'Label'}
                                    isRequired={false}
                                    Max={200}
                                />
                            </Fieldset>
                        </Col>
                    </Row>
                    <Row gutter={12} align="bottom">
                        <Col xs={24} sm={showYesNoPresetField ? 14 : 12} md={showYesNoPresetField ? 14 : 12} className="r-padding-media-max-576">
                            <Fieldset>
                                <FormSelect
                                    name='type'
                                    allowClear={false}
                                    label={'Type'}
                                    options={reportTemplateTypes}
                                    className="break-line"
                                    optionValue={'id'}
                                    optionLabel={'name'}
                                    isRequired={true}
                                />
                            </Fieldset>
                        </Col>
                        {showYesNoPresetField ? (
                            <Col xs={24} sm={10} md={10} className="r-padding-media-max-576" style={{ maxWidth: 200 }}>
                                <Fieldset>
                                    <Form.Item name="yesNoPreset" label="Default" className="break-line">
                                        <Select
                                            allowClear
                                            style={{ width: 120 }}
                                            dropdownMatchSelectWidth={false}
                                            options={YES_NO_PRESET_OPTIONS.map((o) => ({
                                                value: o.id,
                                                label: o.name,
                                            }))}
                                        />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        ) : (
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item
                                        name="order"
                                        label="Order"
                                        className="break-line"
                                        rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.Required' }) }]}
                                    >
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        )}
                    </Row>
                    <Row gutter={12}>
                        {showYesNoPresetField ? (
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item
                                        name="order"
                                        label="Order"
                                        className="break-line"
                                        rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.Required' }) }]}
                                    >
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        ) : null}
                        <Col md={showYesNoPresetField ? 12 : showPlaceholderField ? 12 : 24} sm={12} xs={24} className="r-padding-media-max-576">
                            <Fieldset>
                                <Form.Item name="required" label="Required" valuePropName="checked" className="break-line">
                                    <Switch />
                                </Form.Item>
                            </Fieldset>
                        </Col>
                        {showStaffVisibilityField && (
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item
                                        name="visibleToStaff"
                                        label="Visible to staff"
                                        tooltip="If off, staff won't see this field in New Report. The system fills it automatically on submit."
                                        valuePropName="checked"
                                        className="break-line"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        )}
                        {showPlaceholderField && (
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <InputForm
                                        className="break-line"
                                        name="placeholder"
                                        label={'Placeholder'}
                                        isRequired={false}
                                        Max={200}
                                    />
                                </Fieldset>
                            </Col>
                        )}
                    </Row>
                    {showDefaultValueField ? (
                        <Row gutter={12}>
                            <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <InputForm
                                        className="break-line"
                                        name="defaultValue"
                                        label={'Default Value'}
                                        isRequired={false}
                                        Max={200}
                                    />
                                </Fieldset>
                            </Col>
                        </Row>
                    ) : null}
                    {showOptionsField && (
                        <Row>
                            <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item
                                        name="optionsInput"
                                        label={currentType === 'CHECKLIST' ? 'Checklist Items' : 'Options'}
                                        rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.Required' }) }]}
                                    >
                                        <TextArea rows={3} placeholder={optionPlaceholder} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        </Row>
                    )}
                    {showNumericFields && (
                        <Row gutter={12}>
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item name="minValue" label={'Min Value'} className="break-line">
                                        <InputNumber style={{ width: '100%' }} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                            <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item name="maxValue" label={'Max Value'} className="break-line">
                                        <InputNumber style={{ width: '100%' }} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        </Row>
                    )}
                    {showTableConfigField && (
                        <Row>
                            <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item name="columns" label={'Table Columns'}>
                                        <TextArea rows={3} placeholder={'Column A, Column B, Column C'} />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        </Row>
                    )}
                    {showGpsConfigField && (
                        <Row>
                            <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                <Fieldset>
                                    <Form.Item name="allowMultipleLocations" label={'Allow Multiple Locations'} valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </Fieldset>
                            </Col>
                        </Row>
                    )}
                </Form>
            </BodyModalWrap>
        </Drawer>
    )
}

export default ItemModal