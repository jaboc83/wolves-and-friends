// Client hook that loads and polls same-origin feeds (news, scores, social, rosters) and keeps preferences in localStorage.
"use client";
import { useEffect, useRef, useState } from "react";
import {
  createPublicRequests,
  pollPublicFeeds,
} from "../lib/browser/public-requests";
import {
  browserStorage,
  readStored,
  writeStored,
} from "../lib/browser/storage";
import {
  createRosterStatsLoader,
  type StatsStatus,
} from "../lib/team-info/roster-stats-loader";
import {
  readPlayerStatsCache,
  writePlayerStatsCache,
} from "../lib/team-info/player-stats-cache";
import type { PlayerStats } from "../lib/team-info/player-stats";
import type { HubData, Story, Game } from "../lib/feeds";
import type { TeamInfo } from "../lib/team-info";
import { activeHub, activeStories } from "../lib/dashboard/content-policy";
import { socialQueue } from "../lib/social/social-queue";
import { isLocalSocialImage } from "../lib/social/bluesky-images";
import {
  loadedNewsData,
  newsForTeam,
  newsPageUrl,
} from "../lib/browser/news-page-data";
import { loadPageBeforeBackground } from "../lib/browser/page-first-feeds";
import type { MarchData } from "../lib/games/march-madness";
import { isTeamId, TEAM_IDS, teams, type TeamId } from "../lib/teams/teams";
import {
  isHubData,
  isStories,
  storedDashboardPage,
} from "../lib/dashboard/storage";
import {
  recordFeedDiagnostics,
  recordRequestDiagnostic,
} from "../lib/feeds/feed-diagnostics";
import type { DashboardPageId } from "../lib/dashboard/page-id";
const emptyHub: HubData = {
  checked: "",
  stories: [],
  games: [],
  health: [],
  authors: [],
};
function retainAvatars(next: HubData, previous?: HubData | null): HubData {
  const key = (s: Story) =>
    s.url.split("/profile/")[1]?.split("/post/")[0] || s.source;
  const known = new Map<string, string>(
    [...(previous?.stories || [])]
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
export function useDashboardFeeds(active: DashboardPageId) {
  const [data, setData] = useState<HubData | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo[]>([]);
  const [newsPages, setNewsPages] = useState<Partial<Record<TeamId, HubData>>>(
    {},
  );
  const [newsStatus, setNewsStatus] = useState<
    Partial<Record<TeamId, "loading" | "ready" | "error">>
  >({});
  const [socialData, setSocialData] = useState<Story[]>([]);
  const [socialUnavailable, setSocialUnavailable] = useState<string[]>([]);
  const [youtubeUnavailable, setYoutubeUnavailable] = useState<string[]>([]);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [scoreCheck, setScoreCheck] = useState("");
  const [scoreError, setScoreError] = useState(false);
  const [marchData, setMarchData] = useState<MarchData | null>(null);
  const [marchUnavailable, setMarchUnavailable] = useState(false);
  const requests = useRef(createPublicRequests());
  const rosterLoader = useRef(createRosterStatsLoader());
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>(
    {},
  );
  const [playerStatsStatus, setPlayerStatsStatus] =
    useState<StatsStatus>("idle");
  function loadRosterStats(priorityKeys: string[]) {
    const request = rosterLoader.current({
      fetchManifest: async (version, signal) => {
        const response = await requests.current.fetch(
          "/api/roster-stats?manifest=1" +
            (version ? "&version=" + encodeURIComponent(version) : ""),
          { credentials: "omit", referrerPolicy: "no-referrer", signal },
        );
        if (!response.ok)
          throw Error(
            response.status === 409 ? "Manifest changed" : "Stats unavailable",
          );
        return response.json();
      },
      fetchBatch: async (batch, version, signal) => {
        const response = await requests.current.fetch(
          "/api/roster-stats?batch=" +
            batch +
            (version ? "&version=" + encodeURIComponent(version) : ""),
          {
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal,
          },
        );
        if (!response.ok)
          throw Error(
            response.status === 409 ? "Manifest changed" : "Stats unavailable",
          );
        return response.json();
      },
      onStats: (stats) => {
        setPlayerStats(stats);
        try {
          writePlayerStatsCache(browserStorage, stats);
        } catch {}
      },
      onStatus: setPlayerStatsStatus,
      priorityKeys,
    });
    void request.catch((error) =>
      recordRequestDiagnostic("Roster stats request", [], error),
    );
    return request;
  }
  const rosterKeys = useRef<string[]>([]);
  const rosterRetries = useRef(0);
  const rosterLoad = useRef(loadRosterStats);
  useEffect(() => {
    rosterLoad.current = loadRosterStats;
  });
  function refreshRosterStats(priorityKeys: string[] = []) {
    if (priorityKeys.length) rosterKeys.current = priorityKeys;
    rosterRetries.current = 0;
    return loadRosterStats(priorityKeys);
  }
  useEffect(() => {
    if (playerStatsStatus === "ready") rosterRetries.current = 0;
    if (
      (playerStatsStatus !== "partial" &&
        playerStatsStatus !== "unavailable") ||
      !rosterKeys.current.length ||
      rosterRetries.current >= 3
    )
      return;
    const timer = setTimeout(
      () => {
        rosterRetries.current += 1;
        void rosterLoad.current(rosterKeys.current);
      },
      15000 * (rosterRetries.current + 1),
    );
    return () => clearTimeout(timer);
  }, [playerStatsStatus]);

  const once = requests.current.once;
  function refreshInfo() {
    return once("info", async () => {
      try {
        const r = await requests.current.fetch("/api/team-info", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (r.ok) setTeamInfo((await r.json()) as TeamInfo[]);
      } catch (error) {
        void recordRequestDiagnostic("Team info request", [], error);
      }
    });
  }
  const [socialRefreshing, setSocialRefreshing] = useState(false);
  const [socialRefreshError, setSocialRefreshError] = useState(false);
  function refreshSocial(force = false) {
    return once("social", async () => {
      setSocialRefreshing(true);
      setSocialRefreshError(false);
      try {
        const r = await requests.current.fetch(
          force ? "/api/social?refresh=1" : "/api/social",
          {
            credentials: "omit",
            referrerPolicy: "no-referrer",
            cache: "no-store",
          },
        );
        if (!r.ok) throw Error();
        const d = (await r.json()) as {
          posts: Story[];
          unavailable: string[];
          youtubeUnavailable?: string[];
        };
        setSocialData((previous) => {
          const next = socialQueue([...d.posts, ...previous]);
          const merged = retainAvatars(
            { ...emptyHub, stories: activeStories(next) } as HubData,
            { ...emptyHub, stories: previous } as HubData,
          ).stories;
          try {
            writeStored("wf-social-cache", merged);
          } catch {}
          return merged;
        });
        setSocialUnavailable(d.unavailable);
        setYoutubeUnavailable(d.youtubeUnavailable || []);
      } catch (error) {
        void recordRequestDiagnostic(
          "Social feed request",
          teams.map((t) => t.id),
          error,
        );
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
        const r = await requests.current.fetch("/api/scores", {
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
      } catch (error) {
        void recordRequestDiagnostic("Live scores request", [], error);
        setScoreError(true);
      }
    });
  }
  const activePage = useRef<DashboardPageId>(TEAM_IDS.WOLVES);
  const newsChecked = useRef(new Map<TeamId, number>());
  const newsSource = useRef<{ checked: number; data: HubData } | null>(null);
  const newsRequest = useRef<Promise<HubData> | null>(null);
  async function fetchGenericNews(force: boolean) {
    const cached = newsSource.current;
    if (cached && !force && Date.now() - cached.checked < 300000)
      return cached.data;
    if (newsRequest.current) return newsRequest.current;
    const request = (async () => {
      const response = await requests.current.fetch("/api/news", {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
      });
      if (!response.ok) throw Error();
      const data = activeHub((await response.json()) as HubData);
      void recordFeedDiagnostics(data.health);
      if (
        data.health.length &&
        data.health.every((health) => health.status === "unavailable")
      )
        throw Error();
      newsSource.current = { checked: Date.now(), data };
      return data;
    })();
    newsRequest.current = request;
    try {
      return await request;
    } finally {
      if (newsRequest.current === request) newsRequest.current = null;
    }
  }
  function cacheNewsPages(data: HubData, ids: TeamId[]) {
    const checked = Date.parse(data.checked) || Date.now();
    setNewsPages((pages) => {
      let next = pages;
      for (const id of ids) {
        const previousChecked = Date.parse(pages[id]?.checked || "");
        if (Number.isFinite(previousChecked) && previousChecked > checked)
          continue;
        if (next === pages) next = { ...pages };
        next[id] = newsForTeam(data, id);
      }
      return next;
    });
    setNewsChecked(ids, checked);
    setNewsStatus((statuses) => {
      const next = { ...statuses };
      for (const id of ids) next[id] = "ready";
      return next;
    });
  }
  function setNewsChecked(ids: TeamId[], checked: number) {
    for (const id of ids)
      newsChecked.current.set(
        id,
        Math.max(newsChecked.current.get(id) || 0, checked),
      );
  }
  function fetchNewsPage(id: TeamId, force = false) {
    if (!force && Date.now() - (newsChecked.current.get(id) || 0) < 300000)
      return Promise.resolve();
    return once("news:" + id, async () => {
      setNewsStatus((s) => ({ ...s, [id]: "loading" }));
      try {
        const response = await requests.current.fetch(newsPageUrl(id), {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        });
        if (!response.ok) throw Error();
        const data = activeHub((await response.json()) as HubData);
        void recordFeedDiagnostics(data.health);
        if (
          data.health.length &&
          data.health.every((health) => health.status === "unavailable")
        )
          throw Error();
        cacheNewsPages(data, [id]);
      } catch (error) {
        void recordRequestDiagnostic("News request", [id], error);
        setNewsStatus((s) => ({ ...s, [id]: "error" }));
      }
    });
  }
  function fetchAllNews(force = false) {
    const ids = teams.map((team) => team.id);
    const pagesFresh = () =>
      ids.every(
        (id) => Date.now() - (newsChecked.current.get(id) || 0) < 300000,
      );
    if (!force && pagesFresh()) return Promise.resolve();
    return once("news:all", async () => {
      if (!force && pagesFresh()) return;
      setNewsStatus((statuses) => {
        const next = { ...statuses };
        for (const id of ids) next[id] = "loading";
        return next;
      });
      try {
        const data = await fetchGenericNews(force);
        cacheNewsPages(data, ids);
      } catch (error) {
        void recordRequestDiagnostic("News request", ids, error);
        setNewsStatus((statuses) => {
          const next = { ...statuses };
          for (const id of ids) next[id] = "error";
          return next;
        });
      }
    });
  }
  const visibleNewsIds: TeamId[] =
    active === "all"
      ? teams.map((team) => team.id)
      : isTeamId(active)
        ? [active]
        : [];
  const loading = visibleNewsIds.some(
    (id) => !newsStatus[id] || newsStatus[id] === "loading",
  );
  const newsFailed = visibleNewsIds.some((id) => newsStatus[id] === "error");
  const newsData = loadedNewsData(visibleNewsIds, newsPages);
  const [scheduleError, setScheduleError] = useState(false);
  const [oddsGames, setOddsGames] = useState<Game[]>([]);
  function refreshSchedules() {
    return once("schedules", async () => {
      try {
        const r = await requests.current.fetch("/api/schedules", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!r.ok) throw Error();
        const d = activeHub((await r.json()) as HubData);
        void recordFeedDiagnostics(d.health);
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
            writeStored("wf-cache", merged);
          } catch {}
          return merged;
        });
        setScheduleError(false);
      } catch (error) {
        void recordRequestDiagnostic("Schedule request", [], error);
        setScheduleError(true);
      }
    });
  }
  function refreshOdds() {
    return once("odds", async () => {
      try {
        const r = await requests.current.fetch("/api/odds", {
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!r.ok) {
          void recordRequestDiagnostic("Odds request", [], "http-" + r.status);
          return;
        }
        const d = (await r.json()) as { games: Game[] };
        setOddsGames(d.games);
      } catch (error) {
        void recordRequestDiagnostic("Odds request", [], error);
      }
    });
  }
  const marchChecked = useRef(0);
  function refreshMarchMadness(force = false) {
    if (!force && Date.now() - marchChecked.current < 60000)
      return Promise.resolve();
    return once("march-madness", async () => {
      try {
        const response = await requests.current.fetch("/api/march-madness", {
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) throw Error();
        setMarchData((await response.json()) as MarchData);
        setMarchUnavailable(false);
      } catch {
        setMarchUnavailable(true);
      } finally {
        marchChecked.current = Date.now();
      }
    });
  }
  const dashboardChecked = useRef(0);
  function refreshDashboardContent(force = false) {
    if (!force && Date.now() - dashboardChecked.current < 300000)
      return Promise.resolve();
    return once("dashboard-content", async () => {
      await Promise.all([
        refreshInfo(),
        refreshScores(),
        refreshSocial(),
        refreshSchedules().then(() => {
          if (requests.current.running) return refreshOdds();
        }),
      ]);
      dashboardChecked.current = Date.now();
    });
  }
  async function refreshPage(page: DashboardPageId, force = false) {
    if (page === "march-madness") {
      await refreshMarchMadness(force);
      return;
    }
    await Promise.all([
      refreshDashboardContent(force),
      ...(isTeamId(page)
        ? [fetchNewsPage(page, force)]
        : [fetchAllNews(force)]),
    ]);
  }
  function selectPage(page: DashboardPageId) {
    activePage.current = page;
    void refreshPage(page);
  }
  function refresh() {
    return once("page-feeds", async () => {
      let firstPage = true;
      await loadPageBeforeBackground({
        currentPage: () => activePage.current,
        loadPage: (page) => {
          const force = firstPage;
          firstPage = false;
          return refreshPage(page, force);
        },
        background: [
          () => refreshDashboardContent(),
          ...teams.map((team) => () => fetchNewsPage(team.id)),
        ],
        isRunning: () => requests.current.running,
      });
    });
  }
  function refreshLive() {
    if (activePage.current === "march-madness") {
      void refreshMarchMadness(true);
    } else {
      void refreshScores();
      void refreshSocial();
    }
  }
  const pollingCallbacks = useRef({ refresh, refreshLive });
  useEffect(() => {
    pollingCallbacks.current = { refresh, refreshLive };
  });
  useEffect(() => {
    const publicRequests = requests.current;
    publicRequests.start();
    let alive = true;
    activePage.current = storedDashboardPage();
    queueMicrotask(() => {
      if (!alive) return;
      const cachedStats = readPlayerStatsCache(browserStorage);
      rosterLoader.current.seed(cachedStats);
      setPlayerStats(cachedStats);
      setSocialData(readStored("wf-social-cache", isStories, []));
      setData(readStored<HubData | null>("wf-cache", isHubData, null));
    });
    const stopPolling = pollPublicFeeds(
      () => pollingCallbacks.current.refresh(),
      () => pollingCallbacks.current.refreshLive(),
    );
    return () => {
      alive = false;
      publicRequests.stop();
      stopPolling();
    };
  }, []);
  return {
    data,
    teamInfo,
    socialData,
    socialUnavailable,
    youtubeUnavailable,
    liveGames,
    scoreCheck,
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
  };
}
