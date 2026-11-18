// Identifies "Postgame Sound/Interview" videos and attaches them to the game they followed.
import type { Game, Story } from "../feeds/feed-types.ts";

const POSTGAME =
  /\b(?:post\s?game|playoff)\s+(?:on[\s-]court\s+)?(sound|interview)\b/i;
// Wild-style titles: "… | Minnesota Wild Postgame vs. Tampa Bay | Nov. 7".
const PREGAME_ANY = /\bpre[\s-]?(?:game|match)\b/i;
const POSTGAME_ANY = /\bpost[\s-]?(?:game|match)\b/i;
// Game-day videos: postgame/shootaround clips and highlight or recap videos
// whose titles end in "| M.D.YY". Practice clips share that format but stay in the carousel.
const SHOOTAROUND = /\bshootaround\s+sound\b/i;
const GAME_HIGHLIGHTS = /\bhighlights\b|\bmatchday\s+replay\b/i;
const PRACTICE = /\bpractice\b|\bexit\s+interview\b/i;
const TRAILING_DATE = /\|\s*\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})\s*$/;
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const MONTH_DATE =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,\s*(\d{4}))?/i;
// Frost style: "May 7th, 2026 - MIN vs MTL - Game Highlights".
const LEADING_DATE =
  /^\s*[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{4}\s+[-–]\s+/;
// Videos publish after the final buzzer; allow for next-day uploads.
const WINDOW_MS = 36 * 3600000;
const WEEK_VIDEO_LIMIT = 8;

export type PostgameGroup =
  | "highlights"
  | "pregame"
  | "shootaround"
  | "postgame"
  | "week"
  | "mpo"
  | "fpo";
export type PostgameLink = {
  id: string;
  url: string;
  label: string;
  group: PostgameGroup;
  // Extra detail shown as a tooltip.
  detail?: string;
};

type MediaKind =
  | "sound"
  | "interview"
  | "shootaround"
  | "highlight"
  | "pregame"
  | "preview"
  | "availability";

// Goal clips ("MNUFC GOAL! …", "GOAL: …") join the highlights.
const GOAL_CLIP = /^(?:\w+\s+)?GOAL[!:]/i;
const PREVIEW = /\bmatchday\s+preview\b/i;
const PRESS_CONFERENCE = /\bpress\s+conference\b|\bpresser\b/i;
// Previews go up a few days ahead of the match.
const PREVIEW_LEAD_MS = 5 * 86400000;

function mediaKind(title: string): MediaKind | undefined {
  if (PRACTICE.test(title)) return undefined;
  if (SHOOTAROUND.test(title)) return "shootaround";
  if (PREVIEW.test(title)) return "preview";
  const postgame = POSTGAME.exec(title)?.[1]?.toLowerCase();
  if (postgame) return postgame as MediaKind;
  if (PREGAME_ANY.test(title)) return "pregame";
  if (POSTGAME_ANY.test(title)) return "availability";
  // Club channels often title press conferences with the opponent only.
  if (PRESS_CONFERENCE.test(title)) return "pregame";
  return TRAILING_DATE.test(title) ||
    GAME_HIGHLIGHTS.test(title) ||
    GOAL_CLIP.test(title)
    ? "highlight"
    : undefined;
}

export const isPostgameMedia = (video: Story) =>
  video.socialPlatform === "youtube" &&
  (!!video.gamePlaylist ||
    mediaKind(video.title) !== undefined ||
    eventVideo(video.title) !== undefined);

// Disc golf round coverage: "<event> | MPO R2B9 | Players | Jomez Disc Golf"
// and "Top 10 MPO Shots from the <event> | …".
const ROUND_VIDEO =
  /^(.+?)\s*\|\s*(MPO|FPO)\s+(?:R(\d)|FINAL)(F9|B9)?\b(?:\s*\|\s*([^|]+))?/i;
const TOP_SHOTS = /^Top\s+(\d+)\s+(MPO|FPO)?\s*Shots\s+from\s+the\s+(.+?)\s*\|/i;

type EventVideo = {
  event: string;
  label: string;
  order: number;
  group: "mpo" | "fpo";
  detail?: string;
};

function eventVideo(title: string): EventVideo | undefined {
  if (PRACTICE.test(title)) return undefined;
  const round = ROUND_VIDEO.exec(title);
  if (round) {
    const division = round[2].toUpperCase();
    const number = round[3] ? Number(round[3]) : 4;
    const half = round[4]?.toUpperCase();
    const label = [
      round[3] ? "Round " + round[3] : "Final round",
      half ? (half === "F9" ? "Front 9" : "Back 9") : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      event: round[1],
      label,
      order: number * 10 + (half === "B9" ? 1 : 0),
      group: division === "FPO" ? "fpo" : "mpo",
      detail: round[5]?.trim(),
    };
  }
  const top = TOP_SHOTS.exec(title);
  return top
    ? {
        event: top[3],
        label: `Top ${top[1]} shots`,
        order: 100,
        group: top[2]?.toUpperCase() === "FPO" ? "fpo" : "mpo",
      }
    : undefined;
}

const eventWords = (text: string) =>
  new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []);

