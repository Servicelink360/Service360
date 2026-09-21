import { createGlobalStyle } from "styled-components";

/**
 * True app-style list shell for New Reports + Report Faults on mobile portrait.
 * Light mode matches report form sage/green palette (not blank white chrome).
 */
export const ReportsMobileAppShellStyles = createGlobalStyle`
  @media (orientation: portrait) and (max-width: 768px) {
    .new-reports-list-wrap--mobile-portrait,
    .report-faults-list-wrap--mobile-portrait {
      --nr-app-bg: #e7f0e4;
      --nr-app-surface: #ffffff;
      --nr-app-field: #f7fbf6;
      --nr-app-border: #b7d0b0;
      --nr-app-text: #143d24;
      --nr-app-muted: #3d6b4a;
      --nr-app-accent: #1f6b3a;
      --nr-app-header: #1f6b3a;
      --nr-app-meta: #d7e8d2;
      max-width: 100vw !important;
      overflow-x: hidden !important;
      background: var(--nr-app-bg) !important;
    }

    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark {
      --nr-app-bg: #000000;
      --nr-app-surface: #1a1a1a;
      --nr-app-field: #141414;
      --nr-app-border: #333333;
      --nr-app-text: #f5f5f5;
      --nr-app-muted: #9a9a9a;
      --nr-app-accent: #52c41a;
      --nr-app-header: #141414;
      --nr-app-meta: #141414;
    }

    .new-reports-list-wrap--mobile-portrait .nr-list-page,
    .report-faults-list-wrap--mobile-portrait .nr-list-page {
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 56px);
      background: var(--nr-app-bg);
    }

    .nr-list-chrome--mobile,
    .report-faults-list-wrap--mobile-portrait .nr-app-chrome {
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }

    .nr-list-table-panel--mobile {
      margin-top: 0 !important;
      background: transparent !important;
      border: none !important;
      flex: 1;
    }

    .nr-app-top {
      position: sticky;
      top: 0;
      z-index: 40;
      background: var(--nr-app-bg);
      padding: 8px 0 10px;
      border-bottom: 1px solid var(--nr-app-border);
      margin-bottom: 0;
    }

    .nr-app-top-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .nr-app-top-row .nr-app-filter-btn {
      flex: 1;
      height: 48px !important;
      border-radius: 12px !important;
      font-weight: 600;
      font-size: 16px !important;
      background: var(--nr-app-field) !important;
      border-color: var(--nr-app-border) !important;
      color: var(--nr-app-text) !important;
    }

    .nr-app-fab {
      flex-shrink: 0;
      height: 48px !important;
      min-width: 48px !important;
      border-radius: 12px !important;
      font-weight: 700 !important;
      font-size: 16px !important;
      background: var(--nr-app-accent) !important;
      border-color: var(--nr-app-accent) !important;
      box-shadow: 0 4px 14px rgba(31, 107, 58, 0.35) !important;
    }

    /* Segmented tabs */
    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav {
      margin: 0 0 10px !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav::before,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav::before {
      border-bottom: none !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav-list,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-nav-list {
      display: flex;
      width: 100%;
      background: var(--nr-app-field);
      border: 1px solid var(--nr-app-border);
      border-radius: 12px;
      padding: 3px;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab {
      flex: 1;
      justify-content: center;
      margin: 0 !important;
      padding: 10px 8px !important;
      border-radius: 10px !important;
      border: none !important;
      background: transparent !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab .ant-tabs-tab-btn,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab .ant-tabs-tab-btn {
      color: var(--nr-app-muted) !important;
      font-weight: 600;
      font-size: 15px !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab-active,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab-active {
      background: var(--nr-app-accent) !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab-active .ant-tabs-tab-btn,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
      color: #ffffff !important;
      font-weight: 700;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-ink-bar,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-tabs .ant-tabs-ink-bar {
      display: none !important;
    }

    .nr-app-filter-sheet {
      margin-top: 8px;
      padding: 12px;
      border-radius: 14px;
      background: var(--nr-app-surface);
      border: 1px solid var(--nr-app-border);
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-list-filters,
    .report-faults-list-wrap--mobile-portrait .new-reports-list-filters {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* Search / filter inputs  sage field, not pure white */
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-input,
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-input-affix-wrapper,
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-select-selector,
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-picker,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-input,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-input-affix-wrapper,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-select-selector,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-picker {
      background: var(--nr-app-field) !important;
      border-color: var(--nr-app-border) !important;
      color: var(--nr-app-text) !important;
      border-radius: 12px !important;
      font-size: 16px !important;
      min-height: 48px;
    }

    .new-reports-list-wrap--mobile-portrait .ant-form-item-label > label,
    .report-faults-list-wrap--mobile-portrait .ant-form-item-label > label {
      font-size: 15px !important;
      font-weight: 600 !important;
    }

    .new-reports-list-wrap--mobile-portrait .ant-btn,
    .report-faults-list-wrap--mobile-portrait .ant-btn {
      font-size: 16px !important;
    }

    .new-reports-list-wrap--mobile-portrait .nr-mobile-report-card .ant-btn,
    .report-faults-list-wrap--mobile-portrait .nr-mobile-fault-card .ant-btn {
      font-size: 15px !important;
      height: 40px !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-btn-primary,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .ant-btn-primary {
      background: var(--nr-app-accent) !important;
      border-color: var(--nr-app-accent) !important;
    }

    .new-reports-list-filters-form--collapsed .ant-form-item:not(.nr-search-row):not(.nr-keyword-row) {
      display: none !important;
    }

    .new-reports-list-filters-form--collapsed .nr-keyword-row,
    .new-reports-list-filters-form--collapsed .nr-search-row {
      display: block !important;
      width: 100% !important;
      margin-bottom: 8px !important;
    }

    .nr-app-bulk-sticky {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 45;
      margin: 0 !important;
      padding: 12px !important;
      border-radius: 14px !important;
      background: var(--nr-app-surface) !important;
      border: 1px solid var(--nr-app-border) !important;
      box-shadow: 0 8px 28px rgba(31, 107, 58, 0.18) !important;
    }

    .new-reports-theme-dark .nr-app-bulk-sticky {
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65) !important;
    }

    .new-reports-list-wrap--mobile-portrait .nr-mobile-reports-list,
    .report-faults-list-wrap--mobile-portrait .nr-mobile-faults-list {
      gap: 12px !important;
      padding: 12px 0 24px !important;
      background: transparent !important;
    }

    /* Report / fault cards  soft green border, sage meta strip */
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-fault-card {
      background: var(--nr-app-surface) !important;
      border: 1px solid var(--nr-app-border) !important;
      border-radius: 14px !important;
      box-shadow: 0 4px 16px rgba(31, 107, 58, 0.1) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card > div:first-child,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-fault-card > div:first-child {
      border-bottom-color: var(--nr-app-border) !important;
      background: #f4faf3 !important;
    }

    .new-reports-theme-dark .nr-mobile-report-card,
    .new-reports-theme-dark .nr-mobile-fault-card {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card button.ant-btn-default,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-fault-card button.ant-btn-default {
      background: var(--nr-app-field) !important;
      border-color: var(--nr-app-border) !important;
      color: var(--nr-app-text) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-pdf-btn,
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card .ant-btn-default:has(.anticon-file-pdf) {
      background: #e8f5e9 !important;
      border-color: #81c784 !important;
      color: #1f6b3a !important;
      font-weight: 700;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-pagination,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-pagination {
      display: flex !important;
      justify-content: center;
      padding: 8px 0 20px;
      margin: 0 !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active {
      background: var(--nr-app-accent) !important;
      border-color: var(--nr-app-accent) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active a {
      color: #ffffff !important;
    }

    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-item,
    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-prev,
    .new-reports-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-next,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-item,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-prev,
    .report-faults-list-wrap--mobile-portrait .new-reports-mobile-pagination .ant-pagination-next {
      min-width: 36px;
      height: 36px;
      line-height: 34px;
      border-radius: 10px !important;
    }
  }
`;
