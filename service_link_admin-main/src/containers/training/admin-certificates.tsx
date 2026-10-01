import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, PrinterOutlined, ReloadOutlined, UndoOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Space, Table, Tabs, Upload, message } from 'antd';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync, callAPIUploadAsync } from '../../library/helpers/api';
import {
  CertificateLayout,
  CertificatePreview,
  defaultCertificateLayout,
} from './certificatePreview';
import { TrainingAdminChromeStyles } from './trainingAdminChrome';

const TrainingCertificatesPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { certificateId } = useParams<{ certificateId?: string }>();
  const isNew = location.pathname.endsWith('/new');
  const editing = isNew || (!!certificateId && certificateId !== 'new');
  const [rows, setRows] = useState<any[]>([]);
  const [issuedRows, setIssuedRows] = useState<any[]>([]);
  const [deletedRows, setDeletedRows] = useState<any[]>([]);
  const [certTab, setCertTab] = useState('definitions');
  const [loading, setLoading] = useState(false);
  const [issuedLoading, setIssuedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [templateImageUploading, setTemplateImageUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [form] = Form.useForm();
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/certificates`,
        'GET',
        null,
      );
      if (res?.code === 1) setRows(res.data?.certificates || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIssued = useCallback(async () => {
    setIssuedLoading(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/certificates/issued`,
        'GET',
        null,
      );
      if (res?.code === 1) setIssuedRows(res.data?.certificates || []);
      else message.error(res?.message || 'Could not load awarded certificates');
    } finally {
      setIssuedLoading(false);
    }
  }, []);

  const loadDeleted = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificates/deleted`,
      'GET',
      null,
    );
    if (res?.code === 1) setDeletedRows(res.data?.certificates || []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificate-templates`,
      'GET',
      null,
    );
    if (res?.code === 1) setTemplates(res.data?.templates || []);
  }, []);

  useEffect(() => {
    load();
    loadIssued();
    loadDeleted();
    loadTemplates();
  }, [load, loadDeleted, loadIssued, loadTemplates]);

  const printIssued = (row: any) => {
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

  useEffect(() => {
    if (!editing) return;
    if (isNew) {
      form.setFieldsValue({
        title: '',
        description: '',
        ...defaultCertificateLayout(),
        templateKey: undefined,
      });
      return;
    }
    const row = rows.find((item) => String(item.id) === String(certificateId));
    if (!row) return;
    form.setFieldsValue({
      title: row.title,
      description: row.description || '',
      ...defaultCertificateLayout(row.layout?.templateKey || row.templateKey || 'classic'),
      ...(row.layout || {}),
    });
  }, [editing, isNew, rows, certificateId, form]);

  const save = async () => {
    const values = await form.validateFields();
    const layout: CertificateLayout = {
      templateKey: values.imageUrl ? 'custom' : values.templateKey || '',
      orgName: values.orgName,
      heading: values.heading,
      lead: values.lead,
      completedLine: values.completedLine,
      body: values.body,
      signLeft: values.signLeft,
      signLeftRole: values.signLeftRole,
      signLeftNote: values.signLeftNote,
      signRight: values.signRight,
      signRightRole: values.signRightRole,
      signRightNote: values.signRightNote,
      staffLine: values.staffLine,
      moduleLine: values.moduleLine,
      dateLine: values.dateLine,
      imageUrl: values.imageUrl || '',
      logoUrl: values.logoUrl || '',
    };
    setSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/certificates`,
        'POST',
        {
          id: isNew ? undefined : +certificateId,
          title: String(values.title || '').trim(),
          description: String(values.description || '').trim(),
          layout,
        },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not save certificate');
        return;
      }
      message.success('Certificate saved');
      history.push('/training-admin/certificates');
    } finally {
      setSaving(false);
    }
  };

  const uploadTemplateImage = async (file: File) => {
    setTemplateImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'certificate-template.png');
      const res: any = await callAPIUploadAsync(
        serviceType.COMMON,
        endPoint.UPLOAD_FILE,
        'POST',
        formData,
      );
      const url =
        typeof res?.data === 'string'
          ? res.data
          : res?.data?.url || res?.data?.Location || res?.data?.fileUrl || null;
      if (res?.code !== 1 || !url) {
        message.error(res?.message || 'Upload failed');
        return;
      }
      setTemplateImageUrl(String(url));
    } finally {
      setTemplateImageUploading(false);
    }
  };

  const addTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      message.error('Enter a template name');
      return;
    }
    if (!templateImageUrl) {
      message.error('Upload a certificate image');
      return;
    }
    setTemplateSaving(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.TRAINING}/admin/certificate-templates`,
        'POST',
        {
          name,
          layout: {
            templateKey: 'custom',
            imageUrl: templateImageUrl,
            orgName: form.getFieldValue('orgName'),
            heading: form.getFieldValue('heading'),
            lead: form.getFieldValue('lead'),
            completedLine: form.getFieldValue('completedLine'),
            body: form.getFieldValue('body'),
            signLeft: form.getFieldValue('signLeft'),
            signLeftRole: form.getFieldValue('signLeftRole'),
            signLeftNote: form.getFieldValue('signLeftNote'),
            signRight: form.getFieldValue('signRight'),
            signRightRole: form.getFieldValue('signRightRole'),
            signRightNote: form.getFieldValue('signRightNote'),
            staffLine: form.getFieldValue('staffLine'),
            moduleLine: form.getFieldValue('moduleLine'),
            dateLine: form.getFieldValue('dateLine'),
            logoUrl: form.getFieldValue('logoUrl'),
          },
        },
      );
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not add template');
        return;
      }
      setTemplates(res.data?.templates || []);
      setAddTemplateOpen(false);
      setTemplateName('');
      setTemplateImageUrl('');
      message.success('Template added');
    } finally {
      setTemplateSaving(false);
    }
  };

  const removeTemplate = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificate-templates/${id}`,
      'DELETE',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not remove template');
      return;
    }
    setTemplates(res.data?.templates || []);
  };

  const applyTemplate = (layout: CertificateLayout) => {
    if (layout.imageUrl) {
      form.setFieldsValue({
        templateKey: 'custom',
        imageUrl: layout.imageUrl,
        orgName: layout.orgName,
        heading: layout.heading,
        lead: layout.lead,
        completedLine: layout.completedLine,
        body: layout.body,
        signLeft: layout.signLeft,
        signLeftRole: layout.signLeftRole,
        signLeftNote: layout.signLeftNote,
        signRight: layout.signRight,
        signRightRole: layout.signRightRole,
        signRightNote: layout.signRightNote,
        staffLine: layout.staffLine,
        moduleLine: layout.moduleLine,
        dateLine: layout.dateLine,
        logoUrl: layout.logoUrl || '',
      });
      return;
    }
    form.setFieldsValue({
      templateKey: layout.templateKey || 'classic',
      orgName: layout.orgName,
      heading: layout.heading,
      lead: layout.lead,
      completedLine: layout.completedLine,
      body: layout.body,
      signLeft: layout.signLeft,
      signLeftRole: layout.signLeftRole,
      signLeftNote: layout.signLeftNote,
      signRight: layout.signRight,
      signRightRole: layout.signRightRole,
      signRightNote: layout.signRightNote,
      staffLine: layout.staffLine,
      moduleLine: layout.moduleLine,
      dateLine: layout.dateLine,
      imageUrl: '',
      logoUrl: layout.logoUrl || '',
    });
  };

  const remove = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificates/${id}`,
      'DELETE',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not remove certificate');
      return;
    }
    message.success('Certificate moved to Deleted');
    setRows(res.data?.certificates || []);
    void loadDeleted();
  };

  const restore = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificates/${id}/restore`,
      'POST',
      {},
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not restore certificate');
      return;
    }
    message.success('Certificate restored');
    setRows(res.data?.certificates || []);
    void loadDeleted();
  };

  const purge = async (id: number) => {
    const res = await callAPIAsync(
      serviceType.COMMON,
      `${endPoint.TRAINING}/admin/certificates/${id}/permanent`,
      'DELETE',
      null,
    );
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete certificate');
      return;
    }
    message.success('Certificate permanently deleted');
    setDeletedRows(res.data?.certificates || []);
    void load();
  };

  if (editing) {
    return (
      <Layout title={isNew ? 'New certificate' : 'Edit certificate'}>
        <TrainingAdminChromeStyles />
        <UsersDiv>
          <div className="ta-list-page">
            <div className="ta-list-chrome">
              <div className="ta-list-chrome-top">
                <div>
                  <h2 className="ta-list-chrome-title">{isNew ? 'New certificate' : 'Edit certificate'}</h2>
                  <p className="ta-list-chrome-sub">
                    Use {'{staff}'}, {'{title}'}, {'{modules}'}, {'{date}'}, {'{score}'}, {'{module}'}, {'{valid}'} and {'{code}'}. Each one is filled in when the certificate is issued.
                  </p>
                </div>
                <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/training-admin/certificates')}>
                  Back
                </Button>
              </div>
            </div>
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 420px', maxWidth: 560, background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
                  <Form.Item name="title" label="Certificate name" rules={[{ required: true, message: 'Enter a name' }]}>
                    <Input maxLength={255} placeholder="Office safety certificate" />
                  </Form.Item>
                  <Form.Item name="description" label="Description">
                    <Input.TextArea rows={3} maxLength={2000} placeholder="What this certificate is for" />
                  </Form.Item>
                  <Form.Item name="templateKey" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="imageUrl" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="logoUrl" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Logo" shouldUpdate={(prev, next) => prev.logoUrl !== next.logoUrl}>
                    {() => (
                      <Space align="center">
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          customRequest={async ({ file, onSuccess, onError }) => {
                            setLogoUploading(true);
                            try {
                              const formData = new FormData();
                              const upload = file as File;
                              formData.append('file', upload, upload.name || 'certificate-logo.png');
                              const res: any = await callAPIUploadAsync(
                                serviceType.COMMON,
                                endPoint.UPLOAD_FILE,
                                'POST',
                                formData,
                              );
                              const url =
                                typeof res?.data === 'string'
                                  ? res.data
                                  : res?.data?.url || res?.data?.Location || res?.data?.fileUrl || null;
                              if (res?.code !== 1 || !url) {
                                message.error(res?.message || 'Upload failed');
                                onError?.(new Error('Upload failed'));
                                return;
                              }
                              form.setFieldsValue({ logoUrl: String(url) });
                              onSuccess?.({}, new XMLHttpRequest());
                            } catch (e) {
                              onError?.(e as Error);
                            } finally {
                              setLogoUploading(false);
                            }
                          }}
                        >
                          <Button size="small" icon={<UploadOutlined />} loading={logoUploading}>
                            Upload logo
                          </Button>
                        </Upload>
                        {form.getFieldValue('logoUrl') ? (
                          <>
                            <img src={form.getFieldValue('logoUrl')} alt="" style={{ height: 36, objectFit: 'contain' }} />
                            <Button size="small" onClick={() => form.setFieldsValue({ logoUrl: '' })}>
                              Remove
                            </Button>
                          </>
                        ) : null}
                      </Space>
                    )}
                  </Form.Item>
                  <Form.Item name="orgName" label="Organisation"><Input /></Form.Item>
                  <Form.Item name="heading" label="Heading"><Input /></Form.Item>
                  <Form.Item name="staffLine" label="Staff name line"><Input /></Form.Item>
                  <Form.Item name="lead" label="Line under the staff name"><Input /></Form.Item>
                  <Form.Item name="moduleLine" label="Certificate title line"><Input /></Form.Item>
                  <Form.Item name="completedLine" label="Completed line"><Input /></Form.Item>
                  <Form.Item name="dateLine" label="Date line"><Input /></Form.Item>
                  <Form.Item name="body" label="Body"><Input.TextArea rows={4} /></Form.Item>
                  <Form.Item name="signLeft" label="Left signature"><Input /></Form.Item>
                  <Form.Item name="signLeftRole" label="Left role"><Input /></Form.Item>
                  <Form.Item name="signLeftNote" label="Left note"><Input /></Form.Item>
                  <Form.Item name="signRight" label="Right signature"><Input /></Form.Item>
                  <Form.Item name="signRightRole" label="Right role"><Input /></Form.Item>
                  <Form.Item name="signRightNote" label="Right note"><Input /></Form.Item>
                  <Space>
                    <Button onClick={() => history.push('/training-admin/certificates')}>Cancel</Button>
                    <Button type="primary" loading={saving} onClick={() => void save()} style={{ background: '#188038', borderColor: '#188038' }}>
                      Save certificate
                    </Button>
                  </Space>
                </div>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const wording = {
                      orgName: form.getFieldValue('orgName'),
                      heading: form.getFieldValue('heading'),
                      lead: form.getFieldValue('lead'),
                      completedLine: form.getFieldValue('completedLine'),
                      body: form.getFieldValue('body'),
                      signLeft: form.getFieldValue('signLeft'),
                      signLeftRole: form.getFieldValue('signLeftRole'),
                      signLeftNote: form.getFieldValue('signLeftNote'),
                      signRight: form.getFieldValue('signRight'),
                      signRightRole: form.getFieldValue('signRightRole'),
                      signRightNote: form.getFieldValue('signRightNote'),
                      staffLine: form.getFieldValue('staffLine'),
                      moduleLine: form.getFieldValue('moduleLine'),
                      dateLine: form.getFieldValue('dateLine'),
                      logoUrl: form.getFieldValue('logoUrl'),
                    };
                    const cards = templates.map((template) => ({
                      key: `saved-${template.id}`,
                      name: template.name,
                      layout: {
                        ...defaultCertificateLayout(template.layout?.templateKey || 'custom'),
                        ...(template.layout || {}),
                        ...wording,
                        logoUrl: form.getFieldValue('logoUrl') || template.layout?.logoUrl || '',
                        imageUrl: template.layout?.imageUrl || '',
                        templateKey: template.layout?.templateKey || (template.layout?.imageUrl ? 'custom' : ''),
                      } as CertificateLayout,
                      id: template.id as number,
                    }));
                    return (
                      <div>
                        <Button
                          icon={<PlusOutlined />}
                          style={{ marginBottom: 12 }}
                          onClick={() => {
                            setTemplateName('');
                            setTemplateImageUrl('');
                            setAddTemplateOpen(true);
                          }}
                        >
                          Add template
                        </Button>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {!cards.length ? (
                            <div style={{ color: '#6b7280' }}>No templates yet. Add one to use it here.</div>
                          ) : null}
                          {cards.map((template) => {
                            const active = activeTemplateId === template.id;
                            return (
                              <div key={template.key} style={{ width: 280 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>{template.name}</div>
                                <div style={{ borderRadius: 8, outline: active ? '2px solid #166534' : 'none' }}>
                                  <CertificatePreview
                                    title={form.getFieldValue('title') || template.name}
                                    layout={template.layout}
                                  />
                                </div>
                                <Space size={8} style={{ marginTop: 8 }}>
                                  <Button
                                    size="small"
                                    type="primary"
                                    style={{ background: '#188038', borderColor: '#188038' }}
                                    onClick={() => {
                                      setActiveTemplateId(template.id);
                                      applyTemplate(template.layout);
                                    }}
                                  >
                                    Use this template
                                  </Button>
                                  {'id' in template ? (
                                    <Popconfirm
                                      title={`Delete template ${template.name}?`}
                                      okText="Delete"
                                      okButtonProps={{ danger: true }}
                                      cancelText="Cancel"
                                      onConfirm={() => void removeTemplate(template.id)}
                                    >
                                      <Button size="small" danger>
                                        Delete
                                      </Button>
                                    </Popconfirm>
                                  ) : null}
                                </Space>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>
              </div>
            </Form>
            <Modal
              title="Add template"
              open={addTemplateOpen}
              okText="Add template"
              confirmLoading={templateSaving}
              onOk={() => void addTemplate()}
              onCancel={() => setAddTemplateOpen(false)}
              destroyOnClose
            >
              <div style={{ marginBottom: 8 }}>Template name</div>
              <Input
                maxLength={255}
                value={templateName}
                placeholder="Office certificate"
                onChange={(e) => setTemplateName(e.target.value)}
                onPressEnter={() => void addTemplate()}
              />
              <div style={{ margin: '16px 0 8px' }}>Certificate image</div>
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    await uploadTemplateImage(file as File);
                    onSuccess?.({}, new XMLHttpRequest());
                  } catch (e) {
                    onError?.(e as Error);
                  }
                }}
              >
                <Button icon={<UploadOutlined />} loading={templateImageUploading}>
                  Upload image
                </Button>
              </Upload>
              {templateImageUrl ? (
                <img
                  src={templateImageUrl}
                  alt="New template"
                  style={{ display: 'block', width: 180, marginTop: 12, border: '1px solid #e5e7eb' }}
                />
              ) : (
                <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                  Upload your own certificate. This is not limited to Classic or Plain.
                </div>
              )}
            </Modal>
          </div>
        </UsersDiv>
      </Layout>
    );
  }

  const previewLayout = (row: any) => ({
    ...defaultCertificateLayout(row?.layout?.templateKey || row?.templateKey || 'classic'),
    ...(row?.layout || {}),
  });

  return (
    <Layout title="Certificates">
      <TrainingAdminChromeStyles />
      <UsersDiv>
        <div className="ta-list-page">
          <div className="ta-list-chrome">
            <div className="ta-list-chrome-top">
              <div>
                <h2 className="ta-list-chrome-title">Certificates</h2>
                <p className="ta-list-chrome-sub">
                  {certTab === 'issued'
                    ? 'Staff and the certificates awarded to them.'
                    : certTab === 'deleted'
                      ? 'Certificates removed from the list. Restore them, or delete them permanently.'
                      : 'Saved certificates. Assignments pick one of these.'}
                </p>
              </div>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => history.push('/training-admin')}>
                  Back
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    void load();
                    void loadIssued();
                    void loadDeleted();
                  }}
                  loading={loading || issuedLoading}
                >
                  Refresh
                </Button>
                {certTab === 'definitions' ? (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => history.push('/training-admin/certificates/new')}
                  >
                    New
                  </Button>
                ) : null}
              </Space>
            </div>
          </div>
          <Tabs
            activeKey={certTab}
            onChange={setCertTab}
            style={{ marginTop: 12 }}
            items={[
              { key: 'definitions', label: `Certificates (${rows.length})` },
              { key: 'issued', label: `Awarded certificates (${issuedRows.length})` },
              { key: 'deleted', label: `Deleted (${deletedRows.length})` },
            ]}
          />
          {certTab === 'issued' ? (
            <div className="ta-table-panel ta-cert-table">
              <Table
                rowKey="id"
                loading={issuedLoading}
                dataSource={issuedRows}
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: 'No certificates have been awarded yet.' }}
                columns={[
                  { title: 'Staff', dataIndex: 'staffName', render: (value) => value || '-' },
                  { title: 'Certificate', dataIndex: 'title' },
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
                          onClick={() => setViewRow({ ...row, issuedView: true })}
                        />
                        <Button
                          type="link"
                          size="small"
                          icon={<PrinterOutlined />}
                          aria-label="Print"
                          title="Print"
                          onClick={() => printIssued(row)}
                        />
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          ) : certTab === 'deleted' ? (
          <div className="ta-table-panel ta-cert-table">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={deletedRows}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'Nothing in Deleted.' }}
              columns={[
                { title: 'Name', dataIndex: 'title' },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  ellipsis: true,
                  render: (value) => value || '-',
                },
                {
                  title: 'Deleted',
                  dataIndex: 'deletedAt',
                  width: 170,
                  render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                },
                {
                  title: 'Action',
                  key: 'actions',
                  width: 140,
                  align: 'right',
                  render: (_, row) => (
                    <Space size={4} style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        aria-label="View"
                        title="View"
                        onClick={() => setViewRow(row)}
                      />
                      <Popconfirm
                        title="Restore this certificate to the Certificates list?"
                        okText="Restore"
                        cancelText="Cancel"
                        onConfirm={() => void restore(row.id)}
                      >
                        <Button type="link" size="small" icon={<UndoOutlined />} aria-label="Restore" title="Restore" />
                      </Popconfirm>
                      <Popconfirm
                        title={
                          <span>
                            Permanently delete this certificate?
                            <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                              This cannot be undone.
                            </div>
                          </span>
                        }
                        okText="Delete permanently"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                        onConfirm={() => void purge(row.id)}
                      >
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label="Delete permanently"
                          title="Delete permanently"
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
          ) : (
          <div className="ta-table-panel ta-cert-table">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={rows}
              pagination={{ pageSize: 20 }}
              locale={{ emptyText: 'No certificates yet. Use New to add one.' }}
              columns={[
                { title: 'Name', dataIndex: 'title' },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  ellipsis: true,
                  render: (value) => value || '-',
                },
                {
                  title: 'Template',
                  dataIndex: 'templateKey',
                  width: 140,
                  render: (_, row) => row.layout?.imageUrl ? 'Uploaded' : (row.templateKey || '—'),
                },
                {
                  title: 'Created at',
                  dataIndex: 'createdAt',
                  width: 170,
                  render: (value) => (value ? moment(value).format('DD MMM YYYY HH:mm') : '-'),
                },
                {
                  title: 'Action',
                  key: 'actions',
                  width: 140,
                  align: 'right',
                  render: (_, row) => (
                    <Space
                      size={4}
                      className="new-reports-row-actions"
                      style={{ width: '100%', justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        aria-label="Edit"
                        title="Edit"
                        onClick={() => history.push(`/training-admin/certificates/${row.id}`)}
                      />
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        aria-label="View"
                        title="View"
                        onClick={() => setViewRow(row)}
                      />
                      <Popconfirm
                        title={
                          <span>
                            Move this certificate to Deleted?
                            <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: '#595959' }}>
                              You can permanently delete it later from the Deleted tab.
                            </div>
                          </span>
                        }
                        okText="Move to Deleted"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                        onConfirm={() => void remove(row.id)}
                      >
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label="Delete"
                          title="Delete"
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
          )}
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
                sample={!viewRow.issuedView}
                title={viewRow.title}
                layout={previewLayout(viewRow)}
                values={
                  viewRow.issuedView
                    ? {
                        staff: viewRow.staffName,
                        title: viewRow.title,
                        modules: viewRow.modules,
                        date: viewRow.date,
                        code: viewRow.code,
                        score: viewRow.score,
                        module: viewRow.moduleCode,
                        valid: viewRow.valid,
                      }
                    : undefined
                }
              />
            </div>
          ) : null}
        </Modal>
      </UsersDiv>
    </Layout>
  );
};

export default TrainingCertificatesPage;
