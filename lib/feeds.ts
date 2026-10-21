import { newsSources, authorSources } from "./news-sources";
import { safe, match, FeedError, parseNbaTeamNews, parseFeed, parsePalaceRadar, parseGames, mergeLiveScoreboard } from "./feed-parsers";
export { parseNbaTeamNews, parseFeed, parsePalaceRadar, parseGames, mergeLiveScoreboard } from "./feed-parsers";
import { runProviderTasks, type ProviderTask } from "./provider-tasks";
import { fetchScoreboard } from "./scoreboard";
import { discEvents } from "./event-seed";
import { parseDgptSchedule } from "./dgpt";
import { eventLifecycle } from "./event-time";
import { verifyAuthorFeed } from "./bylines";
import { parseFrostNews } from "./club-news";
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
import { parsePwhlSchedule } from "./special-team-data";
import { enrichOdds } from "./odds";
import type { Odds } from "./odds";
import initial from "./initial.json";
import type { Story, Game, Health, AuthorFeed, HubData } from "./feed-types";
export type { Story, Game, Health, AuthorFeed, HubData } from "./feed-types";
const sectionCache: Partial<Record<string, HubData>> = {};
const sectionInflight: Partial<Record<string, Promise<HubData>>> = {};
function safeFeedError(error: unknown) {
  if (error instanceof FeedError) return error.code;
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "timeout";
  return "request-failed";
}

