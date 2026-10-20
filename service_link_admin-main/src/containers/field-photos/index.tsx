import { CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { userType } from '@app/constants/statusUser';
import { callAPIAsync } from '@app/library/helpers/api';
import { saveCapturedPhotoInApp, type CameraSaveTarget } from '@app/library/helpers/field-camera';
import { deletePhonePhoto, listPhonePhotos } from '@app/library/helpers/phone-photos';
import { Button, Empty, Image, message, Popconfirm, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CameraSaveChoice from './CameraSaveChoice';
import PhoneCamera from './PhoneCamera';
import { beginPhoneLocation, primeShutter, requestPhoneCamera } from '@app/library/helpers/phone-shot';

type FieldPhoto = {
  id: number;
  url: string;
  address: string;
  createdAt: string;
  userId: number;
  takenBy?: string;
};

type LocalPhoto = {
  id: string;
  url: string;
  createdAt: string;
};

function PhotoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>{children}</div>
  );
}

function PhotoCard({ url, name, caption, address, onDelete }: { url: string; name?: string; caption: string; address?: string; onDelete: () => void }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ height: 240, background: '#111', overflow: 'hidden' }}>
        <Image
          src={url}
          alt=""
          wrapperStyle={{ display: 'block', width: '100%', height: 240 }}
          style={{ display: 'block', width: '100%', height: 240, objectFit: 'contain', objectPosition: 'center bottom', background: '#111' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8 }}>
        <div style={{ fontSize: 14, color: '#222', minWidth: 0, lineHeight: 1.35 }}>
          {name ? <div style={{ fontWeight: 700 }}>{name}</div> : null}
          {caption ? <div>{caption}</div> : null}
          {address ? <div style={{ whiteSpace: 'pre-line' }}>{address}</div> : null}
        </div>
        <Popconfirm title="Delete this photo?" okText="Delete" cancelText="Cancel" onConfirm={onDelete}>
          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete photo" />
        </Popconfirm>
      </div>
    </div>
  );
}

const FieldPhotosPage: React.FC = () => {
  const location = useLocation();
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;
  const isAdmin = profileType === userType.ADMIN;
  const allowed = profileType === userType.ADMIN || profileType === userType.STAFF;

  const appCameraRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [phonePhotos, setPhonePhotos] = useState<LocalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneSave, setPhoneSave] = useState<CameraSaveTarget>('phone');
  const [phoneRequest, setPhoneRequest] = useState<Promise<MediaStream> | null>(null);

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
  }, [load, location.key]);

  useEffect(() => {
    const urls: string[] = [];
    void listPhonePhotos()
      .then((rows) => {
        const next = rows.map((row) => {
          const url = URL.createObjectURL(row.blob);
          urls.push(url);
          return { id: row.id, url, createdAt: row.createdAt };
        });
        setPhonePhotos((prev) => {
          const ids = new Set(next.map((photo) => photo.id));
          return [...prev.filter((photo) => !ids.has(photo.id)), ...next];
        });
      })
      .catch(() => undefined);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const openPhoneCamera = (target: CameraSaveTarget) => {
    beginPhoneLocation();
    if (!navigator.mediaDevices?.getUserMedia) {
      if (target === 'app') {
        appCameraRef.current?.click();
        return;
      }
      message.error('This phone browser cannot open the camera.');
      return;
    }
    primeShutter();
    const pending = requestPhoneCamera('environment');
    setPhoneSave(target);
    setPhoneRequest(pending);
    setPhoneOpen(true);
  };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('camera') === 'phone') openPhoneCamera('phone');
  }, [location.search]);

  const chooseTarget = (next: CameraSaveTarget) => {
    setChoiceOpen(false);
    openPhoneCamera(next);
  };

  const saveInApp = async (file: File) => {
    const saved = await saveCapturedPhotoInApp(file);
    setPhotos((prev) => [{ ...saved, takenBy: profile?.fullName || profile?.username || '' }, ...prev]);
  };

  const removePhoto = async (id: number) => {
    const res = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'DELETE', { id });
    if (res?.code !== 1) {
      message.error(res?.message || 'Could not delete the photo');
      return;
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const removePhone = async (id: string) => {
    await deletePhonePhoto(id);
    setPhonePhotos((prev) => {
      const found = prev.find((photo) => photo.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((photo) => photo.id !== id);
    });
  };

  return (
    <Layout title="Camera">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '8px 12px 32px' }}>
        <h1 style={{ fontSize: 22, margin: '8px 0 16px' }}>Camera</h1>
        {allowed ? (
          <Button
            type="primary"
            size="large"
            icon={<CameraOutlined />}
            onClick={() => setChoiceOpen(true)}
            style={{ background: '#1f6b3a', borderColor: '#1f6b3a', height: 48, fontSize: 16 }}
          >
            Take photo
          </Button>
        ) : (
          <p>Camera is available to staff and admin.</p>
        )}
        <CameraSaveChoice
          visible={choiceOpen}
          busy={false}
          onCancel={() => setChoiceOpen(false)}
          onChoose={chooseTarget}
        />
        <input
          ref={appCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ position: 'fixed', left: 0, top: 0, width: 1, height: 1, opacity: 0 }}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (!chosen) return;
            const hide = message.loading('Saving the photo in the app...', 0);
            void saveInApp(chosen)
              .then(() => message.success('Photo saved in the app'))
              .catch((error: any) => message.error(error?.message || 'Could not save the photo'))
              .finally(() => {
                hide();
                if (appCameraRef.current) appCameraRef.current.value = '';
              });
          }}
        />
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>In the app</h2>
          {loading ? (
            <Spin />
          ) : photos.length === 0 ? (
            <Empty description="No photos saved in the app yet" />
          ) : (
            <Image.PreviewGroup>
              <PhotoGrid>
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    url={photo.url}
                    name={isAdmin ? photo.takenBy : ''}
                    caption={photo.createdAt ? new Date(photo.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : ''}
                    address={photo.address}
                    onDelete={() => removePhoto(photo.id)}
                  />
                ))}
              </PhotoGrid>
            </Image.PreviewGroup>
          )}
          {phonePhotos.length > 0 ? (
            <>
              <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>On this phone</h2>
              <Image.PreviewGroup>
                <PhotoGrid>
                  {phonePhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      url={photo.url}
                      caption={photo.createdAt ? new Date(photo.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }) : ''}
                      onDelete={() => removePhone(photo.id)}
                    />
                  ))}
                </PhotoGrid>
              </Image.PreviewGroup>
            </>
          ) : null}
        </div>
      </div>
      {phoneOpen && phoneRequest ? (
        <PhoneCamera
          request={phoneRequest}
          saveTo={phoneSave}
          onSaved={(saved) => {
            setPhotos((prev) => [{ ...saved, takenBy: profile?.fullName || profile?.username || '' }, ...prev]);
          }}
          onClose={() => setPhoneOpen(false)}
        />
      ) : null}
    </Layout>
  );
};

export default FieldPhotosPage;
