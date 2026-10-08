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

export async function stampPhotoWithPlace(file: File) {
  const [place, image] = await Promise.all([
    getStaffLocationDetailed().then((gps) => streetAddress(gps.location)),
    loadImage(file),
  ]);
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

  const fontSize = Math.max(16, Math.round(width * 0.028));
  ctx.font = `600 ${fontSize}px sans-serif`;
  const lines = [sydneyStamp(), ...wrapLine(ctx, place, width - fontSize * 1.4)];
  const lineHeight = Math.round(fontSize * 1.35);
  const pad = Math.round(fontSize * 0.55);
  const barHeight = pad * 2 + lineHeight * lines.length;
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
  ctx.fillRect(0, height - barHeight, width, barHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.fillText(line, pad, height - barHeight + pad + index * lineHeight, width - pad * 2);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not stamp the photo'))), 'image/jpeg', 0.9);
  });
  return new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
