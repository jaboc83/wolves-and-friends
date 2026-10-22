export function loadScorePreference(storage: Pick<Storage, "getItem">) {
  try {
    const ask = storage.getItem("wf-ask-scores") !== "false";
    return {
      ask,
      hidden: ask || storage.getItem("wf-hide-results") !== "false",
    };
  } catch {
    return { ask: true, hidden: true };
  }
}
export function saveScorePreference(
  storage: Pick<Storage, "setItem">,
  hidden: boolean,
  ask: boolean,
) {
  try {
    storage.setItem("wf-hide-results", String(hidden));
    storage.setItem("wf-ask-scores", String(ask));
  } catch {}
}
