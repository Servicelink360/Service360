import React, {
  useMemo,
  useEffect,
  useCallback,
  forwardRef,
  useRef,
  useState,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-balham.css";
import "./OrderTable.css";
import { GetRowIdParams } from "ag-grid-community";
import CustomLoading from "./CustomLoading";
import { useIntl } from "react-intl";
import { copyToClipboard } from "../../../library/helpers/url_handler";
import moment from "moment";
import { dateTimeFormat } from "@app/config/data.config";

interface Props {
  columnDefs: Array<Object>;
  data: Array<Object>;
  heightTable: string;
  nameTable?: string;
  moveRowIndex?: number;
  autoSize?: boolean;
  autoFit?: boolean;
  pagination?: boolean;
  rowKey?: string;
  animation?: boolean;
  rowSelection?: string;
  loading?: boolean;
  disableLoading?: boolean;
  onFuncCopy?: boolean;
  onCellDoubleClicked?: (value: any) => void;
  onSelectionChanged?: (value: any) => void;
  onRowDragEnd?: (value: any) => void;
  onRowDragEnter?: (value: any) => void;
  onRowSelected?: (value: any) => void;
}
let autoSizeSTO: any;
const OrderStatusTable = (props: Props) => {
  const [gridApi, setGridApi] = useState(null);
  const ref = useRef<any>(null);
  const {
    columnDefs,
    data,
    heightTable,
    nameTable,
    moveRowIndex,
    autoSize,
    autoFit,
    pagination = true,
    rowKey,
    animation,
    rowSelection,
    loading,
    disableLoading = false,
    // onFuncCopy,
    // onCellDoubleClicked,
    onSelectionChanged,
    onRowDragEnd,
    onRowDragEnter,
    // onRowSelected,
  } = props;

  const intl = useIntl();
  const [initLoading, setInitLoading] = React.useState(false);
  const onGridReady = (params: any) => {
    setGridApi(params.api)
    var columnState = JSON.parse(localStorage.getItem(nameTable));
    if (columnState) {
      params?.columnApi.applyColumnState({
        state: columnState,
        applyOrder: true,
      });
    }
    return data;
  };
  const defaultColDef = useMemo(() => {
    return {
      resizable: true,
      sortable: true,
      flex:1
    };
  }, []);

  const onColumnMoved = (params: any) => {
    var columnState = JSON.stringify(params?.columnApi.getColumnState());
    localStorage.setItem(nameTable, columnState);
  };

  useEffect(() => {
    if (loading) onShowLoading();
    else onHideLoading();
  }, [loading,gridApi]);

  useEffect(() => {
    if (data) {
      document.body.style.cursor = "default";
      autoSizeSTO = setTimeout(() => autoSizeColumn(), 300);
    } else document.body.style.cursor = "progress";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => {
    return () => {
      clearTimeout(autoSizeSTO);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const autoSizeColumn = () => {
    if (autoSize) ref?.current?.columnApi.autoSizeAllColumns(true);
    if (autoFit) ref?.current?.api?.sizeColumnsToFit();
    if (moveRowIndex) {
      ref?.current?.api?.forEachNode(function (node) {
        if (node.rowIndex === moveRowIndex)
          ref?.current.api!.ensureIndexVisible(node.rowIndex, "middle");
      });
    }
  };
  const loadingOverlayComponent = () => {
    return <CustomLoading />;
  };
  const noRowsOverlayComponent = () => {
    return <span>{intl.formatMessage({ id: "message.noDataToShow" })}</span>;
  };
  useEffect(() => {
    if (loading)
      onShowLoading();
    else onHideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  const onShowLoading = useCallback(() => {
    ref?.current?.api?.showLoadingOverlay();
  }, []);
  const onHideLoading = useCallback(() => {
    ref?.current?.api?.hideOverlay();
  }, []);

  const getRowId = useCallback(
    (params: GetRowIdParams) => {
      if (rowKey && rowKey === "_id") return params?.data?._id;
      if (rowKey && rowKey === "Id") return params?.data?.Id;
      if (rowKey && rowKey === "key") return params?.data?.key;
      if (rowKey && rowKey === "AccNo") return params?.data?.AccNo;
      if (rowKey && rowKey === "MAWBNo") return params?.data?.MAWBNo;
      if (rowKey && rowKey === "RefNo") return params?.data?.RefNo;
      if (rowKey && rowKey === "CustNo") return params?.data?.CustNo;
      if (rowKey && rowKey === "PartnerNo") return params?.data?.PartnerNo;
      if (rowKey && rowKey === "CostPaymentNo")
        return params?.data?.CostPaymentNo;
      // if( rowKey && rowKey === 'CostPaymentNo') return rowIndex + 1
      else return params?.data;
    },
    [rowKey]
  );

  const onCellDoubleClickedv1 = (params: any) => {
    const formatter = params.colDef.valueFormatter;
    if (formatter) {
      copyToClipboard(formatter(params));
    } else if (params?.value && params?.value !== "undefined") {
      const cellRenderer = params.colDef.cellRenderer;
      if (
        moment(params.value).isValid() &&
        isNaN(params.value) &&
        cellRenderer
      ) {
        // Check value is date
        const formaTime = moment(params.value).format(dateTimeFormat);
        copyToClipboard(formaTime);
      } else {
        copyToClipboard(params.value);
      }
    }
  };

  return (
    <div
      className="ag-theme-balham"
      style={{ height: heightTable }}
    >
      <AgGridReact
        ref={ref}
        rowData={data}
        columnDefs={columnDefs}
        rowDragManaged={true}
        animateRows={animation ? animation : true}
        suppressDragLeaveHidesColumns={true}
        onGridReady={onGridReady}
        rowGroupPanelShow={"always"}
        pagination={pagination}
        rowHeight={32}
        loadingOverlayComponent={
          disableLoading ? null : loadingOverlayComponent
        }
        noRowsOverlayComponent={disableLoading ? null : noRowsOverlayComponent}
        defaultColDef={defaultColDef}
        onColumnMoved={onColumnMoved}
        rowSelection={rowSelection ? rowSelection : "single"}
        onSelectionChanged={onSelectionChanged}
        getRowId={getRowId}
        suppressRowVirtualisation={true}
        onRowDragEnd={onRowDragEnd}
        onRowDragEnter={onRowDragEnter}
        onCellDoubleClicked={onCellDoubleClickedv1}
        {...props}
      ></AgGridReact>
    </div>
  );
};

export default OrderStatusTable;
