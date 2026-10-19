import { teams } from "../../../lib/teams";
import { parsePlayerStats, type PlayerStats } from "../../../lib/player-stats";
const batchSize = 18,
  ttl = 15 * 60000;
type Entry = { key: string; league: string; id: string; teamId: string };
let manifest: Entry[] = [],
  expires = 0;
let manifestRequest: Promise<void> | null = null;
const cache = new Map<string, { expires: number; stats?: PlayerStats }>();
const inflight = new Map<string, Promise<PlayerStats | undefined>>();
const get = async (url: string): Promise<any> => {
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw Error("Stats unavailable");
  return r.json();
};
async function loadManifest() {
  if (Date.now() < expires) return;
  if (!manifestRequest)
    manifestRequest = (async () => {
      const entries = await Promise.all(
        teams
          .filter((t) => t.league)
          .map(async (t) => {
            try {
              const data = await get(
                "https://site.api.espn.com/apis/site/v2/sports/" +
                  t.league +
                  "/teams/" +
                  t.espn +
                  "/roster",
              );
              const players = (data.athletes || []).flatMap(
                (a: any) => a.items || [a],
              );
              return players
                .filter((a: any) => /^\d+$/.test(String(a.id)))
                .map((a: any) => ({
                  key: t.league + ":" + a.id,
                  league: t.league,
                  id: String(a.id),
                  teamId: String(data.team?.id || t.espn),
                }));
            } catch {
              return [];
            }
          }),
      );
      const next = [...new Map(entries.flat().map((e) => [e.key, e])).values()];
      if (!next.length) throw Error("Roster manifest unavailable");
      manifest = next;
      expires = Date.now() + ttl;
    })().finally(() => {
      manifestRequest = null;
    });
  return manifestRequest;
}
async function stats(entry: Entry) {
  const cacheKey = entry.key + ":" + entry.teamId;
  const old = cache.get(cacheKey);
  if (old && old.expires > Date.now()) return old.stats;
  if (!inflight.has(cacheKey))
    inflight.set(
      cacheKey,
      get(
        "https://site.web.api.espn.com/apis/common/v3/sports/" +
          entry.league +
          "/athletes/" +
          entry.id +
          "/stats",
      )
        .then((data) => parsePlayerStats(data, entry.teamId))
        .catch(() => undefined)
        .then((stats) => {
          cache.set(cacheKey, { expires: Date.now() + ttl, stats });
          return stats;
        })
        .finally(() => {
          inflight.delete(cacheKey);
        }),
    );
  return inflight.get(cacheKey);
}
export async function GET(request: Request) {
  // Public, fixed batches are identical for all visitors; no team preferences,
  // read state, browser identifiers or visitor headers are accepted/forwarded.
  const batch = Number(new URL(request.url).searchParams.get("batch") || "0");
  if (!Number.isInteger(batch) || batch < 0 || batch > 100)
    return Response.json({ error: "Invalid batch" }, { status: 400 });
  try {
    await loadManifest();
    const players = await Promise.all(
      manifest
        .slice(batch * batchSize, (batch + 1) * batchSize)
        .map(async (entry) => ({ key: entry.key, stats: await stats(entry) })),
    );
    return Response.json(
      { players, totalBatches: Math.ceil(manifest.length / batchSize) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Roster stats unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
