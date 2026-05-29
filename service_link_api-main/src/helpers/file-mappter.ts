/** Build absolute URL for a multer-saved file (Fastify + Express-compatible `req`). */
function buildUploadedFileUrl(req: any, file: any): string {
  const host = req?.headers?.host || '127.0.0.1:5301';
  let proto = req?.protocol || 'http';
  if (typeof proto === 'function') {
    proto = proto();
  }
  if (typeof proto === 'string' && proto.endsWith(':')) {
    proto = proto.slice(0, -1);
  }
  if (proto !== 'https' && proto !== 'http') {
    proto = 'http';
  }

  const raw = String(file?.path ?? '').replace(/\\/g, '/');
  const lower = raw.toLowerCase();
  const marker = '/public/';
  let relative: string;
  const m = lower.indexOf(marker);
  if (m >= 0) {
    relative = raw.slice(m);
  } else if (lower.startsWith('public/')) {
    relative = `/${raw}`;
  } else if (file?.filename) {
    relative = `/public/upload/files/${file.filename}`;
  } else {
    relative = '/public/upload/files/unknown';
  }

  if (!relative.startsWith('/')) {
    relative = `/${relative}`;
  }

  return `${proto}://${host}${relative}`;
}

interface FileMapper {
  file: any;
  req: any;
}

interface FilesMapper {
  files: any;
  req: any;
}

export const fileMapper = ({ file, req }: FileMapper) => {
  return buildUploadedFileUrl(req, file);
};

export const filesMapper = ({ files, req }: FilesMapper) => {
  return files.map((file) => buildUploadedFileUrl(req, file));
};
