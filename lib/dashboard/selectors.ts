// Derives visible stories and games from feed data plus the dashboard's local filters.
import type { Game, HubData } from "../feeds/feed-types";
import { mergeScoreUpdate } from "../games/merge-score.ts";
import { discEvents } from "../games/event-seed.ts";
import { eventLifecycle, eventIsToday } from "../games/event-time.ts";
import { isTeamId, teams, teamPriority } from "../teams/teams.ts";
import { recentStories } from "../browser/news-window.ts";
import type { DashboardPageId } from "./page-id";
import { DASHBOARD_PAGE_IDS } from "./page-id.ts";
import { dedupeByTitle } from "./dedupe-stories.ts";
import { isPublication } from "../feeds/byline-source.ts";
import { withVisibleTeams } from "./hidden-teams.ts";
export const OLDER_BATCH_SIZE = 10;

// Sorts ascending by a precomputed key so dates are parsed once per item, not per comparison.
function sortByTime<T>(
  items: T[],
  timeOf: (item: T) => number,
  tieBreak?: (a: T, b: T) => number,
): T[] {
  return items
    .map((item) => ({ item, time: timeOf(item) }))
    .sort((a, b) => a.time - b.time || (tieBreak?.(a.item, b.item) ?? 0))
    .map(({ item }) => item);
}

