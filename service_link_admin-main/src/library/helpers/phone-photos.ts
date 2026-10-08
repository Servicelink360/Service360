const DB_NAME = 'service360-phone-photos';
const STORE = 'photos';

export type PhonePhotoRecord = {
  id: string;
  blob: Blob;
  createdAt: string;
  address: string;
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listPhonePhotos() {
  const db = await openDb();
  const rows = await new Promise<PhonePhotoRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result || []) as PhonePhotoRecord[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function savePhonePhoto(blob: Blob, address: string) {
  const row: PhonePhotoRecord = {
    id: `phone-${Date.now()}`,
    blob,
    createdAt: new Date().toISOString(),
    address,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return row;
}

export async function deletePhonePhoto(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
