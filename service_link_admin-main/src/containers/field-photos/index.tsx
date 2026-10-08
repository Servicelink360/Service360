import { CameraOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { userType } from '@app/constants/statusUser';
import { callAPIAsync, callAPIUploadAsync } from '@app/library/helpers/api';
import {
  captureStampedPhotoToPhone,
  endCameraSession,
  peekCameraSession,
  startCameraSession,
  type CameraSaveTarget,
} from '@app/library/helpers/field-camera';
import { createStampedPhoto } from '@app/library/helpers/stamp-photo';
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

function grabFrame(video: HTMLVideoElement) {
  const width = video.videoWidth || 0;
  const height = video.videoHeight || 0;
  if (!width || !height) throw new Error('Camera is not ready');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not take the photo');
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not take the photo'));
        return;
      }
      resolve(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}

const FieldPhotosPage: React.FC = () => {
  const location = useLocation();
  const profileRaw = localStorage.getItem('profile');
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const profileType = profile ? +profile.type : 0;
  const isAdmin = profileType === userType.ADMIN;
  const allowed = profileType === userType.ADMIN || profileType === userType.STAFF;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
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
  }, [load]);

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
    if ((mode === 'phone' || mode === 'app') && current?.stream) {
      openLive(mode);
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

  const chooseTarget = async (next: CameraSaveTarget) => {
    setStarting(true);
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
  };

  const saveInApp = async (file: File, address: string) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const uploaded = await callAPIUploadAsync(serviceType.COMMON, endPoint.UPLOAD_FILE, 'POST', formData);
    const url = String(uploaded?.data || '').trim();
    if (uploaded?.code !== 1 || !url) throw new Error(uploaded?.message || 'Could not upload the photo');
    const saved = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'POST', {
      fileUrl: url,
      address,
    });
    if (saved?.code !== 1) throw new Error(saved?.message || 'Could not save the photo');
    setPhotos((prev) => [{ ...saved.data, takenBy: profile?.fullName || profile?.username || '' }, ...prev]);
  };

  const shutter = () => {
    const video = videoRef.current;
    if (!video) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    if (target === 'phone') {
      try {
        captureStampedPhotoToPhone(video);
        setSavedCount((count) => count + 1);
      } catch (error: any) {
        message.error(error?.message || 'Could not save the photo');
      }
      return;
    }
    void (async () => {
      try {
        const raw = await grabFrame(video);
        const stamped = await createStampedPhoto(raw);
        await saveInApp(stamped.file, stamped.address);
        setSavedCount((count) => count + 1);
      } catch (error: any) {
        message.error(error?.message || 'Could not save the photo');
      }
    })();
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

  const statusText = target === 'app'
    ? `${savedCount} saved in the app`
    : `${savedCount} saved on the phone`;

  return (
    <Layout title="Camera">
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '8px 12px 32px' }}>
        <h1 style={{ fontSize: 22, margin: '8px 0 4px' }}>Camera</h1>
        <p style={{ margin: '0 0 16px', color: '#555' }}>
          Photos are saved here with the time and street address on the picture. They are not part of a report.
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
          onChoose={(next) => void chooseTarget(next)}
        />
        <div style={{ marginTop: 20 }}>
          {loading ? (
            <Spin />
          ) : photos.length === 0 ? (
            <Empty description="No photos yet" />
          ) : (
            <Image.PreviewGroup>
              <style>{`
                .field-photo-frame {
                  position: relative;
                  width: 100%;
                  aspect-ratio: 3 / 4;
                  overflow: hidden;
                  background: #111;
                }
                .field-photo-frame .ant-image {
                  position: absolute;
                  inset: 0;
                  display: block;
                  width: 100%;
                  height: 100%;
                }
                .field-photo-frame .ant-image-img {
                  display: block;
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  object-position: center bottom;
                }
              `}</style>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {photos.map((photo) => (
                  <div key={photo.id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <div className="field-photo-frame">
                      <Image src={photo.url} alt="" />
                    </div>
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