export function selectStories({
  newsData,
  active,
  search,
  readIds,
  showRead,
  showOlder,
  olderLimit = Infinity,
  timeZone = "America/Chicago",
  hiddenTeams = [],
}: {
  newsData: HubData;
  active: DashboardPageId;
  search: string;
  readIds: string[];
  showRead: boolean;
  showOlder: boolean;
  olderLimit?: number;
  timeZone?: string;
  hiddenTeams?: readonly string[];
}) {
  const query = search.trim().toLowerCase();
  const compactNews = !query;
  const stories = withVisibleTeams(newsData.stories || [], hiddenTeams);
  const filtered = dedupeByTitle(sortByTime([
    ...new Map(
      [
        ...stories.filter(
          (s) =>
            s.source !== "BasketNews" &&
            !(
              isPublication(s.source, "ESPN") &&
              /\b(?:game|match|full[- ]game|extended) highlights?\b/i.test(
                s.title,
              )
            ),
        ),
      ].map((s) => [s.url, s]),
    ).values(),
  ], (s) => -Date.parse(s.date)))
    .filter(
      (s) =>
        s.kind !== "social" &&
        (active === DASHBOARD_PAGE_IDS.ALL ||
          (isTeamId(active) && s.teams.includes(active))) &&
        (s.title.toLowerCase().includes(query) ||
          s.source.toLowerCase().includes(query)) &&
        (!compactNews || showRead || !readIds.includes(s.id)),
    );
  // Searching includes read stories and every match normally hidden behind View more.
  const recentStoriesForView = recentStories(filtered, active, { timeZone });
  // Team pages show the five latest stories from the last 24 hours. The all-teams page
  // shows at most two per team so one team can't dominate; the rest stay
  // behind View more.
  const perTeam = new Map<string, number>();
  const recent =
    active === DASHBOARD_PAGE_IDS.ALL
      ? recentStoriesForView.filter((s) => {
          if (!s.teams.length) return true;
          if (!s.teams.some((t) => (perTeam.get(t) ?? 0) < 2)) return false;
          for (const t of s.teams) perTeam.set(t, (perTeam.get(t) ?? 0) + 1);
          return true;
        })
      : recentStoriesForView.slice(0, 5);
  // Older stories are revealed in batches on every page.
  const recentSet = new Set(recent);
  const olderStories = filtered.filter((s) => !recentSet.has(s));
  const olderVisible = new Set(olderStories.slice(0, olderLimit));
  const displayed =
    !compactNews
      ? filtered
      : !showOlder
      ? recent
      : filtered.filter((s) => recentSet.has(s) || olderVisible.has(s));
  const olderCount = olderStories.length;
  const olderRemaining = showOlder
    ? olderStories.length - olderVisible.size
    : olderCount;
  const newest = stories
    .filter(
      (s) =>
        s.kind !== "social" &&
        (active === DASHBOARD_PAGE_IDS.ALL ||
          (isTeamId(active) && s.teams.includes(active))),
    )
    .reduce<(typeof newsData.stories)[number] | undefined>(
      (best, s) =>
        !best || Date.parse(s.date) > Date.parse(best.date) ? s : best,
      undefined,
    );
  return { compactNews, displayed, olderCount, olderRemaining, newest };
}
export function selectGames({
  data,
  oddsGames,
  liveGames,
  active,
  showOlderResults,
  timeZone = "America/Chicago",
  hiddenTeams = [],
}: {
  data: HubData | null;
  oddsGames: Game[];
  liveGames: Game[];
  active: DashboardPageId;
  showOlderResults: boolean;
  timeZone?: string;
  hiddenTeams?: readonly string[];
}) {
  const now = new Date();
  const isToday = (game: Game) => eventIsToday(game, now, timeZone);
  const visibleLiveGames = liveGames.filter((g) => !hiddenTeams.includes(g.team));
  const liveTimes = new Map(visibleLiveGames.map((x) => [x, Date.parse(x.date)]));
  const combinedGames = [
    ...(data?.games || []),
    ...discEvents.filter(
      (g) =>
        !(data?.games || []).some(
          (x) => x.id === g.id || (x.team === "disc" && x.url === g.url),
        ),
    ),
  ]
    .filter(
      (g) =>
        teams.some((t) => t.id === g.team) && !hiddenTeams.includes(g.team),
    )
    .map((original) => {
      const odds = oddsGames.find((x) => x.id === original.id)?.odds;
      const event = eventLifecycle(original, now, timeZone);
      const g = odds ? { ...event, odds } : event;
      const gTime = Date.parse(g.date);
      const fresh = visibleLiveGames.find(
        (x) =>
          x.id === g.id ||
          (x.team === g.team &&
            Math.abs(liveTimes.get(x)! - gTime) < 3 * 3600000),
      );
      return fresh
        ? mergeScoreUpdate(g, {
            ...g,
            ...fresh,
            competitionNote: fresh.competitionNote || g.competitionNote,
          })
        : g;
    });
  for (const g of visibleLiveGames)
    if (!combinedGames.some((x) => x.id === g.id)) combinedGames.push(g);
  const teamsPlayingToday = new Set(
    combinedGames.filter(isToday).map((g) => g.team),
  );
  const visibleGames = combinedGames.filter(
    (g) => active === DASHBOARD_PAGE_IDS.ALL || g.team === active,
  );
  const availableResults = sortByTime(
    visibleGames.filter((g) => g.state === "post" && !isToday(g)),
    (g) => -Date.parse(g.endDate || g.date),
  );
  const results =
    active === DASHBOARD_PAGE_IDS.ALL
      ? availableResults.slice(0, 8)
      : showOlderResults
        ? availableResults
        : availableResults.slice(0, 3);
  const upcoming = sortByTime(
    visibleGames.filter(
      (g) =>
        g.state !== "post" &&
        (isToday(g) || Date.parse(g.date) > now.getTime() - 12 * 3600000),
    ),
    (g) => Date.parse(g.date),
  );
  const todayGames = sortByTime(
    visibleGames.filter(isToday),
    (g) => Date.parse(g.date),
    (a, b) => teamPriority(a.team) - teamPriority(b.team),
  );
  const futureCandidates = upcoming.filter((g) => !isToday(g));
  const nextByTeam = new Map<string, Game>();
  for (const g of futureCandidates)
    if (!nextByTeam.has(g.team)) nextByTeam.set(g.team, g);
  const futureGames =
    active === DASHBOARD_PAGE_IDS.ALL
      ? sortByTime(
          [...nextByTeam.values()],
          (g) => Date.parse(g.date),
          (a, b) => teamPriority(a.team) - teamPriority(b.team),
        )
      : futureCandidates.slice(0, 3);
  return {
    teamsPlayingToday,
    visibleGames,
    availableResults,
    results,
    todayGames,
    futureGames,
  };
}
