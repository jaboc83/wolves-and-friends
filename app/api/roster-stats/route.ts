import { teams } from "../../../lib/teams/teams";
import { parsePlayerStats, type PlayerStats } from "../../../lib/player-stats";
const batchSize = 3,
  ttl = 15 * 60000,
  statsDeadlineMs = 60000,
  statsRequestTimeoutMs = 60000;
type RosterPerson = {
  id?: string | number;
  items?: RosterPerson[];
  position?: {
    displayName?: string;
    abbreviation?: string;
  };
};
type RosterResponse = {
  athletes?: RosterPerson[];
  team?: { id?: string | number };
  season?: { year?: number | string };
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isRosterPerson(value: unknown): value is RosterPerson {
  if (!isRecord(value)) return false;
  const person = value;
  const position = person.position;
  return (
    (person.id === undefined ||
      typeof person.id === "string" ||
      typeof person.id === "number") &&
    (person.items === undefined ||
      (Array.isArray(person.items) && person.items.every(isRosterPerson))) &&
    (position === undefined ||
      (isRecord(position) &&
        ["displayName", "abbreviation"].every((key) => {
          const field = position[key];
          return field === undefined || typeof field === "string";
        })))
  );
}
type Entry = {
  key: string;
  league: string;
  id: string;
  teamId: string;
  year: number;
  position: string;
};
let manifest: Entry[] = [],
  expires = 0;
let manifestVersion = "";
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
function isRosterResponse(value: unknown): value is RosterResponse {
  if (!isRecord(value)) return false;
  const response = value;
  return (
    (response.athletes === undefined ||
      (Array.isArray(response.athletes) &&
        response.athletes.every(isRosterPerson))) &&
    (response.team === undefined ||
      (isRecord(response.team) &&
        (response.team.id === undefined ||
          typeof response.team.id === "string" ||
          typeof response.team.id === "number"))) &&
    (response.season === undefined ||
      (isRecord(response.season) &&
        (response.season.year === undefined ||
          typeof response.season.year === "number" ||
          typeof response.season.year === "string")))
  );
}
async function loadManifest() {
  if (Date.now() < expires) return;
  if (!manifestRequest)
    manifestRequest = (async () => {
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
              const data = response;
              const players = (data.athletes || []).flatMap(
                (person) => person.items || [person],
              );
              return players
                .filter((person) => /^\d+$/.test(String(person.id)))
                .map((person) => ({
                  key: t.league + ":" + person.id,
                  league: t.league,
                  id: String(person.id),
                  teamId: String(data.team?.id || t.espn),
                  year:
                    Number(data.season?.year) || new Date().getUTCFullYear(),
                  position: String(
                    person.position?.displayName ||
                      person.position?.abbreviation ||
                      "",
                  ),
                }));
            } catch {
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
      expires = Date.now() + ttl;
    })().finally(() => {
      manifestRequest = null;
    });
  return manifestRequest;
}
async function stats(entry: Entry) {
  const cacheKey = "v7:" + entry.key + ":" + entry.teamId + ":" + entry.year;
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
            );
            if (parsed) return parsed;
          } catch {
            // Try the next ESPN representation.
          }
        }
        // Before the new season starts, the common feed may be empty. Fall
        // back to season-specific endpoints and try the previous season too.
        for (const year of [entry.year, entry.year - 1]) {
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
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Roster stats unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
