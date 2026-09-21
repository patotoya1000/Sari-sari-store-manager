// services/db.js — thin IndexedDB wrapper. Nothing here knows about the UI, app state,
// or Capacitor. If you ever swap storage engines, this is the only file that changes.

const DB_NAME = "sarisari-store-db";
const DB_VERSION = 2; // bumped for the stockAudits store added in Phase 2
let db;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const _db = e.target.result;
      if (!_db.objectStoreNames.contains("products")) _db.createObjectStore("products", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("categories")) _db.createObjectStore("categories", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("sales")) _db.createObjectStore("sales", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("saleItems")) _db.createObjectStore("saleItems", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("movements")) _db.createObjectStore("movements", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("stockAudits")) _db.createObjectStore("stockAudits", { keyPath: "id" });
      if (!_db.objectStoreNames.contains("meta")) _db.createObjectStore("meta", { keyPath: "key" });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeNames, mode) {
  return db.transaction(storeNames, mode);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAll(store) {
  return reqToPromise(tx([store], "readonly").objectStore(store).getAll());
}

export function getOne(store, key) {
  return reqToPromise(tx([store], "readonly").objectStore(store).get(key));
}

export function put(store, value) {
  const t = tx([store], "readwrite");
  t.objectStore(store).put(value);
  return new Promise((res, rej) => { t.oncomplete = () => res(value); t.onerror = () => rej(t.error); });
}

export function del(store, key) {
  const t = tx([store], "readwrite");
  t.objectStore(store).delete(key);
  return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
}
