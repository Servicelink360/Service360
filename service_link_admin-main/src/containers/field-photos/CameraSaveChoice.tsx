import useMobilePortrait from '@app/library/hooks/useMobilePortrait';
import { Button, Modal } from 'antd';
import React from 'react';
import type { CameraSaveTarget } from '@app/library/helpers/field-camera';

const CameraSaveChoice: React.FC<{
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onChoose: (target: CameraSaveTarget) => void;
}> = ({ visible, busy, onCancel, onChoose }) => {
  const portrait = useMobilePortrait();
  return (
    <Modal
      title="Camera"
      visible={visible}
      open={visible}
      footer={null}
      onCancel={busy ? undefined : onCancel}
      destroyOnClose
      centered={portrait}
      width={portrait ? 'calc(100vw - 24px)' : 420}
      wrapClassName={portrait ? 'camera-save-choice camera-save-choice--portrait' : 'camera-save-choice'}
    >
      <style>{`
        .camera-save-choice .ant-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #143d24;
        }
        .camera-save-choice .ant-modal-body {
          padding-top: 8px;
        }
        .camera-save-choice__lead {
          margin: 0 0 14px;
          color: #1a1a1a;
          font-size: 16px;
          line-height: 1.4;
          font-weight: 600;
        }
        .camera-save-choice__actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .camera-save-choice__actions .ant-btn {
          height: 56px !important;
          font-size: 17px !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          white-space: normal;
        }
        .camera-save-choice__phone.ant-btn {
          background: #ffffff !important;
          color: #143d24 !important;
          border: 2px solid #1f6b3a !important;
        }
        .camera-save-choice__app.ant-btn {
          background: #1f6b3a !important;
          border-color: #1f6b3a !important;
          color: #ffffff !important;
        }
        .camera-save-choice--portrait .ant-modal {
          max-width: calc(100vw - 24px);
          margin: 0 auto;
          padding-bottom: 0;
        }
        .camera-save-choice--portrait .ant-modal-content {
          border-radius: 16px;
        }
        .camera-save-choice--portrait .ant-modal-header {
          border-radius: 16px 16px 0 0;
          padding: 16px 16px 8px;
        }
        .camera-save-choice--portrait .ant-modal-body {
          padding: 8px 16px 20px;
        }
        .camera-save-choice--portrait .ant-modal-title {
          font-size: 22px;
        }
        .camera-save-choice--portrait .camera-save-choice__lead {
          font-size: 17px;
        }
        .camera-save-choice--portrait .camera-save-choice__actions .ant-btn {
          height: 64px !important;
          font-size: 18px !important;
        }
      `}</style>
      <p className="camera-save-choice__lead">Where should this photo go?</p>
      <div className="camera-save-choice__actions">
        <Button className="camera-save-choice__phone" block disabled={busy} onClick={() => onChoose('phone')}>
          Save to the phone
        </Button>
        <Button className="camera-save-choice__app" block disabled={busy} onClick={() => onChoose('app')}>
          Save in the app
        </Button>
      </div>
    </Modal>
  );
};

export default CameraSaveChoice;
