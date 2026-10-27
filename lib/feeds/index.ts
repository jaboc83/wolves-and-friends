// Coordinates public news/schedule providers, fallback data, caching, and feed aggregation.
import { newsSources, authorSources } from "./news-sources";
import {
  safe,
  match,
  FeedError,
  parseFeed,
  parseGames,
  mergeLiveScoreboard,
} from "./feed-parsers";
export {
  parseNbaTeamNews,
  parseFeed,
  parsePalaceRadar,
  parseGames,
  mergeLiveScoreboard,
} from "./feed-parsers";
import { runProviderTasks, type ProviderTask } from "./provider-tasks";
import { fetchScoreboard } from "./scoreboard";
import { eventIsToday, eventLifecycle } from "../games/event-time";
import { verifyAuthorFeed } from "./bylines";
import { authorStories } from "./author-stories";
import { mergeOfficial, mergeFallbackGames } from "./official-schedules";
import { teams } from "../teams/teams";
import { teamProviders } from "../teams/providers";
import { serverHooksFor, teamServerHooks } from "../teams/server";
import type { TeamFeedTask } from "../teams/server-types";
import type { TeamId } from "../teams/teams";
import { scoreboardLeagues, teamPlaysCompetition } from "../teams/competitions";
import { enrichOdds } from "./odds";
import type { Story, Game, Health, AuthorFeed, HubData } from "./feed-types";
export type { Story, Game, Health, AuthorFeed, HubData } from "./feed-types";
const emptyHub: HubData = {
  checked: "",
  stories: [],
  games: [],
  health: [],
  authors: [],
};
type ESPNCompetitor = {
  team?: { id?: string; abbreviation?: string };
};
type ESPNEvent = {
  id: string;
  competitions?: { competitors?: ESPNCompetitor[] }[];
};
type ESPNInjury = {
  athlete?: {
    displayName?: string;
    fullName?: string;
    team?: { displayName?: string; name?: string };
  };
  status?: string;
  type?: string;
  details?: { detail?: string; type?: string };
  longComment?: string;
  team?: { displayName?: string; name?: string };
};
type ESPNInjuryGroup = ESPNInjury & {
  injuries?: ESPNInjury[];
  displayName?: string;
};
type ESPNResponse = {
  articles?: {
    headline: string;
    description?: string;
    links?: { web?: { href?: string } };
    published?: string;
    type?: string;
  }[];
  events?: ESPNEvent[];
  injuries?: ESPNInjuryGroup[];
  season?: { year?: number | string };
};
const sectionCache: Partial<Record<string, HubData>> = {};
const sectionInflight: Partial<Record<string, Promise<HubData>>> = {};
const injurySources = teamProviders.flatMap((p) => {
  const league = teams.find((t) => t.id === p.team)?.league;
  return p.espnTeamId && league
    ? [{ team: p.team, sport: league, espnId: p.espnTeamId }]
    : [];
});
function safeFeedError(error: unknown) {
  if (error instanceof FeedError) return error.code;
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "timeout";
  return "request-failed";
}

