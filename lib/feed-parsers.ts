import { teams } from "./teams";
import { palaceCompetitions, teamPlaysCompetition } from "./competitions";
import type { Story, Game } from "./feed-types";
const text = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
const tag = (s: string, k: string) =>
  text(
    s.match(
      new RegExp("<" + k + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + k + ">", "i"),
    )?.[1] || "",
  );
export const safe = (u: string) => (/^https?:\/\//i.test(u) ? u : "");
export class FeedError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "FeedError";
  }
}

export function match(s: string) {
  return teams
    .filter((t) => new RegExp(t.pattern, "i").test(s))
    .map((t) => t.id);
}
export function parseNbaTeamNews(
  html: string,
  name = "Official Timberwolves",
  checked = new Date().toISOString(),
): Story[] {
  const decode = (value: string) =>
    value
      .replace(/\\u0026/g, "&")
      .replace(/\\u002F/g, "/")
      .replace(/\\u0022/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"');
  const stories: Story[] = [];
  const seen = new Set<string>();
  const patterns = [
    /"url"\s*:\s*"(\/timberwolves\/news\/[^"]+)"[\s\S]{0,1200}?"(?:title|headline)"\s*:\s*"([^"]+)"/gi,
    /href=["'](\/timberwolves\/news\/[^"'#?]+)["'][^>]*>[\s\S]{0,300}?(?:<h[1-6][^>]*>)?([^<]{12,180})</gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = "https://www.nba.com" + decode(match[1]);
      const title = text(decode(match[2]));
      if (!title || seen.has(url)) continue;
      seen.add(url);
      const context = html.slice(
        Math.max(0, (match.index || 0) - 800),
        (match.index || 0) + 1400,
      );
      const published =
        context.match(
          /(?:datePublished|published_at|publishDate)\\?"?\s*:\s*\\?"([^"]+)/i,
        )?.[1] ||
        context.match(/datetime=["']([^"']+)["']/i)?.[1] ||
        checked;
      stories.push({
        id: url,
        title,
        url,
        source: name,
        date: Number.isFinite(Date.parse(published)) ? published : checked,
        dateApproximate: published === checked,
        teams: ["wolves"],
        kind: "story",
      });
    }
  }
  return stories;
}

export function parseFeed(xml: string, name: string, only?: string[]): Story[] {
  if (!/<rss[\s>]|<feed[\s>]|<rdf:RDF[\s>]/i.test(xml))
    throw new FeedError("invalid-feed");
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ||
    [];
  return blocks
    .map((b) => {
      const title = tag(b, "title");
      const url = safe(
        tag(b, "link") ||
          b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ||
          "",
      );
      const date =
        tag(b, "pubDate") ||
        tag(b, "published") ||
        tag(b, "updated") ||
        tag(b, "dc:date");
      const ids = only || match(title + " " + tag(b, "description"));
      return {
        id: url,
        title,
        url,
        date,
        source: name,
        teams: ids,
        kind: name === "Howls and Growls" ? "video" : "story",
      };
    })
    .filter(
      (s) =>
        s.url &&
        s.title &&
        s.teams.length &&
        Number.isFinite(Date.parse(s.date)),
    );
}
export function parsePalaceRadar(html: string, checked: string): Story[] {
  const base = "https://www.palaceradar.co.uk";
  const year = new Date(checked).getUTCFullYear();
  const blocks = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  return blocks
    .map((block) => {
      const path = block.match(/href=["'](\/story\/[^"'#?]+)["']/i)?.[1];
      const title = tag(block, "h3");
      const rawDate = tag(block, "time");
      const parsedDate = rawDate ? new Date(`${rawDate} ${year}`) : null;
      const date = parsedDate && Number.isFinite(parsedDate.getTime())
        ? parsedDate.toISOString()
        : checked;
      return {
        id: path ? base + path : "",
        title,
        url: path ? base + path : "",
        date,
        source: "Palace Radar",
        teams: ["palace"],
        kind: "story",
      };
    })
    .filter((story) => story.url && story.title && Number.isFinite(Date.parse(story.date)));
}
export function parseGames(json: any, team: string, sport: string): Game[] {
  return (json.events || [])
    .map((e: any) => {
      const c = e.competitions?.[0] || {};
      const status = c.status || e.status || {};
      const league = teams.find((t) => t.id === team)?.league || "";
      const boxUrl = league.startsWith("soccer/")
        ? "https://www.espn.com/soccer/matchstats/_/gameId/" + e.id
        : league
          ? "https://www.espn.com/" +
            league.split("/")[1] +
            "/boxscore/_/gameId/" +
            e.id
          : "";
      return {
        competitionNote:
          [...(e.notes || []), ...(c.notes || [])]
            .map((n: any) => n.headline || n.text || "")
            .filter(Boolean)
            .join(" · ") || undefined,
        boxUrl,
        id: team + "-" + e.id,
        team,
        name: e.name,
        date: e.date,
        status: status.type?.shortDetail || status.type?.detail || "Scheduled",
        state: status.type?.completed ? "post" : status.type?.state || "pre",
        league:
          team === "palace"
            ? e.league?.name ||
              json.leagues?.[0]?.name ||
              (/friendl/i.test(e.seasonType?.name || "")
                ? e.seasonType.name
                : sport)
            : e.seasonType?.name ||
              (e.season?.type === 1 ? "Preseason" : sport),
        venue: [
          c.venue?.fullName,
          c.venue?.address?.city,
          c.venue?.address?.state || c.venue?.address?.country,
        ]
          .filter(Boolean)
          .join(" · "),
        broadcast: (c.broadcasts || [])
          .flatMap((b: any) => b.names || b.media?.shortName || [])
          .join(" · "),
        url: safe(
          e.links?.find((l: any) => l.href?.startsWith("https:"))?.href ||
            c.links?.[0]?.href ||
            "",
        ),
        competitors: (c.competitors || [])
          .sort((a: any, b: any) =>
            a.homeAway === "away" ? -1 : b.homeAway === "away" ? 1 : 0,
          )
          .map((p: any) => ({
            name: p.team?.shortDisplayName || p.team?.displayName || "",
            record:
              (p.records || []).find(
                (r: any) =>
                  r.type === "total" ||
                  r.name === "overall" ||
                  r.name === "Total",
              )?.summary ||
              (p.records || []).find(
                (r: any) =>
                  r.type === "total" ||
                  r.name === "overall" ||
                  r.name === "Total",
              )?.displayValue ||
              "",
            score: String(
              typeof p.score === "object"
                ? (p.score.displayValue ?? p.score.value ?? "")
                : (p.score ?? ""),
            ),
            winner: !!p.winner,
            homeAway: p.homeAway,
          })),
      };
    })
    .filter((g: Game) => g.date && g.competitors.length);
}
export function mergeLiveScoreboard(games: Game[], json: any, league: string) {
  for (const t of teams.filter((t) => teamPlaysCompetition(t.id, league))) {
    const events = (json.events || []).filter((e: any) =>
      e.competitions?.[0]?.competitors?.some(
        (p: any) =>
          String(p.team?.id) === t.espn ||
          p.team?.abbreviation?.toLowerCase() === t.espn,
      ),
    );
    for (const fresh of parseGames(
      { events },
      t.id,
      palaceCompetitions[league] || t.sport,
    )) {
      if (palaceCompetitions[league]) fresh.league = palaceCompetitions[league];
      const index = games.findIndex(
        (g) =>
          g.id === fresh.id ||
          (g.team === t.id &&
            Math.abs(Date.parse(g.date) - Date.parse(fresh.date)) <
              3 * 3600000),
      );
      if (index < 0) games.push(fresh);
      else
        games[index] = {
          ...games[index],
          ...fresh,
          competitionNote:
            fresh.competitionNote || games[index].competitionNote,
        };
    }
  }
}
