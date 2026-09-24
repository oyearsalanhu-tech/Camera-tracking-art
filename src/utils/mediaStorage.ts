import { CapturedMedia } from '../types/fingerFrame';

const DB_NAME = 'FingerFrameAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'captured_media';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaToStorage(media: CapturedMedia): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Store serializable record with the raw Blob
      const record = {
        id: media.id,
        type: media.type,
        blob: media.blob,
        timestamp: media.timestamp,
        formattedDate: media.formattedDate,
        duration: media.duration,
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save media to IndexedDB:', err);
  }
}

export async function loadMediaFromStorage(): Promise<CapturedMedia[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as Array<{
          id: string;
          type: 'photo' | 'video';
          blob: Blob;
          timestamp: number;
          formattedDate: string;
          duration?: number;
        }>;

        // Sort descending by timestamp (newest first)
        records.sort((a, b) => b.timestamp - a.timestamp);

        // Convert blobs to active object URLs
        const items: CapturedMedia[] = records.map((rec) => ({
          id: rec.id,
          type: rec.type,
          blob: rec.blob,
          url: URL.createObjectURL(rec.blob),
          timestamp: rec.timestamp,
          formattedDate: rec.formattedDate,
          duration: rec.duration,
        }));

        resolve(items);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load media from IndexedDB:', err);
    return [];
  }
}

export async function deleteMediaFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete media from IndexedDB:', err);
  }
}

export async function clearAllMediaFromStorage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}
