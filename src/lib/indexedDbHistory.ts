import { AnalysisHistoryRecord } from '../types/history.ts';

const DB_NAME = 'modelmind_history_db';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';

// In-memory fallback if running in an environment without IndexedDB
const memoryFallback = new Map<string, AnalysisHistoryRecord>();

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('is_favorite', 'is_favorite', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function idbGetAllHistory(): Promise<AnalysisHistoryRecord[]> {
  if (!hasIndexedDB()) {
    return Array.from(memoryFallback.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const rows: AnalysisHistoryRecord[] = req.result || [];
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      resolve(rows);
    };
    req.onerror = () => reject(req.error || new Error('Failed to read IndexedDB history'));
    tx.oncomplete = () => db.close();
  });
}

export async function idbSaveAnalysis(
  record: AnalysisHistoryRecord
): Promise<AnalysisHistoryRecord> {
  if (!hasIndexedDB()) {
    memoryFallback.set(record.id, record);
    return record;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error || new Error('Failed to save record in IndexedDB'));
    tx.oncomplete = () => db.close();
  });
}

export async function idbToggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
  if (!hasIndexedDB()) {
    const existing = memoryFallback.get(id);
    if (existing) {
      memoryFallback.set(id, {
        ...existing,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      });
    }
    return true;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as AnalysisHistoryRecord | undefined;
      if (!existing) {
        resolve(false);
        return;
      }
      const updated: AnalysisHistoryRecord = {
        ...existing,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error || new Error('Failed to update favorite'));
    };
    getReq.onerror = () => reject(getReq.error || new Error('Failed to fetch record'));
    tx.oncomplete = () => db.close();
  });
}

export async function idbDeleteAnalysis(id: string): Promise<boolean> {
  if (!hasIndexedDB()) {
    memoryFallback.delete(id);
    return true;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error('Failed to delete record from IndexedDB'));
    tx.oncomplete = () => db.close();
  });
}

export async function idbClearHistory(): Promise<boolean> {
  if (!hasIndexedDB()) {
    memoryFallback.clear();
    return true;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error('Failed to clear IndexedDB history'));
    tx.oncomplete = () => db.close();
  });
}
