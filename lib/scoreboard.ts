// Per-Worker cache of public provider data; never keyed by visitor information.
const cache = new Map<string, { checked: number; data: any }>();
const pending = new Map<string, Promise<any>>();
export function fetchScoreboard(league: string, date: string) {
  const key = league + ":" + date;
  const old = cache.get(key);
  if (old && Date.now() - old.checked < 30000)
    return Promise.resolve(structuredClone(old.data));
  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const response = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/" + league +
        "/scoreboard?dates=" + date + "&limit=100",
        { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw Error("Scoreboard unavailable");
      const data = await response.json();
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(key, { checked: Date.now(), data });
      return data;
    })().finally(() => { pending.delete(key); });
    pending.set(key, request);
  }
  // Parsing and merging may mutate provider data. Never share cache objects.
  return request.then((data) => structuredClone(data));
}