// Videos name the event loosely ("JomezPro Finale" vs "JomezPro Series Finale").
function sameEvent(videoEvent: string, gameName: string) {
  const a = eventWords(videoEvent);
  const b = eventWords(gameName);
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  return small.size > 0 && [...small].every((word) => large.has(word));
}

function eventMedia(game: Game, videos: Story[]): PostgameLink[] {
  const start = Date.parse(game.date);
  const end = Date.parse(game.endDate || game.date);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  return videos
    .flatMap((video) => {
      if (video.socialPlatform !== "youtube" || !video.teams.includes(game.team))
        return [];
      const info = eventVideo(video.title);
      const published = Date.parse(video.date);
      return info &&
        sameEvent(info.event, game.name) &&
        published >= start - 86400000 &&
        published <= end + 7 * 86400000
        ? [{ video, info }]
        : [];
    })
    .sort((a, b) => a.info.order - b.info.order)
    .map(({ video, info }) => ({
      id: video.id,
      url: video.url,
      group: info.group,
      label: info.label,
      detail: info.detail,
    }));
}

// Per-game playlists name the opponent ("Week 10 | Minnesota Vikings at Green Bay Packers").
function playlistGame(video: Story, games: Game[]) {
  const title = video.gamePlaylist?.title.toLowerCase() || "";
  const published = Date.parse(video.date);
  const maxGap = 21 * 86400000;
  let best: Game | undefined;
  let bestGap = Infinity;
  for (const g of games) {
    if (g.team !== video.teams[0] || g.eventOnly) continue;
    const nicknames = g.competitors.flatMap((c) => {
      const word = c.name.trim().split(/\s+/).pop()?.toLowerCase();
      return word && word !== "vikings" ? [word] : [];
    });
    if (!nicknames.some((n) => new RegExp("\\b" + n + "\\b").test(title)))
      continue;
    const gap = Math.abs(published - Date.parse(g.date));
    if (gap <= maxGap && gap < bestGap) [best, bestGap] = [g, gap];
  }
  return best;
}

type Day = { year?: number; month: number; day: number };

// Reads a title date written as "M.D.YY", "9/18/26", "Nov. 10" or "Nov. 12, 2026".
function titleDay(text: string): Day | undefined {
  const n = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})\b/);
  if (n) return { year: n[3].length === 2 ? 2000 + Number(n[3]) : Number(n[3]), month: Number(n[1]), day: Number(n[2]) };
  const s = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/);
  if (s)
    return {
      year: s[3].length === 2 ? 2000 + Number(s[3]) : Number(s[3]),
      month: Number(s[1]),
      day: Number(s[2]),
    };
  const w = text.match(MONTH_DATE);
  return w
    ? {
        year: w[3] ? Number(w[3]) : undefined,
        month: MONTHS.indexOf(w[1].toLowerCase()) + 1,
        day: Number(w[2]),
      }
    : undefined;
}

const sameDay = (a: Day, b: Day) =>
  a.month === b.month &&
  a.day === b.day &&
  (a.year === undefined || b.year === undefined || a.year === b.year);

