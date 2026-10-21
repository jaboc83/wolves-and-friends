import { fetchScoreboard } from "../../../lib/scoreboard";
import { scoreboardLeagues } from "../../../lib/competitions";
import { mergeLiveScoreboard, type Game } from "../../../lib/feeds";
let cached: { checked: string; games: Game[]; unavailable: string[] } | null =
  null;
let inflight: Promise<NonNullable<typeof cached>> | null = null;
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
  await Promise.all(
    scoreboardLeagues.map(async (league) => {
      try {
        mergeLiveScoreboard(games, await fetchScoreboard(league, date), league);
      } catch {
        unavailable.push(league);
      }
    }),
  );
  cached = { checked, games, unavailable };
  return cached;
}


export async function GET() {
  if (cached && Date.now() - Date.parse(cached.checked) < 30000)
    return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
  if (!inflight) inflight = collect().finally(() => { inflight = null; });
  return Response.json(await inflight, { headers: { "Cache-Control": "no-store" } });
}
