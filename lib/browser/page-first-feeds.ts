export async function loadPageBeforeBackground<Page>({
  currentPage,
  loadPage,
  background,
  isRunning,
}: {
  currentPage: () => Page;
  loadPage: (page: Page) => Promise<void>;
  background: (() => Promise<void>)[];
  isRunning: () => boolean;
}) {
  const loaded = new Map<Page, Promise<void>>();
  for (const task of background) {
    while (isRunning()) {
      const page = currentPage();
      let priority = loaded.get(page);
      if (!priority) {
        priority = loadPage(page);
        loaded.set(page, priority);
      }
      await priority;
      if (!isRunning()) return;
      if (page === currentPage()) break;
    }
    if (!isRunning()) return;
    await task();
  }
}
