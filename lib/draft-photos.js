import { MAX_SUBMISSION_PHOTOS } from "./photo-selection";

const DB_NAME = "sms-draft-photos-v1";
const STORE = "photos";
const validId = (value) =>
  typeof value === "string" && /^[a-f\d-]{36}$/i.test(value);

export function storedPhoto(draftId, photo) {
  if (
    !validId(draftId) ||
    !/^[a-f\d]{64}$/.test(photo?.token || "") ||
    !(photo.preview instanceof Blob) ||
    photo.preview.type !== "image/jpeg" ||
    photo.preview.size > 350000 ||
    !Number.isFinite(photo.expiresAt)
  )
    throw Error("This photo could not be saved in your browser.");
  return {
    draftId,
    token: photo.token,
    name: String(photo.name || "Photo").slice(0, 255),
    preview: photo.preview,
    expiresAt: photo.expiresAt,
    savedAt: Date.now(),
  };
}

function openStore() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(Error("Photo storage is unavailable."));
    const request = indexedDB.open(DB_NAME, 1);
    let settled = false;
    const timer = setTimeout(() => fail(), 5000);
    const fail = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(Error("Photo storage is unavailable."));
      }
    };
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, {
        keyPath: ["draftId", "token"],
      });
      store.createIndex("draftId", "draftId");
      store.createIndex("expiresAt", "expiresAt");
    };
    request.onerror = fail;
    request.onblocked = fail;
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transact(mode, action) {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () =>
        reject(Error("Your browser could not save these photos."));
      tx.onerror = () => {}; // onabort reports the transaction failure.
      try {
        action(tx.objectStore(STORE), (value) => {
          result = value;
        });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}

export const saveDraftPhoto = (id, photo) =>
  transact("readwrite", (store) => store.put(storedPhoto(id, photo)));
export const removeDraftPhoto = (id, token) =>
  transact("readwrite", (store) => store.delete([id, token]));
export const clearDraftPhotos = (id) =>
  transact("readwrite", (store) => {
    const request = store.index("draftId").openCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });

export function restorePhotoRecords(id, rows, now = Date.now()) {
  const photos = [];
  let expired = 0;
  for (const row of rows) {
    if (row.draftId !== id) continue;
    try {
      const photo = storedPhoto(id, row);
      if (photo.expiresAt <= now) {
        expired++;
        continue;
      }
      if (photos.length < MAX_SUBMISSION_PHOTOS)
        photos.push({ ...photo, persisted: true });
    } catch {
      expired++;
    }
  }
  return { photos, expired };
}

export async function loadDraftPhotos(id) {
  const rows = await transact("readonly", (store, done) => {
    const request = store.index("draftId").getAll(IDBKeyRange.only(id));
    request.onsuccess = () => done(request.result);
  });
  // Preserve the order in which the customer added the photos, not receipt order.
  rows.sort((a, b) => a.savedAt - b.savedAt);
  const result = restorePhotoRecords(id, rows);
  // Expired previews are no longer useful and should not accumulate on the device.
  await transact("readwrite", (store) => {
    const request = store
      .index("expiresAt")
      .openCursor(IDBKeyRange.upperBound(Date.now()));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }).catch(() => {});
  return result;
}
