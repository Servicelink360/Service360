import { CloseCircleOutlined, SaveOutlined, EditOutlined, DeleteOutlined, PlusOutlined, InboxOutlined, EyeOutlined, HolderOutlined, CopyOutlined } from '@ant-design/icons'
import {
    Fieldset,
    Label
} from '@app/components/common/Common.styles'
import InputForm from '@app/components/common/FormItem/Input'
import TextArea from '@app/components/common/FormItem/TextArea'
import Input from '@app/components/uielements/input'
import { BodyModalWrap } from '@app/components/common/modal.style'
import actions from '@app/redux/report-templates/actions'
import { Col, Form, Row, Popconfirm, Button, message, Tag, Drawer, Steps, Space, Descriptions, List, Empty, Typography, Divider, Select, Input as AntInput, Tooltip, Spin } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch } from 'react-redux'
import { ButtonMR, InformationDiv } from '../common/container.style'
import ItemModal from '@app/components/report-templates/item'
import { callAPIAsync } from '../../library/helpers/api'
import endPoint from '../../constants/endPoint'
import serviceType from '../../constants/serviceType'
import { useReportTemplateDetail } from '@app/hooks/useReportTemplateDetail'
import {
    normalizeItemsForSubmit,
    sanitizeFileUrlForSubmit,
} from '@app/lib/report-templates/templateItemUtils'
import {
    REPORT_TEMPLATE_ASSIGNED_ALL,
    assignToSelectOptions,
    formatAssignToLabel,
    isReportTemplateAssignedToAll,
} from '@app/lib/report-templates/reportTemplateAssignment'
import Dragger from 'antd/lib/upload/Dragger'
import { reportTemplateTypes, reportTemplateCategories } from '../../constants/statusUser'
import actionType from '../../constants/actionType'
import type { UploadFile } from 'antd/es/upload/interface'
import styled from 'styled-components'

const { Paragraph, Text, Title } = Typography

const ACCEPTED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
    'video/mp4',
]

const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.mp4']
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/** Template attachment upload (fileUrl) — hidden in UI; reports use template items only. */
const SHOW_TEMPLATE_FILE_UPLOAD = false

const buildFileListFromUrl = (url: string): UploadFile[] => ([{
    uid: url,
    percent: 100,
    name: url.split('/')[url.split('/').length - 1],
    status: 'done',
    url,
}])

const getExtension = (fileName?: string) => {
    if (!fileName) return ''
    const dotIndex = fileName.lastIndexOf('.')
    if (dotIndex === -1) return ''
    return fileName.substring(dotIndex).toLowerCase()
}

const validateUploadFile = (uploadFile: UploadFile) => {
    const rawFile = uploadFile.originFileObj as File | undefined
    if (!rawFile) {
        return { valid: false, message: 'Unable to read the selected file.' }
    }
    const extension = getExtension(rawFile.name)
    const hasValidType = rawFile.type ? ACCEPTED_FILE_TYPES.includes(rawFile.type) : false
    const hasValidExtension = ACCEPTED_FILE_EXTENSIONS.includes(extension)
    if (!hasValidType && !hasValidExtension) {
        return {
            valid: false,
            message: `Invalid file type. Allowed types: ${ACCEPTED_FILE_EXTENSIONS.join(', ')}`,
        }
    }
    if (rawFile.size > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            message: `File size must be under ${MAX_FILE_SIZE_MB}MB.`,
        }
    }
    return { valid: true }
}

const DEFAULT_CATEGORY = 'GENERAL'

const ItemsTable = styled.div`
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
`

const ItemsRow = styled.div<{
    $isHeader?: boolean
    $isDragging?: boolean
    $isDropTarget?: boolean
    $isReadOnly?: boolean
}>
`
    display: grid;
    grid-template-columns: 48px 1.4fr 1.4fr 0.85fr 1.05fr 1fr 140px;
    align-items: center;
    padding: 8px 12px;
    background: ${({ $isHeader }) => ($isHeader ? '#fafafa' : '#fff')};
    font-weight: ${({ $isHeader }) => ($isHeader ? 600 : 400)};
    border-bottom: 1px solid #f0f0f0;
    cursor: ${({ $isHeader, $isReadOnly }) => ($isHeader ? 'default' : ($isReadOnly ? 'default' : 'grab'))};
    opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1)};
    ${({ $isDropTarget }) => ($isDropTarget ? 'box-shadow: inset 0 0 0 2px #1890ff;' : '')}
    transition: background 0.15s ease;
    &:last-child {
        border-bottom: none;
    }
    @media (max-width: 768px) {
        grid-template-columns: 40px 1fr 1fr 0.75fr 0.9fr 0.9fr 110px;
    }
`

const ItemsCell = styled.div`
    padding: 0 8px;
    display: flex;
    align-items: center;
    min-height: 32px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const DragHandle = styled.span<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    margin-right: 8px;
    color: ${({ $disabled }) => ($disabled ? '#d9d9d9' : '#8c8c8c')};
    font-size: 16px;
`

type CategoryOption = {
    id: string
    name: string
}

type CategorySelectOption = {
    value: string
    label: string
}

