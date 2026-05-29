import { DeleteOutlined, EditOutlined, FileAddOutlined, SearchOutlined } from '@ant-design/icons'
import { ActionListBtn } from '@app/components/common/Common.styles'
import Layout from '@app/components/layout/Layout'
import { limitData, pageData } from '@app/config/data.config'
import { Col, Form, Popconfirm, Tooltip } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useDispatch, useSelector } from 'react-redux'
import FormInput from '@app/components/common/FormItem/Input'
import TableComponent from '@app/components/common/Table/index'
import { ColDef } from 'ag-grid-community'
import actions from '@app/redux/companies/actions'
import CompanyModal from '@app/components/companies'
import {
    ButtonDiv,
    InformationDiv,
    StatusRow,
    UsernameRow,
    UsersDiv,
    Fieldset,
    ActionsWrapper,
} from '@app/components/common/container.style'
import actionType from '../../constants/actionType'

const COMPANY_SORT_FIELDS = new Set(['name', 'customerCount', 'siteCount', 'staffCount'])

const serverTableSorter = {
    sorter: () => 0,
    sortDirections: ['ascend', 'descend'] as const,
}

const CompaniesPage: React.FC = () => {
    const [limit, setLimit] = useState(limitData)
    const [page, setPage] = useState(pageData)
    const [listSort, setListSort] = useState({ orderBy: 'name', orderValue: 'ASC' })
    const [form] = Form.useForm()
    const intl = useIntl()
    const { loading, rows, row, success, modalType, count, loadingAction } = useSelector(
        (state: any) => state?.companies,
    )
    const dispatch = useDispatch()
    const appliedSortRef = useRef({ field: '', orderValue: '', at: 0 })

    const sortOrderFor = useCallback(
        (field: string) =>
            listSort.orderBy === field
                ? listSort.orderValue === 'ASC'
                    ? ('ascend' as const)
                    : ('descend' as const)
                : undefined,
        [listSort.orderBy, listSort.orderValue],
    )

    const loadCompanies = useCallback(
        (
            pageNum: number = page,
            limitNum: number = limit,
            orderBy: string = listSort.orderBy,
            orderValue: string = listSort.orderValue,
        ) => {
            const formData = form.getFieldsValue()
            dispatch(
                actions.getData({
                    keyword: formData?.Name ? String(formData.Name).trim() : '',
                    page: pageNum,
                    limit: limitNum,
                    orderBy,
                    orderValue,
                }),
            )
        },
        [dispatch, form, limit, listSort.orderBy, listSort.orderValue, page],
    )

    const handleOnClick = useCallback(
        (data: string, record?: any) => {
            if (data === actionType.ADD) {
                dispatch({ type: actions.MODAL, payload: { modalType: actionType.ADD, row: null } })
            } else if (data === actionType.UPDATE) {
                dispatch({ type: actions.MODAL, payload: { modalType: actionType.UPDATE, row: record } })
            } else {
                loadCompanies(page, limit)
            }
        },
        [dispatch, loadCompanies, page, limit],
    )

    const columns: ColDef[] | any = useMemo(
        () => [
            {
                title: 'Company name',
                key: 'name',
                columnKey: 'name',
                dataIndex: 'name',
                width: 280,
                ...serverTableSorter,
                sortOrder: sortOrderFor('name'),
            },
            {
                title: 'Customers',
                key: 'customerCount',
                columnKey: 'customerCount',
                dataIndex: 'customerCount',
                width: 120,
                ...serverTableSorter,
                sortOrder: sortOrderFor('customerCount'),
            },
            {
                title: 'Job sites',
                key: 'siteCount',
                columnKey: 'siteCount',
                dataIndex: 'siteCount',
                width: 120,
                ...serverTableSorter,
                sortOrder: sortOrderFor('siteCount'),
            },
            {
                title: 'Staff',
                key: 'staffCount',
                columnKey: 'staffCount',
                dataIndex: 'staffCount',
                width: 100,
                ...serverTableSorter,
                sortOrder: sortOrderFor('staffCount'),
            },
            {
                title: intl.formatMessage({ id: 'table.column.action' }),
                dataIndex: 'action',
                width: 120,
                fixed: 'right',
                align: 'center',
                render: (_: string, record: any) => {
                    const inUse =
                        +(record?.customerCount ?? 0) > 0 || +(record?.siteCount ?? 0) > 0
                    const deleteBtn = (
                        <button type="button" className="btnDelete" disabled={inUse}>
                            <DeleteOutlined />
                        </button>
                    )
                    return (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="btnLink"
                                onClick={() => handleOnClick(actionType.UPDATE, record)}
                            >
                                <EditOutlined />
                            </button>
                            {inUse ? (
                                <Tooltip title="Remove or reassign all customers and job sites before deleting.">
                                    <span>{deleteBtn}</span>
                                </Tooltip>
                            ) : (
                                <Popconfirm
                                    title={intl.formatMessage({ id: 'notification.confirm_delete' })}
                                    okText={intl.formatMessage({ id: 'button.Yes' })}
                                    cancelText={intl.formatMessage({ id: 'button.No' })}
                                    placement="topRight"
                                    onConfirm={() =>
                                        dispatch(
                                            actions.saveInto(
                                                { id: record?.id },
                                                actionType.DELETE,
                                                false,
                                            ),
                                        )
                                    }
                                >
                                    {deleteBtn}
                                </Popconfirm>
                            )}
                        </div>
                    )
                },
            },
        ],
        [intl, handleOnClick, dispatch, sortOrderFor],
    )

    useEffect(() => {
        if (success) {
            loadCompanies(page, limit)
        }
    }, [success, loadCompanies, page, limit])

    useEffect(() => {
        loadCompanies(page, limit)
        return () => {
            dispatch(actions.clearData())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch])

    const onTableChange = (
        pagination: any,
        _filters: any,
        sorter: any,
        extra?: { action?: string },
    ) => {
        setPage(pagination.current)
        setLimit(pagination.pageSize)

        if (extra?.action === 'paginate') {
            loadCompanies(pagination.current, pagination.pageSize)
            return
        }
        if (extra?.action !== 'sort') {
            return
        }

        const colSorter = Array.isArray(sorter)
            ? [...sorter].reverse().find((s: { order?: string }) => s?.order) ?? sorter[sorter.length - 1]
            : sorter
        const rawField =
            colSorter?.columnKey ?? colSorter?.column?.key ?? colSorter?.field
        if (rawField == null) {
            return
        }
        const field = String(Array.isArray(rawField) ? rawField[rawField.length - 1] : rawField)
        if (!COMPANY_SORT_FIELDS.has(field)) {
            return
        }

        let orderValue: string
        if (colSorter.order === 'ascend') {
            orderValue = 'ASC'
        } else if (colSorter.order === 'descend') {
            orderValue = 'DESC'
        } else if (listSort.orderBy === field) {
            if (Date.now() - appliedSortRef.current.at < 200 && appliedSortRef.current.field === field) {
                return
            }
            orderValue = listSort.orderValue === 'ASC' ? 'DESC' : 'ASC'
        } else {
            orderValue = 'DESC'
        }

        appliedSortRef.current = { field, orderValue, at: Date.now() }
        setListSort({ orderBy: field, orderValue })
        loadCompanies(pagination.current, pagination.pageSize, field, orderValue)
    }

    return (
        <Layout title="Companies">
            <UsersDiv>
                <Form form={form} layout="horizontal" style={{ width: '100%' }}>
                    <StatusRow>
                        <Col lg={15} md={24} xs={24}>
                            <Fieldset>
                                <FormInput
                                    name="Name"
                                    label={intl.formatMessage({ id: 'form.filter.keyword' })}
                                    Max={200}
                                />
                            </Fieldset>
                        </Col>
                        <Col lg={9} md={24} xs={24} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ButtonDiv>
                                <ActionsWrapper>
                                    <ActionListBtn
                                        type="primary"
                                        onClick={() => handleOnClick(actionType.SEARCH)}
                                        loading={loading}
                                        icon={<SearchOutlined />}
                                    >
                                        {intl.formatMessage({ id: 'sidebar.users.search' })}
                                    </ActionListBtn>
                                    <ActionListBtn
                                        type="primary"
                                        onClick={() => handleOnClick(actionType.ADD)}
                                        icon={<FileAddOutlined />}
                                    >
                                        {intl.formatMessage({ id: 'sidebar.users.new' })}
                                    </ActionListBtn>
                                </ActionsWrapper>
                            </ButtonDiv>
                        </Col>
                    </StatusRow>
                </Form>
                <UsernameRow />
                <InformationDiv>
                    <TableComponent
                        heightTable="650px"
                        onTableChange={onTableChange}
                        columns={columns}
                        keys="id"
                        page={page}
                        count={count}
                        limit={limit}
                        data={rows}
                        loading={loading}
                    />
                </InformationDiv>
            </UsersDiv>
            {modalType ? (
                <CompanyModal
                    title={modalType === actionType.ADD ? 'Add company' : 'Edit company'}
                    loadingAction={loadingAction}
                    data={row}
                    modalType={modalType}
                    isSuccess={success}
                />
            ) : null}
        </Layout>
    )
}

export default CompaniesPage
