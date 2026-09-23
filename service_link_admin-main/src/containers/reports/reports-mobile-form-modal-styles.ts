import { createGlobalStyle } from "styled-components";

/**
 * Mobile portrait Create/Edit report & fault form modal.
 * Structure matches dark modal; light only swaps sage/green palette.
 * Injected from New Reports and Report Faults so both pages get the chrome.
 */
export const ReportsMobileFormModalStyles = createGlobalStyle`
  @media (orientation: portrait) and (max-width: 768px) {
    .new-report-form-modal .ant-modal-title,
    .new-report-form-modal .ant-modal-title span {
      font-size: 18px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
    }

    .new-report-form-modal .ant-form-item-label > label {
      font-size: 16px !important;
      line-height: 1.4 !important;
      white-space: normal !important;
      height: auto !important;
    }

    .new-report-form-modal .ant-input,
    .new-report-form-modal .ant-input-affix-wrapper,
    .new-report-form-modal .ant-select-selector,
    .new-report-form-modal .ant-picker,
    .new-report-form-modal textarea.ant-input {
      font-size: 16px !important;
      line-height: 1.45 !important;
      min-height: 44px;
    }

    .new-report-form-modal .ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
      height: 44px !important;
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }

    .new-report-form-modal .ant-btn {
      font-size: 16px !important;
      height: 44px !important;
      padding: 0 16px !important;
    }

    .new-report-form-modal textarea.report-fault-message-box,
    .new-report-form-modal .report-fault-message-box.ant-input,
    .new-report-form-modal .report-fault-message-item textarea.ant-input {
      min-height: 104px !important;
      height: 104px !important;
    }

    /* Light � same chrome as dark; sage palette only */
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-content {
      background: #e7f0e4 !important;
      color: #143d24 !important;
      border: 2px solid #c5d9bf !important;
      border-radius: 14px !important;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(31, 107, 58, 0.12),
        0 28px 90px rgba(31, 107, 58, 0.18),
        0 12px 40px rgba(31, 107, 58, 0.12) !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-header {
      background: linear-gradient(180deg, #397d36 0%, #2f6b2c 100%) !important;
      border-bottom: none !important;
      padding: 16px 48px 16px 24px !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-title,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-title span,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-title .anticon {
      color: #ffffff !important;
      font-weight: 700 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-body {
      background: #e7f0e4 !important;
      color: #143d24 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-footer {
      background: #d7e8d2 !important;
      border-top: 1px solid #c5d9bf !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-form-item-label > label {
      color: #3d6b4a !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-input,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-input-affix-wrapper,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-selector,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-picker,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) textarea.ant-input,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-disabled .ant-select-selector,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-disabled:not(.ant-select-customize-input) .ant-select-selector {
      background: #ffffff !important;
      border-color: #8fbf96 !important;
      color: #143d24 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-selection-placeholder,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-selection-item {
      color: #143d24 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-select-arrow {
      color: #3d6b4a !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-upload.ant-upload-select-picture-card,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .image-upload-grid-wrap .ant-upload.ant-upload-select-picture-card {
      background: #f4faf3 !important;
      border: 1.5px dashed #6b9e74 !important;
      border-radius: 12px !important;
      color: #1a4d2e !important;
      width: 100% !important;
      margin: 0 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-upload.ant-upload-select-picture-card .anticon-plus {
      color: #1f6b3a !important;
      font-size: 28px !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-upload.ant-upload-select-picture-card > .ant-upload > div {
      color: #1a4d2e !important;
      font-weight: 600 !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-btn-primary {
      background: #1f6b3a !important;
      border-color: #1f6b3a !important;
    }

    .ant-modal.new-report-form-modal .report-fault-media-tile-wrap .ant-upload.ant-upload-select-picture-card,
    .ant-modal.new-report-form-modal .report-fault-media-tile.ant-upload-select-picture-card {
      width: 104px !important;
      height: 104px !important;
      margin: 0 8px 8px 0 !important;
      background: #f0f0f0 !important;
      border: 1px solid #bfbfbf !important;
      border-radius: 8px !important;
    }

    .ant-modal.new-report-form-modal .report-fault-media-tile__btn,
    .ant-modal.new-report-form-modal .report-fault-media-tile button.report-fault-media-tile__btn {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
    }

    .ant-modal.new-report-form-modal .report-fault-media-tile__btn .anticon {
      font-size: 28px !important;
      color: #52c41a !important;
    }

    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-footer .ant-btn,
    .ant-modal.new-report-form-modal:not(.new-report-form-modal--dark) .ant-modal-footer button {
      border-radius: 8px !important;
    }
  }
`;
