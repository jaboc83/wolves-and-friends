// Parses official club calendars and merges their fixtures with provider schedules.
import type { Game } from "./feed-types";
import { palaceProviders } from "../teams/palace/providers";
import { loonsProviders } from "../teams/loons/providers";
type ProviderObject = Record<string, unknown>;
const providerObject = (value: unknown): ProviderObject =>
  value && typeof value === "object" ? (value as ProviderObject) : {};
export function parsePalace(html: string, checked: string): Game[] {
  const flight = [...html.matchAll(/self\.__next_f\.push\((\[1,[\s\S]*?\])\)/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1])[1];
      } catch {
        return "";
      }
    })
    .join("");
  const matches = new Map<string, ProviderObject>();
  function walk(value: unknown) {
    const x = providerObject(value);
    if (!x || typeof x !== "object") return;
    if (x.homeTeam && x.awayTeam && x.date && x.id)
      matches.set(String(x.id), x);
    for (const v of Object.values(x)) walk(v);
  }
  for (const line of flight.split("\n")) {
    try {
      walk(JSON.parse(line.slice(line.indexOf(":") + 1)));
    } catch {}
  }
  return [...matches.values()].map((x) => {
    const homeTeam = providerObject(x.homeTeam);
    const awayTeam = providerObject(x.awayTeam);
    const state = /complete|finished|played|result/i.test(String(x.status))
      ? "post"
      : /live|inprogress/i.test(String(x.status))
        ? "in"
        : "pre";
    const competition = providerObject(x.competition);
    const venue = providerObject(x.venue);
    const competitors: [string, ProviderObject, unknown][] = [
      ["away", awayTeam, x.awayTeamScore],
      ["home", homeTeam, x.homeTeamScore],
    ];
    return {
      id: "palace-official-" + String(x.id),
      team: "palace",
      name: String(awayTeam.name) + " at " + String(homeTeam.name),
      date: String(x.date),
      status:
        state === "post"
          ? "Final"
          : state === "in"
            ? "In progress"
            : "Scheduled",
      state,
      league:
        (typeof competition.name === "string" && competition.name) || "Soccer",
      venue: (typeof venue.name === "string" && venue.name) || "",
      broadcast: "",
      url: palaceProviders.urls.officialSchedule,
      sourceName: "Official Palace schedule",
      sourceChecked: checked,
      competitors: competitors.map(([homeAway, team, score]) => ({
        name:
          (typeof team.shortName === "string" && team.shortName) ||
          (typeof team.name === "string" && team.name) ||
          "",
        homeAway,
        score: score == null ? "" : String(score),
        winner: false,
      })),
    };
  });
}
function zonedDate(v: string, zone: string) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return "";
  const n = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  if (v.endsWith("Z")) return new Date(n).toISOString();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(n));
  const o = parts
    .find((p) => p.type === "timeZoneName")
    ?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = o ? (o[1] === "+" ? 1 : -1) * (+o[2] * 60 + +o[3]) * 60000 : 0;
  return new Date(n - offset).toISOString();
}
export function parseLoonsCalendar(ics: string, checked: string): Game[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  return (unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).flatMap(
    (b) => {
      const start = b.match(/DTSTART(?:;TZID=([^:\r\n]+))?:(.+)/);
      const summary = b.match(/SUMMARY:(.+)/)?.[1].trim() || "";
      const sides = summary.split(/\s+vs\.?\s+/i);
      const date = start
        ? zonedDate(start[2].trim(), start[1] || "America/Chicago")
        : "";
      if (!date || sides.length !== 2 || Date.parse(date) < Date.parse(checked))
        return [];
      return [
        {
          id: "loons-calendar-" + (b.match(/UID:(.+)/)?.[1].trim() || date),
          team: "loons",
          name: summary,
          date,
          status: "Scheduled",
          state: "pre",
          league: "MLS",
          venue: (b.match(/LOCATION:(.+)/)?.[1] || "")
            .replace(/\\,/g, ",")
            .trim(),
          broadcast: "",
          url: loonsProviders.urls.schedulePage,
          sourceName: "Official MNUFC calendar",
          sourceChecked: checked,
          competitors: sides.map((name, i) => ({
            name: name === "MNUFC" ? "Minnesota United" : name,
            homeAway: i === 0 ? "home" : "away",
            score: "",
            winner: false,
          })),
        },
      ];
    },
  );
}
export function mergeOfficial(games: Game[], official: Game[]) {
  for (const g of official) {
    const index = games.findIndex(
      (old) =>
        old.team === g.team &&
        Math.abs(Date.parse(old.date) - Date.parse(g.date)) < 18 * 3600000,
    );
    if (index < 0) games.push(g);
    else if (games[index].state === "pre")
      games[index] = {
        ...g,
        competitors: g.competitors.map((p) => ({
          ...p,
          record: games[index].competitors.find(
            (old) => old.homeAway === p.homeAway,
          )?.record,
        })),
        id: games[index].id,
        boxUrl: games[index].boxUrl,
        url: games[index].url || g.url,
      };
  }
}

export function mergeFallbackGames(games: Game[], fallback: Game[]) {
  for (const game of fallback) {
    const duplicate = games.some(
      (current) =>
        current.id === game.id ||
        (current.team === game.team &&
          Math.abs(Date.parse(current.date) - Date.parse(game.date)) <
            3 * 3600000),
    );
    if (!duplicate) games.push(game);
  }
}
