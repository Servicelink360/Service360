import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from './api';
import { paintPhotoStamp } from './stamp-photo';

export type PhoneShot = {
  id: string;
  url: string;
  createdAt: string;
  address: string;
};

type Fix = { geo: string; address: string };

let fix: Fix = { geo: '', address: '' };
let watchId: number | null = null;
let locateTask: Promise<void> | null = null;

function formatGeo(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function rememberPoint(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
  fix = { ...fix, geo: formatGeo(latitude, longitude) };
  void streetFromPoint(latitude, longitude).then((address) => {
    if (address) fix = { ...fix, address };
  });
}

function askPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (pos: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(pos);
    };
    const limit = (options.timeout || 8000) + 500;
    const timer = window.setTimeout(() => finish(null), limit);
    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos),
      () => finish(null),
      options,
    );
  });
}

/** Call this inside the button tap so the phone can ask for location. */
export function beginPhoneLocation() {
  if (!navigator.geolocation) return;
  if (watchId == null) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => rememberPoint(pos.coords.latitude, pos.coords.longitude),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }
  void askPosition({ enableHighAccuracy: false, maximumAge: 120000, timeout: 8000 }).then((pos) => {
    if (pos) rememberPoint(pos.coords.latitude, pos.coords.longitude);
  });
  if (locateTask) return;
  locateTask = (async () => {
    const coarse = await askPosition({ enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 });
    if (coarse) rememberPoint(coarse.coords.latitude, coarse.coords.longitude);
    const fine = await askPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    if (fine) rememberPoint(fine.coords.latitude, fine.coords.longitude);
  })().finally(() => {
    locateTask = null;
  });
}

async function streetFromPoint(latitude: number, longitude: number) {
  try {
    const res = await callAPIAsync(serviceType.COMMON, endPoint.GEO_REVERSE, 'GET', {
      lat: String(latitude),
      lng: String(longitude),
    });
    return String(res?.data?.address || '').trim();
  } catch {
    return '';
  }
}

export function endPhoneLocation() {
  if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

function waitForFrame(video: HTMLVideoElement) {
  if (video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      video.removeEventListener('loadeddata', ready);
      if (ok) resolve();
      else reject(new Error('Camera is not ready'));
    };
    const ready = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) finish(true);
    };
    const timer = window.setTimeout(() => finish(false), 2500);
    const poll = window.setInterval(ready, 200);
    video.addEventListener('loadeddata', ready);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const finish = (blob: Blob | null, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (blob) resolve(blob);
      else reject(error || new Error('Could not save the photo'));
    };
    const timer = window.setTimeout(() => {
      try {
        const data = canvas.toDataURL('image/jpeg', 0.85);
        const binary = atob(data.split(',')[1] || '');
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        finish(new Blob([bytes], { type: 'image/jpeg' }));
      } catch (error) {
        finish(null, error instanceof Error ? error : new Error('Could not save the photo'));
      }
    }, 600);
    canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.85);
  });
}

function stampText() {
  return [fix.address, fix.geo].filter(Boolean).join('\n');
}

/** Waits for coordinates, then the street address. Coordinates are kept even if the street lookup fails. */
export async function waitForPhonePlace() {
  beginPhoneLocation();
  const started = Date.now();
  while (!fix.geo && Date.now() - started < 15000) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  if (fix.geo && !fix.address) {
    const [lat, lng] = fix.geo.split(',').map((part) => Number(part.trim()));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const address = await Promise.race([
        streetFromPoint(lat, lng),
        new Promise<string>((resolve) => {
          window.setTimeout(() => resolve(''), 8000);
        }),
      ]);
      if (address) fix = { ...fix, address };
    }
  }
  return stampText();
}

export function currentPhonePlace() {
  return stampText();
}

export function requestPhoneCamera(facing: 'environment' | 'user' = 'environment') {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });
}

export type CameraFacing = 'user' | 'environment';

/** Ask for the other lens in the same tap that stopped the current one. A delay makes the phone reject the request. */
export async function openFacingSimple(facing: CameraFacing) {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: { facingMode: { exact: facing } } },
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not flip the camera');
}
export type LensIds = { user?: string; environment?: string };

export async function learnLenses(lenses: LensIds, currentFacing: CameraFacing, currentId: string) {
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  devices.forEach((item) => {
    if (item.kind !== 'videoinput' || !item.deviceId || item.deviceId === 'default') return;
    const text = item.label.toLowerCase();
    if (/front|user|face|selfie/.test(text)) {
      if (!lenses.user) lenses.user = item.deviceId;
    } else if (/back|rear|environment/.test(text) && !/ultra|tele|depth/.test(text)) {
      if (!lenses.environment) lenses.environment = item.deviceId;
    }
  });
  if (currentId) lenses[currentFacing] = currentId;
}

export function rememberLens(lenses: LensIds, facing: CameraFacing, track?: MediaStreamTrack | null) {
  const id = track?.getSettings().deviceId;
  if (id) lenses[facing] = id;
}

