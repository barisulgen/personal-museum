import { openDB } from 'idb';

const DB_NAME = 'personal-museum';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let dbInstance = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return dbInstance;
}

export async function savePhoto({ blob, name, width, height }) {
  const db = await initDB();
  const record = {
    blob,
    name,
    width,
    height,
    addedAt: Date.now(),
  };
  const id = await db.add(STORE_NAME, record);
  return { ...record, id };
}

export async function getAllPhotos() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function getPhotoCount() {
  const db = await initDB();
  return db.count(STORE_NAME);
}

export async function clearAllPhotos() {
  const db = await initDB();
  return db.clear(STORE_NAME);
}

/** Close the cached connection and reset — used by tests. */
export function _resetDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
