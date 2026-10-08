import { callAPIAsync, callAPIUploadAsync } from './api';
import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { lookupCurrentStreetAddress, paintPhotoStamp, createStampedPhoto } from './stamp-photo';
import { savePhonePhoto } from './phone-photos';

export type CameraSaveTarget = 'phone' | 'app';

type CameraSession = {
  stream: MediaStream;
  target: CameraSaveTarget;
  facing: 'environment' | 'user';
  address: string;
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
  const previousAddress = session?.address || '';
  stopStream(session?.stream);
  const [stream, address] = await Promise.all([
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing } },
    }),
    previousAddress
      ? Promise.resolve(previousAddress)
      : lookupCurrentStreetAddress().catch(() => 'Address unavailable'),
  ]);
  session = { stream, target, facing, address: address || 'Address unavailable' };
  return session;
}

export function endCameraSession() {
  stopStream(session?.stream);
  session = null;
}

/** Saves the current frame on this phone. Does not start a browser download. */
export async function captureStampedPhotoToPhone(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 0;
  const sourceHeight = video.videoHeight || 0;
  if (!sourceWidth || !sourceHeight) throw new Error('Camera is not ready');
  const scale = Math.min(1, 2000 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not take the photo');
  ctx.drawImage(video, 0, 0, width, height);
  paintPhotoStamp(ctx, width, height, session?.address || 'Address unavailable');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not save the photo'))), 'image/jpeg', 0.9);
  });
  return savePhonePhoto(blob, session?.address || 'Address unavailable');
}

/** Phone camera confirm ("Use this photo"), then store the stamped picture in the app. */
export async function saveCapturedPhotoInApp(file: File) {
  const stamped = await createStampedPhoto(file);
  const formData = new FormData();
  formData.append('file', stamped.file, stamped.file.name);
  const uploaded = await callAPIUploadAsync(serviceType.COMMON, endPoint.UPLOAD_FILE, 'POST', formData);
  const url = String(uploaded?.data || '').trim();
  if (uploaded?.code !== 1 || !url) throw new Error(uploaded?.message || 'Could not upload the photo');
  const saved = await callAPIAsync(serviceType.COMMON, endPoint.FIELD_PHOTOS, 'POST', {
    fileUrl: url,
    address: stamped.address,
  });
  if (saved?.code !== 1 || !saved.data) throw new Error(saved?.message || 'Could not save the photo');
  return saved.data as { id: number; url: string; address: string; createdAt: string; userId: number };
}
