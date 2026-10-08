import { lookupCurrentStreetAddress, paintPhotoStamp } from './stamp-photo';

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

/** Saves the current camera frame onto the phone in the same tap, with no save prompt. */
export function captureStampedPhotoToPhone(video: HTMLVideoElement) {
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
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.download = `IMG_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
