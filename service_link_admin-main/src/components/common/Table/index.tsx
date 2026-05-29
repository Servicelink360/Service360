import React, { memo, useEffect, useState } from 'react'
import { Table } from 'antd'
import { ColumnProps } from '@app/interfaces/IUsers'
import { useIntl } from 'react-intl'
import "./table.css";
export interface TableComponentProps {
  loading: boolean
  data: any
  page: number
  count: number
  limit: number
  heightTable?: any
  widthTable?: any
  columns: ColumnProps[],
  keys?: any,
  keys2?: any,
  onTableChange?: (pagination, filters?:any, sorter?:any, extra?:any) => void
  expandedRowRender?: any
  rowSelection?: any,
  tableClassName?: any,
  /** Pagination footer unit label, e.g. "sites" (default: Items). */
  totalUnit?: string,
  pagination?:boolean,
  expandable?: boolean,
  /** When true with expandable, all parent rows start expanded. Default false (+ to open). */
  defaultExpandAllRows?: boolean,
  expandRowByClick?: boolean,
  rowExpandable?: (record: any) => boolean,
  showHeader?:boolean,
  onRow?: (record: any, index?: number) => React.HTMLAttributes<HTMLElement>;
  rowClassName?: (record: any) => string;
}
const TableComponent: React.FC<TableComponentProps> = ({
  limit,
  columns,
  onTableChange,
  count,
  page,
  loading,
  data,
  heightTable = 200,
  widthTable = '100%',
  keys = 'id',
  rowSelection,
  tableClassName,
  totalUnit,
  expandedRowRender,
  pagination = true,
  expandable = false,
  defaultExpandAllRows = false,
  expandRowByClick = true,
  rowExpandable,
  showHeader = true,
  onRow,
  rowClassName,
}) => {
  const intl = useIntl()
  const [currentPage, setCurrentPage] = useState<number>(1)
  const objKeys = Object.keys(data && data.length > 0 ? data[0] : {})
  const keyNeedle = String(keys || 'id').toLowerCase()
  const index = objKeys.findIndex(
    (v) => v.toLowerCase() === keyNeedle || v.toLowerCase().includes(keyNeedle),
  )
  const rowKey = index > -1 ? objKeys[index] : (keys || 'id')
  useEffect(() => {
    if (page === 1) {
      setCurrentPage(1)
    } else if (page && page !== currentPage) setCurrentPage(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])
  const table_class_name = 'table ' + tableClassName;
  return (
    
    <Table
      rowSelection={rowSelection}
      rowKey={rowKey}
      // scroll={{ x: widthTable, y: heightTable }}
      loading={loading}
      // bordered
      /* @ts-ignore */
      columns={columns}
      expandable={
        expandedRowRender
          ? {
              expandedRowRender,
              defaultExpandAllRows: expandable === true || defaultExpandAllRows === true,
              expandRowByClick: expandRowByClick ?? true,
              rowExpandable,
              columnWidth: 48,
            }
          : expandable
            ? {
                expandedRowRender,
                defaultExpandAllRows: defaultExpandAllRows === true,
                expandRowByClick,
                rowExpandable,
                columnWidth: 48,
              }
            : undefined
      }
      locale={{
        emptyText: intl.formatMessage({ id: 'sidebar.users.no_data' }),
      }}
      style={{ minHeight: heightTable }}
      dataSource={data}
      showHeader={showHeader}
      pagination={!pagination?false:{
        pageSize: limit,
        showSizeChanger: true,
        defaultCurrent: page,
        current: currentPage,
        defaultPageSize: limit,
        position: ['bottomRight'],
        total: count,
        pageSizeOptions: [10, 30, 50, 100],
        // showQuickJumper: true,
        showTotal: (_total: number) => {
          const unit =
            totalUnit || intl.formatMessage({ id: 'sidebar.users.items' });
          return (
            <span className="gFontSize">
              {' '}
              {intl.formatMessage({ id: 'sidebar.users.total' })} {count}{' '}
              {unit}
            </span>
          )
        },
      }}
      onChange={onTableChange}
      onRow={onRow}
      rowClassName={rowClassName}
      className={table_class_name}
    />
  )
}
export default memo(TableComponent)
