import type { Game } from "./feeds";
import type { Odds } from "./odds";

type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  return value && typeof value === "object"
    ? (value as JsonObject)
    : {};
}

export const euroleagueOddsUrl =
  "https://www.oddsportal.com/basketball/europe/euroleague/";
const nameKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(kaunas|istanbul|bc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

// Read public page data without executing scripts or loading remote assets.
export function parseEuroleagueOdds(
  html: string,
  game: Game,
  checked: string,
): Odds | undefined {
  if (
    game.team !== "zalgiris" ||
    !/euroleague/i.test(game.league) ||
    game.state !== "pre"
  )
    return;
  const rows: JsonObject[] = [],
    markets: JsonObject[] = [];
  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = object(value);
    if (
      record["home-name"] &&
      record["away-name"] &&
      record.encodeEventId
    )
      rows.push(record);
    if (record.event && Array.isArray(record.odds)) markets.push(record);
    for (const child of Object.values(record)) walk(child);
  }
  const flight = [...html.matchAll(/self\.__next_f\.push\((\[1,[\s\S]*?\])\)/g)]
    .map((match) => {
      try {
        return JSON.parse(match[1])[1];
      } catch {
        return "";
      }
    })
    .join("");
  for (const line of flight.split("\n")) {
    try {
      walk(JSON.parse(line.slice(line.indexOf(":") + 1)));
    } catch {
      /* Ignore non-JSON Flight records. */
    }
  }
  const home = game.competitors.find((p) => p.homeAway === "home");
  const away = game.competitors.find((p) => p.homeAway === "away");
  if (!home || !away) return;
  const row = rows.find(
    (r) =>
      r.cols === "1|2" &&
      r["event-stage-name"] === "Scheduled" &&
      typeof r["home-name"] === "string" &&
      typeof r["away-name"] === "string" &&
      nameKey(r["home-name"]) === nameKey(home.name) &&
      nameKey(r["away-name"]) === nameKey(away.name) &&
      (typeof r["date-start-timestamp"] === "string" ||
        typeof r["date-start-timestamp"] === "number") &&
      Math.abs(
        Number(r["date-start-timestamp"]) * 1000 - Date.parse(game.date),
      ) <=
        15 * 60000,
  );
  if (!row) return;
  const market = markets.find((m) => m.event === row.id);
  const prices = Array.isArray(market?.odds)
    ? market.odds.map(object)
    : undefined;
  if (
    prices?.length !== 2 ||
    !prices.every(
      (p) =>
        p.active === true &&
        p.eventId === row.id &&
        p.bettingTypeId === 3 &&
        p.scopeId === 1 &&
        typeof p.avgOdds === "number" &&
        Number.isFinite(p.avgOdds) &&
        p.avgOdds > 1,
    )
  )
    return;
  const homePrice = Number(prices[0].avgOdds),
    awayPrice = Number(prices[1].avgOdds);
  return {
    favorite:
      homePrice === awayPrice
        ? "Even matchup — no moneyline favorite"
        : (homePrice < awayPrice ? home.name : away.name) + " favored",
    lines: [
      home.name + " average decimal moneyline " + homePrice.toFixed(2),
      away.name + " average decimal moneyline " + awayPrice.toFixed(2),
    ],
    source: "OddsPortal · average moneyline",
    checked,
    url: euroleagueOddsUrl,
  };
}

let cached: { html: string; checked: string } | undefined;
let retryAfter = 0;
let pending: Promise<typeof cached> | undefined;
export async function enrichEuroleagueOdds(games: Game[], checked: string) {
  const now = Date.parse(checked);
  const eligible = games.filter(
    (g) =>
      g.team === "zalgiris" &&
      /euroleague/i.test(g.league) &&
      g.state === "pre" &&
      !g.odds &&
      Date.parse(g.date) > now &&
      Date.parse(g.date) < now + 7 * 86400000,
  );
  if (!eligible.length) return;
  if (
    (!cached || now - Date.parse(cached.checked) >= 15 * 60000) &&
    now >= retryAfter
  ) {
    if (!pending)
      pending = (async () => {
        try {
          const response = await fetch(euroleagueOddsUrl, {
            signal: AbortSignal.timeout(12000),
            credentials: "omit",
            referrerPolicy: "no-referrer",
          });
          if (!response.ok) throw Error("Odds source unavailable");
          cached = {
            html: await response.text(),
            checked: new Date().toISOString(),
          };
        } catch {
          cached = undefined;
          retryAfter = Date.now() + 5 * 60000;
        }
        return cached;
      })().finally(() => {
        pending = undefined;
      });
    await pending;
  }
  if (!cached || now - Date.parse(cached.checked) >= 15 * 60000) return;
  for (const game of eligible) {
    const odds = parseEuroleagueOdds(cached.html, game, cached.checked);
    if (odds) game.odds = odds;
  }
}
