import React from 'react';

export const TrainingAdminChromeStyles: React.FC = () => (
  <style>
    {`
      .ta-list-page { width: 100%; max-width: 100%; box-sizing: border-box; }
      .ta-list-chrome {
        width: 100%;
        box-sizing: border-box;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px 16px 14px;
      }
      .ta-list-chrome-top {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .ta-list-chrome-title {
        margin: 0 0 2px;
        font-size: 22px;
        font-weight: 700;
        color: #166534;
        line-height: 1.2;
      }
      .ta-list-chrome-sub { margin: 0; font-size: 12px; color: #6b7280; }
      .ta-toolbar {
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
      }
      .ta-toolbar .ant-input-affix-wrapper,
      .ta-toolbar .ant-select { border-radius: 8px !important; }
      .ta-field { display: flex; flex-direction: column; gap: 4px; min-width: 220px; flex: 1; }
      .ta-field label {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .ta-btn-green.ant-btn {
        background: #188038 !important;
        border-color: #188038 !important;
        color: #fff !important;
        border-radius: 8px;
        height: 36px;
        padding: 0 16px;
        font-weight: 600;
      }
      .ta-btn-outline.ant-btn {
        background: #fff !important;
        border: 1px solid #86efac !important;
        color: #166534 !important;
        border-radius: 8px;
        height: 36px;
        font-weight: 600;
      }
      .ta-table-panel {
        width: 100%;
        margin-top: 14px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
      }
      .ta-table-panel .ant-table-pagination { margin: 12px 16px !important; }
      .cert-view-modal { overflow: hidden !important; }
      .cert-view-modal .ant-modal-body { overflow: hidden !important; }
      .ta-cert-table .ant-table-thead > tr > th {
        background: #188038 !important;
        color: #fff !important;
        font-weight: 600;
        border-bottom: none !important;
      }
      .ta-row-link { color: #166534; font-weight: 600; cursor: pointer; }
      .ta-row-link:hover { color: #188038; }
    `}
  </style>
);