export function releaseCamera(video: HTMLVideoElement | null, tracks: MediaStreamTrack[]) {
  if (video) {
    video.pause();
    video.srcObject = null;
  }
  const waiting = tracks.map((track) => {
    if (track.readyState === 'ended') return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 800);
      track.addEventListener('ended', () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
      track.stop();
    });
  });
  return Promise.all(waiting).then(() => new Promise((resolve) => window.setTimeout(resolve, 500)));
}

export async function openCameraFacing(facing: CameraFacing, avoidId: string, lenses: LensIds) {
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  const cameras = devices.filter((item) => item.kind === 'videoinput' && item.deviceId && item.deviceId !== 'default');
  const label = (item: MediaDeviceInfo) => item.label.toLowerCase();
  const isFront = (item: MediaDeviceInfo) => /front|user|face|selfie/.test(label(item));
  const isBack = (item: MediaDeviceInfo) => /back|rear|environment/.test(label(item));
  const labeled = facing === 'user'
    ? cameras.find((item) => item.deviceId !== avoidId && isFront(item))
    : cameras.find((item) => item.deviceId !== avoidId && isBack(item) && !/ultra|tele|depth/.test(label(item)))
      || cameras.find((item) => item.deviceId !== avoidId && isBack(item));
  const attempts: MediaTrackConstraints[] = [];
  const add = (video: MediaTrackConstraints) => {
    const key = JSON.stringify(video);
    if (!attempts.some((item) => JSON.stringify(item) === key)) attempts.push(video);
  };
  add({ facingMode: { exact: facing } });
  add({ facingMode: { ideal: facing } });
  if (lenses[facing] && lenses[facing] !== avoidId) add({ deviceId: { exact: lenses[facing] as string } });
  if (labeled) add({ deviceId: { exact: labeled.deviceId } });
  cameras.forEach((item) => {
    if (item.deviceId !== avoidId) add({ deviceId: { exact: item.deviceId } });
  });

  let lastError: unknown;
  for (const video of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
      const track = stream.getVideoTracks()[0];
      const id = track?.getSettings().deviceId || '';
      const opened = track?.getSettings().facingMode;
      const askedExactFacing = typeof video.facingMode === 'object' && !!video.facingMode && 'exact' in video.facingMode;
      const facingMatches = opened === facing;
      const facingWrong = (opened === 'user' || opened === 'environment') && opened !== facing;
      const differentDevice = !!avoidId && !!id && id !== avoidId;
      if (track && !facingWrong && (facingMatches || differentDevice || askedExactFacing)) {
        if (id) lenses[facing] = id;
        return stream;
      }
      stream.getTracks().forEach((item) => item.stop());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not flip the camera');
}

let shutterAudio: HTMLAudioElement | null = null;

function shutterWavUrl() {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * 0.14);
  const pcm = new Int16Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const tick = Math.sin(2 * Math.PI * 2100 * t) * Math.exp(-t * 55);
    const body = t > 0.04 ? Math.sin(2 * Math.PI * 420 * (t - 0.04)) * Math.exp(-(t - 0.04) * 28) : 0;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 36) * 0.45;
    const mixed = Math.max(-1, Math.min(1, tick * 0.7 + body * 0.8 + noise));
    pcm[i] = mixed * 32767;
  }
  const header = 44;
  const buffer = new ArrayBuffer(header + pcm.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  let offset = header;
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(offset, pcm[i], true);
    offset += 2;
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

export function primeShutter() {
  if (!shutterAudio) shutterAudio = new Audio(shutterWavUrl());
  shutterAudio.volume = 1;
}

export function playShutter() {
  primeShutter();
  if (!shutterAudio) return;
  shutterAudio.currentTime = 0;
  void shutterAudio.play().catch(() => undefined);
  navigator.vibrate?.(35);
}

function dataUrlToBlob(dataUrl: string) {
  const binary = atob(dataUrl.split(',')[1] || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: 'image/jpeg' });
}

function frameCanvas(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 0;
  const sourceHeight = video.videoHeight || 0;
  if (!sourceWidth || !sourceHeight) throw new Error('Camera is not ready');
  const scale = Math.min(1, 1280 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not save the photo');
  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

function fileFromCanvas(canvas: HTMLCanvasElement, place: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not save the photo');
  paintPhotoStamp(ctx, canvas.width, canvas.height, place);
  const blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', 0.85));
  return new File([blob], `IMG_${Date.now()}.jpg`, { type: 'image/jpeg' });
}

/** Stamped photo file for the phone. Not stored in Service360. */
export function captureStampedPhoneFile(video: HTMLVideoElement) {
  return fileFromCanvas(frameCanvas(video), stampText());
}

/** Grabs the frame, then stamps Sydney time plus the real street address and coordinates. */
export async function captureAppPhoto(video: HTMLVideoElement) {
  beginPhoneLocation();
  const canvas = frameCanvas(video);
  const address = await waitForPhonePlace();
  return { file: fileFromCanvas(canvas, address), address };
}

function isIphone() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function putPhotoOnPhone(file: File) {
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (isIphone() && typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
    void nav.share({ files: [file] }).catch(() => undefined);
    return;
  }
  if (isIphone()) return;
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
