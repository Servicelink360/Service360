import { CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { userType } from '@app/constants/statusUser';
import { callAPIAsync, callAPIUploadAsync } from '@app/library/helpers/api';
import { createStampedPhoto } from '@app/library/helpers/stamp-photo';
import { Button, Empty, Image, message, Popconfirm, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type FieldPhoto = {
  id: number;
  url: string;
  address: string;
  createdAt: string;
  userId: number;
  takenBy?: string;
};

const FieldPhotosPage: React.FC = () => {
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;
  const isAdmin = profileType === userType.ADMIN;
  const allowed = profileType === userType.ADMIN || profileType === userType.STAFF;

  const cameraRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    const res = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'GET', null);
    if (res?.code === 1) setPhotos(res.data || []);
    else message.error(res?.message || 'Could not load photos');
    setLoading(false);
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const takePhoto = async (chosen?: File) => {
    if (!chosen) return;
    setSaving(true);
    const hide = message.loading('Adding time and address to the photo…', 0);
    try {
      const stamped = await createStampedPhoto(chosen);
      const formData = new FormData();
      formData.append('file', stamped.file, stamped.file.name);
      const uploaded = await callAPIUploadAsync(serviceType.COMMON, endPoint.UPLOAD_FILE, 'POST', formData);
      const url = String(uploaded?.data || '').trim();
      if (uploaded?.code !== 1 || !url) throw new Error(uploaded?.message || 'Could not upload the photo');
      const saved = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'POST', {
        fileUrl: url,
        address: stamped.address,
      });
      if (saved?.code !== 1) throw new Error(saved?.message || 'Could not save the photo');
      setPhotos((prev) => [{ ...saved.data, takenBy: profile?.fullName || profile?.username || '' }, ...prev]);
      message.success('Photo saved');
    } catch (error: any) {
      message.error(error?.message || 'Could not take the photo');
    } finally {
      hide();
      setSaving(false);
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const removePhoto = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'DELETE', { id });
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete the photo');
      return;
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  return (
    <Layout title="Camera">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '8px 12px 32px' }}>
        <h1 style={{ fontSize: 22, margin: '8px 0 4px' }}>Camera</h1>
        <p style={{ margin: '0 0 16px', color: '#555' }}>
          Photos are saved here with the time and street address on the picture. They are not part of a report.
        </p>
        {allowed ? (
          <>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                void takePhoto(chosen);
              }}
            />
            <Button
              type="primary"
              size="large"
              icon={<CameraOutlined />}
              loading={saving}
              onClick={() => cameraRef.current?.click()}
              style={{ background: '#1f6b3a', borderColor: '#1f6b3a', height: 48, fontSize: 16 }}
            >
              Take photo
            </Button>
          </>
        ) : (
          <p>Camera is available to staff and admin.</p>
        )}
        <div style={{ marginTop: 20 }}>
          {loading ? (
            <Spin />
          ) : photos.length === 0 ? (
            <Empty description="No photos yet" />
          ) : (
            <Image.PreviewGroup>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {photos.map((photo) => (
                  <div key={photo.id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <Image src={photo.url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8 }}>
                      <div style={{ fontSize: 12, color: '#444', minWidth: 0 }}>
                        {isAdmin && photo.takenBy ? <div style={{ fontWeight: 600 }}>{photo.takenBy}</div> : null}
                        <div>{photo.createdAt ? new Date(photo.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : ''}</div>
                      </div>
                      <Popconfirm title="Delete this photo?" okText="Delete" cancelText="Cancel" onConfirm={() => removePhoto(photo.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete photo" />
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FieldPhotosPage;
