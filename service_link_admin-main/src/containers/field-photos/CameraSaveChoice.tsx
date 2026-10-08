import { Button, Modal } from 'antd';
import React from 'react';
import type { CameraSaveTarget } from '@app/library/helpers/field-camera';

const CameraSaveChoice: React.FC<{
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onChoose: (target: CameraSaveTarget) => void;
}> = ({ visible, busy, onCancel, onChoose }) => (
  <Modal
    title="Camera"
    visible={visible}
    open={visible}
    footer={null}
    confirmLoading={busy}
    onCancel={busy ? undefined : onCancel}
    destroyOnClose
  >
    <p style={{ marginTop: 0 }}>
      Choose once. The camera stays open. Each photo is saved straight away.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Button size="large" block disabled={busy} onClick={() => onChoose('phone')}>
        Save to the phone
      </Button>
      <Button
        size="large"
        block
        type="primary"
        disabled={busy}
        onClick={() => onChoose('app')}
        style={{ background: '#1f6b3a', borderColor: '#1f6b3a' }}
      >
        Save in the app
      </Button>
    </div>
  </Modal>
);

export default CameraSaveChoice;
