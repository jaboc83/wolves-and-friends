import { teams } from "../../../lib/teams";
import { parsePlayerStats, type PlayerStats } from "../../../lib/player-stats";
const batchSize = 3,
  ttl = 15 * 60000;
type Entry = { key: string; league: string; id: string; teamId: string; year: number };
let manifest: Entry[] = [],
  expires = 0;
let manifestVersion = "";
let manifestRequest: Promise<void> | null = null;
const cache = new Map<string, { expires: number; stats?: PlayerStats }>();
const inflight = new Map<string, Promise<PlayerStats | undefined>>();
const get = async (url: string, timeout = 8000): Promise<any> => {
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(Math.max(1, timeout)),
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
                  year: Number(data.season?.year) || new Date().getUTCFullYear(),
                }));
            } catch {
              return [];
            }
          }),
      );
      const next = [...new Map(entries.flat().map((e) => [e.key, e])).values()];
      if (!next.length) throw Error("Roster manifest unavailable");
      manifest = next.sort((a, b) => a.key.localeCompare(b.key));
      manifestVersion = Array.from(new Uint8Array(await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(JSON.stringify(manifest)),
      )), (byte) => byte.toString(16).padStart(2, "0")).join("");
      expires = Date.now() + ttl;
    })().finally(() => {
      manifestRequest = null;
    });
  return manifestRequest;
}
async function stats(entry: Entry) {
  const cacheKey = entry.key + ":" + entry.teamId + ":" + entry.year;
  const old = cache.get(cacheKey);
  if (old && old.expires > Date.now()) return old.stats;
  if (!inflight.has(cacheKey))
    inflight.set(
      cacheKey,
      (async () => {
        // Use ESPN's season-specific core API first. Before the new season
        // starts it can be empty/404, so try the previous season explicitly.
        const deadline = Date.now() + 12000;
        const remaining = () => Math.min(8000, Math.max(1, deadline - Date.now()));
        const [sport, league] = entry.league.split("/");
        for (const year of [entry.year, entry.year - 1]) {
          if (Date.now() >= deadline) break;
          try {
            const data = await get(
              "https://sports.core.api.espn.com/v2/sports/" + sport +
              "/leagues/" + league + "/seasons/" + year +
              "/types/2/athletes/" + entry.id + "/statistics/0",
              remaining(),
            );
            const parsed = parsePlayerStats({ ...data, season: { displayName: String(year) } });
            if (parsed) return parsed;
          } catch {
            // Missing current-season stats must not hide the last season.
          }
        }
        const urls = [
          "https://site.web.api.espn.com/apis/common/v3/sports/" +
            entry.league +
            "/athletes/" +
            entry.id +
            "/stats",
          "https://site.web.api.espn.com/apis/common/v3/sports/" +
            entry.league +
            "/athletes/" +
            entry.id +
            "/overview",
          "https://site.api.espn.com/apis/site/v2/sports/" +
            entry.league +
            "/athletes/" +
            entry.id,
        ];
        for (const url of urls) {
          if (Date.now() >= deadline) break;
          try {
            const parsed = parsePlayerStats(await get(url, remaining()), entry.teamId);
            if (parsed) return parsed;
          } catch {
            // Try the next ESPN representation.
          }
        }
        return undefined;
      })()
        .then((stats) => {
          // A missing or failed response can be transient. Keep successful
          // stats warm, but let missing values retry soon instead of hiding
          // recovered ESPN data for the full positive-cache window.
          cache.set(cacheKey, {
            expires: Date.now() + (stats ? ttl : 2 * 60000),
            stats,
          });
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
  if (!Number.isSafeInteger(batch) || batch < 0)
    return Response.json({ error: "Invalid batch" }, { status: 400 });
  try {
    await loadManifest();
    const version = new URL(request.url).searchParams.get("version");
    if (version && version !== manifestVersion)
      return Response.json({ error: "Roster manifest changed" }, {
        status: 409, headers: { "Cache-Control": "no-store" },
      });
    if (batch >= Math.max(1, Math.ceil(manifest.length / batchSize)))
      return Response.json({ error: "Invalid batch" }, { status: 400 });
    const players = await Promise.all(
      manifest
        .slice(batch * batchSize, (batch + 1) * batchSize)
        .map(async (entry) => ({ key: entry.key, stats: await stats(entry) })),
    );
    return Response.json(
      { players, totalBatches: Math.ceil(manifest.length / batchSize), manifestVersion },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Roster stats unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

