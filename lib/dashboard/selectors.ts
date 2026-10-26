// Derives visible stories and games from feed data plus the dashboard's local filters.
import type { Game, HubData } from "../feeds/feed-types";
import { discEvents } from "../games/event-seed";
import { eventLifecycle, eventIsToday } from "../games/event-time";
import { isTeamId, teams, teamPriority } from "../teams/teams";
import { authorStories } from "../feeds/author-stories";
import { recentStories } from "../browser/news-window";
import type { DashboardPageId } from "./page-id";
import { DASHBOARD_PAGE_IDS } from "./page-id";
export function selectStories({
  newsData,
  active,
  search,
  readIds,
  showRead,
  showOlder,
  timeZone = "America/Chicago",
}: {
  newsData: HubData;
  active: DashboardPageId;
  search: string;
  readIds: string[];
  showRead: boolean;
  showOlder: boolean;
  timeZone?: string;
}) {
  const filtered = [
    ...new Map(
      [
        ...(newsData.stories || []).filter(
          (s) =>
            s.source !== "BasketNews" &&
            !(
              s.source === "ESPN" &&
              /\b(?:game|match|full[- ]game|extended) highlights?\b/i.test(
                s.title,
              )
            ),
        ),
        ...authorStories(newsData.authors || []),
      ].map((s) => [s.url, s]),
    ).values(),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter(
      (s) =>
        s.kind !== "social" &&
        (active === DASHBOARD_PAGE_IDS.ALL ||
          (isTeamId(active) && s.teams.includes(active))) &&
        s.title.toLowerCase().includes(search.toLowerCase()) &&
        (showRead || !readIds.includes(s.id)),
    );
  const compactNews = true;
  const recentStoriesForView = recentStories(filtered, active, { timeZone });
  // Keep team pages focused on the five latest stories from today while
  // preserving the rest behind View older. The all-teams page is
  // capped at 8 so its combined coverage is more visible.
  const recent =
    active === DASHBOARD_PAGE_IDS.ALL
      ? recentStoriesForView.slice(0, 8)
      : recentStoriesForView.slice(0, 5);
  const displayed = compactNews && !showOlder ? recent : filtered;
  const olderCount = filtered.length - recent.length;
  const newest = (newsData.stories || [])
    .filter(
      (s) =>
        s.kind !== "social" &&
        (active === DASHBOARD_PAGE_IDS.ALL ||
          (isTeamId(active) && s.teams.includes(active))),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  return { compactNews, displayed, olderCount, newest };
}
export function selectGames({
  data,
  oddsGames,
  liveGames,
  active,
  showOlderResults,
  timeZone = "America/Chicago",
}: {
  data: HubData | null;
  oddsGames: Game[];
  liveGames: Game[];
  active: DashboardPageId;
  showOlderResults: boolean;
  timeZone?: string;
}) {
  const now = new Date();
  const isToday = (game: Game) => eventIsToday(game, now, timeZone);
  const combinedGames = [
    ...(data?.games || []),
    ...discEvents.filter(
      (g) =>
        !(data?.games || []).some(
          (x) => x.id === g.id || (x.team === "disc" && x.url === g.url),
        ),
    ),
  ]
    .filter((g) => teams.some((t) => t.id === g.team))
    .map((original) => {
      const odds = oddsGames.find((x) => x.id === original.id)?.odds;
      const event = eventLifecycle(original, now, timeZone);
      const g = odds ? { ...event, odds } : event;
      const fresh = liveGames.find(
        (x) =>
          x.id === g.id ||
          (x.team === g.team &&
            Math.abs(Date.parse(x.date) - Date.parse(g.date)) < 3 * 3600000),
      );
      return fresh
        ? {
            ...g,
            ...fresh,
            competitionNote: fresh.competitionNote || g.competitionNote,
          }
        : g;
    });
  for (const g of liveGames)
    if (!combinedGames.some((x) => x.id === g.id)) combinedGames.push(g);
  const teamsPlayingToday = new Set(
    combinedGames.filter(isToday).map((g) => g.team),
  );
  const visibleGames = combinedGames.filter(
    (g) => active === DASHBOARD_PAGE_IDS.ALL || g.team === active,
  );
  const availableResults = visibleGames
    .filter((g) => g.state === "post" && !isToday(g))
    .sort(
      (a, b) =>
        Date.parse(b.endDate || b.date) - Date.parse(a.endDate || a.date),
    );
  const results =
    active === DASHBOARD_PAGE_IDS.ALL
      ? availableResults.slice(0, 8)
      : showOlderResults
        ? availableResults
        : availableResults.slice(0, 3);
  const upcoming = visibleGames
    .filter(
      (g) =>
        g.state !== "post" &&
        (isToday(g) || Date.parse(g.date) > now.getTime() - 12 * 3600000),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const todayGames = visibleGames
    .filter(isToday)
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) ||
        teamPriority(a.team) - teamPriority(b.team),
    );
  const futureCandidates = upcoming.filter((g) => !isToday(g));
  const nextByTeam = new Map<string, Game>();
  for (const g of futureCandidates)
    if (!nextByTeam.has(g.team)) nextByTeam.set(g.team, g);
  const futureGames =
    active === DASHBOARD_PAGE_IDS.ALL
      ? [...nextByTeam.values()].sort(
          (a, b) =>
            Date.parse(a.date) - Date.parse(b.date) ||
            teamPriority(a.team) - teamPriority(b.team),
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