const formatCategoryLabel = (value: string) => {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

const getCategoryFieldValue = (raw: unknown): string => {
    if (Array.isArray(raw)) {
        const last = raw[raw.length - 1]
        return String(last ?? '').trim()
    }
    return String(raw ?? '').trim()
}

const buildCategorySelectOptions = (options?: CategoryOption[] | null): CategorySelectOption[] => {
    const map = new Map<string, CategorySelectOption>()
    const addOption = (value?: string, label?: string) => {
        const raw = (value ?? '').trim()
        if (!raw) {
            return
        }
        const key = raw.toLowerCase()
        if (map.has(key)) {
            return
        }
        map.set(key, {
            value: raw,
            label: label?.trim() || formatCategoryLabel(raw),
        })
    }

    reportTemplateCategories.forEach((option) => addOption(option.id, option.name))
    options?.forEach((option) => addOption(option.id, option.name))

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
}

const STEP_ITEMS = [
    { title: 'Details', description: 'Template basics' },
    { title: 'Items', description: 'Fields & ordering' },
    { title: 'Preview', description: 'Review & confirm' },
]

const SAMPLE_VALUE_BY_TYPE: Record<string, string> = {
    TEXT: 'Sample text input',
    TEXTAREA: 'Longer freeform text',
    RICH_TEXT: 'Formatted content preview',
    NUMBER: '42',
    PERCENTAGE: '75%',
    CURRENCY: '$120.00',
    DATE: '2026-01-14',
    TIME: '09:30:00',
    YES_NO: 'Yes',
    SELECT: 'Option A',
    CHECKLIST: 'Item A, Item B',
    TABLE: 'Table preview',
    SIGNATURE: 'Signature placeholder',
    GPS: '-33.8688, 151.2093',
    IMAGES: 'Image attachment',
    VIDEOS: 'Video attachment',
    '[REPORT_DATE]': 'Auto: Report Date',
    '[REPORT_TIME]': 'Auto: Report Time',
    '[SITE_NAME]': 'Auto: Site Name',
    '[SITE_ADDRESS]': 'Auto: Site Address',
    '[CUSTOMER_NAME]': 'Auto: Customer Name',
    '[REPORT_BY]': 'Auto: Report Author',
}

const YES_NO_DEFAULT_TABLE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
]

const STAFF_VISIBILITY_TABLE_TYPES = new Set(['DATE', 'TIME', '[REPORT_DATE]', '[REPORT_TIME]'])

const getVisibleToStaffFlag = (item: any): boolean => {
    const v = item?.config?.visibleToStaff
    if (typeof v === 'boolean') return v
    return true
}

