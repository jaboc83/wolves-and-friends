// Normalizes league playoff schedules into rounds and team matchups.
import { espnTeamLogoUrl } from "./march-madness";
export type Postseason = {
  partial?: boolean;
  season: string;
  checked: string;
  rounds: {
    name: string;
    matchups: {
      id: string;
      url: string;
      date: string;
      status: string;
      summary?: string;
      metric: string;
      teams: { id: string; name: string; logo: string; value?: string }[];
    }[];
  }[];
};
type SeasonData = {
  type?: number | string | { type?: number | string };
  year?: number | string;
  startDate?: string;
  endDate?: string;
  displayName?: string;
};
type EventStatus = {
  state?: string;
  shortDetail?: string;
  description?: string;
};
type PostseasonCompetitor = {
  id?: string | number;
  wins?: number | string;
};
type PostseasonTeam = {
  id?: string | number;
  displayName?: string;
};
type PostseasonEventCompetitor = {
  team?: PostseasonTeam;
  score?: string | number;
};
type PostseasonCompetition = {
  competitors?: PostseasonEventCompetitor[];
  notes?: { headline?: string }[];
  status?: { type?: EventStatus };
  series?: {
    summary?: string;
    competitors?: PostseasonCompetitor[];
  };
};
type PostseasonEvent = {
  date?: string;
  season?: SeasonData;
  competitions?: PostseasonCompetition[];
  links?: { href?: string }[];
  status?: { type?: EventStatus };
};
type PostseasonFeed = {
  events?: PostseasonEvent[];
  leagues?: { season?: SeasonData }[];
};

// Only leagues whose provider uses season type 3 for postseason.
const supported = new Set([
  "basketball/nba",
  "basketball/wnba",
  "hockey/nhl",
  "football/nfl",
  "baseball/mlb",
  "soccer/usa.1",
]);
const phase = (s: SeasonData | undefined) =>
  Number(typeof s?.type === "object" ? (s.type.type ?? s.type) : s?.type);

export function postseasonWindow(current: PostseasonFeed, now = Date.now()) {
  const s = current.leagues?.[0]?.season;
  if (![2, 3].includes(phase(s))) return;
  const start = Date.parse(s.startDate),
    end = Date.parse(s.endDate);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    now < start ||
    now > end + 14 * 86400000
  )
    return;
  if (phase(s) === 2 && now < end - 120 * 86400000) return;
  return {
    year: s.year,
    name: s.displayName || String(s.year),
    start: s.startDate,
    end: s.endDate,
  };
}

export function parsePostseason(
  data: PostseasonFeed,
  window: NonNullable<ReturnType<typeof postseasonWindow>>,
  checked: string,
  league = "",
): Postseason | undefined {
  const rounds = new Map<
    string,
    Map<string, Postseason["rounds"][number]["matchups"][number]>
  >();
  const events = [...(data.events || [])].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  for (const e of events) {
    if (phase(e.season) !== 3 || Number(e.season?.year) !== Number(window.year))
      continue;
    if (
      !Number.isFinite(Date.parse(e.date)) ||
      Date.parse(e.date) < Date.parse(window.start) ||
      Date.parse(e.date) > Date.parse(window.end)
    )
      continue;
    const c = e.competitions?.[0];
    const competitors = c?.competitors || [];
    if (
      competitors.length !== 2 ||
      competitors.some(
        (p) =>
          !/^[1-9]\d*$/.test(String(p.team?.id)) ||
          !p.team?.displayName ||
          /\bTBD\b|\/|winner of|loser of/i.test(p.team.displayName),
      )
    )
      continue;
    const note = (c.notes || []).map((n) => n.headline || "").find(Boolean);
    const round =
      note?.replace(/\s*[-–·]\s*Game\s*\d+.*$/i, "").trim() ||
      "Postseason matchups";
    const pair = competitors
      .map((p) => String(p.team!.id))
      .sort()
      .join("-");
    const id = round + ":" + pair;
    const url = (e.links || []).find((l) =>
      /^https:\/\/www\.espn\.com\//.test(l.href || ""),
    )?.href;
    if (!url) continue;
    const status = c.status?.type || e.status?.type || {};
    if (!rounds.has(round)) rounds.set(round, new Map());
    const group = rounds.get(round)!;
    const prior = group.get(id);
    // Prefer the latest played game over later unplayed placeholders.
    if (prior && status.state === "pre") continue;
    group.set(id, {
      id,
      url,
      date: e.date,
      status: status.shortDetail || status.description || "Scheduled",
      summary: c.series?.summary,
      metric: c.series ? "Series wins" : "Score",
      teams: competitors.map((p) => ({
        id: String(p.team.id),
        name: p.team.displayName,
        logo: espnTeamLogoUrl(league, String(p.team.id)),
        value: c.series
          ? String(
              c.series.competitors?.find(
                (x) => String(x.id) === String(p.team!.id),
              )?.wins ?? "—",
            )
          : status.state !== "pre"
            ? String(p.score ?? "—")
            : undefined,
      })),
    });
  }
  const result = [...rounds].map(([name, matchups]) => ({
    name,
    matchups: [...matchups.values()],
  }));
  return result.length
    ? { season: window.name, checked, rounds: result }
    : undefined;
}

export async function fetchPostseason(
  league: string,
): Promise<Postseason | undefined> {
  if (!supported.has(league)) return;
  const get = async (url: string): Promise<PostseasonFeed> => {
    const r = await fetch(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error("Postseason feed unavailable");
    return (await r.json()) as PostseasonFeed;
  };
  const base =
    "https://site.api.espn.com/apis/site/v2/sports/" + league + "/scoreboard";
  const current = await get(base);
  const window = postseasonWindow(current);
  if (!window) return;
  // The scoreboard accepts calendar months; day-range queries fail for MLB.
  // Fetch the postseason's recent rounds plus published upcoming matchups.
  const now = new Date();
  const offsets =
    phase(current.leagues?.[0]?.season) === 3 ? [-2, -1, 0, 1] : [0, 1];
  const months = offsets
    .map((offset) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
        .toISOString()
        .slice(0, 7),
    )
    .filter(
      (month) =>
        month >= window.start.slice(0, 7) && month <= window.end.slice(0, 7),
    );
  const results = await Promise.allSettled(
    months.map((month) =>
      get(base + "?dates=" + month.replace("-", "") + "&limit=1000"),
    ),
  );
  const events = [
    ...(current.events || []),
    ...results.flatMap((r) =>
      r.status === "fulfilled" ? r.value.events || [] : [],
    ),
  ];
  const parsed = parsePostseason({ events }, window, now.toISOString(), league);
  if (parsed) parsed.partial = results.some((r) => r.status === "rejected");
  return parsed;
}
