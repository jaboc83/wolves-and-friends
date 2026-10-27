import { teams } from "../../../lib/teams/teams";
import {
  parsePlayerStats,
  type PlayerStats,
} from "../../../lib/team-info/player-stats";
import {
  isRosterResponse,
  rosterEntries,
  type RosterEntry as Entry,
  type RosterResponse,
} from "../../../lib/team-info/roster-response";
const batchSize = 3,
  ttl = 15 * 60000,
  statsDeadlineMs = 15000,
  statsRequestTimeoutMs = 10000;
// Responses are identical for every visitor, so shared caching is safe.
const manifestCache = "public, max-age=30, s-maxage=60";
const batchCache = "public, max-age=60, s-maxage=300";

function seasonIsInProgress(league: string, now = new Date()) {
  const month = now.getUTCMonth() + 1;
  if (league === "basketball/nba" || league === "hockey/nhl")
    return month >= 10 || month <= 4;
  if (league === "basketball/wnba") return month >= 5 && month <= 10;
  if (league === "football/nfl") return month >= 9 || month <= 2;
  if (league === "baseball/mlb") return month >= 3 && month <= 10;
  if (league === "soccer/usa.1") return month >= 2 && month <= 11;
  if (league === "soccer/eng.1") return month >= 8 || month <= 5;
  return true;
}
let manifest: Entry[] = [],
  expires = 0;
let manifestVersion = "";
let manifestComplete = false;
let manifestRequest: Promise<void> | null = null;
const cache = new Map<string, { expires: number; stats?: PlayerStats }>();
const inflight = new Map<string, Promise<PlayerStats | undefined>>();
const get = async <T>(url: string, timeout = 8000): Promise<T> => {
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (compatible; WolvesAndFriends/1.0)",
    },
    signal: AbortSignal.timeout(Math.max(1, timeout)),
  });
  if (!r.ok) throw Error("Stats unavailable");
  return (await r.json()) as T;
};
async function loadManifest() {
  if (Date.now() < expires) return;
  if (!manifestRequest)
    manifestRequest = (async () => {
      const failedTeams: string[] = [];
      const entries = await Promise.all(
        teams
          .filter((t) => t.league)
          .map(async (t) => {
            try {
              const response = await get<RosterResponse>(
                "https://site.api.espn.com/apis/site/v2/sports/" +
                  t.league +
                  "/teams/" +
                  t.espn +
                  "/roster",
              );
              if (!isRosterResponse(response))
                throw Error("Invalid roster response");
              return rosterEntries(response, t.league, t.espn);
            } catch {
              failedTeams.push(t.id);
              return [];
            }
          }),
      );
      const next = [...new Map(entries.flat().map((e) => [e.key, e])).values()];
      if (!next.length) throw Error("Roster manifest unavailable");
      manifest = next.sort((a, b) => a.key.localeCompare(b.key));
      manifestVersion = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(manifest)),
          ),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      // A partial manifest must not hide teams for the full TTL.
      if (failedTeams.length)
        console.warn("Roster manifest missing teams:", failedTeams.join(","));
      expires = Date.now() + (failedTeams.length ? 60000 : ttl);
      manifestComplete = failedTeams.length === 0;
    })().finally(() => {
      manifestRequest = null;
    });
  return manifestRequest;
}
async function stats(entry: Entry) {
  const cacheKey = "v8:" + entry.key + ":" + entry.teamId + ":" + entry.year;
  const old = cache.get(cacheKey);
  if (old && old.expires > Date.now()) return old.stats;
  if (!inflight.has(cacheKey))
    inflight.set(
      cacheKey,
      (async () => {
        // ESPN's common v3 feed is the responsive public representation for
        // player pages. Use it first so slow season-core 404s cannot consume
        // the full per-player budget before returning visible stats.
        const deadline = Date.now() + statsDeadlineMs;
        const remaining = () =>
          Math.min(statsRequestTimeoutMs, Math.max(1, deadline - Date.now()));
        const [sport, league] = entry.league.split("/");
        const commonBase =
          "https://site.api.espn.com/apis/common/v3/sports/" +
          entry.league +
          "/athletes/" +
          entry.id;
        const urls = entry.league.startsWith("soccer/")
          ? [commonBase + "/overview"]
          : [
              commonBase + "/stats",
              commonBase + "/overview",
              "https://site.api.espn.com/apis/site/v2/sports/" +
                entry.league +
                "/athletes/" +
                entry.id,
            ];
        for (const url of urls) {
          if (Date.now() >= deadline) break;
          try {
            const parsed = parsePlayerStats(
              await get<Parameters<typeof parsePlayerStats>[0]>(
                url,
                remaining(),
              ),
              entry.teamId,
              entry.league,
              entry.position,
              entry.year,
            );
            if (parsed) return parsed;
          } catch {
            // Try the next ESPN representation.
          }
        }
        // During an active season, keep players without current-season
        // stats as dashes rather than showing a prior season. Between seasons,
        // use the prior season only when the next season has not begun for the
        // whole league.
        const years = seasonIsInProgress(entry.league)
          ? [entry.year]
          : [entry.year, entry.year - 1];
        for (const year of years) {
          if (Date.now() >= deadline) break;
          try {
            const seasonType = entry.league.startsWith("soccer/") ? "1" : "2";
            const data = await get<Parameters<typeof parsePlayerStats>[0]>(
              "https://sports.core.api.espn.com/v2/sports/" +
                sport +
                "/leagues/" +
                league +
                "/seasons/" +
                year +
                "/types/" +
                seasonType +
                "/athletes/" +
                entry.id +
                "/statistics/0",
              Math.min(
                entry.league.startsWith("soccer/") ? 20000 : 3000,
                remaining(),
              ),
            );
            const parsed = parsePlayerStats(
              { ...data, season: { displayName: String(year) } },
              entry.teamId,
              entry.league,
              entry.position,
              year,
            );
            if (parsed) return parsed;
          } catch {
            // Missing current-season stats must not hide the last season.
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
      return Response.json(
        { error: "Roster manifest changed" },
        {
          status: 409,
          headers: { "Cache-Control": "no-store" },
        },
      );
    if (batch >= Math.max(1, Math.ceil(manifest.length / batchSize)))
      return Response.json({ error: "Invalid batch" }, { status: 400 });
    if (new URL(request.url).searchParams.get("manifest") === "1") {
      return Response.json(
        {
          players: [],
          totalBatches: Math.ceil(manifest.length / batchSize),
          manifestVersion,
          manifestKeys: manifest.map((entry) => entry.key),
          batchSize,
        },
        {
          headers: {
            "Cache-Control": manifestComplete ? manifestCache : "no-store",
          },
        },
      );
    }
    const players = await Promise.all(
      manifest
        .slice(batch * batchSize, (batch + 1) * batchSize)
        .map(async (entry) => ({ key: entry.key, stats: await stats(entry) })),
    );
    return Response.json(
      {
        players,
        totalBatches: Math.ceil(manifest.length / batchSize),
        manifestVersion,
        ...(batch === 0
          ? { manifestKeys: manifest.map((entry) => entry.key) }
          : {}),
      },
      {
        headers: {
          // Missing stats are often transient; do not pin them at the edge.
          "Cache-Control":
            manifestComplete && players.every((player) => player.stats)
              ? batchCache
              : "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Roster stats unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
