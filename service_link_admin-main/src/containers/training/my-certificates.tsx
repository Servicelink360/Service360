import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { EyeOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Table, message } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from '../../library/helpers/api';
import {
  CertificateLayout,
  CertificatePreview,
  defaultCertificateLayout,
} from './certificatePreview';
import { TrainingAdminChromeStyles } from './trainingAdminChrome';

function previewLayout(row: any): CertificateLayout {
  const key = row?.layout?.templateKey || 'classic';
  return {
    ...defaultCertificateLayout(key),
    ...(row?.layout || {}),
    templateKey: row?.layout?.imageUrl ? 'custom' : key,
  };
}

const MyCertificatesPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewRow, setViewRow] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/my-certificates`,
        'GET',
        null,
      );
      if (res?.code === 1) setRows(res.data?.certificates || []);
      else message.error(res?.message || 'Could not load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const printCertificate = (row: any) => {
    if (!row?.url) {
      message.warning('This certificate file is not ready to print yet');
      return;
    }
    const win = window.open(row.url, '_blank', 'noopener');
    if (!win) {
      message.warning('Allow pop-ups to print the certificate');
      return;
    }
    win.addEventListener('load', () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* the opened certificate can still be printed from the browser */
      }
    });
  };

  return (
    <Layout>
      <TrainingAdminChromeStyles />
      <UsersDiv>
        <div className="ta-list-page">
          <div className="ta-list-chrome">
            <div className="ta-list-chrome-top">
              <div>
                <h2 className="ta-list-chrome-title">My certificates</h2>
                <p className="ta-list-chrome-sub">Certificates issued to you</p>
              </div>
              <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="ta-table-panel ta-cert-table">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'No certificates yet.' }}
              columns={[
                { title: 'Name', dataIndex: 'title' },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  ellipsis: true,
                  render: (value) => value || '-',
                },
                { title: 'Code', dataIndex: 'code', width: 220, render: (value) => value || '-' },
                {
                  title: 'Issued',
                  dataIndex: 'issuedAt',
                  width: 170,
                  render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                },
                {
                  title: 'Action',
                  key: 'actions',
                  width: 110,
                  align: 'right',
                  render: (_, row) => (
                    <Space
                      size={4}
                      className="new-reports-row-actions"
                      style={{ width: '100%', justifyContent: 'flex-end' }}
                    >
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        aria-label="View"
                        title="View"
                        onClick={() => setViewRow(row)}
                      />
                      <Button
                        type="link"
                        size="small"
                        icon={<PrinterOutlined />}
                        aria-label="Print"
                        title="Print"
                        onClick={() => printCertificate(row)}
                      />
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        </div>
        <Modal
          title={viewRow?.title || 'Certificate'}
          open={!!viewRow}
          footer={null}
          centered
          wrapClassName="cert-view-modal"
          onCancel={() => setViewRow(null)}
          width={800}
          style={{ top: 12, paddingBottom: 0 }}
          bodyStyle={{ overflow: 'hidden', padding: '8px 16px 12px' }}
          destroyOnClose
        >
          {viewRow ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CertificatePreview
                full
                sample={false}
                title={viewRow.title}
                layout={previewLayout(viewRow)}
                values={{
                  staff: viewRow.staffName,
                  title: viewRow.title,
                  modules: viewRow.modules,
                  date: viewRow.date,
                  code: viewRow.code,
                  score: viewRow.score,
                  module: viewRow.moduleCode,
                  valid: viewRow.valid,
                }}
              />
            </div>
          ) : null}
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default MyCertificatesPage;