async function providerGet(url: string, signal?: AbortSignal) {
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(url, {
        signal: signal
          ? AbortSignal.any([
              signal,
              AbortSignal.timeout(
                url.includes("eurohoops.net") ? 30000 : 12000,
              ),
            ])
          : AbortSignal.timeout(12000),
        headers: {
          // A stable server identifier helps publishers allow-list the feed request
          // without forwarding any visitor/browser identifiers.
          "User-Agent":
            // These publishers reject the URL-bearing identifier with HTTP 403.
            [
              "www.yardbarker.com",
              "site.api.espn.com",
              "site.web.api.espn.com",
            ].includes(new URL(url).hostname)
              ? "WolvesAndFriendsFeed/1.0"
              : "WolvesAndFriendsFeed/1.0 (+https://wolvesandfriends.moening.org)",
          Accept:
            "application/json, application/rss+xml, application/atom+xml, text/xml, text/html",
        },
      });
      if (r.ok) return r;
      const retryable = [403, 408, 425, 429, 500, 502, 503, 504].includes(
        r.status,
      );
      if (!retryable || attempt === 2) throw new FeedError("http-" + r.status);
      await new Promise((resolve) =>
        setTimeout(resolve, attempt === 0 ? 250 : 750),
      );
      if (signal?.aborted) throw signal.reason;
    }
    throw new FeedError("request-failed");
  } catch (error) {
    throw error instanceof FeedError
      ? error
      : new FeedError(safeFeedError(error));
  }
}
async function fetchESPNInjuries(
  sport: string,
  espnId: string,
  teamName: string,
  signal: AbortSignal,
): Promise<NonNullable<Game["injuries"]>> {
  const injuryUrls = [
    "https://site.api.espn.com/apis/site/v2/sports/" +
      sport +
      "/injuries?region=us&lang=en&team=" +
      espnId,
    "https://site.web.api.espn.com/apis/site/v2/sports/" +
      sport +
      "/injuries?region=us&lang=en&team=" +
      espnId,
  ];
  let response: Response | null = null;
  let lastError: unknown;
  for (const url of injuryUrls) {
    try {
      response = await providerGet(url, signal);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!response) throw lastError || new FeedError("request-failed");
  const json = (await response.json()) as ESPNResponse;
  if (!json.injuries?.length) throw new FeedError("empty-injuries");
  return (json.injuries || [])
    .flatMap((group) =>
      group.injuries
        ? group.injuries.map((injury) => ({
            ...injury,
            team: group.team || { displayName: group.displayName },
          }))
        : [group],
    )
    .map((item) => ({
      player:
        item.athlete?.displayName || item.athlete?.fullName || "Unknown player",
      status: item.status || item.type || "Unavailable",
      detail:
        item.details?.detail ||
        item.details?.type ||
        item.longComment ||
        undefined,
      team:
        item.team?.displayName ||
        item.team?.name ||
        item.athlete?.team?.displayName ||
        item.athlete?.team?.name ||
        teamName,
    }))
    .filter((item) => item.player);
}
export async function collect(
  section: "news" | "schedules" | "all" = "all",
  team?: TeamId,
): Promise<HubData> {
  const started = Date.now();
  const cached = sectionCache[team ? `${section}:${team}` : section] || null;
  const checked = new Date().toISOString();
  const stories: Story[] = [];
  const games: Game[] = [];
  const injuriesByTeam: Partial<Record<TeamId, Game["injuries"]>> = {};
  const health: Health[] = [];
  const authors: AuthorFeed[] = [];
  type Output = {
    stories: Story[];
    games: Game[];
    health: Health[];
    authors: AuthorFeed[];
    injuries?: Game["injuries"];
    injuryTeam?: TeamId;
    count: number;
    failed?: boolean;
    error?: string;
  };
  const tasks: ProviderTask<Output>[] = [];
  const taskTeams: TeamId[][] = [];
  const opponentInjuriesByTeam: Record<
    string,
    NonNullable<Game["injuries"]>
  > = {};
  async function task(
    name: string,
    ids: TeamId[],
    f: (output: Output, signal: AbortSignal) => Promise<number>,
  ) {
    if (team && !ids.includes(team)) return;
    taskTeams.push(ids);
    tasks.push({
      name,
      run: async (signal) => {
        const output: Output = {
          stories: [],
          games: [],
          health: [],
          authors: [],
          count: 0,
        };
        output.count = await f(output, signal);
        return output;
      },
    });
  }
  const teamTasks = (section: TeamFeedTask["section"]) =>
    Promise.all(
      teamServerHooks.flatMap((hooks) =>
        (hooks.feedTasks || [])
          .filter((t) => t.section === section)
          .map((t) =>
            task(t.name, [hooks.team], async (output, signal) => {
              const result = await t.run({
                checked,
                get: (url) => providerGet(url, signal),
                baseline: cached || emptyHub,
              });
              output.stories.push(...(result.stories || []));
              output.games.push(...(result.games || []));
              return result.count;
            }),
          ),
      ),
    );
  if (section !== "schedules") {
    await Promise.all(
      newsSources.map(({ name, url, teams: ids, tagByContent }) =>
        task(name, ids, async (output, signal) => {
          const { stories } = output;
          const get = (url: string) => providerGet(url, signal);
          const parsed = parseFeed(
            await (await get(url)).text(),
            name,
            tagByContent ? undefined : ids,
          );
          stories.push(
            ...(name.startsWith("EuroLeague")
              ? parsed.filter((s) => /zalgiris|žalgiris/i.test(s.title))
              : parsed),
          );
          return parsed.length;
        }),
      ),
    );
    await teamTasks("news");
    await Promise.all(
      authorSources
        .filter((source) => !team || source.team === team)
        .map(({ titleFilters, ...source }) =>
          task(
            "Author news · " + source.name,
            [source.team],
            async (output, signal) => {
              const { authors } = output;
              const get = (url: string) => providerGet(url, signal);
              try {
                const xml = await (await get(source.feed)).text();
                const parsed = parseFeed(xml, source.name, [
                  source.team,
                ]).filter((s) =>
                  titleFilters.every((filter) => filter.test(s.title)),
                );
                const author: AuthorFeed = {
                  ...source,
                  items: parsed.slice(0, 4).map(({ title, url, date }) => ({
                    title,
                    url,
                    date,
                    ...(source.publisherAuthorFeed
                      ? { bylineVerified: true }
                      : {}),
                  })),
                  checked,
                  status: "ok",
                };
                await verifyAuthorFeed(author, signal);
                authors.push(author);
              } catch (error) {
                output.failed = true;
                output.error = safeFeedError(error);
                const old = (cached?.authors || []).find(
                  (a) => a.name === source.name,
                );
                authors.push({
                  ...source,
                  items: section === "news" ? [] : old?.items || [],
                  checked: old?.checked || checked,
                  status: "unavailable",
                });
              }
              return authors.reduce(
                (sum, author) => sum + author.items.length,
                0,
              );
            },
          ),
        ),
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
            const { stories } = output;
            const get = (url: string) => providerGet(url, signal);
            const json = (await (
              await get(
                "https://site.api.espn.com/apis/site/v2/sports/" +
                  league +
                  "/news?limit=50",
              )
            ).json()) as ESPNResponse;
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
    await Promise.all(
      injurySources.map(async (source) => {
        const teamName =
          teams.find((candidate) => candidate.id === source.team)?.name ||
          source.team;
        await task(
          "ESPN injury report · " + teamName,
          [source.team],
          async (output, signal) => {
            const injuryUrls = [
              "https://site.api.espn.com/apis/site/v2/sports/" +
                source.sport +
                "/injuries?region=us&lang=en&team=" +
                source.espnId,
              "https://site.web.api.espn.com/apis/site/v2/sports/" +
                source.sport +
                "/injuries?region=us&lang=en&team=" +
                source.espnId,
            ];
            let response: Response | null = null;
            let lastError: unknown;
            for (const url of injuryUrls) {
              try {
                response = await providerGet(url, signal);
                break;
              } catch (error) {
                lastError = error;
              }
            }
            if (!response) throw lastError || new FeedError("request-failed");
            const json = (await response.json()) as ESPNResponse;
            if (!json.injuries?.length) throw new FeedError("empty-injuries");
            const injuries = (json.injuries || [])
              .flatMap((group) =>
                group.injuries
                  ? group.injuries.map((injury) => ({
                      ...injury,
                      team: group.team || { displayName: group.displayName },
                    }))
                  : [group],
              )
              .map((item) => ({
                player:
                  item.athlete?.displayName ||
                  item.athlete?.fullName ||
                  "Unknown player",
                status: item.status || item.type || "Unavailable",
                detail:
                  item.details?.detail ||
                  item.details?.type ||
                  item.longComment ||
                  undefined,
                team:
                  item.team?.displayName ||
                  item.team?.name ||
                  item.athlete?.team?.displayName ||
                  item.athlete?.team?.name ||
                  teamName,
              }))
              .filter((item) => item.player);
            output.injuries = injuries;
            return injuries.length;
          },
        );
      }),
    );
    await Promise.all(
      teams
        .filter((t) => t.league)
        .map((t) =>
          task("ESPN scores · " + t.short, [t.id], async (output, signal) => {
            const { games, health } = output;
            const get = (url: string) => providerGet(url, signal);
            const hooks = serverHooksFor(t.id);
            const scheduleUrl =
              "https://site.api.espn.com/apis/site/v2/sports/" +
              t.league +
              "/teams/" +
              t.espn +
              "/schedule";
            const json = await (
              await get(
                scheduleUrl +
                  (hooks?.espnScheduleQuery?.(new Date().getFullYear()) || ""),
              )
            ).json();
            const parsed = parseGames(json, t.id, t.sport);
            await hooks?.extendEspnSchedule?.({
              checked,
              get,
              baseline: cached || emptyHub,
              team: t,
              json,
              games: parsed,
              health,
              schedule: async (query) =>
                parseGames(
                  await (await get(scheduleUrl + query)).json(),
                  t.id,
                  t.sport,
                ),
            });
            const unique = [...new Map(parsed.map((g) => [g.id, g])).values()];
            games.push(...unique);
            return unique.length;
          }),
        ),
    );
    await teamTasks("schedules");
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
            async (output) => {
              const { games } = output;
              const json = await fetchScoreboard(league, date);
              mergeLiveScoreboard(games, json, league);
              return json.events?.length || 0;
            },
          ),
        ),
      ),
    );
  }
  // A team news refresh is a small, bounded set. Start its providers together
  // so slow upstreams cannot consume the deadline before later feeds start.
  const outcomes = await runProviderTasks(
    tasks,
    section === "news" ? { concurrency: tasks.length } : {},
  );
  const hookTasks = teamServerHooks.flatMap((hooks) => hooks.feedTasks || []);
  const officialTasks = new Set(
    hookTasks.filter((t) => t.official).map((t) => t.name),
  );
  const labelledSources = new Set(
    hookTasks.filter((t) => t.preserveLabels).map((t) => t.name),
  );
  for (const [index, outcome] of outcomes.entries()) {
    const output = outcome.value;
    health.push({
      name: outcome.name,
      teams: taskTeams[index],
      checked,
      status: output && !output.failed ? "ok" : "unavailable",
      count: output?.count || 0,
      ...(output && !output.failed
        ? {}
        : { error: output?.error || safeFeedError(outcome.error) }),
    });
    if (!output) continue;
    stories.push(...output.stories);
    authors.push(...output.authors);
    health.push(...output.health);
    if (output.injuries) {
      const injuryTeam = taskTeams[index]?.[0];
      if (injuryTeam) injuriesByTeam[injuryTeam] = output.injuries;
    }
    if (officialTasks.has(outcome.name)) mergeOfficial(games, output.games);
    else
      for (const fresh of output.games) {
        const index = games.findIndex(
          (old) =>
            old.id === fresh.id ||
            (old.team === fresh.team &&
              Math.abs(Date.parse(old.date) - Date.parse(fresh.date)) <
                3 * 3600000),
        );
        if (index < 0) games.push(fresh);
        else {
          const existing = games[index];
          const preserveLabels = labelledSources.has(existing.sourceName || "");
          games[index] = {
            ...existing,
            ...fresh,
            competitionNote: fresh.competitionNote || existing.competitionNote,
            ...(preserveLabels
              ? {
                  league: existing.league,
                  sourceName: existing.sourceName,
                  sourceChecked: existing.sourceChecked,
                }
              : {}),
          };
        }
      }
  }
  if (section !== "news") {
    const seeded = teamServerHooks.flatMap(
      (hooks) => hooks.seedGames?.(cached?.games || []) || [],
    );
    for (const g of seeded)
      if (!games.some((next) => next.id === g.id))
        games.push(eventLifecycle(g));
  }
  if (section !== "news") {
    const opponentTeams = new Map<
      string,
      { league: string; espnId: string; name: string }
    >();
    for (const game of games) {
      if (!eventIsToday(game)) continue;
      const source = injurySources.find(
        (candidate) => candidate.team === game.team,
      );
      const league = teams.find(
        (candidate) => candidate.id === game.team,
      )?.league;
      if (!source || !league) continue;
      for (const competitor of game.competitors) {
        if (!competitor.teamId || competitor.teamId === source.espnId) continue;
        const key = `${league}:${competitor.teamId}`;
        if (!opponentTeams.has(key))
          opponentTeams.set(key, {
            league,
            espnId: competitor.teamId,
            name: competitor.name,
          });
      }
    }
    const opponentReports = await runProviderTasks(
      [...opponentTeams].map(([key, source]) => ({
        name: "ESPN opponent injury report · " + source.name,
        run: async (signal) => ({
          key,
          injuries: await fetchESPNInjuries(
            source.league,
            source.espnId,
            source.name,
            signal,
          ),
        }),
      })),
      { concurrency: 5, timeoutMs: 12000 },
    );
    for (const report of opponentReports)
      if (report.value)
        opponentInjuriesByTeam[report.value.key] = report.value.injuries;
  }
  const baseline = cached || emptyHub;
  for (const h of health.filter((h) => h.status === "unavailable")) {
    const teamFallback = teamServerHooks.find(
      (hooks) => hooks.fallbacks?.[h.name],
    )?.fallbacks?.[h.name];
    if (section !== "news")
      stories.push(
        ...baseline.stories.filter(
          (s) =>
            s.source === h.name ||
            Boolean(teamFallback?.stories?.(s)) ||
            (h.name.startsWith("ESPN news") &&
              s.source === "ESPN" &&
              s.teams.some((id) => h.teams.includes(id))),
        ),
      );
    mergeFallbackGames(
      games,
      baseline.games.filter(
        (g) =>
          Boolean(teamFallback?.games?.(g)) ||
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
  for (const game of games) {
    const teamInjuries = injuriesByTeam[game.team] || [];
    const league = teams.find((team) => team.id === game.team)?.league;
    const opponentInjuries = league
      ? game.competitors.flatMap(
          (competitor) =>
            (competitor.teamId &&
              opponentInjuriesByTeam[`${league}:${competitor.teamId}`]) ||
            [],
        )
      : [];
    const teamNames = game.competitors.map((competitor) =>
      competitor.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim(),
    );
    game.injuries = [...teamInjuries, ...opponentInjuries].filter((injury) => {
      const injuryTeam = (injury.team || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return (
        injuryTeam &&
        teamNames.some(
          (name) =>
            name === injuryTeam ||
            name.includes(injuryTeam) ||
            injuryTeam.includes(name),
        )
      );
    });
  }
  if (section === "all" && Date.now() - started < 20000) {
    const enriched = structuredClone(games);
    const [odds] = await runProviderTasks(
      [
        {
          name: "Odds",
          run: async () => {
            await enrichOdds(enriched, checked);
            return enriched;
          },
        },
      ],
      { timeoutMs: Math.max(1, 20000 - (Date.now() - started)) },
    );
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
  team?: TeamId,
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
