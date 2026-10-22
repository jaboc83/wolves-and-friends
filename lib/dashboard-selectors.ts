import type { Game, HubData } from "./feeds";
import { discEvents } from "./games/event-seed";
import { eventLifecycle, eventIsToday } from "./games/event-time";
import { teams, teamPriority } from "./teams/teams";
import { validAuthorStory } from "./feeds/byline-status";
import { authorStories } from "./feeds/author-stories";
import { recentStories } from "./news-window";
export function selectStories({
  newsData,
  active,
  search,
  readIds,
  showRead,
  showOlder,
}: {
  newsData: HubData;
  active: string;
  search: string;
  readIds: string[];
  showRead: boolean;
  showOlder: boolean;
}) {
  const filtered = [
    ...new Map(
      [
        ...(newsData.stories || []).filter(
          (s) =>
            validAuthorStory(s) &&
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
        (active === "all" || s.teams.includes(active)) &&
        s.title.toLowerCase().includes(search.toLowerCase()) &&
        (showRead || !readIds.includes(s.id)),
    );
  const compactNews = true;
  const recentStoriesForView = recentStories(filtered, active);
  // Keep the all-teams page focused on a quick daily scan while preserving
  // older same-day stories behind View older.
  const recent =
    active === "all" ? recentStoriesForView.slice(0, 8) : recentStoriesForView;
  const displayed = compactNews && !showOlder ? recent : filtered;
  const olderCount = filtered.length - recent.length;
  const newest = (newsData.stories || [])
    .filter(
      (s) =>
        s.kind !== "social" && (active === "all" || s.teams.includes(active)),
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
}: {
  data: HubData | null;
  oddsGames: Game[];
  liveGames: Game[];
  active: string;
  showOlderResults: boolean;
}) {
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
      const event = eventLifecycle(original);
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
    combinedGames.filter((g) => eventIsToday(g)).map((g) => g.team),
  );
  const visibleGames = combinedGames.filter(
    (g) => active === "all" || g.team === active,
  );
  const availableResults = visibleGames
    .filter((g) => g.state === "post" && !eventIsToday(g))
    .sort(
      (a, b) =>
        Date.parse(b.endDate || b.date) - Date.parse(a.endDate || a.date),
    );
  const results =
    active === "all"
      ? availableResults.slice(0, 8)
      : showOlderResults
        ? availableResults
        : availableResults.slice(0, 3);
  const upcoming = visibleGames
    .filter(
      (g) =>
        g.state !== "post" &&
        (eventIsToday(g) || Date.parse(g.date) > Date.now() - 12 * 3600000),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const todayGames = visibleGames
    .filter((g) => eventIsToday(g))
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) ||
        teamPriority(a.team) - teamPriority(b.team),
    );
  const futureCandidates = upcoming.filter((g) => !eventIsToday(g));
  const nextByTeam = new Map<string, Game>();
  for (const g of futureCandidates)
    if (!nextByTeam.has(g.team)) nextByTeam.set(g.team, g);
  const futureGames =
    active === "all"
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
