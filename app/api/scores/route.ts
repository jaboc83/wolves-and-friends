// API route for fetching scores data. Returns the latest game scores or an error if unavailable.
import { fetchScoreboard } from "../../../lib/feeds/scoreboard";
import { fetchEuroLeagueGames } from "../../../lib/feeds/euroleague-scoreboard";
import { scoreboardLeagues } from "../../../lib/teams/competitions";
import { mergeLiveScoreboard, type Game } from "../../../lib/feeds";
type ScoreData = { checked: string; games: Game[]; unavailable: string[] };
let cached: ScoreData | null = null;
let inflight: Promise<ScoreData> | null = null;
async function collect() {
  const checked = new Date().toISOString(),
    games: Game[] = [],
    unavailable: string[] = [];
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  await Promise.all([
    ...scoreboardLeagues.map(async (league) => {
      try {
        mergeLiveScoreboard(games, await fetchScoreboard(league, date), league);
      } catch {
        unavailable.push(league);
      }
    }),
    (async () => {
      const result = await fetchEuroLeagueGames();
      games.push(...result.games);
      if (!result.available) unavailable.push("EuroLeague");
    })(),
  ]);
  cached = { checked, games, unavailable };
  return cached;
}

export async function GET() {
  if (cached && Date.now() - Date.parse(cached.checked) < 30000)
    return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
  if (!inflight)
    inflight = collect().finally(() => {
      inflight = null;
    });
  return Response.json(await inflight, {
    headers: { "Cache-Control": "no-store" },
  });
}
