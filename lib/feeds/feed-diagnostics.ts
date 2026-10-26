// Records bounded browser-local diagnostics for feed, request, and component failures.
import type { Health } from "./feed-types";

const DB_NAME = "wolves-friends-diagnostics";
const STORE_NAME = "feed-errors";
const MAX_ENTRIES = 500;
const MAX_AGE_MS = 7 * 86400000;

export type DiagnosticKind = "feed" | "request" | "component";

export type FeedDiagnostic = {
  kind: DiagnosticKind;
  provider: string;
  teams: string[];
  error: string;
  checked: string;
  recordedAt: string;
  count: number;
  detail?: string;
};

type DiagnosticInput = Omit<FeedDiagnostic, "recordedAt"> & {
  recordedAt?: string;
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

function errorText(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return "unknown";
}

function pruneDiagnostics(db: IDBDatabase) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const cutoff = Date.now() - MAX_AGE_MS;
    const oldKeys: IDBValidKey[] = [];
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        for (const key of oldKeys) store.delete(key);
        return;
      }
      const value = cursor.value as FeedDiagnostic;
      if (Date.parse(value.recordedAt) < cutoff) oldKeys.push(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB read failed"));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB prune failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB prune aborted"));
  });
}

export async function recordDiagnostics(entries: DiagnosticInput[]) {
  if (!entries.length || typeof window === "undefined") return;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const recordedAt = new Date().toISOString();
    for (const item of entries) {
      store.add({
        ...item,
        kind: item.kind || "request",
        detail: item.detail?.slice(0, 500),
        recordedAt: item.recordedAt || recordedAt,
      } satisfies FeedDiagnostic);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("IndexedDB write failed"));
      tx.onabort = () =>
        reject(tx.error || new Error("IndexedDB write aborted"));
    });
    await pruneDiagnostics(db);
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
    await new Promise<void>((resolve) => {
      trim.oncomplete = () => resolve();
      trim.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Diagnostics are optional and must never affect the app.
  }
}

export async function recordFeedDiagnostics(health: Health[]) {
  const failed = health.filter((item) => item.status === "unavailable");
  await recordDiagnostics(
    failed.map((item) => ({
      kind: "feed" as const,
      provider: item.name,
      teams: item.teams,
      error: item.error || "unknown",
      checked: item.checked,
      count: item.count || 0,
    })),
  );
}

export async function recordRequestDiagnostic(
  provider: string,
  teams: string[] = [],
  error: unknown = "request-failed",
  detail?: string,
) {
  const checked = new Date().toISOString();
  await recordDiagnostics([
    {
      kind: "request",
      provider,
      teams,
      error: errorText(error),
      checked,
      count: 0,
      detail,
    },
  ]);
}

export async function recordComponentDiagnostic(
  component: string,
  error: unknown,
) {
  const checked = new Date().toISOString();
  await recordDiagnostics([
    {
      kind: "component",
      provider: component,
      teams: [],
      error: errorText(error),
      checked,
      count: 0,
    },
  ]);
}

export async function exportFeedDiagnostics() {
  const db = await openDatabase();
  const rows = await new Promise<FeedDiagnostic[]>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as FeedDiagnostic[]).map((row) => ({
          ...row,
          kind: row.kind || "feed",
        })),
      );
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB read failed"));
  });
  db.close();
  return rows
    .filter((row) => Date.parse(row.recordedAt) >= Date.now() - MAX_AGE_MS)
    .sort(
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
