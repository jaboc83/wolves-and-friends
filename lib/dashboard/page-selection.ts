// Reads the saved dashboard page from storage, falling back when it is missing, invalid, or unreadable.
export function restoreStoredPage<Page extends string>(
  storage: Pick<Storage, "getItem">,
  isPage: (value: unknown) => value is Page,
  fallback: Page,
): Page {
  let id: string | null = null;
  try {
    id = storage.getItem("wf-team");
  } catch {}
  return isPage(id) ? id : fallback;
}
