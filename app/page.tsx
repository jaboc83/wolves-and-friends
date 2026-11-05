// Home page for the app. Displays the dashboard with news, scores, and team insights.
"use client";
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { Switch } from "../components/ui/switch";
import { useDashboardFeeds } from "../hooks/use-dashboard-feeds";
import { browserStorage, readStored, stringList } from "../lib/browser/storage";
import { storedDashboardPage } from "../lib/dashboard/storage";
import { newsDisplayMode } from "../lib/browser/news-page-data";
import { selectStories, selectGames } from "../lib/dashboard/selectors";
import GameCard from "../components/games/game-card";
import LeagueHeadlines from "../components/games/league-headlines";
import BackToTop from "../components/dashboard/back-to-top";
import NewsSection from "../components/dashboard/news-section";
import ScoreRail from "../components/dashboard/score-rail";
import TeamNavigation from "../components/dashboard/team-navigation";
import MatchCalendar from "../components/games/match-calendar";
import SectionLinks from "../components/dashboard/section-links";
import {
  loadScorePreference,
  saveScorePreference,
} from "../lib/browser/score-preference";
const MarchMadness = lazy(() => import("../components/games/march-madness"));
import { sportTerms } from "../lib/teams/sport-terms";
import TeamInsights from "../components/teams/team-insights";
import { teamThemes } from "../lib/teams/team-themes";
import { unreadSocial } from "../lib/social/social-queue";
import { teamProfile, teams } from "../lib/teams/teams";
import { isTeamId, TEAM_IDS } from "../lib/teams/teams";
import {
  DASHBOARD_PAGE_IDS,
  type DashboardPageId,
} from "../lib/dashboard/page-id";
import type { Game } from "../lib/feeds";
import { releaseCommitUrl, releaseMarker } from "../lib/release-info";
import { downloadFeedDiagnostics } from "../lib/feeds/feed-diagnostics";
import { useLocalTimeZone } from "../hooks/use-local-time-zone";
import { formatInTimeZone, timeZoneLabel } from "../lib/browser/local-time";
export default function Home() {
  const timeZone = useLocalTimeZone();
  const localDateTime = (s: string, opts: Intl.DateTimeFormatOptions = {}) =>
    formatInTimeZone(s, timeZone, opts);
  const zoneLabel = timeZoneLabel(timeZone);
  const [active, setActive] = useState<DashboardPageId>(TEAM_IDS.WOLVES),
    [search, setSearch] = useState(""),
    [sources, setSources] = useState(false),
    [teamMenuOpen, setTeamMenuOpen] = useState(false),
    [readIds, setReadIds] = useState<string[]>([]),
    [showRead, setShowRead] = useState(false),
    [showOlder, setShowOlder] = useState(false),
    [showOlderResults, setShowOlderResults] = useState(false),
    [revealed, setRevealed] = useState<string[]>([]),
    [hideScores, setHideResults] = useState(false),
    [resultsReady, setResultsReady] = useState(false),
    [autoOpenStandings, setAutoOpenStandings] = useState(false),
    [darkMode, setDarkMode] = useState(false);
  const {
    data,
    teamInfo,
    socialData,
    socialUnavailable,
    youtubeUnavailable,
    liveGames,
    scoreError,
    loading,
    newsFailed,
    newsData,
    scheduleError,
    oddsGames,
    playerStats,
    playerStatsStatus,
    marchData,
    marchUnavailable,
    socialRefreshing,
    socialRefreshError,
    refreshSocial,
    refreshRosterStats,
    selectPage,
  } = useDashboardFeeds(active);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setActive(storedDashboardPage());
      setReadIds(readStored("wf-read", stringList, []));
      setDarkMode(browserStorage.getItem("wf-color-mode") === "dark");
      const preference = loadScorePreference(browserStorage);
      setHideResults(preference.hidden);
      if (!preference.hidden)
        setAutoOpenStandings(window.matchMedia("(min-width: 1600px)").matches);
      setResultsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  // Changes pages, resets page-only controls, and saves the selection locally.
  function choose(id: DashboardPageId) {
    selectPage(id);
    setActive(id);
    setAutoOpenStandings(false);
    setTeamMenuOpen(false);
    setShowOlder(false);
    setShowOlderResults(false);
    browserStorage.setItem("wf-team", id);
  }
  // Toggles score visibility and persists the preference in this browser.
  function toggleResults() {
    const next = !hideScores;
    setHideResults(next);
    setRevealed([]);
    saveScorePreference(browserStorage, next);
    setAutoOpenStandings(
      !next && window.matchMedia("(min-width: 1600px)").matches,
    );
  }
  // Switches the color mode and stores the preference locally.
  function toggleColorMode() {
    const next = !darkMode;
    setDarkMode(next);
    try {
      browserStorage.setItem("wf-color-mode", next ? "dark" : "light");
    } catch {}
  }
  // Toggles one story's read state and saves the updated ID list locally.
  function markRead(id: string) {
    const next = readIds.includes(id)
      ? readIds.filter((x) => x !== id)
      : [...readIds, id];
    setReadIds(next);
    browserStorage.setItem("wf-read", JSON.stringify(next));
  }
  const palette = teamThemes[active];
  const themeStyle = palette
    ? ({
        "--team-primary": palette.primary,
        "--team-accent": palette.accent,
        "--team-soft": darkMode
          ? `color-mix(in srgb, ${palette.primary} 35%, #171c24)`
          : palette.soft,
      } as CSSProperties)
    : undefined;
  const team = teams.find((t) => t.id === active);
  const activeScoreboardUrl = teamProfile(active)?.scoreboardUrl;
  const terms = sportTerms(active);
  const { compactNews, displayed, olderCount, newest } = selectStories({
    newsData,
    active,
    search,
    readIds,
    showRead,
    showOlder,
    timeZone,
  });
  const {
    teamsPlayingToday,
    visibleGames,
    availableResults,
    results,
    todayGames,
    futureGames,
  } = selectGames({
    data,
    oddsGames,
    liveGames,
    active,
    showOlderResults,
    timeZone,
  });
  const newsMode = newsDisplayMode(loading, displayed.length > 0, newsFailed);
  const socialPosts = unreadSocial(
    socialData.filter((post) => post.socialPlatform !== "youtube"),
    active,
    readIds,
  );
  const youtubeHeadlines = unreadSocial(
    socialData.filter((post) => post.socialPlatform === "youtube"),
    active,
    readIds,
  );
  const failed = [
    ...(data?.health || []).filter((h) =>
      /schedule|scores|scoreboard/.test(h.name),
    ),
    ...newsData.health,
  ].filter(
    (h) =>
      h.name !== "BasketNews" &&
      h.status === "unavailable" &&
      (active === DASHBOARD_PAGE_IDS.ALL ||
        (isTeamId(active) && h.teams.includes(active))),
  );
  // Binds each game to its card and the dashboard's score-reveal state.
  function game(g: Game, compact = false, today = false) {
    return (
      <GameCard
        key={`${g.id}-${hideScores}`}
        game={g}
        today={today}
        compact={compact || g.state === "post"}
        revealPast={resultsReady && !hideScores}
        revealed={revealed.includes(g.id)}
        onReveal={() =>
          setRevealed(
            revealed.includes(g.id)
              ? revealed.filter((id) => id !== g.id)
              : [...revealed, g.id],
          )
        }
      />
    );
  }
  const teamDetails = (
    <div className="team-details">
      {active !== "all" && (
        <TeamInsights
          active={active}
          data={teamInfo}
          revealResults={resultsReady && !hideScores}
          autoOpenStandings={autoOpenStandings}
          playerStats={playerStats}
          playerStatsStatus={playerStatsStatus}
          onRosterOpen={refreshRosterStats}
        />
      )}
      <MatchCalendar games={visibleGames} team={active} />
    </div>
  );

  return (
    <>
      <div
        className="hub"
        data-team={active}
        data-mode={darkMode ? "dark" : "light"}
        style={themeStyle}
      >
        <header className="mast">
          <div className="mast-inner">
            <Link className="brand" href="/">
              <Image
                unoptimized
                className="brand-emblem"
                src="/logos/wolves-friends-neutral.png"
                alt=""
                width={80}
                height={80}
              />
              <div>
                Wolves<span> & Friends</span>
                <i>YOUR TEAMS. ONE PLACE.</i>
              </div>
            </Link>
            <div className="mast-controls">
              <label className="mast-switch-control" htmlFor="show-scores">
                <span>Show scores</span>
                <Switch
                  id="show-scores"
                  className="mast-switch"
                  checked={!hideScores}
                  onCheckedChange={toggleResults}
                  disabled={!resultsReady}
                />
              </label>
              <label className="mast-switch-control" htmlFor="dark-mode">
                <span>Dark mode</span>
                <Switch
                  id="dark-mode"
                  className="mast-switch"
                  checked={darkMode}
                  onCheckedChange={toggleColorMode}
                />
              </label>
            </div>
          </div>
        </header>
        <div className="shell">
          <TeamNavigation
            active={active}
            open={teamMenuOpen}
            teamsPlayingToday={teamsPlayingToday}
            onChoose={choose}
            onToggle={() => setTeamMenuOpen(!teamMenuOpen)}
          />
          <div className="intro">
            <div>
              <p className="eyebrow">
                {active === "march-madness" ? (
                  "NCAA · Men's Division I basketball"
                ) : team?.league ? (
                  <LeagueHeadlines
                    league={team.sport.toUpperCase()}
                    leaguePath={team.league}
                    className="eyebrow-league-trigger"
                  />
                ) : (
                  team && team.sport.toUpperCase()
                )}
              </p>
              <h1>
                {active === "march-madness"
                  ? "March Madness"
                  : team
                    ? team.name
                    : "Your daily catch-up."}
              </h1>
              <p className="subtitle">
                {active === "march-madness"
                  ? "Follow every round. Explore the teams. Catch every result."
                  : "Latest headlines. Live scores. Social posts. All in one place."}
              </p>
            </div>
            {active !== "march-madness" && (
              <SectionLinks
                active={active}
                hasPowerRankings={Boolean(
                  teamInfo.find((i) => i.id === active)?.powerRanking,
                )}
              />
            )}
          </div>
          {active === "march-madness" ? (
            <Suspense
              fallback={
                <p className="headline-loading" role="status">
                  <span className="headline-spinner" aria-hidden="true" />
                  Loading the bracket…
                </p>
              }
            >
              <MarchMadness
                data={marchData}
                unavailable={marchUnavailable}
                revealResults={resultsReady && !hideScores}
                onToggleResults={toggleResults}
              />
            </Suspense>
          ) : (
            <>
              {scheduleError && (
                <p className="alert">
                  Schedules could not refresh; showing previously loaded{" "}
                  {terms.events}.
                </p>
              )}
              {scoreError && (
                <p className="alert">
                  Some live score feeds are unavailable; showing previously
                  loaded {terms.events}.
                </p>
              )}
              <div className="columns">
                <div
                  className={
                    "today-group " +
                    (todayGames.length ? "has-games" : "no-games")
                  }
                >
                  <div className="rail-heading today-heading">
                    <h2>
                      Today’s {terms.events} <small>{todayGames.length}</small>
                    </h2>
                    <span>
                      {localDateTime(new Date().toISOString(), {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {zoneLabel}
                    </span>
                  </div>
                  {todayGames.length ? (
                    todayGames.map((g) =>
                      game(g, active === DASHBOARD_PAGE_IDS.ALL, true),
                    )
                  ) : (
                    <div className="empty compact">
                      {loading
                        ? "Checking today’s schedule…"
                        : `No ${terms.events} returned for today by the available feeds.`}
                    </div>
                  )}
                </div>
                <NewsSection
                  state={{
                    active,
                    timeZone,
                    teamName: team?.name,
                    socialPosts,
                    socialUnavailable,
                    socialRefreshing,
                    socialRefreshError,
                    youtubeHeadlines,
                    youtubeUnavailable,
                    displayed,
                    newest,
                    olderCount,
                    compactNews,
                    newsMode,
                    newsFailed,
                    loading,
                    checked: newsData.checked,
                    failed,
                    readIds,
                    search,
                    showRead,
                    showOlder,
                    sources,
                  }}
                  actions={{
                    choose,
                    markRead,
                    setSearch,
                    setShowRead,
                    toggleOlder: () => setShowOlder(!showOlder),
                    refreshSocial,
                    toggleSources: () => setSources(!sources),
                  }}
                  teamDetails={teamDetails}
                  zoneLabel={zoneLabel}
                  localDateTime={localDateTime}
                />
                <ScoreRail
                  futureGames={futureGames}
                  results={results}
                  availableResults={availableResults}
                  event={terms.event}
                  loading={loading}
                  showOlderResults={showOlderResults}
                  activeIsAll={active === "all"}
                  activeScoreboardUrl={activeScoreboardUrl}
                  teamShort={team?.short}
                  onToggleOlderResults={() =>
                    setShowOlderResults(!showOlderResults)
                  }
                  renderGame={game}
                />
              </div>
            </>
          )}
          <footer>
            <b>Wolves & Friends</b>
            <span>
              Feeds may be delayed or unavailable. Your preferences and read
              status stay in this browser.
            </span>
            <button
              type="button"
              className="diagnostics-export diagnostics-export-link"
              onClick={() => void downloadFeedDiagnostics()}
            >
              Export diagnostics
            </button>
            <a
              className="release-marker"
              href={releaseCommitUrl}
              target="_blank"
              rel="noreferrer"
              title="View the deployed GitHub commit"
            >
              {releaseMarker}
            </a>
          </footer>
        </div>
      </div>
      {resultsReady && <BackToTop />}
    </>
  );
}
