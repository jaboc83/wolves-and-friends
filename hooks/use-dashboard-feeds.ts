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
import { loadedNewsData } from "../lib/browser/news-page-data";
import { teams } from "../lib/teams/teams";
import { isHubData, isStories, storedTeam } from "../lib/dashboard/storage";
import { recordFeedDiagnostics } from "../lib/feeds/feed-diagnostics";
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
export function useDashboardFeeds(active: string) {
  const [data, setData] = useState<HubData | null>(null);
  const [teamInfo, setTeamInfo] = useState<TeamInfo[]>([]);
  const [newsPages, setNewsPages] = useState<Record<string, HubData>>({});
  const [newsStatus, setNewsStatus] = useState<
    Record<string, "loading" | "ready" | "error">
  >({});
  const [socialData, setSocialData] = useState<Story[]>([]);
  const [socialUnavailable, setSocialUnavailable] = useState<string[]>([]);
  const [youtubeUnavailable, setYoutubeUnavailable] = useState<string[]>([]);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [scoreCheck, setScoreCheck] = useState("");
  const [scoreError, setScoreError] = useState(false);
  const requests = useRef(createPublicRequests());
  const rosterLoader = useRef(createRosterStatsLoader());
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>(
    {},
  );
  const [playerStatsStatus, setPlayerStatsStatus] =
    useState<StatsStatus>("idle");
  function refreshRosterStats(priorityKeys: string[] = []) {
    return rosterLoader.current({
      initial: playerStats,
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
  }

  const once = requests.current.once;
  function refreshInfo() {
    return once("info", async () => {
      try {
        const r = await requests.current.fetch("/api/team-info", {
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
      } catch {
        setScoreError(true);
      }
    });
  }
  const activePage = useRef("wolves");
  const newsChecked = useRef(new Map<string, number>());
  function fetchNewsPage(id: string, force = false) {
    if (id === "march-madness") return Promise.resolve();
    if (!force && Date.now() - (newsChecked.current.get(id) || 0) < 300000)
      return Promise.resolve();
    return once("news:" + id, async () => {
      setNewsStatus((s) => ({ ...s, [id]: "loading" }));
      try {
        const r = await requests.current.fetch(
          "/api/news?team=" + encodeURIComponent(id),
          {
            credentials: "omit",
            referrerPolicy: "no-referrer",
            cache: "no-store",
          },
        );
        if (!r.ok) throw Error();
        const d = activeHub((await r.json()) as HubData);
        void recordFeedDiagnostics(d.health);
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
        if (!requests.current.running) break;
        if (t.id !== selected) await fetchNewsPage(t.id);
      }
    });
  }
  const visibleNewsIds = active === "all" ? teams.map((t) => t.id) : [active];
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
        void refreshOdds();
      } catch {
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
  const pollingCallbacks = useRef({ refresh, refreshScores, refreshSocial });
  useEffect(() => {
    const publicRequests = requests.current;
    publicRequests.start();
    let alive = true;
    activePage.current = storedTeam();
    queueMicrotask(() => {
      if (!alive) return;
      setPlayerStats(readPlayerStatsCache(browserStorage));
      setSocialData(readStored("wf-social-cache", isStories, []));
      setData(readStored<HubData | null>("wf-cache", isHubData, null));
    });
    // Split fallbacks out of the main client chunk. Never replace a live/cache response.
    void import("../lib/initial.json")
      .then(({ default: seed }) => {
        if (!alive) return;
        setData((previous) => previous || activeHub(seed as HubData));
        setSocialData((previous) =>
          socialQueue([...previous, ...socialQueue(seed.stories as Story[])]),
        );
      })
      .catch(() => {});
    void import("../lib/team-info-initial.json")
      .then(({ default: seed }) => {
        if (alive)
          setTeamInfo((previous) =>
            previous.length ? previous : (seed as TeamInfo[]),
          );
      })
      .catch(() => {});
    const stopPolling = pollPublicFeeds(
      () => pollingCallbacks.current.refresh(),
      () => {
        pollingCallbacks.current.refreshScores();
        pollingCallbacks.current.refreshSocial();
      },
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
    socialRefreshing,
    socialRefreshError,
    refreshSocial,
    refreshRosterStats,
    fetchNewsPage,
    activePage,
  };
}
