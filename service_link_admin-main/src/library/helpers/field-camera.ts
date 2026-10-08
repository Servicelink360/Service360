export type CameraSaveTarget = 'phone' | 'app';

type CameraSession = {
  stream: MediaStream;
  target: CameraSaveTarget;
  phoneDir: any | null;
  facing: 'environment' | 'user';
};

let session: CameraSession | null = null;

export function peekCameraSession() {
  return session;
}

export function isIosDevice() {
  const nav = navigator as Navigator & { platform?: string; maxTouchPoints?: number };
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
}

function stopStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function pickPicturesFolder() {
  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== 'function') return null;
  try {
    return await picker({ mode: 'readwrite', startIn: 'pictures' });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    return picker({ mode: 'readwrite' });
  }
}

export async function startCameraSession(target: CameraSaveTarget, facing: 'environment' | 'user' = 'environment') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open the camera. Use the phone browser over a secure connection.');
  }
  let phoneDir = target === 'phone' ? session?.phoneDir ?? null : null;
  if (target === 'phone' && !phoneDir) {
    phoneDir = await pickPicturesFolder();
  }
  stopStream(session?.stream);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing } },
  });
  session = { stream, target, phoneDir, facing };
  return session;
}

export function endCameraSession() {
  stopStream(session?.stream);
  session = null;
}

export async function savePhotoOnPhone(file: File) {
  const dir = session?.phoneDir;
  if (dir?.getFileHandle) {
    const handle = await dir.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    return 'folder' as const;
  }
  if (isIosDevice()) return 'hold' as const;
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'download' as const;
}

export async function shareHeldPhotos(files: File[]) {
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (!files.length || typeof nav.share !== 'function' || !nav.canShare?.({ files })) {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    return;
  }
  await nav.share({ files });
}
