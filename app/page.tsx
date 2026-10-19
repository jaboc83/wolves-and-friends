"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import GameCard from "../components/game-card";
import MatchCalendar from "../components/match-calendar";
import SectionLinks from "../components/section-links";
import { sportTerms } from "../lib/sport-terms";
import TeamInsights from "../components/team-insights";
import { recentStories } from "../lib/news-window";
import { activeHub, activeStories } from "../lib/content-policy";
import { discEvents } from "../lib/event-seed";
import { eventLifecycle, eventIsToday } from "../lib/event-time";
import infoSeed from "../lib/team-info-initial.json";
import type { TeamInfo } from "../lib/team-info";
import TeamLogos from "../components/team-logos";
import { teamThemes } from "../lib/team-themes";
import { validAuthorStory } from "../lib/byline-status";
import { socialQueue, unreadSocial } from "../lib/social-queue";
import { authorStories } from "../lib/author-stories";
import { communities } from "../lib/communities";
import { teams, teamPriority } from "../lib/teams";
import initial from "../lib/initial.json";
import type { HubData, Story, Game } from "../lib/feeds";
import SocialImage from "../components/social-image";
import { isLocalSocialImage } from "../lib/bluesky-images";
const ct = (s: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(s).toLocaleString("en-US", { timeZone: "America/Chicago", ...opts });
const day = (s: string) =>
  ct(s, { year: "numeric", month: "2-digit", day: "2-digit" });
const age = (s: string) => {
  const h = Math.max(0, Math.floor((Date.now() - Date.parse(s)) / 3600000));
  return h < 1
    ? "Just now"
    : h < 24
      ? h + "h ago"
      : Math.floor(h / 24) + "d ago";
};
function retainAvatars(next: HubData, previous?: HubData | null): HubData {
  const key = (s: Story) =>
    s.url.split("/profile/")[1]?.split("/post/")[0] || s.source;
  const known = new Map<string, string>(
    [...(initial.stories as Story[]), ...(previous?.stories || [])]
      .filter((s) => s.kind === "social" && isLocalSocialImage(s.avatar))
      .map((s) => [key(s), s.avatar!]),
  );
  return {
    ...next,
    stories: next.stories.map((s) =>
      s.kind === "social" && !isLocalSocialImage(s.avatar)
        ? { ...s, avatar: known.get(key(s)) }
        : s,
    ),
  };
}
export default function Home() {
  const [data, setData] = useState<HubData | null>(
      activeHub(initial as HubData),
    ),
    [teamInfo, setTeamInfo] = useState<TeamInfo[]>(infoSeed as TeamInfo[]),
    [active, setActive] = useState("wolves"),
    [search, setSearch] = useState(""),
    [newsPages, setNewsPages] = useState<Record<string, HubData>>({}),
    [newsStatus, setNewsStatus] = useState<
      Record<string, "loading" | "ready" | "error">
    >({}),
    [sources, setSources] = useState(false),
    [teamMenuOpen, setTeamMenuOpen] = useState(false),
    [socialData, setSocialData] = useState<Story[]>(
      socialQueue(initial.stories as Story[]),
    ),
    [socialUnavailable, setSocialUnavailable] = useState<string[]>([]),
    [youtubeUnavailable, setYoutubeUnavailable] = useState<string[]>([]),
    [liveGames, setLiveGames] = useState<Game[]>([]),
    [scoreCheck, setScoreCheck] = useState(""),
    [scoreError, setScoreError] = useState(false),
    [readIds, setReadIds] = useState<string[]>([]),
    [showRead, setShowRead] = useState(false),
    [showOlder, setShowOlder] = useState(false),
    [showOlderResults, setShowOlderResults] = useState(false),
    [revealed, setRevealed] = useState<string[]>([]),
    [hideScores, setHideResults] = useState(false),
    [resultsReady, setResultsReady] = useState(false),
    [darkMode, setDarkMode] = useState(false);
  const pending = useRef(new Map<string, Promise<void>>());
  function once(key: string, work: () => Promise<void>) {
    const existing = pending.current.get(key);
    if (existing) return existing;
    const request = work().finally(() => {
      pending.current.delete(key);
    });
    pending.current.set(key, request);
    return request;
  }
  function refreshInfo() {
    return once("info", async () => {
      try {
        const r = await fetch("/api/team-info", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (r.ok) setTeamInfo((await r.json()) as TeamInfo[]);
      } catch {}
    });
  }
  const [socialRefreshing, setSocialRefreshing] = useState(false);
  const [socialRefreshError, setSocialRefreshError] = useState(false);
  function refreshSocial(force = false) {
    return once("social", async () => {
      setSocialRefreshing(true);
      setSocialRefreshError(false);
      try {
        const r = await fetch(force ? "/api/social?refresh=1" : "/api/social", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        });
        if (!r.ok) throw Error();
        const d = (await r.json()) as {
          posts: Story[];
          unavailable: string[];
          youtubeUnavailable?: string[];
        };
        setSocialData((previous) => {
          const next = socialQueue([...d.posts, ...previous]);
          const merged = retainAvatars(
            { ...initial, stories: activeStories(next) } as HubData,
            { ...initial, stories: previous } as HubData,
          ).stories;
          try {
            localStorage.setItem("wf-social-cache", JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setSocialUnavailable(d.unavailable);
        setYoutubeUnavailable(d.youtubeUnavailable || []);
      } catch {
        setSocialUnavailable(teams.map((t) => t.id));
        setSocialRefreshError(true);
      } finally {
        setSocialRefreshing(false);
      }
    });
  }
  function refreshScores() {
    return once("scores", async () => {
      try {
        const r = await fetch("/api/scores", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        });
        if (!r.ok) throw Error();
        const d = (await r.json()) as {
          games: Game[];
          checked: string;
          unavailable: string[];
        };
        setLiveGames(d.games);
        setScoreCheck(d.checked);
        setScoreError(d.unavailable.length > 0);
      } catch {
        setScoreError(true);
      }
    });
  }
  const activePage = useRef("wolves");
  const newsChecked = useRef(new Map<string, number>());
  function fetchNewsPage(id: string, force = false) {
    if (!force && Date.now() - (newsChecked.current.get(id) || 0) < 300000)
      return Promise.resolve();
    return once("news:" + id, async () => {
      setNewsStatus((s) => ({ ...s, [id]: "loading" }));
      try {
        const r = await fetch("/api/news?team=" + encodeURIComponent(id), {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        });
        if (!r.ok) throw Error();
        const d = activeHub((await r.json()) as HubData);
        if (
          d.health.length &&
          d.health.every((h) => h.status === "unavailable")
        )
          throw Error();
        setNewsPages((pages) => ({ ...pages, [id]: d }));
        newsChecked.current.set(id, Date.now());
        setNewsStatus((s) => ({ ...s, [id]: "ready" }));
      } catch {
        setNewsStatus((s) => ({ ...s, [id]: "error" }));
      }
    });
  }
  function refreshNews() {
    return once("news-queue", async () => {
      const selected = activePage.current;
      if (selected !== "all") await fetchNewsPage(selected, true);
      // Background work is bounded to one page at a time. Selecting a new page
      // can immediately start its request without waiting behind this queue.
      for (const t of teams) {
        if (t.id !== selected) await fetchNewsPage(t.id);
      }
    });
  }
  const visibleNewsIds = active === "all" ? teams.map((t) => t.id) : [active];
  const loading = visibleNewsIds.some(
    (id) => !newsStatus[id] || newsStatus[id] === "loading",
  );
  const newsFailed = visibleNewsIds.some((id) => newsStatus[id] === "error");
  const newsData: HubData = {
    checked:
      visibleNewsIds
        .filter((id) => newsStatus[id] === "ready")
        .map((id) => newsPages[id]?.checked || "")
        .sort()[0] || "",
    stories: visibleNewsIds.flatMap((id) =>
      newsStatus[id] === "ready" ? newsPages[id]?.stories || [] : [],
    ),
    authors: visibleNewsIds.flatMap((id) =>
      newsStatus[id] === "ready" ? newsPages[id]?.authors || [] : [],
    ),
    health: visibleNewsIds.flatMap((id) => newsPages[id]?.health || []),
    games: [],
  };
  const [scheduleError, setScheduleError] = useState(false);
  const [oddsGames, setOddsGames] = useState<Game[]>([]);
  function refreshSchedules() {
    return once("schedules", async () => {
      try {
        const r = await fetch("/api/schedules", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!r.ok) throw Error();
        const d = activeHub((await r.json()) as HubData);
        setData((previous) => {
          const merged = {
            ...(previous || d),
            games: d.games,
            health: [
              ...(previous?.health || []).filter(
                (h) =>
                  !h.name.includes("schedule") &&
                  !h.name.includes("scores") &&
                  !h.name.includes("scoreboard"),
              ),
              ...d.health,
            ],
          };
          try {
            localStorage.setItem("wf-cache", JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setScheduleError(false);
        void refreshOdds();
      } catch {
        setScheduleError(true);
      }
    });
  }
  function refreshOdds() {
    return once("odds", async () => {
      try {
        const r = await fetch("/api/odds", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { games: Game[] };
        setOddsGames(d.games);
      } catch {}
    });
  }
  function refresh() {
    void refreshInfo();
    void refreshScores();
    void refreshSocial();
    void refreshSchedules();
    void refreshNews();
  }
  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem("wf-color-mode") === "dark");
    } catch {}
    try {
      setHideResults(localStorage.getItem("wf-hide-results") === "true");
    } catch {}
    setResultsReady(true);
    try {
      const socialCache = localStorage.getItem("wf-social-cache");
      if (socialCache)
        setSocialData(
          (previous) =>
            retainAvatars(
              {
                ...initial,
                stories: socialQueue(activeStories(JSON.parse(socialCache))),
              } as HubData,
              { ...initial, stories: previous } as HubData,
            ).stories,
        );
      const c = localStorage.getItem("wf-cache");
      if (c)
        setData((previous) =>
          retainAvatars(activeHub(JSON.parse(c)), previous),
        );
      setReadIds(JSON.parse(localStorage.getItem("wf-read") || "[]"));
      const previousTeam = localStorage.getItem("wf-team") || "wolves";
      activePage.current =
        previousTeam === "all" || teams.some((t) => t.id === previousTeam)
          ? previousTeam
          : "wolves";
      setActive(
        previousTeam === "all" || teams.some((t) => t.id === previousTeam)
          ? previousTeam
          : "wolves",
      );
    } catch {}
    refresh();
    const i = setInterval(refresh, 300000);
    const si = setInterval(() => {
      refreshScores();
      refreshSocial();
    }, 60000);
    return () => {
      clearInterval(i);
      clearInterval(si);
    };
  }, []);
  function choose(id: string) {
    activePage.current = id;
    setActive(id);
    if (id !== "all") void fetchNewsPage(id);
    setTeamMenuOpen(false);
    setShowOlder(false);
    setShowOlderResults(false);
    localStorage.setItem("wf-team", id);
  }
  function toggleResults() {
    const next = !hideScores;
    setHideResults(next);
    try {
      localStorage.setItem("wf-hide-results", String(next));
    } catch {}
  }
  function toggleColorMode() {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem("wf-color-mode", next ? "dark" : "light");
    } catch {}
  }
  function markRead(id: string) {
    const next = readIds.includes(id)
      ? readIds.filter((x) => x !== id)
      : [...readIds, id];
    setReadIds(next);
    localStorage.setItem("wf-read", JSON.stringify(next));
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
  const recent = recentStories(filtered, active);
  const displayed = compactNews && !showOlder ? recent : filtered;
  const olderCount = filtered.length - recent.length;
  const newest = (newsData.stories || [])
    .filter(
      (s) =>
        s.kind !== "social" && (active === "all" || s.teams.includes(active)),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
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
  const socialPosts = unreadSocial(socialData, active, readIds);
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
        teamPriority(a.team) - teamPriority(b.team) ||
        Date.parse(a.date) - Date.parse(b.date),
    );
  const futureCandidates = upcoming.filter((g) => !eventIsToday(g));
  const nextByTeam = new Map<string, Game>();
  for (const g of futureCandidates)
    if (!nextByTeam.has(g.team)) nextByTeam.set(g.team, g);
  const futureGames =
    active === "all"
      ? [...nextByTeam.values()].sort(
          (a, b) => teamPriority(a.team) - teamPriority(b.team),
        )
      : futureCandidates.slice(0, 3);
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
  function story(s: Story) {
    s = {
      ...s,
      teams: [...s.teams].sort((a, b) => teamPriority(a) - teamPriority(b)),
    };
    const isToday =
      s.kind !== "social" && day(s.date) === day(new Date().toISOString());
    return (
      <article
        className={
          "story " +
          (s.kind === "social" ? "message-post" : "") +
          (isToday ? " story-today" : "")
        }
        key={s.id}
      >
        {s.socialPlatform === "youtube" ? (
          <TeamLogos teamIds={s.teams} />
        ) : s.kind === "social" ? (
          <div className="post-avatar">
            <SocialImage
              src={s.avatar}
              alt=""
              width={40}
              height={40}
              fallback={
                <span aria-hidden="true">
                  {s.source.replace("Bluesky · ", "").charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>
        ) : (
          <TeamLogos teamIds={s.teams} />
        )}
        <div className="story-content">
          <div className="story-meta">
            {isToday && <span className="today-badge">TODAY</span>}
            <span>{s.source}</span>
            <span>· {age(s.date)}</span>
            {s.kind === "social" && (
              <span className="video">
                {s.socialPlatform === "youtube" ? "VIDEO" : "POST"}
              </span>
            )}
            {s.premium && <span>INSIDER</span>}
            {s.kind === "video" && <span className="video">VIDEO</span>}
          </div>
          <h3>
            <a
              title={s.originalTitle}
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              {s.title} <span>↗</span>
            </a>
          </h3>
          {s.kind === "social" && !!s.images?.length && (
            <div
              className={
                "post-images" +
                (s.images.length === 1 ? " post-images-single" : "")
              }
            >
              {s.images
                .slice(0, 4)
                .filter((image) => isLocalSocialImage(image.src))
                .map((image, index) => (
                  <a
                    key={image.src + index}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={image.alt || "View photo on Bluesky"}
                  >
                    <SocialImage
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      fallback={
                        <span className="post-image-fallback">
                          View photo on Bluesky ↗
                        </span>
                      }
                    />
                  </a>
                ))}
            </div>
          )}
          <div className="story-bottom">
            <div>
              {s.teams.map((id) => {
                const t = teams.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    onClick={() => choose(id)}
                    style={{ color: t.color }}
                  >
                    {t.short}
                  </button>
                );
              })}
              <time
                title={
                  ct(s.date, { dateStyle: "medium", timeStyle: "short" }) +
                  " CT"
                }
              >
                {s.dateApproximate ? "Approx. " : ""}
                {ct(s.date, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                CT
              </time>
            </div>
            <button className="read-toggle" onClick={() => markRead(s.id)}>
              {readIds.includes(s.id) ? "Mark unread" : "✓ Mark read"}
            </button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div
      className="hub"
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
          <strong>{team?.short || "All teams"}</strong>
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
                    ? "/logos/dgpt-tab.png"
                    : t.id === "zalgiris"
                      ? "/logos/zalgiris-tab.svg"
                      : t.id === "usmnt"
                        ? "/logos/usmnt-tab.svg"
                        : `/logos/${t.id}.png`
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
        </nav>
        <div className="intro">
          <div>
            <p className="eyebrow">{team && team.sport.toUpperCase()}</p>
            <h1>{team ? team.name : "Your daily catch-up."}</h1>
            <p className="subtitle">
              Latest headlines. Live scores. Social posts. All in one place.
            </p>
          </div>
          <SectionLinks active={active} />
        </div>
        {scheduleError && (
          <p className="alert">
            Schedules could not refresh; showing previously loaded{" "}
            {terms.events}.
          </p>
        )}
        {scoreError && (
          <p className="alert">
            Some live score feeds are unavailable; showing previously loaded{" "}
            {terms.events}.
          </p>
        )}
        <div className="columns">
          <div
            className={
              "today-group " + (todayGames.length ? "has-games" : "no-games")
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
              {
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
                    >
                      <span
                        aria-hidden="true"
                        className={socialRefreshing ? "refresh-spinning" : ""}
                      >
                        ↻
                      </span>{" "}
                      {socialRefreshing ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                  <p className="feed-description">
                    {active === "all"
                      ? "Latest posts for your teams · Bluesky & YouTube"
                      : team?.name + " posts"}
                  </p>
                  {socialRefreshError && (
                    <p className="feed-description" role="status">
                      Social posts could not refresh. Try again shortly.
                    </p>
                  )}
                  {youtubeUnavailable.some(
                    (id) => active === "all" || active === id,
                  ) && (
                    <p className="feed-description">
                      Some official YouTube feeds are temporarily unavailable.
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
              }
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
              {loading && active === "all" && displayed.length > 0 && (
                <p className="headline-loading" role="status">
                  <span className="headline-spinner" aria-hidden="true" />
                  Fetching more headlines…
                </p>
              )}
              {loading && (active !== "all" || !displayed.length) ? (
                <div
                  className="empty headline-loading"
                  role="status"
                  aria-live="polite"
                >
                  <span className="headline-spinner" aria-hidden="true" />
                  Fetching headlines…
                </div>
              ) : newsFailed && !displayed.length ? (
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
                      : newest && recentStories([newest], active).length === 0
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
              {!loading && newsData.checked && (
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
            <div className="team-details">
              <TeamInsights active={active} data={teamInfo} />
              <MatchCalendar games={visibleGames} team={active} />
            </div>
            <div className="news-resources">
              <section className="community-panel">
                <h2>Fan communities</h2>
                <p>Permanent Reddit links</p>
                {communities
                  .filter((c) => active === "all" || active === c.team)
                  .map((c) => (
                    <a
                      key={c.url}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={
                          "/logos/" +
                          c.team +
                          (c.team === "disc" ? ".svg" : ".png")
                        }
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
                  Direct links to your trusted voices, including sources whose
                  feeds aren’t available.
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
                        {ct(h.checked, { hour: "numeric", minute: "2-digit" })}{" "}
                        CT
                      </p>
                    ))}
                  </details>
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
                  {team?.short} scoring pages provide additional coverage beyond
                  the imported schedules.
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
        <footer>
          <b>Wolves & Friends</b>
          <span>
            Feeds may be delayed or unavailable. Your preferences and read
            status stay in this browser.
          </span>
        </footer>
      </div>
    </div>
  );
}
