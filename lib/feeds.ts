import { discEvents } from "./event-seed";
import { verifyAuthorFeed } from "./bylines";
import {
  parseZalgirisNews,
  parseFrostNews,
  translateHeadlines,
} from "./club-news";
import { authorStories } from "./author-stories";
import {
  parsePalace,
  parseLoonsCalendar,
  mergeOfficial,
} from "./official-schedules";
import { teams } from "./teams";
import {
  palaceCompetitions,
  scoreboardLeagues,
  teamPlaysCompetition,
} from "./competitions";
import { parseZalgiris } from "./zalgiris";
import { enrichOdds } from "./odds";
import type { Odds } from "./odds";
import initial from "./initial.json";
export type Story = {
  avatar?: string;
  originalTitle?: string;
  dateApproximate?: boolean;
  premium?: boolean;
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  teams: string[];
  kind: string;
};
export type Game = {
  competitionNote?: string;
  eventOnly?: boolean;
  dateOnly?: boolean;
  endDate?: string;
  boxUrl?: string;
  sourceName?: string;
  sourceChecked?: string;
  odds?: Odds;
  id: string;
  team: string;
  name: string;
  date: string;
  status: string;
  state: string;
  league: string;
  venue: string;
  broadcast: string;
  url: string;
  competitors: {
    record?: string;
    name: string;
    score: string;
    winner: boolean;
    homeAway: string;
  }[];
};
export type Health = {
  name: string;
  status: string;
  checked: string;
  count: number;
  teams: string[];
};
export type AuthorFeed = {
  name: string;
  label: string;
  url: string;
  items: {
    title: string;
    url: string;
    date: string;
    originalId?: string;
    bylineVerified?: boolean;
    actualAuthors?: string[];
  }[];
  checked: string;
  status: string;
};
export type HubData = {
  checked: string;
  stories: Story[];
  games: Game[];
  health: Health[];
  authors?: AuthorFeed[];
};
let cached: HubData | null = null;
let inflight: Promise<HubData> | null = null;
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
const safe = (u: string) => (/^https?:\/\//i.test(u) ? u : "");
async function get(url: string) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept:
        "application/json, application/rss+xml, application/atom+xml, text/xml, text/html",
    },
  });
  if (!r.ok) throw Error(String(r.status));
  return r;
}
function match(s: string) {
  return teams
    .filter((t) => new RegExp(t.pattern, "i").test(s))
    .map((t) => t.id);
}
export function parseFeed(xml: string, name: string, only?: string[]): Story[] {
  if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) throw Error("Not a feed");
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ||
    [];
  return blocks
    .map((b) => {
      const title = tag(b, "title");
      const url = safe(
        tag(b, "link") || b.match(/<link[^>]*href="([^"]+)"/)?.[1] || "",
      );
      const date =
        tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
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
          e.seasonType?.name || (e.season?.type === 1 ? "Preseason" : sport),
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
export async function collect(): Promise<HubData> {
  const checked = new Date().toISOString();
  const stories: Story[] = [];
  const games: Game[] = [];
  const health: Health[] = [];
  const authors: AuthorFeed[] = [];
  async function task(name: string, ids: string[], f: () => Promise<number>) {
    try {
      health.push({
        name,
        teams: ids,
        checked,
        status: "ok",
        count: await f(),
      });
    } catch {
      health.push({
        name,
        teams: ids,
        checked,
        status: "unavailable",
        count: 0,
      });
    }
  }
  const feeds: [string, string, string[] | undefined][] = [
    [
      "EuroLeague · Google News index",
      "https://news.google.com/rss/search?q=Zalgiris%20site%3Aeuroleaguebasketball.net%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
      ["zalgiris"],
    ],
    ["PDGA News", "https://www.pdga.com/rss.xml", ["disc"]],
    ["Canis Hoopus", "https://www.canishoopus.com/rss/index.xml", undefined],
    [
      "Daily Norseman",
      "https://www.dailynorseman.com/rss/index.xml",
      ["vikings"],
    ],
    ["The Ice Garden", "https://www.theicegarden.com/rss/", undefined],
    ["Ultiworld Disc Golf", "https://discgolf.ultiworld.com/feed/", ["disc"]],
    [
      "Stars and Stripes FC",
      "https://www.starsandstripesfc.com/rss/index.xml",
      ["usmnt"],
    ],
    [
      "Howls and Growls",
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCHQf4fxeaf1MHDz9fW2mhsw",
      ["wolves"],
    ],
  ];
  await Promise.all(
    feeds.map(([name, url, ids]) =>
      task(
        name,
        ids ||
          (name === "Canis Hoopus"
            ? ["wolves", "lynx"]
            : name === "The Ice Garden"
              ? ["frost"]
              : ["zalgiris"]),
        async () => {
          const parsed = parseFeed(await (await get(url)).text(), name, ids);
          stories.push(
            ...(name.startsWith("EuroLeague")
              ? parsed.filter((s) => /zalgiris|žalgiris/i.test(s.title))
              : parsed),
          );
          return parsed.length;
        },
      ),
    ),
  );
  await Promise.all([
    task("Official Žalgiris news", ["zalgiris"], async () => {
      const parsed = parseZalgirisNews(
        await (
          await get(
            "https://zalgiris.lt/naujienos?category=zalgiris&subCategory=naujienos",
          )
        ).text(),
        checked,
      );
      if (!parsed.length) throw Error("No club news");
      await translateHeadlines(parsed);
      stories.push(...parsed);
      return parsed.length;
    }),
    task("Official Minnesota Frost", ["frost"], async () => {
      const parsed = parseFrostNews(
        await (
          await get("https://www.thepwhl.com/en/teams/minnesota-frost/news")
        ).text(),
      );
      if (!parsed.length) throw Error("No club news");
      stories.push(...parsed);
      return parsed.length;
    }),
  ]);
  const authorSources = [
    {
      name: "Jess Myers",
      label: "Google News index · bylines unverified",
      url: "https://www.twincities.com/author/jess-myers/",
      feed: "https://news.google.com/rss/search?q=%22Jess%20Myers%22%20site%3Atwincities.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
    {
      name: "Alec Lewis",
      label: "Google News index · bylines unverified",
      url: "https://www.nytimes.com/athletic/author/alec-lewis/",
      feed: "https://news.google.com/rss/search?q=%22Alec%20Lewis%22%20site%3Anytimes.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
    {
      name: "Will Ragatz",
      label: "Google News index · bylines unverified",
      url: "https://www.si.com/nfl/vikings/onsi/author/will-ragatz",
      feed: "https://news.google.com/rss/search?q=%22Will%20Ragatz%22%20site%3Asi.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
    {
      name: "Ben Goessling",
      label: "Google News index · bylines unverified",
      url: "https://www.startribune.com/author/ben-goessling/6134708",
      feed: "https://news.google.com/rss/search?q=%22Ben%20Goessling%22%20site%3Astartribune.com%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
    {
      name: "Britt Robson",
      label: "Google News index · bylines unverified",
      url: "https://www.minnpost.com/author/britt-robson/",
      feed: "https://news.google.com/rss/search?q=%22Britt+Robson%22+site%3Aminnpost.com+when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
    {
      name: "Jon Krawczynski",
      label: "Google News index · bylines unverified",
      url: "https://www.nytimes.com/athletic/author/jon-krawczynski/",
      feed: "https://news.google.com/rss/search?q=%22Jon+Krawczynski%22+when%3A14d&hl=en-US&gl=US&ceid=US%3Aen",
    },
  ];
  await Promise.all(
    authorSources.map(async (source) => {
      try {
        const xml = await (await get(source.feed)).text();
        let parsed = parseFeed(xml, source.name, ["wolves"]);
        if (source.name === "Jon Krawczynski")
          parsed = parsed.filter((s) => / - The New York Times$/.test(s.title));
        if (source.name === "Britt Robson")
          parsed = parsed.filter((s) => / - MinnPost$/.test(s.title));
        if (source.name === "Jess Myers")
          parsed = parsed.filter((s) => /wild/i.test(s.title));
        else if (source.name === "Alec Lewis")
          parsed = parsed.filter(
            (s) =>
              /vikings/i.test(s.title) &&
              / - The New York Times$/.test(s.title),
          );
        else if (source.name === "Will Ragatz")
          parsed = parsed.filter(
            (s) =>
              /vikings/i.test(s.title) &&
              / - Sports Illustrated$/.test(s.title),
          );
        else if (source.name === "Ben Goessling")
          parsed = parsed.filter(
            (s) =>
              /vikings/i.test(s.title) &&
              / - (?:The Minnesota )?Star Tribune$/.test(s.title),
          );
        else
          parsed = parsed.filter((s) =>
            /timberwolves|wolves|lynx|finch|edwards/i.test(s.title),
          );
        authors.push({
          ...source,
          items: parsed
            .slice(0, 4)
            .map(({ title, url, date }) => ({ title, url, date })),
          checked,
          status: "ok",
        });
      } catch {
        const old = (cached?.authors || initial.authors || []).find(
          (a) => a.name === source.name,
        );
        authors.push({
          ...source,
          items: old?.items || [],
          checked: old?.checked || checked,
          status: "unavailable",
        });
      }
    }),
  );
  await Promise.all(authors.map(verifyAuthorFeed));
  const sports = [...new Set(teams.map((t) => t.league).filter(Boolean))];
  await Promise.all(
    sports.map((league) =>
      task(
        "ESPN news · " + league.split("/")[1],
        teams.filter((t) => t.league === league).map((t) => t.id),
        async () => {
          const json = (await (
            await get(
              "https://site.api.espn.com/apis/site/v2/sports/" +
                league +
                "/news?limit=50",
            )
          ).json()) as any;
          let n = 0;
          for (const x of json.articles || []) {
            const ids = match(x.headline + " " + (x.description || ""));
            const url = safe(x.links?.web?.href || "");
            if (ids.length && url && x.published) {
              stories.push({
                id: url,
                title: x.headline,
                url,
                date: x.published,
                source: "ESPN",
                teams: ids,
                kind: x.type === "Media" ? "video" : "story",
              });
              n++;
            }
          }
          return n;
        },
      ),
    ),
  );
  await Promise.all(
    teams
      .filter((t) => t.league)
      .map((t) =>
        task("ESPN scores · " + t.short, [t.id], async () => {
          const json = await (
            await get(
              "https://site.api.espn.com/apis/site/v2/sports/" +
                t.league +
                "/teams/" +
                t.espn +
                "/schedule" +
                (t.id === "twins"
                  ? "?season=" + new Date().getFullYear() + "&seasontype=2"
                  : ""),
            )
          ).json();
          const parsed = parseGames(json, t.id, t.sport);
          if (t.id === "wolves") {
            const year =
              (json as any).season?.year ||
              new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0);
            const phases = await Promise.allSettled(
              [1, 2, 3].map(async (phase) =>
                parseGames(
                  await (
                    await get(
                      "https://site.api.espn.com/apis/site/v2/sports/" +
                        t.league +
                        "/teams/" +
                        t.espn +
                        "/schedule?season=" +
                        year +
                        "&seasontype=" +
                        phase,
                    )
                  ).json(),
                  t.id,
                  t.sport,
                ),
              ),
            );
            for (const phase of phases)
              if (phase.status === "fulfilled") parsed.push(...phase.value);
            if (phases.some((p) => p.status === "rejected")) {
              health.push({
                name: "ESPN full-season schedule · Wolves",
                teams: ["wolves"],
                checked,
                status: "unavailable",
                count: 0,
              });
              parsed.push(
                ...(cached || (initial as HubData)).games.filter(
                  (g) =>
                    g.team === "wolves" &&
                    Date.parse(g.date) > Date.now() - 86400000 &&
                    !parsed.some((p) => p.id === g.id),
                ),
              );
            }
          }
          const unique = [...new Map(parsed.map((g) => [g.id, g])).values()];
          games.push(...unique);
          return unique.length;
        }),
      ),
  );
  await task("Official Žalgiris schedule", ["zalgiris"], async () => {
    const r = await fetch("https://zalgiris.lt/rungtynes/", {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!r.ok) throw Error("Club schedule unavailable");
    const parsed = parseZalgiris(await r.text(), checked);
    games.push(...parsed);
    return parsed.length;
  });
  await Promise.all([
    ...Object.entries(palaceCompetitions).map(([league, name]) =>
      task("ESPN Palace schedule · " + name, ["palace"], async () => {
        const json = await (
          await get(
            "https://site.api.espn.com/apis/site/v2/sports/" +
              league +
              "/teams/384/schedule",
          )
        ).json();
        mergeLiveScoreboard(games, json, league);
        return (json as any).events?.length || 0;
      }),
    ),
    task("Official Palace schedule", ["palace"], async () => {
      const parsed = parsePalace(
        await (await get("https://www.cpfc.co.uk/matches/")).text(),
        checked,
      );
      if (!parsed.length) throw Error("No fixtures");
      mergeOfficial(games, parsed);
      return parsed.length;
    }),
    task("Official MNUFC calendar", ["loons"], async () => {
      const parsed = parseLoonsCalendar(
        await (
          await get(
            "https://images.mlssoccer.com/raw/upload/assets/min/calendar/mnufc" +
              new Date().getFullYear() +
              ".ics",
          )
        ).text(),
        checked,
      );
      mergeOfficial(games, parsed);
      return parsed.length;
    }),
  ]);
  games.push(
    ...discEvents.filter((g) => Date.parse(g.endDate || g.date) >= Date.now()),
  );
  const baseline = cached || (initial as HubData);
  for (const h of health.filter((h) => h.status === "unavailable")) {
    stories.push(
      ...baseline.stories.filter(
        (s) =>
          s.source === h.name ||
          (h.name === "Bluesky · Wolves starter pack" &&
            s.kind === "social" &&
            s.teams.includes("wolves")) ||
          (h.name === "Official Žalgiris news" &&
            s.source.startsWith("Official Žalgiris")) ||
          (h.name.startsWith("ESPN news") &&
            s.source === "ESPN" &&
            s.teams.some((id) => h.teams.includes(id))),
      ),
    );
    games.push(
      ...baseline.games.filter(
        (g) =>
          (h.name === "Official Žalgiris schedule" && g.team === "zalgiris") ||
          (h.name === "Official Palace schedule" &&
            g.team === "palace" &&
            g.sourceName === h.name) ||
          (h.name === "Official MNUFC calendar" &&
            g.team === "loons" &&
            g.sourceName === h.name) ||
          h.name ===
            "ESPN scores · " + teams.find((t) => t.id === g.team)?.short,
      ),
    );
  }
  stories.push(...authorStories(authors));
  const unique = new Map<string, Story>();
  for (const s of stories.sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  )) {
    if (!unique.has(s.url)) unique.set(s.url, s);
  }
  const scoreDates = [
    ...new Set(
      [0, -86400000].map((offset) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(new Date(Date.now() + offset))
          .replace(/-/g, ""),
      ),
    ),
  ];
  await Promise.all(
    scoreboardLeagues.flatMap((league) =>
      scoreDates.map((date) =>
        task(
          "ESPN live scoreboard · " + league + " · " + date,
          teams
            .filter((t) => teamPlaysCompetition(t.id, league))
            .map((t) => t.id),
          async () => {
            const json = await (
              await get(
                "https://site.api.espn.com/apis/site/v2/sports/" +
                  league +
                  "/scoreboard?dates=" +
                  date +
                  "&limit=100",
              )
            ).json();
            mergeLiveScoreboard(games, json, league);
            return (json as any).events?.length || 0;
          },
        ),
      ),
    ),
  );
  await enrichOdds(games, checked);
  return {
    checked,
    authors,
    stories: [...unique.values()]
      .filter(
        (s) =>
          !(
            s.source === "ESPN" &&
            /\b(?:game|match|full[- ]game|extended) highlights?\b/i.test(
              s.title,
            )
          ) && Date.parse(s.date) > Date.now() - 14 * 86400000,
      )
      .slice(0, 140),
    games,
    health,
  };
}
export function hubData() {
  if (cached && Date.now() - Date.parse(cached.checked) < 300000)
    return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = collect()
    .then((x) => {
      cached = x;
      return x;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