const normalizeKey = (value: unknown): string => {
    return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const findDuplicateTemplateKeys = (rawItems: any[]) => {
    const seen = new Map<string, number>()
    const dups: Array<{ key: string; firstIndex: number; secondIndex: number }> = []
    rawItems.forEach((it, idx) => {
        const nameKey = normalizeKey(it?.name)
        const labelKey = normalizeKey(it?.label)
        // We store/display using name/label in different places; both must be unique to avoid report item collisions.
        const keys = [nameKey, labelKey].filter(Boolean)
        keys.forEach((k) => {
            if (!k) return
            const prev = seen.get(k)
            if (prev !== undefined && prev !== idx) {
                dups.push({ key: k, firstIndex: prev, secondIndex: idx })
            } else {
                seen.set(k, idx)
            }
        })
    })
    return dups
}

const parseYesNoDefault = (item: any): string => {
    const raw = String(
        item?.defaultValue ?? item?.value ?? item?.config?.defaultValue ?? '',
    )
        .trim()
        .toUpperCase()
    if (raw === 'YES' || raw === 'NO') return raw
    return ''
}

const formatDefaultDisplay = (item: any): string => {
    if (!item) return 'None'
    if (item.type === 'YES_NO') {
        const preset = parseYesNoDefault(item)
        if (preset === 'YES') return 'Yes'
        if (preset === 'NO') return 'No'
        return 'None'
    }
    const dv = item.defaultValue
    if (dv !== undefined && dv !== null && String(dv).trim() !== '') {
        return String(dv)
    }
    return 'None'
}

const resolveSampleValue = (item: any) => {
    if (!item) return ''
    if (item.type === 'YES_NO') {
        const preset = parseYesNoDefault(item)
        if (preset === 'YES') return 'Yes'
        if (preset === 'NO') return 'No'
        return 'None'
    }
    if (item.defaultValue) return item.defaultValue
    const base = SAMPLE_VALUE_BY_TYPE[item.type]
    if (base) return base
    if (Array.isArray(item.options) && item.options.length) {
        return item.options.join(', ')
    }
    return ''
}

type StaffOption = { value: number; label: string }

type ServiceOption = { value: number; label: string }

type IProps = {
    loadingAction: boolean
    loadingDetail?: boolean
    isSuccess?: boolean
    modalType: string
    data: any
    title: string
    categoryOptions?: CategoryOption[]
    staffOptions?: StaffOption[]
    ServiceOptions?: ServiceOption[]
    onCategoryAdded?: (value: string, label?: string) => void
}

const Index = (props: IProps) => {
    const { modalType, isSuccess, loadingAction, loadingDetail = false, data, title, categoryOptions, staffOptions = [], ServiceOptions = [], onCategoryAdded } = props
    const dispatch = useDispatch()
    const intl = useIntl()
    const [changed, setChanged] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form] = Form.useForm()
    const [infoModal, setInfoModal] = useState(null)
    const [categoryChoices, setCategoryChoices] = useState<CategorySelectOption[]>(() => buildCategorySelectOptions(categoryOptions))
    const [newCategoryInput, setNewCategoryInput] = useState('')
    const [categorySelectKey, setCategorySelectKey] = useState(0)
    const [savingCategory, setSavingCategory] = useState(false)
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [activeStep, setActiveStep] = useState(0)
    const templateCategory = data?.category
    const previewName = Form.useWatch('name', form)
    const drawerTitle = useMemo(() => {
        const name = String(previewName ?? data?.name ?? '').trim()
        const nameStyle: React.CSSProperties = {
            fontSize: '0.7em',
            fontWeight: 'inherit',
        }
        if (modalType === actionType.UPDATE && name) {
            return (
                <span>
                    Edit Template:{' '}
                    <Tooltip title={name}>
                        <span style={nameStyle}>{name}</span>
                    </Tooltip>
                </span>
            )
        }
        if (modalType === actionType.VIEW && name) {
            return (
                <span>
                    View Template:{' '}
                    <Tooltip title={name}>
                        <span style={nameStyle}>{name}</span>
                    </Tooltip>
                </span>
            )
        }
        return title
    }, [modalType, previewName, data, title])
    const previewCategory = Form.useWatch('category', form)
    const previewAssignedStaffId = Form.useWatch('assignedStaffId', form)
    const previewDescription = Form.useWatch('description', form)

    // Track mounted state to avoid setState on unmounted
    const mountedRef = React.useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const ensureCategoryChoice = useCallback((value?: string, label?: string, notifyParent: boolean = false) => {
        const trimmed = (value ?? '').trim()
        if (!trimmed) {
            return { added: false, value: '', label: '' }
        }
        const resolvedLabel = label?.trim() || formatCategoryLabel(trimmed)
        let added = false
        setCategoryChoices((prev) => {
            const exists = prev.some((option) => option.value.toLowerCase() === trimmed.toLowerCase())
            if (exists) {
                return prev
            }
            added = true
            return [...prev, { value: trimmed, label: resolvedLabel }].sort((a, b) => a.label.localeCompare(b.label))
        })
        if (added && notifyParent) {
            onCategoryAdded?.(trimmed, resolvedLabel)
        }
        return { added, value: trimmed, label: resolvedLabel }
    }, [onCategoryAdded])

    const {
        items,
        setItems,
        file,
        setFile,
        fileList,
        setFileList,
        loadingDetail: loadingItems,
        resetEditor,
        templateId,
        isEdit,
    } = useReportTemplateDetail({
        modalType,
        data,
        loadingDetail,
        form,
        ensureCategoryChoice,
        formatCategoryLabel,
        buildFileListFromUrl,
    })

    const typeLookup = useMemo(() => {
        return reportTemplateTypes.reduce((acc, item) => {
            acc[item.id] = item.name
            return acc
        }, {} as Record<string, string>)
    }, [])

    const totalSteps = STEP_ITEMS.length
    const isReadOnly = modalType === actionType.VIEW
    const computeDrawerWidth = useCallback(() => {
        const baseWidth = isReadOnly ? 620 : 760
        if (typeof window === 'undefined') {
            return baseWidth
        }
        const viewportWidth = Math.max(window.innerWidth, 520)
        const legacyModalWidth = Math.floor(viewportWidth * 0.6)
        const availableWidth = Math.max(viewportWidth - 96, 480)
        return Math.max(480, Math.min(baseWidth, legacyModalWidth, availableWidth))
    }, [isReadOnly])
    const [drawerWidth, setDrawerWidth] = useState(() => computeDrawerWidth())
    const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
        setItems((prev) => {
            if (fromIndex === toIndex) {
                return prev
            }
            const updated = [...prev]
            const [moved] = updated.splice(fromIndex, 1)
            updated.splice(toIndex, 0, moved)
            return updated.map((item, index) => ({ ...item, order: index + 1 }))
        })
        setChanged(true)
    }, [setItems])
    const handleDragStartRow = useCallback((event: React.DragEvent<HTMLDivElement>, index: number) => {
        if (isReadOnly) {
            return
        }
        setDraggingIndex(index)
        setDragOverIndex(index)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
    }, [isReadOnly])

    const handleDragEnterRow = useCallback((event: React.DragEvent<HTMLDivElement>, index: number) => {
        if (isReadOnly) {
            return
        }
        event.preventDefault()
        if (dragOverIndex !== index) {
            setDragOverIndex(index)
        }
    }, [dragOverIndex, isReadOnly])

    const handleDragOverRow = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (isReadOnly) {
            return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [isReadOnly])

    const handleDropRow = useCallback((event: React.DragEvent<HTMLDivElement>, index: number) => {
        if (isReadOnly) {
            return
        }
        event.preventDefault()
        const payload = event.dataTransfer.getData('text/plain')
        const fromIndex = payload ? Number(payload) : draggingIndex
        if (typeof fromIndex === 'number' && !Number.isNaN(fromIndex) && fromIndex !== index) {
            reorderItems(fromIndex, index)
        }
        setDraggingIndex(null)
        setDragOverIndex(null)
    }, [draggingIndex, isReadOnly, reorderItems])

    const handleDragEndRow = useCallback(() => {
        setDraggingIndex(null)
        setDragOverIndex(null)
    }, [])

    const resolveCategoryLabel = useCallback((value?: string) => {
        if (!value) {
            return formatCategoryLabel(DEFAULT_CATEGORY)
        }
        const exact = categoryChoices.find((option) => option.value === value)
        if (exact) {
            return exact.label
        }
        const match = categoryChoices.find((option) => option.value.toLowerCase() === value.toLowerCase())
        return match?.label || formatCategoryLabel(value)
    }, [categoryChoices])

    useEffect(() => {
        if (isSuccess && modalType === actionType.ADD) {
            resetEditor()
        }
    }, [isSuccess, resetEditor, modalType])

    useEffect(() => {
        if (modalType) {
            setActiveStep(0)
        }
    }, [modalType, templateId])

    useEffect(() => {
        if (categoryOptions && categoryOptions.length) {
            setCategoryChoices((prev) => {
                const map = new Map(prev.map((option) => [option.value.toLowerCase(), option]))
                categoryOptions.forEach((option) => {
                    const value = (option?.id ?? '').trim()
                    if (!value) {
                        return
                    }
                    const key = value.toLowerCase()
                    if (!map.has(key)) {
                        map.set(key, { value, label: option?.name ?? formatCategoryLabel(value) })
                    } else {
                        const current = map.get(key)
                        if (current && option?.name && current.label !== option.name) {
                            map.set(key, { value: current.value, label: option.name })
                        }
                    }
                })
                return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
            })
        }
    }, [categoryOptions])

    useEffect(() => {
        if (templateCategory) {
            ensureCategoryChoice(templateCategory, templateCategory)
        }
    }, [templateCategory, ensureCategoryChoice])

    useEffect(() => {
        setDrawerWidth(computeDrawerWidth())
        if (typeof window === 'undefined') {
            return
        }
        const handleResize = () => {
            setDrawerWidth(computeDrawerWidth())
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [computeDrawerWidth])

    const validateMessages = {
        required: intl.formatMessage({ id: 'form.error.Required' }),
        whitespace: intl.formatMessage({ id: 'form.error.Whitespace' }),
    }

    const restorePreviousFileList = () => {
        if (file) {
            setFileList(buildFileListFromUrl(file))
        } else {
            setFileList([])
        }
    }

    const applyCategoryToForm = useCallback((value: string, label?: string) => {
        const trimmed = (value ?? '').trim()
        if (!trimmed) {
            return
        }
        const displayLabel = label?.trim() || formatCategoryLabel(trimmed)
        setCategoryChoices((prev) => {
            if (prev.some((option) => option.value.toLowerCase() === trimmed.toLowerCase())) {
                return prev
            }
            return [...prev, { value: trimmed, label: displayLabel }].sort((a, b) => a.label.localeCompare(b.label))
        })
        form.setFieldsValue({ category: trimmed })
        setCategorySelectKey((key) => key + 1)
        setChanged(true)
    }, [form])

    const staffLabelById = useMemo(
        () =>
            staffOptions.reduce((acc, s) => {
                acc[+s.value] = s.label;
                return acc;
            }, {} as Record<number, string>),
        [staffOptions],
    )

    const assignToOptions = useMemo(
        () => assignToSelectOptions(staffOptions),
        [staffOptions],
    )

    const resolveAssignedStaffLabel = useCallback(
        (staffId?: number | null) => {
            if (staffId == null) {
                return 'None (no staff)';
            }
            return formatAssignToLabel(staffId, staffLabelById);
        },
        [staffLabelById],
    )

    const buildSavePayload = () => {
        const { name, description, category, assignedStaffId, serviceIds } = form.getFieldsValue([
            'name',
            'description',
            'category',
            'assignedStaffId',
            'serviceIds',
        ])
        const trimmedCategory = getCategoryFieldValue(category)
        const normalizedItems = normalizeItemsForSubmit(items)
        let assigned: number | null = null
        if (
            assignedStaffId != null &&
            assignedStaffId !== '' &&
            !Number.isNaN(+assignedStaffId)
        ) {
            const n = +assignedStaffId
            assigned = isReportTemplateAssignedToAll(n)
                ? REPORT_TEMPLATE_ASSIGNED_ALL
                : n > 0
                  ? n
                  : null
        }
        const deptIds = Array.isArray(serviceIds)
            ? serviceIds.map((v: unknown) => +v).filter((n: number) => Number.isFinite(n) && n > 0)
            : []
        const payload: Record<string, unknown> = {
            name: String(name ?? '').trim(),
            description: description != null ? String(description) : '',
            category: trimmedCategory || DEFAULT_CATEGORY,
            fileUrl: sanitizeFileUrlForSubmit(file),
            assignedStaffId: assigned,
            serviceIds: deptIds,
        }
        if (!isEdit) {
            payload.items = normalizedItems
        } else if (normalizedItems.length > 0) {
            payload.items = normalizedItems
        }
        return payload
    }

    const onFinishSave = async (closeable: boolean = true) => {
        await form.validateFields();
        const { name, category } = form.getFieldsValue(['name', 'category'])
        const categoryValue = getCategoryFieldValue(category)
        if (!name || !categoryValue) {
            message.error('Name and category must not be empty.');
            return;
        }
        if (isEdit && !loadingItems && items.length === 0) {
            message.error('This template has no fields. Reload the page or add at least one field before saving.');
            return;
        }
        if (isEdit && loadingItems) {
            message.warning('Still loading template fields. Please wait.');
            return;
        }
        const dupKeys = findDuplicateTemplateKeys(items || [])
        if (dupKeys.length) {
            const example = dupKeys[0]
            const keyLabel = String((items?.[example.secondIndex]?.label ?? items?.[example.secondIndex]?.name) || '').trim() || example.key
            message.error(`Duplicate template field detected: "${keyLabel}". Rename one of the duplicates in Items before saving.`)
            return
        }
        const payload = buildSavePayload()
        if (!data?.id) {
            dispatch(actions.saveInto(payload, modalType, closeable))
        } else {
            dispatch(actions.saveInto({ ...payload, id: data.id }, modalType, closeable));
        }
        setChanged(false)
    }

    const handleChangeFile = async ({ fileList: newFileList }: { fileList: UploadFile[] }, index: number) => {
        if (!newFileList.length) {
            if (mountedRef.current) {
                setFileList([])
                setFile('')
                setChanged(true)
            }
            return
        }
        if (index !== -1) {
            return
        }
        const latestFile = newFileList[newFileList.length - 1]
        const validation = validateUploadFile(latestFile)
        if (!validation.valid) {
            if (validation.message) {
                message.error(validation.message)
            }
            restorePreviousFileList()
            return
        }
        if (!latestFile?.originFileObj) {
            message.error('Unable to read the selected file.')
            restorePreviousFileList()
            return
        }
        if (mountedRef.current) {
            setFileList([latestFile])
        }
        try {
            const response: any = await callAPIAsync(
                serviceType.COMMON,
                endPoint.UPLOAD_FILE,
                "POST",
                { file: latestFile.originFileObj },
                null,
                true
            )
            if (!mountedRef.current) return
            if (response?.code === 1) {
                setFile(response?.data)
                latestFile.status = 'done'
                latestFile.percent = 100
                setFileList([{ ...latestFile }])
                setChanged(true)
                return
            }
            message.error(response?.message || 'File upload failed.')
            restorePreviousFileList()
        } catch (error) {
            if (!mountedRef.current) return
            message.error('File upload failed.')
            restorePreviousFileList()
        }
    };



    const handleClose = () => {
        dispatch({ type: actions.MODAL, payload: { modalType: null, row: null } })
    }

    const handleSave = async (shouldContinue: boolean) => {
        await onFinishSave(shouldContinue)
    }

    const handlePrev = () => {
        setActiveStep((prev) => Math.max(prev - 1, 0))
    }

    const handleNext = async () => {
        if (activeStep === 0) {
            try {
                await form.validateFields(['name', 'description', 'category'])
            } catch (error) {
                return
            }
        }
        if (activeStep === 1 && !items.length) {
            message.warning('Please add at least one item before continuing.')
            return
        }
        setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1))
    }

    const handleAddCategoryOption = useCallback(async () => {
        if (isReadOnly || savingCategory) {
            return
        }
        const trimmed = newCategoryInput.trim()
        if (!trimmed) {
            message.warning('Enter a category name first.')
            return
        }
        setSavingCategory(true)
        try {
            const response: any = await callAPIAsync(
                serviceType.COMMON,
                `${endPoint.REPORT_TEMPLATES}/categories`,
                'POST',
                { name: trimmed },
            )
            if (response?.code !== 1 || !response?.data) {
                message.error(response?.message || 'Could not save category.')
                return
            }
            const savedId = String(response.data.id ?? trimmed).trim()
            const savedLabel = String(response.data.name ?? formatCategoryLabel(trimmed)).trim()
            applyCategoryToForm(savedId, savedLabel)
            onCategoryAdded?.(savedId, savedLabel)
            setNewCategoryInput('')
            message.success('Category saved.')
        } catch {
            message.error('Could not save category.')
        } finally {
            setSavingCategory(false)
        }
    }, [applyCategoryToForm, isReadOnly, newCategoryInput, onCategoryAdded, savingCategory])

    const handleDeleteItem = useCallback((record: any) => {
        if (isReadOnly) {
            return
        }
        setItems((prev) => prev.filter((item) => {
            if (record.id) {
                return item.id !== record.id
            }
            if (record.tempId) {
                return item.tempId !== record.tempId
            }
            if (record.d) {
                return item.d !== record.d
            }
            return item !== record
        }))
        setChanged(true)
    }, [isReadOnly, setItems, setChanged])

    const handleCopyItem = useCallback((record: any, index?: number) => {
        if (isReadOnly || !record) {
            return
        }
        setItems((prev) => {
            const resolveIndex = (source?: number) => {
                if (typeof source === 'number' && source >= 0 && source < prev.length) {
                    return source
                }
                return prev.findIndex((item) => {
                    if (record.id) {
                        return item.id === record.id
                    }
                    if (record.tempId) {
                        return item.tempId === record.tempId
                    }
                    if (record.d) {
                        return item.d === record.d
                    }
                    return item === record
                })
            }

            const sourceIndex = resolveIndex(index)
            if (sourceIndex === -1) {
                return prev
            }

            const sourceItem = prev[sourceIndex]
            const copySuffix = ' Copy'
            const tempId = `copy-${Date.now()}-${Math.round(Math.random() * 1000)}`
            const cloned = {
                ...sourceItem,
                id: undefined,
                tempId,
                d: undefined,
                name: sourceItem.name ? `${sourceItem.name}${copySuffix}` : sourceItem.name,
                label: sourceItem.label ? `${sourceItem.label}${copySuffix}` : sourceItem.label,
                config: sourceItem.config ? { ...sourceItem.config } : undefined,
                options: Array.isArray(sourceItem.options) ? [...sourceItem.options] : undefined,
            }

            const next = [...prev]
            next.splice(sourceIndex + 1, 0, cloned)
            return next.map((item, idx) => ({ ...item, order: idx + 1 }))
        })
        setChanged(true)
    }, [isReadOnly, setItems, setChanged])

    const handleUpdateItemDefault = useCallback(
        (index: number, nextValue: string) => {
            if (isReadOnly) return
            setItems((prev) => {
                const next = [...prev]
                const item = { ...next[index] }
                if (item.type === 'YES_NO') {
                    const preset = String(nextValue ?? '').trim().toUpperCase()
                    if (preset === 'YES' || preset === 'NO') {
                        item.value = preset
                        item.defaultValue = preset
                    } else {
                        item.value = ''
                        delete item.defaultValue
                    }
                } else if (item.type === 'SELECT') {
                    const v = String(nextValue ?? '').trim()
                    if (v) {
                        item.defaultValue = v
                    } else {
                        delete item.defaultValue
                    }
                }
                next[index] = item
                return next
            })
            setChanged(true)
        },
        [isReadOnly, setItems, setChanged],
    )

    const renderDefaultCell = (item: any, index: number) => {
        if (isReadOnly) {
            return <Text type="secondary">{formatDefaultDisplay(item)}</Text>
        }
        if (item && STAFF_VISIBILITY_TABLE_TYPES.has(String(item.type || '').trim())) {
            const visible = getVisibleToStaffFlag(item)
            return (
                <Select
                    size="small"
                    style={{ width: '100%', maxWidth: 160 }}
                    value={visible ? 'visible' : 'hidden'}
                    options={[
                        { value: 'visible', label: 'Visible' },
                        { value: 'hidden', label: 'Not visible' },
                    ]}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(val) => {
                        const nextVisible = val !== 'hidden'
                        setItems((prev) => {
                            const next = [...prev]
                            const current = { ...next[index] }
                            current.config = { ...(current.config || {}), visibleToStaff: nextVisible }
                            next[index] = current
                            return next
                        })
                        setChanged(true)
                    }}
                />
            )
        }
        if (item.type === 'YES_NO') {
            return (
                <Select
                    size="small"
                    style={{ width: '100%', maxWidth: 128 }}
                    value={parseYesNoDefault(item)}
                    options={YES_NO_DEFAULT_TABLE_OPTIONS}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(val) => handleUpdateItemDefault(index, val ?? '')}
                />
            )
        }
        if (item.type === 'SELECT' && Array.isArray(item.options) && item.options.length > 0) {
            const opts = [
                { value: '', label: 'None' },
                ...item.options.map((o: string) => ({ value: o, label: o })),
            ]
            return (
                <Select
                    size="small"
                    style={{ width: '100%', maxWidth: 160 }}
                    value={
                        item.defaultValue != null && String(item.defaultValue).trim() !== ''
                            ? String(item.defaultValue)
                            : undefined
                    }
                    placeholder="None"
                    options={opts}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(val) => handleUpdateItemDefault(index, val ?? '')}
                />
            )
        }
        const label = formatDefaultDisplay(item)
        if (label === 'None') {
            return <Text type="secondary">None</Text>
        }
        return (
            <Tooltip title={label}>
                <Text ellipsis style={{ maxWidth: '100%' }}>
                    {label}
                </Text>
            </Tooltip>
        )
    }

    const renderItemsEmpty = () => {
        if (loadingItems) {
            return (
                <div style={{ padding: 48, textAlign: 'center' }}>
                    <Spin tip="Loading items…" />
                </div>
            )
        }
        return <Empty description="No items configured" />
    }

    const renderItemsDragTable = () => {
        if (!items.length) {
            return renderItemsEmpty()
        }

        const draggingDisabled = isReadOnly || items.length <= 1

        return (
            <ItemsTable>
                <ItemsRow $isHeader>
                    <ItemsCell style={{ color: '#8c8c8c' }}>#</ItemsCell>
                    <ItemsCell>Name</ItemsCell>
                    <ItemsCell>Label</ItemsCell>
                    <ItemsCell>Required</ItemsCell>
                    <ItemsCell>Type</ItemsCell>
                    <ItemsCell>Default</ItemsCell>
                    <ItemsCell style={{ justifyContent: 'flex-end' }}>Actions</ItemsCell>
                </ItemsRow>
                {items.map((item, index) => {
                    const key = item.id ?? item.tempId ?? item.d ?? `item-${index}`
                    const isDragging = draggingIndex === index
                    const isDropTarget = dragOverIndex === index && draggingIndex !== null && draggingIndex !== index
                    const dragEnabled = !draggingDisabled
                    const typeLabel = typeLookup[item.type] || item.type || '—'

                    return (
                        <ItemsRow
                            key={key}
                            draggable={dragEnabled}
                            $isDragging={isDragging}
                            $isDropTarget={isDropTarget}
                            $isReadOnly={!dragEnabled}
                            onDragStart={dragEnabled ? (event) => handleDragStartRow(event, index) : undefined}
                            onDragEnter={dragEnabled ? (event) => handleDragEnterRow(event, index) : undefined}
                            onDragOver={dragEnabled ? handleDragOverRow : undefined}
                            onDrop={dragEnabled ? (event) => handleDropRow(event, index) : undefined}
                            onDragEnd={dragEnabled ? handleDragEndRow : undefined}
                        >
                            <ItemsCell>
                                <DragHandle $disabled={!dragEnabled}>
                                    <HolderOutlined />
                                </DragHandle>
                                <Text type="secondary">{index + 1}</Text>
                            </ItemsCell>
                            <ItemsCell>
                                <Text strong>{item.name || 'Untitled item'}</Text>
                            </ItemsCell>
                            <ItemsCell>
                                <Text>{item.label || '—'}</Text>
                            </ItemsCell>
                            <ItemsCell>
                                {item.required ? (
                                    <Tag color="volcano">Required</Tag>
                                ) : (
                                    <Tag color="green">Optional</Tag>
                                )}
                            </ItemsCell>
                            <ItemsCell>
                                <Text>{typeLabel}</Text>
                            </ItemsCell>
                            <ItemsCell style={{ overflow: 'visible', whiteSpace: 'normal' }}>
                                {renderDefaultCell(item, index)}
                            </ItemsCell>
                            <ItemsCell style={{ justifyContent: 'flex-end', gap: 8 }}>
                                {isReadOnly ? (
                                    <Text type="secondary">—</Text>
                                ) : (
                                    <>
                                        <Tooltip title="Copy item">
                                            <ButtonMR
                                                onClick={() => handleCopyItem(item, index)}
                                                className="btnLink"
                                            >
                                                <CopyOutlined />
                                            </ButtonMR>
                                        </Tooltip>
                                        <Tooltip title="Edit item">
                                            <ButtonMR
                                                onClick={() => {
                                                    setInfoModal(item)
                                                    setShowModal(true)
                                                }}
                                                className="btnLink"
                                            >
                                                <EditOutlined />
                                            </ButtonMR>
                                        </Tooltip>
                                        <Popconfirm
                                            title={intl.formatMessage({ id: "notification.confirm_delete" })}
                                            okText={intl.formatMessage({ id: "button.Yes" })}
                                            cancelText={intl.formatMessage({ id: "button.No" })}
                                            placement="topRight"
                                            onConfirm={() => handleDeleteItem(item)}
                                        >
                                            <Tooltip title="Delete item">
                                                <button className="btnDelete"><DeleteOutlined /></button>
                                            </Tooltip>
                                        </Popconfirm>
                                    </>
                                )}
                            </ItemsCell>
                        </ItemsRow>
                    )
                })}
            </ItemsTable>
        )
    }

    const resolvePreviewAssignedStaffId = useCallback((): number | null => {
        const fromForm = previewAssignedStaffId ?? form.getFieldValue('assignedStaffId')
        if (fromForm != null && fromForm !== '' && !Number.isNaN(+fromForm)) {
            const n = +fromForm
            return isReportTemplateAssignedToAll(n) ? REPORT_TEMPLATE_ASSIGNED_ALL : n > 0 ? n : null
        }
        const fromData = data?.assignedStaffId ?? data?.assigned_staff_id
        if (fromData != null && fromData !== '' && !Number.isNaN(+fromData)) {
            const n = +fromData
            return isReportTemplateAssignedToAll(n) ? REPORT_TEMPLATE_ASSIGNED_ALL : n > 0 ? n : null
        }
        return null
    }, [previewAssignedStaffId, form, data])

    const renderPreviewStep = () => {
        const categoryValue =
            getCategoryFieldValue(previewCategory) ||
            getCategoryFieldValue(form.getFieldValue('category')) ||
            DEFAULT_CATEGORY
        return (
            <>
                <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Name">
                        {previewName || form.getFieldValue('name') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Category">
                        {resolveCategoryLabel(categoryValue)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Assign to">
                        {resolveAssignedStaffLabel(resolvePreviewAssignedStaffId())}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                        {previewDescription ?? form.getFieldValue('description') ?? '—'}
                    </Descriptions.Item>
                    {SHOW_TEMPLATE_FILE_UPLOAD ? (
                        <Descriptions.Item label="File" span={2}>
                            {file ? (
                                <Button
                                    type="link"
                                    icon={<EyeOutlined />}
                                    onClick={() => window.open(file, '_blank')}
                                >
                                    Preview current file
                                </Button>
                            ) : 'Not uploaded'}
                        </Descriptions.Item>
                    ) : null}
                </Descriptions>
                <div style={{ marginTop: 24 }}>
                    <Title level={5} style={{ marginBottom: 12 }}>Items</Title>
                    {items.length ? (
                        <List
                            dataSource={items}
                            renderItem={(item: any) => (
                                <List.Item>
                                    <div style={{ width: '100%' }}>
                                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                            <Text strong>{item.label || item.name || 'Untitled item'}</Text>
                                            <Text type="secondary">
                                                {reportTemplateTypes.find((c) => c.id === item.type)?.name || item.type}
                                            </Text>
                                            <Text type="secondary">
                                                Default: {formatDefaultDisplay(item)}
                                            </Text>
                                            {item.placeholder ? (
                                                <Paragraph style={{ marginBottom: 0 }} type="secondary">
                                                    Placeholder: {item.placeholder}
                                                </Paragraph>
                                            ) : null}
                                            <Paragraph style={{ marginBottom: 0 }} type="secondary">
                                                Sample: {resolveSampleValue(item) || '—'}
                                            </Paragraph>
                                        </Space>
                                    </div>
                                </List.Item>
                            )}
                        />
                    ) : (
                        renderItemsEmpty()
                    )}
                </div>
            </>
        )
    }

    const renderFooterButtons = () => {
        if (!modalType) {
            return null
        }

        if (isReadOnly) {
            return (
                <Space>
                    <Button type="primary" icon={<CloseCircleOutlined />} onClick={handleClose}>
                        Close
                    </Button>
                </Space>
            )
        }

        const isLastStep = activeStep === totalSteps - 1

        return (
            <Space wrap>
                <Button icon={<CloseCircleOutlined />} onClick={handleClose}>
                    Cancel
                </Button>
                {activeStep > 0 && (
                    <Button onClick={handlePrev}>
                        Back
                    </Button>
                )}
                {!isLastStep && (
                    <Button type="primary" onClick={handleNext}>
                        {activeStep === totalSteps - 2 ? 'Review' : 'Next'}
                    </Button>
                )}
                {isLastStep && (
                    <>
                        <Button
                            icon={<SaveOutlined />}
                            onClick={() => handleSave(true)}
                            disabled={!changed || loadingAction}
                            loading={loadingAction}
                        >
                            Save Draft
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={() => handleSave(false)}
                            disabled={!changed}
                            loading={loadingAction}
                        >
                            Save & Close
                        </Button>
                    </>
                )}
            </Space>
        )
    }

    return (
        <>
            <Drawer
                open={Boolean(modalType)}
                onClose={handleClose}
                title={drawerTitle}
                width={drawerWidth}
                closable={false}
                maskClosable={false}
                destroyOnClose
                footer={renderFooterButtons()}
            >
                <Steps
                    current={activeStep}
                    items={STEP_ITEMS}
                    responsive
                    size="small"
                    style={{ marginBottom: 24 }}
                />
                <BodyModalWrap>
                    <Form
                        form={form}
                        preserve
                        onFieldsChange={() => {
                            if (!isReadOnly) {
                                setChanged(true)
                            }
                        }}
                        validateMessages={validateMessages}
                        style={{ width: '100%' }}
                        layout="vertical"
                        disabled={isReadOnly}
                    >
                        <Form.Item name="disableAutoComplete" style={{ display: 'none' }}>
                            <Input autoComplete="off" name="cp" />
                        </Form.Item>

                        {activeStep === 0 && (
                            <>
                                <Row gutter={[16, 16]}>
                                    <Col md={12} sm={12} xs={24} className="r-padding-media-max-576">
                                        <Fieldset>
                                            <Form.Item
                                                name="name"
                                                label={intl.formatMessage({ id: 'form.label.name' })}
                                                rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }, { max: 200, message: 'Name must be at most 200 characters' }, { type: 'string', message: 'Name must be a string' }]}
                                            >
                                                <InputForm
                                                    className="break-line"
                                                    name="name"
                                                    isRequired={true}
                                                    Max={200}
                                                />
                                            </Form.Item>
                                        </Fieldset>
                                    </Col>
                                    <Col md={12} sm={12} xs={24}>
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
                                    <Col md={12} sm={12} xs={24}>
                                        <Fieldset>
                                            <Form.Item
                                                name='category'
                                                label={'Category'}
                                                rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                                getValueFromEvent={(value) => getCategoryFieldValue(value)}
                                            >
                                                <Select
                                                    key={`category-select-${categorySelectKey}`}
                                                    showSearch
                                                    placeholder='Select or add category'
                                                    optionFilterProp='label'
                                                    options={categoryChoices}
                                                    disabled={isReadOnly}
                                                    dropdownStyle={{ zIndex: 1100 }}
                                                    onChange={(value) => {
                                                        const next = getCategoryFieldValue(value)
                                                        if (!isReadOnly && next) {
                                                            ensureCategoryChoice(next, formatCategoryLabel(next))
                                                            setChanged(true)
                                                        }
                                                    }}
                                                    dropdownRender={(menu) => (
                                                        <>
                                                            {menu}
                                                            {!isReadOnly && (
                                                                <>
                                                                    <Divider style={{ margin: '8px 0' }} />
                                                                    <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                                                                        <AntInput
                                                                            placeholder='New category name'
                                                                            value={newCategoryInput}
                                                                            disabled={savingCategory}
                                                                            onChange={(event) => setNewCategoryInput(event.target.value)}
                                                                            onPressEnter={(event) => {
                                                                                event.preventDefault()
                                                                                event.stopPropagation()
                                                                                handleAddCategoryOption()
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            type='primary'
                                                                            icon={<PlusOutlined />}
                                                                            loading={savingCategory}
                                                                            onClick={(event) => {
                                                                                event.stopPropagation()
                                                                                handleAddCategoryOption()
                                                                            }}
                                                                        >
                                                                            Add
                                                                        </Button>
                                                                    </Space>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                />
                                            </Form.Item>
                                        </Fieldset>
                                    </Col>
                                    <Col md={12} sm={12} xs={24}>
                                        <Fieldset>
                                            <Form.Item
                                                name="assignedStaffId"
                                                label="Assign to"
                                                tooltip="All = every staff can use this template in New Report. Pick one staff = only that person. Clear = no staff."
                                            >
                                                <Select
                                                    allowClear
                                                    showSearch
                                                    placeholder="None (no staff can use this template)"
                                                    optionFilterProp="label"
                                                    options={assignToOptions}
                                                    disabled={isReadOnly}
                                                    onChange={() => setChanged(true)}
                                                />
                                            </Form.Item>
                                        </Fieldset>
                                    </Col>
                                    <Col md={24} sm={24} xs={24}>
                                        <Fieldset>
                                            <Form.Item
                                                name="serviceIds"
                                                label="services"
                                                tooltip="Leave empty to allow every Service. Select one or more to restrict this template in New Report."
                                            >
                                                <Select
                                                    mode="multiple"
                                                    allowClear
                                                    showSearch
                                                    placeholder="All Services"
                                                    optionFilterProp="label"
                                                    options={ServiceOptions}
                                                    disabled={isReadOnly}
                                                    onChange={() => setChanged(true)}
                                                />
                                            </Form.Item>
                                        </Fieldset>
                                    </Col>
                                    {SHOW_TEMPLATE_FILE_UPLOAD ? (
                                        <Col md={24} sm={24} xs={24} className="r-padding-media-max-576">
                                            <Fieldset>
                                                <Label>
                                                    File
                                                </Label>
                                                <Dragger
                                                    accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
                                                    fileList={fileList}
                                                    onChange={(e) => handleChangeFile(e, -1)}
                                                    onRemove={() => {
                                                        setFileList([])
                                                        setFile('')
                                                        setChanged(true)
                                                    }}
                                                    beforeUpload={() => false}
                                                    style={{ cursor: 'pointer' }}
                                                    disabled={isReadOnly}
                                                >
                                                    <p style={{ textAlign: 'center' }}>
                                                        <InboxOutlined style={{ fontSize: 36 }} />
                                                    </p>
                                                    <p style={{ textAlign: 'center' }}>Click or drag file to this area to upload</p>
                                                </Dragger>
                                                {file ? (
                                                    <Button
                                                        type="link"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => window.open(file, '_blank')}
                                                    >
                                                        Preview current file
                                                    </Button>
                                                ) : null}
                                            </Fieldset>
                                        </Col>
                                    ) : null}
                                </Row>
                            </>
                        )}

                        {activeStep === 1 && (
                            <>
                                <Row className='pt-3 pb-2' style={{ marginTop: 8 }} gutter={[16, 16]}>
                                    <Col md={12} sm={12} xs={24}>
                                        Items
                                    </Col>
                                    {modalType !== actionType.VIEW ? (
                                        <Col md={12} sm={12} xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                onClick={() => {
                                                    setShowModal(true)
                                                    setInfoModal(null)
                                                }}
                                                type="primary"
                                            >
                                                <PlusOutlined /> Add new
                                            </Button>
                                        </Col>
                                    ) : null}
                                </Row>
                                <InformationDiv>
                                    {renderItemsDragTable()}
                                </InformationDiv>
                            </>
                        )}

                        {activeStep === 2 && renderPreviewStep()}
                    </Form>
                </BodyModalWrap>
            </Drawer>

            {showModal && (
                <ItemModal
                    loadingAction={false}
                    setShowModal={setShowModal}
                    setChanged={setChanged}
                    data={infoModal}
                    title={infoModal ? "Update" : "Add"}
                    setItems={setItems}
                    items={items}
                />
            )}
        </>
    )
}

export default Index
