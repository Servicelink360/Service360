/** Resize/compress photos before upload to cut time on slow links and S3. */

const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;
/** Skip compression for small images (already fast enough). */
const MIN_BYTES_TO_COMPRESS = 350_000;

const COMPRESSIBLE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      type,
      quality,
    );
  });
}

/**
 * Downscale large JPEG/PNG/WebP photos. Returns original file if compression is unnecessary or fails.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type.toLowerCase())) {
    return file;
  }
  if (file.size < MIN_BYTES_TO_COMPRESS) {
    return file;
  }
  try {
    const img = await loadImageFromFile(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return file;

    const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    if (scale >= 1 && file.size < 800_000) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, tw, th);

    const outType = 'image/jpeg';
    const blob = await canvasToBlob(canvas, outType, JPEG_QUALITY);
    if (blob.size >= file.size * 0.95) {
      return file;
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: outType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
