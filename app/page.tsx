"use client";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useDashboardFeeds } from "../hooks/use-dashboard-feeds";
import { browserStorage, readStored, stringList } from "../lib/browser-storage";
import { storedTeam } from "../lib/dashboard-storage";
import { newsDisplayMode } from "../lib/news-page-data";
import StoryCard from "../components/story-card";
import { selectStories, selectGames } from "../lib/dashboard-selectors";
import GameCard from "../components/game-card";
import BackToTop from "../components/back-to-top";
import MatchCalendar from "../components/match-calendar";
import SectionLinks from "../components/section-links";
import ScorePreferenceDialog from "../components/score-preference-dialog";
import {
  loadScorePreference,
  saveScorePreference,
} from "../lib/score-preference";
const MarchMadness = lazy(() => import("../components/march-madness"));
import { recentStories } from "../lib/news-window";
import { sportTerms } from "../lib/sport-terms";
import TeamInsights from "../components/team-insights";
import { teamThemes } from "../lib/team-themes";
import { unreadSocial } from "../lib/social-queue";
import { communities } from "../lib/communities";
import { teams, teamPriority } from "../lib/teams";
import { teamLogoPath } from "../lib/team-logo";
import type { Story, Game } from "../lib/feeds";
import { releaseMarker } from "../lib/release-info";
import { downloadFeedDiagnostics } from "../lib/feed-diagnostics";
const ct = (s: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(s).toLocaleString("en-US", { timeZone: "America/Chicago", ...opts });
export default function Home() {
  const [active, setActive] = useState("wolves"),
    [search, setSearch] = useState(""),
    [sources, setSources] = useState(false),
    [teamMenuOpen, setTeamMenuOpen] = useState(false),
    [readIds, setReadIds] = useState<string[]>([]),
    [showRead, setShowRead] = useState(false),
    [showOlder, setShowOlder] = useState(false),
    [showOlderResults, setShowOlderResults] = useState(false),
    [revealed, setRevealed] = useState<string[]>([]),
    [hideScores, setHideResults] = useState(true),
    [scorePrompt, setScorePrompt] = useState(false),
    [resultsReady, setResultsReady] = useState(false),
    [autoOpenStandings, setAutoOpenStandings] = useState(false),
    [darkMode, setDarkMode] = useState(false);
  const { data, teamInfo, socialData, socialUnavailable, youtubeUnavailable,
    liveGames, scoreCheck, scoreError, loading, newsFailed, newsData, scheduleError,
    oddsGames, playerStats, playerStatsStatus, socialRefreshing, socialRefreshError,
    refreshSocial, refreshRosterStats, fetchNewsPage, activePage } = useDashboardFeeds(active);
  useEffect(() => {
    setActive(storedTeam());
    setReadIds(readStored("wf-read", stringList, []));
    setDarkMode(browserStorage.getItem("wf-color-mode") === "dark");
    const preference = loadScorePreference(browserStorage);
    setHideResults(preference.hidden); setScorePrompt(preference.ask);
    if (!preference.ask && !preference.hidden)
      setAutoOpenStandings(window.matchMedia("(min-width: 1600px)").matches);
    setResultsReady(true);
  }, []);
  function choose(id: string) {
    activePage.current = id;
    setActive(id);
    setAutoOpenStandings(false);
    if (id !== "all") void fetchNewsPage(id);
    setTeamMenuOpen(false);
    setShowOlder(false);
    setShowOlderResults(false);
    browserStorage.setItem("wf-team", id);
  }
  function toggleResults() {
    const next = !hideScores;
    setHideResults(next);
    try {
      browserStorage.setItem("wf-hide-results", String(next));
    } catch {}
  }
  function chooseScores(hidden: boolean, ask: boolean) {
    try {
      saveScorePreference(browserStorage, hidden, ask);
    } catch {}
    setHideResults(hidden);
    setAutoOpenStandings(
      !hidden && window.matchMedia("(min-width: 1600px)").matches,
    );
    setScorePrompt(false);
  }
  function toggleColorMode() {
    const next = !darkMode;
    setDarkMode(next);
    try {
      browserStorage.setItem("wf-color-mode", next ? "dark" : "light");
    } catch {}
  }
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
  const terms = sportTerms(active);
  const { compactNews, displayed, olderCount, newest } = selectStories({
    newsData, active, search, readIds, showRead, showOlder,
  });
  const { teamsPlayingToday, visibleGames, availableResults, results, todayGames, futureGames } = selectGames({
    data, oddsGames, liveGames, active, showOlderResults,
  });
  const newsMode = newsDisplayMode(loading, displayed.length > 0, newsFailed);
  const socialPosts = unreadSocial(socialData.filter((post) => post.socialPlatform !== "youtube"), active, readIds);
  const youtubeHeadlines = unreadSocial(socialData.filter((post) => post.socialPlatform === "youtube"), active, readIds);
  const failed = [
    ...(data?.health || []).filter((h) =>
      /schedule|scores|scoreboard/.test(h.name),
    ),
    ...newsData.health,
  ].filter(
    (h) =>
      h.name !== "BasketNews" &&
      h.status === "unavailable" &&
      (active === "all" || h.teams.includes(active)),
  );
  function game(g: Game, compact = false, today = false) {
    return (
      <GameCard
        key={g.id}
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
  const story = (item: Story) => (
    <StoryCard key={item.id} story={item} choose={choose} markRead={markRead} readIds={readIds} />
  );

  return (
    <>
      <ScorePreferenceDialog open={scorePrompt} onChoose={chooseScores} />
      <div
        className={"hub" + (!resultsReady || scorePrompt ? " score-gated" : "")}
        inert={!resultsReady || scorePrompt}
        data-team={active}
        data-mode={darkMode ? "dark" : "light"}
        style={themeStyle}
      >
        <header className="mast">
          <div className="mast-inner">
            <a className="brand" href="/">
              <img
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
            </a>
            <button
              className="color-mode-toggle"
              onClick={toggleColorMode}
              aria-label="Dark mode"
              aria-pressed={darkMode}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
              <span className="color-mode-label">
                {darkMode ? "Light mode" : "Dark mode"}
              </span>
            </button>
          </div>
        </header>
        <div className="shell">
          <button
            className="team-menu-toggle"
            onClick={() => setTeamMenuOpen(!teamMenuOpen)}
            aria-expanded={teamMenuOpen}
            aria-controls="team-filters"
          >
            <span aria-hidden="true">{teamMenuOpen ? "×" : "☰"}</span>
            <strong>
              {active === "march-madness"
                ? "March Madness"
                : team?.short || "All teams"}
            </strong>
            <span className="team-menu-caption">
              {teamMenuOpen ? "Close teams" : "Choose team"}
            </span>
          </button>
          <nav
            id="team-filters"
            className={"team-nav " + (teamMenuOpen ? "menu-open" : "")}
            aria-label="Team filters"
          >
            <button
              aria-pressed={active === "all"}
              className={active === "all" ? "selected" : ""}
              onClick={() => choose("all")}
            >
              <img
                className="team-tab-logo"
                src="/logos/wolves-friends-neutral.png"
                alt=""
                width={40}
                height={40}
              />
              <span>All teams</span>
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                data-tab-team={t.id}
                aria-pressed={active === t.id}
                className={active === t.id ? "selected" : ""}
                onClick={() => choose(t.id)}
              >
                <span className="dot" style={{ background: t.color }} />
                <img
                  className="team-tab-logo"
                  src={
                    t.id === "disc"
                      ? "/logos/dgpt.png"
                      : teamLogoPath(t.id)
                  }
                  alt=""
                  width={40}
                  height={40}
                />
                <span>{t.short}</span>
                {teamsPlayingToday.has(t.id) && (
                  <span
                    className="team-today"
                    title={`${sportTerms(t.id).event} today`}
                  >
                    Today
                  </span>
                )}
              </button>
            ))}
            <button
              data-tab-team="march-madness"
              aria-pressed={active === "march-madness"}
              className={active === "march-madness" ? "selected" : ""}
              onClick={() => choose("march-madness")}
            >
              <img
                className="team-tab-logo"
                src="/logos/march-madness.svg"
                alt=""
                width={40}
                height={40}
              />
              <span>March Madness</span>
            </button>
          </nav>
          <div className="intro">
            <div>
              <p className="eyebrow">
                {active === "march-madness"
                  ? "NCAA · Men's Division I basketball"
                  : team && team.sport.toUpperCase()}
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
            {active !== "march-madness" && <SectionLinks active={active} />}
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
                      {ct(new Date().toISOString(), {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · CT
                    </span>
                  </div>
                  {todayGames.length ? (
                    todayGames.map((g) => game(g, false, true))
                  ) : (
                    <div className="empty compact">
                      {loading
                        ? "Checking today’s schedule…"
                        : `No ${terms.events} returned for today by the available feeds.`}
                    </div>
                  )}
                </div>
                <section className="news">
                  <div className="headlines-content">
                    <div className="ultrawide-left-column">
                      <section
                        id="latest-messages"
                        className="message-feed"
                        aria-label="Latest Social Media"
                      >
                        <div className="social-heading">
                          <h2>Latest Social Media</h2>
                          <button
                            type="button"
                            className="social-refresh"
                            onClick={() => void refreshSocial(true)}
                            disabled={socialRefreshing}
                            aria-label="Refresh latest social media"
                            title={
                              socialRefreshing
                                ? "Refreshing social posts…"
                                : "Refresh social posts"
                            }
                            aria-busy={socialRefreshing}
                          >
                            <span
                              aria-hidden="true"
                              className={
                                socialRefreshing ? "refresh-spinning" : ""
                              }
                            >
                              ↻
                            </span>
                          </button>
                        </div>
                        <p className="feed-description">
                          {active === "all"
                            ? "Latest posts for your teams · Bluesky"
                            : team?.name + " posts"}
                        </p>
                        {socialRefreshError && (
                          <p className="feed-description" role="status">
                            Social posts could not refresh. Try again shortly.
                          </p>
                        )}
                        {socialPosts.length ? (
                          socialPosts.map(story)
                        ) : (
                          <p className="feed-description">
                            No unread matching posts in the current feed.
                          </p>
                        )}
                        {socialUnavailable.some(
                          (id) => active === "all" || active === id,
                        ) && (
                          <p className="feed-description">
                            Some social feeds are unavailable; cached posts may
                            remain.
                          </p>
                        )}
                      </section>
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
                      <div className="news-resources">
                        <section className="community-panel">
                          <h2>Fan communities</h2>
                          <p>Permanent Reddit links</p>
                          {communities
                            .filter((c) => active === "all" || c.team === active)
                            .map((c) => (
                              <a
                                key={c.url}
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={teamLogoPath(c.team)}
                                  alt=""
                                  width={24}
                                  height={24}
                                />
                                <span>{c.name} ↗</span>
                              </a>
                            ))}
                        </section>
                        <div className="source-panel">
                          <button
                            className="source-toggle"
                            onClick={() => setSources(!sources)}
                            aria-expanded={sources}
                          >
                            Source desk <span>{sources ? "−" : "+"}</span>
                          </button>
                          <p>
                            Direct links to your trusted voices, including sources
                            whose feeds aren’t available.
                          </p>
                          {sources && (
                            <div className="source-grid">
                              {(team ? [team] : teams).map((t) => (
                                <div key={t.id}>
                                  <h4>{t.short}</h4>
                                  {t.sources.map(([name, url]) => (
                                    <a
                                      key={url}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {name} ↗
                                    </a>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          {failed.length > 0 && (
                            <details className="health">
                              <summary>
                                {failed.length} feed{failed.length === 1 ? "" : "s"}{" "}
                                unavailable · cached items may remain
                              </summary>
                              {failed.map((h) => (
                                <p key={h.name}>
                                  {h.name} · checked{" "}
                                  {ct(h.checked, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}{" "}
                                  CT
                                </p>
                              ))}
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="headline-column">
                    <div className="section-heading">
                      <h2 className="latest-heading">
                        Latest stories <small>{displayed.length}</small>
                      </h2>
                      <label className="show-read">
                        <input
                          type="checkbox"
                          checked={showRead}
                          onChange={(e) => setShowRead(e.target.checked)}
                        />{" "}
                        Show read
                      </label>
                      <label className="search">
                        <span aria-hidden="true">⌕</span>
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Find a headline"
                          aria-label="Search headlines"
                        />
                      </label>
                    </div>
                    {youtubeHeadlines.length > 0 && (
                      <section className="youtube-headlines" aria-label="Latest YouTube videos">
                        <h3>Latest videos</h3>
                        {youtubeHeadlines.map(story)}
                      </section>
                    )}
                    {youtubeUnavailable.some(
                      (id) => active === "all" || active === id,
                    ) && (
                      <p className="feed-description">
                        Some official YouTube feeds are temporarily unavailable.
                      </p>
                    )}
                    {loading && displayed.length > 0 && (
                      <p className="headline-loading" role="status">
                        <span className="headline-spinner" aria-hidden="true" />
                        Fetching more headlines…
                      </p>
                    )}
                    {newsMode === "loading" ? (
                      <div
                        className="empty headline-loading"
                        role="status"
                        aria-live="polite"
                      >
                        <span className="headline-spinner" aria-hidden="true" />
                        Fetching headlines…
                      </div>
                    ) : newsMode === "error" ? (
                      <div className="empty" role="status">
                        Headlines are temporarily unavailable. We’ll try again
                        automatically.
                      </div>
                    ) : displayed.length ? (
                      displayed.map(story)
                    ) : (
                      <div className="empty">
                        <h3>
                          {search
                            ? "No matching headlines."
                            : newest &&
                                recentStories([newest], active).length === 0
                              ? "No news since " +
                                ct(newest.date, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : active === "all"
                                ? "No unread headlines from today."
                                : "No unread headlines from the last week."}
                        </h3>
                        <p>
                          {olderCount > 0
                            ? "Use View older to catch up on earlier articles."
                            : "Check the Source desk for more coverage."}
                        </p>
                      </div>
                    )}
                    {newsData.checked && (
                      <p className="feed-description">
                        Last update:{" "}
                        {ct(newsData.checked, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        CT
                      </p>
                    )}
                    {!loading && newsFailed && displayed.length > 0 && (
                      <p className="feed-description">
                        Some headline feeds are unavailable.
                      </p>
                    )}
                    {!loading && compactNews && (
                      <div className="news-more">
                        <p>
                          {showOlder
                            ? "Showing older headlines too."
                            : active === "all"
                              ? "Headlines from today."
                              : "Headlines from the last week."}
                        </p>
                        {(olderCount > 0 || showOlder) && (
                          <button onClick={() => setShowOlder(!showOlder)}>
                            {showOlder
                              ? "Hide older"
                              : "View older (" + olderCount + ")"}
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </section>
                <aside className="scores">
                  <div className="rail-heading upcoming-heading">
                    <h2>Coming up</h2>
                  </div>
                  {futureGames.length ? (
                    futureGames.map((g) => game(g, true))
                  ) : (
                    <div className="empty compact">
                      No upcoming {terms.event} returned by the available feeds.
                    </div>
                  )}
                  <div className="rail-heading results">
                    <h2>Recent results</h2>
                    <span>Latest available</span>
                  </div>
                  <button
                    type="button"
                    className="results-toggle"
                    onClick={toggleResults}
                    disabled={!resultsReady}
                  >
                    {hideScores ? "Show scores" : "Hide scores"}
                  </button>
                  {results.length ? (
                    results.map((g) => game(g, true))
                  ) : (
                    <div className="empty compact">
                      {loading
                        ? "Checking results…"
                        : `No completed ${terms.event} returned by the available feeds.`}
                    </div>
                  )}
                  {active !== "all" && availableResults.length > 3 && (
                    <button
                      type="button"
                      className="results-toggle"
                      aria-expanded={showOlderResults}
                      onClick={() => setShowOlderResults(!showOlderResults)}
                    >
                      {showOlderResults
                        ? "Hide older"
                        : `Show older (${availableResults.length - 3})`}
                    </button>
                  )}
                  {(active === "disc" || active === "frost") && (
                    <div className="score-note">
                      <b>More scoreboards</b>
                      <p>
                        {team?.short} scoring pages provide additional coverage
                        beyond the imported schedules.
                      </p>
                      {teams
                        .filter((t) => active === t.id)
                        .map((t) => (
                          <a
                            key={t.id}
                            href={
                              t.sources.find(([name]) =>
                                /score|Live|schedule|Results/i.test(name),
                              )?.[1] || t.sources[0][1]
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t.short} scoreboard ↗
                          </a>
                        ))}
                    </div>
                  )}
                </aside>
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
              className="diagnostics-export"
              onClick={() => void downloadFeedDiagnostics()}
            >
              Export diagnostics
            </button>
            <small className="release-marker" title="Deployed Git commit">
              {releaseMarker}
            </small>
          </footer>
        </div>
      </div>
      {resultsReady && !scorePrompt && <BackToTop />}
    </>
  );
}
