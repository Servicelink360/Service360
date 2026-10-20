import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { storePhotoInApp } from '@app/library/helpers/field-camera';
import { beginPhoneLocation, CameraFacing, captureAppPhoto, captureStampedPhoneFile, endPhoneLocation, openFacingSimple, playShutter, putPhotoOnPhone } from '@app/library/helpers/phone-shot';
import { message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const PhoneCamera: React.FC<{
  request: Promise<MediaStream>;
  saveTo?: 'phone' | 'app';
  onSaved?: (photo: { id: number; url: string; address: string; createdAt: string; userId: number }) => void;
  onClose: () => void;
}> = ({ request, saveTo = 'phone', onSaved, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const savingRef = useRef(false);
  const flipLock = useRef(false);
  const facingRef = useRef<CameraFacing>('environment');
  const generation = useRef(0);
  const [flash, setFlash] = useState(false);

  const attach = async (stream: MediaStream) => {
    const gen = generation.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (gen !== generation.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* shutter still takes the frame */
    }
  };

  useEffect(() => {
    const goHome = () => onClose();
    window.addEventListener('service360-home', goHome);
    return () => window.removeEventListener('service360-home', goHome);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const gen = generation.current;
    beginPhoneLocation();
    void request
      .then((stream) => {
        if (cancelled || gen !== generation.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        return attach(stream);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      endPhoneLocation();
    };
  }, [request]);

  const shutter = () => {
    const video = videoRef.current;
    if (!video || savingRef.current) return;
    playShutter();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 80);
    if (saveTo !== 'app') {
      try {
        putPhotoOnPhone(captureStampedPhoneFile(video));
      } catch (error: any) {
        message.error(error?.message || 'Could not take the photo');
      }
      return;
    }
    beginPhoneLocation();
    savingRef.current = true;
    const hide = message.loading('Saving the photo in the app…', 0);
    void captureAppPhoto(video)
      .then((shot) => storePhotoInApp(shot.file, shot.address))
      .then((saved) => {
        message.success('Photo saved in the app');
        onSaved?.(saved);
        onClose();
      })
      .catch((error: any) => {
        message.error(error?.message || 'Could not save the photo');
      })
      .finally(() => {
        hide();
        savingRef.current = false;
      });
  };

  return (
    <div style={{ position: 'fixed', top: 70, right: 0, bottom: 0, left: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ flex: 1, width: '100%', objectFit: 'cover', background: '#000' }}
      />
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" aria-label="Close camera" onClick={onClose} style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
          <CloseOutlined />
        </button>
        <button
          type="button"
          aria-label="Flip camera"
          onClick={() => {
            if (flipLock.current) return;
            flipLock.current = true;
            generation.current += 1;
            const currentFacing = facingRef.current;
            const next: CameraFacing = currentFacing === 'environment' ? 'user' : 'environment';
            const video = videoRef.current;
            if (video) {
              video.pause();
              video.srcObject = null;
            }
            const tracks = streamRef.current?.getTracks() || [];
            streamRef.current = null;
            tracks.forEach((track) => {
              if (track.readyState !== 'ended') track.stop();
            });
            void openFacingSimple(next)
              .then((stream) => {
                facingRef.current = next;
                return attach(stream);
              })
              .catch((error: any) => {
                message.error(error?.message || 'Could not flip the camera');
              })
              .finally(() => {
                flipLock.current = false;
              });
          }}
          style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          <SwapOutlined />
        </button>
      </div>
      {flash ? <div style={{ position: 'absolute', inset: 0, background: '#fff' }} /> : null}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          aria-label="Take photo"
          onClick={shutter}
          style={{ width: 74, height: 74, borderRadius: 37, border: '4px solid #fff', background: '#fff' }}
        />
      </div>
    </div>
  );
};

export default PhoneCamera;
