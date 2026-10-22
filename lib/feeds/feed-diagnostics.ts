import type { Health } from "./feed-types";

const DB_NAME = "wolves-friends-diagnostics";
const STORE_NAME = "feed-errors";
const MAX_ENTRIES = 200;
const MAX_AGE_MS = 7 * 86400000;

export type FeedDiagnostic = {
  provider: string;
  teams: string[];
  error: string;
  checked: string;
  recordedAt: string;
  count: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB unavailable"));
  });
}

export async function recordFeedDiagnostics(health: Health[]) {
  const failed = health.filter((item) => item.status === "unavailable");
  if (!failed.length || typeof window === "undefined") return;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const recordedAt = new Date().toISOString();
    for (const item of failed) {
      store.add({
        provider: item.name,
        teams: item.teams,
        error: item.error || "unknown",
        checked: item.checked,
        recordedAt,
        count: item.count || 0,
      } satisfies FeedDiagnostic);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("IndexedDB write failed"));
      tx.onabort = () =>
        reject(tx.error || new Error("IndexedDB write aborted"));
    });
    const prune = db.transaction(STORE_NAME, "readwrite");
    const cutoff = Date.now() - MAX_AGE_MS;
    const keys: IDBValidKey[] = [];
    await new Promise<void>((resolve, reject) => {
      const request = prune.objectStore(STORE_NAME).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve();
        const value = cursor.value as FeedDiagnostic;
        if (Date.parse(value.recordedAt) < cutoff) keys.push(cursor.primaryKey);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB read failed"));
    });
    for (const key of keys) prune.objectStore(STORE_NAME).delete(key);
    await new Promise<void>((resolve) => {
      prune.oncomplete = () => resolve();
      prune.onerror = () => resolve();
    });
    const trim = db.transaction(STORE_NAME, "readwrite");
    const trimKeys: IDBValidKey[] = [];
    await new Promise<void>((resolve, reject) => {
      const request = trim.objectStore(STORE_NAME).openCursor(null, "prev");
      let index = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve();
        if (index++ >= MAX_ENTRIES) trimKeys.push(cursor.primaryKey);
        cursor.continue();
      };
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB read failed"));
    });
    for (const key of trimKeys) trim.objectStore(STORE_NAME).delete(key);
    db.close();
  } catch {
    // Diagnostics are optional and must never affect the feed refresh.
  }
}

export async function exportFeedDiagnostics() {
  const db = await openDatabase();
  const rows = await new Promise<FeedDiagnostic[]>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () => resolve(request.result as FeedDiagnostic[]);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB read failed"));
  });
  db.close();
  return rows.sort(
    (a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt),
  );
}

export async function downloadFeedDiagnostics() {
  const rows = await exportFeedDiagnostics();
  const blob = new Blob(
    [
      JSON.stringify(
        { exportedAt: new Date().toISOString(), entries: rows },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wolves-and-friends-feed-diagnostics.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
