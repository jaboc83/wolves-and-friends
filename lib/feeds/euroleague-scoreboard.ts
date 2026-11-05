import type { Game } from "./feed-types";

const cacheDuration = 30 * 1000;
const pastDateWindow = 7 * 24 * 60 * 60 * 1000;
const futureDateWindow = 36 * 60 * 60 * 1000;
const feedBase =
  "https://feeds.incrowdsports.com/provider/euroleague-feeds/v2/competitions/E/seasons/";

type FeedResult = { games: Game[]; available: boolean };
type CacheEntry = { checked: number; result: FeedResult };
type RecordValue = Record<string, unknown>;

let cached: CacheEntry | null = null;
let pending: Promise<FeedResult> | null = null;

function record(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function seasonCode(checked: string) {
  const date = new Date(checked);
  const year = date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0);
  return `E${year}`;
}

function gameState(status: string): Game["state"] {
  const normalized = status.toLowerCase().replace(/[\s_-]/g, "");
  if (["live", "inprogress", "inplay", "playing", "halftime", "break"].includes(normalized))
    return "in";
  if (["finished", "played", "final", "complete", "completed", "ended", "result"].includes(normalized))
    return "post";
  return "pre";
}

function score(value: unknown, state: Game["state"]) {
  if (state === "pre") return "";
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "";
}

export function parseEuroLeagueGames(payload: unknown, checked: string): Game[] {
  const root = record(payload);
  if (root?.status !== "success" || !Array.isArray(root.data))
    throw new Error("EuroLeague game feed unavailable");

  const now = Date.parse(checked);
  return root.data.flatMap((entry): Game[] => {
    const game = record(entry);
    const home = record(game?.home);
    const away = record(game?.away);
    const date = text(game?.date);
    const timestamp = Date.parse(date);
    if (
      !home ||
      !away ||
      ![home.code, home.tla, away.code, away.tla].includes("ZAL") ||
      !Number.isFinite(timestamp) ||
      timestamp < now - pastDateWindow ||
      timestamp > now + futureDateWindow
    )
      return [];

    const homeName = text(home.name);
    const awayName = text(away.name);
    const statusText = text(game?.status);
    const state = gameState(statusText);
    const quarter = text(game?.quarter);
    const remaining = text(game?.remainingTime);
    const clock = [
      quarter ? (/^\d+$/.test(quarter) ? `Q${quarter}` : quarter) : "",
      remaining,
    ]
      .filter(Boolean)
      .join(" ");
    const homeScore = score(home.score, state);
    const awayScore = score(away.score, state);
    const gameId = text(game?.identifier || game?.code || game?.id);
    const venue = record(game?.venue);

    return [
      {
        id: `zalgiris-euroleague-${gameId}`,
        team: "zalgiris",
        name: `${awayName} at ${homeName}`,
        date,
        status:
          state === "in"
            ? clock || "In progress"
            : state === "post"
              ? "Final"
              : "Scheduled",
        state,
        league: "EuroLeague",
        venue: text(venue?.name),
        broadcast: "",
        url: "https://www.euroleaguebasketball.net/en/euroleague/game-center/",
        sourceName: "EuroLeague Game Center",
        sourceChecked: checked,
        competitors: [
          {
            name: homeName,
            teamId: text(home.code),
            score: homeScore,
            winner:
              state === "post" && Number(homeScore) > Number(awayScore),
            homeAway: "home",
          },
          {
            name: awayName,
            teamId: text(away.code),
            score: awayScore,
            winner:
              state === "post" && Number(awayScore) > Number(homeScore),
            homeAway: "away",
          },
        ],
      },
    ];
  });
}

export function fetchEuroLeagueGames(): Promise<FeedResult> {
  if (cached && Date.now() - cached.checked < cacheDuration)
    return Promise.resolve(cached.result);
  if (pending) return pending;

  pending = (async () => {
    let result: FeedResult;
    try {
      const checked = new Date().toISOString();
      const response = await fetch(
        `${feedBase}${seasonCode(checked)}/games?limit=500`,
        {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error("EuroLeague game feed unavailable");
      result = {
        games: parseEuroLeagueGames(await response.json(), checked),
        available: true,
      };
    } catch {
      result = { games: [], available: false };
    }
    cached = { checked: Date.now(), result };
    return result;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

