import endPoint from '../../constants/endPoint';
import serviceType from '../../constants/serviceType';
import { callAPIAsync } from './api';
import { getStaffLocationDetailed } from './geolocation';

function sydneyStamp(when = new Date()) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(when);
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the photo'));
    };
    img.src = url;
  });
}

async function streetAddress(location: string | null) {
  if (!location) return 'Address unavailable';
  const [lat, lng] = location.split(',');
  const res = await callAPIAsync(serviceType.COMMON, endPoint.GEO_REVERSE, 'GET', { lat, lng });
  const address = String(res?.data?.address || '').trim();
  return address || 'Address unavailable';
}

function formatGeo(location: string | null) {
  if (!location) return '';
  const [lat, lng] = location.split(',');
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function paintPhotoStamp(ctx: CanvasRenderingContext2D, width: number, height: number, place: string) {
  const fontSize = Math.max(18, Math.round(width * 0.032));
  ctx.font = `700 ${fontSize}px sans-serif`;
  const pad = Math.round(fontSize * 0.7);
  const placeLines = String(place || '')
    .split('\n')
    .flatMap((part) => wrapLine(ctx, part.trim(), width - pad * 2))
    .filter(Boolean);
  const lines = [sydneyStamp(), ...placeLines].slice(0, 6);
  const lineHeight = Math.round(fontSize * 1.28);
  const blockHeight = lineHeight * lines.length;
  let y = height - pad - blockHeight;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.18));
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fillStyle = '#ffffff';
  lines.forEach((line) => {
    ctx.strokeText(line, pad, y, width - pad * 2);
    ctx.fillText(line, pad, y, width - pad * 2);
    y += lineHeight;
  });
}

export async function lookupCurrentPlace() {
  const gps = await getStaffLocationDetailed();
  const geo = formatGeo(gps.location);
  const address = await streetAddress(gps.location);
  return { address, geo };
}

export async function lookupCurrentStreetAddress() {
  const place = await lookupCurrentPlace();
  return [place.address, place.geo].filter((line) => line && line !== 'Address unavailable').join('\n') || 'Location unavailable';
}

export { paintPhotoStamp };

export async function stampPhotoWithPlace(file: File) {
  const stamped = await createStampedPhoto(file);
  return stamped.file;
}

/** Stamped JPEG plus the street address written on it. */
export async function createStampedPhoto(file: File) {
  const [found, image] = await Promise.all([
    lookupCurrentPlace(),
    loadImage(file),
  ]);
  const place = [found.address, found.geo].filter((line) => line && line !== 'Address unavailable').join('\n') || 'Location unavailable';
  const maxEdge = 2000;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not stamp the photo');
  ctx.drawImage(image, 0, 0, width, height);
  paintPhotoStamp(ctx, width, height, place);

  const blob = await new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const finish = (result: Blob | null, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (result) resolve(result);
      else reject(error || new Error('Could not stamp the photo'));
    };
    const timer = window.setTimeout(() => {
      try {
        const data = canvas.toDataURL('image/jpeg', 0.85);
        const encoded = data.split(',')[1] || '';
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        finish(new Blob([bytes], { type: 'image/jpeg' }));
      } catch (error) {
        finish(null, error instanceof Error ? error : new Error('Could not stamp the photo'));
      }
    }, 800);
    canvas.toBlob((result) => finish(result), 'image/jpeg', 0.9);
  });
  const stamped = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
  return { file: stamped, address: place };
}
