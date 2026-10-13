function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function bytes(size: number, write: (view: DataView) => void) {
  const buf = new Uint8Array(size);
  write(new DataView(buf.buffer));
  return buf;
}

/** Zip of stored (uncompressed) files. Photo bytes stay as they are. */
export function buildStoredZip(files: { name: string; data: Uint8Array }[]) {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = enc.encode(file.name);
    const crc = crc32(file.data);
    const local = bytes(30 + name.length, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, file.data.length, true);
      view.setUint32(22, file.data.length, true);
      view.setUint16(26, name.length, true);
    });
    local.set(name, 30);
    parts.push(local, file.data);
    const central = bytes(46 + name.length, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, file.data.length, true);
      view.setUint32(24, file.data.length, true);
      view.setUint16(28, name.length, true);
      view.setUint32(42, offset, true);
    });
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + file.data.length;
  });
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = bytes(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, offset, true);
  });
  return new Blob([...parts, ...centrals, end], { type: "application/zip" });
}

export function photoDownloadName(url: string, index: number) {
  let base = "";
  try {
    const path = new URL(url, window.location.href).pathname;
    base = decodeURIComponent(path.split("/").pop() || "");
  } catch {
    base = "";
  }
  const safe = base.replace(/[^\w.\-]+/g, "_");
  if (safe && safe.includes(".")) return `${index + 1}-${safe}`;
  return `photo-${index + 1}.jpg`;
}
