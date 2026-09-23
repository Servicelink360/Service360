import { createGlobalStyle } from "styled-components";

/**
 * True app-style list shell for New Reports + Report Faults on mobile portrait.
 * Structure (sizes, spacing, radii) is identical in light and dark; only palette differs.
 */
export const ReportsMobileAppShellStyles = createGlobalStyle`
  @media (orientation: portrait) and (max-width: 768px) {
    /* Same full-bleed shell as dark mode � no isoBoxWrapper card inset on mobile. */
    body:has(.new-reports-list-wrap--mobile-portrait) .isoBoxWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait) .isoLayoutContentWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait) .isoExampleWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait) #main-content,
    body:has(.new-reports-list-wrap--mobile-portrait) .isomorphicContent,
    body:has(.report-faults-list-wrap--mobile-portrait) .isoBoxWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait) .isoLayoutContentWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait) .isoExampleWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait) #main-content,
    body:has(.report-faults-list-wrap--mobile-portrait) .isomorphicContent {
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      -webkit-box-shadow: none !important;
    }

    /* Fixed top bar sits over the first row. Keep Filters / New / search below it. */
    body:has(.report-faults-list-wrap--mobile-portrait) #main-content {
      padding-top: 72px !important;
    }

    body:has(.new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoBoxWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoLayoutContentWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoExampleWrapper,
    body:has(.new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) #main-content,
    body:has(.new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isomorphicContent,
    body:has(.report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoBoxWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoLayoutContentWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isoExampleWrapper,
    body:has(.report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) #main-content,
    body:has(.report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark)) .isomorphicContent {
      background: #e7f0e4 !important;
    }

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
      background: var(--nr-app-bg) !important;
    }

    .new-reports-list-wrap--mobile-portrait {
      overflow-x: hidden !important;
    }

    /* Faults: overflow-x hidden on this flex column collapses the toolbar to 0. */
    .report-faults-list-wrap--mobile-portrait {
      overflow: visible !important;
      align-items: stretch !important;
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
      width: 100%;
      align-self: stretch;
      min-height: calc(100vh - 56px);
      background: var(--nr-app-bg);
    }

    .report-faults-list-wrap--mobile-portrait .nr-list-page > .nr-app-top {
      flex: 0 0 auto;
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

    .report-faults-list-wrap--mobile-portrait .nr-app-top {
      position: relative !important;
      top: auto !important;
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      flex: 0 0 auto !important;
      overflow: visible !important;
      align-self: stretch !important;
      z-index: 2 !important;
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
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2) !important;
    }

    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-app-fab,
    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-app-fab {
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

    /* Search / filter inputs � same dimensions in light and dark */
    .new-reports-list-wrap--mobile-portrait .ant-input,
    .new-reports-list-wrap--mobile-portrait .ant-input-affix-wrapper,
    .new-reports-list-wrap--mobile-portrait .ant-select-selector,
    .new-reports-list-wrap--mobile-portrait .ant-picker,
    .report-faults-list-wrap--mobile-portrait .ant-input,
    .report-faults-list-wrap--mobile-portrait .ant-input-affix-wrapper,
    .report-faults-list-wrap--mobile-portrait .ant-select-selector,
    .report-faults-list-wrap--mobile-portrait .ant-picker {
      border-radius: 12px !important;
      font-size: 16px !important;
      min-height: 48px;
    }

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
    }

    .new-reports-list-wrap--mobile-portrait .ant-form-item-label > label,
    .report-faults-list-wrap--mobile-portrait .ant-form-item-label > label {
      font-size: 15px !important;
      font-weight: 600 !important;
    }

    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-form-item-label > label,
    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .nr-app-filter-sheet .ant-form-item-label > label,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-form-item-label > label,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .nr-app-filter-sheet .ant-form-item-label > label {
      color: #ffffff !important;
      font-weight: 700 !important;
      opacity: 1 !important;
    }

    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-select-selection-item,
    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .nr-app-filter-sheet .ant-select-selection-item,
    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-picker-input > input,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-select-selection-item,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-picker-input > input {
      color: #ffffff !important;
    }

    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-select-selection-placeholder,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-select-selection-placeholder,
    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-input::placeholder,
    .new-reports-list-wrap--mobile-portrait.new-reports-theme-dark .ant-picker-input > input::placeholder,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-input::placeholder,
    .report-faults-list-wrap--mobile-portrait.new-reports-theme-dark .ant-picker-input > input::placeholder {
      color: #e0e0e0 !important;
      opacity: 1 !important;
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
      border-radius: 8px !important;
      background: var(--nr-app-surface) !important;
      border: 1px solid var(--nr-app-border) !important;
      box-shadow: none !important;
    }

    .new-reports-list-wrap--mobile-portrait .nr-mobile-reports-list,
    .report-faults-list-wrap--mobile-portrait .nr-mobile-faults-list {
      gap: 12px !important;
      padding: 12px 0 24px !important;
      background: transparent !important;
    }

    /* Report / fault cards � same structure in light and dark */
    .new-reports-list-wrap--mobile-portrait .nr-mobile-report-card,
    .report-faults-list-wrap--mobile-portrait .nr-mobile-fault-card {
      border-radius: 12px !important;
      border-width: 2px !important;
      border-style: solid !important;
      box-shadow: 0 0 0 1px #3d3d3d, 0 8px 28px rgba(0, 0, 0, 0.85) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-fault-card {
      background: var(--nr-app-surface) !important;
      border-color: var(--nr-app-border) !important;
      box-shadow: 0 0 0 1px #b7d0b0, 0 8px 28px rgba(31, 107, 58, 0.14) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-report-card > div:first-child {
      border-bottom-color: var(--nr-app-border) !important;
      background: #f4faf3 !important;
    }

    /* Fault cards: light head matches card surface (same structure as dark). */
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .nr-mobile-fault-card > div:first-child {
      border-bottom-color: var(--nr-app-border) !important;
      background: var(--nr-app-surface) !important;
    }

    .report-faults-list-wrap--mobile-portrait .nr-mobile-fault-card > div:last-child {
      border-top: 1px solid var(--nr-app-border) !important;
      background: transparent !important;
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

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active {
      background: var(--nr-app-accent) !important;
      border-color: var(--nr-app-accent) !important;
    }

    .new-reports-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active a,
    .report-faults-list-wrap--mobile-portrait:not(.new-reports-theme-dark) .new-reports-mobile-pagination .ant-pagination-item-active a {
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
