// Browser-only orchestration. No preference data or visitor headers are forwarded.
export function createPublicRequests() {
  let controller = new AbortController();
  let stopped = false;
  const pending = new Map<string, Promise<void>>();
  return {
    get running() {
      return !stopped;
    },
    start() {
      controller.abort();
      controller = new AbortController();
      pending.clear();
      stopped = false;
    },
    stop() {
      stopped = true;
      controller.abort();
      pending.clear();
    },
    async fetch(url: string, options: RequestInit = {}) {
      const active = controller;
      const signal = AbortSignal.any([
        active.signal,
        AbortSignal.timeout(25000),
        ...(options.signal ? [options.signal] : []),
      ]);
      const response = await fetch(url, {
        ...options,
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (active !== controller || signal.aborted)
        throw new DOMException("Request stopped", "AbortError");
      return response;
    },
    once(key: string, work: () => Promise<void>) {
      if (stopped) return Promise.resolve();
      const old = pending.get(key);
      if (old) return old;
      const request = work().finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
  };
}
export function pollPublicFeeds(refresh: () => void, live: () => void) {
  refresh();
  const feeds = setInterval(refresh, 300000);
  const scores = setInterval(live, 60000);
  return () => {
    clearInterval(feeds);
    clearInterval(scores);
  };
}
