import { createGlobalStyle } from "styled-components";

/**
 * Injected on mobile portrait dark for list pages (New Reports, Report Faults).
 * Beats isoBoxWrapper white card + antd default #fff controls.
 */
export const ReportsMobileDarkPageStyles = createGlobalStyle`
  body.new-reports-page-body-dark,
  body.new-reports-page-body-dark .isomorphicContent,
  body.new-reports-page-body-dark #main-content,
  body.new-reports-page-body-dark .isoContentMainLayout {
    background: #000000 !important;
  }

  body.new-reports-page-body-dark .isoBoxWrapper,
  .isoBoxWrapper.new-reports-layout-dark {
    background: #000000 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
  }

  .isoLayoutContentWrapper.new-reports-layout-dark,
  .isoExampleWrapper.new-reports-layout-dark {
    background: #000000 !important;
    padding: 0 !important;
  }

  .new-reports-theme-dark.new-reports-list-wrap .new-reports-bulk-bar--dark,
  .new-reports-theme-dark.report-faults-list-wrap .new-reports-bulk-bar--dark {
    background: #1a1a1a !important;
    border: 1px solid #444444 !important;
    box-shadow: none !important;
  }

  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select,
  .new-reports-theme-dark .nr-dark-select-shell .ant-select {
    width: 100%;
  }

  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selector,
  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select:not(.ant-select-customize-input) .ant-select-selector,
  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-multiple .ant-select-selector,
  .new-reports-theme-dark .nr-dark-select-shell .ant-select-selector,
  .new-reports-theme-dark .nr-dark-select-shell .ant-select:not(.ant-select-customize-input) .ant-select-selector,
  .new-reports-theme-dark .new-reports-list-filters--dark .ant-select-selector,
  .new-reports-theme-dark .new-reports-list-filters--dark .ant-select:not(.ant-select-customize-input) .ant-select-selector {
    background: #141414 !important;
    background-color: #141414 !important;
    border-color: #444444 !important;
    color: #ffffff !important;
  }

  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selection-placeholder,
  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selection-item,
  .new-reports-theme-dark .nr-dark-select-shell .ant-select-selection-placeholder,
  .new-reports-theme-dark .nr-dark-select-shell .ant-select-selection-item {
    color: #9a9a9a !important;
  }

  .new-reports-theme-dark .nr-bulk-select-wrap .ant-select-selection-search-input,
  .new-reports-theme-dark .nr-bulk-select-wrap input {
    background: transparent !important;
    color: #ffffff !important;
  }

  /* Report Faults table (mobile portrait dark) */
  .new-reports-theme-dark.report-faults-list-wrap .ant-table-wrapper.table.report-faults-table--dark,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-container,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-content,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark table {
    background: #141414 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr > td.ant-table-cell-fix-left,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr > td.ant-table-cell-fix-right {
    background: #141414 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr > td,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark td.ant-table-cell {
    background: #141414 !important;
    color: #f0f0f0 !important;
    border-bottom-color: #303030 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr.ant-table-row:hover > td,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr.ant-table-row:hover > .ant-table-cell {
    background: #1f1f1f !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr.report-row-highlight > td {
    background: #1f2e1f !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-tbody > tr.ant-table-placeholder > td,
  .new-reports-theme-dark.report-faults-list-wrap .table.report-faults-table--dark .ant-table-placeholder .ant-table-cell {
    background: #141414 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-empty-description {
    color: #8c8c8c !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .report-fault-message-cell {
    color: #e8e8e8 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-checkbox-inner {
    background-color: #1a1a1a !important;
    border-color: #444444 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-checkbox-checked .ant-checkbox-inner {
    background-color: #389e0d !important;
    border-color: #389e0d !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination,
  .new-reports-theme-dark.report-faults-list-wrap .gFontSize {
    color: #b0b0b0 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination-item {
    background: #141414 !important;
    border-color: #333333 !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination-item a {
    color: #ffffff !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination-item-active {
    background: #389e0d !important;
    border-color: #389e0d !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination-prev .ant-pagination-item-link,
  .new-reports-theme-dark.report-faults-list-wrap .ant-pagination-next .ant-pagination-item-link {
    background: #141414 !important;
    border-color: #333333 !important;
    color: #ffffff !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .new-reports-bulk-bar--dark .ant-btn-dangerous,
  .new-reports-theme-dark.report-faults-list-wrap .new-reports-bulk-bar--dark .nr-mobile-bulk-remove-btn {
    background: #3a1f1f !important;
    border-color: #6b3030 !important;
    color: #ff9c9c !important;
  }

  .new-reports-theme-dark.report-faults-list-wrap .new-reports-bulk-bar--dark .ant-btn-dangerous[disabled] {
    background: #2a1515 !important;
    border-color: #4a2a2a !important;
    color: #8c5a5a !important;
  }

  /* Create / edit report fault modal */
  .new-report-form-modal-wrap--dark.ant-modal-wrap .ant-modal-mask {
    background-color: rgba(0, 0, 0, 0.82) !important;
  }

  .new-report-form-modal--dark .ant-modal-content {
    background: #262626 !important;
    color: #f0f0f0 !important;
    border: 2px solid #5a5a5a !important;
    border-radius: 14px !important;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 28px 90px rgba(0, 0, 0, 0.95),
      0 12px 40px rgba(0, 0, 0, 0.75) !important;
    overflow: hidden;
  }

  .new-report-form-modal--dark .ant-modal-header {
    background: linear-gradient(180deg, #397d36 0%, #2f6b2c 100%) !important;
    border-bottom: none !important;
    padding: 16px 48px 16px 24px !important;
  }

  .new-report-form-modal--dark .ant-modal-title,
  .new-report-form-modal--dark .ant-modal-title span {
    color: #ffffff !important;
    font-weight: 700 !important;
  }

  .new-report-form-modal--dark .ant-modal-body {
    background: #262626 !important;
    color: #f0f0f0 !important;
  }

  .new-report-form-modal--dark .ant-modal-footer {
    background: #1e1e1e !important;
    border-top: 1px solid #404040 !important;
  }

  .new-report-form-modal--dark .ant-form-item-label > label {
    color: #b0b0b0 !important;
  }

  .new-report-form-modal--dark .ant-input,
  .new-report-form-modal--dark .ant-input-affix-wrapper,
  .new-report-form-modal--dark textarea.ant-input,
  .new-report-form-modal--dark .ant-select-selector,
  .new-report-form-modal--dark .ant-select:not(.ant-select-customize-input) .ant-select-selector,
  .new-report-form-modal--dark .ant-picker,
  .new-report-form-modal--dark .ant-picker-input > input {
    background: #1a1a1a !important;
    border-color: #555555 !important;
    color: #ffffff !important;
  }

  .new-report-form-modal--dark .ant-select-selection-placeholder,
  .new-report-form-modal--dark .ant-select-selection-item {
    color: #9a9a9a !important;
  }

  .new-report-form-modal--dark .ant-select-arrow,
  .new-report-form-modal--dark .ant-picker-suffix {
    color: #9a9a9a !important;
  }

  /* Media files / attachFiles upload (text list) */
  .new-report-form-modal--dark label,
  .new-report-form-modal--dark .ant-form label {
    color: #b0b0b0 !important;
  }

  .new-report-form-modal--dark .ant-upload {
    color: rgba(255, 255, 255, 0.88) !important;
    width: 100%;
  }

  .new-report-form-modal--dark .ant-upload-select {
    display: block !important;
    width: 100% !important;
  }

  .new-report-form-modal--dark .ant-upload-select > button,
  .new-report-form-modal--dark .ant-upload .ant-upload-select button {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    min-height: 88px !important;
    padding: 16px 12px !important;
    background: #1a1a1a !important;
    background-color: #1a1a1a !important;
    border: 1px dashed #555555 !important;
    border-radius: 8px !important;
    color: #f0f0f0 !important;
    cursor: pointer !important;
  }

  .new-report-form-modal--dark .ant-upload-select .anticon,
  .new-report-form-modal--dark .ant-upload-select button .anticon {
    color: #9a9a9a !important;
    font-size: 24px !important;
  }

  .new-report-form-modal--dark .ant-upload-select button div {
    color: #f0f0f0 !important;
  }

  .new-report-form-modal--dark .ant-upload-list-item {
    background: #1a1a1a !important;
    border: 1px solid #444444 !important;
    border-radius: 6px !important;
    margin-top: 8px !important;
    padding: 8px 12px !important;
  }

  .new-report-form-modal--dark .ant-upload-list-item-name,
  .new-report-form-modal--dark .ant-upload-list-item-info {
    color: #f0f0f0 !important;
  }

  .new-report-form-modal--dark .ant-upload-list-item .anticon {
    color: rgba(255, 255, 255, 0.65) !important;
  }

  .new-report-form-modal--dark .ant-upload-list-item:hover .ant-upload-list-item-info {
    background: #262626 !important;
  }
`;
