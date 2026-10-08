import { CameraOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { userType } from '@app/constants/statusUser';
import { callAPIAsync } from '@app/library/helpers/api';
import {
  captureStampedPhotoToPhone,
  endCameraSession,
  peekCameraSession,
  saveCapturedPhotoInApp,
  startCameraSession,
  type CameraSaveTarget,
} from '@app/library/helpers/field-camera';
import { deletePhonePhoto, listPhonePhotos } from '@app/library/helpers/phone-photos';
import { Button, Empty, Image, message, Popconfirm, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CameraSaveChoice from './CameraSaveChoice';

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

function PhotoCard({ url, name, caption, onDelete }: { url: string; name?: string; caption: string; onDelete: () => void }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ height: 240, background: '#111', overflow: 'hidden' }}>
        <Image
          src={url}
          alt=""
          wrapperStyle={{ display: 'block', width: '100%', height: 240 }}
          style={{ display: 'block', width: '100%', height: 240, objectFit: 'cover', objectPosition: 'center bottom' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8 }}>
        <div style={{ fontSize: 12, color: '#444', minWidth: 0 }}>
          {name ? <div style={{ fontWeight: 600 }}>{name}</div> : null}
          <div>{caption}</div>
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const appCameraRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [phonePhotos, setPhonePhotos] = useState<LocalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState(false);
  const [target, setTarget] = useState<CameraSaveTarget>('app');
  const [savedCount, setSavedCount] = useState(0);
  const [flash, setFlash] = useState(false);

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
        setPhonePhotos(next);
      })
      .catch(() => undefined);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const openLive = useCallback((next: CameraSaveTarget) => {
    const current = peekCameraSession();
    const video = videoRef.current;
    if (current?.stream && video) {
      video.srcObject = current.stream;
      void video.play().catch(() => undefined);
    }
    setTarget(next);
    setSavedCount(0);
    setLive(true);
  }, []);

  useEffect(() => {
    const mode = new URLSearchParams(location.search).get('camera');
    const current = peekCameraSession();
    if (mode === 'phone' && current?.stream) {
      openLive('phone');
    }
  }, [location.search, openLive]);

  useEffect(() => {
    if (!live) return;
    const current = peekCameraSession();
    const video = videoRef.current;
    if (!current?.stream || !video) return;
    video.srcObject = current.stream;
    void video.play().catch(() => undefined);
  }, [live]);

  const chooseTarget = (next: CameraSaveTarget) => {
    if (next === 'app') {
      setChoiceOpen(false);
      appCameraRef.current?.click();
      return;
    }
    setStarting(true);
    void (async () => {
      try {
        await startCameraSession(next);
        setChoiceOpen(false);
        openLive(next);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        message.error(error?.message || 'Could not open the camera');
      } finally {
        setStarting(false);
      }
    })();
  };

  const saveInApp = async (file: File) => {
    const saved = await saveCapturedPhotoInApp(file);
    setPhotos((prev) => [{ ...saved, takenBy: profile?.fullName || profile?.username || '' }, ...prev]);
  };

  const shutter = () => {
    const video = videoRef.current;
    if (!video) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    if (target === 'phone') {
      void (async () => {
        try {
          const saved = await captureStampedPhotoToPhone(video);
          const url = URL.createObjectURL(saved.blob);
          setPhonePhotos((prev) => [{ id: saved.id, url, createdAt: saved.createdAt }, ...prev]);
          setSavedCount((count) => count + 1);
        } catch (error: any) {
          message.error(error?.message || 'Could not save the photo');
        }
      })();
    }
  };

  const closeLive = () => {
    endCameraSession();
    setLive(false);
  };

  const flipCamera = async () => {
    const current = peekCameraSession();
    const facing = current?.facing === 'user' ? 'environment' : 'user';
    try {
      await startCameraSession(target, facing);
      const video = videoRef.current;
      const next = peekCameraSession();
      if (video && next?.stream) {
        video.srcObject = next.stream;
        void video.play().catch(() => undefined);
      }
    } catch (error: any) {
      message.error(error?.message || 'Could not switch camera');
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

  const removePhone = async (id: string) => {
    await deletePhonePhoto(id);
    setPhonePhotos((prev) => {
      const found = prev.find((photo) => photo.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const statusText = target === 'app'
    ? `${savedCount} saved in the app`
    : `${savedCount} saved on the phone`;

  return (
    <Layout title="Camera">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '8px 12px 32px' }}>
        <h1 style={{ fontSize: 22, margin: '8px 0 4px' }}>Camera</h1>
        <p style={{ margin: '0 0 16px', color: '#555' }}>
          Save to the phone keeps the picture on this phone. Save in the app sends it to Service360. Neither is part of a report.
        </p>
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
          busy={starting}
          onCancel={() => setChoiceOpen(false)}
          onChoose={chooseTarget}
        />
        <input
          ref={appCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
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
      {live ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ flex: 1, width: '100%', objectFit: 'cover', background: '#000' }}
          />
          {flash ? <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.7, pointerEvents: 'none' }} /> : null}
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
            <button type="button" onClick={closeLive} aria-label="Close camera" style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
              <CloseOutlined />
            </button>
            <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: '6px 12px', fontSize: 14 }}>{statusText}</div>
            <button type="button" onClick={() => void flipCamera()} aria-label="Switch camera" style={{ height: 44, borderRadius: 22, border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '0 12px' }}>
              Flip
            </button>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              aria-label="Take photo"
              onClick={shutter}
              style={{ width: 74, height: 74, borderRadius: 37, border: '4px solid #fff', background: '#fff', boxShadow: '0 0 0 6px rgba(255,255,255,0.25)' }}
            />
          </div>
        </div>
      ) : null}
    </Layout>
  );
};

export default FieldPhotosPage;
