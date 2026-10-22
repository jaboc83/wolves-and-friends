// Device-only localStorage access and validation for browser preferences/caches.
// Lazy access also tolerates browsers that throw while reading localStorage itself.
export const browserStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Device storage is optional. */
    }
  },
};
export function readStored<T>(
  key: string,
  valid: (value: unknown) => value is T,
  fallback: T,
  storage: Pick<Storage, "getItem"> = browserStorage,
): T {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || "null");
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(
  key: string,
  value: unknown,
  storage: Pick<Storage, "setItem"> = browserStorage,
) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep live state. */
  }
}
export const stringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
