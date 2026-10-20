import { callAPIAsync, callAPIUploadAsync } from './api';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { lookupCurrentPlace, paintPhotoStamp, createStampedPhoto } from './stamp-photo';
import { savePhonePhoto } from './phone-photos';

export type CameraSaveTarget = 'phone' | 'app';

type CameraSession = {
  stream: MediaStream;
  target: CameraSaveTarget;
  facing: 'environment' | 'user';
  address: string;
  geo: string;
};

let session: CameraSession | null = null;

export function peekCameraSession() {
  return session;
}

function stopStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function startCameraSession(target: CameraSaveTarget, facing: 'environment' | 'user' = 'environment') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open the camera. Use the phone browser over a secure connection.');
  }
  const previousAddress = session?.address && session.address !== 'Address unavailable' ? session.address : '';
  const previousGeo = session?.geo || '';
  stopStream(session?.stream);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing } },
  });
  session = {
    stream,
    target,
    facing,
    address: previousAddress || 'Address unavailable',
    geo: previousGeo,
  };
  if (!previousGeo || !previousAddress) {
    void lookupCurrentPlace()
      .then((found) => {
        if (session?.stream !== stream) return;
        if (found.address && found.address !== 'Address unavailable') session.address = found.address;
        if (found.geo) session.geo = found.geo;
      })
      .catch(() => undefined);
  }
  return session;
}

export function endCameraSession() {
  stopStream(session?.stream);
  session = null;
}

function jpegFromCanvas(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const encoded = dataUrl.split(',')[1] || '';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: 'image/jpeg' });
}

/** Opens from the phone camera file. Keeps the picture even if the stamp is slow. */
export async function keepPhoneCameraPhoto(file: File) {
  try {
    const stamped = await Promise.race([
      createStampedPhoto(file),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('stamp-timeout')), 8000);
      }),
    ]);
    return savePhonePhoto(stamped.file, stamped.address);
  } catch {
    return savePhonePhoto(file, 'Address unavailable');
  }
}

function placeLabel() {
  const address = session?.address && session.address !== 'Address unavailable' ? session.address : '';
  const geo = session?.geo || '';
  return [address, geo].filter(Boolean).join('\n') || 'Location unavailable';
}

/** Stores the current frame on this phone with the time and location. Does not upload it. */
export async function captureStampedPhotoToPhone(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 0;
  const sourceHeight = video.videoHeight || 0;
  if (!sourceWidth || !sourceHeight) throw new Error('Camera is not ready');
  if (!session?.geo || !session.address || session.address === 'Address unavailable') {
    try {
      const found = await lookupCurrentPlace();
      if (session) {
        if (found.address && found.address !== 'Address unavailable') session.address = found.address;
        if (found.geo) session.geo = found.geo;
      }
    } catch {
      /* the time is still stamped if location is blocked */
    }
  }
  const scale = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not take the photo');
  ctx.drawImage(video, 0, 0, width, height);
  const address = placeLabel();
  paintPhotoStamp(ctx, width, height, address);
  return { blob: jpegFromCanvas(canvas), address };
}

function uploadedFileUrl(uploaded: { data?: unknown }) {
  const data = uploaded?.data;
  if (typeof data === 'string') return data.trim();
  if (data && typeof data === 'object') {
    const row = data as { url?: unknown; fileUrl?: unknown; location?: unknown };
    return String(row.url || row.fileUrl || row.location || '').trim();
  }
  return '';
}

/** Uploads an already stamped photo into Service360. */
export async function storePhotoInApp(file: File, address: string) {
  const formData = new FormData();
  formData.append('file', file, file.name || `photo-${Date.now()}.jpg`);
  const uploaded = await callAPIUploadAsync(serviceType.COMMON, endPoint.UPLOAD_FILE, 'POST', formData);
  const url = uploadedFileUrl(uploaded);
  if (uploaded?.code !== 1 || !url) throw new Error(uploaded?.message || 'Could not upload the photo');
  const saved = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'POST', {
    fileUrl: url,
    address: address || '',
  });
  if (saved?.code !== 1 || !saved.data) throw new Error(saved?.message || 'Could not save the photo');
  return saved.data as { id: number; url: string; address: string; createdAt: string; userId: number };
}

/** Phone camera confirm ("Use this photo"), then store the stamped picture in the app. */
export async function saveCapturedPhotoInApp(file: File) {
  const stamped = await createStampedPhoto(file);
  return storePhotoInApp(stamped.file, stamped.address);
}