// Game dates are formatted like a title date in Central time, where these teams play.
function localDay(time: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  }).formatToParts(time);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("month")}.${get("day")}.${get("year")}`;
}

function mediaLabel(rawTitle: string, kind: MediaKind) {
  const dated = LEADING_DATE.test(rawTitle);
  const title = rawTitle.replace(LEADING_DATE, "");
  if (dated && kind === "availability") {
    const last = title.split(/\s[-–]\s/).pop() || "";
    return last
      .replace(/^Minnesota Frost\s+/i, "")
      .replace(/\bpost game\b/i, "Postgame")
      .trim();
  }
  if (kind === "preview") return title.trim();
  if (kind === "pregame" && !PREGAME_ANY.test(title)) return title.trim();
  if (kind === "highlight")
    return title
      .replace(TRAILING_DATE, "")
      .replace(/\s*\|\s*[A-Za-z]+\.?\s+\d{1,2},\s*\d{4}\s*$/, "")
      .replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{2,4}\)/, "")
      .replace(/\s*\|\s*MLB Highlights\s*$/i, "")
      .trim();
  const clean = (part: string) => part.replace(/[“”"]/g, "").trim();
  if (kind === "pregame" || kind === "availability") {
    // Everything before the "Minnesota Wild Pregame/Postgame …" segment names who spoke.
    const parts = title.split("|").map(clean);
    const at = parts.findIndex((p) =>
      (kind === "pregame" ? PREGAME_ANY : POSTGAME_ANY).test(p),
    );
    const who = parts.slice(0, Math.max(at, 0)).filter(Boolean).join(" · ");
    // Loons style: "MNUFC Postgame Presser: Coach Knowles on Win over San Jose".
    const lead = title.match(/\b(?:pre|post)[\s-]?(?:game|match)\b[^:]*:\s*(.+)$/i);
    // Club style: "Pre-match Press Conference: Tottenham Hotspur (A)" reads best whole.
    if (lead && !who && /press conference/i.test(title.split(":")[0]))
      return title.trim();
    if (lead && !who) {
      const name = clean(lead[1].split(/\s+on\s+/i)[0]);
      const type = /interview/i.test(title.split(":")[0])
        ? " (interview)"
        : /presser/i.test(title.split(":")[0])
          ? " (presser)"
          : "";
      if (name) return name + type;
    }
    // Twins style: "Derek Shelton - Postgame Conference 9/18/2026".
    const dashed = parts[0].split(/\s[-–]\s/);
    return (
      who ||
      (dashed.length > 1 ? dashed[0].trim() : "") ||
      (kind === "pregame" ? "Pregame availability" : "Postgame availability")
    );
  }
  const before = title.split(kind === "shootaround" ? SHOOTAROUND : POSTGAME)[0];
  const parts = before.split("|").map(clean).filter(Boolean);
  return (parts[parts.length - 1] || "").replace(/\s*[-–]\s*$/, "");
}

export function postgameMedia(
  game: Game,
  videos: Story[],
  allGames: Game[] = [],
): PostgameLink[] {
  if (game.eventOnly) return eventMedia(game, videos);
  if (!["pre", "in", "post"].includes(game.state)) return [];
  const start = Date.parse(game.date);
  if (!Number.isFinite(start)) return [];
  const gameDay = titleDay(localDay(start)) as Day;
  const later = allGames
    .filter((g) => g.team === game.team && g.id !== game.id)
    .map((g) => Date.parse(g.date))
    .filter((time) => time > start);
  const others = allGames
    .filter((g) => g.team === game.team && g.id !== game.id)
    .map((g) => Date.parse(g.date));
  const matches = videos
    .filter((video) => {
      if (!isPostgameMedia(video) || !video.teams.includes(game.team))
        return false;
      if (video.gamePlaylist) return false;
      // Titles carry the game date, which is the most reliable match.
      const published = Date.parse(video.date);
      const day = titleDay(video.title);
      const kind = mediaKind(video.title);
      if (!kind) return false;
      if (kind === "preview" || (kind === "pregame" && !day)) {
        // Belongs to the next game that follows the upload.
        const lead = start - published;
        return (
          lead >= 0 &&
          lead <= PREVIEW_LEAD_MS &&
          !others.some((time) => time > published && time < start)
        );
      }
      if (day) return sameDay(day, gameDay);
      const age = published - start;
      return (
        age >= 0 && age <= WINDOW_MS && !later.some((time) => time <= published)
      );
    })
    .map((video) => {
      const kind = mediaKind(video.title) as MediaKind;
      return { video, kind, name: mediaLabel(video.title, kind) };
    })
    .filter(
      (m) =>
        m.name &&
        (game.state === "post" ||
          m.kind === "shootaround" ||
          m.kind === "pregame" ||
          m.kind === "preview"),
    );
  const order: PostgameGroup[] = [
    "highlights",
    "pregame",
    "shootaround",
    "postgame",
  ];
  const groupOf = (kind: MediaKind): PostgameGroup =>
    kind === "highlight"
      ? "highlights"
      : kind === "shootaround"
        ? kind
        : kind === "pregame" || kind === "preview"
          ? "pregame"
          : "postgame";
  const sorted = matches
    .sort(
      (a, b) =>
        order.indexOf(groupOf(a.kind)) - order.indexOf(groupOf(b.kind)) ||
        Date.parse(a.video.date) - Date.parse(b.video.date),
    )
    .map((m) => ({
      id: m.video.id,
      url: m.video.url,
      group: groupOf(m.kind),
      label: m.kind === "interview" ? m.name + " (interview)" : m.name,
    }));
  const candidates = [game, ...allGames.filter((g) => g.id !== game.id)];
  const week = videos
    .filter(
      (video) =>
        video.gamePlaylist &&
        playlistGame(video, candidates)?.id === game.id,
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const playlist = week[0]?.gamePlaylist;
  return [
    ...sorted,
    ...week.slice(0, WEEK_VIDEO_LIMIT).map((video) => ({
      id: video.id,
      url: video.url,
      group: "week" as const,
      label: video.title,
    })),
    ...(playlist && week.length > WEEK_VIDEO_LIMIT
      ? [
          {
            id: "playlist-" + playlist.id,
            url: "https://www.youtube.com/playlist?list=" + playlist.id,
            group: "week" as const,
            label: `All ${week.length}+ videos from this week ↗`,
          },
        ]
      : []),
  ];
}