async function providerGet(url: string, signal?: AbortSignal) {
  try {
    const r = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(url.includes("eurohoops.net") ? 30000 : 12000)]) : AbortSignal.timeout(12000),
      headers: {
        // A stable server identifier helps publishers allow-list the feed request
        // without forwarding any visitor/browser headers or identifiers.
        "User-Agent": "WolvesAndFriendsFeed/1.0 (+https://wolvesandfriends.moening.org)",
        Accept:
          "application/json, application/rss+xml, application/atom+xml, text/xml, text/html",
      },
    });
    if (!r.ok) throw new FeedError("http-" + r.status);
    return r;
  } catch (error) {
    throw error instanceof FeedError ? error : new FeedError(safeFeedError(error));
  }
}
export async function collect(
  section: "news" | "schedules" | "all" = "all",
  team?: string,
): Promise<HubData> {
  const started = Date.now();
  const cached = sectionCache[team ? `${section}:${team}` : section] || null;
  const checked = new Date().toISOString();
  const stories: Story[] = [];
  const games: Game[] = [];
  let wolvesInjuries: Game["injuries"];
  const health: Health[] = [];
  const authors: AuthorFeed[] = [];
  type Output = { stories: Story[]; games: Game[]; health: Health[]; authors: AuthorFeed[]; injuries?: Game["injuries"]; count: number; failed?: boolean };
  const tasks: ProviderTask<Output>[] = [];
  const taskTeams: string[][] = [];
  async function task(name: string, ids: string[], f: (output: Output, signal: AbortSignal) => Promise<number>) {
    if (team && !ids.includes(team)) return;
    taskTeams.push(ids);
    tasks.push({ name, run: async (signal) => {
      const output: Output = { stories: [], games: [], health: [], authors: [], count: 0 };
      output.count = await f(output, signal);
      return output;
    } });
  }
  if (section !== "schedules") {
    await task("Official Timberwolves news", ["wolves"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
      const parsed = parseNbaTeamNews(
        await (await get("https://www.nba.com/timberwolves/news")).text(),
      );
      if (!parsed.length) throw new Error("No NBA team stories");
      stories.push(...parsed);
      return parsed.length;
    });
    await Promise.all(
      newsSources.map(([name, url, ids]) =>
        task(
          name,
          ids ||
            (name === "Canis Hoopus"
              ? ["wolves", "lynx"]
              : name === "The Ice Garden"
                ? ["frost"]
                : ["zalgiris"]),
          async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
      task("Palace Radar", ["palace"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
        const parsed = parsePalaceRadar(
          await (await get("https://www.palaceradar.co.uk/")).text(),
          checked,
        );
        if (!parsed.length) throw Error("No Palace Radar stories");
        stories.push(...parsed);
        return parsed.length;
      }),
      task("Official Minnesota Frost", ["frost"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
    await Promise.all(
      authorSources
        .filter(
          (source) =>
            !team ||
            ((source.name === "Jess Myers" || source.name === "Michael Russo")
              ? team === "wild"
              : ["Alec Lewis", "Will Ragatz", "Ben Goessling"].includes(
                    source.name,
                  )
                ? team === "vikings"
                : team === "wolves"),
        )
        .map((source) => task("Author news · " + source.name,
          [source.name === "Jess Myers" || source.name === "Michael Russo" ? "wild" :
            ["Alec Lewis", "Will Ragatz", "Ben Goessling"].includes(source.name) ? "vikings" : "wolves"],
          async (output, signal) => {
          const { authors } = output;
          const get = (url: string) => providerGet(url, signal);
          try {
            const xml = await (await get(source.feed)).text();
            let parsed = parseFeed(xml, source.name, ["wolves"]);
            if (source.name === "Jon Krawczynski")
              parsed = parsed.filter(
                (s) =>
                  / - The New York Times$/.test(s.title) ||
                  /timberwolves|wolves/i.test(s.title),
              );
            if (source.name === "Britt Robson")
              parsed = parsed.filter((s) => / - MinnPost$/.test(s.title));
            if (source.name === "Jess Myers" || source.name === "Michael Russo")
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
            const author: AuthorFeed = {
              ...source,
              items: parsed
                .slice(0, 4)
                .map(({ title, url, date }) => ({ title, url, date })),
              checked,
              status: "ok",
            };
            await verifyAuthorFeed(author, signal);
            authors.push(author);
          } catch {
            output.failed = true;
            const old = (cached?.authors || initial.authors || []).find(
              (a) => a.name === source.name,
            );
            authors.push({
              ...source,
              items: section === "news" ? [] : old?.items || [],
              checked: old?.checked || checked,
              status: "unavailable",
            });
          }
          return authors.reduce((sum, author) => sum + author.items.length, 0);
        })),
    );
    const sports = [
      ...new Set(
        teams
          .filter((t) => !team || t.id === team)
          .map((t) => t.league)
          .filter(Boolean),
      ),
    ];
    await Promise.all(
      sports.map((league) =>
        task(
          "ESPN news · " + league.split("/")[1],
          teams.filter((t) => t.league === league).map((t) => t.id),
          async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
  }
  if (section !== "news") {
    await task("ESPN injury report · Timberwolves", ["wolves"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
      const json = (await (
        await get("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries")
      ).json()) as any;
      const pattern = new RegExp(
        teams.find((t) => t.id === "wolves")?.pattern || "timberwolves",
        "i",
      );
      const injuries = (json.injuries || [])
        .flatMap((group: any) => group.injuries
          ? group.injuries.map((injury: any) => ({ ...injury, team: group.team || { displayName: group.displayName } }))
          : [group])
        .filter((item: any) => pattern.test(
          item.team?.displayName || item.team?.name || item.athlete?.displayName || "",
        ))
        .map((item: any) => ({
          player: item.athlete?.displayName || item.athlete?.fullName || "Unknown player",
          status: item.status || item.type || "Unavailable",
          detail: item.details?.detail || item.details?.type || item.longComment || undefined,
        }))
        .filter((item: any) => item.player);
      output.injuries = injuries;
      return injuries.length;
    });
    await Promise.all(
      teams
        .filter((t) => t.league)
        .map((t) =>
          task("ESPN scores · " + t.short, [t.id], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
    await task("Official Žalgiris schedule", ["zalgiris"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
      const r = await get("https://zalgiris.lt/rungtynes/");
      const parsed = parseZalgiris(await r.text(), checked);
      games.push(...parsed);
      return parsed.length;
    });
    await task("Official PWHL schedule · Frost", ["frost"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
      const primaryUrl =
        "https://www.thepwhl.com/en/stats/schedule/2/11/all-months/homeaway?league=1";
      let parsed = parsePwhlSchedule(
        await (await get(primaryUrl)).text(),
        checked,
        primaryUrl,
      );
      if (!parsed.length) {
        const fallbackUrl =
          "https://www.thepwhl.com/en/teams/minnesota-frost/schedule";
        parsed = parsePwhlSchedule(
          await (await get(fallbackUrl)).text(),
          checked,
          fallbackUrl,
        );
      }
      if (!parsed.length) throw Error("No PWHL schedule events parsed");
      games.push(...parsed);
      return parsed.length;
    });
    await Promise.all([
      ...Object.entries(palaceCompetitions).map(([league, name]) =>
        task("ESPN Palace schedule · " + name, ["palace"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
      task("Official Palace schedule", ["palace"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
        const parsed = parsePalace(
          await (await get("https://www.cpfc.co.uk/matches/")).text(),
          checked,
        );
        if (!parsed.length) throw Error("No fixtures");
        mergeOfficial(games, parsed);
        return parsed.length;
      }),
      task("Official MNUFC calendar", ["loons"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
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
    await task("DGPT official schedule", ["disc"], async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
      const parsed = parseDgptSchedule(
        await (await get("https://www.dgpt.com/schedule/")).text(),
      );
      if (!parsed.length) throw Error("No DGPT events parsed");
      games.push(...parsed);
      return parsed.length;
    });
  }
  if (section !== "news") {
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
            async (output, signal) => {
      const { stories, games, health } = output;
      const get = (url: string) => providerGet(url, signal);
              const json = await fetchScoreboard(league, date);
              mergeLiveScoreboard(games, json, league);
              return (json as any).events?.length || 0;
            },
          ),
        ),
      ),
    );
  }
  const outcomes = await runProviderTasks(tasks);
  for (const [index, outcome] of outcomes.entries()) {
    const output = outcome.value;
    health.push({ name: outcome.name, teams: taskTeams[index], checked,
      status: output && !output.failed ? "ok" : "unavailable", count: output?.count || 0,
      ...(output && !output.failed ? {} : { error: safeFeedError(outcome.error) }),
    });
    if (!output) continue;
    stories.push(...output.stories);
    authors.push(...output.authors);
    health.push(...output.health);
    if (output.injuries) wolvesInjuries = output.injuries;
    if (/^Official (Palace schedule|MNUFC calendar)/.test(outcome.name))
      mergeOfficial(games, output.games);
    else for (const fresh of output.games) {
      const index = games.findIndex((old) => old.id === fresh.id ||
        (old.team === fresh.team && Math.abs(Date.parse(old.date) - Date.parse(fresh.date)) < 3 * 3600000));
      if (index < 0) games.push(fresh);
      else games[index] = { ...games[index], ...fresh,
        competitionNote: fresh.competitionNote || games[index].competitionNote };
    }
  }
  if (section !== "news") {
    const fallback = [
      ...(cached?.games || []).filter((g) => g.team === "disc"),
      ...discEvents,
    ];
    for (const g of fallback)
      if (!games.some((next) => next.id === g.id))
        games.push(eventLifecycle(g));
  }
  const baseline = cached || (initial as HubData);
  for (const h of health.filter((h) => h.status === "unavailable")) {
    if (section !== "news")
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
          (h.name === "Official PWHL schedule · Frost" && g.team === "frost") ||
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
  if (wolvesInjuries)
    for (const game of games.filter((game) => game.team === "wolves"))
      game.injuries = wolvesInjuries;
  if (section === "all" && Date.now() - started < 20000) {
    const enriched = structuredClone(games);
    const [odds] = await runProviderTasks([{ name: "Odds", run: async () => {
      await enrichOdds(enriched, checked);
      return enriched;
    } }], { timeoutMs: Math.max(1, 20000 - (Date.now() - started)) });
    if (odds.value) games.splice(0, games.length, ...odds.value);
  }
  return {
    checked,
    authors,
    stories: [...unique.values()]
      .filter(
        (s) =>
          (!team || s.teams.includes(team)) &&
          !(
            s.source === "ESPN" &&
            /\b(?:game|match|full[- ]game|extended) highlights?\b/i.test(
              s.title,
            )
          ) &&
          Date.parse(s.date) > Date.now() - 14 * 86400000,
      )
      .slice(0, 140),
    games,
    health,
  };
}
export function hubData(
  section: "news" | "schedules" | "all" = "all",
  team?: string,
) {
  const key = team ? `${section}:${team}` : section;
  const cached = sectionCache[key];
  if (cached && Date.now() - Date.parse(cached.checked) < 300000)
    return Promise.resolve(cached);
  if (sectionInflight[key]) return sectionInflight[key]!;
  const request = collect(section, team)
    .then((data) => {
      sectionCache[key] = data;
      return data;
    })
    .finally(() => {
      delete sectionInflight[key];
    });
  sectionInflight[key] = request;
  return request;
}
let oddsInflight: Promise<{ games: Game[]; checked: string }> | null = null;
let oddsCached: { games: Game[]; checked: string } | null = null;
export function oddsData() {
  if (oddsCached && Date.now() - Date.parse(oddsCached.checked) < 300000)
    return Promise.resolve(oddsCached);
  if (oddsInflight) return oddsInflight;
  oddsInflight = hubData("schedules")
    .then(async (data) => {
      // Odds enrichment mutates games, so never share the schedule cache objects.
      const games = structuredClone(data.games);
      const checked = new Date().toISOString();
      await enrichOdds(games, checked);
      return (oddsCached = { games, checked });
    })
    .finally(() => {
      oddsInflight = null;
    });
  return oddsInflight;
}

