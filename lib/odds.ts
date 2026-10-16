import { enrichEuroleagueOdds } from "./euroleague-odds";
import { teams } from "./teams";
import type { Game } from "./feeds";
export type Odds = {
  favorite: string;
  lines: string[];
  source: string;
  checked: string;
  url: string;
};
const price = (o: any, market: string, side: string, key: string) =>
  o[market]?.[side]?.close?.[key];
export function parseOdds(
  event: any,
  teamId: string,
  checked: string,
): Odds | undefined {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return;
  const c = event.competitions?.[0];
  const o = c?.odds?.find((x: any) => x.moneyline || x.pointSpread);
  if (!o) return;
  const competitors = c.competitors || [];
  const names: Record<string, string> = {};
  for (const p of competitors)
    names[p.homeAway] = p.team?.shortDisplayName || p.team?.displayName;
  if (!names.home || !names.away) return;
  const lines: string[] = [];
  const ml: Record<string, number> = {};
  for (const side of ["away", "home"]) {
    const val = price(o, "moneyline", side, "odds");
    if (
      val !== undefined &&
      Number.isFinite(Number(val)) &&
      Number(val) !== 0
    ) {
      ml[side] = Number(val);
      lines.push(names[side] + " ML " + val);
    }
  }
  const draw = price(o, "moneyline", "draw", "odds");
  if (draw !== undefined) lines.push("Draw " + draw);
  let favorite = "";
  if (team.sport === "NBA" || team.sport === "WNBA" || team.sport === "NFL") {
    for (const side of ["away", "home"]) {
      const line = price(o, "pointSpread", side, "line");
      if (line !== undefined && Number(line) < 0)
        favorite =
          names[side] + " favored by " + Math.abs(Number(line)) + " points";
    }
  }
  if (!favorite && ml.away !== undefined && ml.home !== undefined) {
    if (ml.away === ml.home) favorite = "Even matchup — no moneyline favorite";
    else {
      const probability = (n: number) =>
        n < 0 ? -n / (-n + 100) : 100 / (n + 100);
      const side =
        probability(ml.home) > probability(ml.away) ? "home" : "away";
      favorite =
        names[side] +
        (Math.abs(probability(ml.home) - probability(ml.away)) < 0.08
          ? " slight favorite"
          : " favored");
    }
  }
  if (!favorite) return;
  for (const side of ["away", "home"]) {
    const line = price(o, "pointSpread", side, "line");
    const odds = price(o, "pointSpread", side, "odds");
    if (line !== undefined)
      lines.push(
        names[side] +
          " " +
          (team.sport === "NHL" ? "puck line" : "spread") +
          " " +
          line +
          (odds !== undefined ? " (" + odds + ")" : ""),
      );
  }
  const league = team.league.split("/")[1];
  return {
    favorite,
    lines,
    source:
      (o.provider?.displayName || o.provider?.name || "Market") + " via ESPN",
    checked,
    url:
      "https://www.espn.com/" +
      (team.league.startsWith("soccer") ? "soccer/match" : league + "/game") +
      "/_/gameId/" +
      event.id,
  };
}
export function oddsLeague(g: Game) {
  const team = teams.find((t) => t.id === g.team);
  if (!team) return "";
  if (team.league.startsWith("soccer/")) {
    if (/conference league/i.test(g.league)) return "soccer/uefa.europa.conf";
    if (/europa league/i.test(g.league)) return "soccer/uefa.europa";
    if (/champions league/i.test(g.league)) return "soccer/uefa.champions";
    if (g.team === "palace") {
      if (/FA Cup/i.test(g.league)) return "soccer/eng.fa";
      if (/league cup|EFL Cup|Carabao/i.test(g.league))
        return "soccer/eng.league_cup";
    }
  }
  return team.league;
}
export function oddsMatch(g: Game, event: any) {
  if (g.id === g.team + "-" + event.id) return true;
  const team = teams.find((t) => t.id === g.team);
  if (
    !team ||
    Math.abs(Date.parse(g.date) - Date.parse(event.date)) > 3 * 3600000 ||
    !Number.isFinite(Date.parse(event.date))
  )
    return false;
  return !!event.competitions?.[0]?.competitors?.some(
    (p: any) =>
      String(p.team?.id) === team.espn ||
      p.team?.abbreviation?.toLowerCase() === team.espn,
  );
}
export async function enrichOdds(games: Game[], checked: string) {
  await enrichEuroleagueOdds(games, checked);
  const jobs = new Map<string, { league: string; date: string }>();
  for (const g of games
    .filter(
      (g) =>
        g.state !== "post" &&
        Date.parse(g.date) > Date.now() - 12 * 3600000 &&
        Date.parse(g.date) < Date.now() + 7 * 86400000,
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    const t = teams.find((t) => t.id === g.team);
    if (!t?.league) continue;
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date(g.date))
      .replaceAll("-", "");
    const league = oddsLeague(g);
    const key = league + "/" + date;
    if (jobs.size < 12 || jobs.has(key)) jobs.set(key, { league, date });
  }
  await Promise.all(
    [...jobs.values()].map(async ({ league, date }) => {
      try {
        const r = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/" +
            league +
            "/scoreboard?dates=" +
            date,
          { signal: AbortSignal.timeout(12000) },
        );
        if (!r.ok) return;
        const json = (await r.json()) as any;
        for (const event of json.events || []) {
          for (const g of games.filter(
            (g) =>
              g.state !== "post" &&
              oddsLeague(g) === league &&
              oddsMatch(g, event),
          )) {
            const odds = parseOdds(event, g.team, checked);
            if (odds) g.odds = odds;
          }
        }
      } catch {
        /* Missing markets remain unlabeled. */
      }
    }),
  );
}
