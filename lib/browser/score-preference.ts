// Reads and persists the browser-only visibility choice for game scores.
export function loadScorePreference(storage: Pick<Storage, "getItem">) {
  try {
    return {
      hidden: storage.getItem("wf-hide-results") === "true",
    };
  } catch {
    return { hidden: false };
  }
}
export function saveScorePreference(
  storage: Pick<Storage, "setItem">,
  hidden: boolean,
) {
  try {
    storage.setItem("wf-hide-results", String(hidden));
  } catch {}
}
